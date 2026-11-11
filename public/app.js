const nav = document.getElementById("site-nav");
if (nav) nav.innerHTML = `<header class="nav-wrap"><a class="brand" href="/"><span class="brand-icon">A<span>✳</span></span><span>AD<span>CRAFT</span></span></a><nav><a href="/">Home</a><a href="/samples.html">Samples</a><a href="/about.html">About</a><a href="/contact.html">Contact</a></nav><a class="nav-cta" href="/samples.html">Start a project ↗</a><button class="menu-toggle" aria-label="Toggle menu">☰</button></header>`;
const footer = document.getElementById("site-footer");
if (footer) footer.innerHTML = `<footer class="footer"><div class="footer-main"><a class="brand brand-light" href="/"><span class="brand-icon">A<span>✳</span></span><span>AD<span>CRAFT</span></span></a><p>Good ideas deserve<br>great advertising.</p><a class="btn btn-light" href="/contact.html">Let’s talk ↗</a></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Ad Craft. All rights reserved.</span><span><a href="/admin.html">Studio login</a> &nbsp;·&nbsp; Made for brands with ambition.</span></div></footer>`;
document.querySelector(".menu-toggle")?.addEventListener("click", () => document.querySelector(".nav-wrap")?.classList.toggle("nav-open"));
const money = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let siteConfig = { whatsappNumber: "", paymentsEnabled: false };
fetch("/api/config").then(r => r.json()).then(config => {
  siteConfig = config;
  if (config.whatsappNumber) {
    const link = document.createElement("a");
    link.className = "whatsapp-float"; link.href = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent("Hi Ad Craft! I'd like to discuss an advertisement for my business.")}`;
    link.target = "_blank"; link.rel = "noopener noreferrer"; link.setAttribute("aria-label", "Chat with Ad Craft on WhatsApp"); link.textContent = "WhatsApp ↗";
    document.body.appendChild(link);
  }
}).catch(() => {});
function adCard(ad) {
  return `<article class="ad-card"><a class="ad-image" href="/book.html?id=${ad.id}"><img src="${esc(ad.image)}" alt="${esc(ad.title)}" loading="lazy"><span class="image-arrow">↗</span></a><div class="ad-meta"><span>${esc(ad.category)}</span><b>${money(ad.price)}</b></div><h3>${esc(ad.title)}</h3><p>${esc(ad.description)}</p><a class="card-link" href="/book.html?id=${ad.id}">Book this ad <span>↗</span></a></article>`;
}
let allAdsCache = [];
function renderSamples(ads) {
  const all = document.getElementById("all-ads");
  if (!all) return;
  all.innerHTML = ads.map(adCard).join("") || "<p>No samples in this category yet.</p>";
}
async function loadAds() {
  try {
    const ads = await (await fetch("/api/ads")).json();
    allAdsCache = ads;
    const featured = document.getElementById("featured-ads");
    if (featured) featured.innerHTML = ads.slice(0, 3).map(adCard).join("") || "<p>No samples yet. Check back soon.</p>";
    const all = document.getElementById("all-ads");
    if (all) {
      document.getElementById("sample-count").textContent = `${ads.length} CREATIVE SAMPLES`;
      const cats = ["All", ...new Set(ads.map(a => a.category).filter(Boolean))];
      const filters = document.getElementById("category-filters");
      filters.innerHTML = cats.map((c, i) => `<button class="filter-chip ${i===0?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");
      filters.addEventListener("click", e => {
        const button = e.target.closest("[data-category]");
        if (!button) return;
        filters.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === button));
        const category = button.dataset.category;
        renderSamples(category === "All" ? allAdsCache : allAdsCache.filter(a => a.category === category));
      });
      renderSamples(ads);
    }
  } catch { document.querySelectorAll(".ad-grid").forEach(el => el.innerHTML = "<p>Could not load samples. Please refresh the page.</p>"); }
}
loadAds();
async function sendForm(form, endpoint) {
  const status = form.querySelector(".form-status"), button = form.querySelector("button[type=submit]");
  status.textContent = "Sending…"; button.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Please try again.");
    status.textContent = result.message; status.className = "form-status success"; form.reset();
  } catch (e) { status.textContent = e.message; status.className = "form-status error"; }
  finally { button.disabled = false; }
}
document.getElementById("contact-form")?.addEventListener("submit", e => { e.preventDefault(); sendForm(e.currentTarget, "/api/contact"); });

const bookingForm = document.getElementById("booking-form");
if (bookingForm) {
  const id = new URLSearchParams(location.search).get("id");
  const summary = document.getElementById("booking-summary");
  let selectedAd = null, savedBookingId = null;
  if (id) fetch(`/api/ads/${encodeURIComponent(id)}`).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(ad => {
    selectedAd = ad; document.getElementById("ad-id").value = ad.id;
    summary.innerHTML = `<span class="eyebrow">YOUR SELECTED SAMPLE</span><img src="${esc(ad.image)}" alt="${esc(ad.title)}"><span class="category">${esc(ad.category)}</span><h2>${esc(ad.title)}</h2><p>${esc(ad.description)}</p><b class="summary-price">${money(ad.price)} <small>starting price</small></b><p class="fine-print">Final quote depends on customisation and deliverables.</p>`;
  }).catch(() => { summary.innerHTML = `<span class="eyebrow">GENERAL ENQUIRY</span><h2>Let’s discuss your idea.</h2><p>No sample selected. Tell us what you need and we’ll take it from there.</p>`; });
  else summary.innerHTML = `<span class="eyebrow">GENERAL ENQUIRY</span><h2>Let’s discuss your idea.</h2><p>No sample selected. Tell us what you need and we’ll take it from there.</p>`;

  bookingForm.addEventListener("submit", async e => {
    e.preventDefault();
    const status = bookingForm.querySelector(".form-status"), button = bookingForm.querySelector("button[type=submit]");
    status.textContent = "Sending your enquiry…"; button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(bookingForm).entries());
      const response = await fetch("/api/bookings", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      savedBookingId = result.bookingId;
      status.textContent = `${result.message} Your reference number is AC-${savedBookingId}.`; status.className = "form-status success";
      bookingForm.querySelectorAll("input:not([type=hidden]),textarea").forEach(el => el.disabled = true);
      button.disabled = true;
      const paymentArea = document.getElementById("payment-area");
      if (selectedAd) {
        paymentArea.hidden = false;
        if (!siteConfig.paymentsEnabled) {
          document.getElementById("pay-advance").hidden = true;
          document.querySelector(".payment-note").textContent = "Your enquiry is saved. Online payment is not enabled yet; we’ll contact you about the advance.";
        }
      }
    } catch (err) { status.textContent = err.message; status.className = "form-status error"; button.disabled = false; }
  });

  document.getElementById("pay-advance")?.addEventListener("click", async e => {
    const btn = e.currentTarget, status = document.getElementById("payment-status");
    btn.disabled = true; status.textContent = "Preparing secure checkout…";
    try {
      const orderResponse = await fetch("/api/payments/create-order", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({booking_id:savedBookingId}) });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || "Could not create payment.");
      const scriptLoaded = await new Promise(resolve => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true); script.onerror = () => resolve(false); document.head.appendChild(script);
      });
      if (!scriptLoaded) throw new Error("Checkout could not load. Please try again.");
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: "Ad Craft",
        description: `20% booking advance — ${selectedAd.title}`, order_id: order.orderId,
        prefill: {name: bookingForm.elements.name.value, email: bookingForm.elements.email.value, contact: bookingForm.elements.phone.value},
        theme: {color:"#ff5a36"},
        handler: async function (paymentResult) {
          status.textContent = "Verifying payment securely…";
          const verifyResponse = await fetch("/api/payments/verify", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...paymentResult,booking_id:savedBookingId})});
          const verified = await verifyResponse.json();
          status.textContent = verified.message || verified.error;
          status.className = "form-status " + (verifyResponse.ok ? "success" : "error");
        },
        modal: { ondismiss: () => { btn.disabled = false; status.textContent = "Checkout closed. You can try again later."; } }
      });
      checkout.open(); status.textContent = `Secure checkout ready for ${money(order.amountUsd)}.`;
    } catch (err) { status.textContent = err.message; status.className = "form-status error"; btn.disabled = false; }
  });
}

const loginForm = document.getElementById("admin-login");
if (loginForm) {
  const loginWrap = document.getElementById("admin-login-wrap"), dashboard = document.getElementById("admin-dashboard");
  async function refreshAdmin() {
    const check = await fetch("/api/admin/me"); if (!check.ok) return;
    loginWrap.hidden = true; dashboard.hidden = false;
    const [ads, bookings, messages] = await Promise.all(["/api/admin/ads", "/api/admin/bookings", "/api/admin/messages"].map(u => fetch(u).then(r => r.json())));
    document.getElementById("admin-ads").innerHTML = ads.map(a => `<div class="admin-item"><div><b>${esc(a.title)}</b><small>${money(a.price)} · ${esc(a.category)} · ${a.publish_at && new Date(a.publish_at)>new Date() ? "Scheduled: "+new Date(a.publish_at).toLocaleString() : "Live"}</small></div><button data-delete="${a.id}" class="delete-btn">Delete</button></div>`).join("") || "<p>No samples yet.</p>";
    document.getElementById("admin-bookings").innerHTML = bookings.map(b => `<div class="admin-record"><div><b>${esc(b.name)} — ${esc(b.company)}</b><small>${esc(b.email)} · ${esc(b.phone || "No phone")} · ${esc(b.ad_title || "General enquiry")}</small><small>Payment: <b>${esc(b.payment_status || "Not paid")}</b></small><p>${esc(b.brief)}</p><small>${esc(b.created_at)} · Ref AC-${b.id}</small></div><select data-status="${b.id}">${["New","Contacted","In progress","Completed"].map(s => `<option ${s===b.status?"selected":""}>${s}</option>`).join("")}</select></div>`).join("") || "<p>No booking enquiries yet.</p>";
    document.getElementById("admin-messages").innerHTML = messages.map(m => `<div class="admin-record"><div><b>${esc(m.name)}</b><small>${esc(m.email)} · ${esc(m.created_at)}</small><p>${esc(m.message)}</p></div></div>`).join("") || "<p>No contact messages yet.</p>";
  }
  loginForm.addEventListener("submit", async e => {
    e.preventDefault(); const status = loginForm.querySelector(".form-status"); status.textContent = "Signing in…";
    const r = await fetch("/api/admin/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    const data = await r.json(); status.textContent = data.error || ""; if (r.ok) refreshAdmin();
  });
  document.getElementById("logout-btn").addEventListener("click", async () => { await fetch("/api/admin/logout", { method: "POST" }); location.reload(); });
  document.getElementById("upload-form").addEventListener("submit", async e => {
    e.preventDefault(); const form = e.currentTarget, status = form.querySelector(".form-status"); status.textContent = "Publishing…";
    const r = await fetch("/api/admin/ads", { method: "POST", body: new FormData(form) }); const data = await r.json();
    status.textContent = data.error || data.message; status.className = "form-status " + (r.ok ? "success" : "error");
    if (r.ok) { form.reset(); refreshAdmin(); }
  });
  document.getElementById("admin-ads").addEventListener("click", async e => {
    const id = e.target.dataset.delete; if (!id || !confirm("Delete this sample?")) return;
    await fetch(`/api/admin/ads/${id}`, { method: "DELETE" }); refreshAdmin();
  });
  document.getElementById("admin-bookings").addEventListener("change", async e => {
    const id = e.target.dataset.status; if (!id) return;
    await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:e.target.value}) });
  });
  refreshAdmin();
}
