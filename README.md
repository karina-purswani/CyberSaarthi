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
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```
**Test Suite Results (46 passed, 0 failures)**:
- `test_api.py`: 7 passed (Health, complaints list, overview metrics, complaint submit, citizen metrics, officer field correction provenance).
- `test_auth.py`: 6 passed (Officer login, citizen login, portal segregation, credential validation, registration, auth guard).
- `test_consistency_matrix.py`: 10 passed (Matching values, amount conflicts, txn ID conflicts, missing complaint values, missing evidence values, zero evidence, multi-evidence conflicts, 404 unknown case, 403 unauthorized access, malformed payload recovery).
- `test_graph.py`: 2 passed (Shared indicator links, category/relationship filtering, search, and empty handling).
- `test_import_and_evidence.py`: 5 passed (CSV preview/execute, JSON preview/execute, duplicate/invalid rejection, evidence upload to existing case, SQLite WAL persistence across connection resets).
- `test_ocr_evaluation.py`: 2 passed (Synthetic receipt OCR benchmark, corrupted file handling).
- `test_report_pdf.py`: 5 passed (PDF generation for real case, pypdf text verification, empty evidence handling, 404 rejection, 403 unauthorized citizen rejection).
- `test_verification.py`: 7 passed (Amount formats, UPI cleanup, Txn ID normalization, match, mismatch, missing evidence/complaint).
- `test_voice.py`: 2 passed (Silence audio detection, missing audio rejection).

### Run Frontend Production Build
```powershell
npm --prefix frontend run build
```
*Compiles cleanly with zero TypeScript errors and generates optimized production assets.*

---

## 6. Detailed Feature & Architectural Specifications

### 6.1 Evidence Consistency Matrix (P1)
- Compares complaint-reported claims with OCR-extracted receipt tokens across `transaction_amount`, `upi_id`, and `transaction_id`.
- **Dual Status Reporting**:
  - **High-Level Display Status**: `Consistent` (exact match), `Inconsistent` (direct conflict/mismatch), `Insufficient Data` (missing in complaint, missing in evidence, or zero evidence).
  - **Underlying 6-State Engine Semantics**: `MATCH`, `MISMATCH`, `MISSING_IN_COMPLAINT`, `MISSING_IN_EVIDENCE`, `UNABLE_TO_VERIFY`, `MANUAL_REVIEW_REQUIRED`.
- Multi-evidence support: Evaluates all evidence items attached to a complaint; if multiple receipts disagree, source filenames and conflicting values are explicitly noted.
- Zero-evidence support: When a complaint has no attached receipt, cleanly returns `Insufficient Data` (`MISSING_IN_EVIDENCE`) without runtime exceptions.
- Statutory Note: Mismatches represent preliminary investigative leads and are explicitly disclaimed as non-accusatory.

### 6.2 Persistent Structured Import & Evidence Upload (P1)
- **Batch Complaint Ingestion**:
  - Accessible in Officer Console at `/officer/import` or via Complaint Queue header button.
  - Supports CSV and JSON array formats.
  - Required fields: `incident_type`, `description`.
  - Optional fields: `reported_amount`, `reported_upi_id`, `reported_txn_id`, `victim_phone`, `victim_state`, `priority`, `language`.
  - Ingestion Workflow:
    1. Upload file (`POST /api/complaints/import/preview`).
    2. Review row-level validation status, error messages, and duplicate flags.
    3. Option to skip duplicate records with matching reference IDs.
    4. Transactional batch ingestion (`POST /api/complaints/import/execute`).
    5. Automatic recalculation of verification findings and intelligence graph indexing.
- **Evidence Upload for Existing Cases**:
  - Officers can attach additional evidence to any existing case via `POST /api/complaints/{id}/evidence`.
  - Validates image content via PIL, assigns a secure UUID storage filename, saves to `storage/evidence/`, runs RapidOCR, and updates the consistency matrix immediately.

### 6.3 Investigation Report PDF Export (P1)
- Server-side PDF generation using ReportLab (`GET /api/reports/{id}/pdf`).
- A4 format with 2-pass dynamic page numbering ("Page X of Y"), running headers, and official CyberSaarthi branding.
- Report contents:
  - Case metadata & reference ID
  - Incident narrative & complainant contact
  - Uploaded evidence inventory with OCR confidence scores
  - Evidence consistency verification matrix with source evidence attribution
  - Extracted financial and technical entities
  - Cross-complaint investigative leads with matching indicator provenance
  - Officer review notes & case history audit trail
  - Section 65B statutory disclaimer and signature seal box.

### 6.4 Cross-Intelligence Graph (P2)
- Multi-category entity network: `COMPLAINT`, `EVIDENCE`, `PERSON`, `UPI_ID`, `PHONE_NUMBER`, `TRANSACTION_ID`, `BANK_ACCOUNT`, `IP_ADDRESS`.
- Relationship types:
  - `DIRECT_OBSERVED`: Directly observed values extracted from evidence (solid line).
  - `INVESTIGATIVE_LEAD`: Cross-complaint shared suspect indicator (dashed line).
  - `EVIDENCE_LINK`: Evidence attachment link (dotted line).
- Interactive Canvas Capabilities:
  - Zoom in / out (+ / -) and reset view.
  - Canvas pan and node dragging to rearrange graph layout.
  - Search bar: filter nodes by reference ID, phone, UPI, or person name with real-time highlighting.
  - Category filter chips (All, Cases, Evidence, UPI, Phone, etc.).
  - Relationship filter (All, Direct Observed, Investigative Leads).
  - Node selection: 1-hop direct neighbor highlighting with background dimming.
  - Provenance Inspector Drawer: displays entity attributes, basis rule, and source evidence file.

### 6.5 Consolidated Admin/Investigation Dashboard (P2)
- Unified operational workspace at `/officer`:
  - `/officer` — Overview dashboard with live SQLite metrics
  - `/officer/queue` — Multi-filter triage queue
  - `/officer/complaints/:id` — Case workspace with consistency matrix, PDF export, and evidence upload
  - `/officer/import` — Batch ingestion for CSV and JSON
  - `/officer/evidence` — Side-by-side evidence review and manual field correction
  - `/officer/graph` — Interactive cross-intelligence graph
  - `/officer/reports` & `/officer/reports/:id` — Web dossier viewer and PDF exporter
- Full Citizen Portal segregation: Citizen views (`/citizen/*`) remain strictly sandboxed to their own complaints.

---

## 7. Storage, Persistence & Deployment Notes

- **Database Location**: `cybersaarthi.db` in project root. SQLite Write-Ahead Logging (`WAL`) mode enabled.
- **Evidence Storage**: `storage/evidence/`. Evidence files are stored with random UUID filenames.
- **Persistence Guarantee**: All complaints, evidence files, OCR tokens, verification findings, and graph links persist across application restarts.
- **Backup & Recovery**:
  - Backup: `sqlite3 cybersaarthi.db ".backup 'cybersaarthi_backup.db'"`
  - Safe restoration: Ensure FastAPI is stopped, copy backup to `cybersaarthi.db`, and restart.
- **Online Deployment Requirement**: In production/cloud environments, configure persistent volume mounts for `cybersaarthi.db` and `storage/evidence/`.

---

## 8. Statutory Notices & Disclaimers

1. **National Cybercrime Helpline**:
   In cases of ongoing financial fraud, victims should immediately dial **1930** (National Cybercrime Reporting Portal, MHA) or report to their home banking branch within the "Golden Hours" to initiate debit freeze protocols.
2. **Investigative Support Disclaimer**:
   CyberSaarthi is an investigation-support and evidence triage platform. Automated discrepancy detections, OCR token extractions, and graph links are provided to assist investigating officers; they do not pronounce legal guilt or final judicial disposition.

