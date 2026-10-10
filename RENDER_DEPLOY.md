# Deploying Swasthya Copilot on Render 🚀

This guide provides complete, step-by-step instructions for deploying **Swasthya Copilot** to [Render](https://render.com).

---

## 📑 Architecture Overview

Render provides multiple deployment patterns for Swasthya Copilot:

| Deployment Pattern | Services Used | Render Plan | Best For |
| :--- | :--- | :--- | :--- |
| **Option 1: Recommended Blueprint** | Frontend (Static Site) + Backend (Node Web Service) + OCR (Docker Web Service) | Free / Starter | Full multilingual OCR (English + Hindi + Telugu Tesseract) and separate static CDN |
| **Option 2: Lean 2-Service** | Frontend (Static Site) + Backend (Node Web Service) | 100% Free Tier | Fastest setup; backend uses Google Gemini Multimodal Vision for OCR extraction |
| **Option 3: Unified 1-Service** | Backend Web Service (Node.js serving Frontend SPA) | 100% Free Tier (1 service) | Minimum footprint, zero CORS configuration needed |

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. **A Render Account**: Sign up for free at [render.com](https://render.com).
2. **A MongoDB Atlas Database**:
   - Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
   - In **Database Access**: Create a user with Read & Write privileges.
   - In **Network Access**: Add IP Address `0.0.0.0/0` (Allow access from anywhere).  
     *(Render's free tier uses dynamic outbound IP addresses, so `0.0.0.0/0` is required).*
   - Copy your connection string:
     ```text
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/swasthya_copilot?retryWrites=true&w=majority
     ```
3. **A Google Gemini API Key**:
   - Generate an API key for free at [Google AI Studio](https://aistudio.google.com).
4. **Git Repository**: Push your Swasthya Copilot repository to GitHub or GitLab.

---

## ⚡ Method 1: Blueprint 1-Click Deployment (Recommended)

Render includes native Blueprint support via the included [`render.yaml`](file:///Volumes/Harsha/project_1/render.yaml).

### Steps:

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your Git repository containing Swasthya Copilot.
4. Render will parse [`render.yaml`](file:///Volumes/Harsha/project_1/render.yaml) and display the services to be created:
   - `swasthya-copilot-frontend` (Static Site)
   - `swasthya-copilot-backend` (Web Service)
   - `swasthya-copilot-ocr` (Docker Web Service)
5. Under **Environment Variables**, fill in the required values:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `LLM_API_KEY`: Your Google Gemini API Key.
   - `CLIENT_URL`: URL of the frontend (e.g., `https://swasthya-copilot-frontend.onrender.com`).
   - `VITE_API_BASE_URL`: URL of the backend (e.g., `https://swasthya-copilot-backend.onrender.com/api`).
   - `OCR_SERVICE_URL`: URL of the OCR service (e.g., `https://swasthya-copilot-ocr.onrender.com` or internal URL).
6. Click **Apply**. Render will automatically build and deploy all services!

---

## 🛠️ Method 2: Manual Dashboard Setup

If you prefer to configure each service manually in the Render dashboard:

### 1. Deploy the Backend Web Service

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `swasthya-copilot-backend`
   - **Region**: Choose the region closest to your users (e.g., Singapore, Frankfurt, Oregon).
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced** and set **Health Check Path** to:
   ```text
   /health
   ```
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Render standard port |
   | `MONGODB_URI` | `mongodb+srv://...` | From MongoDB Atlas |
   | `JWT_SECRET` | *(generate random 32+ char string)* | Token signing secret |
   | `JWT_EXPIRES_IN` | `7d` | Token validity |
   | `CLIENT_URL` | `https://swasthya-copilot-frontend.onrender.com` | Allowed CORS origin |
   | `AI_PROVIDER` | `gemini` | AI Engine |
   | `LLM_API_KEY` | `AIzaSy...` | Gemini API Key |
   | `LLM_MODEL` | `gemini-1.5-flash` | Primary extraction model |
   | `OCR_SERVICE_URL` | `https://swasthya-copilot-ocr.onrender.com` | Leave blank if not using OCR microservice |
6. Click **Create Web Service**. Once deployed, copy your backend URL (e.g., `https://swasthya-copilot-backend.onrender.com`).

---

### 2. Deploy the Frontend Static Site

1. In Render Dashboard, click **New +** -> **Static Site**.
2. Connect your Git repository.
3. Configure the static site:
   - **Name**: `swasthya-copilot-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Redirects/Rewrites**, add:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`  
   *(Note: The codebase also includes [`frontend/public/_redirects`](file:///Volumes/Harsha/project_1/frontend/public/_redirects) which guarantees SPA routing automatically).*
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://swasthya-copilot-backend.onrender.com/api` |
6. Click **Create Static Site**.

---

### 3. Deploy the OCR Microservice (Optional)

> **Note**: If you skip this service, Swasthya Copilot automatically and gracefully uses **Google Gemini Multimodal Vision** to analyze and extract records from PDF and image uploads without needing any external OCR engine!

If you want the dedicated multilingual Tesseract OCR service (English + Hindi + Telugu):

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure:
   - **Name**: `swasthya-copilot-ocr`
   - **Root Directory**: `ocr-service`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Expand **Advanced** and set **Health Check Path** to:
   ```text
   /health
   ```
5. Environment Variables:
   | Key | Value |
   | :--- | :--- |
   | `HOST` | `0.0.0.0` |
   | `PORT` | `8000` |
   | `DEFAULT_LANGS` | `eng+hin+tel` |
6. Click **Create Web Service**.

---

## 📦 Method 3: Unified Single-Service Deployment (Zero-CORS, Single Web Service)

If you wish to deploy the entire application under a **single Render Free Web Service**:

1. Click **New +** -> **Web Service**.
2. **Root Directory**: Leave blank (repository root).
3. **Runtime**: `Node`
4. **Build Command**:
   ```bash
   npm --prefix backend install && npm --prefix backend run build && npm --prefix frontend install && npm --prefix frontend run build
   ```
5. **Start Command**:
   ```bash
   npm --prefix backend start
   ```
6. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `SERVE_FRONTEND`: `true`
   - `MONGODB_URI`: `mongodb+srv://...`
   - `JWT_SECRET`: *(32+ characters)*
   - `LLM_API_KEY`: `AIzaSy...`
   - `CLIENT_URL`: `*`
7. Click **Create Web Service**. The Express backend will serve the frontend SPA and all `/api` endpoints on the exact same domain.

---

## 🔑 Environment Variables Reference

| Variable | Required | Service | Purpose & Default |
| :--- | :---: | :--- | :--- |
| `PORT` | Auto | Backend & OCR | Port assigned by Render (defaults to 10000 or 8000) |
| `NODE_ENV` | Yes | Backend | Set to `production` |
| `MONGODB_URI` | Yes | Backend | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Backend | Secret string (min 32 characters) for signing JWTs |
| `JWT_EXPIRES_IN` | No | Backend | Token duration (default `7d`) |
| `CLIENT_URL` | Yes* | Backend | Allowed CORS origins (e.g. `https://your-frontend.onrender.com`). Supports comma-separated origins |
| `AI_PROVIDER` | No | Backend | AI provider (`gemini`, `openrouter`, `mock`; default: `gemini`) |
| `LLM_API_KEY` | Yes | Backend | Google Gemini API key |
| `LLM_MODEL` | No | Backend | Model name (default: `gemini-1.5-flash` or `gemini-flash-lite-latest`) |
| `OCR_SERVICE_URL` | No | Backend | URL of OCR microservice. If unset, automatically falls back to Gemini Multimodal Vision |
| `SERVE_FRONTEND` | No | Backend | Set to `true` if serving frontend build from backend |
| `VITE_API_BASE_URL` | Yes* | Frontend | URL of backend API ending in `/api`. Normalizes missing `/api` or trailing slashes automatically |

---

## 🔍 Verification & Health Checks

Once deployed, verify your services:

1. **Backend Health Check**:
   Visit `https://<your-backend-name>.onrender.com/health`  
   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "swasthya-copilot-backend",
     "timestamp": "...",
     "environment": "production"
   }
   ```
2. **OCR Microservice Health Check** (if deployed):
   Visit `https://<your-ocr-name>.onrender.com/health`  
   Expected response:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "tesseract_available": true,
     "installed_languages": ["eng", "hin", "osd", "tel"]
   }
   ```
3. **Frontend Application**:
   - Open `https://<your-frontend-name>.onrender.com`.
   - Register a new account.
   - Upload a sample lab report (PDF or image).
   - Verify extracted observation values, abnormalities, and patient summaries.
   - Ask a question in the AI Copilot Chatbot.

---

## 💡 Troubleshooting & Render Best Practices

### 1. Free Tier Spindown (Cold Starts)
- On Render's Free tier, Web Services spin down after 15 minutes of inactivity.
- The first request after spindown may take 30–50 seconds to boot up.
- **Solution**: Use a free uptime monitoring service like [UptimeRobot](https://uptimerobot.com) to ping your `/health` endpoint every 10 minutes to keep it active.

### 2. CORS Errors in Browser Console
- If your browser console reports `Blocked by CORS policy`:
  - Check that `CLIENT_URL` in the backend environment matches your frontend URL **exactly** (e.g. `https://swasthya-copilot-frontend.onrender.com`).
  - Swasthya Copilot backend automatically handles trailing slashes and `.onrender.com` subdomains, but verifying the exact URL is recommended.

### 3. Page Refresh Returns 404 on Frontend
- Client-side routing with React Router requires all paths to route back to `index.html`.
- Swasthya Copilot includes [`frontend/public/_redirects`](file:///Volumes/Harsha/project_1/frontend/public/_redirects) and Render Blueprint rewrite rules. If configuring manually in Render Dashboard, ensure you have a Rewrite rule: `/* -> /index.html`.

### 4. MongoDB Connection Timeouts
- If backend logs show `MongooseServerSelectionError`:
  - Go to **MongoDB Atlas** -> **Security** -> **Network Access**.
  - Ensure IP Address `0.0.0.0/0` is added to the access list.
  - Verify that the database user has correct password credentials and privileges.

### 5. Document Persistence Across Deployments
- In cloud platforms like Render, local container disks are ephemeral.
- Swasthya Copilot stores all uploaded medical records and binary files directly inside **MongoDB GridFS** (`storage.adapter.ts`).
- Your documents are 100% persistent and will **never be lost** across restarts or deployments!
