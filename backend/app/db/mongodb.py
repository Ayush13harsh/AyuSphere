from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None
    _in_memory = False

    async def connect(self):
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
            self.client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
            self.db = self.client[settings.DB_NAME]
            # Test the connection quickly
            await self.client.server_info()
            logger.info("Connected to MongoDB successfully")
            
            # Move index creation to background to avoid blocking startup
            import asyncio
            asyncio.create_task(self.ensure_indexes())
            
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}")
            if settings.ALLOW_IN_MEMORY_DB:
                logger.info("Running with in-memory storage (data won't persist)")
                self._in_memory = True
                self.db = InMemoryDB()
            else:
                logger.error("CRITICAL: MongoDB unavailable and ALLOW_IN_MEMORY_DB is False. Failing fast to prevent data loss.")
                raise

    async def ensure_indexes(self):
        """Creates indexes in the background."""
        if self._in_memory:
            return
        try:
            logger.info("Ensuring database indexes...")
            await self.db.users.create_index("email", unique=True)
            await self.db.profiles.create_index("user_id")
            await self.db.contacts.create_index("user_id")
            await self.db.incidents.create_index("user_id")
            await self.db.users_otp.create_index("email")
            # TTL index for automatic cleanup of expired OTPs
            await self.db.users_otp.create_index("expires_at", expireAfterSeconds=0)
            logger.info("Database indexes ensured successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")

    async def disconnect(self):
        if self.client:
            self.client.close()


class InMemoryCollection:
    """Simple in-memory collection that mimics MongoDB operations."""
    def __init__(self):
        self._data = []
        self._counter = 0

    async def insert_one(self, doc):
        self._counter += 1
        doc["_id"] = ObjectId()
        self._data.append(doc.copy())
        class Result:
            inserted_id = doc["_id"]
        return Result()

    async def find_one(self, query=None):
        if not query:
            return self._data[0] if self._data else None
        for doc in self._data:
            if all(doc.get(k) == v for k, v in query.items()):
                return doc.copy()
        return None

    def find(self, query=None):
        return InMemoryCursor(self._data, query)

    async def update_one(self, query, update, upsert=False):
        doc = await self.find_one(query)
        if doc:
            idx = next(i for i, d in enumerate(self._data) if d.get("_id") == doc.get("_id"))
            if "$set" in update:
                self._data[idx].update(update["$set"])
            if "$push" in update:
                for k, v in update["$push"].items():
                    self._data[idx].setdefault(k, []).append(v)
        elif upsert:
            new_doc = {**query}
            if "$set" in update:
                new_doc.update(update["$set"])
            await self.insert_one(new_doc)
        matched = 1 if doc else 0
        class Result:
            modified_count = matched
            matched_count = matched
        return Result()

    async def delete_one(self, query):
        doc = await self.find_one(query)
        if doc:
            self._data = [d for d in self._data if d.get("_id") != doc.get("_id")]
        count = 1 if doc else 0
        class Result:
            deleted_count = count
        return Result()

    async def delete_many(self, query):
        before = len(self._data)
        if query:
            self._data = [
                d for d in self._data
                if not all(d.get(k) == v for k, v in query.items())
            ]
        else:
            self._data = []
        removed = before - len(self._data)
        class Result:
            deleted_count = removed
        return Result()

    async def create_index(self, *args, **kwargs):
        pass


class InMemoryCursor:
    def __init__(self, data, query=None):
        if query:
            self._data = [d for d in data if all(d.get(k) == v for k, v in query.items())]
        else:
            self._data = data[:]

    def sort(self, *args, **kwargs):
        return self

    async def to_list(self, length=None):
        return self._data[:length] if length else self._data


class InMemoryDB:
    """In-memory database with auto-creating collections."""
    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]


db = Database()
