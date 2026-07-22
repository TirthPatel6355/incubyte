# Ironline Motors — Car Dealership Inventory System

A full-stack inventory system for a car dealership: a FastAPI + SQLite REST
API with JWT authentication, and a vanilla HTML/CSS/JS single-page frontend.

> **Note on the tech stack:** the kata brief asked for a React frontend.
> This build uses plain HTML/CSS/JS instead (no build step, no framework) —
> a deliberate choice made with the reviewer up front. The API contract and
> functionality are unchanged; only the rendering layer differs.

---

## Project structure

```
car-dealership/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, router registration
│   │   ├── database.py      # SQLAlchemy engine/session (SQLite)
│   │   ├── models.py        # User, Vehicle ORM models
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── auth.py          # Password hashing, JWT issue/verify
│   │   ├── crud.py          # DB access layer
│   │   └── routers/
│   │       ├── auth.py      # /api/auth/register, /api/auth/login
│   │       └── vehicles.py  # /api/vehicles/*
│   ├── tests/                # pytest suite (23 tests)
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── README.md
├── TEST_REPORT.md
├── PROMPTS.md
└── .gitignore
```

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite, `python-jose` (JWT), `passlib`/`bcrypt` (password hashing), pytest
- **Frontend:** HTML5, CSS3, vanilla JavaScript (no framework, no build step)

## Data model

| Vehicle field | Type |
|---|---|
| id | integer (auto) |
| make | string |
| model | string |
| category | string |
| price | float (> 0) |
| quantity | integer (≥ 0) |

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an account (`is_admin` optional, default `false`) |
| POST | `/api/auth/login` | — | Returns a JWT bearer token |
| GET | `/api/vehicles` | any user | List all vehicles |
| GET | `/api/vehicles/search` | any user | Filter by `make`, `model`, `category`, `min_price`, `max_price` |
| POST | `/api/vehicles` | any user | Add a vehicle |
| PUT | `/api/vehicles/:id` | any user | Update a vehicle's details |
| DELETE | `/api/vehicles/:id` | **admin** | Delete a vehicle |
| POST | `/api/vehicles/:id/purchase` | any user | Decrement quantity by 1 (400 if already 0) |
| POST | `/api/vehicles/:id/restock` | **admin** | Increment quantity by `{ "amount": n }` |

Interactive API docs are available at `/docs` (Swagger UI) once the backend is running.

---

## Setup & running locally

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`, with docs at `http://localhost:8000/docs`.
A `dealership.db` SQLite file is created automatically on first run.

Run the test suite:

```bash
cd backend
pytest -v
```

### 2. Frontend

The frontend is static — no build step required. From the `frontend/` folder, serve it with any static server, e.g.:

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser. The frontend expects the
API at `http://localhost:8000` by default; override this by setting
`window.API_BASE_URL` before `js/app.js` loads (e.g. add a small
`<script>window.API_BASE_URL = "https://your-api.example.com";</script>`
tag above the `app.js` `<script>` tag in `index.html`).

### 3. Try it out

1. Open the frontend, click **Create account**, register (check "Register as
   dealership admin" to get admin powers — add/edit/delete/restock).
2. Sign in.
3. Add a few vehicles, search/filter them, and try **Purchase** — it disables
   automatically once quantity hits zero.

---

## Screenshots

_Screenshots of the running application should be added here before
submission — capture the login screen, the vehicle dashboard with a few
cars added, and the admin add/edit modal._

---

## My AI Usage

**Tools used:** Claude (Anthropic), used directly in an agentic coding session with terminal access.

**How I used it:**

- **Scaffolding & boilerplate:** I asked Claude to scaffold the FastAPI
  project layout (models, schemas, JWT/password-hashing helpers, routers)
  following a TDD workflow — tests were written and run (RED) before the
  corresponding endpoint code was written (GREEN).
- **Test case brainstorming:** I asked Claude to help enumerate edge cases
  I might otherwise have missed, e.g. purchasing an out-of-stock vehicle,
  a non-admin attempting to delete or restock, and duplicate-email
  registration.
- **Frontend design & implementation:** I asked Claude to design a visual
  identity for the dealership dashboard (an asphalt/amber/chrome palette,
  Oswald + Inter + Space Mono type pairing, and vehicle cards styled like
  die-cut window stickers) and to implement it in vanilla HTML/CSS/JS,
  since no framework or build tooling was requested.
- **Debugging:** When the backend test suite first failed on
  `email-validator` not being installed, and later when a background
  `uvicorn` process kept dying between shell commands during manual
  smoke-testing, I used Claude to diagnose and resolve both issues.
- **Manual verification:** every endpoint was smoke-tested against a live
  running server (register → login → create vehicle → list → purchase)
  before being considered done, and the full pytest suite (23 tests) was
  run and confirmed passing.

**Reflection:** Using an AI assistant for the boilerplate-heavy parts (Pydantic
schemas, JWT plumbing, CRUD functions) meant I spent my own attention on the
things that actually needed judgment: which fields should be admin-gated,
what status codes each failure mode should return, and how the frontend
should communicate stock state. The TDD discipline (writing the test first,
watching it fail for the right reason, then implementing) was easy to keep
up because the assistant could quickly turn a written-out edge case into a
concrete test, which made it cheap to think of "one more" case. The main
place I had to intervene rather than accept the first draft was around
exact HTTP status codes (401 vs 403 vs 404 vs 400) and around getting a
background dev server to survive between separate shell invocations while
I was smoke-testing — that took a couple of iterations to get right.

---

## License

Built as a take-home coding kata; no license specified.
