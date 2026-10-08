# توسعهٔ محلی در لینوکس و ویندوز

[نسخهٔ انگلیسی](development.md)

از Node.js 22، npm، Git و Python 3.12 یا جدیدتر استفاده کنید. Django 6 به Python 3.12 یا جدیدتر نیاز دارد. فرانت‌اند فایل `package-lock.json` خودش را دارد؛ فایل lock مربوط به pnpm یا yarn نسازید. وابستگی‌های Python فعلاً در `backend/requirements.txt` محدود شده‌اند و lockfile کاملاً تثبیت‌شده‌ای ندارند.

## دریافت مخزن و پیکربندی

این دستورها در Bash یا PowerShell اجرا می‌شوند:

```bash
glab repo clone alp/gandom-kiosk
cd gandom-kiosk
node scripts/setup-dev-env.mjs
npm --prefix frontend ci
```

ابزار کمکی فایل‌های `.env` مربوط به بک‌اند و `.env.local` مربوط به فرانت‌اند را در صورت نبودن می‌سازد و فایل‌های موجود را بدون تغییر نگه می‌دارد. کلید محرمانهٔ Django به‌صورت محلی تولید می‌شود. بک‌اند از SQLite محلی، آدرس‌های محلی localhost و مقدار `OPENAI_API_KEY` که می‌تواند خالی بماند استفاده می‌کند.

## لینوکس با Bash: بک‌اند

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

## ویندوز با PowerShell: بک‌اند

```powershell
Set-Location backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

اگر فعال‌سازی مسدود شد، به‌جای `python` از `.\.venv\Scripts\python.exe` استفاده کنید. نیازی به تغییر سراسری execution policy نیست. WSL2 هم می‌تواند مراحل لینوکس را اجرا کند؛ وابستگی‌ها را در همان سیستم‌عامل نگه دارید.

## فرانت‌اند: ترمینال دوم

از ریشهٔ مخزن و در Bash یا PowerShell اجرا کنید:

```bash
npm --prefix frontend run dev
```

http://localhost:3000 را باز کنید. API در http://localhost:8000/api است. بک‌اند برای نمایش پیشنهادهای مناسب به داده‌های کاتالوگ نیاز دارد. دستورهای import موجود در `backend/api/management/commands` را ببینید و از منابع کاتالوگ موجود استفاده کنید؛ اجرای migration به‌تنهایی کاتالوگ محصولات را وارد نمی‌کند.

کلاینت فعلی پنل مدیریت مقدار `NEXT_PUBLIC_ADMIN_KEY` را از مرورگر می‌فرستد؛ بنابراین این مقدار برای کاربر قابل مشاهده است. مقدار نمونه فقط برای محیط محلی است و باید با `ADMIN_ACCESS_KEY` در بک‌اند یکی باشد؛ هرگز کلید محیط عملیاتی را آن‌جا قرار ندهید. کلیدهای اختیاری سرویس هوش مصنوعی را در فیلد `OPENAI_API_KEY` سمت سرور تنظیم کنید؛ برای تطبیق پایه‌ای بک‌اند به آن‌ها نیازی نیست. نام مدل‌های نمونه با پیش‌فرض‌های کد فعلی هماهنگ‌اند.

## بررسی‌ها

با فعال‌بودن محیط بک‌اند:

```bash
python manage.py check
python manage.py test
```

از ریشهٔ مخزن:

```bash
npm --prefix frontend run lint
npm --prefix frontend exec -- tsc --project frontend/tsconfig.json --noEmit
npm --prefix frontend run test -- --run
npm --prefix frontend run build
```

هر سرورِ در حال اجرا در پیش‌زمینه را با Ctrl+C متوقف کنید. SQLite و فایل‌های رسانه‌ای در نسخهٔ محلی مخزن باقی می‌مانند. GitLab CI اعتبارسنجی را انجام می‌دهد؛ اسکریپت‌های به‌ارث‌رسیدهٔ استقرار روی VPS را اجرا نمی‌کند. [جریان کار تیم](gitlab-workflow.fa.md) دربارهٔ issueها و merge requestها توضیح می‌دهد.
