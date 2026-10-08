# Develop Gandom Kiosk locally

[راهنمای فارسی](development.fa.md) · [Repository overview](../README.md)

Gandom Kiosk is a Persian touchscreen perfume questionnaire and recommendation
app. Next.js/React provides the kiosk and catalog admin UI; Django serves the
catalog, matching and admin API. Local storage is SQLite. You do not need
PostgreSQL, Redis, Strapi or Docker for this setup.

## Prerequisites and configuration

Use Git, Node.js 22 with npm and Python 3.12+. The frontend has Next.js 16 and
React 19 resolved in `frontend/package-lock.json`; use `npm ci`. Django 6 needs
Python 3.12+. Python dependency ranges are in `backend/requirements.txt`, without
a fully pinned Python lockfile. On Windows use PowerShell; WSL may use the Bash
steps but should have its own dependencies/virtual environment.

Get GitLab access from the repository owner. A new local install needs no
production credentials and no OpenAI key: baseline matching works with empty
AI keys. Optional AI testing needs an intended developer credential and network
access; put it only in server-side `OPENAI_API_KEY`, never in a `NEXT_PUBLIC_*`
variable. Leave the examples' model settings alone unless testing that path.

## Clone and prepare files

From your projects directory, in Bash or PowerShell:

```bash
git clone https://git.alpagency.net/alp/gandom-kiosk.git
cd gandom-kiosk
node scripts/setup-dev-env.mjs
npm --prefix frontend ci
```

The helper creates missing `backend/.env` and `frontend/.env.local`, generates
a local Django secret and preserves existing files. If the files already exist,
confirm their local values yourself; rerunning the helper does not rewrite them.

| File | Local settings |
| --- | --- |
| `backend/.env` | `DEBUG=True`, `SQLITE_PATH=db.sqlite3`, hosts `localhost,127.0.0.1`, `OPENAI_API_KEY=` |
| `frontend/.env.local` | `NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000`, `OPENAI_API_KEY=` |
| Both files | `ADMIN_ACCESS_KEY` (backend) and `NEXT_PUBLIC_ADMIN_KEY` (frontend) both `local-kiosk-admin-only` |

The current custom admin client sends its key from browser-visible code. The
example value is for local development; do not put a production credential there.
It is separate from a Django admin username/password.

## Terminal 1: install and initialize the backend

Start at the repository root. Linux Bash:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py import_perfumes_from_json --source frontend/public/data/data.json
python manage.py shell -c "from api.models import Perfume; print(Perfume.objects.count())"
python manage.py runserver 127.0.0.1:8000
```

Windows PowerShell:

```powershell
Set-Location backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py import_perfumes_from_json --source frontend/public/data/data.json
python manage.py shell -c "from api.models import Perfume; print(Perfume.objects.count())"
python manage.py runserver 127.0.0.1:8000
```

If PowerShell blocks activation, replace `python` with
`.\.venv\Scripts\python.exe`; no global execution-policy change is needed.
Keep the backend directory as the working directory for all `manage.py` commands.

Migrations create tables but do not import perfumes. The import command resolves
`--source` relative to the **repository root**, even though you run it from
`backend`. The tracked source currently contains 258 perfumes with numeric IDs;
a fresh SQLite database should report 258 after import. Repeat imports update
those IDs without creating duplicates, but can overwrite matching local product
edits. Do not use `--reset` unless intentionally deleting the local catalog.
The alternative `backend/perfumes.json` import creates new rows on each run and
is not the repeatable onboarding source.

## Terminal 2: run the frontend

Open another terminal at the repository root, in either shell:

```bash
npm --prefix frontend run dev
```

Keep Django running. Open http://localhost:3000 and follow the start button to
`/questionnaire`. Choose preferences and complete the questionnaire. Expect
perfume recommendations from the imported catalog. Empty OpenAI keys may produce
an `OPENAI_API_KEY not set - using baseline` log; baseline results are expected.

For a backend check, Linux uses `curl http://localhost:8000/api/perfumes/`;
PowerShell uses `Invoke-RestMethod http://localhost:8000/api/perfumes/`.
Expect HTTP 200 and a nonempty JSON catalog. There is no `/health` route;
`/api/` alone is not a health check.

Open http://localhost:3000/admin/products to check the custom catalog UI.
There is no seeded login for this UI; it uses the matching local admin keys.
The import populates perfume records, not separate Brand/Collection records, so
empty brand/collection management lists do not mean the import failed. Add test
records through their admin pages if your change needs them. Catalog images are
not guaranteed by this JSON import; image-upload work needs local test images
in Django's `backend/media` storage.

If you need Django's separate admin at http://localhost:8000/admin/, stop the
backend briefly with Ctrl+C and run from its activated environment:

```bash
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

Choose your own local username/password; none are shipped. This account does
not configure the frontend custom admin key.

## Check changes

From `backend`, with its virtual environment active:

```bash
python manage.py check
python manage.py test
```

Django's test runner creates its own SQLite test database. The current API tests
cover questionnaire validation; manually verify matching/admin behavior when
changing those paths. Schema changes also need reviewed Django migrations.

From `frontend` (not the repository root), in a separate terminal:

```bash
npm run lint
npm exec --no -- tsc --noEmit
npm run test -- --run
npm run build
```

`--no` prevents npm from fetching an absent executable; run `npm ci` first.
Stop the frontend dev server before the production build check to keep its
output separate. For a focused UI change, lint/type checks and the relevant
Vitest tests are the first checks; build when changing routes, configuration or
server code. Browser-check the changed flow at desktop and kiosk sizes, with
Persian/RTL text and touch-sized controls.

## Where to work

| Area | Start here |
| --- | --- |
| Home, questionnaire, recommendations | `frontend/src/app/`, `frontend/src/lib/questionnaire-flow.ts` |
| Frontend-to-backend recommendation request | `frontend/src/app/api/recommendations/route.ts` |
| Custom admin requests | `frontend/src/lib/admin-api.ts`, `frontend/src/app/admin/` |
| API routes, serializers, models | `backend/api/urls.py`, `backend/api/serializers.py`, `backend/api/models.py` |
| Matching and note normalization | `backend/matcher/vectorizer.py`, `backend/matcher/note_normalization.py` |
| Import commands | `backend/api/management/commands/` |
| Local settings and media | `backend/matcher_backend/settings.py`, `backend/media/` (created locally) |

## Stop and common errors

Stop each foreground server with Ctrl+C. SQLite at `backend/db.sqlite3` and
uploaded media remain in your checkout; keep them out of commits. The inherited
Docker/VPS deployment scripts are not needed for local onboarding. GitLab CI
validates changes rather than running that inherited release path.

| Symptom | Action |
| --- | --- |
| Clone is denied | Check that your GitLab account has access to this repository and authenticate Git. |
| `No module named django` | Activate `backend/.venv` and install `backend/requirements.txt` with that environment's Python. |
| `no such table: api_perfume` | Run `python manage.py migrate` from `backend` against your local SQLite settings. |
| Empty catalog/recommendations | Import the tracked numeric-ID catalog, check the row count and restart both servers. Backend matching and frontend catalog data are cached. |
| Import cannot find the file | Use `--source frontend/public/data/data.json`, relative to the repository root; run `manage.py` from `backend`. |
| API connection refused or frontend 502 | Keep Django running on 8000 and verify `NEXT_PUBLIC_BACKEND_BASE_URL`; restart Next.js after changing `.env.local`. |
| Custom admin returns 401 | Match `NEXT_PUBLIC_ADMIN_KEY` to backend `ADMIN_ACCESS_KEY` and restart both processes. Django's superuser login is unrelated. |
| Address 8000/3000 in use | Stop the conflicting local process. If you change ports, update the backend URL and allowed origins together and restart. |
| Setup says files were kept | Existing local files are preserved; check their URLs/keys manually rather than expecting new example values to replace them. |
| Setup reports a stale lock | Confirm no setup process is running before removing `.dev-env-setup.lock`; then retry the helper. |
| AI warning with empty key | Baseline matching is the intended local path; no key is needed to test it. |

See the [repository workflow](gitlab-workflow.md), [contributing guide](../CONTRIBUTING.md)
and [security policy](../SECURITY.md) for review expectations.
