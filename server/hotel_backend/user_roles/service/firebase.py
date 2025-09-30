import firebase_admin # type: ignore
from firebase_admin import credentials, db # type: ignore
from django.conf import settings
import os
import time
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class FirebaseService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._initialize_firebase()
        return cls._instance
    
    @classmethod
    def _initialize_firebase(cls):
        if not firebase_admin._apps:
            try:
                # Production: Use environment variables
                if settings.DEBUG:
                    # Development: Use service account file
                    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
                    if service_account_path and os.path.exists(service_account_path):
                        cred = credentials.Certificate(service_account_path)
                    else:
                        cred = credentials.Certificate({
                            "type": "service_account",
                            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                            "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
                            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token",
                        })
                else:
                    # Production: Use environment variables only
                    cred = credentials.Certificate({
                        "type": "service_account",
                        "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                        "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                        "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
                        "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                        "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    })
                
                firebase_admin.initialize_app(cred, {
                    'databaseURL': os.getenv('FIREBASE_DATABASE_URL')
                })
                logger.info("Firebase initialized successfully")
            except Exception as e:
                logger.error(f"Firebase initialization error: {e}")
                return
    
    def is_available(self) -> bool:
        """Check if Firebase is properly initialized"""
        return len(firebase_admin._apps) > 0
    
    # Real-time notification methods
    def send_user_notification(self, user_id: int, notification_data: Dict[str, Any]) -> Optional[str]:
        """Send real-time notification to specific user"""
        if not self.is_available():
            logger.warning("Firebase not available, skipping notification")
            return None
            
        try:
            ref = db.reference(f'user-notifications/{user_id}')
            notification_ref = ref.push({
                **notification_data,
                'timestamp': int(time.time() * 1000),
                'read': False
            })
            logger.info(f"Notification sent to user {user_id}")
            return notification_ref.key
        except Exception as e:
            logger.error(f"Failed to send notification to user {user_id}: {e}")
            return None
    
    def send_booking_update(self, booking_id: int, user_id: int, status: str, additional_data: Dict = None) -> bool:
        """Send booking status update"""
        if not self.is_available():
            return False
            
        try:
            # Update booking status for real-time tracking
            booking_ref = db.reference(f'booking-updates/{booking_id}')
            booking_ref.update({
                'booking_id': booking_id,
                'user_id': user_id,
                'status': status,
                'timestamp': int(time.time() * 1000),
                'data': additional_data or {}
            })
            
            # Send user notification
            status_messages = {
                'confirmed': 'Your booking has been confirmed!',
                'checked_in': 'Welcome! You have successfully checked in.',
                'checked_out': 'Thank you for staying with us!',
                'cancelled': 'Your booking has been cancelled.',
                'rejected': 'Unfortunately, your booking was not approved.',
            }
            
            message = status_messages.get(status, f'Booking status updated to {status}')
            
            self.send_user_notification(user_id, {
                'type': 'booking_update',
                'booking_id': booking_id,
                'status': status,
                'message': message,
                'data': additional_data
            })
            
            return True
        except Exception as e:
            logger.error(f"Failed to send booking update: {e}")
            return False
    
    def send_room_availability_update(self, room_id: int, is_available: bool, current_bookings: List[int] = None) -> bool:
        """Update room availability for real-time tracking"""
        if not self.is_available():
            return False
            
        try:
            ref = db.reference(f'room-availability/{room_id}')
            ref.update({
                'room_id': room_id,
                'is_available': is_available,
                'current_bookings': current_bookings or [],
                'last_updated': int(time.time() * 1000)
            })
            return True
        except Exception as e:
            logger.error(f"Failed to update room availability: {e}")
            return False
    
    def send_area_availability_update(self, area_id: int, is_available: bool, current_bookings: List[int] = None) -> bool:
        """Update area availability for real-time tracking"""
        if not self.is_available():
            return False
            
        try:
            ref = db.reference(f'area-availability/{area_id}')
            ref.update({
                'area_id': area_id,
                'is_available': is_available,
                'current_bookings': current_bookings or [],
                'last_updated': int(time.time() * 1000)
            })
            return True
        except Exception as e:
            logger.error(f"Failed to update area availability: {e}")
            return False
    
    def broadcast_admin_notification(self, message: str, data: Dict[str, Any] = None, notification_type: str = 'info') -> bool:
        """Broadcast to admin dashboard"""
        if not self.is_available():
            return False
            
        try:
            ref = db.reference('admin-notifications')
            ref.push({
                'message': message,
                'type': notification_type,
                'data': data or {},
                'timestamp': int(time.time() * 1000),
                'read': False
            })
            return True
        except Exception as e:
            logger.error(f"Failed to broadcast admin notification: {e}")
            return False
    
    def update_user_presence(self, user_id: int, is_online: bool, last_seen: int = None) -> bool:
        """Track user online presence"""
        if not self.is_available():
            return False
            
        try:
            ref = db.reference(f'user-presence/{user_id}')
            ref.update({
                'user_id': user_id,
                'is_online': is_online,
                'last_seen': last_seen or int(time.time() * 1000)
            })
            return True
        except Exception as e:
            logger.error(f"Failed to update user presence: {e}")
            return False
    
    def remove_notification(self, user_id: int, notification_key: str) -> bool:
        """Remove specific notification"""
        if not self.is_available():
            return False
            
        try:
            ref = db.reference(f'user-notifications/{user_id}/{notification_key}')
            ref.delete()
            return True
        except Exception as e:
            logger.error(f"Failed to remove notification: {e}")
            return False

firebase_service = FirebaseService()