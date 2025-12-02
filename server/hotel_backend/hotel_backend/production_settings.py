from .settings import *
import os
import dj_database_url
import cloudinary

DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Ensure Cloudinary always uses HTTPS in production
cloudinary.config(
    cloud_name=os.getenv('CLOUD_NAME'),
    api_key=os.getenv('API_KEY'),
    api_secret=os.getenv('API_SECRET'),
    secure=True  # Always use HTTPS URLs for images (required for mobile apps)
)

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

# Cookie settings for cross-origin requests (web app on different domain)
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

# CORS for production - Include web app origins
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    os.getenv('CLIENT_URL', 'exp://192.168.1.5:8081'),  # For mobile dev
    'https://azurea-hotel.vercel.app',  # Production web app (if on Vercel)
    'http://localhost:5173',  # Local web development
    'http://localhost:3000',  # Alternative local port
]

# Add dynamic web app URL if provided
WEB_APP_URL = os.getenv('WEB_APP_URL', '')
if WEB_APP_URL and WEB_APP_URL not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(WEB_APP_URL)

# Database: prefer full URL from Render (DB_URL / DATABASE_URL). Fallback to MySQL block if not present.
DATABASE_URL = os.getenv('DB_URL') or os.getenv('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=True)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': os.getenv('DB_HOST'),
            'PORT': os.getenv('DB_PORT'),
            'OPTIONS': {
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                'charset': 'utf8mb4',
            },
        }
    }