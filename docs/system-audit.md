# CyberSaarthi System Audit & Refactoring Baseline

**Date:** October 2026  
**Auditor:** CyberSaarthi Core Engineering  
**Application Scope:** `C:/cybersaarthi`  
**Database Snapshot:** `cybersaarthi.db.bak` created (34 existing complaints preserved).

---

## 1. Current Architecture

CyberSaarthi operates as an asynchronous client-server architecture:
- **Frontend**: Single Page Application built with React 19, TypeScript 6, and Vite 8, utilizing React Router 7. Routing currently exposes both Citizen Intake (`/`) and Officer Workspace (`/officer`) without authentication barriers.
- **Backend Core**: FastAPI (Python 3.14) running locally with Uvicorn. Exposes REST endpoints under `/api`.
- **Database**: SQLite3 configured with Write-Ahead Logging (`WAL`) and `PRAGMA foreign_keys = ON`.
- **Inference Services**: Local RapidOCR (CPU ONNX runtime) executing screenshot OCR; deterministic Python rules for 6-state consistency verification; graph relationship linker for cross-complaint indicators.

---

## 2. Existing Functional Modules

1. **Citizen Intake Form (`/`)**: Multi-lingual text fields (EN/HI/MR) + payment screenshot dropzone (`POST /api/complaints/submit`).
2. **Evidence Extraction (`app/services/evidence_extraction.py`)**: RapidOCR CPU pipeline extracting raw text and structured regex tokens (Amount, Txn ID, UPI, Phone, App).
3. **Verification Engine (`app/services/verification_engine.py`)**: 6-state deterministic consistency check (`MATCH`, `MISMATCH`, `MISSING_IN_COMPLAINT`, `MISSING_IN_EVIDENCE`, `UNABLE_TO_VERIFY`, `MANUAL_REVIEW_REQUIRED`).
4. **Intelligence Graph (`app/services/intelligence_graph.py`)**: Shared indicator linker (`UPI_ID`, `PHONE_NUMBER`, `TRANSACTION_ID`) connecting complaints.
5. **Officer Overview & Triage Queue (`/officer`, `/officer/queue`)**: Filterable data table of active complaints with priority tags and discrepancy counts.
6. **Case Detail & Evidence Review (`/officer/complaints/:id`)**: Provenance-tagged case inspection, side-by-side OCR viewer, reviewer notes submission.
7. **Dossier Generator (`app/services/report_generation.py`)**: Automated investigation-support summary with statutory lead notice.

---

## 3. Current Data Flow

```
[Citizen Browser]
       │
       ▼ (POST /api/complaints/submit - Multipart Form)
[FastAPI Backend: complaints.py]
       ├─► [storage/evidence/{uuid}.ext] (Raw receipt file)
       ├─► [RapidOCR ONNX Engine] ──► [Structured Regex Parser]
       ├─► [Verification Engine] (Deterministic Claim vs Receipt)
       ├─► [Graph Linker] (Registers UPI/Phone/Txn indicators)
       └─► [SQLite: cybersaarthi.db] (complaints, evidence, findings, graph)
```

---

## 4. Current Database Tables & Relationships

- `complaints`: Core record (id, reference_id, submission_time, language, incident_type, description, reported_amount, reported_txn_id, reported_upi_id, status, priority, is_demo).
- `evidence_files`: Evidence file metadata (id, complaint_id FK, original_filename, storage_filename, file_type, ocr_status, raw_ocr_text, ocr_confidence).
- `extracted_fields`: Structured OCR tokens (id, evidence_id FK, complaint_id FK, field_name, raw_value, normalized_value, confidence, source_context).
- `verification_findings`: Verification records (id, complaint_id FK, evidence_id FK, field_name, complaint_value, evidence_value, result, reason, review_recommendation).
- `graph_indicators`: Unique indicators (id, indicator_type, raw_value, normalized_value).
- `graph_relationships`: Links (id, complaint_id FK, indicator_id FK, rule_applied, explanation).
- `reviewer_notes`: Officer triage notes (id, complaint_id FK, reviewer_name, note, review_status).

---

## 5. Security & Authorization Gaps

1. **Zero Authentication**: All `/api/complaints`, `/api/evidence`, `/api/graph`, and `/api/reports` endpoints are unauthenticated.
2. **Missing User Identity**: Complaints do not have an associated `user_id` or citizen account. Anyone visiting `/officer` can inspect, review, or add notes to any complaint.
3. **No Separation of Experiences**: The header contains links switching between "Citizen Intake" and "Officer Workspace" seamlessly on the same page.
4. **Public Evidence Storage**: Anyone knowing or guessing the storage file path could potentially read evidence files without authorization checks.

---

## 6. Mock Data & Demo UI Locations

1. **Frontend Demo Controls**:
   - `Header.tsx`: Contains "Sample Data" pill and `<button title="Reset sample demonstration database" onClick={handleResetDemo}>`.
   - `demo.py`: `POST /api/demo/reset` and `GET /api/demo/cases` which auto-seed 5 predefined cases from `data/demo_cases.json`.
   - `main.py`: Lifespan automatically runs `seed_demo_data()` if complaints table has 0 rows.
2. **Queue Page Demo Tags**:
   - `QueuePage.tsx` and `OverviewPage.tsx`: Displays `SAMPLE` or `DEMO` badge beside reference IDs.
3. **Citizen Intake Preset**:
   - Auto-fill or preset buttons in intake if present.

---

## 7. OCR & Voice-Processing Limitations

1. **Voice Input Limitation**:
   - Previously only supported static audio file upload (`.mp3`, `.wav`) via the dropzone.
   - No direct in-browser microphone recording (`MediaRecorder`).
   - No speech-to-text transcription engine was executed; uploaded audio files remained untranscribed.
2. **OCR Limitations**:
   - Image preprocessing (skew/contrast enhancement) was minimal.
   - Low-resolution fonts previously produced character confusion (e.g. `Txn ID.` with dots or currency glyph misreads).
   - No officer manual correction UI with provenance audit trail.

---

## 8. Existing Defects & Fixes Already Applied

- **Fixed**: OCR regex pattern tolerances in `backend/app/services/evidence_extraction.py` to correctly extract amounts with currency symbols and UTRs with periods/dashes.
- **Identified**: Need for persistent User and Authentication models, direct audio recording with real Speech-to-Text transcription, clean role-based dashboards, and complete removal of demo UI elements.

---

## 9. Planned Implementation Sequence

1. **Database Schema & Data Model (Phase 2)**:
   - Add `users` table (password_hash, email, role: 'CITIZEN' | 'OFFICER' | 'ADMIN', full_name, created_at).
   - Add `user_id` column to `complaints` table (safely migrating existing 34 records).
   - Add `audit_logs` table and `complaint_status_history` table.
   - Add officer corrections support to `extracted_fields`.
2. **Backend Authentication & Authorization (Phase 2)**:
   - Implement `core/security.py`: PBKDF2 password hashing + JWT token issue/decode.
   - Add `/api/auth/register`, `/api/auth/login`, `/api/auth/me`.
   - Add route dependencies (`get_current_user`, `require_role(["OFFICER", "ADMIN"])`).
   - Restrict citizen queries to `user_id == current_user.id`.
3. **Voice Recording & Transcription Pipeline (Phase 3 & 4)**:
   - Frontend MediaRecorder component on intake page: record, pause/resume, playback, waveform, retake.
   - Backend transcription endpoint `POST /api/voice/transcribe` utilizing `SpeechRecognition` supporting English, Hindi, and Marathi (`en-IN`, `hi-IN`, `mr-IN`).
   - Returned transcript populated into citizen review box for verification before submission.
4. **Separate Portals & Clean UI (Phase 3 & 5)**:
   - Public Landing Page (`/`): Civic-tech presentation, separate login buttons.
   - Citizen Portal (`/citizen/*`): Citizen Dashboard, New Complaint, My Complaints, Case Status, Profile.
   - Officer Workspace (`/officer/*`): Officer Overview, Queue, Case Detail, Evidence Review with manual correction, Graph, Reports.
   - Remove all demo banners, sample data badges, reset buttons, and auto-seeding.
5. **Testing, Accuracy Evaluation & Documentation (Phase 6)**:
   - OCR test set evaluation report.
   - Comprehensive Pytest suite + Frontend build verification.
   - Updated documentation (`architecture.md`, `data-dictionary.md`, `api-contracts.md`, `security-and-privacy.md`, `test-plan.md`, `README.md`).
