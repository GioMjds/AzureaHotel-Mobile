from django.core.mail import EmailMultiAlternatives
import random
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

def send_otp_to_email(email, message):
    try:
        otp = random.randint(100000, 999999)
        subject = f"Azurea Hotel OTP for Account Verification"
        
        email_from = os.getenv('EMAIL_HOST_USER')
        if not email_from:
            logger.error("EMAIL_HOST_USER environment variable is not set")
            return None
            
        logger.info(f"Attempting to send OTP email to {email} from {email_from}")
        
        otp_message = f"""
        <!DOCTYPE html>
        <html lang="en">
            <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Account Verification OTP</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
    </head>
    <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #ffffff; font-size: 14px;">
    <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff; background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
        <main>
        <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
            <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Your OTP for Account Verification</h1>
            <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Hey {email},</p>
            <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px;">
                Thank you for choosing Azurea Hotel Management. Use the following OTP to complete the procedure to change your email address. OTP is valid for 
                <span style="font-weight: 600; color: #1f1f1f;">2 minutes</span>. Do not share this code with others.
            </p>
            <p style="margin: 0; margin-top: 60px; font-size: 40px; font-weight: 600; letter-spacing: 25px; color: #ba3d4f;">{otp}</p>
            </div>
        </div>
        </main>
    </div>
    </body>
</html>
"""
        msg = EmailMultiAlternatives(subject, message, email_from, [email])
        msg.attach_alternative(otp_message, "text/html")
        msg.send()
        
        logger.info(f"OTP email sent successfully to {email}")
        return otp
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def send_reset_password(email):
    try:
        otp = random.randint(100000, 999999)
        subject = f"Azurea Hotel Reset Password"
        
        email_from = os.getenv('EMAIL_HOST_USER')
        if not email_from:
            logger.error("EMAIL_HOST_USER environment variable is not set for reset password")
            return None
            
        logger.info(f"Attempting to send reset password OTP to {email} from {email_from}")
        
        message = f"""
        <!DOCTYPE html>
        <html lang="en">
            <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Reset Password OTP</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
    </head>
    <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #ffffff; font-size: 14px;">
    <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f4f7ff; background-image: url(https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661497957196_595865/email-template-background-banner); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
        <main>
        <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center;">
            <div style="width: 100%; max-width: 489px; margin: 0 auto;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Your OTP for Reset Password</h1>
            <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Hey {email},</p>
            <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px;">
                Thank you for choosing Azurea Hotel Management. Use the following Reset Password OTP to complete the procedure to reset your password. The Reset Password OTP is valid for 
                <span style="font-weight: 600; color: #1f1f1f;">2 minutes</span>. Do not share this code with others.
            </p>
            <p style="margin: 0; margin-top: 60px; font-size: 40px; font-weight: 600; letter-spacing: 25px; color: #ba3d4f;">{otp}</p>
            </div>
        </div>
        </main>
    </div>
    </body>
</html>
"""
        msg = EmailMultiAlternatives(subject, message, email_from, [email])
        msg.attach_alternative(message, "text/html")
        msg.send()
        
        logger.info(f"Reset password OTP sent successfully to {email}")
        return otp
    except Exception as e:
        logger.error(f"Failed to send reset password email to {email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None
