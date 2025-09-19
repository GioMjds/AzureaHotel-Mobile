from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from .serializers import NotificationSerializer

@receiver(post_save, sender=Notification)
def send_notification(sender, instance, created, **args):
    if created:
        channel_layer = get_channel_layer()
        unread_count = Notification.objects.filter(user=instance.user, is_read=False).count()
        
        notification_data = NotificationSerializer(instance).data
        
        async_to_sync(channel_layer.group_send)(
            f"notifications_{instance.user.id}",
            {
                "type": "send_notification",
                "notification": notification_data,
                "unread_count": unread_count,
            }
        )