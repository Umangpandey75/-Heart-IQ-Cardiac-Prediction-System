"""
=============================================================================
BACKEND CONFIGURATION FILE (config.py)
-----------------------------------------------------------------------------
Purpose:
This file acts as the central brain for all settings and configurations in the 
HeartIQ backend. It loads environment variables (like passwords or API keys) 
and sets up the paths to important files (like the database or the machine 
learning model). 

Pages that use this:
This file is used "behind the scenes" by almost every backend function, 
meaning it indirectly powers the Login, Dashboard, and Prediction pages.
=============================================================================
"""

import os
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# DIRECTORY PATHS CONFIGURATION
# -----------------------------------------------------------------------------
# What this does: Finds the exact folder where the project lives on the computer.
# Why it's needed: So we can accurately locate our databases and AI models.
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load the secret variables from the ".env" file (e.g. Email Passwords, API keys)
load_dotenv(os.path.join(ROOT_DIR, '.env'))

# Define exactly where our JSON databases and AI models are stored
PATIENTS_FILE = os.path.join(ROOT_DIR, "data",   "patients.json")
USERS_FILE    = os.path.join(ROOT_DIR, "data",   "users.json")
MODEL_FILE    = os.path.join(ROOT_DIR, "model",  "best_heart_disease_model.pkl")
SCALER_FILE   = os.path.join(ROOT_DIR, "model",  "scaler.pkl")
LOGO_FILE     = os.path.join(ROOT_DIR, "assets", "heart_logo.png")

# -----------------------------------------------------------------------------
# DEFAULT SEED USERS
# -----------------------------------------------------------------------------
# What this does: These are the default accounts created when the app runs for the first time.
# Where it works: The Admin, Doctor, and User roles affect what you see on the Dashboard and Patients pages.
DEFAULT_USERS = {
    "admin":  {"password": "admin123",  "email": "admin@example.com",  "role": "admin",  "joined": "2024-01-01"},
    "doctor": {"password": "heart2024", "email": "doctor@example.com", "role": "doctor", "joined": "2024-01-01"},
    "demo":   {"password": "demo",      "email": "demo@example.com",   "role": "user",   "joined": "2024-01-01"},
}

# -----------------------------------------------------------------------------
# EMAIL (SMTP) SETTINGS FOR PASSWORD RECOVERY
# -----------------------------------------------------------------------------
# What this does: Sets up the email server to send One-Time Passwords (OTPs).
# Where it works: This is used exclusively on the "Forgot Password" section of the Login Page.
SMTP_CONFIG = {
    "sender_email":    os.getenv("SMTP_SENDER_EMAIL", ""),
    "sender_password": os.getenv("SMTP_SENDER_PASSWORD", ""),
    "smtp_host":       os.getenv("SMTP_HOST", "smtp.gmail.com"),
    "smtp_port":       int(os.getenv("SMTP_PORT", "465")),
}

# -----------------------------------------------------------------------------
# GOOGLE GEMINI API SETTINGS
# -----------------------------------------------------------------------------
# What this does: Stores the API key needed to talk to Google's Gemini AI.
# Where it works: This powers the CardioBot chatbot on the Predict page.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# -----------------------------------------------------------------------------
# MONGODB (CLOUD DATABASE) SETTINGS
# -----------------------------------------------------------------------------
# What this does: Configures the connection to MongoDB if we are using a cloud database instead of local JSON files.
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB  = os.getenv("MONGODB_DB", "heartiq")
