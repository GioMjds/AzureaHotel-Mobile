"""
Background tasks for admin_dashboard app.
Uses django-background-tasks to offload slow operations like email sending.
"""
from background_task import background
from .email.booking import (
    send_booking_confirmation_email,
    send_booking_rejection_email,
    send_checkout_e_receipt
)
import logging

logger = logging.getLogger(__name__)


@background(schedule=0)  # Run immediately
def send_booking_confirmation_email_task(user_email: str, booking_data: dict):
    """
    Background task to send booking confirmation email.
    This prevents the API from timing out when sending emails.
    """
    try:
        logger.info(f"Sending booking confirmation email to {user_email}")
        result = send_booking_confirmation_email(user_email, booking_data)
        if result:
            logger.info(f"Successfully sent booking confirmation email to {user_email}")
        else:
            logger.warning(f"Failed to send booking confirmation email to {user_email}")
        return result
    except Exception as e:
        logger.error(f"Error sending booking confirmation email to {user_email}: {str(e)}")
        return False


@background(schedule=0)  # Run immediately
def send_booking_rejection_email_task(user_email: str, booking_data: dict):
    """
    Background task to send booking rejection email.
    This prevents the API from timing out when sending emails.
    """
    try:
        logger.info(f"Sending booking rejection email to {user_email}")
        result = send_booking_rejection_email(user_email, booking_data)
        if result:
            logger.info(f"Successfully sent booking rejection email to {user_email}")
        else:
            logger.warning(f"Failed to send booking rejection email to {user_email}")
        return result
    except Exception as e:
        logger.error(f"Error sending booking rejection email to {user_email}: {str(e)}")
        return False


@background(schedule=0)  # Run immediately
def send_checkout_e_receipt_task(user_email: str, booking_data: dict):
    """
    Background task to send checkout e-receipt email.
    This prevents the API from timing out when sending emails.
    """
    try:
        logger.info(f"Sending checkout e-receipt to {user_email}")
        result = send_checkout_e_receipt(user_email, booking_data)
        if result:
            logger.info(f"Successfully sent checkout e-receipt to {user_email}")
        else:
            logger.warning(f"Failed to send checkout e-receipt to {user_email}")
        return result
    except Exception as e:
        logger.error(f"Error sending checkout e-receipt to {user_email}: {str(e)}")
        return False
