import requests
import json
import os

def google_auth(code, CLIENT_ID, CLIENT_SECRET):
    try:
        token_url = os.getenv('GOOGLE_TOKEN_URL')
        
        # For React Native Google Sign-In, we need to exchange the serverAuthCode
        # The redirect_uri should be empty or not included for mobile flows
        token_data = {
            'code': code,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'grant_type': 'authorization_code',
        }

        token_response = requests.post(token_url, data=token_data)

        if token_response.status_code != 200:
            raise Exception(f"Failed to fetch token: {token_response.status_code} - {token_response.text}")

        token_info = token_response.json()
        access_token = token_info.get('access_token')
        
        if not access_token:
            raise Exception("No access token in response")

        userinfo_url = os.getenv('GOOGLE_USERINFO_URL')
        headers = {'Authorization': f'Bearer {access_token}'}

        userinfo_response = requests.get(userinfo_url, headers=headers)

        if userinfo_response.status_code != 200:
            raise Exception(f"Failed to fetch user info: {userinfo_response.status_code}")

        user_info = userinfo_response.json()
        
        email = user_info.get('email')
        username = user_info.get('name', user_info.get('email', 'Google User'))
        profile_image = user_info.get('picture')
        
        if not email:
            raise Exception("Missing email in user info")
        
        return email, username, profile_image
    except Exception:
        return None
