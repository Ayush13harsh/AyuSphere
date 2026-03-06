from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

    async def connect(self):
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.db = self.client[settings.DB_NAME]
            # Create indexes
            await self.db.users.create_index("email", unique=True)
            await self.db.profiles.create_index("user_id")
            await self.db.contacts.create_index("user_id")
            await self.db.incidents.create_index("user_id")
            logger.info("Connected to MongoDB and created indexes")
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}")
            logger.info("Using MongoMock for local development without Docker")
            try:
                import mongomock_motor
                self.client = mongomock_motor.AsyncMongoMockClient()
                self.db = self.client[settings.DB_NAME]
                await self.db.users.create_index("email", unique=True)
                logger.info("Connected to MongoDB and created indexes")
            except ImportError:
                logger.error("Neither MongoDB nor mongomock available")

    async def disconnect(self):
        if self.client:
            self.client.close()

db = Database()
