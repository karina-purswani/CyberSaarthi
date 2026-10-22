# CyberSaarthi — Implementation Audit & Baseline Analysis

**Date:** October 2026  
**Auditor / Engineering Role:** Senior Full-Stack & Security Engineer  
**Workspace Path:** `d:\CyberSaarthi`  
**Current Git Branch:** `cybersaarthi-local-upload`  
**Active Database:** `d:\CyberSaarthi\cybersaarthi.db` (SQLite with WAL & Foreign Keys enabled)  
**Evidence Storage:** `d:\CyberSaarthi\storage\evidence`  

---

## 1. Executive Summary & Verification of Workspace

The active repository has been inspected and confirmed as the genuine **CyberSaarthi — Cyber-Fraud Evidence Intelligence Platform**.
- **No external/unrelated codebases** (e.g., HireSprint) are referenced or present.
- The existing SQLite database at `d:\CyberSaarthi\cybersaarthi.db` has been inspected. All historical complaint records, evidence files, extracted fields, verification findings, graph indicators, and users are intact.
- Baseline automated backend test suite status: **25 passed out of 25** (executed via `.venv\Scripts\pytest backend\tests -v`).
- Baseline frontend production build status: **Compiled cleanly in 1.59s with 0 errors** (executed via `npm --prefix frontend run build`).

---

## 2. Current Architecture & Key File Paths

| Subsystem | File Path | Purpose & Responsibilities |
| :--- | :--- | :--- |
| **FastAPI Entrypoint** | `backend/app/main.py` | Application lifespan, router registry, CORS middleware |
| **System Settings** | `backend/app/core/config.py` | Storage directories, DB paths, JWT secret, upload limits |
| **Auth & Security** | `backend/app/core/security.py` | PBKDF2 hashing, JWT token handling, RBAC route guards |
| **Database Pool** | `backend/app/db/database.py` | SQLite connection provider (`WAL`, `foreign_keys=ON`) |
| **Database DDL** | `backend/app/db/schema.sql` | Relational tables (`users`, `complaints`, `evidence_files`, `extracted_fields`, `verification_findings`, `graph_indicators`, `graph_relationships`, `reviewer_notes`, `audit_logs`) |
| **DB Migrations & Seed** | `backend/app/db/init_db.py` | Idempotent table migrations and default account bootstrapper |
| **Evidence Extraction** | `backend/app/services/evidence_extraction.py` | RapidOCR CPU ONNX inference and entity regex parser |
| **Verification Engine** | `backend/app/services/verification_engine.py` | Deterministic 6-state field comparison engine |
| **Field Normalizers** | `backend/app/services/field_normalization.py` | Indian Rupee amount, UPI VPA, UTR, phone normalizers |
| **Intelligence Graph** | `backend/app/services/intelligence_graph.py` | Shared indicator indexing and relationship linker |
| **Report Generation** | `backend/app/services/report_generation.py` | Structured JSON dossier assembler |
| **Complaints Router** | `backend/app/api/complaints.py` | Citizen intake, triage queue, case details, field correction |
| **Evidence Router** | `backend/app/api/evidence.py` | Safe streaming with directory traversal protection |
| **Graph Router** | `backend/app/api/graph.py` | Graph nodes, edges, clusters, and non-accusatory disclaimer |
| **Reports Router** | `backend/app/api/reports.py` | Case dossier endpoint |
| **Frontend Router** | `frontend/src/App.tsx` | Route definitions with `RequireCitizen` and `RequireOfficer` guards |
| **Officer Workspace** | `frontend/src/layouts/OfficerLayout.tsx` | Operational layout (Overview, Queue, Evidence, Graph, Reports) |
| **Citizen Workspace** | `frontend/src/layouts/CitizenLayout.tsx` | Segregated portal (Dashboard, New Complaint, Complaints, Profile) |
| **API Client** | `frontend/src/services/api.ts` | Authenticated fetch wrappers and response typings |

---

## 3. Baseline Verification Results

### A. Backend Pytest Suite
Ran: `.venv\Scripts\pytest backend\tests -v`
- `tests/test_api.py`: 7 passed (health, demo cases, complaints list, overview metrics, complaint submission, citizen metrics, officer field correction provenance).
- `tests/test_auth.py`: 6 passed (officer login, citizen login, portal segregation 403, invalid login 401, registration & me, unauthorized 401).
- `tests/test_graph.py`: 1 passed (shared indicator creates cross-case relationship link).
- `tests/test_ocr_evaluation.py`: 2 passed (OCR benchmark evaluation, corrupted/empty file handling).
- `tests/test_verification.py`: 7 passed (amount normalization, UPI normalization, UTR normalization, match verification, mismatch verification, missing complaint field, missing evidence field).
- `tests/test_voice.py`: 2 passed (silence audio 400 rejection, missing audio 400).
- **Total: 25 passed, 0 failed in 8.93s.**

### B. Frontend Production Build
Ran: `npm --prefix frontend run build`
- Output: `tsc -b && vite build`
- 1,963 modules transformed.
- Bundle sizes: `dist/index.html` (0.85 kB), `dist/assets/index.css` (2.46 kB), `dist/assets/index.js` (446.63 kB).
- **Result: 0 errors, compiled cleanly in 1.59s.**

---

## 4. Diagnosed Defects, Root Causes & Implementation Plan

### Defect 1: Evidence Consistency Matrix Data Flow & Multi-Evidence Shortcomings
- **Symptom:**
  - Cases submitted without evidence show an empty matrix rather than evaluating missing evidence fields.
  - Complaints with multiple attached receipts overwrite single extracted fields, losing multi-receipt attribution.
  - The UI does not clearly display normalized values, source evidence file provenance, or map 6-state outcomes to the required user-friendly display statuses (`Consistent`, `Inconsistent`, `Insufficient Data`).
- **Root Cause:**
  - `verification_engine.py` was only invoked upon initial multipart submission when a single file was passed.
  - Database table `verification_findings` records `evidence_id`, but the query in `get_complaint_details` does not join with `evidence_files` to provide source filenames and provenance.
  - The frontend `DiscrepancyBadge.tsx` directly renders raw engine codes (`MATCH`, `MISMATCH`) instead of a two-tiered display model showing both the human-friendly status and the underlying deterministic state.
- **Fix:**
  - Enhance verification service to evaluate cases even with 0 evidence files (marking reported fields as `Insufficient Data / Missing in Evidence`).
  - Support multi-evidence verification by evaluating each evidence file with explicit source attribution (`evidence_filename`, `storage_filename`).
  - Expose normalized complaint value, normalized evidence value, source evidence reference, rule explanation, and provenance in both API and frontend.
  - Map states to `Consistent`, `Inconsistent`, and `Insufficient Data` while preserving the 6-state engine integrity.

### Defect 2: Missing Persistent Structured Import & Evidence Upload
- **Symptom:**
  - No mechanism exists to import structured CSV or JSON complaint records.
  - No dedicated endpoint exists to upload additional evidence files to an existing case.
- **Root Cause:**
  - Capabilities were omitted from initial intake routes.
- **Fix:**
  - Implement `POST /api/complaints/import/preview` and `POST /api/complaints/import/execute` with schema validation, row-level error reporting, duplicate detection, and transactional DB writes.
  - Implement `POST /api/complaints/{complaint_id}/evidence` with file content type sniffing, UUID storage filename generation, path containment, OCR extraction, verification recalculation, and graph indicator updates.
  - Provide an accessible Import & Evidence Upload UI in the operational officer workspace.

### Defect 3: Missing Server-Generated Investigation Report PDF Export
- **Symptom:**
  - In `ReportsPage.tsx`, only JSON export and browser window printing are supported; there is no server-side PDF download.
- **Root Cause:**
  - No PDF rendering library or PDF endpoint existed in `backend/app/api/reports.py`.
- **Fix:**
  - Integrate ReportLab in `report_generation.py` to produce a formal, multi-page A4 PDF dossier complete with CyberSaarthi branding, case metadata, evidence inventory, verification matrix, graph leads, officer notes, and statutory disclaimer.
  - Expose `GET /api/reports/{complaint_id}/pdf` with proper MIME type (`application/pdf`) and content-disposition header.
  - Add an "Export PDF" button to `ReportsPage.tsx` and `CaseDetailPage.tsx`.

### Defect 4: Cross-Intelligence Graph Data Correctness & Interactive Usability
- **Symptom:**
  - Graph only supports basic UPI, Phone, and Txn indicators.
  - SVG canvas is static: lacks pan, zoom, node drag, reset view, fit to screen, entity search, category filters, and direct connection highlighting.
- **Root Cause:**
  - Frontend SVG rendering is statically mapped without viewport transform state or mouse drag handlers.
- **Fix:**
  - Expand graph service to register and support meaningful categories supported by real data: Cases, Phone numbers, UPI handles, Transaction references, Bank accounts, IP addresses, and Evidence items.
  - Implement SVG viewport panning, zooming, node dragging, category filtering, search highlighting, and direct connection tracing in `GraphPage.tsx`.

### Defect 5: Consolidated Operational Admin/Investigation Dashboard
- **Symptom:**
  - Need to ensure single unified operational dashboard without duplicate navigation or disconnected views.
- **Fix:**
  - Confirm `/officer` serves as the unified operational investigation and admin workspace.
  - Integrate CSV/JSON import, evidence upload, consistency matrix, intelligence graph, and PDF export into this single workflow.
  - Verify that citizen portal remains strictly segregated.
