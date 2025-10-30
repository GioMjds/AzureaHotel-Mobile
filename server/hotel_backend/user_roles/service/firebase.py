from firebase_admin import credentials, auth, db, messaging, get_app, initialize_app
import logging
from datetime import datetime
from pathlib import Path
import requests
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
            # Check if Firebase is already initialized
            get_app()
            logger.info("Firebase already initialized")
        except ValueError:
            # Firebase not initialized, initialize it
            try:
                # Get the path to the service account key
                base_dir = Path(__file__).resolve().parent.parent.parent.parent
                cred_path = base_dir / 'azureahotel-mobile-firebase-adminsdk-fbsvc-37eb3239af.json'
                
                if not cred_path.exists():
                    logger.error(f"Firebase credentials file not found at {cred_path}")
                    return
                
                cred = credentials.Certificate(str(cred_path))
                
                # Initialize with Realtime Database URL
                initialize_app(cred, {
                    'databaseURL': 'https://azureahotel-mobile-default-rtdb.firebaseio.com/'
                })
                
                logger.info("✅ Firebase initialized successfully with Realtime Database")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {str(e)}")

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
            logger.error(f"Error creating custom token: {str(e)}")
            raise

    def send_booking_update(self, booking_id: int, user_id: int, status: str, additional_data: dict = None):
        """Send booking update notification via Firebase Realtime Database"""
        try:
            if not self.is_available():
                logger.warning("Firebase not available for sending booking update")
                return False

            logger.info(f"📱 Booking update for user {user_id}: Booking #{booking_id} - Status: {status}")
            logger.info(f"   Additional data: {additional_data}")
            
            # Write to Firebase Realtime Database
            ref = db.reference('/')
            
            # Update booking-updates node
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
            
            # Create notification for user
            notification_ref = ref.child('notifications').child(f'user_{user_id}').push()
            notification_ref.set({
                'type': 'booking_update',
                'booking_id': booking_id,
                'status': status,
                'message': f'Booking #{booking_id} status: {status}',
                'timestamp': datetime.now().isoformat(),
                'read': False,
                'data': additional_data or {}
            })
            
            logger.info(f"✅ Successfully wrote booking update to Firebase")

            # ALSO: send FCM push to topic `user_{user_id}` and to any saved device tokens
            try:
                title = f"Booking #{booking_id} update"
                body = f"Status: {status}"
                data_payload = (additional_data or {})

                # Topic send
                topic = f"user_{user_id}"
                message = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={k: str(v) for k, v in data_payload.items()},
                    topic=topic
                )
                resp = messaging.send(message)
                logger.info(f"✅ FCM message sent to topic {topic}: {resp}")

                # Send to saved device tokens (if any)
                try:
                    from ..models import DeviceToken
                    tokens_qs = DeviceToken.objects.filter(user_id=user_id).values_list('token', 'platform')
                    token_rows = list(tokens_qs)
                    if token_rows:
                        # Separate Expo tokens from FCM tokens
                        expo_tokens: List[str] = []
                        fcm_tokens: List[str] = []

                        for t, plat in token_rows:
                            # if platform explicitly marked as 'expo' or token looks like an Expo token
                            if (plat and str(plat).lower() == 'expo') or (isinstance(t, str) and t.startswith('ExponentPushToken')):
                                expo_tokens.append(t)
                            else:
                                fcm_tokens.append(t)

                        if fcm_tokens:
                            # Build notification payload for per-token sends
                            notif = messaging.Notification(title=title, body=body)
                            data_strings = {k: str(v) for k, v in data_payload.items()}

                            # Preferred: use send_multicast if available, otherwise try send_all, otherwise fall back to per-token sends
                            try:
                                if hasattr(messaging, 'send_multicast'):
                                    multicast = messaging.MulticastMessage(
                                        notification=notif,
                                        data=data_strings,
                                        tokens=fcm_tokens
                                    )
                                    res = messaging.send_multicast(multicast)
                                    logger.info(f"✅ FCM multicast sent to {len(fcm_tokens)} tokens: success={res.success_count} failure={res.failure_count}")
                                elif hasattr(messaging, 'send_all'):
                                    # send_all takes a list of Message objects
                                    messages = [messaging.Message(notification=notif, data=data_strings, token=t) for t in fcm_tokens]
                                    res = messaging.send_all(messages)
                                    success = getattr(res, 'success_count', None)
                                    failure = getattr(res, 'failure_count', None)
                                    logger.info(f"✅ FCM send_all sent to {len(fcm_tokens)} tokens: success={success} failure={failure}")
                                else:
                                    # Last resort: send individually
                                    success = 0
                                    failure = 0
                                    for t in fcm_tokens:
                                        try:
                                            m = messaging.Message(notification=notif, data=data_strings, token=t)
                                            messaging.send(m)
                                            success += 1
                                        except Exception:
                                            logger.exception(f"Failed sending FCM to token {t}")
                                            failure += 1
                                    logger.info(f"✅ FCM per-token send: attempted={len(fcm_tokens)} success={success} failure={failure}")
                            except Exception:
                                logger.exception("Failed sending FCM to saved device tokens (multicast/send_all/per-token)")

                        if expo_tokens:
                            try:
                                self._send_expo_pushes(expo_tokens, title, body, data_payload)
                            except Exception:
                                logger.exception("Failed sending Expo pushes to saved device tokens")
                except Exception:
                    logger.exception("Failed sending FCM to saved device tokens")
            except Exception:
                logger.exception("Failed to send FCM push for booking update")

            return True
            
        except Exception as e:
            logger.error(f"Error sending booking update to Firebase: {str(e)}")
            return False

    def send_room_availability_update(self, room_id: int, is_available: bool, current_bookings: list):
        """Send room availability update to Firebase"""
        try:
            if not self.is_available():
                logger.warning("Firebase not available for room availability update")
                return False

            logger.info(f"🏠 Room {room_id} availability update: {'Available' if is_available else 'Booked'}")
            logger.info(f"   Current bookings: {current_bookings}")
            
            # Update Firebase Realtime Database
            ref = db.reference('/')
            room_ref = ref.child('room-availability').child(str(room_id))
            room_ref.set({
                'room_id': room_id,
                'is_available': is_available,
                'current_bookings': current_bookings,
                'last_updated': datetime.now().isoformat()
            })
            
            logger.info(f"✅ Successfully wrote room availability to Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Error updating room availability in Firebase: {str(e)}")
            return False

    def send_area_availability_update(self, area_id: int, is_available: bool, current_bookings: list):
        """Send area availability update to Firebase"""
        try:
            if not self.is_available():
                logger.warning("Firebase not available for area availability update")
                return False

            logger.info(f"📍 Area {area_id} availability update: {'Available' if is_available else 'Booked'}")
            logger.info(f"   Current bookings: {current_bookings}")
            
            # Update Firebase Realtime Database
            ref = db.reference('/')
            area_ref = ref.child('area-availability').child(str(area_id))
            area_ref.set({
                'area_id': area_id,
                'is_available': is_available,
                'current_bookings': current_bookings,
                'last_updated': datetime.now().isoformat()
            })
            
            logger.info(f"✅ Successfully wrote area availability to Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Error updating area availability in Firebase: {str(e)}")
            return False

    def broadcast_admin_notification(self, message: str, data: dict, notification_type: str = 'general'):
        """Broadcast notification to admin dashboard"""
        try:
            if not self.is_available():
                logger.warning("Firebase not available for admin notification")
                return False

            logger.info(f"📢 Admin notification ({notification_type}): {message}")
            logger.info(f"   Data: {data}")
            
            # Write to Firebase Realtime Database
            ref = db.reference('/')
            admin_notifications_ref = ref.child('admin-notifications').push()
            admin_notifications_ref.set({
                'type': notification_type,
                'message': message,
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'read': False
            })
            
            logger.info(f"✅ Successfully wrote admin notification to Firebase")
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting admin notification to Firebase: {str(e)}")
            return False

    def send_user_notification(self, user_id: int, notification_data: dict):
        """Send notification to specific user"""
        try:
            if not self.is_available():
                logger.warning("Firebase not available for user notification")
                return False

            logger.info(f"📬 User notification for user {user_id}")
            logger.info(f"   Data: {notification_data}")
            
            # Write to Firebase Realtime Database
            ref = db.reference('/')
            user_notifications_ref = ref.child('notifications').child(f'user_{user_id}').push()
            user_notifications_ref.set({
                **notification_data,
                'timestamp': datetime.now().isoformat(),
                'read': False
            })
            
            logger.info(f"✅ Successfully wrote user notification to Firebase")

            # ALSO: send FCM push to topic and device tokens
            try:
                title = notification_data.get('title', 'Booking Update')
                body = notification_data.get('message') or notification_data.get('body') or ''
                data_payload = notification_data.get('data', {}) or {}

                topic = f"user_{user_id}"
                message = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={k: str(v) for k, v in data_payload.items()},
                    topic=topic
                )
                resp = messaging.send(message)
                logger.info(f"✅ FCM message sent to topic {topic}: {resp}")

                try:
                    from ..models import DeviceToken
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
                            # Build notification payload for per-token sends
                            notif = messaging.Notification(title=title, body=body)
                            data_strings = {k: str(v) for k, v in data_payload.items()}

                            # Preferred: use send_multicast if available, otherwise try send_all, otherwise fall back to per-token sends
                            try:
                                if hasattr(messaging, 'send_multicast'):
                                    multicast = messaging.MulticastMessage(
                                        notification=notif,
                                        data=data_strings,
                                        tokens=fcm_tokens
                                    )
                                    res = messaging.send_multicast(multicast)
                                    logger.info(f"✅ FCM multicast sent to {len(fcm_tokens)} tokens: success={res.success_count} failure={res.failure_count}")
                                elif hasattr(messaging, 'send_all'):
                                    messages = [messaging.Message(notification=notif, data=data_strings, token=t) for t in fcm_tokens]
                                    res = messaging.send_all(messages)
                                    success = getattr(res, 'success_count', None)
                                    failure = getattr(res, 'failure_count', None)
                                    logger.info(f"✅ FCM send_all sent to {len(fcm_tokens)} tokens: success={success} failure={failure}")
                                else:
                                    success = 0
                                    failure = 0
                                    for t in fcm_tokens:
                                        try:
                                            m = messaging.Message(notification=notif, data=data_strings, token=t)
                                            messaging.send(m)
                                            success += 1
                                        except Exception:
                                            logger.exception(f"Failed sending FCM to token {t}")
                                            failure += 1
                                    logger.info(f"✅ FCM per-token send: attempted={len(fcm_tokens)} success={success} failure={failure}")
                            except Exception:
                                logger.exception("Failed sending FCM to saved device tokens (multicast/send_all/per-token)")

                        if expo_tokens:
                            try:
                                self._send_expo_pushes(expo_tokens, title, body, data_payload)
                            except Exception:
                                logger.exception("Failed sending Expo pushes to saved device tokens")
                except Exception:
                    logger.exception("Failed sending FCM to saved device tokens")
            except Exception:
                logger.exception("Failed to send user FCM push")

            return True
            
        except Exception as e:
            logger.error(f"Error sending user notification to Firebase: {str(e)}")
            return False

    def _send_expo_pushes(self, tokens: List[str], title: str, body: str, data: dict = None):
        """Send push notifications via Expo Push API for Expo-managed clients.
        Batches requests in groups of 100 as recommended by Expo.
        """
        if not tokens:
            return

        url = "https://exp.host/--/api/v2/push/send"
        headers = {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
        }

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

            try:
                resp = requests.post(url, json=messages, headers=headers, timeout=10)
                if resp.status_code != 200:
                    logger.warning(f"Expo push send returned status {resp.status_code}: {resp.text}")
                else:
                    logger.info(f"✅ Expo push batch sent: {len(messages)} messages")
            except Exception as e:
                logger.exception(f"Exception when sending Expo push batch: {str(e)}")

# Create singleton instance
firebase_service = FirebaseService()