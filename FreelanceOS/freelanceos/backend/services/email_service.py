import resend
import base64
from typing import List, Optional
from config import settings
import logging

logger = logging.getLogger(__name__)

# Configure Resend
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

def send_invoice_email(
    to_email: str,
    subject: str,
    invoice_number: str,
    pdf_content: bytes,
    client_name: str,
    amount: str,
    due_date: str
):
    """
    Sends an invoice email with a PDF attachment using Resend.
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Email not sent.")
        return False

    pdf_base64 = base64.b64encode(pdf_content).decode("utf-8")

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5;">New Invoice from FreelanceOS</h2>
        <p>Hi {client_name},</p>
        <p>A new invoice <strong>{invoice_number}</strong> has been generated for you.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount Due:</strong> {amount}</p>
            <p><strong>Due Date:</strong> {due_date}</p>
        </div>
        <p>Please find the detailed invoice PDF attached to this email.</p>
        <p>Thank you for your business!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Powered by FreelanceOS</p>
    </div>
    """

    try:
        params = {
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "attachments": [
                {
                    "content": pdf_base64,
                    "filename": f"Invoice-{invoice_number}.pdf",
                }
            ],
        }

        r = resend.Emails.send(params)
        logger.info(f"Email sent successfully: {r}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

def send_welcome_email(to_email: str, user_name: str):
    """
    Sends a welcome email to a newly registered user using Resend.
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Welcome email not sent.")
        return False

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Welcome to FreelanceOS!</h2>
        <p>Hi {user_name},</p>
        <p>Thank you for joining FreelanceOS! We're excited to help you manage your independent business more effectively.</p>
        <p>You can now start tracking projects, logging time, and generating professional invoices all in one place.</p>
        <div style="margin: 30px 0;">
            <a href="{settings.FRONTEND_URL}/dashboard" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p>If you have any questions, just reply to this email.</p>
        <p>Best regards,<br/>The FreelanceOS Team</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Powered by FreelanceOS</p>
    </div>
    """

    try:
        params = {
            "from": settings.DEFAULT_FROM_EMAIL,
            "to": [to_email],
            "subject": "Welcome to FreelanceOS!",
            "html": html_content,
        }

        r = resend.Emails.send(params)
        logger.info(f"Welcome email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return False
