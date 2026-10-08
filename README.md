<p align="center">

[راهنمای شروع فارسی](docs/development.fa.md) · [English quick start](docs/development.md) · [روش کار تیم](https://git.alpagency.net/alp/team/-/blob/main/docs/workflow.fa.md)
  <img src="docs/branding/logo.png" alt="Gandom Perfume" width="220">
</p>

# Gandom Kiosk

Persian touchscreen perfume discovery and recommendation kiosk. This repository
contains the Next.js frontend, Django API, questionnaire/matching logic, and
catalog administration originally published as `belforzedse/PerfumeMatcher`.

## Start here

- [Linux and Windows development guide](docs/development.md)
- [GitLab workflow and team templates](docs/gitlab-workflow.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

Use Node.js 22 and npm for the frontend, Python 3.12 or later for Django 6, and
the committed frontend npm lockfile. The local setup does not require Docker.

```bash
glab repo clone alp/gandom-kiosk
cd gandom-kiosk
node scripts/setup-dev-env.mjs
npm --prefix frontend ci
```

Follow the development guide to install the Python environment, initialize
SQLite, and run the backend and frontend in separate terminals.

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

```bash
npm --prefix frontend run lint
npm --prefix frontend exec -- tsc --project frontend/tsconfig.json --noEmit
npm --prefix frontend run test -- --run
npm --prefix frontend run build
```

Backend checks are `python manage.py check` and `python manage.py test` from
`backend` with the Python environment activated. GitLab CI runs validation only.

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
