from firebase_admin import credentials, auth, db, messaging, get_app, initialize_app
import logging
from datetime import datetime
from pathlib import Path
from ..models import DeviceToken
from typing import List

logger = logging.getLogger(__name__)

class FirebaseService:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._initialize_firebase()
            FirebaseService._initialized = True

    def _initialize_firebase(self):
        try:
            get_app()
        except ValueError:
            try:
                base_dir = Path(__file__).resolve().parent.parent.parent.parent
                cred_path = base_dir / 'azureahotel-mobile-firebase-adminsdk-fbsvc-37eb3239af.json'
                
                if not cred_path.exists():
                    return
                
                cred = credentials.Certificate(str(cred_path))
                
                initialize_app(cred, {
                    'databaseURL': 'https://azureahotel-mobile-default-rtdb.firebaseio.com/'
                })
            except Exception as e:
                pass

    def is_available(self) -> bool:
        """Check if Firebase is properly initialized"""
        try:
            get_app()
            return True
        except ValueError:
            return False

    def create_custom_token(self, user_id: str, additional_claims: dict = None) -> str:
        """Create a Firebase custom token for the given user"""
        try:
            if not self.is_available():
                raise Exception("Firebase not initialized")

            claims = additional_claims or {}
            custom_token = auth.create_custom_token(user_id, claims)
            return custom_token.decode('utf-8')
        except Exception as e:
            raise

    def send_booking_update(self, booking_id: int, user_id: int, status: str, additional_data: dict = None):
        """Send booking update notification via Firebase Realtime Database
        NOTE: This only updates booking state. User notifications are handled by create_booking_notification()"""
        try:
            if not self.is_available():
                return False
            
            # Write to Firebase Realtime Database
            ref = db.reference('/')
            
            # Update booking-updates node (for booking state tracking)
            booking_update_ref = ref.child('booking-updates').child(str(booking_id))
            booking_update_ref.set({
                'booking_id': booking_id,
                'user_id': user_id,
                'status': status,
                'timestamp': datetime.now().isoformat(),
                'data': additional_data or {}
            })
            
            # Update user-bookings node (for quick user lookup)
            user_bookings_ref = ref.child('user-bookings').child(f'user_{user_id}').child(str(booking_id))
            user_bookings_ref.set({
                'booking_id': booking_id,
                'status': status,
                'timestamp': datetime.now().isoformat(),
                'is_venue_booking': additional_data.get('is_venue_booking', False) if additional_data else False
            })
            
            # NOTE: We do NOT create user-facing notifications here anymore.
            # User notifications are created by create_booking_notification() in views.py
            # This avoids duplicate notifications from both signals and explicit calls.
            
            return True
            
        except Exception as e:
            return False

    def send_room_availability_update(self, room_id: int, is_available: bool, current_bookings: list):
        """Send room availability update to Firebase"""
        try:
            if not self.is_available():
                return False
            
            # Update Firebase Realtime Database
            ref = db.reference('/')
            room_ref = ref.child('room-availability').child(str(room_id))
            room_ref.set({
                'room_id': room_id,
                'is_available': is_available,
                'current_bookings': current_bookings,
                'last_updated': datetime.now().isoformat()
            })

            return True
        except Exception as e:
            return False

    def send_area_availability_update(self, area_id: int, is_available: bool, current_bookings: list):
        """Send area availability update to Firebase"""
        try:
            if not self.is_available():
                return False
            
            # Update Firebase Realtime Database
            ref = db.reference('/')
            area_ref = ref.child('area-availability').child(str(area_id))
            area_ref.set({
                'area_id': area_id,
                'is_available': is_available,
                'current_bookings': current_bookings,
                'last_updated': datetime.now().isoformat()
            })
            
            return True
        except Exception as e:
            return False

    def broadcast_admin_notification(self, message: str, data: dict, notification_type: str = 'general'):
        """Broadcast notification to admin dashboard"""
        try:
            if not self.is_available():
                return False

            ref = db.reference('/')
            admin_notifications_ref = ref.child('admin-notifications').push()
            admin_notifications_ref.set({
                'type': notification_type,
                'message': message,
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'read': False
            })
            
            return True
        except Exception as e:
            return False

    def send_user_notification(self, user_id: int, notification_data: dict):
        """Send notification to specific user"""
        try:
            if not self.is_available():
                return False
            
            # Write to Firebase Realtime Database
            # IMPORTANT: Mobile subscribes to `user-notifications/{userId}` (not `notifications/user_{user_id}`)
            ref = db.reference('/')
            user_notifications_ref = ref.child('user-notifications').child(str(user_id)).push()
            user_notifications_ref.set({
                **notification_data,
                # Mobile expects timestamp as milliseconds (number), not ISO string
                'timestamp': int(datetime.now().timestamp() * 1000),
                'read': False
            })

            try:
                title = notification_data.get('title', 'Booking Update')
                body = notification_data.get('message') or notification_data.get('body') or ''
                data_payload = notification_data.get('data', {}) or {}

                try:
                    tokens_qs = DeviceToken.objects.filter(user_id=user_id).values_list('token', 'platform')
                    token_rows = list(tokens_qs)
                    if token_rows:
                        expo_tokens: List[str] = []
                        fcm_tokens: List[str] = []
                        for t, plat in token_rows:
                            if (plat and str(plat).lower() == 'expo') or (isinstance(t, str) and t.startswith('ExponentPushToken')):
                                expo_tokens.append(t)
                            else:
                                fcm_tokens.append(t)

                        if fcm_tokens:
                            notif = messaging.Notification(title=title, body=body)
                            data_strings = {k: str(v) for k, v in data_payload.items()}
                            
                            # Android-specific config for background notifications
                            android_config = messaging.AndroidConfig(
                                priority='high',
                                notification=messaging.AndroidNotification(
                                    title=title,
                                    body=body,
                                    channel_id='default',  # Must match app.json defaultChannel
                                    priority='high',
                                    default_sound=True,
                                    default_vibrate_timings=True,
                                )
                            )

                            try:
                                if hasattr(messaging, 'send_multicast'):
                                    multicast = messaging.MulticastMessage(
                                        notification=notif,
                                        data=data_strings,
                                        tokens=fcm_tokens,
                                        android=android_config,
                                    )
                                    res = messaging.send_multicast(multicast)
                                elif hasattr(messaging, 'send_all'):
                                    messages = [messaging.Message(notification=notif, data=data_strings, token=t, android=android_config) for t in fcm_tokens]
                                    res = messaging.send_all(messages)
                                    success = getattr(res, 'success_count', None)
                                    failure = getattr(res, 'failure_count', None)
                                else:
                                    success = 0
                                    failure = 0
                                    for t in fcm_tokens:
                                        try:
                                            m = messaging.Message(notification=notif, data=data_strings, token=t, android=android_config)
                                            messaging.send(m)
                                            success += 1
                                        except Exception:
                                            failure += 1
                            except Exception:
                                pass

                        if expo_tokens:
                            try:
                                self._send_expo_pushes(expo_tokens, title, body, data_payload)
                            except Exception:
                                pass
                except Exception:
                    pass
            except Exception:
                pass
            return True
        except Exception as e:
            return False

    def _send_expo_pushes(self, tokens: List[str], title: str, body: str, data: dict = None):
        """Send push notifications via Expo Push API for Expo-managed clients.
        Batches requests in groups of 100 as recommended by Expo.
        """
        if not tokens:
            return

        # Expo recommends batches of up to 100
        batch_size = 100
        for i in range(0, len(tokens), batch_size):
            batch = tokens[i : i + batch_size]
            messages = []
            for t in batch:
                msg = {
                    'to': t,
                    'title': title,
                    'body': body,
                    'data': data or {}
                }
                messages.append(msg)

# Create singleton instance
firebase_service = FirebaseService()