# CyberSaarthi — Multilingual Cyber-Fraud Evidence Intelligence & Investigation Platform

> **"From fragmented victim evidence to verifiable, traceable cyber intelligence."**

CyberSaarthi is an integrated civic-tech platform designed to assist cybercrime cells, police officers, and citizens in processing fragmented cyber-fraud evidence. It accepts multimodal victim statements (written descriptions or **direct in-browser audio recordings**), payment app screenshots (PhonePe, Google Pay, Paytm, BHIM), and transaction identifiers.

The platform extracts transactional entities using local RapidOCR, executes deterministic consistency verifications between victim claims and receipt tokens, transparently surfaces discrepancies, enables authorized officers to perform manual field corrections with immutable audit provenance, and constructs an interactive multi-victim Intelligence Graph connecting shared syndicate indicators across isolated complaints.

---

## 1. Key System Capabilities

- **Direct In-Browser Voice Statement Capture**:
  - Citizens record spoken statements directly in the web browser using the MediaRecorder API.
  - Automatically encodes raw audio into 16kHz mono 16-bit PCM WAV in the browser, eliminating external ffmpeg requirements.
  - Transcribes English, Hindi, and Marathi via the backend speech-to-text pipeline.
  - Citizens review and edit the transcript before complaint submission; the system never fabricates a transcript on silence or failure.
- **Strict Role-Based Portal Segregation**:
  - **Citizen Portal**: User registration, complaint submission, in-browser audio recording, case status tracking, and account security. Internal police notes and cross-case syndicate leads are automatically redacted for privacy.
  - **Officer Console**: Protected workspace for authorized investigators to triage incoming cases, inspect high-resolution receipts side-by-side with OCR tokens, apply manual field corrections, explore cross-complaint relationship graphs, and generate printable Section 65B-ready evidence dossiers and bank debit freeze requisitions.
- **Deterministic Evidence Verification**:
  - Rule-based Python verification comparing citizen statements with extracted receipt tokens.
  - Six explicit semantic outcomes: `MATCH`, `MISMATCH`, `MISSING_IN_COMPLAINT`, `MISSING_IN_EVIDENCE`, `UNABLE_TO_VERIFY`, `MANUAL_REVIEW_REQUIRED`.
- **Field Correction with Immutable Provenance**:
  - Authorized officers can correct OCR extraction errors directly in the evidence inspection view.
  - The system permanently records the pre-correction value, officer identity, timestamp, and audit justification, and automatically recomputes verification consistency findings.
- **Cross-Complaint Intelligence Graph**:
  - Automatically indexes suspect UPI VPAs, phone numbers, and bank accounts.
  - Uncovers multi-victim fraud syndicates sharing common infrastructure across independent complaints.
  - All associations carry clear statutory notices: technical correlations represent investigative leads, not legal guilt.

---

## 2. Technology Stack

### Backend
- **Python**: 3.14.7
- **FastAPI**: 0.156.0 (High-performance ASGI framework)
- **Uvicorn**: 0.54.0 (ASGI server)
- **Database**: SQLite3 with Write-Ahead Logging (`WAL`) and foreign keys enabled
- **Security**: PBKDF2-HMAC-SHA256 (100,000 rounds) + PyJWT HS256 tokens
- **OCR Engine**: RapidOCR (`rapidocr-onnxruntime` 1.2.3, CPU/ONNX inference)
- **Audio & Speech**: `SpeechRecognition` + in-browser 16kHz PCM WAV encoder
- **Image Processing**: Pillow (`PIL` 13.0.0)
- **Testing**: Pytest 9.1.1 + HTTPX TestClient (25 automated test cases)

### Frontend
- **React**: 19.3.1
- **TypeScript**: 6.0.3 (Strict type checking)
- **Vite**: 8.3.4 (Fast HMR bundler with `/api` proxying)
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Design Tokens**: Accessible Civic-Tech design system (Brand Teal `#0D9488`, Surface `#FFFFFF`, Background `#F8FAFC`, Border `#E2E8F0`)

---

## 3. Pre-Provisioned Evaluation Accounts

The platform includes seed accounts for evaluation:

| Role | Portal / Destination | Email | Password |
| :--- | :--- | :--- | :--- |
| **Police Officer** | Officer Console (`/officer/login`) | `officer@cybersaarthi.gov.in` | `Officer@CyberSaarthi2026` |
| **System Admin** | Officer Console (`/officer/login`) | `admin@cybersaarthi.gov.in` | `Admin@CyberSaarthi2026` |
| **Citizen User** | Citizen Portal (`/citizen/login`) | `citizen@example.com` | `Citizen@CyberSaarthi2026` |

*New citizens can also register directly at `/citizen/register`.*

---

## 4. Quick Start & Execution Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14.7 Windows)
- Node.js 18+ and npm
- Working directory: `C:\cybersaarthi`

### Step 1: Start the FastAPI Backend
```powershell
cd C:\cybersaarthi
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Health Check: Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) — returns `{"status":"healthy","database":"connected"}`.*

### Step 2: Start the React Frontend
```powershell
cd C:\cybersaarthi\frontend
npm run dev
```
*The Vite frontend binds to [http://localhost:5174](http://localhost:5174) (or [http://localhost:5173](http://localhost:5173)) and automatically proxies all `/api/*` traffic to FastAPI on port 8000.*

---

## 5. Verification & Testing

### Run Backend Automated Tests
```powershell
cd C:\cybersaarthi
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```
**Test Results**:
- `test_api.py`: 7 passed (Health, complaints list, overview metrics, complaint submit, citizen metrics, officer field correction provenance).
- `test_auth.py`: 6 passed (Officer login, citizen login, portal segregation, credential validation, registration, auth guard).
- `test_graph.py`: 1 passed (Shared indicator link creation and lead notice).
- `test_ocr_evaluation.py`: 2 passed (Synthetic receipt OCR benchmark, corrupted file handling).
- `test_verification.py`: 7 passed (Amount formats, UPI cleanup, Txn ID normalization, match, mismatch, missing evidence/complaint).
- `test_voice.py`: 2 passed (Silence audio detection, missing audio rejection).

### Run Frontend Production Build
```powershell
cd C:\cybersaarthi\frontend
cmd /c "npm run build"
```
*Compiles with zero TypeScript errors and generates optimized production assets.*

---

## 6. Project Directory Structure

```
cybersaarthi/
├── README.md                      # Project documentation and user manual
├── cybersaarthi.db                # Persistent SQLite database (WAL mode)
├── docs/
│   ├── architecture.md            # System architecture and workflows
│   ├── data-dictionary.md         # Database schema and column dictionary
│   ├── api-contracts.md           # REST API request/response specifications
│   ├── security-and-privacy.md    # Security, RBAC, and provenance rules
│   ├── test-plan.md               # Formal test plan and execution status
│   └── system-audit.md            # Comprehensive initial repository audit
├── backend/
│   ├── requirements.txt           # Python package requirements
│   ├── pytest.ini                # Pytest configuration
│   ├── app/
│   │   ├── main.py                # FastAPI app assembly and CORS setup
│   │   ├── api/                   # REST API routes (auth, voice, complaints, evidence, overview, graph, reports)
│   │   ├── core/
│   │   │   ├── config.py          # Environment settings
│   │   │   └── security.py        # PBKDF2 hashing, JWT tokens, RBAC dependencies
│   │   ├── db/
│   │   │   ├── schema.sql         # Database table definitions
│   │   │   └── init_db.py         # DB migration and seed provisioning
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   └── services/              # Core business engines (voice, OCR, verify, graph, report)
│   └── tests/                     # Automated test suites
└── frontend/
    ├── package.json               # Node dependencies
    ├── vite.config.ts             # Vite bundler & /api proxy configuration
    └── src/
        ├── App.tsx                # Client-side router and RBAC route guards
        ├── components/            # Header, VoiceRecorder, Badges, StatCards, Disclaimers
        ├── layouts/               # CitizenLayout and OfficerLayout
        ├── pages/                 # Citizen & Officer workspaces
        ├── services/api.ts        # Authenticated API client
        └── types/index.ts         # TypeScript data contracts
```

---

## 7. Statutory Notices & Disclaimers

1. **National Cybercrime Helpline**:
   In cases of ongoing financial fraud, victims should immediately dial **1930** (National Cybercrime Reporting Portal, MHA) or report to their home banking branch within the "Golden Hours" to initiate debit freeze protocols.
2. **Investigative Support Disclaimer**:
   CyberSaarthi is an investigation-support and evidence triage platform. Automated discrepancy detections, OCR token extractions, and graph links are provided to assist investigating officers; they do not pronounce legal guilt or final judicial disposition.
