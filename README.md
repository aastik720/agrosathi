# AgroSaathi

AgroSaathi is a voice-first, AI-powered, multilingual web app for Indian farmers. It combines Supabase auth/data, a React farmer dashboard, an Express API gateway, and a FastAPI AI service for chat and crop disease detection.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + JavaScript on port `5173`
- Backend: Node.js + Express + JavaScript on port `5000`
- AI service: Python + FastAPI on port `8000`
- Database/Auth/Storage: Supabase PostgreSQL, Supabase Auth, Supabase Storage
- Free APIs: OpenWeatherMap, Plant.id, Google Gemini, Ollama, Web Speech API

## Current Features

- Supabase email/password auth with protected routes
- 3-step profile setup for language, farm details, and crops
- Language context for Hindi, Punjabi, Pahadi, and English
- Dashboard with weather, alerts, stats, feature cards, activity, and floating mic shortcut
- Saathi AI chatbot with voice input, text fallback, TTS, suggestions, feedback, and chat history
- Disease scanner with camera/upload, Canvas image compression, Plant.id analysis, AI advice, scan history, sharing, and per-farmer rate limiting
- Supabase schema with RLS policies for profiles, marketplace basics, chat history, disease scans, and private disease image storage

## Project Structure

```text
agrosathi/
  client/       React app
  server/       Express API gateway
  ai-service/   FastAPI AI and image service
  supabase/
    schema.sql  Tables, RLS policies, storage bucket setup
```

## Supabase Setup

1. Create a free Supabase project.
2. Open Supabase SQL Editor.
3. Run all SQL from `supabase/schema.sql`.
4. Copy your project URL, anon key, and service role key.
5. For easier local testing, disable email confirmation in Supabase Auth settings. If email confirmation stays on, users must verify email before login.

## Environment Files

Create these files from the examples:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
cp ai-service/.env.example ai-service/.env
```

### `client/.env`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SERVER_URL=http://localhost:5000
VITE_AI_SERVICE_URL=http://localhost:8000
```

### `server/.env`

```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
CLIENT_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
OPENWEATHER_API_KEY=your_key
GEMINI_API_KEY=your_key
AI_MODE=ollama
OLLAMA_URL=http://localhost:11434
```

### `ai-service/.env`

```env
PORT=8000
GEMINI_API_KEY=your_key
PLANTID_API_KEY=your_key
AI_MODE=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Never commit `.env` files.

## Install Dependencies

Frontend:

```bash
cd client
npm install
```

Backend:

```bash
cd server
npm install
```

AI service:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run All Services

Terminal 1:

```bash
cd client
npm run dev
```

Terminal 2:

```bash
cd server
npm run dev
```

Terminal 3:

```bash
cd ai-service
uvicorn main:app --reload --port 8000
```

Open `http://localhost:5173`.

## Local AI Setup

Install Ollama, then run:

```bash
ollama pull llama3.2
```

The AI service uses `AI_MODE=ollama` first for local/offline-capable chat and falls back to Gemini when Ollama is unavailable.

## Useful Health Checks

```bash
curl http://localhost:5000/health
curl http://localhost:8000/health
curl http://localhost:8000/ai/health
```
