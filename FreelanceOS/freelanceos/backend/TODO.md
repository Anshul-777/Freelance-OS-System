# FreelanceOS Backend Render Deployment TODO

## Approved Plan Steps:

### 1. Update config.py (CORS/FRONTEND_URL) ✅
- [x] Edit `FreelanceOS/freelanceos/backend/config.py`: Set FRONTEND_URL default to prod, add to ALLOWED_ORIGINS

### 2. Create .env.example ✅
- [x] Create `FreelanceOS/freelanceos/backend/.env.example` with all env vars & placeholders

### 3. Update README.md with deploy instructions ✅
- [x] Append Render deployment guide to root README.md

### 4. Commit & Push
- [ ] git add . && git commit -m "Prepare backend for Render deployment" && git push

### 5. Deploy on Render (Manual)
- [ ] Create Web Service on Render.com connected to GitHub repo
- [ ] Set env vars (DATABASE_URL, SECRET_KEY, etc.)
- [ ] Build: pip install -r requirements.txt
- [ ] Start: uvicorn main:app --host 0.0.0.0 --port $PORT


### 6. Post-Deploy ✅
- [x] Tables auto-created on startup (main.py lifespan update)
- [x] Update Vercel VITE_API_URL=https://freelance-os-system-1.onrender.com/api
- [x] Test full stack - LIVE!

**Progress: Backend deployed + tables auto-created. Frontend connect Vercel env → Production complete!**

