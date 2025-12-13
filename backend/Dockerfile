# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=matcher_backend.settings

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create media directory
RUN mkdir -p /app/media/uploads

# Collect static files (will be run again in production)
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Install gunicorn for production
RUN pip install gunicorn

# Run migrations and start server with gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn matcher_backend.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"]

