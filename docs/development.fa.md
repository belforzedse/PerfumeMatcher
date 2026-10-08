# راه‌اندازی محلی کیوسک گندم

[English guide](development.md) · [معرفی مخزن](../README.md)

کیوسک گندم با چند پرسش دربارهٔ سلیقه، عطر پیشنهاد می‌دهد. رابط فارسی کیوسک و
مدیریت کاتالوگ با Next.js و React ساخته شده و Django دادهٔ کاتالوگ، تطبیق عطر
و API مدیریت را فراهم می‌کند. ذخیره‌سازی محلی SQLite است. برای این راه‌اندازی
به PostgreSQL، Redis، Strapi یا Docker نیاز ندارید.

## پیش‌نیازها و تنظیمات

به Git، Node.js 22 همراه npm و Python 3.12 یا جدیدتر نیاز دارید. نسخه‌های
Next.js 16 و React 19 در `frontend/package-lock.json` مشخص‌اند؛ از `npm ci`
استفاده کنید. Django 6 به Python 3.12 یا جدیدتر نیاز دارد. وابستگی‌های پایتون در
`backend/requirements.txt` بازهٔ نسخه دارند و lockfile کاملاً تثبیت‌شده ندارند.
در ویندوز از PowerShell استفاده کنید؛ در WSL می‌توانید مراحل Bash را با محیط
پایتون و وابستگی‌های جداگانهٔ همان سیستم اجرا کنید.

دسترسی GitLab را از صاحب مخزن بگیرید. راه‌اندازی تازهٔ محلی به اطلاعات ورود
محیط عملیاتی یا کلید OpenAI نیاز ندارد؛ با کلیدهای خالی، تطبیق پایه‌ای کار
می‌کند. برای آزمایش اختیاری هوش مصنوعی، کلید مخصوص توسعه و اتصال شبکه لازم است.
کلید را فقط در `OPENAI_API_KEY` سمت سرور بگذارید، نه در متغیرهای `NEXT_PUBLIC_*`.
تا وقتی آن مسیر را آزمایش نمی‌کنید، تنظیم مدل نمونه را تغییر ندهید.

## دریافت و آماده‌سازی فایل‌ها

از پوشهٔ پروژه‌ها، در Bash یا PowerShell:

```bash
git clone https://git.alpagency.net/alp/gandom-kiosk.git
cd gandom-kiosk
node scripts/setup-dev-env.mjs
npm --prefix frontend ci
```

ابزار راه‌اندازی، فایل‌های `backend/.env` و `frontend/.env.local` را در صورت
نبودن می‌سازد، کلید محلی Django تولید می‌کند و فایل‌های موجود را نگه می‌دارد.
اگر این فایل‌ها را از قبل دارید، مقادیر محلی‌شان را بررسی کنید؛ اجرای دوبارهٔ
ابزار، آن‌ها را بازنویسی نمی‌کند.

| فایل | تنظیم محلی |
| --- | --- |
| `backend/.env` | `DEBUG=True`، `SQLITE_PATH=db.sqlite3`، میزبان‌های `localhost,127.0.0.1` و `OPENAI_API_KEY=` |
| `frontend/.env.local` | `NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000` و `OPENAI_API_KEY=` |
| هر دو فایل | `ADMIN_ACCESS_KEY` در بک‌اند و `NEXT_PUBLIC_ADMIN_KEY` در فرانت‌اند، هر دو `local-kiosk-admin-only` |

کلاینت فعلی پنل اختصاصی، کلیدش را از کدی می‌فرستد که در مرورگر دیده می‌شود.
مقدار نمونه فقط برای توسعهٔ محلی است؛ کلید محیط عملیاتی را در آن قرار ندهید.
این کلید از نام کاربری و رمز پنل Django جداست.

## ترمینال اول: نصب و آماده‌سازی بک‌اند

از ریشهٔ مخزن شروع کنید. لینوکس با Bash:

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

ویندوز با PowerShell:

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

اگر PowerShell فعال‌سازی را مسدود کرد، به‌جای `python` از
`.\.venv\Scripts\python.exe` استفاده کنید؛ تغییر سراسری execution policy لازم نیست.
همهٔ دستورهای `manage.py` را از پوشهٔ `backend` اجرا کنید.

migration جدول‌ها را می‌سازد، اما عطرها را وارد نمی‌کند. دستور import مسیر
`--source` را نسبت به **ریشهٔ مخزن** می‌خواند، هرچند آن را از `backend` اجرا
می‌کنید. فایل موجود فعلاً 258 عطر با شناسهٔ عددی دارد؛ پس از import، پایگاه دادهٔ
تازه باید 258 ردیف نشان دهد. اجرای دوباره همین شناسه‌ها را به‌روز می‌کند و ردیف
تکراری نمی‌سازد، اما ممکن است ویرایش محلی همان محصولات را جایگزین کند. فقط اگر
قصد پاک‌کردن کاتالوگ محلی را دارید از `--reset` استفاده کنید. import از فایل
دیگر، یعنی `backend/perfumes.json`، هر بار ردیف جدید می‌سازد و برای راه‌اندازی
قابل تکرار مناسب نیست.

## ترمینال دوم: اجرای فرانت‌اند

ترمینال دیگری در ریشهٔ مخزن باز کنید؛ در هر دو نوع ترمینال:

```bash
npm --prefix frontend run dev
```

Django روشن بماند. http://localhost:3000 را باز کنید و با دکمهٔ شروع به
`/questionnaire` بروید. سلیقه‌ها را انتخاب و پرسش‌ها را کامل کنید؛ باید پیشنهادهای
عطر از کاتالوگ واردشده نمایش داده شود. وقتی کلید OpenAI خالی است، پیام
`OPENAI_API_KEY not set - using baseline` ممکن است در گزارش ظاهر شود؛ نتیجهٔ
تطبیق پایه‌ای در این حالت طبیعی است.

برای بررسی بک‌اند، در لینوکس `curl http://localhost:8000/api/perfumes/` و در
PowerShell، `Invoke-RestMethod http://localhost:8000/api/perfumes/` را اجرا کنید.
پاسخ مورد انتظار HTTP 200 و فهرست JSON غیرخالی عطرهاست. مسیر `/health` نداریم؛
`/api/` به‌تنهایی هم مسیر بررسی سلامت نیست.

برای بررسی پنل اختصاصی، http://localhost:3000/admin/products را باز کنید. این
رابط حساب ورود آماده ندارد و از کلیدهای محلی یکسان استفاده می‌کند. import،
رکوردهای عطر را ایجاد می‌کند و رکوردهای مستقل Brand و Collection را نمی‌سازد؛
خالی‌بودن صفحهٔ مدیریت برند یا کالکشن نشانهٔ شکست import نیست. اگر تغییرتان به
آن‌ها نیاز دارد، از صفحهٔ مدیریتشان دادهٔ آزمایشی اضافه کنید. import از JSON
هم وجود عکس برای همهٔ عطرها را تضمین نمی‌کند؛ برای کار روی بارگذاری عکس، تصویر
آزمایشی محلی در فضای `backend/media` لازم دارید.

اگر به پنل جداگانهٔ Django در http://localhost:8000/admin/ نیاز دارید، بک‌اند را
با Ctrl+C متوقف کنید و در محیط پایتون فعال‌شدهٔ همان پوشه اجرا کنید:

```bash
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

نام کاربری و رمز محلی را خودتان انتخاب کنید؛ حسابی همراه پروژه نیست. این حساب
کلید پنل اختصاصی فرانت‌اند را تنظیم نمی‌کند.

## بررسی تغییرها

از `backend`، با محیط پایتون فعال:

```bash
python manage.py check
python manage.py test
```

Django برای آزمون‌ها پایگاه دادهٔ SQLite خودش را می‌سازد. آزمون‌های فعلی API
اعتبارسنجی پرسش‌نامه را پوشش می‌دهند؛ پس از تغییر تطبیق یا مدیریت، رفتار آن‌ها
را دستی هم بررسی کنید. تغییر ساختار داده به migration بازبینی‌شده نیاز دارد.

از پوشهٔ `frontend`، نه ریشهٔ مخزن، در ترمینال جداگانه:

```bash
npm run lint
npm exec --no -- tsc --noEmit
npm run test -- --run
npm run build
```

گزینهٔ `--no` جلوی دریافت ابزار نصب‌نشده را می‌گیرد؛ اول `npm ci` را اجرا کنید.
قبل از بررسی build، سرور توسعهٔ فرانت‌اند را متوقف کنید تا خروجی‌هایشان جدا
بماند. برای تغییر محدود رابط، ابتدا lint، بررسی نوع‌ها و آزمون‌های Vitest مرتبط
را اجرا کنید؛ تغییر مسیرها، تنظیمات یا کد سرور به build هم نیاز دارد. مسیر
تغییریافته را در مرورگر با ابعاد دسکتاپ و کیوسک، متن فارسی و راست‌به‌چپ و دکمه‌های
مناسب لمس بررسی کنید.

## مسیرهای مهم

| بخش | از اینجا شروع کنید |
| --- | --- |
| صفحهٔ اصلی، پرسش‌ها و پیشنهادها | `frontend/src/app/`، `frontend/src/lib/questionnaire-flow.ts` |
| درخواست پیشنهاد از فرانت‌اند به بک‌اند | `frontend/src/app/api/recommendations/route.ts` |
| درخواست‌های پنل اختصاصی | `frontend/src/lib/admin-api.ts`، `frontend/src/app/admin/` |
| مسیرهای API، اعتبارسنجی و مدل‌ها | `backend/api/urls.py`، `backend/api/serializers.py`، `backend/api/models.py` |
| تطبیق و یکسان‌سازی نت‌ها | `backend/matcher/vectorizer.py`، `backend/matcher/note_normalization.py` |
| دستورهای ورود داده | `backend/api/management/commands/` |
| تنظیمات محلی و رسانه | `backend/matcher_backend/settings.py`، `backend/media/` که محلی ساخته می‌شود |

## توقف و خطاهای رایج

هر سرور را با Ctrl+C متوقف کنید. SQLite در `backend/db.sqlite3` و فایل‌های
بارگذاری‌شده در نسخهٔ محلی می‌مانند؛ آن‌ها را وارد commit نکنید. برای راه‌اندازی
محلی به اسکریپت‌های قدیمی Docker یا VPS نیاز ندارید. CI در GitLab تغییرها را
بررسی می‌کند و مسیر قدیمی انتشار را اجرا نمی‌کند.

| نشانه | راه‌حل |
| --- | --- |
| دریافت مخزن با خطای دسترسی روبه‌رو می‌شود | دسترسی حساب GitLab به همین مخزن و روش ورود Git را بررسی کنید. |
| `No module named django` | محیط `backend/.venv` را فعال و `backend/requirements.txt` را با Python همان محیط نصب کنید. |
| `no such table: api_perfume` | از `backend`، دستور `python manage.py migrate` را با تنظیمات SQLite محلی اجرا کنید. |
| کاتالوگ یا پیشنهادها خالی است | فایل کاتالوگ با شناسهٔ عددی را وارد کنید، تعداد ردیف‌ها را ببینید و هر دو سرور را دوباره اجرا کنید؛ دادهٔ تطبیق بک‌اند و کاتالوگ فرانت‌اند در حافظه نگه داشته می‌شود. |
| فایل import پیدا نمی‌شود | از `--source frontend/public/data/data.json` نسبت به ریشهٔ مخزن استفاده کنید؛ `manage.py` را از `backend` اجرا کنید. |
| خطای اتصال API یا 502 در فرانت‌اند | Django روی پورت 8000 روشن بماند و `NEXT_PUBLIC_BACKEND_BASE_URL` درست باشد؛ پس از تغییر `.env.local`، Next.js را دوباره اجرا کنید. |
| خطای 401 در پنل اختصاصی | `NEXT_PUBLIC_ADMIN_KEY` و `ADMIN_ACCESS_KEY` باید یکی باشند؛ هر دو فرایند را دوباره اجرا کنید. ورود superuser در Django ارتباطی به این کلید ندارد. |
| پورت 8000 یا 3000 اشغال است | فرایند محلی مزاحم را متوقف کنید. اگر پورت را تغییر دادید، آدرس بک‌اند و مبدأهای مجاز را با هم تغییر دهید و دوباره اجرا کنید. |
| ابزار راه‌اندازی می‌گوید فایل‌ها نگه داشته شدند | فایل موجود حفظ می‌شود؛ آدرس‌ها و کلیدهای محلی را بررسی کنید و انتظار جایگزینی خودکار با نمونهٔ جدید نداشته باشید. |
| ابزار از قفل باقی‌مانده خبر می‌دهد | پیش از حذف `.dev-env-setup.lock` مطمئن شوید فرایند راه‌اندازی دیگری فعال نیست؛ سپس دوباره اجرا کنید. |
| پیام نبود کلید هوش مصنوعی | تطبیق پایه‌ای مسیر عادی توسعهٔ محلی است و برای آزمایش آن به کلید نیاز ندارید. |

انتظارهای بازبینی در [راهنمای GitLab همین مخزن](gitlab-workflow.fa.md)،
[راهنمای مشارکت](../CONTRIBUTING.md) و [سیاست امنیتی](../SECURITY.md) آمده است.
