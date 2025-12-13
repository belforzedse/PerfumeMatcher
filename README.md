# 🌸 PerfumeMatcher - AI-Powered Perfume Recommendation System

A full-stack application that provides personalized perfume recommendations using AI-powered matching algorithms. Built with Next.js, Django, and OpenAI GPT models.

## ✨ Features

- **AI-Powered Recommendations**: Uses OpenAI GPT models to provide intelligent perfume matching based on user preferences
- **Hybrid Matching Algorithm**: Combines TF-IDF vectorization with AI reranking for accurate results
- **Interactive Questionnaire**: Beautiful, touch-optimized interface for collecting user preferences
- **Admin Panel**: Complete CRUD interface for managing brands, collections, and perfumes
- **Persian (Farsi) Support**: Full RTL support with Persian language interface
- **Responsive Design**: Optimized for kiosk displays and touch interactions
- **Image Management**: Upload and manage perfume images with automatic compression

## 🏗️ Architecture

```
Frontend (Next.js 16)          Backend (Django 6)
├── React 19                    ├── Django REST Framework
├── TypeScript                  ├── TF-IDF Vectorizer
├── Tailwind CSS 4              ├── OpenAI Integration
└── Framer Motion               └── SQLite Database
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ and pip
- OpenAI API key

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/PerfumeMatcher.git
   cd PerfumeMatcher
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   
   # Create .env file
   echo "OPENAI_API_KEY=your-key-here" > .env
   echo "AI_MODEL=gpt-5-mini" >> .env
   
   # Run migrations
   python manage.py migrate
   
   # Start server
   python manage.py runserver 8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env.local file
   echo "NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000" > .env.local
   
   # Start dev server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api

## 📦 Production Deployment

### VPS Deployment

1. **Run the setup script on your VPS**
   ```bash
   sudo bash scripts/setup-vps.sh kiosk.gandom-perfume.ir kioskapi.gandom-perfume.ir
   ```

2. **Configure GitHub Secrets**
   - `VPS_HOST` - Your VPS IP address
   - `VPS_USER` - SSH username (usually `deploy`)
   - `VPS_SSH_KEY` - SSH private key
   - `DJANGO_SECRET_KEY` - Django secret key
   - `OPENAI_API_KEY` - OpenAI API key
   - `ADMIN_ACCESS_KEY` - Admin API access key

3. **Push to main branch** - GitHub Actions will automatically deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **HTTP Client**: Axios

### Backend
- **Framework**: Django 6
- **API**: Django REST Framework
- **ML**: scikit-learn (TF-IDF)
- **AI**: OpenAI API (GPT-4o-mini)
- **Database**: SQLite (production-ready for PostgreSQL)

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (Certbot)
- **Monitoring**: Portainer Agent

## 📁 Project Structure

```
PerfumeMatcher/
├── backend/                 # Django backend
│   ├── api/                # Main API app
│   ├── matcher/            # Matching algorithms
│   └── matcher_backend/    # Django settings
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities & API clients
│   └── public/            # Static assets
├── scripts/                # Utility scripts
│   └── setup-vps.sh       # VPS setup script
├── .github/
│   └── workflows/         # GitHub Actions
└── docker-compose.yml      # Production orchestration
```

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,localhost
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-5-mini
ADMIN_ACCESS_KEY=your-admin-key
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_BACKEND_BASE_URL=https://kioskapi.gandom-perfume.ir
```

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
python manage.py test
```

## 📝 API Documentation

### Endpoints

- `GET /api/perfumes/` - List all perfumes
- `POST /api/recommend/` - Get perfume recommendations
- `POST /api/recommend/rerank/` - AI-powered reranking
- `GET /api/available-notes/` - Get available perfume notes

See API documentation in the backend for more details.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT models
- Django and Next.js communities
- All contributors and users

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- Review existing issues and discussions

---

**Made with ❤️ for perfume enthusiasts**

