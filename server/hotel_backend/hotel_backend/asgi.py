"""
ASGI config for hotel_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Use production settings on Render
if os.getenv('RENDER'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.production_settings')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_backend.settings')

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import admin_dashboard.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            admin_dashboard.routing.websocket_urlpatterns
        )
    ),
})