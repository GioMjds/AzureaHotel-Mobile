from django.urls import path
from . import views

# /property/** routes
urlpatterns = [
    path('rooms', views.fetch_rooms, name='fetch_rooms'),
    path('rooms/<int:id>', views.fetch_room_detail, name='fetch_room_detail'),
    path('areas', views.fetch_areas, name='fetch_areas'),
    path('areas/<int:id>', views.fetch_area_detail, name='fetch_area_detail'),
    path('amenities', views.fetch_amenities, name='fetch_amenities'),
]
