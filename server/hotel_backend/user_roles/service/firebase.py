import firebase_admin # type: ignore
from firebase_admin import credentials, auth as firebase_auth # type: ignore
from django.conf import settings
import os
from typing import Dict, Any, Optional

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
                # Check environment variables
                project_id = os.getenv('FIREBASE_PROJECT_ID')
                private_key = os.getenv('FIREBASE_PRIVATE_KEY')
                client_email = os.getenv('FIREBASE_CLIENT_EMAIL')
                database_url = os.getenv('FIREBASE_DATABASE_URL')
                
                # Production: Use environment variables
                if settings.DEBUG:
                    # Development: Use service account file
                    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
                    
                    if service_account_path and os.path.exists(service_account_path):
                        cred = credentials.Certificate(service_account_path)
                    else:
                        cred = credentials.Certificate({
                            "type": "service_account",
                            "project_id": project_id,
                            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                            "private_key": private_key.replace('\\n', '\n') if private_key else '',
                            "client_email": client_email,
                            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token",
                        })
                else:
                    # Production: Use environment variables only
                    cred = credentials.Certificate({
                        "type": "service_account",
                        "project_id": project_id,
                        "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                        "private_key": private_key.replace('\\n', '\n') if private_key else '',
                        "client_email": client_email,
                        "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                    })
                
                firebase_admin.initialize_app(cred, {
                    'databaseURL': database_url
                })
            except Exception as e:
                print(f"❌ Firebase initialization error: {e}")
                return
    
    def is_available(self) -> bool:
        """Check if Firebase is properly initialized"""
        return len(firebase_admin._apps) > 0
    
    # NEW: Create custom Firebase token for Django users
    def create_custom_token(self, user_id: str, additional_claims: Dict[str, Any] = None) -> Optional[str]:
        """
        Create a custom Firebase token for Django authenticated users
        This allows React Native to authenticate with Firebase using Django's auth
        """
        if not self.is_available():
            print("Firebase not available, cannot create custom token")
            return None
        
        try:
            uid = f"django_user_{user_id}"
            
            # Add custom claims
            claims = additional_claims or {}
            claims['django_user_id'] = int(user_id)
            claims['auth_source'] = 'django'
            
            # Create custom token
            custom_token = firebase_auth.create_custom_token(uid, claims)

            return custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token
        except Exception as e:
            print(f"Failed to create custom Firebase token for user {user_id}: {e}")
            return None
    
    # NEW: Verify custom token
    def verify_custom_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify a Firebase custom token"""
        if not self.is_available():
            return None
        
        try:
            decoded_token = firebase_auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            print(f"Failed to verify Firebase token: {e}")
            return None

firebase_service = FirebaseService()