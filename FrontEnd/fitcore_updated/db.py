from pymongo import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import quote_plus

_user     = quote_plus("watchnline_db_user")
_password = quote_plus("Team@rb@ak@akm")
_uri      = f"mongodb+srv://{_user}:{_password}@rakshitcluster.bms2ure.mongodb.net/?appName=RakshitCluster"

client = MongoClient(_uri, server_api=ServerApi('1'))
db     = client["fitcore"]

# ── Collections ───────────────────────────────────────────────────────────────
admin_users   = db["admin_users"]
trainer_users = db["trainer_users"]
member_users  = db["member_users"]

trainers   = db["trainers"]
schedule   = db["schedule"]
members    = db["members"]
bookings   = db["bookings"]
complaints = db["complaints"]
feedback   = db["feedback"]
revenue    = db["revenue"]

# ── Seed (runs once — skips if data already exists) ───────────────────────────
def seed():
    if not admin_users.find_one({"username": "admin"}):
        admin_users.insert_one({"username": "admin", "password": "admin123", "name": "Admin User", "id": "ADMIN"})

seed()
