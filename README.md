# Ad Craft — USD edition

A multi-page advertising portfolio and booking website with:
- Home, Samples, About, Contact, Booking, and private Admin pages
- Advertisement image uploads and **USD ($) starting prices**
- Category filters and scheduled weekly sample releases
- Booking and contact enquiry storage
- Admin booking-status management
- WhatsApp contact button
- Optional Razorpay checkout for a 20% booking advance in **USD**
- SQLite database and persistent login sessions

> Payment note: this version sends `currency: USD` to Razorpay and calculates the advance in US cents. An Indian Razorpay account must first be approved for international payments. Razorpay's current documentation lists Visa, Mastercard and American Express for international cards; some networks may need separate activation. Razorpay says international payments are settled to Indian merchants in INR after conversion, not paid out as USD. Card availability is controlled by Razorpay and the customer's card issuer, not by this website.

## 1. Downloads and accounts

Install these on your computer:

1. **Node.js LTS (20 or newer):** https://nodejs.org/ — choose the LTS download.
2. **Visual Studio Code:** https://code.visualstudio.com/ — for editing the project.
3. **Git:** https://git-scm.com/downloads — for uploading the project to GitHub.
4. **GitHub account:** https://github.com/ — create a private repository for the code.
5. **Render account:** https://render.com/ — to host the website.
6. **Domain registrar:** use an ICANN-accredited registrar to search for and register your chosen `.com` domain. Check both the first-year and renewal price.

If you are under 18, ask a parent/guardian to manage domain purchases, hosting billing, business/payment accounts, identity checks, and any contracts. Do not enter someone else's identity details or try to bypass age or verification rules.

## 2. Run Ad Craft on your computer

1. Extract `ad-craft-usd.zip`.
2. Open the extracted `ad-craft` folder in Visual Studio Code.
3. In VS Code, select **Terminal → New Terminal**.
4. Run:

   ```bash
   npm install
   ```

5. Make a copy of `.env.example` in the same folder and name the copy `.env`.
6. Edit `.env`:
   - `SESSION_SECRET`: replace with a long, random private value.
   - `ADMIN_USERNAME`: choose your admin login name.
   - `ADMIN_PASSWORD`: choose a strong, unique password.
   - `WHATSAPP_NUMBER`: enter the WhatsApp number with country code and digits only. Example format for India: `91XXXXXXXXXX` (no `+`, spaces or hyphens).
   - Leave the Razorpay keys blank for now.
7. Save `.env`, then run:

   ```bash
   npm start
   ```

8. Open http://localhost:3000 in your browser.
9. Open http://localhost:3000/admin.html and sign in with the username/password from `.env`.

To stop the local server, click the terminal and press `Ctrl + C`.

Never share `.env`, your admin password, or payment secrets. `.env` is excluded from Git by `.gitignore`.

## 3. Add your weekly advertisement samples

1. Sign in at `/admin.html`.
2. Enter the advertisement title, category, description, and starting price in **US dollars** (for example `49.00`).
3. Upload a JPG, PNG, WEBP, or GIF image (maximum 5 MB).
4. Leave the publication date blank to publish immediately, or choose a future date/time to schedule a weekly release.
5. Optionally feature the sample on the homepage, then choose **Publish sample**.

The three starter samples are demo content and use example USD prices. Replace them with your own original work and actual prices. Do not upload artwork, photos, logos, or fonts unless you own them or have permission to use them.

**Important if you already ran the older INR version:** do not reuse its old `data/adcraft.sqlite` database as-is, because its stored prices are rupee values. Back up anything you need, then start this USD version with a fresh database (remove the old `data/adcraft.sqlite` and its SQLite session file before starting this version). Existing uploads can be copied over separately if you own the rights to them.

## 4. WhatsApp

Set `WHATSAPP_NUMBER` in `.env` to your business WhatsApp number in international format with digits only, including country code. Save and restart the server. The floating WhatsApp button appears when a number is configured.

## 5. USD card payments, including American Express

The booking page can collect a **20% advance** based on the selected sample's USD starting price. The final project scope, full quote, deliverables, and timeline must still be agreed with the customer separately.

Razorpay documentation: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/ and https://razorpay.com/docs/payments/international-payments/

For an India-based merchant, Razorpay requires account verification and approval for international payments. Its documentation lists American Express (Amex), Visa and Mastercard among supported international card networks; Diners/Discover availability may require contacting support. **This does not guarantee Amex or every card will be enabled on a particular merchant account.** The account holder must confirm the enabled networks and USD support with Razorpay before going live.

Important currency detail: Razorpay's documentation says supported native currencies such as USD can be passed in the payment request after international payments are enabled. It also says settlements for Indian merchants are made in INR after conversion. So customers may be charged in USD, while the merchant's bank settlement is INR.

Setup sequence:

1. The legally eligible adult account holder creates and verifies the Razorpay merchant account. If you are under 18, a parent/guardian or other eligible adult must own and manage this account and complete required KYC.
2. The website needs complete, accurate business/contact details and clear Terms & Conditions, Privacy Policy, Refund/Cancellation Policy, and service-delivery/timeline information. Add and review these pages before applying. The current project contains placeholder business contact text; replace it with truthful details. Have an adult review the policies for the actual business and local requirements.
3. In the Razorpay Dashboard, request international card payments under **Account & Settings → International payments** (menu names may change). Follow the current Dashboard instructions and submit truthful requested information.
4. Ask Razorpay to confirm USD checkout and American Express acceptance for this exact account. Do not assume a logo or code change can enable a card network.
5. Start with Razorpay **Test Mode**. Copy the Test Key ID and Test Key Secret into local `.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
6. Restart `npm start` and complete a test booking/payment using Razorpay's official test details. Never use a real card or real money in test mode.
7. Only after approval and successful testing should the account holder switch to Live Mode and place the Live keys in the hosting provider's private environment settings. Never put the Key Secret in browser JavaScript, HTML, GitHub, screenshots, or messages.

This is a starter integration. Before commercial use, have a qualified developer add and test signed webhooks, payment reconciliation, refunds, backups, and operational monitoring. Do not treat a booking enquiry as a confirmed project until the customer receives written confirmation.

## 6. Publish the site with Render

The app stores its database, admin sessions, and uploaded images on disk. The default Render filesystem is temporary, so use a Render web service with a persistent disk mounted at `/var/data`, or move the database/uploads to suitable managed persistent services. Do not launch with an ephemeral filesystem or you may lose enquiries and uploads after a restart/deploy.

### A. Upload the code to GitHub

1. Create a **private** GitHub repository named `ad-craft`.
2. Open the project folder in VS Code → **Terminal → New Terminal**.
3. Run these commands, replacing the example username:

   ```bash
   git init
   git add .
   git commit -m "Create Ad Craft USD website"
   git branch -M main
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/ad-craft.git
   git push -u origin main
   ```

4. Check the repository on GitHub. Make sure `.env` was not uploaded.

### B. Create the Render service

1. Sign in to Render and choose **New → Web Service**.
2. Connect GitHub and select the private `ad-craft` repository.
3. Set Runtime to **Node**, Branch to `main`, Build Command to `npm install`, and Start Command to `npm start`.
4. Choose a plan that supports a persistent disk.
5. Add a persistent disk with mount path `/var/data` (choose a suitable size).
6. Create the service.

### C. Add environment variables in Render

Open the service → **Environment** and add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | A new long random secret |
| `ADMIN_USERNAME` | Your chosen admin username |
| `ADMIN_PASSWORD` | A strong unique password |
| `DATA_DIR` | `/var/data` |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `WHATSAPP_NUMBER` | International number, digits only |
| `RAZORPAY_KEY_ID` | Leave blank until payment setup is approved |
| `RAZORPAY_KEY_SECRET` | Leave blank until payment setup is approved |

Save and deploy. Put secrets only in Render's private Environment settings, never in GitHub.

### D. Test the live site

When Render shows the service as **Live**, open the `onrender.com` address shown in the dashboard and test:

- `/` — homepage
- `/samples.html` — advertisement samples and USD prices
- `/about.html` — about page
- `/contact.html` — contact form
- `/admin.html` — private admin dashboard

Publish a test sample, submit a test enquiry, and check the admin dashboard. Confirm the database and uploaded images remain after a redeploy.

## 7. Connect your own `.com` domain

1. With an adult/guardian, search for your preferred name at an ICANN-accredited registrar and register it if available. Domain availability and prices change; none of the example names are guaranteed available.
2. In Render, open the service → **Settings → Custom Domains → Add Custom Domain**.
3. Enter the exact domain you bought, such as `yourchosenname.com`.
4. Render will display the DNS records for that domain. Sign in to the registrar and copy those exact records into its DNS settings.
5. Return to Render and verify the domain. Render provisions HTTPS after DNS is configured.

Do not guess DNS values. Copy the current records Render provides. You can add the `www` version separately if you want both forms to work.

## 8. Before you launch publicly

- Replace demo samples, placeholder contact details, and example prices.
- Add and review Terms & Conditions, Privacy Policy, Refund/Cancellation Policy, and clear service-delivery timelines before applying for international payments.
- Use only original/licensed images, fonts, and logos.
- Test the website on a phone and computer.
- Test forms, admin login, backups, and payment flow in test mode.
- Have an adult/business operator review tax, business registration, privacy, refund, and payment obligations that apply to the actual business.
- Keep regular backups of the SQLite database and uploaded images.

## Troubleshooting

- `npm is not recognized`: install Node.js LTS, restart VS Code, and try again.
- Port already in use: set `PORT=3001` in `.env` and visit `http://localhost:3001`.
- Admin login fails: check the username/password in `.env`, then restart the server.
- Images disappear after deploy: verify the Render disk mount is `/var/data` and `DATA_DIR` / `UPLOAD_DIR` match the values above.
- Payment button is missing: payment keys are blank or invalid; configure Razorpay test keys only after the account is set up.
- USD payment fails: ask Razorpay whether international payments and USD are enabled for the account. Do not switch the code to INR unless you intend to change the website's displayed currency too.
- Amex is not offered at checkout: ask Razorpay to confirm Amex enablement for the merchant account. The website cannot force the payment provider to accept it.
- WhatsApp button is missing: check `WHATSAPP_NUMBER` contains digits only, including country code.

## Official setup documentation

- Node.js: https://nodejs.org/
- Visual Studio Code: https://code.visualstudio.com/
- Git: https://git-scm.com/downloads
- GitHub: https://docs.github.com/
- Render web services: https://render.com/docs/web-services
- Render persistent disks: https://render.com/docs/disks
- Render environment variables: https://render.com/docs/configure-environment-variables
- Render custom domains: https://render.com/docs/custom-domains
- Razorpay international payments: https://razorpay.com/docs/payments/international-payments/
- Razorpay standard checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
