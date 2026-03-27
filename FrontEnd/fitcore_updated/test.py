
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from urllib.parse import quote_plus

user= quote_plus("watchnline_db_user")
password = quote_plus("Team@rb@ak@akm")

uri = f"mongodb+srv://{user}:{password}@rakshitcluster.bms2ure.mongodb.net/?appName=RakshitCluster"

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)
