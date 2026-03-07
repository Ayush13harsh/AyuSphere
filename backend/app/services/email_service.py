import httpx
from app.core.config import settings

def send_otp_email(to_email: str, otp: str, purpose: str = "signup"):
    if not settings.BREVO_API_KEY:
        print(f"Skipping email send for {to_email}. BREVO_API_KEY not configured.")
        return False
        
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    sender_email = settings.SMTP_FROM_EMAIL or "noreply@ayusphere.com"
    sender_name = "AyuSphere Security"
    
    if purpose == "signup":
        subject = "AyuSphere - Verification Code"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to AyuSphere!</h2>
            <p>Your verification code for registration is: <strong><span style="font-size: 24px; color: #ef4444;">{otp}</span></strong></p>
            <p>This code is valid for 10 minutes. Please do not share this code with anyone.</p>
            <p>Thanks,<br>The AyuSphere Team</p>
        </div>
        """
    elif purpose == "reset_password":
        subject = "AyuSphere - Reset Password Code"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Your verification code is: <strong><span style="font-size: 24px; color: #ef4444;">{otp}</span></strong></p>
            <p>This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            <p>Thanks,<br>The AyuSphere Team</p>
        </div>
        """
        
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        # Use a synchronous HTTP client since this function is synchronous
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            print(f"Email successfully sent to {to_email} via Brevo HTTP API.")
            return True
    except Exception as e:
        print(f"Failed to send email to {to_email} using Brevo: {str(e)}")
        if isinstance(e, httpx.HTTPStatusError):
            print(f"Response: {e.response.text}")
        return False
