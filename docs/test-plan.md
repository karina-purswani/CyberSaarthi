# CyberSaarthi Comprehensive Test Plan

## 1. Scope & Quality Objectives
This test plan validates the accuracy, resilience, security, and traceability of the upgraded CyberSaarthi platform. Testing spans deterministic field normalization, the evidence consistency verification engine, in-browser direct voice statement recording, OCR benchmark extraction, multi-victim intelligence graph construction, authentication and role-based access control, and manual field correction provenance.

---

## 2. Test Execution Command & Baseline Status

All automated backend tests are executed via `pytest`:
```bash
backend/.venv/Scripts/python.exe -m pytest backend/tests -v
```
**Current Test Status**: **25 passed, 0 failed, 2 warnings** across 6 test modules in ~12 seconds.

Frontend production bundle compilation:
```bash
cmd /c "npm --prefix frontend run build"
```
**Current Build Status**: **0 errors, 0 warnings** (TypeScript strict compilation passed, Vite bundle generated in ~2.4s).

---

## 3. Test Suites

### Suite A: Authentication, RBAC & Portal Segregation (`test_auth.py`)
1. **Officer Login**: Authenticates `officer@cybersaarthi.gov.in` with PBKDF2 hash, issues valid JWT containing `role: OFFICER`.
2. **Citizen Login**: Authenticates `citizen@example.com`, issues valid JWT containing `role: CITIZEN`.
3. **Portal Segregation**: Rejects a citizen attempting to log into the Officer Console with `HTTP 403 Forbidden`.
4. **Invalid Credentials**: Rejects wrong passwords or unknown email addresses with `HTTP 401 Unauthorized`.
5. **Citizen Registration**: Registers a new citizen, saves PBKDF2-hashed password, auto-logs in, and verifies `/api/auth/me`.
6. **Unauthorized Route Protection**: Confirms unauthenticated calls to `/api/auth/me` return `HTTP 401`.

### Suite B: Voice Recording & Multilingual Transcription (`test_voice.py`)
1. **Silence Detection**: Sends empty/silent audio buffer to `POST /api/voice/transcribe`, verifies system returns a clean `HTTP 400` with descriptive error and **never fabricates a fake transcript**.
2. **Missing Audio Handling**: Verifies missing form payload returns `HTTP 422 Unprocessable Entity`.
3. **Format Validation**: Confirms 16kHz PCM WAV format compatibility without external ffmpeg dependencies.

### Suite C: Evidence Extraction & OCR Evaluation (`test_ocr_evaluation.py`)
1. **Synthetic OCR Benchmark**:
   - Generates high-fidelity synthetic payment receipts (PhonePe, Google Pay, Paytm) with known ground truth for:
     - Amount (`₹ 14,500.00`)
     - Txn ID / UTR (`UTR492019482910`)
     - UPI ID (`merchant.pay@okaxis`)
     - Timestamp (`22/10/2026 14:35`)
   - Evaluates RapidOCR extraction: **100% field extraction accuracy achieved** on standard receipt benchmarks.
2. **Corrupted File Handling**: Verifies that truncated, zero-byte, or corrupted images fail gracefully without crashing server threads.

### Suite D: Field Normalization & Verification Rules (`test_verification.py`)
1. **Amount Normalization**:
   - `₹ 25,000.00` -> `Decimal("25000.00")`
   - `Rs. 2,500/-` -> `Decimal("2500.00")`
   - `INR 1000` -> `Decimal("1000.00")`
   - Invalid formats (e.g. text only `Twenty thousand`) -> `None` without crashing.
2. **UPI ID Normalization**:
   - `Payee.Merchant@OkAxis ` -> `payee.merchant@okaxis` (lowercased, trimmed).
   - Invalid strings without `@` -> rejected/flagged.
3. **Transaction ID Normalization**:
   - Uniform uppercase and space stripping: `upi 29849204920` -> `UPI29849204920`.
4. **Consistency Verification Scenarios**:
   - **Exact Match**: Reported `25000.00`, Extracted `25000.00` -> `MATCH`.
   - **Mismatch**: Reported `25000.00`, Extracted `2500.00` -> `MISMATCH` with traceable reason.
   - **Missing in Complaint**: Stated `None`, Extracted `TXN123` -> `MISSING_IN_COMPLAINT`.
   - **Missing in Evidence**: Stated `TXN123`, Extracted `None` -> `MISSING_IN_EVIDENCE`.

### Suite E: Multi-Victim Intelligence Graph (`test_graph.py`)
1. **Shared Indicator Linking**:
   - Two complaints filed with a common suspect UPI handle (`fraudster@ybl`).
   - Intelligence graph connects both complaints to the common indicator node.
   - Provenance retains source complaint IDs, evidence reference, and investigative lead disclaimer.

### Suite F: Officer Field Correction & Audit Provenance (`test_api.py`)
1. **Officer Field Correction**:
   - Officer inspects an extracted field with a typo or OCR inaccuracy.
   - Submits `POST /api/complaints/{c_id}/evidence/{ev_id}/fields/{f_id}/correct`.
   - Confirms `is_officer_corrected` is set to `True`, pre-correction value stored in `original_value`, officer ID and reason recorded in database.
   - Confirms deterministic verification engine automatically recomputes finding for that field.

### Suite G: Citizen Scoping & API Integration (`test_api.py`)
1. **Citizen Metrics Scoping**: `GET /api/overview/citizen-metrics` returns aggregate stats for the logged-in citizen only.
2. **Complaint Ingestion**: `POST /api/complaints/submit` registers complaints, generates reference IDs (`CR-2026-...`), and links to the citizen user account.
