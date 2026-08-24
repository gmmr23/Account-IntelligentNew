import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve root workspace path
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from the root .env file
dotenv_path = BASE_DIR / '.env'
if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path)
else:
    load_dotenv()

# Configuration variables
PORT = int(os.getenv("CHATBOT_PORT", 9005))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY is not defined in the environment. Chatbot inference will fail.")

