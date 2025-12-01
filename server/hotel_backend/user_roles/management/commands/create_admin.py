"""
Management command to create a default admin user from environment variables.
Run with: python manage.py create_admin

This command is idempotent - it will only create the admin if it doesn't exist,
or update the password if the admin already exists.
"""

import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from dotenv import load_dotenv

load_dotenv()

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a default admin user from ADMIN_EMAIL and ADMIN_PASS environment variables'

    def handle(self, *args, **options):
        admin_email = os.getenv('ADMIN_EMAIL')
        admin_password = os.getenv('ADMIN_PASS')
        admin_name = os.getenv('ADMIN_USER_NAME', 'Admin User')

        if not admin_email or not admin_password:
            self.stdout.write(
                self.style.ERROR(
                    'ADMIN_EMAIL and ADMIN_PASS environment variables are required'
                )
            )
            return

        # Parse admin name
        name_parts = admin_name.strip('"').split(' ', 1)
        first_name = name_parts[0] if name_parts else 'Admin'
        last_name = name_parts[1] if len(name_parts) > 1 else 'User'

        try:
            user, created = User.objects.get_or_create(
                email=admin_email,
                defaults={
                    'username': admin_email.split('@')[0],
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'admin',
                    'is_staff': True,
                    'is_superuser': True,
                    'is_verified': True,
                }
            )

            if created:
                user.set_password(admin_password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created admin user: {admin_email}')
                )
            else:
                # Update password and ensure admin role
                user.set_password(admin_password)
                user.role = 'admin'
                user.is_staff = True
                user.is_superuser = True
                user.is_verified = True
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Admin user already exists, updated password: {admin_email}')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to create admin user: {str(e)}')
            )
