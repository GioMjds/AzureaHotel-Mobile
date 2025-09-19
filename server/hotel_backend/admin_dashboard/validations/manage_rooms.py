from rest_framework.exceptions import ValidationError

def validate_room_data(data: dict) -> dict:
    errors = {}
    
    room_name = data.get('room_name')
    if not room_name:
        errors['room_name'] = "Room name is required"
        
    admission = data.get('admission')
    if admission not in ["regular", "vip"]:
        errors['admission'] = "Admission must be either Regular or VIP."
        
    status = data.get('status')
    if status not in ["available", "maintenance"]:
        errors['status'] = "Status must be either Available or Maintenance."
        
    room_price = data.get('room_price')
    try:
        price_value = float(room_price)
        if price_value < 0:
            errors['room_price'] = "Room price must be a positive number."
    except (TypeError, ValueError):
        errors['room_price'] = "Room price must be a valid number."
    
    pax = data.get('pax')
    try:
        pax_value = int(pax)
        if pax_value <= 0:
            errors['pax'] = "Pax must be a positive number."
    except (TypeError, ValueError):
        errors['pax'] = "Pax must be a valid number."
        
    if errors:
        raise ValidationError(errors)
    
    return data