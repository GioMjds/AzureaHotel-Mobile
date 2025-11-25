from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Notification
import json
import logging
import traceback

logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.group_name = None

    async def connect(self):
        try:
            await self.accept()
            if self.scope["user"] and self.scope["user"].is_authenticated:
                self.user = self.scope["user"]
                await self.setup_group()
        except Exception:
            await self.close()

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'authenticate':
            user_id = data.get('userId')
            await self.authenticate_user(user_id)
        elif message_type == 'mark_read' and self.user:
            count = await self.mark_notifications_read()
            await self.send(text_data=json.dumps({
                'type': 'unread_update',
                'count': count
            }))
        elif message_type == 'heartbeat':
            await self.send(text_data=json.dumps({'type': 'heartbeat_ack'}))

    async def authenticate_user(self, user_id):
        try:
            if not user_id:
                await self.send_auth_response(False, "No user ID provided")
                return
                
            self.user = await self.get_user(user_id)
            if self.user and self.user.is_authenticated:
                await self.setup_group()
                await self.send_auth_response(True)
            else:
                await self.send_auth_response(False, "Authentication failed")
                await self.close()
        except Exception as e:
            await self.send_auth_response(False, str(e))
            await self.close()

    async def setup_group(self):
        try:
            self.group_name = f'notifications_{self.user.id}'
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.send_initial_count()
        except Exception:
            await self.close()

    async def send_auth_response(self, success: bool, message: str = ""):
        await self.send(text_data=json.dumps({
            'type': 'auth_response',
            'success': success,
            'message': message
        }))

    async def send_initial_count(self):
        try:
            count = await self.get_unread_count()
            await self.send(text_data=json.dumps({
                'type': 'initial_count',
                'count': count
            }))
        except Exception as e:
            pass

    async def disconnect(self, close_code):
        try:
            if self.group_name:
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name
                )
        except Exception as e:
            pass

    async def send_notification(self, event):
        try:
            await self.send(text_data=json.dumps({
                'type': 'new_notification',
                'notification': event['notification'],
                'unread_count': event['unread_count']
            }))
        except Exception as e:
            pass

    async def update_unread_count(self, event):
        try:
            await self.send(text_data=json.dumps({
                'type': 'unread_update',
                'count': event['count']
            }))
        except Exception as e:
            pass

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return get_user_model().objects.get(id=user_id)
        except get_user_model().DoesNotExist:
            return None

    @database_sync_to_async
    def get_unread_count(self):
        return Notification.objects.filter(user=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_notifications_read(self):
        Notification.objects.filter(user=self.user, is_read=False).update(is_read=True)
        return 0