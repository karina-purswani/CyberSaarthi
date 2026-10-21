# CyberSaarthi API Contracts & Schemas

## Base URL
`/api`

---

## 1. System Health
### `GET /health`
- **Description**: Verifies backend service status, database connectivity, and OCR engine availability.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development",
  "ocr_engine": "rapidocr",
  "database": "connected",
  "timestamp": "2026-10-20T18:30:00Z"
}
```

---

## 2. Citizen Intake
### `POST /complaints/submit`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `language`: `str` ("en", "hi", "mr") [default: "en"]
  - `incident_type`: `str` ("UPI Fraud", "Investment Scam", "Phishing / Identity Theft", "Loan App Extortion", "Other")
  - `description`: `str` (required, written narrative)
  - `reported_amount`: `float | null` (optional victim-estimated amount)
  - `reported_txn_id`: `str | null` (optional victim-provided transaction ID)
  - `reported_upi_id`: `str | null` (optional victim-provided suspect UPI handle)
  - `incident_datetime`: `str | null` (optional ISO timestamp or date)
  - `victim_phone`: `str | null` (optional contact phone)
  - `victim_state`: `str | null` (optional state/jurisdiction)
  - `evidence_file`: `UploadFile | null` (screenshot/receipt image: PNG, JPG, WEBP, or audio file)
- **Response `201 Created`**:
```json
{
  "complaint_reference": "CS-2026-8941",
  "id": "c71a-45...",
  "submission_time": "2026-10-20T18:30:00Z",
  "status": "AWAITING_REVIEW",
  "evidence_count": 1,
  "extraction_summary": {
    "status": "COMPLETED",
    "extracted_amount": 25000.0,
    "extracted_txn_id": "UPI29849204920",
    "extracted_upi_id": "scam.merchant@okhdfcbank"
  },
  "verification_summary": {
    "total_fields_checked": 3,
    "matches": 3,
    "mismatches": 0,
    "missing": 0
  }
}
```

---

## 3. Officer Investigation
### `GET /overview/metrics`
- **Description**: Aggregate summary counts computed directly from database records.
- **Response `200 OK`**:
```json
{
  "total_complaints": 12,
  "awaiting_review": 5,
  "evidence_needing_manual_review": 2,
  "complaints_with_shared_indicators": 4,
  "recent_submissions": [...]
}
```

### `GET /complaints`
- **Query Params**: `status`, `search`, `limit`, `offset`, `priority`
- **Response `200 OK`**:
```json
{
  "total": 12,
  "items": [
    {
      "id": "uuid",
      "reference_id": "CS-2026-8941",
      "submission_time": "2026-10-20T18:30:00Z",
      "incident_type": "UPI Fraud",
      "reported_amount": 25000.0,
      "status": "AWAITING_REVIEW",
      "priority": "HIGH",
      "evidence_count": 1,
      "discrepancy_count": 0,
      "shared_indicators_count": 2
    }
  ]
}
```

### `GET /complaints/{id}`
- **Response `200 OK`**: Full complaint details, evidence list, extracted entities, verification findings with provenance, reviewer notes, and shared indicator leads.

### `POST /complaints/{id}/review`
- **Body**:
```json
{
  "status": "IN_PROGRESS | VERIFIED | CLOSED",
  "reviewer_note": "Verified bank statement aligns with receipt.",
  "reviewer_name": "Officer Sharma"
}
```

---

## 4. Evidence Inspection & Raw Content
### `GET /evidence/{id}`
- **Description**: Returns evidence metadata, raw OCR text, bounding boxes (if available), and structured fields.

### `GET /evidence/file/{file_uuid}`
- **Description**: Secure static file streaming for evidence image inspection.

---

## 5. Cross-Complaint Intelligence Graph
### `GET /graph`
- **Query Params**: `focus_complaint_id` (optional), `indicator_type` (optional)
- **Response `200 OK`**:
```json
{
  "nodes": [
    { "id": "CS-2026-101", "type": "COMPLAINT", "label": "CS-2026-101 (₹25,000)" },
    { "id": "ind-upi-demo@bank", "type": "INDICATOR", "indicator_type": "UPI_ID", "label": "demo@bank" }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "CS-2026-101",
      "target": "ind-upi-demo@bank",
      "relation": "CONTAINS_INDICATOR",
      "reason": "Found in payment receipt extraction",
      "evidence_id": "ev-uuid"
    }
  ],
  "lead_disclaimer": "Shared indicators represent investigative leads and do not establish common ownership or criminal responsibility."
}
```

---

## 6. Investigation Report
### `GET /reports/{complaint_id}`
- **Response `200 OK`**: Fully rendered investigation-support dossier ready for printing or structured JSON download.
