import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from booking.models import Bookings
from django.utils import timezone
import firebase_admin
from firebase_admin import db as firebase_db
from user_roles.service.firebase import firebase_service
import logging
from datetime import datetime
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from booking.models import Bookings
from user_roles.models import Notification as UserNotification, CustomUsers
from user_roles.service.firebase import firebase_service
from firebase_admin import db as firebase_db
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Bookings)
def bookings_pre_save(sender, instance: Bookings, **kwargs):
    """Store previous status on the instance so post_save can detect changes."""
    if not instance.pk:
        instance._previous_status = None
        return

    try:
        previous = sender.objects.filter(pk=instance.pk).first()
        instance._previous_status = previous.status if previous else None
    except Exception:
        instance._previous_status = None


def _build_additional_data(booking: Bookings) -> dict:
    data = {
        'is_venue_booking': bool(booking.is_venue_booking),
        'total_price': float(booking.total_price) if booking.total_price is not None else None,
        'number_of_guests': int(booking.number_of_guests) if booking.number_of_guests is not None else None,
    }

    try:
        if booking.is_venue_booking and booking.area:
            data['area_name'] = booking.area.area_name
            data['area_id'] = booking.area.id
        elif booking.room:
            data['room_name'] = getattr(booking.room, 'room_name', None) or getattr(booking.room, 'room_number', None)
            data['room_id'] = booking.room.id
    except Exception:
        return

    return data


@receiver(post_save, sender=Bookings)
def booking_post_save(sender, instance: Bookings, created: bool, **kwargs):
    """When a booking is created or its status changes, push an update to
    Firebase Realtime Database so mobile clients receive real-time updates.
    """
    try:
        prev_status = getattr(instance, '_previous_status', None)
        curr_status = instance.status

        # Notify when created or status changed
        if not created and prev_status == curr_status:
            return

        user = instance.user
        user_id = user.id if user else None
        booking_id = instance.id

        additional_data = _build_additional_data(instance)

        # Primary write using existing helper (writes booking-updates, user-bookings, notifications/...)
        try:
            if firebase_service is not None:
                firebase_service.send_booking_update(
                    booking_id=booking_id,
                    user_id=user_id,
                    status=curr_status,
                    additional_data=additional_data,
                )
        except Exception:
            return

        # Mirror/write to the exact path mobile expects: user-notifications/{userId}
        try:
            if firebase_db is not None and user_id is not None:
                root_ref = firebase_db.reference('/')

                # booking-updates node
                booking_update_ref = root_ref.child('booking-updates').child(str(booking_id))
                booking_update_ref.set({
                    'booking_id': booking_id,
                    'user_id': user_id,
                    'status': curr_status,
                    'timestamp': datetime.now().isoformat(),
                    'data': additional_data,
                })

                # user-bookings mirror
                user_bookings_ref = root_ref.child('user-bookings').child(f'user_{user_id}').child(str(booking_id))
                user_bookings_ref.set({
                    'booking_id': booking_id,
                    'status': curr_status,
                    'timestamp': datetime.now().isoformat(),
                    'is_venue_booking': additional_data.get('is_venue_booking', False),
                })

                # user-notifications path expected by mobile client
                user_notifications_ref = root_ref.child('user-notifications').child(str(user_id)).push()
                
                # Get property name for standardized message
                property_name = "your reservation"
                try:
                    if instance.is_venue_booking and instance.area:
                        property_name = instance.area.area_name
                    elif instance.room:
                        property_name = instance.room.room_name if hasattr(instance.room, 'room_name') else instance.room.room_number
                except Exception:
                    pass
                
                # Use standardized message templates from create_booking_notification
                messages = {
                    'reserved': f"Your booking for {property_name} has been confirmed!",
                    'no_show': f"You did not show up for your booking at {property_name}.",
                    'rejected': f"Your booking for {property_name} has been rejected. Click to see booking details.",
                    'checkin_reminder': f"Reminder: You have a booking at {property_name} today. Click to see booking details.",
                    'checked_in': f"You have been checked in to {property_name}",
                    'checked_out': f"You have been checked out from {property_name}. Thank you for staying with us!",
                    'cancelled': f"Your booking for {property_name} has been cancelled. Click to see details."
                }
                
                standard_message = messages.get(curr_status.lower(), f'Booking #{booking_id} status: {curr_status}')
                
                notif_payload = {
                    'type': 'booking_update',
                    'booking_id': booking_id,
                    'status': curr_status,
                    'message': standard_message,
                    'timestamp': int(datetime.now().timestamp() * 1000),
                    'read': False,
                    'data': additional_data,
                }
                user_notifications_ref.set(notif_payload)

        except Exception:
            return

        try:
            if user is not None:
                # Get property name for standardized message
                property_name = "your reservation"
                try:
                    if instance.is_venue_booking and instance.area:
                        property_name = instance.area.area_name
                    elif instance.room:
                        property_name = instance.room.room_name if hasattr(instance.room, 'room_name') else instance.room.room_number
                except Exception:
                    pass
                
                # Use standardized message templates
                messages = {
                    'reserved': f"Your booking for {property_name} has been confirmed!",
                    'no_show': f"You did not show up for your booking at {property_name}.",
                    'rejected': f"Your booking for {property_name} has been rejected. Click to see booking details.",
                    'checkin_reminder': f"Reminder: You have a booking at {property_name} today. Click to see booking details.",
                    'checked_in': f"You have been checked in to {property_name}",
                    'checked_out': f"You have been checked out from {property_name}. Thank you for staying with us!",
                    'cancelled': f"Your booking for {property_name} has been cancelled. Click to see details."
                }
                
                standard_message = messages.get(curr_status.lower(), f'Booking #{booking_id} status updated to {curr_status}')
                
                notif_type = curr_status.lower() if curr_status.lower() in messages else 'booking_update'
                UserNotification.objects.create(
                    user=user,
                    message=standard_message,
                    notification_type=notif_type,
                    booking=instance,
                )
        except Exception:
            return

        try:
            if get_channel_layer is not None and async_to_sync is not None:
                channel_layer = get_channel_layer()
                include_statuses = ['pending', 'reserved', 'checked_in']
                count = Bookings.objects.filter(status__in=include_statuses).count()
                async_to_sync(channel_layer.group_send)(
                    'admin_notifications',
                    {
                        'type': 'active_count_update',
                        'count': count,
                    },
                )
        except Exception:
            return

    except Exception:
        return
