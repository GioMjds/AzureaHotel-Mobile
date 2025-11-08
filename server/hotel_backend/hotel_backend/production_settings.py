from .settings import *
import os

DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Get the Render service URL dynamically
RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL', '')
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '.onrender.com').split(',')

# Add the Render URL to allowed hosts
if RENDER_EXTERNAL_URL:
    allowed_host = RENDER_EXTERNAL_URL.replace('https://', '').replace('http://', '')
    if allowed_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(allowed_host)

# Security settings for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# CORS for production - Update this with your actual mobile app URL
CORS_ALLOWED_ORIGINS = [
    os.getenv('CLIENT_URL', 'exp://192.168.1.5:8081'),  # For local dev
    # Add your production mobile app URL when ready
]

# For development/testing, you might want:
# CORS_ALLOW_ALL_ORIGINS = True  # Remove in production!

# Database - Use environment variables from Render
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '3306'),
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'charset': 'utf8mb4',
        },
    }
}

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}