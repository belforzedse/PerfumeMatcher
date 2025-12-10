# Full Stack Setup Guide

This guide will help you set up and run the complete PerfumeMatcher system with both frontend (Next.js) and backend (Django).

## Prerequisites

- Python 3.11+ with pip
- Node.js 18+ with npm
- OpenAI API key

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
# Create a .env file or export these:
# OPENAI_API_KEY=sk-your-key-here
# AI_MODEL=gpt-4o-mini

# Run migrations
python manage.py migrate

# Start backend server
python manage.py runserver 8000
```

The backend will be available at `http://localhost:8000`

### 2. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file with:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api

# Start frontend dev server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env in `backend/`)

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional
AI_MODEL=gpt-4o-mini
ADMIN_ACCESS_KEY=your-secret-admin-key
```

### Frontend (.env.local in `frontend/`)

```bash
# Required
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api

# Optional (for admin features)
# NEXT_PUBLIC_ADMIN_KEY=your-secret-admin-key
```

## Testing the System

1. Open `http://localhost:3000` in your browser
2. Click "شروع پرسشنامه" (Start Questionnaire)
3. Answer the questions about your perfume preferences
4. Wait for the AI-powered recommendations (this should take 5-15 seconds)
5. Review your personalized perfume matches

## Architecture

```
Frontend (Next.js - Port 3000)
    ↓ HTTP Requests
Backend (Django - Port 8000)
    ↓ API Calls
OpenAI API (GPT-4o-mini)
```

### Data Flow

1. **Perfume Catalog**: Frontend fetches from `GET /api/perfumes/`
   - Backend serves perfumes.json with brands, collections, and perfume data
   - Includes retry logic and local fallback

2. **Recommendations**: Frontend POSTs questionnaire to `POST /api/recommend/`
   - Backend uses hybrid approach:
     - TF-IDF vectorizer generates 20 local candidates
     - OpenAI reranks top candidates based on user preferences
     - Returns ranked results with match percentages and reasons
   - 30-second timeout with 1 retry

3. **Error Handling**: 
   - Retry logic with exponential backoff
   - Local fallback if backend unavailable
   - TF-IDF fallback if OpenAI unavailable

## Admin Panel

The frontend includes an admin panel at `http://localhost:3000/admin` for:
- Managing brands
- Managing collections
- Managing perfumes (CRUD operations)
- Bulk imports

Note: Admin panel currently uses Next.js API routes with local data.json storage.

## Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Ensure Python dependencies are installed
- Verify migrations have run: `python manage.py migrate`

### Frontend won't connect to backend
- Verify `NEXT_PUBLIC_BACKEND_URL` is set in `.env.local`
- Check backend is running on port 8000
- Check browser console for CORS errors

### Recommendations taking too long
- Check OpenAI API key is valid
- Verify your OpenAI account has credits
- Check backend logs for errors: Look at terminal running `manage.py runserver`

### OpenAI errors
- System falls back to local TF-IDF matching if OpenAI fails
- Check `OPENAI_API_KEY` environment variable
- Verify API key has proper permissions

## Development Notes

- Backend uses Django REST Framework with TF-IDF + OpenAI hybrid matching
- Frontend uses Next.js 15 with Server Components and API routes
- Real-time AI recommendations with 30s timeout
- Caching: Perfume catalog cached for 5 minutes on frontend
- Persian (Farsi) UI with RTL support

