# Prometheus Hack - Sahayak AI Assistant

A comprehensive AI-powered assistant system with voice capabilities, grievance management, and knowledge base features.

## 🏗️ Project Structure

```
prometheus_hack_jit/
├── backend/          # Python FastAPI backend
├── frontend/         # React + TypeScript frontend
└── scripts/          # Utility scripts
```

## 🔒 Security & Git Configuration

This repository is configured with comprehensive `.gitignore` rules to prevent sensitive data from being committed.

### Protected Files & Directories

#### Environment & Secrets
- `.env` files (all variations)
- JWT tokens (`*.jwt`, `.sahayak-dev-jwt`)
- Database files (`*.db`, `*.sqlite`)
- Google Cloud credentials (`*credentials*.json`, `project-*.json`)
- Service account keys

#### Python/Backend
- Virtual environments (`.venv/`, `venv/`)
- Python cache (`__pycache__/`, `*.pyc`)
- Build artifacts (`*.egg-info/`, `dist/`, `build/`)
- Test cache (`.pytest_cache/`)

#### Node.js/Frontend
- Dependencies (`node_modules/`)
- Build outputs (`dist/`)
- Package manager caches

#### IDE & Editor
- VSCode settings (except shared configs)
- JetBrains IDEs (`.idea/`)
- Other editor-specific files

## 🚀 Getting Started

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# or: source .venv/bin/activate  # Linux/Mac
pip install -r requirements-gcp.txt
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL or Supabase account
- Google Cloud account (for AI services)

## 🔧 Environment Variables

Create `.env` files in both backend and frontend directories based on the following:

### Backend `.env`
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
GOOGLE_APPLICATION_CREDENTIALS=path_to_credentials.json
# Add other required variables
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
# Add other required variables
```

## 📝 Git Workflow

This repository is connected to: `https://github.com/haarsh12/prometheus_hack.git`

### Initial Push

```bash
git push -u origin main
```

### Regular Workflow

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Your descriptive message"

# Push
git push
```

## 🛡️ Line Endings

This project uses `.gitattributes` to enforce consistent line endings:
- **LF** for source code files (cross-platform consistency)
- **CRLF** for Windows batch files

## 📦 What's NOT in Version Control

The following are automatically ignored and should NEVER be committed:

1. **Credentials**: Any files containing API keys, passwords, or tokens
2. **Local databases**: Development database files
3. **Dependencies**: node_modules, .venv directories
4. **Build artifacts**: dist, build directories
5. **IDE settings**: Personal editor configurations
6. **Logs**: Application and error logs

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Ensure no sensitive data is being committed
4. Submit a pull request

## ⚠️ Important Notes

- **Never commit** `.env` files or any credentials
- **Always review** `git status` before committing
- **Use** `git check-ignore <file>` to verify if a file should be ignored
- **Keep** `.gitignore` and `.gitattributes` up to date

## 📞 Support

For issues or questions, please open an issue on GitHub.

## 📄 License

[Add your license information here]
