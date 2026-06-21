"""
=============================================================================
BACKEND UTILITIES & HELPERS FILE (helpers.py)
-----------------------------------------------------------------------------
Purpose:
This file contains reusable "helper" functions that perform specific tasks. 
Tasks include talking to the database (MongoDB or JSON), saving patient 
data, looking up user roles, and sending emails.

Pages that use this:
- Login Page (Uses the `load_users` and `send_otp_email` functions)
- Predict Page (Uses `save_patients` to save a new result)
- Patients/Dashboard Page (Uses `load_patients` to display historical data)
=============================================================================
"""

import json
import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import pymongo

# Import the configuration variables we defined in config.py
from config import (
    PATIENTS_FILE, USERS_FILE, MODEL_FILE, SCALER_FILE,
    DEFAULT_USERS, SMTP_CONFIG, MONGODB_URI, MONGODB_DB
)

# -----------------------------------------------------------------------------
# DATABASE CONNECTION SETUP (MONGODB)
# -----------------------------------------------------------------------------
# What this does: Tries to connect to a MongoDB cloud database. If it fails, 
# it falls back to using local JSON files (users.json and patients.json).
try:
    mongo_client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
    db = mongo_client[MONGODB_DB]
    users_col = db["users"]
    patients_col = db["patients"]
    
    # Send a quick 'ping' to verify the database is actually reachable
    mongo_client.admin.command('ping')
    use_mongodb = True
    print("Successfully connected to MongoDB [OK].")
except Exception as e:
    # If the ping fails (e.g., no internet or wrong URI), we use local JSON files.
    print(f"MongoDB connection error [ERROR]: {e}. Falling back to local JSON database.")
    use_mongodb = False
    db = None
    users_col = None
    patients_col = None


# =============================================================================
# USER MANAGEMENT FUNCTIONS (Used on Login and Admin pages)
# =============================================================================

def load_users() -> dict:
    """
    -------------------------------------------------------------------------
    Function: load_users
    Purpose: Grabs the list of all registered users from the database.
    Where it works: Used when someone tries to login or when the Admin page loads.
    -------------------------------------------------------------------------
    """
    # If we are NOT using MongoDB, read from the local "users.json" file
    if not use_mongodb:
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE, "r") as f:
                try:
                    return json.load(f)
                except Exception:
                    pass
        # If the file doesn't exist, create it using the default users
        save_users(DEFAULT_USERS)
        return dict(DEFAULT_USERS)

    # If we ARE using MongoDB, fetch from the cloud collection
    try:
        count = users_col.count_documents({})
        if count == 0:
            # Seed default users if the MongoDB collection is empty
            for username, details in DEFAULT_USERS.items():
                doc = {"username": username, **details}
                users_col.insert_one(doc)
        
        users = {}
        for doc in users_col.find({}):
            uname = doc["username"]
            # Exclude MongoDB specific '_id' from our data
            details = {k: v for k, v in doc.items() if k not in ("_id", "username")}
            users[uname] = details
        return users
    except Exception as e:
        print(f"Error loading users from MongoDB [ERROR]: {e}")
        return {}


def save_users(users: dict):
    """
    -------------------------------------------------------------------------
    Function: save_users
    Purpose: Saves updated user information back into the database.
    Where it works: Used when a new user Registers, or when an Admin edits/deletes a user.
    -------------------------------------------------------------------------
    """
    # Fallback to saving in local "users.json" file
    if not use_mongodb:
        try:
            with open(USERS_FILE, "w") as f:
                json.dump(users, f, indent=2)
        except Exception as e:
            print(f"Error saving users to local JSON [ERROR]: {e}")
        return

    # Save to MongoDB cloud
    try:
        # Loop through our user list and update or insert them into the cloud database
        for username, details in users.items():
            users_col.replace_one(
                {"username": username},
                {"username": username, **details},
                upsert=True
            )
        # Delete any users from the cloud database that are no longer in our list
        existing_usernames = set(users.keys())
        users_col.delete_many({"username": {"$nin": list(existing_usernames)}})
    except Exception as e:
        print(f"Error saving users to MongoDB [ERROR]: {e}")


def is_admin_user(username: str) -> bool:
    """
    -------------------------------------------------------------------------
    Function: is_admin_user
    Purpose: Checks if a specific username has 'admin' privileges.
    Where it works: Used to protect the Admin page from unauthorized access.
    -------------------------------------------------------------------------
    """
    users = load_users()
    return users.get(username, {}).get("role") == "admin"


# =============================================================================
# PATIENT RECORD FUNCTIONS (Used on Predict, Dashboard, and Patients pages)
# =============================================================================

def load_patients() -> list:
    """
    -------------------------------------------------------------------------
    Function: load_patients
    Purpose: Retrieves all saved patient predictions and clinical data.
    Where it works: Used to show the history table on the Patients and Dashboard pages.
    -------------------------------------------------------------------------
    """
    # Fallback to local "patients.json" file
    if not use_mongodb:
        if os.path.exists(PATIENTS_FILE):
            with open(PATIENTS_FILE, "r") as f:
                try:
                    return json.load(f)
                except Exception:
                    pass
        return []

    # Fetch records from MongoDB cloud
    try:
        patients = []
        for doc in patients_col.find({}):
            # Remove the internal '_id' field MongoDB adds automatically
            patient = {k: v for k, v in doc.items() if k != "_id"}
            patients.append(patient)
        return patients
    except Exception as e:
        print(f"Error loading patients from MongoDB [ERROR]: {e}")
        return []


def save_patients(patients: list):
    """
    -------------------------------------------------------------------------
    Function: save_patients
    Purpose: Saves a new patient record or an updated list of records.
    Where it works: Used on the Predict page after a successful ML prediction.
    -------------------------------------------------------------------------
    """
    # Fallback to local "patients.json"
    if not use_mongodb:
        try:
            with open(PATIENTS_FILE, "w") as f:
                json.dump(patients, f, indent=2)
        except Exception as e:
            print(f"Error saving patients to local JSON [ERROR]: {e}")
        return

    # Save to MongoDB
    try:
        # Clear the old list entirely and save the brand new one to prevent duplicates
        patients_col.delete_many({})
        if patients:
            patients_col.insert_many(patients)
    except Exception as e:
        print(f"Error saving patients to MongoDB [ERROR]: {e}")


# =============================================================================
# EMAIL & SECURITY FUNCTIONS (Used on Login page)
# =============================================================================

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    -------------------------------------------------------------------------
    Function: send_otp_email
    Purpose: Sends an email containing a 6-digit One Time Password (OTP).
    Where it works: Triggered on the Login page when a user clicks "Forgot Password".
    -------------------------------------------------------------------------
    """
    # Get the credentials we stored in config.py
    sender = SMTP_CONFIG["sender_email"]
    app_pw = SMTP_CONFIG["sender_password"]
    
    # If no email is configured, we can't send anything
    if not sender or not app_pw:
        return False
        
    try:
        # Construct the email structure
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "HEART-IQ – Your Password Reset OTP"
        msg["From"]    = sender
        msg["To"]      = to_email
        
        # This is the HTML styling that makes the email look beautiful and branded
        html = f"""
        <div style='font-family:Inter,sans-serif;max-width:480px;margin:auto;
                    background:#0f0c29;border-radius:16px;padding:2rem;'>
            <h2 style='color:#f953c6;margin-bottom:0.5rem;'>❤️ HEART-IQ</h2>
            <p style='color:#ccc;'>Your one-time password reset code is:</p>
            <div style='font-size:2.5rem;font-weight:800;letter-spacing:0.3em;
                        color:white;background:rgba(255,255,255,0.08);
                        border-radius:12px;padding:1rem;text-align:center;
                        margin:1rem 0;'>{otp}</div>
            <p style='color:#aaa;font-size:0.85rem;'>This OTP expires in <b>5 minutes</b>.
            If you did not request this, ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))
        
        # Connect to the Gmail server securely and send the email
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_CONFIG["smtp_host"], SMTP_CONFIG["smtp_port"], context=ctx, timeout=5) as s:
            s.login(sender, app_pw)
            s.sendmail(sender, to_email, msg.as_string())
        return True
    except Exception:
        return False
