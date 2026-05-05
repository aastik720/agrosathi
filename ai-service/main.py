import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import chatbot, disease

load_dotenv()

app = FastAPI(
    title="AgroSaathi AI Service",
    description="Voice chatbot, crop disease detection, and image processing APIs.",
    version="1.0.0",
)

client_url = os.getenv("CLIENT_URL", "http://localhost:5173")


def configured_env(name: str) -> bool:
    value = os.getenv(name)
    return bool(value and value != "your_key")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[client_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "AgroSaathi FastAPI AI service is running.",
        "service": "ai-service",
        "status": "ok",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "agrosathi-ai-service",
        "port": int(os.getenv("PORT", "8000")),
        "ai_mode": os.getenv("AI_MODE", "ollama"),
    }


@app.get("/ai/health")
async def ai_health():
    return {
        "status": "ok",
        "service": "agrosathi-ai-service",
        "ai_mode": os.getenv("AI_MODE", "ollama"),
        "ollama_url": os.getenv("OLLAMA_URL", "http://localhost:11434"),
        "ollama_model": os.getenv("OLLAMA_MODEL", "llama3.2"),
        "gemini_configured": configured_env("GEMINI_API_KEY"),
        "plantid_configured": configured_env("PLANTID_API_KEY"),
    }


app.include_router(chatbot.router, prefix="/api/chatbot", tags=["chatbot"])
app.include_router(chatbot.router, prefix="/ai/chat", tags=["chat"])
app.include_router(disease.router, prefix="/api/disease", tags=["disease"])
app.include_router(disease.router, prefix="/ai/disease", tags=["disease"])
