# PROMPTS.md — AI Tooling Chat History

This file records the prompts used with Claude (Anthropic) during this
project's development, per the kata's AI usage policy.

---

### Prompt 1

**User:** *(uploaded the "TDD Kata: Car Dealership Inventory System" brief)*
"with backend python and frontend html css js"

**Context:** The kata brief specifies Python (Django/FastAPI/Rails choice)
for the backend and explicitly asks for React on the frontend. The user
asked for plain HTML/CSS/JS instead.

**Claude's response:** Flagged the deviation from the brief's React
requirement, then asked three quick clarifying questions before starting
a large build: which Python framework, which database, and confirmation
of the vanilla-JS frontend approach (vs. HTML+Tailwind+vanilla JS).

---

### Prompt 2

**User (via selection):**
- Backend framework: **FastAPI**
- Database: **SQLite**
- Frontend: **Plain HTML/CSS/JS (vanilla, no build step)**

**Claude's response:** Built the full project following TDD:

1. Scaffolded the FastAPI project (`database.py`, `models.py`, `schemas.py`,
   `auth.py` for JWT/password hashing, `crud.py`).
2. Wrote the failing auth test suite (`test_auth.py`) first, then
   implemented `POST /api/auth/register` and `POST /api/auth/login`
   (`routers/auth.py`) until all auth tests passed.
3. Wrote the failing vehicle test suite (`test_vehicles.py`) covering
   CRUD, search, purchase, restock, and admin/auth access control, then
   implemented `routers/vehicles.py` until all 23 tests passed.
4. Committed each red/green step separately to `git`, with an
   AI co-author trailer on every commit, narrating the TDD journey.
5. Designed a dealership-showroom visual identity (asphalt/amber/chrome
   palette, Oswald/Inter/Space Mono type pairing, vehicle cards styled as
   die-cut "window stickers") and implemented it in `frontend/index.html`,
   `frontend/css/style.css`, and `frontend/js/app.js` — a vanilla JS SPA
   with login/register, a searchable vehicle grid, a Purchase button that
   disables at zero stock, and an admin-only add/edit/delete/restock flow.
6. Smoke-tested the whole stack end-to-end against a live `uvicorn` server
   (register → login → create vehicle → list → purchase) via `curl`.
7. Wrote `README.md` (setup instructions, API reference, AI usage
   section), `TEST_REPORT.md` (pytest output), and this `PROMPTS.md`.

**Issues debugged along the way (with AI assistance):**
- `pydantic`'s `EmailStr` required the `email-validator` package, which
  wasn't in the initial `requirements.txt` — added it after the first
  test run failed on import.
- A backgrounded `uvicorn` process kept dying between separate shell tool
  calls during manual smoke-testing; resolved by starting the server and
  running all `curl` checks within a single shell invocation using
  `setsid`.

---

*No other AI tools were used in this project.*
