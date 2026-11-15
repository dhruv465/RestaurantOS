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

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. Route only to skills in the session's available-skills list; answer directly for quick questions or small scoped edits.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate, unless one read-only check confirms the cause and a narrow fix (then fix it and run the focused test)
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship (merge + deploy: the user types /land-and-deploy)
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
