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
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL")

if not GROQ_API_KEY:
    print("Warning: GROQ_API_KEY is not defined in the environment. Chatbot inference will fail.")

