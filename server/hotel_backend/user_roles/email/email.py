import random
import os
import logging
from django.core.mail import EmailMultiAlternatives
from dotenv import load_dotenv

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


def send_otp_to_email(email, message):
    """Send OTP for account verification using Gmail SMTP"""
    try:
        otp = random.randint(100000, 999999)
        
        email_from = os.getenv('EMAIL_HOST_USER')
        if not email_from:
            logger.error("EMAIL_HOST_USER environment variable is not set")
            return None
            
        logger.info(f"Attempting to send OTP email to {email} via Gmail SMTP")
        
        subject = "Azurea Hotel - Account Verification OTP"
        text_content = f"Your OTP for account verification is: {otp}. Valid for 2 minutes."
        
        html_content = get_otp_html_template(
            email=email,
            otp=otp,
            title="Your OTP for Account Verification",
            description="Thank you for choosing Azurea Hotel Management. Use the following OTP to complete your account verification. OTP is valid for "
        )
        
        msg = EmailMultiAlternatives(subject, text_content, email_from, [email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        
        logger.info(f"OTP email sent successfully to {email}")
        return otp
            
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def send_reset_password(email):
    """Send OTP for password reset using Gmail SMTP"""
    try:
        otp = random.randint(100000, 999999)
        
        email_from = os.getenv('EMAIL_HOST_USER')
        if not email_from:
            logger.error("EMAIL_HOST_USER environment variable is not set")
            return None
            
        logger.info(f"Attempting to send reset password OTP to {email} via Gmail SMTP")
        
        subject = "Azurea Hotel - Password Reset OTP"
        text_content = f"Your OTP for password reset is: {otp}. Valid for 2 minutes."
        
        html_content = get_otp_html_template(
            email=email,
            otp=otp,
            title="Your OTP for Password Reset",
            description="Thank you for choosing Azurea Hotel Management. Use the following OTP to reset your password. OTP is valid for "
        )
        
        msg = EmailMultiAlternatives(subject, text_content, email_from, [email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        
        logger.info(f"Reset password OTP sent successfully to {email}")
        return otp
            
    except Exception as e:
        logger.error(f"Failed to send reset password email to {email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None
