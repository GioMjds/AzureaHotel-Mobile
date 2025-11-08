import socket
import re
import os

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def update_env_file(env_path, replacements):
    if not os.path.exists(env_path):
        print(f"❌ File {env_path} does not exist.")
        return
    
    with open(env_path, 'r') as file:
        lines = file.readlines()
    
    with open(env_path, 'w') as file:
        for line in lines:
            written = False
            for key, value in replacements.items():
                if re.match(rf'^{re.escape(key)}=', line):
                    file.write(f'{key}={value}\n')
                    written = True
                    break
            if not written:
                file.write(line)

def setup_local_development():
    """Configure for local network development"""
    ip = get_local_ip()
    
    # Update server/.env
    server_env = os.path.join(os.path.dirname(__file__), 'server', '.env')
    server_replacements = {
        'CLIENT_URL': f'exp://{ip}:8081',
        'REDIRECT_URI': f'http://{ip}:5173',
        'DB_HOST': ip,
    }
    update_env_file(server_env, server_replacements)
    print(f"✅ Updated {server_env} with local IP: {ip}")

    # Update mobile/.env
    mobile_env = os.path.join(os.path.dirname(__file__), 'mobile', '.env')
    mobile_replacements = {
        'EXPO_PUBLIC_API_URL': f"exp://{ip}:8081",
        'EXPO_PUBLIC_DJANGO_URL': f"http://{ip}:8000",
    }
    update_env_file(mobile_env, mobile_replacements)
    print(f"✅ Updated {mobile_env} with local IP: {ip}")

def setup_render_deployment():
    """Configure mobile app to connect to Render backend"""
    print("\n🚀 Render Deployment Configuration")
    print("=" * 50)
    
    render_url = input("\nEnter your Render backend URL (e.g., https://azurea-hotel.onrender.com): ").strip()
    
    if not render_url:
        print("❌ URL cannot be empty")
        return
    
    # Ensure HTTPS
    if not render_url.startswith('https://'):
        if render_url.startswith('http://'):
            render_url = render_url.replace('http://', 'https://')
        else:
            render_url = f'https://{render_url}'
    
    # Remove trailing slash
    render_url = render_url.rstrip('/')
    
    # Update mobile/.env for production backend
    mobile_env = os.path.join(os.path.dirname(__file__), 'mobile', '.env')
    mobile_replacements = {
        'EXPO_PUBLIC_DJANGO_URL': render_url,
        # Keep API_URL for local Expo dev server
        # 'EXPO_PUBLIC_API_URL': stays as local exp://
    }
    update_env_file(mobile_env, mobile_replacements)
    
    print(f"\n✅ Mobile app configured to use Render backend: {render_url}")
    print("\n📋 Next Steps for Render Deployment:")
    print("1. Create a new Web Service on Render.com")
    print("2. Connect your GitHub repository")
    print("3. Configure the following settings:")
    print(f"   - Root Directory: server/hotel_backend")
    print(f"   - Build Command: pip install -r ../requirements.txt")
    print(f"   - Start Command: daphne -b 0.0.0.0 -p $PORT hotel_backend.asgi:application")
    print("4. Add Environment Variables (from server/.env):")
    print("   - All Django settings (SECRET_KEY, DEBUG=False, etc.)")
    print("   - Database credentials (use Render PostgreSQL or external MySQL)")
    print("   - Firebase credentials")
    print("   - PayMongo credentials")
    print("   - Google OAuth credentials")
    print(f"   - CLIENT_URL={render_url}")
    print(f"   - PAYMONGO_WEBHOOK_ENDPOINT_URL={render_url}/booking/paymongo/webhook")
    print("   - ALLOWED_HOSTS=.onrender.com")
    print("5. Deploy and wait for build to complete")
    print(f"6. Update PayMongo webhook URL to: {render_url}/booking/paymongo/webhook")
    print("\n🔧 After deployment, rebuild your APK:")
    print("   cd mobile && eas build --platform android --profile preview")

def setup_ngrok_tunnel():
    """Configure for ngrok tunneling (quick remote testing)"""
    print("\n🌐 ngrok Tunnel Configuration")
    print("=" * 50)
    
    ngrok_url = input("\nEnter ngrok HTTPS URL (e.g., https://abc123.ngrok-free.app): ").strip()
    
    if not ngrok_url:
        print("❌ URL cannot be empty")
        return
    
    if not ngrok_url.startswith('https://'):
        print("❌ ngrok URL must use HTTPS")
        return
    
    # Remove trailing slash
    ngrok_url = ngrok_url.rstrip('/')
    
    # Update mobile .env
    mobile_env = os.path.join(os.path.dirname(__file__), 'mobile', '.env')
    mobile_replacements = {
        'EXPO_PUBLIC_DJANGO_URL': ngrok_url,
    }
    update_env_file(mobile_env, mobile_replacements)
    
    # Update server .env
    server_env = os.path.join(os.path.dirname(__file__), 'server', '.env')
    server_replacements = {
        'CLIENT_URL': ngrok_url,
        'PAYMONGO_WEBHOOK_ENDPOINT_URL': f'{ngrok_url}/booking/paymongo/webhook',
    }
    update_env_file(server_env, server_replacements)
    
    print(f"\n✅ Configured for ngrok: {ngrok_url}")
    print("\n📋 Remember:")
    print("1. Keep ngrok running: ngrok http 8000")
    print("2. Keep Django running: python manage.py runserver 0.0.0.0:8000")
    print("3. Update PayMongo webhook to the ngrok URL")
    print("4. Rebuild APK: cd mobile && eas build --platform android --profile development")
    print("\n⚠️ Note: Free ngrok URLs change on restart!")

def main():
    print("\n" + "=" * 50)
    print("🏨 Azurea Hotel - Environment Configuration")
    print("=" * 50)
    print("\nSelect configuration mode:")
    print("1. Local Development (same network)")
    print("2. Render Cloud Deployment (production)")
    print("3. ngrok Tunnel (quick remote testing)")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == '1':
        setup_local_development()
    elif choice == '2':
        setup_render_deployment()
    elif choice == '3':
        setup_ngrok_tunnel()
    elif choice == '4':
        print("\n👋 Exiting...")
        return
    else:
        print("\n❌ Invalid choice. Please run again.")
        return
    
    print("\n" + "=" * 50)
    print("✨ Configuration complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()