from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI, DB_NAME

client = AsyncIOMotorClient(MONGO_URI)
database = client[DB_NAME]

# Core Collections in iiti_db
users_collection = database["users"]
students_collection = database["students"]
schedules_collection = database["schedules"]
grades_collection = database["grades"]
curriculums_collection = database["curriculums"]
advising_collection = database["advisingrecords"]
notifications_collection = database["notifications"]
records_requests_collection = database["records_requests"]

# Announcements Collection (also in iiti_db)
announcements_collection = database["announcements"]