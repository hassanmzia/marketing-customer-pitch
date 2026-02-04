#!/bin/bash
# ============================================
# Django Entrypoint Script
# AI Marketing Customer Pitch Assistant
# ============================================

set -e

echo "=========================================="
echo " Starting Django Backend Service"
echo "=========================================="

# ── Wait for PostgreSQL ──────────────────────
echo "[1/5] Waiting for PostgreSQL to be ready..."
while ! python -c "
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('${POSTGRES_HOST:-postgres}', 5432))
sock.close()
exit(result)
" 2>/dev/null; do
    echo "  PostgreSQL is not ready yet. Retrying in 2 seconds..."
    sleep 2
done
echo "  PostgreSQL is ready!"

# ── Wait for Redis ───────────────────────────
echo "[2/5] Waiting for Redis to be ready..."
while ! python -c "
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('redis', 6379))
sock.close()
exit(result)
" 2>/dev/null; do
    echo "  Redis is not ready yet. Retrying in 2 seconds..."
    sleep 2
done
echo "  Redis is ready!"

# ── Install any new Python dependencies ──────
echo "[3/7] Installing Python dependencies..."
pip install --no-cache-dir -q -r requirements.txt 2>/dev/null || true
echo "  Dependencies installed!"

# ── Run Database Migrations ──────────────────
echo "[4/7] Running database migrations..."
python manage.py makemigrations --noinput 2>/dev/null || true
python manage.py migrate --noinput
echo "  Migrations complete!"

# ── Collect Static Files ─────────────────────
echo "[5/7] Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || \
python manage.py collectstatic --noinput 2>/dev/null || \
echo "  Static files collection skipped (no staticfiles configured yet)"

# ── Create Superuser ─────────────────────────
echo "[6/7] Creating superuser if it doesn't exist..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
username = '${DJANGO_SUPERUSER_USERNAME:-admin}'
email = '${DJANGO_SUPERUSER_EMAIL:-admin@pitch.local}'
password = '${DJANGO_SUPERUSER_PASSWORD:-admin_pitch_2024}'
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f'  Superuser \"{username}\" created successfully!')
else:
    print(f'  Superuser \"{username}\" already exists. Skipping.')
" 2>/dev/null || echo "  Superuser creation skipped (User model not ready yet)"

echo "=========================================="
echo " Starting Gunicorn on port 8064"
echo "=========================================="

# ── Start Gunicorn ───────────────────────────
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8064 \
    --workers ${GUNICORN_WORKERS:-3} \
    --threads ${GUNICORN_THREADS:-2} \
    --worker-class gthread \
    --worker-tmp-dir /dev/shm \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --reload
