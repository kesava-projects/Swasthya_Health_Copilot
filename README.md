# Swasthya Copilot — AI-Powered Personal Health Record System

Swasthya Copilot is an end-to-end, AI-powered personal health-record management application designed to help patients and caregivers upload, organize, verify, understand, and compare complex medical documents (prescriptions, laboratory reports, diagnostic imaging, and discharge summaries) with strict medical safety guardrails.

---

## 1. System Architecture

Swasthya Copilot is built using a decoupled, service-oriented architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                   React + Vite Frontend                     │
│    (TypeScript, Tailwind CSS, Recharts, Multilingual i18n)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON API (REST)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│   (TypeScript, Mongoose, Zod, JWT Auth, Audit Trail, RAG)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               │ HTTP Multipart                │ Native Protocol
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Python OCR Service      │ │       MongoDB Database     │
│  (FastAPI, Tesseract 5.x,    │ │  (User, Document, Extr.,   │
│   PyMuPDF, Pillow, OpenCV)   │ │   Obs, Meds, Timeline,     │
└──────────────────────────────┘ │   Reminders, Audit Logs)   │
                                 └────────────────────────────┘
```

### Core Technologies

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Recharts, Lucide Icons, Axios.
- **Main Backend**: Node.js v20+, Express.js, TypeScript, MongoDB / Mongoose, Zod schema validation, JWT with HttpOnly cookies, Helmet, rate-limiters, and comprehensive audit logging.
- **OCR Microservice**: Python 3.11+, FastAPI, Uvicorn, Tesseract OCR 5.x (`eng+hin+tel`), PyMuPDF (Fitz) for PDF page rendering & text extraction, Pillow image enhancement.
- **AI Intelligence Layer**: Provider-agnostic adapter supporting Google Gemini (`@google/generative-ai`), OpenRouter, and a zero-dependency deterministic Demo Mode for development without active credentials.
- **Standards Readiness**: HL7 FHIR R4 mapping layer (`Patient`, `DocumentReference`, `DiagnosticReport`, `Observation`, `MedicationRequest`, `Condition`) and mock ABHA ID demonstration fields.

---

## 2. Key Features

1. **Secure Document Ingestion**:
   - Accepts PDF, JPEG, JPG, and PNG up to 15 MB.
   - File signature (magic bytes) validation prevents disguised executables.
   - Private document storage with cryptographic UUID filenames; private paths are never publicly exposed.
2. **Multilingual OCR & Document Intelligence**:
   - Supports English, Telugu, and Hindi document recognition.
   - Digital text layer extraction for digital PDFs, and 300 DPI high-resolution rendering with auto-contrast for scanned reports.
   - Modular handwriting adapter with cautionary review alerts.
3. **Structured Clinical Extraction & Human Review Workflow**:
   - Extracts test names, numeric/string values, units, printed reference ranges, abnormal flags, medication regimens, and doctor instructions.
   - Preserves exact source text and page numbers for complete audit traceability.
   - Dedicated side-by-side review screen allows users to correct OCR errors before promoting fields to official health records.
4. **Unified Health Profile & Longitudinal Timeline**:
   - Verified laboratory observations with interactive Recharts trend visualizations.
   - Active medication list with discontinuation toggles.
   - Chronological health timeline explicitly separating the **medical event date** from the **upload date**.
5. **Grounded RAG AI Health Chatbot**:
   - Queries strictly scoped to the authenticated user (tested IDOR protection).
   - Generates answers citing exact source document titles and page numbers.
   - Explicit clinical triage guardrails for acute emergency symptoms (108/112 warning).
6. **User-Confirmed Reminders**:
   - Follow-up lab tests, doctor appointments, and medication schedules confirmed by the user.
7. **Multilingual Interface**:
   - Real-time language switching between English, Telugu (తెలుగు), and Hindi (हिंदी).
8. **ABDM / FHIR R4 Bundle Export**:
   - 1-click export of the patient's verified health records as a valid HL7 FHIR R4 JSON bundle.

---

## 3. Repository Structure

```
swasthya-copilot/
├── frontend/                     # React Vite TypeScript frontend
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with JWT interceptor
│   │   ├── components/           # Navbar, Sidebar, ProtectedRoute, Badges
│   │   ├── context/              # AuthContext & multilingual session state
│   │   ├── layouts/              # AppLayout shell
│   │   ├── pages/                # Dashboard, Documents, Review, Observations,
│   │   │                         # Timeline, Health Profile, Chat, Reminders, Settings
│   │   ├── types/                # Strict TypeScript clinical interfaces
│   │   └── utils/                # i18n translations (English, Telugu, Hindi)
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/                      # Node.js Express TypeScript API
│   ├── src/
│   │   ├── config/               # Zod env validation, MongoDB connection
│   │   ├── middleware/           # Auth, Zod validation, error handler, rate limits
│   │   ├── modules/              # Auth, Users, Documents, Extractions, Observations,
│   │   │                         # Medications, Conditions, Timeline, Summaries,
│   │   │                         # Chatbot, Reminders, Audit, FHIR
│   │   ├── services/             # Gemini/AI providers, OCR client, storage adapter,
│   │   │                         # background processing pipeline
│   │   └── utils/                # Logger and JWT authentication utilities
│   ├── tests/                    # Jest supertest integration test suite
│   ├── package.json
│   └── Dockerfile
├── ocr-service/                  # Python FastAPI OCR microservice
│   ├── app/
│   │   ├── core/                 # Settings and Tesseract configuration
│   │   ├── schemas/              # Pydantic typed request & response schemas
│   │   ├── services/             # PDF processing, image enhancement, OCR engines
│   │   └── main.py               # FastAPI router (/health, /ocr/process)
│   ├── evaluation/               # Accuracy evaluation suite & synthetic ground truth
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml            # Multi-container orchestration
├── SECURITY.md                   # Threat model & privacy safeguards
├── .gitignore
└── README.md
```

---

## 4. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Python**: v3.10 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas
- **Tesseract OCR**:
  - macOS: `brew install tesseract tesseract-lang`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin tesseract-ocr-tel`

---

## 5. Local Setup & Installation

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
cp .env.example .env
```

### Step 2: Install Frontend Dependencies

```bash
cd ../frontend
npm install
cp .env.example .env
```

### Step 3: Install OCR Service Dependencies

```bash
cd ../ocr-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

---

## 6. Environment Variables Configuration

### Backend (`backend/.env`)

| Variable          | Description                                | Default / Example                            |
| ----------------- | ------------------------------------------ | -------------------------------------------- |
| `PORT`            | API Server port                            | `5001`                                       |
| `NODE_ENV`        | Environment mode                           | `development`                                |
| `CLIENT_URL`      | Frontend origin for CORS                   | `http://localhost:5173`                      |
| `MONGODB_URI`     | MongoDB connection string                  | `mongodb://127.0.0.1:27017/swasthya_copilot` |
| `JWT_SECRET`      | Secret key for JWT signing (min 16 chars)  | `your-secure-random-jwt-secret-min-32-chars` |
| `OCR_SERVICE_URL` | Internal URL of OCR microservice           | `http://127.0.0.1:8000`                      |
| `UPLOAD_DIR`      | Private document storage path              | `./uploads`                                  |
| `AI_PROVIDER`     | Selected LLM provider (`gemini` or `mock`) | `gemini`                                     |
| `LLM_API_KEY`     | Google Gemini API key (optional for demo)  | `AIzaSy...` (Leave blank for Demo Mode)      |
| `LLM_MODEL`       | Gemini model name                          | `gemini-1.5-flash`                           |

> [!NOTE]
> If `LLM_API_KEY` is omitted, the application runs in **Configuration-Check / Demo Mode**. It uses deterministic local extractors and grounded record retrieval without crashing or fabricating fake external calls.

### OCR Service (`ocr-service/.env`)

| Variable         | Description                        | Default                                               |
| ---------------- | ---------------------------------- | ----------------------------------------------------- |
| `PORT`           | FastAPI microservice port          | `8000`                                                |
| `HOST`           | Binding address                    | `0.0.0.0`                                             |
| `DEFAULT_LANGS`  | Installed Tesseract language codes | `eng+hin+tel`                                         |
| `TESSERACT_PATH` | Path to tesseract executable       | `/opt/homebrew/bin/tesseract` or `/usr/bin/tesseract` |

---

## 7. Starting the Services

Run each service in a separate terminal:

### Terminal 1: Python OCR Service

```bash
cd ocr-service
source venv/bin/activate
python -m uvicorn app.main:app --port 8000 --reload
```

_Health check available at: `http://localhost:8000/health`_

### Terminal 2: Node.js Backend API

```bash
cd backend
npm run dev
```

_API available at: `http://localhost:5001/api/health`_

### Terminal 3: React Frontend Client

```bash
cd frontend
npm run dev
```

_Web application available at: `http://localhost:5173`_

---

## 8. Docker Deployment

To launch the complete multi-service stack with a single command locally:

```bash
docker-compose up --build
```

This starts:

- `mongodb` on port `27017`
- `ocr-service` on port `8000`
- `backend` on port `5001`
- `frontend` on port `5173`

---

## 9. Deploying to Render 🚀

Swasthya Copilot includes a complete **Render Blueprint** ([`render.yaml`](./render.yaml)) and is fully configured for production deployment on Render.

For complete step-by-step instructions, see the dedicated [**Render Deployment Guide (RENDER_DEPLOY.md)**](./RENDER_DEPLOY.md).

### Quick 1-Click Blueprint Deploy:

1. Push this repository to GitHub or GitLab.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect this repository.
5. Provide your configuration:
   - `MONGODB_URI`: Your MongoDB Atlas URI (ensure Network Access allows `0.0.0.0/0`).
   - `LLM_API_KEY`: Your Google Gemini API Key.
   - `CLIENT_URL`: URL of your frontend static site (e.g. `https://swasthya-copilot-frontend.onrender.com`).
   - `VITE_API_BASE_URL`: URL of your backend API (e.g. `https://swasthya-copilot-backend.onrender.com/api`).
6. Click **Apply**. Render will automatically provision:
   - **Frontend**: Render Static Site (Free CDN with SPA routing)
   - **Backend**: Node.js Web Service (with health checks and GridFS document persistence)
   - **OCR Microservice**: Docker Web Service (multilingual Tesseract 5.x)

---

## 10. Running Tests & Accuracy Evaluations

### Backend Integration Test Suite (17 Tests)

Validates registration, login, IDOR isolation, magic-byte validation, human confirmation, RAG chatbot, and FHIR export:

```bash
npm run test:backend
# or: cd backend && npm test
```

### OCR Service Tests

Validates FastAPI endpoints and synthetic text extraction:

```bash
npm run test:ocr
# or: PYTHONPATH=ocr-service ./ocr-service/venv/bin/pytest ocr-service/tests/test_ocr.py
```

### OCR Accuracy Evaluation Script

Calculates Character Error Rate (CER) and field-level exact-match accuracy for medicine names, dosages, units, and reference ranges:

```bash
npm run evaluate:ocr
# or: PYTHONPATH=ocr-service ./ocr-service/venv/bin/python ocr-service/evaluation/evaluate_ocr.py
```

---

## 11. User Quick Start Guide

1. Open `http://localhost:5173/register` and create your patient account (or sign in at `/login`).
2. Navigate to the clinical dashboard.
3. **Upload a New Document**:
   - Go to **Documents**.
   - Drag and drop your medical report or prescription (PDF, PNG, JPEG).
   - The document enters the automated OCR and AI extraction pipeline and transitions to **Awaiting Review**.
4. **Verify & Confirm**:
   - Click **Review & Confirm** to see the side-by-side original document stream and editable extracted tests.
   - Click **Confirm & Promote** to update your Unified Health Profile.
5. **Explore Trends & Timeline**:
   - Visit **Labs & Trends** to see interactive Recharts comparisons over time.
   - Visit **Medical Timeline** to see your chronological health events.
6. **Ask the RAG Chatbot**:
   - Open **Health AI Chat**.
   - Ask queries regarding your health records.
   - Observe grounded answers with clickable citations linking to your exact source documents.
7. **Export FHIR Bundle**:
   - Go to **Health Profile** and click **Export FHIR R4 Bundle** to download a standard HL7 FHIR JSON file.
