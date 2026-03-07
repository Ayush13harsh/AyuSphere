import smtplib
from email.message import EmailMessage
from app.core.config import settings

def send_otp_email(to_email: str, otp: str, purpose: str = "signup"):
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print(f"Skipping email send for {to_email}. SMTP not configured.")
        return False
        
    msg = EmailMessage()
    
    if purpose == "signup":
        msg['Subject'] = 'AyuSphere - Verification Code'
        msg.set_content(f"""
Hello,

Your verification code for AyuSphere registration is: {otp}

This code is valid for 10 minutes. Please do not share this code with anyone.

Thanks,
The AyuSphere Team
        """)
    elif purpose == "reset_password":
        msg['Subject'] = 'AyuSphere - Reset Password Code'
        msg.set_content(f"""
Hello,

You requested to reset your password. Your verification code is: {otp}

This code is valid for 10 minutes. If you did not request this, please ignore this email.

Thanks,
The AyuSphere Team
        """)
        
    msg['From'] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    msg['To'] = to_email

    try:
        # Add a timeout so the server doesn't hang indefinitely. Default is no timeout.
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=5) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return False
