# Backend Environment Setup

## Required Environment Variables

Create a `.env` file in the `backend/` directory or set the following environment variables:

```bash
# OpenAI API Key (required for AI reranking)
OPENAI_API_KEY=sk-your-openai-api-key-here

# AI Model (optional, defaults to gpt-4o-mini)
AI_MODEL=gpt-4o-mini

# Admin Access Key (optional, for admin API)
ADMIN_ACCESS_KEY=your-secret-admin-key
```

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Database Setup

```bash
python manage.py migrate
```

## Running the Server

```bash
python manage.py runserver 8000
```

The backend will be available at `http://localhost:8000`

## Endpoints

- `GET /api/perfumes/` - Get all perfumes catalog
- `POST /api/recommend/` - Get AI-powered perfume recommendations
- `GET/POST /api/admin/perfumes/` - Admin perfume CRUD (requires X-Admin-Key header)
- `GET/PUT/DELETE /api/admin/perfumes/<id>/` - Admin perfume details

## Notes

- The OpenAI API key is required for AI-powered recommendations
- If no API key is provided, the system falls back to local TF-IDF matching only
- CORS is configured to allow requests from http://localhost:3000

