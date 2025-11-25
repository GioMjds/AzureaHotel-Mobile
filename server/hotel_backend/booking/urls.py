from django.urls import path
from . import views

# /booking/** routes
urlpatterns = [
    path('availability', views.fetch_availability, name='availability'),
    path('bookings', views.bookings_list, name='bookings_list'),
    path('bookings/<str:booking_id>', views.booking_detail, name='booking_detail'),
    path('bookings/<str:booking_id>/cancel', views.cancel_booking, name='cancel_booking'),
    path('bookings/<int:booking_id>/reviews', views.booking_reviews, name='booking_reviews'),
    path('user/bookings', views.user_bookings, name='user_bookings'),
    path('user/reviews', views.user_reviews, name='user_reviews'),
    path('reviews/<str:review_id>', views.review_detail, name='review_detail'),
    path('reservation', views.reservation_list, name='reservation_list'),
    path('reservation/<str:reservation_id>', views.reservation_detail, name='reservation_detail'),
    path('areas', views.area_reservations, name='area_reservations'),
    path('areas/<str:area_id>', views.area_detail, name='area_detail'),
    path('areas/<str:area_id>/bookings', views.fetch_area_bookings, name='area_bookings'),
    path('areas/<int:area_id>/reviews', views.area_reviews, name='area_reviews'),
    path('rooms/<str:room_id>', views.room_detail, name='room_detail'),
    path('rooms/<int:room_id>/bookings', views.fetch_room_bookings, name='room_bookings'),
    path('rooms/<int:room_id>/reviews', views.room_reviews, name='room_reviews'),
    path('generate_checkout_e_receipt/<str:booking_id>', views .generate_checkout_e_receipt, name='generate_checkout_e_receipt'),
    # PayMongo integration
    path('bookings/<str:booking_id>/paymongo/create', views.create_paymongo_source, name='create_paymongo_source'),
    path('paymongo/create-without-booking', views.create_paymongo_source_prebooking, name='create_paymongo_source_prebooking'),
    path('paymongo/create-without-booking/', views.create_paymongo_source_prebooking, name='create_paymongo_source_prebooking_slash'),
    path('paymongo/sources/<str:source_id>/verify', views.verify_paymongo_source, name='verify_paymongo_source'),
    path('paymongo/webhook', views.paymongo_webhook, name='paymongo_webhook'),
    # PayMongo payment redirect endpoints (deep link back to app)
    path('paymongo/payment-success', views.payment_success, name='payment_success'),
    path('paymongo/payment-failed', views.payment_failed, name='payment_failed'),
    # Enter amount flow for mobile deep-link + PayMongo
    path('paymongo/enter_amount', views.enter_amount, name='paymongo_enter_amount'),
    # Accept both with and without trailing slash to avoid 404 due to slash handling
    path('paymongo/enter_amount/', views.enter_amount, name='paymongo_enter_amount_slash'),
    path('paymongo/create_from_entry', views.create_from_entry, name='paymongo_create_from_entry'),
    path('paymongo/redirect/success', views.paymongo_redirect_success, name='paymongo_redirect_success'),
    path('paymongo/redirect/failed', views.paymongo_redirect_failed, name='paymongo_redirect_failed'),
]