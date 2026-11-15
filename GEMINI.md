# RestaurantOS — agent instructions

RestaurantOS is a full-stack Point of Sale (POS) and restaurant management system featuring digital menu ordering, table assignments, order management, billing, and payment processing.

## SecBrain memory

Project memory lives at `/Users/dhruvsmac/Desktop/SecBrain/projects/restaurant-operations/`. Start meaningful work by reading, in order:

1. `index.md` — the current checkpoint
2. `overview.md` — project overview and initial scope
3. `log.md` — project timeline and changelog
4. `status/recent-changes.md` — what moved recently

Use the code, tests, and git to verify the vault, not to replace it.

**Vault First, Vault Ask.** Never write to the vault unless the user asks in the current turn. When they do, update the matching project folder: the source note, `index.md`, `log.md`, `status/recent-changes.md`, and the backlinks. Never store secrets, tokens, or customer data there.

## Project architecture & setup

- **Frontend**: React 19 + Vite + Tailwind CSS + Redux Toolkit + TanStack Query (`http://localhost:5173`)
- **Backend**: Node.js + Express + Mongoose + JWT + Razorpay (`http://localhost:5001`)
- **Database**: MongoDB (`mongodb://127.0.0.1:27017/restaurantOS`)
