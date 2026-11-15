# nodedr OrderRestro → RestaurantOS: feature blueprint, gap matrix and build plan

Research date: 2026-11-14. Research only: no feature code has been written in RestaurantOS yet.

Source studied: `https://github.com/Raktim94/nodedr-restaurant-pos`, commit `947628858769`, app version 1.33.0
(product name "Nodedr OrderRestro").

---

## 0. Read this first

### 0.1 License: do not copy their code

| Item | Finding |
|---|---|
| License | **GNU AGPL-3.0-only** (`LICENSE`, `NOTICE`, `COPYRIGHT`, `package.json`) |
| Copyright | Nodedr Infotech Private Limited and Raktim Ranjit |
| Network clause | If you run a modified version as a service, you must give its users the full source of your modified version (AGPL section 13). |
| Commercial licence | Available from the author for closed-source use (`COMMERCIAL-LICENSE.md`). |
| Trademarks | "Nodedr", "Nodedr OrderRestro", "OrderRestro" and their logos are **not** licensed (`TRADEMARK_POLICY.md`). |

What this means for us: if we paste their code (or translate it line by line) into RestaurantOS, RestaurantOS becomes an AGPL
derivative and we must publish its whole source to every user who reaches it over the network. To avoid that, we
**re-implement the behaviour** described in this document in our own stack (Express + Mongoose + React/Vite), written fresh.
Do not copy their source files, UI copy, screenshots, logo or brand names. Feature ideas and behaviour are not what the
licence protects; the code and its expression are. This is not legal advice. If you ever want to reuse their actual code,
ask a lawyer or buy their commercial licence.

### 0.2 Did we run their app?

**No, not live.** Docker Desktop is installed but stopped. When we started it, macOS asked for an administrator password
("privileged port mapping"), and a background agent cannot answer that prompt. The prompt was closed and Docker was
stopped again. There is no local PostgreSQL. Building from source would mean running their `pnpm install` (native add-ons:
usb, sharp, bcrypt, prisma) on Node 26 when they pin Node 22. We judged that too slow and too risky for this pass.

What we used instead:

- The full source: 120 Prisma models, 59 enums, 70 migrations, 522 REST endpoints in 50 controllers, 65 web pages, and
  about 105k lines of TypeScript.
- **116 real screenshots of the running app** that ship in the repo (`docs/screenshots/*.png` and
  `docs/screenshots/tutorial/*.png`). These include POS, cart, modifiers, checkout, the UPI QR, KDS, tables, dashboard,
  every accounting tab, team, payroll, reports, marketing, settings and the customer display.
- Their own docs: `ARCHITECTURE.md`, `FEATURE-CHECKLIST.md`, `TUTORIAL.md`, `docs/TABLE_SESSION_ARCHITECTURE.md`,
  `docs/TPV-AND-TABLE-ORDERING.md` and `docs/KIOSK-AND-KDS.md`.

**How to run it yourself** (about 5 minutes once Docker is running): we prepared an isolated compose file at
`/private/tmp/claude-501/-Users-dhruvsmac-Desktop-RestaurantOS/456621b4-0667-4b8c-b4b0-b1aa7b93016c/scratchpad/nodedr-run/docker-compose.yml`.
It uses the prebuilt 1.33.0 images, an unpublished Postgres, no updater container (theirs mounts `docker.sock`) and no USB
passthrough, and it binds only to `127.0.0.1:1995`. It does not touch port 5173, port 5001 or our MongoDB. The scratchpad
is temporary, so copy the file somewhere durable if you want to keep it.

1. Open Docker Desktop and approve its admin prompt.
2. Run `docker compose -f <that file> up -d`.
3. Open `http://localhost:1995` and choose **Sign up**. There is no demo data; their demo seed SQL is not public.
4. When you are finished, run `docker compose -f <that file> down -v`.

---

## 1. Blueprint of nodedr OrderRestro

### 1.1 Tech stack and architecture

| Layer | Their choice | Our equivalent |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo: `apps/backend`, `apps/web`, `packages/types` | Two folders: `Backend/` and `Frontend/` |
| Backend | NestJS (TypeScript), one module per domain, REST under `/api/v1`, Swagger at `/api/docs` | Express 4, plain JS, `routes/` + `controllers/` + `models/` |
| DB / ORM | PostgreSQL 16 + Prisma. Money is `Decimal(12,2)`. | MongoDB + Mongoose. Money is a JS `Number`. |
| Validation | Zod schemas shared by frontend and backend (`packages/types`) | None (bodies are saved as sent) |
| Realtime | Socket.IO gateway: one room per branch, one room per user. Events are only hints to refetch. | None (30 s polling in `Header.jsx`) |
| Frontend | Next.js App Router, Tailwind v4, shadcn/ui, TanStack Query and Table, React Hook Form, Recharts, dnd-kit, next-intl | React 19, Vite, Tailwind 3, Redux Toolkit, TanStack Query, framer-motion |
| Auth | JWT in an httpOnly cookie (`nodedr_session`), PIN login, optional TOTP 2FA, `sessionsValidFrom` for log-out-everywhere | JWT in an httpOnly cookie (`accessToken`), email + password |
| Printing | HTML receipt through the browser, plus ESC/POS over USB (`/dev/usb/lp0` or libusb) or network TCP 9100, plus a cash-drawer kick | Browser print of an HTML invoice |
| Deploy | Docker Compose (postgres, backend, web, updater), CasaOS, Debian package, Windows MSIX shell, Capacitor mobile app | Render (from the CORS list) |

Their design principles, all enforced in code, are worth adopting:

1. **The server owns the money.** All price, tax, discount and loyalty arithmetic runs on the server. The client sends only
   item ids, quantities and option ids.
2. **Every action is gated by a granular permission**, never by a hard-coded role check.
3. **Nothing is deleted to represent a cancellation.** Cancel source, reason, who and when are stored, plus an audit row.
4. **Idempotency everywhere money moves.** `clientRequestId` on orders and payments, so a double tap or a retry records once.
5. **Compare-and-set state moves.** A stale screen gets a `409` instead of skipping or repeating a step.

### 1.2 Multi-tenancy

`Restaurant` (1) → `Branch` (many) → every operational row carries `branchId`. Users link to branches through `UserBranch`.
A branch switcher sits at the top of the sidebar.

- **Restaurant-level settings:** currency, timezone, UPI VPA and payee name, loyalty point value and earn rate, referral
  points, maximum manual discount %, whether a discount reason is required, online price adjustment, whether a table session
  is required, NFC tables, and manufacturing.
- **Branch-level settings:** address, GSTIN/tax id, tax regime (India GST / US Sales Tax / EU VAT / Spain IVA), tax
  inclusive or exclusive, auto-confirm online orders and reservations, kiosk token and flags, and printer settings.

### 1.3 Roles and permissions

There are 46 permission keys (`packages/types/src/permissions.ts`), and each can be toggled per role. Per-user overrides live
in `UserPermissionOverride`. A "manage" key implies its "view" key (`menu.manage` ⇒ `menu.view`, `tables.manage` ⇒
`tables.view`, `inventory.manage` ⇒ all `production.*`).

Keys by area:

- **Sales/Orders:** `sales.view`, `dashboard.sales.view`, `orders.create|edit|cancel|accept|delete`, `discounts.apply`,
  `discounts.unlimited`, `refunds.process`, `bills.print`
- **Floor:** `tables.view|manage`, `table.session`, `nfc.manage`, `reservations.manage`
- **Menu:** `menu.view|manage`, `menu.price`
- **Kitchen:** `kds.manage`
- **Stock:** `inventory.manage`, `production.record|post|void|report|quality`
- **People:** `users.manage`, `roles.manage`, `attendance.manage`, `staff.manage`
- **Money:** `accounting.manage`, `reports.access`, `reports.financial.view`, `data.export`
- **CRM:** `customers.manage`, `marketing.manage`, `ratings.view`
- **Delivery:** `delivery.manage`, `delivery.rider`
- **Admin:** `settings.manage`, `audit_log.view`, `backup.manage`, `system.update`, `operations.manage`

There are 11 seeded roles with default bundles: OWNER, ADMINISTRATOR (all keys), RESTAURANT_MANAGER, CASHIER, WAITER,
KITCHEN_STAFF, CHEF, BARTENDER, DELIVERY_STAFF, ACCOUNTANT, INVENTORY_MANAGER. Custom roles can be created. The sidebar hides
items the user has no permission for (`apps/web/components/layout/nav-items.ts`).

### 1.4 Data model (grouped; 120 models)

| Domain | Models |
|---|---|
| Tenancy and auth | Restaurant, Branch, User, UserBranch, Role, RolePermission, Permission, UserPermissionOverride, Department, StaffApiKey, IntegrationApiKey, PosDevice, DeviceToken |
| Audit and system | AuditLog, Notification, Backup, BackupConfig, SyncState, SyncChange, DownloadStat |
| Floor | Floor, FloorLayout, Table, TableSession, TableSessionGrant, TableAccess, TableRequest (WAITER/BILL), NfcTag, NfcTap, Reservation, WaitlistEntry, Buzzer, BuzzerCall |
| Menu | MenuCategory, MenuItem, ModifierGroup, Modifier, MenuItemModifierGroup, ComboComponent, KitchenStation, MenuPriceChange |
| Orders | Order, OrderItem, OrderItemModifier, OrderItemCost, Kot, KotItem, Payment, Refund, OrderItemStockReturn, PublicOrderKey, OrderRating |
| Payments | PaymentGatewayCatalogEntry, PaymentGatewayConnection, GatewayPayment, GatewayWebhookEvent, GatewayRefund |
| CRM | Customer, CustomerAddress, GiftCard, GiftCardRedemption, PointsLedger, Referral |
| Marketing | Coupon, Promotion (happy hour), Campaign |
| Inventory | Ingredient, RecipeIngredient, ModifierIngredient, MenuItemCosting, StockBatch, StockMovement, WasteLog, WasteEntry, StockTake, StockLocation, StockLevel, LocationTransfer, StockTransfer, Preparation, PreparationLine, ProductionRun, ProductionEntry, ProductionLine, ProductionCost |
| Procurement | Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem, PurchaseRequest, PurchaseRequestItem, SupplierQuotation, SupplierQuotationItem, SupplierInvoice, SupplierPayment |
| HR | Attendance, Shift, LeaveRequest, StaffPay, PayrollRun, PayrollLine |
| Accounting | Expense, CashClosing, Budget, BankTransaction, ReportSchedule |
| Delivery | DeliveryZone (plus delivery and driver fields on Order) |
| Display | DisplayTerminal, DisplayAd |
| Ops / integrations | Equipment, ServiceLog, Document, DocumentFile, WebhookEndpoint, WebhookDelivery, IntegrationConnection, IntegrationLog, VerifactuSettings, VerifactuRecord |

Key fields (the ones we must mirror):

- **Order:** `orderNumber` (unique per branch); `type` (DINE_IN, TAKEAWAY, DELIVERY, DRIVE_THRU, QR_ORDER, KIOSK, PHONE);
  `status` (OPEN, BILLED, PAID, CANCELLED); `channel` (STAFF, ONLINE); `acceptance` (NOT_REQUIRED, PENDING, ACCEPTED,
  REJECTED); `payIntent` (CASH, ONLINE); `heldForPayment`; `tableId`; `guestCount`; `guestName`; `customerId`;
  `createdById`.
  - Amounts: `subtotal`, `discountAmount`, `discountType`, `discountValue`, `discountReason`, `taxAmount`, `tipAmount`,
    `requestedRedeemPoints`, `loyaltyPointsRedeemed`, `loyaltyDiscountAmount`, `deliveryFee`, `totalAmount`.
  - Cancellation: `cancelReason`, `cancelSource` (STAFF, CUSTOMER, KITCHEN_REJECTED, ONLINE_DECLINED), `cancelledAt`,
    `cancelledById`.
  - Other: `couponCode`, `promotionName`, `clientRequestId` (unique per branch), the delivery fields (zone, address,
    pincode, phone, lat/lng, `deliveryStatus`, `driverId`, ETA and timestamps), `scheduledFor`, and external source and id.
- **OrderItem:** `nameSnapshot`, `unitPriceSnapshot`, `taxRateSnapshot`, `quantity`, `lineTotal`, `kitchenNote`, `status`,
  `portion` and `portionRatio` (half portions), modifiers stored as snapshots.
- **Kot (kitchen ticket):** one per order per station. `ticketNumber`; `status` (NEW → ACCEPTED → PREPARING → READY →
  SERVED; REJECTED and CANCELLED are terminal); `isPriority`; `printedCount`; timestamps for each step; reject reason.
- **Payment:** `method` (CASH, CARD, UPI, WALLET, BANK_TRANSFER, GIFT_CARD, STORE_CREDIT, OTHER), `amount` (what is
  applied to the bill), `tendered`, `changeGiven`, `reference`, `clientRequestId` (unique per order).
- **Table:** `number`, `capacity`, `status` (AVAILABLE, OCCUPIED, RESERVED, CLEANING, OUT_OF_SERVICE), `statusSince`,
  `posX`/`posY`/`width`/`height`/`rotation`/`shape`/`color`, `assignedWaiterId`, `qrToken` (rotatable).
- **MenuItem:** `sku`, `barcode`, `description`, `imageUrl`, `price`, `halfPrice`, `taxRatePercent`, `costPrice`,
  `prepTimeMinutes`, `calories`, the dietary flags (`isVeg`/`isVegan`/`isJain`/`isHalal`/`isGlutenFree`), `spiceLevel`,
  `allergens[]`, `availableFrom`/`availableTo`, the seasonal window, `isActive`, `isCombo`, `stationId`,
  `inventoryTracking`, `sortOrder`.

### 1.5 Order lifecycle: three separate state machines

An order moves through three state machines that are kept apart on purpose (from `ARCHITECTURE.md` and
`packages/types/src/order-lifecycle.ts`):

| Machine | Values | Who moves it |
|---|---|---|
| Acceptance (online orders only) | NOT_REQUIRED · PENDING → ACCEPTED or REJECTED | `orders.accept` |
| Kitchen ticket (Kot) | NEW → ACCEPTED → PREPARING → READY → SERVED; REJECTED, CANCELLED | `kds.manage` |
| Billing (Order.status) | OPEN → PAID, or OPEN → CANCELLED (part payments keep it OPEN) | `bills.print` to pay, `orders.cancel` to cancel |

Rules:

- A pending online order has **no** kitchen ticket until it is accepted.
- Cancelling food that is already being cooked needs an explicit `confirmStarted`.
- Served food can only be corrected through a refund.

### 1.6 Billing and settlement: how the money works

The logic is in `apps/backend/src/modules/orders/settlement.ts`, `pricing.ts` and `orders.service.ts#checkout`.

1. **`POST /orders/:id/bill-preview`** prices the bill on the server without saving anything. It applies the discount (% or
   flat), the coupon, the tip, loyalty points and the delivery fee. The printed bill is rendered by the same function, so
   the paper always matches what will be charged.
2. **Tax model.** Prices are tax-inclusive by default; tax-exclusive is a branch setting. A discount reduces the taxable
   value: the tax breakup is scaled by `(subtotal − discount) / subtotal`. Loyalty points count as tender, not as a price
   cut, so they leave tax unchanged. Tips and delivery fees sit outside the taxable subtotal. Every amount is rounded to 2
   decimal places with `round2`.
3. **Discount cap.** Discounts above `Restaurant.maxManualDiscountPercent` need `discounts.unlimited`, and a reason can be
   required.
4. **`POST /orders/:id/checkout`** runs as one database transaction:
   1. Record the payments. More than one tender is allowed. Cash keeps `tendered` and `changeGiven`. A card or UPI payment
      can never exceed the balance. `allowPartial` keeps the order OPEN.
   2. The first payment **locks** the discount, tip and points.
   3. Debit the gift card and write a `GIFT_CARD` payment row.
   4. Redeem loyalty points with a conditional decrement (`loyaltyPoints >= n`).
   5. On full payment:
      - Deduct stock FIFO from recipe batches (a shortfall never blocks the sale).
      - Release the table if it has no other open order.
      - Earn loyalty points on net spend (excluding the tip) with an atomic increment.
      - Pay out referral rewards on a referred customer's first paid order.
      - Set `status` from OPEN to PAID **with `status: 'OPEN'` in the where clause**, so a racing second checkout fails and
        its whole transaction rolls back.
   6. Write an audit row and fire the `order.paid` webhook.
5. **Refunds** (`POST /orders/:id/refund`, `refunds.process`) are capped at the refundable remainder. Partial refunds are
   allowed, and the refund can optionally return stock.
6. **UPI.** `upi://pay?pa=<vpa>&pn=<payee>&am=<amount>&cu=INR&tn=<note>&tr=<orderNo>` (`orders/upi.ts`) is rendered as a QR
   for the exact amount due, at the till, on the customer display and on the printed bill. The cashier confirms the money
   arrived and presses *Complete payment*, and a chime plays. No gateway is needed.
7. **Payment gateways** (Settings → Payments): Razorpay, Stripe and Cashfree, plus custom gateways. Credentials are stored
   encrypted, there are test and live modes, and webhooks go to `/webhook/:restaurantId/:provider/:mode`. A test-mode payment
   never settles an order. Unmatched money is flagged `NEEDS_REVIEW`.

### 1.7 Screens and user flows (from the source and the screenshots)

**Global layout.** A left sidebar holds:

- the restaurant logo and name;
- the branch switcher;
- the navigation items (Dashboard, Point of Sale, Orders, Tables, Reservations, Menu, Kitchen Display, Customers, Inventory,
  My deliveries, Delivery, Team, Accounting, Reports, Marketing, Operations, Attendance, Settings), each hidden without its
  permission;
- a "Contact support" link at the bottom.

The sidebar collapses. The top bar has a language picker (EN/ES/FR), a notifications bell, a light/dark toggle and a user
menu. The design is neutral off-white with a single crimson accent and rounded cards. The layout is responsive, and POS and
the dashboard work on a phone.

#### Dashboard (`/dashboard`)

- A row of quick-action chips: New order, Tables, New reservation, Kitchen display, Menu.
- Four KPI cards: Today's revenue, Today's orders, Occupied tables, Kitchen queue.
- A "Revenue — last 14 days" line chart and a "Food waste cost — last 14 days" chart.
- A bottom row of cards: Tables by status, Kitchen queue by status, Recent transactions (with a refund shortcut), and Order
  channels (online QR/kiosk versus offline).
- Each user can show or hide widgets (`/dashboard/preferences`).
- Endpoints: `/dashboard/summary` and `/trends`.

#### Point of Sale (`/pos`)

The page has two panes.

- **Left pane:** a "Kitchen · New N" strip, a menu search box, category tabs, and item cards (a veg/non-veg dot, the name
  and the price).
- **Right pane (cart):** a Dine-in / Takeaway / Delivery segmented control, a table picker, and cart lines with − qty +
  and a delete button. Below them are "Subtotal (incl. tax)" and **Send to kitchen**.

Flow:

1. Tap an item. If it has modifier groups, a picker opens and enforces min/max/required choices.
2. Press **Send to kitchen**. This creates the order and the KOTs, split by station.
3. The panel switches to the order view:
   - Back, Cancel order (asks for a reason), the order number, Print KOT, and the total with the tax line.
   - A hint: "No need to pay right now — tap Back to help another table".
   - Attach customer (search, or New customer).
   - Discount %, Tip, Coupon code (Apply), Gift card code (Check), Payment method (CASH, CARD, UPI and so on).
   - When UPI is picked, a QR for the exact amount appears.
   - An equal-split calculator ("Split between N guests").
   - **Complete payment**.
4. Adding items to an open order sends only the new lines to the kitchen ("Added to order #… — sent to kitchen").

#### Orders (`/orders`)

- A list with status, type, table, total and paid amount, filters, and an order drawer.
- From the drawer you can edit the bill (quantities, lines, table transfer, guest and note), cancel, refund, merge, print
  the receipt or KOT, and *Send to kitchen anyway* for held online orders.
- A scan field accepts a kiosk ticket QR or an order number.
- Admins can bulk-delete past transactions (needs the admin password).

#### Tables (`/tables`, `/tables/live`, `/tables/cards`, `/tables/nfc`)

- **Floor view:** tiles colour-coded by status (Available green, Occupied crimson, Reserved amber, Cleaning or out of
  service grey), shape-aware icons and capacity. Tap a tile to change its status, open its bill or open a table session.
- Floor tabs, **Edit floor plan** (drag, resize and rotate; save named layouts per floor and activate one), and bulk
  add/edit/delete.
- **Waitlist panel** on the right: name, party size, quoted wait, Seat (assigns a table) and Remove.
- **Live board:** each table's *derived* lifecycle state (CLOSED, ACCESS_VERIFIED, OPEN, ORDER_PROCESSING,
  PAYMENT_PENDING, SETTLED, ATTENTION_REQUIRED) plus open guest requests (Call waiter, Bring bill) with a resolve action.
- **Table cards:** a printable QR card per table. **NFC tags:** provision, test, rotate, disable and replace.

#### Reservations (`/reservations`)

- A list of bookings with a New reservation dialog: name, phone, email, guests, date and time, duration, table, special
  requests and deposit.
- A status menu: RESERVED → CONFIRMED → ARRIVED → COMPLETED, or CANCELLED / NO_SHOW.
- The waitlist is shared with the Tables page.

#### Menu (`/menu`)

- Categories, items, modifier groups and combos, plus kitchen stations.
- **Add item dialog:** every MenuItem field listed above, a photo upload and modifier group links.
- **Combo builder:** component items with quantities.
- Bulk price change, with history kept in `MenuPriceChange`.

#### Kitchen Display (`/kds`)

- A header card shows "Avg. time to ready today" per station. Station chips pick which station this device shows, and the
  choice is remembered per device.
- Four columns: **New / Accepted / Preparing / Ready**, each with a count.
- **Ticket card:** `#ticket`, type and station, an elapsed-time chip (a warning ring after 15 minutes), the item lines
  (qty × name, modifiers, notes), the primary action (Accept → Start → Ready → Served), a priority star and a print button.
- Reject asks for a reason. Rejecting an order's only live ticket withdraws the order and frees the table.
- An "Incoming" queue lists online orders to accept or decline.
- A chime and a toast fire on each new ticket, muted per device. **Call buzzer** appears on Ready tickets.

#### Customers (`/customers`, `/customers/[id]`)

- **List:** search and add a customer (name, phone, email, birthday, anniversary, allergies, notes, addresses).
- **Profile:** order history, loyalty points, gift cards (issue and check), referral code and rewards, and store credit
  (wallet).

#### Inventory (`/inventory/*`, 13 pages)

| Page | What it covers |
|---|---|
| Ingredients | Stock, unit, reorder level and weighted-average cost |
| Procurement | Requests → quotations (cheapest-first compare) → invoices → payments |
| Purchase orders | Draft → sent → partially received → received, with GRN (batch number and expiry) |
| Suppliers | Contacts, terms and performance (on-time rate, lead time, spend) |
| Waste | Reason-coded, photo, approval above a threshold, FIFO-costed |
| Transfers | Between branches |
| Areas | Stock locations and a location matrix |
| Stock journal | Every movement, with CSV export |
| Stock take | Counts |
| Shopping list | Reorder suggestions from the par level |
| Stock report | Stock position |
| Production | Batch production with actual usage and extra costs, cost per unit, and an optional menu price update |
| Manufacturing reports | Production cost reporting |

Recipes map a menu item (and its modifiers) to ingredients. Stock is deducted at checkout.

#### Delivery (`/delivery`) and My deliveries (`/my-deliveries`)

- **Delivery:** zones defined by a pincode list with a fee, a minimum order and an ETA.
- A delivery orders board with *assign driver* and a status flow UNASSIGNED → ASSIGNED → PICKED_UP → DELIVERED / FAILED.
- **Rider view:** on/off duty, location ping, and own deliveries with status buttons.

#### Team (`/team`)

| Tab | What it covers |
|---|---|
| Schedule | A weekly shift grid with an overlap warning |
| Leave | Approve or reject requests |
| Payroll | Pay rates (monthly or hourly, overtime threshold and multiplier, late grace); run payroll for a period from clocked hours, minus approved unpaid leave, plus a tip pool split by hours; draft → finalize → paid; payslip; CSV |
| Performance | Sales and orders per staff member |

#### Attendance (`/attendance`)

- Staff clock in and out with breaks.
- Managers see everyone's hours and correct missed punches.

#### Accounting (`/accounting`)

| Tab | What it covers |
|---|---|
| Expenses | Category, amount and "paid from till" |
| Cash close | Opening float + cash sales − cash expenses = expected; counted; variance |
| Profit & loss | Net sales − expenses − payroll |
| Balance sheet | Cash, inventory, payables and gift-card liability |
| Budgets | Per category per month, against actual spend |
| Bank | CSV import, auto-match to expenses (same amount within 5 days), manual match or ignore |
| GST | Summary by rate |
| Branches | Cross-branch overview |

#### Reports (`/reports`)

18 reports:

| Area | Reports |
|---|---|
| Sales | sales-daily, sales-by-item, sales-by-category, popular-items, slow-movers |
| Money | payment-methods, discounts, tax |
| Operations | peak-hours, table-turnover, reservations, delivery |
| Costs | food-cost, waste, inventory-valuation |
| Customers and staff | customers, retention, staff-sales |

- Each report can be printed or exported as CSV, Excel or PDF (export needs `data.export`).
- Reports can be emailed on a schedule (daily, weekly or monthly at 06:00 branch time, over SMTP) with a "Send now" button.

#### Marketing (`/marketing`)

- **Coupons:** code, % or flat, minimum order, maximum discount, validity window and usage limit.
- **Happy hour:** % or flat, by day of week and a start/end time.
- **Campaigns:** SMS, Email or WhatsApp to a segment (ALL, LOYAL, LAPSED, BIRTHDAY_MONTH), honouring opt-out, with an
  audience preview and CSV export.

#### Operations (`/operations`)

- An equipment register with service logs and overdue flags.
- Documents (SOPs, contracts, recipes) with file attachments.

#### Ratings (`/ratings`)

- Customer ratings tied to a paid order, one per order.

#### Settings (`/settings/*`)

- General settings for the restaurant and branch: tax regime, UPI and logo.
- Staff (add, deactivate, PIN, departments) and Roles (a permission checklist).
- Audit log, Backup (S3 or local), Security (2FA and recovery codes).
- Devices (POS heartbeat, revoke), API keys, Webhooks (signed, with delivery log and test), Integrations and Payment gateways.
- Customer screen (terminals and adverts), Buzzers, Sync, Updates, VERI*FACTU (Spain) and the Simulator.

#### Public, guest-facing surfaces (no login)

| URL | What it does |
|---|---|
| `/order/[qrToken]` | QR table menu. The guest enters a name, adds items and modifiers, and needs the **6-character table code** staff give them (a photo of the QR cannot order). Pay at the register (sent to the kitchen now, cash due) or pay on the phone through a gateway (held from the kitchen until paid). Call waiter / request bill. Order status. Rating after a paid order. Idempotent submit. |
| `/kiosk/[token]` | Self-service kiosk: welcome → eat here or take away → menu → options → basket → review → one submit → large order number. Prices are recomputed on the server; payment is at the counter. |
| `/customer-display` | Second screen. Adverts when idle → live cart → UPI QR (kept up for at least 3 minutes) → Thank you with a chime. Follows the POS in the same browser, or a terminal by token. |
| `/t/[ref]` | Referral landing page |
| `/pay/return` | Gateway return page |

### 1.8 Realtime events

The backend emits `order.created`, `order.updated`, `order.deleted`, `kot.created`, `kot.updated`, `kot.reprinted`,
`table.updated`, `table.deleted`, `table.layout.updated`, `table.request`, `reservation.created`, `reservation.updated`,
`waitlist.created`, `waitlist.updated`, `buzzer.called` and `buzzer.acked`.

All of them go to the branch room. Screens refetch from the API on each event and on every reconnect; the event payload is
never trusted as state.

### 1.9 API surface (522 endpoints, `/api/v1/...`)

Routes, grouped by controller, with the permission each needs:

- **auth** (13): register, login, pin-login, logout, me, 2fa setup/enable/disable/reset, setup-status.
- **orders** (26): list, manage, get, create, add items, edit, edit line, remove line, cancel, accept/reject, release (send to
  kitchen anyway), discount-preview, bill-preview, checkout, receipt, KOT HTML, print diagnostics/test/drawer, USB and KOT
  print, refund, merge, delete-bulk.
- **kds** (12): stations, tickets, incoming accept/reject, progress, performance, ticket status/reject/priority/print/reprint.
- **tables** (23): floors, layouts, bulk, overview, sessions, status, qr-token, requests/resolve.
- **menu** (19): categories, stations, items, bulk-price, upload-image, modifier-groups, combo-components.
- **public** (8 + 2 kiosk): menu/:qrToken, order, pay-online, pay-cash, session, status, request.
- **customers** (10), **gift-cards** (3), **marketing** (14), **reservations** (3), **waitlist** (4), **delivery** (8),
  **rider** (5).
- **inventory** (44 + 46 stock-journal/production + 2 transfers).
- **hr** (21), **attendance** (6), **accounting** (9 + 10 ledger), **reports** (4 + 5 schedules), **dashboard** (4).
- **users** (10), **roles** (4), **settings** (6), **audit-logs** (2), **backups** (8), **webhooks** (7),
  **payment-gateways** (11 + 9), **display** (13), **paging** (10), **nfc** (10), **operations** (13), **notifications** (3),
  **imports** (3, CSV preview/commit), and **integrations**, **mcp**, **sync** and **system** (platform).

The full route-by-route list with permissions is at
`/private/tmp/claude-501/-Users-dhruvsmac-Desktop-RestaurantOS/456621b4-0667-4b8c-b4b0-b1aa7b93016c/scratchpad/nodedr-routes.txt`
(temporary).

---

## 2. What RestaurantOS has today (verified in code, 2026-11-14)

### Backend (`Backend/`, Express + Mongoose, mounted in `app.js`)

| Area | Model | Routes | Notes |
|---|---|---|---|
| Users / auth | `models/userModel.js`: name, email, phone, password (bcrypt), `role` (free string) | `/api/user`: `POST register`, `POST login`, `POST logout`, `GET /` | JWT cookie `accessToken`, checked by `middlewares/tokenVerification.js#isVerifiedUser`. **No role or permission enforcement anywhere.** |
| Categories | `categoryModel.js`: name (unique) | `/api/categories` CRUD | GET routes are public |
| Items | `itemModel.js`: name, price, category ref, `itemCategory` veg/non-veg/none | `/api/items` CRUD + `GET /popular-dishes` | GET routes are public |
| Tables | `tableModel.js`: tableNo (unique), status (free string, "Available"/"Booked"), seats, currentOrder | `/api/table` CRUD | |
| Orders | `orderModel.js`: customerDetails {name, phone, guests}, `orderStatus` (free string: In Progress/Ready/Completed), orderDate, bills {total, tax, grandTotal}, `items: []` (untyped), table, paymentMethod, paymentData | `/api/order`: create, list (non-completed), get, `PUT` (saves the whole body), `DELETE /:orderId/items/:itemId` | Totals come **from the client** and are saved as-is |
| Payments | `paymentModel.js`: Razorpay payment record | `/api/payment`: create-order, verify-payment, webhook-verification | HMAC verification on verify and webhook; dedupes by `paymentId` |
| Seed | `scripts/seed.js` | `npm run seed` | |

### Frontend (`Frontend/src/`)

| Area | Files | What it does |
|---|---|---|
| Routing | `App.jsx`, `pages/index.js` | `/auth`, `/` (Home), `/orders`, `/tables`, `/menu`, `/menu/:id`, `/dashboard`, `*` (NotFound). `ProtectedRoutes` checks `state.user.isAuth`. |
| API client | `https/index.js` | Axios with `withCredentials`, one function per endpoint |
| State | `redux/store.js`; slices `CartSlice` (items, instructions, returned flags), `CustomerSlice` (name, phone, guests, table), `userSlice`, `categorySlice`, `itemSlice` (+ unregistered `tableSlice`, `authSlice`) | Server data mostly comes through TanStack Query |
| Home | `pages/Home.jsx`, `components/home/*` | Greeting, mini cards, popular dishes, recent orders |
| Menu / POS | `pages/Menu.jsx`, `components/menu/{MenuContainer,CartInfo,CustomerInfo,Bill}.jsx` | Category + item grid, cart with per-item instructions, customer info. Bill uses a **hard-coded 5.25% tax** computed in the browser, Cash or Razorpay "Online", "KOT & Print" / "Update Order". |
| Invoice | `components/invoice/{Invoice,ReturnedItemsReceipt}.jsx` | Browser-printed invoice and returned-items receipt |
| Orders | `pages/Orders.jsx`, `components/orders/OrderCard.jsx` | Filter all / in progress / ready / completed; status change |
| Tables | `pages/Tables.jsx`, `components/tables/TableCard.jsx` | Grid of tables (Available/Booked/Reserved visuals), hover shows the current order |
| Dashboard | `pages/Dashboard.jsx`, `components/dashboard/*` | Add table / category / dish modals, item and category management, recent orders. `Metrics.jsx` is **placeholder** (static constants, lorem ipsum). |
| Header | `components/ui/Header.jsx` | Search, notifications built from 30 s order polling with `notification-sound.mp3`, logout |
| Settings | `pages/Settings.jsx`, `components/settings/*` | Exists on disk but is **not routed** (removed from routes in commit eab92c9) |
| Theme | `context/ThemeContext.jsx` | Light/dark |

### Existing defects to fix before (or while) building on top

1. `Frontend/src/redux/store.js` imports `./slices/customerSlice` and `./slices/cartSlice`, but the files are
   `CustomerSlice.js` and `CartSlice.js`. This works on macOS and **breaks on a case-sensitive Linux build**.
2. `Backend/routes/itemRoutes.js` registers `GET /popular-dishes` *after* `GET /:id`, so `/:id` catches it. It is also
   registered twice.
3. `Frontend/src/https/index.js#deleteItemFromOrder` calls `/api/orders/...`, but the backend mounts `/api/order`, so it
   returns 404.
4. `POST /api/user/register` is public and lets the caller pick any role, including "Admin".
5. Order totals and tax are computed in the browser and trusted by `addOrder` and `updateOrder`, which save `req.body`
   unchecked. This is a money-integrity gap.
6. `getOrderByTable` exists in the controller but is not routed. `tableController` imports `deleteOrdersByTableId`, which
   does not exist.
7. `orderModel.orderDate` defaults to `Date.now()`, which is evaluated once at boot. It should be `Date.now` (the function).

---

## 3. Gap matrix

Legend: **Exists**: we have it and it works roughly the same. **Partial**: something is there but much less than theirs.
**Missing**: nothing yet. The "Ours" column cites our files.

### A. Platform, auth and security

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| A1 | Email + password login, JWT httpOnly cookie, session expiry | Exists | `userController.js`, `tokenVerification.js` |
| A2 | First-run sign-up creates the restaurant + owner; later staff are created by an admin | Partial | Public register with self-chosen role; no restaurant entity |
| A3 | Granular RBAC: 46 permission keys, 11 default roles, per-role toggles, per-user overrides, UI hidden by permission | Partial | `role` string only, never enforced |
| A4 | Staff management (create, deactivate, departments, assign role) | Missing | |
| A5 | PIN quick-switch login (rate-limited) | Missing | |
| A6 | TOTP 2FA + recovery codes | Missing | |
| A7 | Audit log (who, what, when, entity snapshot) + viewer | Missing | |
| A8 | Restaurant + branch settings (currency, timezone, tax regime, inclusive/exclusive, GSTIN, UPI VPA, logo) | Missing | Tax hard-coded at 5.25% in `Bill.jsx` |
| A9 | Multi-branch (Restaurant → Branch, switcher, cross-branch overview) | Missing | |
| A10 | In-app notifications (stored, read/unread, mark all read) | Partial | Header builds them from polled orders, kept only in browser memory |
| A11 | Realtime push (Socket.IO, branch rooms, refetch on event or reconnect) | Missing | 30 s polling |
| A12 | Backup / restore / export | Missing | |
| A13 | i18n (EN/ES/FR) | Missing | |
| A14 | Light/dark theme | Exists | `ThemeContext.jsx` |
| A15 | POS device registry (heartbeat, revoke) | Missing | |

### B. Menu

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| B1 | Category CRUD | Exists | `categoryRoutes.js` |
| B2 | Item CRUD (name, price, category) | Exists | `itemRoutes.js` |
| B3 | Item description, photo upload, SKU, barcode, sort order, active toggle | Missing | |
| B4 | Per-item tax rate | Missing | |
| B5 | Dietary flags (veg/vegan/Jain/halal/gluten-free), allergens, spice level, calories, prep time | Partial | veg/non-veg only |
| B6 | Modifier groups (min/max/required, price adjustment, defaults) | Missing | |
| B7 | Half portions / portion pricing | Missing | |
| B8 | Combo items + combo builder | Missing | |
| B9 | Availability window + seasonal dates | Missing | |
| B10 | Kitchen stations + item → station routing | Missing | |
| B11 | Bulk price change + price history | Missing | |
| B12 | CSV import (menu, customers, and so on) with preview | Missing | |
| B13 | Popular dishes | Exists | Route-order bug (defect 2) |

### C. POS and orders

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| C1 | POS grid, category tabs, search, cart with qty stepper | Exists | `MenuContainer.jsx`, `CartInfo.jsx` |
| C2 | Order types: dine-in, takeaway, delivery, phone (+ QR, kiosk channels) | Partial | Dine-in via table only |
| C3 | Per-item kitchen note | Exists | `CartSlice.updateItemInstructions` |
| C4 | Send to kitchen now, pay later; reopen the bill from Tables or Orders | Partial | Order saved as "In Progress"; "KOT & Print" prints, but there is no ticket entity |
| C5 | Add items to an open order (only new lines go to the kitchen); edit qty; remove a line with a reason | Partial | `PUT` overwrites the order; no reason or audit; delete-line URL bug |
| C6 | Cancel / void an order with a reason + cancel source; releases the table and KOTs | Missing | |
| C7 | Server-authoritative pricing (`bill-preview`, item snapshots) | Missing | Client computes totals |
| C8 | Order-level discount (% or flat) with cashier cap, unlimited permission, reason | Missing | |
| C9 | Coupon code at checkout | Missing | |
| C10 | Tips (outside tax) | Missing | |
| C11 | Payment methods: cash, card, UPI, wallet, bank, gift card, store credit | Partial | Cash + Razorpay "Online" |
| C12 | Multiple tenders, partial payments, tendered/change, payment locks the bill | Missing | |
| C13 | Equal-split calculator | Missing | |
| C14 | Idempotent order create and checkout (`clientRequestId`) | Missing | Razorpay dedupe only |
| C15 | Refunds: full and partial, capped, optional stock return | Partial | "Returned items" receipt only, no money record |
| C16 | Merge bills; transfer an order to another table | Missing | |
| C17 | Human order numbers per branch per day (e.g. `20261011-0003`) | Missing | Uses Mongo `_id` |
| C18 | Orders list with status filters + detail drawer | Exists | `Orders.jsx` (basic) |
| C19 | Bulk delete past transactions (admin password) | Missing | |
| C20 | Scheduled (future) orders | Missing | |

### D. Payments, printing and displays

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| D1 | Razorpay online checkout + signed webhook | Exists | `paymentController.js` |
| D2 | Multi-gateway settings (Razorpay, Stripe, Cashfree; encrypted keys; test/live; gateway refunds; needs-review queue) | Missing | |
| D3 | UPI QR for the exact amount due + payment-received chime | Missing | |
| D4 | Browser-printed receipt / invoice | Exists | `Invoice.jsx` |
| D5 | KOT slip printing per station, once-only, with REPRINT copies | Partial | Generic print from `Bill.jsx` |
| D6 | ESC/POS thermal printing (USB/network) + cash drawer | Missing | Needs a server next to the printer |
| D7 | Customer-facing display (idle adverts → live cart → UPI QR → thank you) | Missing | |

### E. Kitchen (KDS)

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| E1 | KDS screen with New / Accepted / Preparing / Ready columns | Missing | Orders page has 3 coarse statuses |
| E2 | KOT per station, timers + 15 min warning, priority star, reprint, reject with reason | Missing | |
| E3 | Incoming online-order accept/decline queue | Missing | |
| E4 | Average time-to-ready per station | Missing | |
| E5 | New-ticket chime (mutable per device) | Partial | Header sound on new orders |
| E6 | Station picker per device | Missing | |

### F. Floor, tables and guests

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| F1 | Table CRUD with capacity and current order | Exists | `tableController.js` |
| F2 | Full statuses (Available, Occupied, Reserved, Cleaning, Out of service) + `statusSince` | Partial | Available/Booked |
| F3 | Floors/sections, positions and shapes, drag floor designer, saved layouts, bulk tools | Missing | |
| F4 | Waiter assignment per table | Missing | |
| F5 | Waitlist (party size, quoted wait, seat) | Missing | |
| F6 | Reservations (full lifecycle, deposit, special requests) | Missing | |
| F7 | Table QR codes (rotatable token) + public menu | Missing | |
| F8 | QR self-ordering protected by a staff-issued table session code; pay at register or online | Missing | |
| F9 | Guest requests: call waiter / bring bill → staff resolve | Missing | |
| F10 | Live table board with derived lifecycle states | Missing | |
| F11 | Self-service kiosk | Missing | |
| F12 | NFC table tags | Missing | Hardware |
| F13 | Paging buzzers | Missing | Hardware |

### G. Customers, loyalty and marketing

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| G1 | Customer captured on the order (name, phone, guests) | Partial | Embedded per order in `orderModel.customerDetails` |
| G2 | Customer profiles (birthday, anniversary, allergies, notes, addresses) + order history | Missing | |
| G3 | Loyalty points (earn per currency, redeem as tender, ledger) | Missing | |
| G4 | Gift cards (issue, balance, redeem at checkout) | Missing | |
| G5 | Referral program (codes, both-side points, landing page) | Missing | |
| G6 | Ratings after a paid order | Missing | |
| G7 | Coupons (min order, max discount, validity, usage limit) | Missing | |
| G8 | Happy-hour promotions (days and time window) | Missing | |
| G9 | Campaigns (email/SMS/WhatsApp to segments, opt-out) | Missing | |

### H. Inventory and procurement

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| H1 | Ingredients with stock, unit, reorder level, low-stock list | Missing | |
| H2 | Recipes → automatic FIFO deduction on payment; weighted-average costing; food cost per item | Missing | |
| H3 | Suppliers, purchase orders, goods receipts with batch and expiry | Missing | |
| H4 | Purchase requests, quotations + price compare, supplier invoices + payments, supplier performance | Missing | |
| H5 | Waste log (reason codes, photo, approval, FIFO cost) | Missing | |
| H6 | Stock journal, stock take, stock areas, transfers, shopping list / reorder, expiring stock | Missing | |
| H7 | Production / manufacturing batches with cost per unit | Missing | |

### I. Staff and HR

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| I1 | Attendance clock in/out with breaks; manager correction | Missing | |
| I2 | Shift schedule with overlap warning | Missing | |
| I3 | Leave requests + approval | Missing | |
| I4 | Payroll (hourly/monthly, overtime, late rules, unpaid leave, tip pool by hours, payslip, CSV) | Missing | |
| I5 | Staff performance (sales and orders per person) | Missing | |

### J. Accounting, dashboard and reports

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| J1 | Live dashboard KPIs (today's revenue, orders, occupied tables, kitchen queue, 14-day revenue, waste cost, channels) | Partial | Recent orders live; metrics placeholder |
| J2 | Expenses (paid-from-till flag) | Missing | |
| J3 | Nightly cash close with expected vs counted variance | Missing | |
| J4 | Profit & loss, GST summary by rate | Missing | |
| J5 | Budgets, bank-statement reconciliation, balance sheet | Missing | |
| J6 | 18-report catalog with print and CSV/Excel/PDF export | Missing | |
| J7 | Scheduled report emails over SMTP | Missing | |

### K. Delivery

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| K1 | Delivery zones (pincodes, fee, minimum, ETA) | Missing | |
| K2 | Driver assignment, status flow, rider view | Missing | |

### L. Operations and integrations

| # | nodedr feature | Ours | Notes |
|---|---|---|---|
| L1 | Equipment maintenance log + documents with attachments | Missing | |
| L2 | Signed outbound webhooks + delivery log | Missing | |
| L3 | API keys + public integration API + Swagger | Missing | |
| L4 | Offline mobile app, desktop client, sync peer, in-app updater, MCP server | Missing | Platform extras; low priority |
| L5 | Spain VERI*FACTU fiscal records | Missing | Not relevant for an India-first product; skip |
| L6 | Hardware simulator page | Missing | Only useful if we build buzzers/NFC/display |

### Headline

There are **110 feature rows**: **11 Exist, 14 Partial, 85 Missing**.

What we have is a thin slice of their POS core: menu CRUD, a table grid, a cart, order status, browser print and Razorpay.
Almost everything behind the counter (kitchen, stock, staff, money back-office, CRM) and everything guest-facing (QR, kiosk,
display) is missing.

---

## 4. Implementation plan for RestaurantOS

### 4.1 Conventions to follow (match the existing code)

**Backend**

- One file each in `Backend/models/<name>Model.js`, `Backend/controllers/<name>Controller.js` and
  `Backend/routes/<name>Route.js`.
- Mount each router in `Backend/app.js` as `app.use("/api/<name>", require('./routes/<name>Route'))`.
- Errors use `http-errors` + `next(err)` and go through `middlewares/globalErrorHandler.js`.
- Protect routes with `isVerifiedUser`. Add a sibling middleware `requirePermission(...keys)` in
  `middlewares/tokenVerification.js` (Phase 0).

**Frontend**

- Add each page as `Frontend/src/pages/<Name>.jsx`, export it from `pages/index.js`, and route it in `App.jsx` inside
  `<ProtectedRoutes>`.
- Put domain components in `components/<domain>/`.
- Add API functions to `https/index.js`.
- Server data goes through **TanStack Query** (as `Tables.jsx` and `MenuContainer.jsx` already do). Use Redux slices only
  for local UI state: the cart and customer in progress, and the current user and permissions.
- Use the existing CSS variables (`--card-bg`, `--text-color`) and `ThemeContext`.

**Money in Mongo**

- Store integer **paise** (`totalPaise`) or `Decimal128`, never floats. Recommendation: integer paise, which is simplest
  with JS and matches their `round2` discipline.
- Add one shared `Backend/utils/pricing.js` that is the only place totals are computed.

**Transactions**

- Their checkout relies on one multi-document transaction. MongoDB transactions need a **replica set**, so run local
  `mongod --replSet rs0` (single node) and Atlas in production. Where a transaction is not possible, use conditional atomic
  single-document updates: `findOneAndUpdate({ _id, status: 'OPEN' }, …)` for the paid flip, and
  `updateOne({ _id, loyaltyPoints: { $gte: n } }, { $inc: { loyaltyPoints: -n } })` for points.

**New dependencies, added only in the phase that needs them**

| Dependency | Phase |
|---|---|
| `socket.io` + `socket.io-client` | 0 |
| `zod` (request validation) | 0 |
| `qrcode.react` (UPI and table QR) | 1, 2 |
| `multer` (image upload) | 1 |
| `recharts` | 6 |
| `exceljs` + `pdfkit` | 6 |
| `nodemailer` | 3, 6 |
| `node-cron` | 6 |
| `otplib` | 8 |

Sizes: **S** ≈ under 1 day, **M** ≈ 1–3 days, **L** ≈ 3–7 days, **XL** ≈ 1–3 weeks (one developer).

### Phase 0: foundations (blocks everything else)

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Fix defects 1–7 from section 2 | `routes/itemRoutes.js`, `routes/userRoute.js`, `controllers/tableController.js`, `models/orderModel.js` | `redux/store.js`, `https/index.js` | S |
| Restaurant + Branch settings (single branch to start; put `branchId` on new collections now so multi-branch is cheap later) | `models/restaurantModel.js`, `branchModel.js`, `controllers/settingsController.js`, `routes/settingsRoute.js` (`GET/PATCH /api/settings`) | Re-route `pages/Settings.jsx`; add a General tab with tax regime, inclusive/exclusive, UPI VPA/payee, currency, logo | M |
| RBAC: permission catalog constant, `roleModel.js` (name, permissions[]), seed the 11 default roles, `requirePermission()` middleware, put permissions in `GET /api/user` | `config/permissions.js`, `models/roleModel.js`, `middlewares/tokenVerification.js`, `scripts/seed.js` | `userSlice` holds `permissions`; a `<Can perm>` helper; hide nav items; register becomes owner-only first run, then disabled | M |
| Staff management (admin creates staff, assigns role, deactivates) | `controllers/userController.js` (+ `GET/POST/PATCH /api/user/staff`) | Settings → Staff tab, `components/settings/StaffSettings.jsx` | M |
| Audit log | `models/auditLogModel.js`, `utils/audit.js#record(req, action, entity, snapshot)` | Settings → Audit log tab (list + filter) | S |
| Realtime | `app.js` switches to `http.createServer` + `socket.io`, authenticated by the cookie JWT; `utils/realtime.js#emitToBranch` | `hooks/useRealtime.js`: on event → `queryClient.invalidateQueries`. Replace the 30 s polling in `Header.jsx`. | M |
| Server-side pricing service + order numbering | `utils/pricing.js` (subtotal, tax by item rate, inclusive/exclusive, discount scaling, round to paise), `models/counterModel.js` for `YYYYMMDD-NNNN` | `Bill.jsx` shows the server preview instead of computing 5.25% | M |

### Phase 1: POS and kitchen core (highest value)

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Menu item extensions: description, image upload, tax rate, dietary flags, allergens, spice, prep time, active, sort order, half price | `models/itemModel.js`, `controllers/itemController.js` (+ `POST /api/items/upload-image` with multer → `uploads/`) | `components/ui/AddItemModal.jsx`, item cards show the veg dot and photo | M |
| Modifier groups + modifiers | `models/modifierGroupModel.js` (embedded modifiers), `/api/modifier-groups`, `itemModel.modifierGroups[]` | `components/menu/ModifierPicker.jsx` (enforces min/max/required), Dashboard → Menu tab section | M |
| Kitchen stations + item → station | `models/stationModel.js`, `/api/stations`, `itemModel.station` | Station select in the item modal | S |
| Order model v2: typed `items[]` subdocs with name/price/tax snapshots, modifiers, kitchenNote, status; `type`, `status` (OPEN/PAID/CANCELLED), `acceptance`, `channel`, discount/tip/tax/total fields, cancel fields, `clientRequestId` (unique) | `models/orderModel.js` (+ a migration script in `Backend/scripts/` for old orders) | Update `CartSlice` to carry modifiers; cart lines show modifiers | L |
| Order endpoints: create (server-priced, idempotent), add items, edit line, remove line (reason), cancel (reason, releases table), merge, transfer table, bill-preview | `controllers/orderController.js`, `routes/orderRoute.js` (replace the free-form `PUT`) | `components/menu/Bill.jsx` split into a send-to-kitchen view and a checkout view (their two-step pattern); Orders drawer with actions | L |
| KOT tickets per station + KDS | `models/kotModel.js` (order, station, ticketNumber, status, isPriority, printedCount, timestamps, items); `controllers/kdsController.js`, `routes/kdsRoute.js`: `GET /tickets`, `PATCH /tickets/:id/status` (compare-and-set → 409), `/priority`, `/reject`, `/reprint`, `GET /performance` | `pages/Kitchen.jsx` + `components/kds/{KdsColumn,TicketCard}.jsx`: 4 columns, timers, warning ring, chime, station chips (localStorage); nav item | L |
| Order type selector (Dine-in / Takeaway / Delivery) on POS | (fields from the Order v2 row) | Segmented control in `CartInfo.jsx`; table picker only for dine-in | S |
| Checkout v2: discount %/flat with cap + reason, tip, multiple tenders, partial pay, tendered/change, idempotent `requestId`, paid flip with a conditional update, table release | `controllers/orderController.js#checkout`, `models/paymentModel.js` extended (orderId ref, method enum, amount, tendered, change, clientRequestId) | Checkout panel like theirs: discount, tip, method select, cash tendered → change, split-by-N calculator, Complete payment | L |
| UPI QR + chime | `utils/upi.js#buildUpiUri` (NPCI link format; write it fresh, it is a public spec) | `components/menu/UpiQr.jsx` (`qrcode.react`); chime on success | S |
| Refunds (full/partial, capped) | `models/refundModel.js`, `POST /api/order/:id/refund` (`refunds.process`); Razorpay refund API for online payments | Refund dialog in the Orders drawer; replaces the "returned items" flow | M |
| Receipt + KOT print templates | `GET /api/order/:id/receipt` returns the priced data | Rework `Invoice.jsx`; add `KotSlip.jsx` printed per station | S |

### Phase 2: floor, reservations and guest ordering

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Table v2: statuses enum, `statusSince`, floor, posX/posY/shape/rotation, assignedWaiter, qrToken | `models/tableModel.js`, `models/floorModel.js`, `/api/table` + `/api/floors`, `PATCH /api/table/layout` (bulk positions) | `pages/Tables.jsx`: floor tabs, colour legend, status menu, an **Edit floor plan** mode (absolute positioning + framer-motion drag, which we already have; no dnd-kit needed) | L |
| Waitlist | `models/waitlistModel.js`, `/api/waitlist` (list, add, seat → set table OCCUPIED, delete) | Right-side panel on Tables | S |
| Reservations | `models/reservationModel.js`, `/api/reservations` (list by date, create, `PATCH /:id/status`) | `pages/Reservations.jsx` + dialog | M |
| Table QR + public menu | `routes/publicRoute.js` (no auth): `GET /api/public/menu/:qrToken`; `POST /api/table/:id/qr-token` (rotate) | `pages/PublicOrder.jsx` at `/order/:qrToken` (outside `ProtectedRoutes`, no Header); Tables → print QR cards | M |
| QR self-ordering with a table session code | `models/tableSessionModel.js` (table, code hash, status, opened/closed); `POST /api/table/:id/session` (staff opens → 6-char code); public `POST /api/public/menu/:qrToken/session` (join with code → grant cookie), `POST …/order` (idempotent, server-priced, `channel: ONLINE`, `acceptance: PENDING` unless auto-confirm); session closes when all orders are paid | Guest cart + modifiers + name + code entry; status page; KDS "Incoming" queue to accept/decline | L |
| Guest requests (call waiter / bill) | `models/tableRequestModel.js`, public `POST …/request`, `GET /api/table/requests`, `PATCH …/:id/resolve` + realtime | Buttons on the guest page; badge + list on Tables | S |
| Pay online from the guest phone (held until paid) | Reuse Razorpay `create-order`/webhook; the order is `heldForPayment` and no KOT is created until the webhook confirms | Razorpay checkout on the guest page | M |
| Customer display | `GET /api/public/display/:token` or same-browser `BroadcastChannel` | `pages/CustomerDisplay.jsx`: idle → cart → UPI QR → thank you. Start with BroadcastChannel (same browser, as their first version); add a token for a separate device later | M |

### Phase 3: customers, loyalty and promotions

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Customers | `models/customerModel.js` (name, phone unique per branch, email, birthday, anniversary, allergies, notes, addresses[], loyaltyPoints, marketingOptOut); `/api/customers` CRUD + search; `order.customer` ref | `pages/Customers.jsx`, `pages/CustomerProfile.jsx`; "Attach customer / New customer" in checkout (replaces the free-text `CustomerInfo.jsx`) | M |
| Loyalty points | `models/pointsLedgerModel.js`; settings `loyaltyPointValue`, `loyaltyEarnPerCurrency`; earn at paid, redeem at checkout with a conditional `$inc` | Points balance + redeem input in checkout; ledger on the profile | M |
| Gift cards | `models/giftCardModel.js` (+ redemptions); `/api/gift-cards` issue/check; debit inside checkout | Issue on the profile; code + Check in checkout | M |
| Coupons + happy hour | `models/couponModel.js`, `models/promotionModel.js`, `/api/marketing/*`; applied inside `utils/pricing.js` | `pages/Marketing.jsx` (Coupons and Happy hour tabs); coupon field in checkout | M |
| Ratings after a paid order | `models/ratingModel.js`, public `POST /api/public/ratings` (one per order) | Stars on the guest status page; `pages/Ratings.jsx` | S |
| Referrals | `models/referralModel.js`, customer `referralCode`; reward both sides on the first paid order | `/r/:code` landing; profile section | M |
| Campaigns (email first) | `models/campaignModel.js`, segments ALL/LOYAL/LAPSED/BIRTHDAY_MONTH, nodemailer over SMTP, opt-out | Campaigns tab | M |

### Phase 4: inventory and procurement

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Ingredients + manual adjustments + low stock | `models/ingredientModel.js`, `models/stockMovementModel.js` (ledger: type, qty, unitCost, ref); `/api/inventory/ingredients` (+ adjust, movements, low-stock) | `pages/Inventory.jsx` (Ingredients tab), low-stock badge | M |
| Recipes + deduction at payment + costing | `itemModel.recipe[] {ingredient, qty, unit}`; `utils/stock.js#deductForOrder` called inside checkout; never blocks the sale; writes CONSUMPTION movements; item `costPrice` = Σ qty × weighted-average cost | Recipe editor in the item modal; food cost % shown per item | L |
| Batches FIFO + expiry | `models/stockBatchModel.js`; deduction and waste consume oldest-first | Batches view per ingredient; expiring list | M |
| Suppliers + purchase orders + goods receipt | `models/supplierModel.js`, `purchaseOrderModel.js`, `goodsReceiptModel.js`; receiving creates batches and updates weighted-average cost | Suppliers, Purchase orders (detail + receive dialog) | L |
| Waste log | `models/wasteModel.js` (reason enum, qty, FIFO cost, photo, approval threshold) | Waste tab + dialog; waste cost on the dashboard | M |
| Stock take, shopping list (par level), stock journal + CSV | Endpoints on top of the movements ledger | Tabs | M |
| Procurement depth (purchase requests, quotations compare, supplier invoices + payments, supplier performance) | 4 models + endpoints | Procurement page | L |
| Production / manufacturing batches | Production model; consumes ingredients, creates a stocked product at cost per unit | Production page | L (defer) |

### Phase 5: staff and HR

| Item | Backend | Frontend | Size |
|---|---|---|---|
| PIN login (rate-limited, e.g. 5 per minute) | `userModel.pinHash`; `POST /api/user/pin-login` | PIN pad on the auth page / quick switch in the header | S |
| Attendance | `models/attendanceModel.js` (clockIn, clockOut, breakMinutes); `/api/attendance` me/clock-in/clock-out; manager list/patch | `pages/Attendance.jsx` | M |
| Shifts + leave | `models/shiftModel.js`, `models/leaveModel.js`; overlap check | `pages/Team.jsx` (Schedule and Leave tabs) | M |
| Payroll | `models/payProfileModel.js`, `models/payrollRunModel.js`; `utils/payroll.js` (pure function with unit tests: hours from attendance, overtime, late/absence, unpaid leave, tip pool split by hours); draft → finalize → paid; payslip; CSV | Payroll tab | L |
| Staff performance | Aggregation over orders by `createdBy` | Performance tab | S |

### Phase 6: money back-office, dashboard and reports

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Live dashboard | `controllers/dashboardController.js` (`/summary`, `/trends`) with Mongo aggregations | Replace placeholder `Metrics.jsx`: 4 KPI cards, 14-day revenue chart (recharts), tables/kitchen/recent/channels cards; refresh on realtime events | M |
| Expenses + cash close | `models/expenseModel.js`, `models/cashClosingModel.js`; `/api/accounting/closing/preview` (opening float + cash payments − till expenses) | `pages/Accounting.jsx` (Expenses and Cash close tabs) | M |
| P&L + GST summary | Aggregations (net sales − expenses − finalized payroll; tax by rate from item snapshots) | Tabs | M |
| Reports catalog (start with sales-daily, by-item, by-category, payment methods, discounts, tax, peak hours, staff sales; then the rest) + CSV/Excel/PDF | `controllers/reportController.js#run(key, range)`, `utils/export.js` | `pages/Reports.jsx`: picker, date range, table, export buttons | L |
| Scheduled report email | `models/reportScheduleModel.js`, node-cron at 06:00, nodemailer | Schedule panel | M |
| Budgets, bank CSV reconciliation, balance sheet | Models + matching (same amount within 5 days) | Tabs | L (defer) |

### Phase 7: delivery and more channels

| Item | Backend | Frontend | Size |
|---|---|---|---|
| Delivery zones + delivery orders | `models/deliveryZoneModel.js`; order delivery fields; fee/minimum checked in pricing | `pages/Delivery.jsx` (zones + board) | M |
| Driver assignment + rider view | `PATCH /api/delivery/:orderId/assign|status`; `delivery.rider` permission | `pages/MyDeliveries.jsx` (mobile-first) | M |
| Kiosk | `branch.kioskToken`; public kiosk menu + order (reuses the public order path) | `pages/Kiosk.jsx` (full-screen flow, large order number) | M |
| Scheduled orders | `order.scheduledFor` + a cron that releases them to the kitchen | Date/time picker for takeaway | S |

### Phase 8: platform extras (only if needed)

| Item | Size |
|---|---|
| TOTP 2FA + recovery codes | M |
| Backup/restore (mongodump to S3) | M |
| Outbound signed webhooks + API keys + public integration API | L |
| Equipment maintenance + documents with uploads | M |
| i18n (react-i18next) | M |
| Multi-branch switcher + cross-branch overview (cheap if `branchId` was added in Phase 0) | L |
| ESC/POS thermal printing (needs a local print bridge; the browser cannot reach USB printers; consider a small local agent) | L |
| Buzzers / NFC / hardware simulator / offline mobile / desktop / sync / VERI*FACTU | Skip unless there is a concrete customer need |

### Suggested order and rough total

Phase 0 (≈1.5–2 weeks) → Phase 1 (≈3–4 weeks) → Phase 2 (≈2–3 weeks) → Phase 3 (≈2 weeks) → Phase 4 (≈3–4 weeks) →
Phase 5 (≈2 weeks) → Phase 6 (≈2–3 weeks) → Phase 7 (≈1–2 weeks). That is roughly **4–5 months for one developer**
to reach their core feature set. Phase 8 comes after.

The SecBrain brief lists inventory/stock, employee attendance, phone order entry and the kitchen display. That maps to
Phase 0 → Phase 1 (POS works on a phone + KDS) → Phase 5 (attendance only) → Phase 4 (inventory core). This is a good
alternative order if those four are the real priorities.

### Things we deliberately should not copy

- AGPL code, UI text, screenshots, logo and the names "Nodedr"/"OrderRestro" (section 0.1).
- Their NestJS/Prisma/Postgres stack: re-implementing in our Express/Mongo stack is the point.
- Spain VERI*FACTU, Windows MSIX, CasaOS packaging, the Docker in-app updater, the MCP server and the sync peer: they solve
  their distribution problems, not ours.

### Open decisions for you before the build starts

1. **Single restaurant or multi-tenant SaaS?** The repo's `Workflow-of-my-Saas-Todo.md` suggests SaaS. If so, Phase 0 should
   add a `restaurantId` to every collection now.
2. **Money storage:** integer paise (recommended) or Decimal128.
3. **Mongo replica set** locally (for transactions), or conditional updates only.
4. **Which phase order:** the full-parity order above, or the brief-first order.
