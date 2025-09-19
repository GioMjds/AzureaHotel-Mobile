from rest_framework import serializers
from user_roles.models import CustomUsers

class AdminDetailSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUsers
        fields = '__all__'
    
    def get_profile_image(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return ""