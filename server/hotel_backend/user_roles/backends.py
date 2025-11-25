from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.hashers import check_password

class MultiDBAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        User = get_user_model()
        # Try Django user (default DB) by username or email
        try:
            user = User.objects.using('default').get(username=username)
        except User.DoesNotExist:
            try:
                user = User.objects.using('default').get(email=username)
            except User.DoesNotExist:
                user = None
        if user and user.check_password(password):
            return user