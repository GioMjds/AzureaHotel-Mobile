from django.utils import timezone
from datetime import timedelta
from booking.models import Bookings
from user_roles.views import create_notification

def send_checkin_reminders():
    """
    Send reminder notifications to guests who have check-ins scheduled for today.
    This function should be scheduled to run daily.
    """
    today = timezone.now().date()
    
    upcoming_checkins = Bookings.objects.filter(
        check_in_date__date=today,
        status='reserved'
    )
    
    notification_count = 0
    for booking in upcoming_checkins:
        try:
            if booking.is_venue_booking and booking.area:
                property_name = booking.area.area_name
            elif booking.room:
                property_name = booking.room.room_name
            else:
                property_name = "your reservation"
                
            booking.property_name = property_name
            
            create_notification(booking.user, booking, 'checkin_reminder')
            notification_count += 1
            
        except Exception as e:
            return f"Error: {e}"
    return notification_count 