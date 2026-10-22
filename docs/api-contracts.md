# CyberSaarthi API Contracts & Endpoints

This document specifies the REST API endpoints, request schemas, response formats, authentication requirements, and HTTP status codes for CyberSaarthi.

---

## 1. Authentication Endpoints

### 1.1 Register Citizen Account
- **Route**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123",
    "full_name": "Nikhil Sharma",
    "phone": "9876543210"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "access_token": "<jwt_string>",
    "token_type": "bearer",
    "user": {
      "id": "usr_9f82ab14d7c3",
      "email": "user@example.com",
      "full_name": "Nikhil Sharma",
      "role": "CITIZEN",
      "phone": "9876543210",
      "created_at": "2026-10-22T19:00:00Z"
    }
  }
  ```

### 1.2 User Login
- **Route**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "officer@cybersaarthi.gov.in",
    "password": "Officer@CyberSaarthi2026",
    "portal_type": "officer"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "<jwt_string>",
    "token_type": "bearer",
    "user": {
      "id": "usr_officer_shinde",
      "email": "officer@cybersaarthi.gov.in",
      "full_name": "Inspector Ramesh Shinde",
      "role": "OFFICER",
      "phone": "+91-98200-11930",
      "created_at": "2026-10-22T00:00:00Z"
    }
  }
  ```
- **Error Codes**: `401 Unauthorized` (invalid password/email), `403 Forbidden` (citizen attempting officer login).

### 1.3 Current User Profile
- **Route**: `GET /api/auth/me`
- **Header**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): `User` object.

### 1.4 Change Password
- **Route**: `POST /api/auth/change-password`
- **Header**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "current_password": "CurrentPassword123",
    "new_password": "NewStrongPassword456"
  }
  ```
- **Response** (`200 OK`): `{"success": true, "message": "Password updated successfully."}`

---

## 2. Voice Transcription Endpoint

### 2.1 Transcribe Audio Statement
- **Route**: `POST /api/voice/transcribe`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `audio_file`: Binary audio recording (16kHz PCM WAV format).
  - `language`: Target speech language code (`en`, `hi`, `mr`).
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "transcript": "I received a phone call from someone claiming to be an electricity department officer threatening disconnection.",
    "language": "en",
    "engine": "SpeechRecognition (Google Speech Engine API)",
    "duration_seconds": 12.4
  }
  ```
- **Error Codes**: `400 Bad Request` (silence detected, unintelligible audio), `413 Payload Too Large`.

---

## 3. Complaint Ingestion & Retrieval

### 3.1 Submit Complaint
- **Route**: `POST /api/complaints/submit`
- **Content-Type**: `multipart/form-data`
- **Header**: `Authorization: Bearer <token>` (optional; links to user if provided)
- **Form Fields**:
  - `language`: `en` | `hi` | `mr`
  - `incident_type`: string
  - `description`: string (written or transcribed voice statement)
  - `reported_amount`: float string (e.g. `"45000"`)
  - `reported_txn_id`: string (claimed UTR / Txn reference)
  - `reported_upi_id`: string (claimed suspect UPI handle)
  - `incident_datetime`: string
  - `victim_phone`: string
  - `victim_state`: string
  - `evidence_file`: File (optional receipt screenshot)
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "complaint_id": "cmp_8d91a27b",
    "reference_id": "CR-2026-0312-9842",
    "message": "Complaint successfully registered."
  }
  ```

### 3.2 List Complaints
- **Route**: `GET /api/complaints`
- **Header**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `search`: string filter
  - `status`: string filter
  - `priority`: string filter
  - `limit`: int (default 50)
  - `offset`: int (default 0)
- **Behavior**: If caller is a `CITIZEN`, results are strictly filtered to complaints filed by their account.
- **Response** (`200 OK`):
  ```json
  {
    "total": 35,
    "items": [
      {
        "id": "cmp_8d91a27b",
        "reference_id": "CR-2026-0312-9842",
        "submission_time": "2026-10-22T14:30:00Z",
        "incident_type": "UPI Fraud",
        "reported_amount": 45000.0,
        "evidence_count": 1,
        "status": "VERIFIED",
        "priority": "HIGH"
      }
    ]
  }
  ```

### 3.3 Get Complaint Detail
- **Route**: `GET /api/complaints/{id}`
- **Header**: `Authorization: Bearer <token>`
- **Behavior**: If caller is a `CITIZEN`, internal officer notes and cross-case leads are redacted.
- **Response** (`200 OK`):
  ```json
  {
    "complaint": { ... },
    "evidence_files": [ ... ],
    "extracted_fields": [ ... ],
    "verification_findings": [ ... ],
    "status_history": [ ... ],
    "reviewer_notes": [ ... ],
    "related_leads": [ ... ]
  }
  ```

---

## 4. Evidence Inspection & Field Correction

### 4.1 Get Evidence Details
- **Route**: `GET /api/evidence/{id}`
- **Header**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): Returns original filename, storage filename, OCR confidence, raw OCR text, and extracted fields.

### 4.2 Stream Evidence File Image
- **Route**: `GET /api/evidence/file/{filename}`
- **Access**: Protected by path containment; returns image byte stream.

### 4.3 Correct Extracted Field (Officer Only)
- **Route**: `POST /api/complaints/{complaint_id}/evidence/{evidence_id}/fields/{field_id}/correct`
- **Header**: `Authorization: Bearer <token>` (Role: `OFFICER` or `ADMIN`)
- **Request Body**:
  ```json
  {
    "corrected_value": "45000.00",
    "reason": "OCR misread '0' as '8' due to font artifact on receipt screenshot."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "field_id": "ef_12345",
    "is_officer_corrected": true,
    "corrected_value": "45000.00",
    "original_value": "45800.00",
    "reason": "OCR misread '0' as '8' due to font artifact on receipt screenshot.",
    "corrected_by": "usr_officer_shinde",
    "message": "Field corrected and verification re-evaluated."
  }
  ```

---

## 5. Intelligence Graph & Reporting

### 5.1 Fetch Intelligence Graph
- **Route**: `GET /api/graph`
- **Header**: `Authorization: Bearer <token>` (Officer Only)
- **Query Parameters**:
  - `focus_complaint_id`: Target complaint ID to isolate 1-hop neighborhood.
  - `indicator_type`: Legacy filter for specific indicator type (`UPI_ID`, `PHONE_NUMBER`, `TRANSACTION_ID`).
  - `category`: Entity filter (`COMPLAINT`, `EVIDENCE`, `PERSON`, `UPI_ID`, `PHONE_NUMBER`, `TRANSACTION_ID`, `BANK_ACCOUNT`, `IP_ADDRESS`).
  - `relationship_type`: Edge classification (`DIRECT_OBSERVED`, `INVESTIGATIVE_LEAD`, `EVIDENCE_LINK`).
  - `search`: Case reference ID, indicator string, or victim name query.
- **Response** (`200 OK`):
  ```json
  {
    "nodes": [
      { "id": "cmp_1", "type": "COMPLAINT", "category": "COMPLAINT", "label": "CR-2026-0312-9842" },
      { "id": "ind_1", "type": "INDICATOR", "category": "UPI_ID", "label": "fraudster@upi", "indicator_type": "UPI_ID" }
    ],
    "edges": [
      {
        "id": "rel_1",
        "source": "cmp_1",
        "target": "ind_1",
        "relation": "SHARED_INDICATOR",
        "relationship_type": "INVESTIGATIVE_LEAD",
        "rule_applied": "CITIZEN_REPORTED_UPI_MATCH",
        "explanation": "Citizen reported UPI handle matches syndicate account"
      }
    ],
    "clusters": [ ... ],
    "lead_disclaimer": "Statutory non-accusatory notice..."
  }
  ```

### 5.2 Fetch Investigation Report Dossier (JSON)
- **Route**: `GET /api/reports/{id}`
- **Header**: `Authorization: Bearer <token>` (Officer Only)
- **Response** (`200 OK`): Formatted Section 65B dossier with complaint summary, verification matrix, attached evidence list, and formal bank freeze requisition draft.

### 5.3 Export Investigation Report PDF
- **Route**: `GET /api/reports/{id}/pdf`
- **Header**: `Authorization: Bearer <token>` (Officer or Owner Citizen)
- **Response** (`200 OK`):
  - **Headers**:
    - `Content-Type: application/pdf`
    - `Content-Disposition: attachment; filename="CyberSaarthi_Dossier_<REFERENCE_ID>.pdf"`
  - **Body**: Server-generated binary PDF bytes with running headers, page numbers ("Page X of Y"), Section 65B compliance note, evidence inventory, and consistency matrix.

---

## 6. Batch Complaint Ingestion & Evidence Attachment

### 6.1 Preview Batch Ingestion File
- **Route**: `POST /api/complaints/import/preview`
- **Header**: `Authorization: Bearer <token>` (Officer / Admin Only)
- **Content-Type**: `multipart/form-data` (`file`: CSV or JSON)
- **Response** (`200 OK`):
  ```json
  {
    "total_records": 10,
    "valid_records": 9,
    "error_records": 1,
    "duplicate_records": 1,
    "format": "csv",
    "preview": [
      {
        "row_number": 1,
        "is_valid": true,
        "is_duplicate": false,
        "errors": [],
        "data": { "incident_type": "UPI Fraud", "description": "...", "reported_amount": 15000.0 }
      }
    ]
  }
  ```

### 6.2 Execute Batch Ingestion
- **Route**: `POST /api/complaints/import/execute`
- **Header**: `Authorization: Bearer <token>` (Officer / Admin Only)
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "records": [ { "incident_type": "UPI Fraud", "description": "..." } ],
    "skip_duplicates": true
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "total": 1,
    "imported": 1,
    "skipped": 0,
    "rejected": 0,
    "created_ids": ["cmp_984128471204"],
    "reference_ids": ["CR-2026-1022-9482"],
    "errors": []
  }
  ```

### 6.3 Attach Evidence to Existing Case
- **Route**: `POST /api/complaints/{complaint_id}/evidence`
- **Header**: `Authorization: Bearer <token>` (Officer or Owner Citizen)
- **Content-Type**: `multipart/form-data` (`file`: PNG/JPEG/WEBP/PDF)
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "evidence_id": "ev_482910482910",
    "storage_filename": "uuid.png",
    "original_filename": "receipt_screenshot.png",
    "ocr_status": "COMPLETED",
    "extracted_fields": 3,
    "message": "Evidence successfully processed and consistency verification updated."
  }
  ```

