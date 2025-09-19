from django.urls import re_path
from . import consumers

websockets_urlpatterns = [
    re_path(r'ws/admin_dashboard/active-bookings/?$', consumers.PendingBookingConsumer.as_asgi()),
]