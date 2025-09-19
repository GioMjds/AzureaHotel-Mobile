from django.core.management.base import BaseCommand
from booking.tasks import send_checkin_reminders

class Command(BaseCommand):
    help = 'Send check-in reminder notifications to guests with bookings for today'

    def handle(self, *args, **options):
        count = send_checkin_reminders()
        self.stdout.write(
            self.style.SUCCESS(f"Successfully sent {count} check-in reminder notifications")
        ) 