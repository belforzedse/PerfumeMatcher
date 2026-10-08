<p align="center">

[راهنمای شروع فارسی](docs/development.fa.md) · [English quick start](docs/development.md)
  <img src="docs/branding/logo.png" alt="Gandom Perfume" width="220">
</p>

# Gandom Kiosk

Persian touchscreen perfume discovery and recommendation kiosk. This repository
contains the Next.js frontend, Django API, questionnaire/matching logic, and
catalog administration originally published as `belforzedse/PerfumeMatcher`.

## First local run

Use Git, Node.js 22 with npm and Python 3.12+ for Django 6. Local storage is
SQLite; Docker, Redis, PostgreSQL and OpenAI credentials are not needed.

From your projects directory, in Bash or PowerShell:

```bash
git clone https://git.alpagency.net/alp/gandom-kiosk.git
cd gandom-kiosk
node scripts/setup-dev-env.mjs
npm --prefix frontend ci
```

The helper creates missing backend/frontend local environment files and preserves
existing ones. Keep the backend on `localhost:8000`, local SQLite, matching local
admin keys and empty AI keys. The full [English guide](docs/development.md) and
[راهنمای فارسی](docs/development.fa.md) include Windows commands, first-account
setup and concrete troubleshooting.

In terminal 1, Linux Bash:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py import_perfumes_from_json --source frontend/public/data/data.json
python manage.py runserver 127.0.0.1:8000
```

On Windows, use `Set-Location backend`, `py -3.12 -m venv .venv` and
`.\.venv\Scripts\Activate.ps1`, then the same install/migrate/import/run commands.
If activation is blocked, use `.\.venv\Scripts\python.exe` instead of `python`.
The import path is relative to the repository root. This numeric-ID source has
258 perfumes and repeat imports update their existing records; migrations alone
do not load the catalog.

In terminal 2, from the repository root:

```bash
npm --prefix frontend run dev
```

Open http://localhost:3000, complete the questionnaire and expect recommendations.
http://localhost:8000/api/perfumes/ should return HTTP 200 and a nonempty catalog.
The custom admin is at http://localhost:3000/admin/products and uses the example's
matching local admin keys, with no seeded login. Django's separate admin account
can be created with `python manage.py createsuperuser` from `backend`.
Stop both servers with Ctrl+C; local SQLite/media remain.

## Layout

- `frontend` — Next.js/React kiosk, questionnaire, catalog, and admin UI
- `backend` — Django REST API, SQLite data, matching, and admin endpoints
- `data` — catalog/import source data
- `scripts` — catalog utilities and environment setup

The backend supports baseline recommendations without an OpenAI key. Optional
AI paths require the intended developer credential on the server. The local
admin example uses a development-only key because the current client sends
that value from browser-visible code; production authentication needs a
separate application review.

## Checks

From `frontend` after installing dependencies:

```bash
npm run lint
npm exec --no -- tsc --noEmit
npm run test -- --run
npm run build
```

From `backend`, with its virtual environment active:

```bash
python manage.py check
python manage.py test
```

The [development guide](docs/development.md) maps changes to checks and explains
baseline matching, catalog caching, admin 401s and missing-table errors. For
contribution conventions, see the [repository workflow](docs/gitlab-workflow.md),
[contributing guide](CONTRIBUTING.md) and [security policy](SECURITY.md).

## Import and releases

The GitHub main history and eight existing dependency-update branches were
imported unchanged. GitLab is now the team's repository; the original GitHub
repository remains available as provenance. Local unpublished edits are not
part of that import.

The inherited [deployment guide](DEPLOYMENT.md), Docker files, and
`.github/workflows/deploy.yml` describe the previous GitHub release path.
They are retained for reference. No GitLab production deployment is configured
by this hygiene pass.

## License

[MIT](LICENSE).
