# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the `frontend/` directory with the following content:

```bash
# Backend Django API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api

# Admin access (if needed)
# NEXT_PUBLIC_ADMIN_KEY=your-admin-key-here
```

## Development Setup

1. Copy the configuration above to `.env.local`
2. Ensure the Django backend is running on `http://localhost:8000`
3. Start the frontend with `npm run dev`

## Production Setup

Set the `NEXT_PUBLIC_BACKEND_URL` to your production backend URL.

