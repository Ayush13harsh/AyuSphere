from app.core.config import settings
from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)

class SMSService:
    def __init__(self):
        self.client = None
        self.from_phone = settings.TWILIO_PHONE_NUMBER
        
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
        else:
            logger.warning("Twilio credentials not found. SMS will be simulated.")

    async def send_emergency_alert(self, to_phone: str, user_name: str, maps_link: str, timestamp: str) -> bool:
        message_body = (
            "\U0001f6a8 EMERGENCY ALERT \U0001f6a8\n"
            f"{user_name} needs immediate help.\n"
            f"Live location: {maps_link}\n"
            f"Time: {timestamp}"
        )
        
        if not self.client:
            logger.info(f"\n[SIMULATED SMS DISPATCHED]\nTo: {to_phone}\nMessage:\n{message_body}\n")
            return True
            
        try:
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_phone,
                to=to_phone
            )
            logger.info(f"SMS Alert sent to {to_phone}. SID: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {e}")
            return False

sms_service = SMSService()
