import random
import os
import logging
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

load_dotenv()
logger = logging.getLogger(__name__)


def get_otp_html_template(email, otp, title, description):
    """Generate HTML template for OTP emails"""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
</head>
<body style="margin: 0; font-family: 'Poppins', sans-serif; background: #ffffff; font-size: 14px;">
    <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff; background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
        <header style="text-align: center; padding-bottom: 20px;">
            <h2 style="color: #6F00FF; margin: 0;">Azurea Hotel</h2>
        </header>
        <main>
            <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">{title}</h1>
                    <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Hey {email},</p>
                    <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px;">
                        {description}
                        <span style="font-weight: 600; color: #1f1f1f;">2 minutes</span>. Do not share this code with others.
                    </p>
                    <p style="margin: 0; margin-top: 60px; font-size: 40px; font-weight: 600; letter-spacing: 25px; color: #6F00FF;">{otp}</p>
                </div>
            </div>
        </main>
        <footer style="text-align: center; margin-top: 30px; color: #888;">
            <p style="margin: 0;">© 2025 Azurea Hotel Management. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
"""


def send_email_via_sendgrid(to_email, subject, text_content, html_content):
    """Send email using SendGrid HTTP API (works on Render)"""
    try:
        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        from_email = os.getenv('SENDGRID_FROM_EMAIL', os.getenv('EMAIL_HOST_USER'))
        
        if not sendgrid_api_key:
            logger.warning("SENDGRID_API_KEY not set, falling back to Django SMTP")
            return None
            
        message = Mail(
            from_email=Email(from_email, "Azurea Hotel"),
            to_emails=To(to_email),
            subject=subject,
            plain_text_content=Content("text/plain", text_content),
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent successfully via SendGrid to {to_email}")
            return True
        else:
            logger.error(f"SendGrid returned status {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"SendGrid error: {str(e)}")
        return None


def send_email_via_django_smtp(to_email, subject, text_content, html_content):
    """Fallback: Send email using Django SMTP (for local development)"""
    try:
        from django.core.mail import EmailMultiAlternatives
        
        email_from = os.getenv('EMAIL_HOST_USER')
        if not email_from:
            logger.error("EMAIL_HOST_USER not set")
            return None
            
        msg = EmailMultiAlternatives(subject, text_content, email_from, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        
        logger.info(f"Email sent successfully via SMTP to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"SMTP error: {str(e)}")
        return None


def send_email(to_email, subject, text_content, html_content):
    """Send email - tries SendGrid first, falls back to SMTP"""
    # Try SendGrid first (works on Render)
    result = send_email_via_sendgrid(to_email, subject, text_content, html_content)
    
    if result:
        return True
    
    # Fallback to Django SMTP (for local development)
    logger.info("Falling back to Django SMTP...")
    return send_email_via_django_smtp(to_email, subject, text_content, html_content)


def send_otp_to_email(email, message):
    """Send OTP for account verification"""
    try:
        otp = random.randint(100000, 999999)
        
        logger.info(f"Attempting to send OTP email to {email}")
        
        subject = "Azurea Hotel - Account Verification OTP"
        text_content = f"Your OTP for account verification is: {otp}. Valid for 2 minutes."
        
        html_content = get_otp_html_template(
            email=email,
            otp=otp,
            title="Your OTP for Account Verification",
            description="Thank you for choosing Azurea Hotel Management. Use the following OTP to complete your account verification. OTP is valid for "
        )
        
        result = send_email(email, subject, text_content, html_content)
        
        if result:
            logger.info(f"OTP email sent successfully to {email}")
            return otp
        else:
            logger.error(f"Failed to send OTP email to {email}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def send_reset_password(email):
    """Send OTP for password reset"""
    try:
        otp = random.randint(100000, 999999)
        
        logger.info(f"Attempting to send reset password OTP to {email}")
        
        subject = "Azurea Hotel - Password Reset OTP"
        text_content = f"Your OTP for password reset is: {otp}. Valid for 2 minutes."
        
        html_content = get_otp_html_template(
            email=email,
            otp=otp,
            title="Your OTP for Password Reset",
            description="Thank you for choosing Azurea Hotel Management. Use the following OTP to reset your password. OTP is valid for "
        )
        
        result = send_email(email, subject, text_content, html_content)
        
        if result:
            logger.info(f"Reset password OTP sent successfully to {email}")
            return otp
        else:
            logger.error(f"Failed to send reset password OTP to {email}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to send reset password email to {email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None
