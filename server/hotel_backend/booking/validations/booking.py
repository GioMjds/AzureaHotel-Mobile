import re
from datetime import datetime
from django.utils import timezone
from rest_framework import serializers
from booking.models import Bookings

def validate_guest_name(name):
    """Validate guest name - letters and spaces only, minimum 2 characters"""
    if not name:
        raise serializers.ValidationError("Guest name is required")
    
    if len(name) < 2:
        raise serializers.ValidationError("Name must be at least 2 characters long")
    
    if not re.match(r'^[A-Za-z\s]+$', name):
        raise serializers.ValidationError("Name should contain only letters and spaces")
    
    return name

def validate_email(email, check_in_date=None, check_out_date=None, is_venue_booking=False):
    """Validate email format and check for overlapping bookings"""
    if not email:
        raise serializers.ValidationError("Email address is required")
    
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        raise serializers.ValidationError("Invalid email format")
    
    if not is_venue_booking and check_in_date and check_out_date:
        overlapping_bookings = Bookings.objects.filter(
            user__email=email,
            check_in_date__lt=check_out_date,
            check_out_date__gt=check_in_date,
            status__in=['pending', 'reserved', 'confirmed', 'checked_in'],
            is_venue_booking=False
        )
        
        if overlapping_bookings.exists():
            raise serializers.ValidationError("You already have an active booking during this period")
    
    return email

def validate_max_bookings_per_day(user_id):
    """Validate that a user hasn't exceeded the maximum number of bookings per day (3)"""
    if not user_id:
        return True
    
    today = timezone.now().date()
    
    bookings_today = Bookings.objects.filter(
        user_id=user_id,
        created_at__date=today
    )
    
    total_bookings = bookings_today.count()
    
    MAX_BOOKINGS_PER_DAY = 1
    
    if total_bookings >= MAX_BOOKINGS_PER_DAY:
        raise serializers.ValidationError(
            f"You have reached the maximum limit of {MAX_BOOKINGS_PER_DAY} bookings per day. Please try again tomorrow."
        )
    
    return True

def validate_phone_number(phone_number, check_in_date=None, check_out_date=None):
    """Validate phone number format (PH format with +63 prefix)"""
    if not phone_number:
        raise serializers.ValidationError("Phone number is required")
    
    cleaned_number = re.sub(r'[^\d+]', '', phone_number)
    
    if cleaned_number.startswith('+63'):
        local_number = cleaned_number[3:]
        if not (len(local_number) == 10 and local_number.startswith('9')):
            raise serializers.ValidationError("Philippine phone number must start with +63 followed by 9 and 9 more digits")
    else:
        if not re.match(r'^09\d{9}$', cleaned_number):
            raise serializers.ValidationError("Phone number must be in Philippine format: (+63) 9XX XXX XXXX")
    
    return phone_number

def validate_valid_id(valid_id):
    """Validate the uploaded ID"""
    if not valid_id:
        raise serializers.ValidationError("Valid ID is required")
    
    if valid_id.size > 2 * 1024 * 1024:
        raise serializers.ValidationError("ID file size exceeds the limit (2MB max)")
    
    allowed_formats = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
    if valid_id.content_type not in allowed_formats:
        raise serializers.ValidationError("ID must be an image file (JPEG, PNG, GIF, or WebP)")
    
    return valid_id

def validate_number_of_guests(guests, room_max_guests):
    """Validate number of guests against room capacity"""
    if not guests:
        raise serializers.ValidationError("Number of guests is required")
    
    try:
        guests = int(guests)
    except (ValueError, TypeError):
        raise serializers.ValidationError("Number of guests must be a number")
    
    if guests < 1:
        raise serializers.ValidationError("At least 1 guest is required")
    
    if room_max_guests and guests > room_max_guests:
        raise serializers.ValidationError(f"Maximum capacity for this room is {room_max_guests} guests")
    
    return guests

def validate_dates(check_in_date, check_out_date, is_venue_booking=False):
    """Validate check-in and check-out dates"""
    today = timezone.now().date()
    
    if not check_in_date:
        raise serializers.ValidationError("Check-in date is required")
    
    if not check_out_date:
        raise serializers.ValidationError("Check-out date is required")
    
    if check_in_date < today:
        raise serializers.ValidationError("Check-in date cannot be in the past")
    
    if is_venue_booking:
        if check_out_date < check_in_date:
            raise serializers.ValidationError("Check-out date must be on or after check-in date")
    else:
        if check_out_date <= check_in_date:
            raise serializers.ValidationError("Check-out date must be after check-in date")
    
    max_stay_days = 30
    stay_duration = (check_out_date - check_in_date).days
    if stay_duration > max_stay_days:
        raise serializers.ValidationError(f"Maximum stay duration is {max_stay_days} days")
    
    return check_in_date, check_out_date

def validate_arrival_time(arrival_time):
    """Validate arrival time (must be between 7:00 AM and 11:00 PM)"""
    if not arrival_time:
        raise serializers.ValidationError("Expected time of arrival is required")
    
    try:
        arrival_time_obj = datetime.strptime(arrival_time, "%H:%M").time()
        
        min_time = datetime.strptime("14:00", "%H:%M").time()
        max_time = datetime.strptime("23:00", "%H:%M").time()
        
        if arrival_time_obj < min_time:
            raise serializers.ValidationError("Early check-in is not allowed. Arrival time must be after 2:00 PM.")
        
        if arrival_time_obj > max_time:
            raise serializers.ValidationError("Late arrivals not accepted after 10:00 PM.")
        
    except ValueError:
        raise serializers.ValidationError("Invalid time format")
    
    return arrival_time

def validate_special_request(special_request):
    """Validate special request text - max 500 characters"""
    if special_request and len(special_request) > 500:
        raise serializers.ValidationError("Special request text cannot exceed 500 characters")
    
    return special_request

def validate_booking_request(data, room):
    """Validate the entire booking request"""
    errors = {}
    
    request = data.get('_request')
    user = None
    
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    
    is_venue_booking = data.get('isVenueBooking', False)
    
    try:
        validate_dates(data.get('checkIn'), data.get('checkOut'), is_venue_booking)
    except serializers.ValidationError as e:
        errors['dates'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)
    
    try:
        validate_guest_name(data.get('firstName', ''))
    except serializers.ValidationError as e:
        errors['firstName'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)
        
    try:
        validate_guest_name(data.get('lastName', ''))
    except serializers.ValidationError as e:
        errors['lastName'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)

    try:
        validate_phone_number(
            data.get('phoneNumber', ''),
            data.get('checkIn'),
            data.get('checkOut')
        )
    except serializers.ValidationError as e:
        errors['phoneNumber'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)

    try:
        validate_special_request(data.get('specialRequests', ''))
    except serializers.ValidationError as e:
        errors['specialRequests'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)
    
    if 'validId' in data:
        try:
            validate_valid_id(data.get('validId'))
        except serializers.ValidationError as e:
            errors['validId'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)
    
    if not is_venue_booking:
        try:
            validate_arrival_time(data.get('arrivalTime', ''))
        except serializers.ValidationError as e:
            errors['arrivalTime'] = str(e.detail[0]) if hasattr(e, 'detail') else str(e)
    
    if not is_venue_booking and room and data.get('checkIn') and data.get('checkOut'):
        check_in = data.get('checkIn')
        check_out = data.get('checkOut')
        
        overlapping_bookings = Bookings.objects.filter(
            room=room,
            check_in_date__lt=check_out,
            check_out_date__gt=check_in,
            status__in=['reserved', 'confirmed', 'checked_in']
        )
        
        if overlapping_bookings.exists():
            errors['room'] = "This room is not available for the selected dates"
    
    if user and hasattr(user, 'last_booking_date') and user.role == 'guest' and data.get('checkIn'):
        check_in_date = data.get('checkIn')
        today = timezone.now().date()
        
        user_last_booking = user.last_booking_date.strftime('%Y-%m-%d') if user.last_booking_date else None
        today_str = today.strftime('%Y-%m-%d')
        
        if user_last_booking and user_last_booking == today_str and str(check_in_date) == today_str:
            errors['booking_limit'] = "You can only make one booking per day. Please try again tomorrow."
    return errors
