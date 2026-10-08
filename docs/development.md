# Local development on Linux and Windows

[فارسی](development.fa.md)

Use Node.js 22, npm, Git, and Python 3.12 or later. Django 6 requires Python
3.12+. The frontend uses its committed `package-lock.json`; do not generate a
pnpm/yarn lockfile. Python dependencies are currently bounded in
`backend/requirements.txt`, rather than a fully pinned lockfile.

## Clone and configure

These commands work in Bash and PowerShell:

```bash
glab repo clone alp/gandom-kiosk
cd gandom-kiosk
node scripts/setup-dev-env.mjs
npm --prefix frontend ci
```

The helper creates missing backend `.env` and frontend `.env.local` files and
preserves existing files. The Django secret is generated locally. The backend
uses local SQLite, localhost origins, and an optional empty OpenAI key.

## Linux Bash: backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

## Windows PowerShell: backend

```powershell
Set-Location backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

If activation is blocked, use `.\.venv\Scripts\python.exe` instead of `python`.
No global execution-policy change is needed. WSL2 can also use the Linux steps;
keep dependencies inside the same OS checkout.

## Frontend: second terminal

From the repository root, in either shell:

```bash
npm --prefix frontend run dev
```

Open http://localhost:3000. The API is at http://localhost:8000/api. The backend
needs catalog data before its recommendation results are useful. Review the
import commands under `backend/api/management/commands` and use the supplied
catalog sources; migrations alone do not import the product catalog.

The current admin client sends `NEXT_PUBLIC_ADMIN_KEY` from browser-visible
code. Its example is a local-only value matching backend `ADMIN_ACCESS_KEY`;
never put a production credential there. Optional AI credentials belong in
server-only `OPENAI_API_KEY` fields and are not required for baseline backend
matching. Model names in the examples reflect the existing code's defaults.

## Checks

With the backend environment activated:

```bash
python manage.py check
python manage.py test
```

From the repository root:

```bash
npm --prefix frontend run lint
npm --prefix frontend exec -- tsc --project frontend/tsconfig.json --noEmit
npm --prefix frontend run test -- --run
npm --prefix frontend run build
```

Stop each foreground server with Ctrl+C. SQLite and media remain in the local
checkout. GitLab CI performs validation; it does not run the inherited VPS
deployment scripts. The [team workflow](gitlab-workflow.md) explains issues and
merge requests.
