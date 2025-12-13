# Contributing to PerfumeMatcher

Thank you for your interest in contributing to PerfumeMatcher! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/PerfumeMatcher.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Commit your changes: `git commit -m "Add your feature"`
6. Push to your branch: `git push origin feature/your-feature-name`
7. Open a Pull Request

## 📋 Development Setup

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🎯 Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints where appropriate
- Write docstrings for functions and classes
- Maximum line length: 100 characters

### TypeScript (Frontend)
- Use TypeScript strict mode
- Follow ESLint rules
- Use functional components with hooks
- Prefer named exports over default exports

## 📝 Commit Messages

Use clear, descriptive commit messages:

```
feat: Add perfume search functionality
fix: Resolve image upload issue
docs: Update deployment documentation
refactor: Improve matching algorithm
test: Add unit tests for API endpoints
```

## 🧪 Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Add tests for bug fixes

### Running Tests

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

## 🔍 Pull Request Process

1. **Update Documentation**: Update README.md or relevant docs if needed
2. **Add Tests**: Include tests for new features
3. **Ensure Tests Pass**: All CI checks must pass
4. **Update CHANGELOG**: Document your changes (if applicable)
5. **Request Review**: Request review from maintainers

## 🐛 Reporting Bugs

Use the GitHub issue tracker. Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node/Python versions)
- Screenshots (if applicable)

## 💡 Feature Requests

Open an issue with:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (if you have ideas)

## 📚 Documentation

- Update relevant documentation when adding features
- Add JSDoc comments for functions
- Update API documentation for backend changes

## ✅ Checklist

Before submitting a PR:
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Commits are atomic and well-described

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints

Thank you for contributing! 🎉

