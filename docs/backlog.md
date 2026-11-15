# Backlog ("basket")

Features from the OrderRestro blueprint (`docs/nodedr-feature-blueprint.md`) that are parked. Pull from here when one is needed.

## Phase 2 leftovers
- Guest pays online from the QR page (Razorpay), order held until the payment webhook confirms. Needs a Razorpay test-mode run to verify.
- Customer display on a separate device (needs a server channel + display token; today it is same-browser only via BroadcastChannel).

## Phase 3 leftovers (customers, loyalty and promotions)
- Gift cards (issue, check balance, spend at checkout).
- Coupons and happy-hour pricing (applied in `utils/pricing.js`).
- Ratings after a paid order (guest page stars + ratings list).
- Referrals (customer referral code, reward on first paid order).
- Email campaigns with segments (all, loyal, lapsed, birthday month) and opt-out.
- Reverse earned points when an order is refunded in cash/card/UPI (today only refunds of points give points back).

## Phase 4 leftovers (inventory)
- Batches with FIFO consumption and expiry dates.
- Procurement depth: purchase requests, quotation compare, supplier invoices and payments, supplier performance.
- Production/manufacturing batches.
- Photos and an approval threshold on waste entries.

## Phase 6 leftovers
- Scheduled report emails (cron + SMTP).
- Budgets, bank CSV reconciliation, balance sheet.
- Excel/PDF export (CSV exists).

## Phase 5 leftovers
- Payslip email, statutory deductions (PF/ESI/TDS), advances and loans.

## Phase 6 leftovers (more)
- Report catalog beyond sales (by category, per-item margin), IGST and credit notes in the GST summary, refunds netted from GST.

## Phase 7 leftovers
- Kiosk card/UPI payment on the screen (today the guest pays at the counter and staff accept the order).
- Rider takes payment in the rider app; live rider location; address/postcode → zone auto-match.

## Phase 8 (platform extras), all parked
- TOTP 2FA + recovery codes.
- Backup/restore (mongodump to object storage).
- Outbound signed webhooks, API keys, public integration API.
- Equipment maintenance and documents.
- i18n.
- Multi-branch.
- ESC/POS thermal printing through a local print bridge.
