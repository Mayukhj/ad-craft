require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const Razorpay = require("razorpay");
const { rateLimit } = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./public/uploads");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  console.error("Set SESSION_SECRET and ADMIN_PASSWORD in your .env file.");
  process.exit(1);
}
const adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
const db = new Database(path.join(DATA_DIR, "adcraft.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL,
    description TEXT NOT NULL, price REAL NOT NULL, image TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, featured INTEGER NOT NULL DEFAULT 0,
    publish_at TEXT
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ad_id INTEGER, name TEXT NOT NULL, company TEXT NOT NULL,
    email TEXT NOT NULL, phone TEXT, brief TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, razorpay_order_id TEXT,
    payment_id TEXT, payment_status TEXT NOT NULL DEFAULT 'Not paid',
    FOREIGN KEY(ad_id) REFERENCES ads(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL,
    message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
ensureColumn("ads", "publish_at", "TEXT");
ensureColumn("bookings", "razorpay_order_id", "TEXT");
ensureColumn("bookings", "payment_id", "TEXT");
ensureColumn("bookings", "payment_status", "TEXT NOT NULL DEFAULT 'Not paid'");

if (db.prepare("SELECT COUNT(*) AS n FROM ads").get().n === 0) {
  const add = db.prepare("INSERT INTO ads (title, category, description, price, image, featured, publish_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)");
  add.run("The Bold Launch", "Brand Campaign", "A confident launch concept for brands that want to make a memorable first impression.", 49, "https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200", 1);
  add.run("Fresh & Focused", "Social Media", "A bright, clean social creative designed to stop the scroll and make your offer clear.", 19, "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200", 1);
  add.run("The Signature Story", "Product Advertisement", "A premium product-led visual concept with room for your brand story and key message.", 34.99, "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200", 0);
}
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null;

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "adcraft.sid", secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
  store: new SQLiteStore({ db: "sessions.sqlite", dir: DATA_DIR }),
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: "Too many sign-in attempts. Try again later." } });
const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, WEBP, or GIF images are allowed."), ok);
  }
});
const clean = (v, max = 2000) => String(v || "").trim().slice(0, max);
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const adminOnly = (req, res, next) => req.session.isAdmin ? next() : res.status(401).json({ error: "Please sign in as admin." });
const validStatuses = ["New", "Contacted", "In progress", "Completed"];

app.get("/api/config", (_req, res) => res.json({
  whatsappNumber: clean(process.env.WHATSAPP_NUMBER, 20).replace(/\D/g, ""),
  paymentsEnabled: Boolean(razorpay),
  razorpayKeyId: razorpay ? process.env.RAZORPAY_KEY_ID : null
}));
app.get("/api/ads", (_req, res) => {
  res.json(db.prepare("SELECT * FROM ads WHERE publish_at IS NULL OR datetime(publish_at) <= datetime('now') ORDER BY featured DESC, datetime(created_at) DESC").all());
});
app.get("/api/ads/:id", (req, res) => {
  const ad = db.prepare("SELECT * FROM ads WHERE id = ? AND (publish_at IS NULL OR datetime(publish_at) <= datetime('now'))").get(Number(req.params.id));
  if (!ad) return res.status(404).json({ error: "Sample not found or not yet published." });
  res.json(ad);
});

app.post("/api/bookings", formLimiter, (req, res) => {
  const name = clean(req.body.name, 100), company = clean(req.body.company, 120);
  const email = clean(req.body.email, 160), phone = clean(req.body.phone, 40);
  const brief = clean(req.body.brief, 3000), adId = req.body.ad_id ? Number(req.body.ad_id) : null;
  if (!name || !company || !validEmail(email) || !brief) return res.status(400).json({ error: "Please complete your name, company, valid email, and project brief." });
  if (adId && !db.prepare("SELECT id FROM ads WHERE id = ? AND (publish_at IS NULL OR datetime(publish_at) <= datetime('now'))").get(adId)) return res.status(400).json({ error: "That advertisement sample is not available." });
  const result = db.prepare("INSERT INTO bookings (ad_id, name, company, email, phone, brief) VALUES (?, ?, ?, ?, ?, ?)").run(adId, name, company, email, phone, brief);
  res.status(201).json({ message: "Your booking enquiry has been received.", bookingId: result.lastInsertRowid });
});

app.post("/api/payments/create-order", formLimiter, async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ error: "Online payments are not configured yet. Your booking enquiry is still saved." });
    const bookingId = Number(req.body.booking_id);
    const booking = db.prepare("SELECT bookings.*, ads.price FROM bookings LEFT JOIN ads ON ads.id = bookings.ad_id WHERE bookings.id = ?").get(bookingId);
    if (!booking || !booking.ad_id || !booking.price) return res.status(400).json({ error: "A selected advertisement is required to pay an advance." });
    if (booking.payment_status === "Captured") return res.status(409).json({ error: "This booking has already been paid." });
    const amountUsdCents = Math.max(1, Math.round(Number(booking.price) * 0.20 * 100));
    const order = await razorpay.orders.create({
      amount: amountUsdCents, currency: "USD", receipt: `adcraft_${bookingId}_${Date.now()}`,
      notes: { booking_id: String(bookingId), purpose: "20 percent booking advance" }
    });
    db.prepare("UPDATE bookings SET razorpay_order_id = ?, payment_status = 'Order created' WHERE id = ?").run(order.id, bookingId);
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, amountUsd: amountUsdCents / 100 });
  } catch (error) {
    console.error("Razorpay order error:", error.message);
    res.status(502).json({ error: "Could not start payment. Your booking enquiry is saved; please contact us." });
  }
});
app.post("/api/payments/verify", formLimiter, async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ error: "Payments are not configured." });
    const bookingId = Number(req.body.booking_id);
    const orderId = clean(req.body.razorpay_order_id, 100);
    const paymentId = clean(req.body.razorpay_payment_id, 100);
    const signature = clean(req.body.razorpay_signature, 256);
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND razorpay_order_id = ?").get(bookingId, orderId);
    if (!booking || !paymentId || !signature) return res.status(400).json({ error: "Payment details could not be matched to this booking." });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: "Payment signature verification failed." });
    const payment = await razorpay.payments.fetch(paymentId);
    if (payment.order_id !== orderId) return res.status(400).json({ error: "Payment order does not match." });
    if (payment.status !== "captured") {
      db.prepare("UPDATE bookings SET payment_id = ?, payment_status = ? WHERE id = ?").run(paymentId, payment.status, bookingId);
      return res.status(409).json({ error: "Payment is not captured yet. Please contact us before retrying." });
    }
    db.prepare("UPDATE bookings SET payment_id = ?, payment_status = 'Captured' WHERE id = ?").run(paymentId, bookingId);
    res.json({ message: "Advance payment received and verified. We’ll contact you about the project." });
  } catch (error) {
    console.error("Payment verification error:", error.message);
    res.status(502).json({ error: "We could not verify the payment right now. Please contact us with your payment reference." });
  }
});

app.post("/api/contact", formLimiter, (req, res) => {
  const name = clean(req.body.name, 100), email = clean(req.body.email, 160), message = clean(req.body.message, 3000);
  if (!name || !validEmail(email) || !message) return res.status(400).json({ error: "Please enter your name, a valid email, and a message." });
  db.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)").run(name, email, message);
  res.status(201).json({ message: "Thanks! Your message has been received." });
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const username = clean(req.body.username, 80), password = String(req.body.password || "");
  if (username !== (process.env.ADMIN_USERNAME || "admin") || !await bcrypt.compare(password, adminPasswordHash)) {
    return res.status(401).json({ error: "Incorrect admin username or password." });
  }
  req.session.isAdmin = true;
  res.json({ message: "Signed in." });
});
app.post("/api/admin/logout", adminOnly, (req, res) => req.session.destroy(() => res.json({ message: "Signed out." })));
app.get("/api/admin/me", adminOnly, (_req, res) => res.json({ authenticated: true }));
app.get("/api/admin/ads", adminOnly, (_req, res) => res.json(db.prepare("SELECT * FROM ads ORDER BY datetime(created_at) DESC").all()));
app.get("/api/admin/bookings", adminOnly, (_req, res) => res.json(db.prepare(`SELECT bookings.*, ads.title AS ad_title FROM bookings LEFT JOIN ads ON ads.id = bookings.ad_id ORDER BY datetime(bookings.created_at) DESC`).all()));
app.get("/api/admin/messages", adminOnly, (_req, res) => res.json(db.prepare("SELECT * FROM messages ORDER BY datetime(created_at) DESC").all()));
app.patch("/api/admin/bookings/:id", adminOnly, (req, res) => {
  const status = clean(req.body.status, 30);
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status." });
  db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, Number(req.params.id));
  res.json({ message: "Booking updated." });
});
app.post("/api/admin/ads", adminOnly, upload.single("image"), (req, res) => {
  const title = clean(req.body.title, 120), category = clean(req.body.category, 80);
  const description = clean(req.body.description, 1500), price = Number(req.body.price);
  let publishAt = null;
  if (req.body.publish_at) {
    const parsed = new Date(req.body.publish_at);
    if (Number.isNaN(parsed.getTime())) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Enter a valid publication date." });
    }
    publishAt = parsed.toISOString();
  }
  if (!title || !category || !description || !Number.isFinite(price) || price < 0 || !req.file) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Add a title, category, description, valid price, and image." });
  }
  const result = db.prepare("INSERT INTO ads (title, category, description, price, image, featured, publish_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    title, category, description, price, `/uploads/${req.file.filename}`, req.body.featured === "on" ? 1 : 0, publishAt
  );
  res.status(201).json({ message: publishAt && new Date(publishAt) > new Date() ? "Sample scheduled." : "Sample published.", id: result.lastInsertRowid });
});
app.delete("/api/admin/ads/:id", adminOnly, (req, res) => {
  const ad = db.prepare("SELECT image FROM ads WHERE id = ?").get(Number(req.params.id));
  if (!ad) return res.status(404).json({ error: "Sample not found." });
  db.prepare("DELETE FROM ads WHERE id = ?").run(Number(req.params.id));
  if (ad.image.startsWith("/uploads/")) fs.unlink(path.join(UPLOAD_DIR, path.basename(ad.image)), () => {});
  res.json({ message: "Sample deleted." });
});

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || "Something went wrong." });
});
app.listen(PORT, "0.0.0.0", () => console.log(`Ad Craft is running on port ${PORT}`));
