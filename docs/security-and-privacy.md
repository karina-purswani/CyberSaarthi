# CyberSaarthi Security & Privacy Architecture

This document outlines the security controls, data privacy protections, access governance mechanisms, and statutory compliance safeguards designed into CyberSaarthi.

---

## 1. Threat Model & Security Posture

CyberSaarthi operates as an evidence ingestion, extraction, and triage platform. The primary threat risks addressed include:
1. **Unauthorized Access to Evidence**: Unauthorized citizens or unauthenticated parties accessing sensitive victim complaints, payment receipts, or personal data.
2. **Privilege Escalation**: Citizens attempting to access officer queues, cross-complaint graphs, bank debit freeze requisitions, or internal case notes.
3. **Evidence Tampering**: Untracked manual modifications to extracted evidence fields.
4. **Malicious File Ingestion & Path Traversal**: Directory traversal attacks via manipulated filenames (`../../etc/passwd`).
5. **Session Hijacking & Brute Force**: Credential stuffing or token theft.

---

## 2. Authentication & Credential Storage

### 2.1 Password Hashing
- Passwords are never stored in plaintext.
- The platform uses **PBKDF2-HMAC-SHA256** with **100,000 iterations** and a **16-byte cryptographically secure random salt** generated via `os.urandom(16)`.
- Storage Format:
  ```
  pbkdf2:sha256:100000$<salt_hex>$<hash_hex>
  ```
- Verification is performed using `hmac.compare_digest()` to eliminate timing attack vectors.

### 2.2 JWT Session Tokens
- Stateless JSON Web Tokens (JWT) signed using HMAC-SHA256 (`HS256`).
- Secret key stored server-side in `JWT_SECRET_KEY` (defaults to a high-entropy fallback in development).
- Configurable expiration time (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 480 minutes / 8 hours).
- Payload contains:
  ```json
  {
    "sub": "usr_7b29a1d3f4e2",
    "email": "officer@cybersaarthi.gov.in",
    "role": "OFFICER",
    "name": "Inspector Ramesh Shinde",
    "exp": 1776892800
  }
  ```

---

## 3. Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Public (Unauth) | Citizen | Officer | Admin |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/health` | Allowed | Allowed | Allowed | Allowed |
| `POST /api/auth/register` (Citizen) | Allowed | Blocked | Blocked | Blocked |
| `POST /api/auth/login` | Allowed | Allowed | Allowed | Allowed |
| `GET /api/auth/me` | Blocked (401) | Allowed (Self) | Allowed (Self) | Allowed (Self) |
| `POST /api/auth/change-password` | Blocked (401) | Allowed (Self) | Allowed (Self) | Allowed (Self) |
| `POST /api/voice/transcribe` | Allowed / Auth | Allowed | Allowed | Allowed |
| `POST /api/complaints/submit` | Allowed | Allowed | Allowed | Allowed |
| `GET /api/complaints` | Blocked (401) | Scoped (Own cases only) | All cases | All cases |
| `GET /api/complaints/{id}` | Blocked (401) | Scoped (Redacted internal notes) | Full case file | Full case file |
| `POST /api/complaints/{id}/status` | Blocked (401) | Blocked (403) | Allowed | Allowed |
| `POST /api/complaints/{id}/review` | Blocked (401) | Blocked (403) | Allowed | Allowed |
| `POST /api/complaints/.../fields/.../correct` | Blocked (401) | Blocked (403) | Allowed | Allowed |
| `GET /api/evidence/file/{filename}` | Allowed | Allowed (Own evidence) | Allowed | Allowed |
| `GET /api/overview/metrics` | Blocked (401) | Blocked (403) | Allowed | Allowed |
| `GET /api/overview/citizen-metrics` | Blocked (401) | Allowed (Scoped) | Allowed | Allowed |
| `GET /api/graph` | Blocked (401) | Blocked (403) | Allowed | Allowed |
| `GET /api/reports/{id}` | Blocked (401) | Blocked (403) | Allowed | Allowed |

---

## 4. Object-Level Authorization & Data Segregation

1. **Citizen Case Scoping**:
   When a citizen issues `GET /api/complaints`, the database query strictly binds to `WHERE user_id = :authenticated_user_id`. Citizens cannot list or inspect other victims' complaints.
2. **Redaction of Sensitive Officer Intelligence**:
   When a citizen inspects their own complaint via `GET /api/complaints/{id}`:
   - `reviewer_notes` are redacted (empty list returned).
   - `related_leads` (cross-complaint syndicate leads) are redacted (empty list returned).
   - This ensures ongoing law enforcement inquiries, freeze warrants, and syndicate tracking are protected.
3. **Portal Segregation**:
   The login API verifies `portal_type`. Citizens attempting to log into the Police Officer Console are immediately rejected with HTTP 403.

---

## 5. Evidence Provenance & Audit Immutability

1. **Deterministic Preservation**:
   Optical character recognition outputs from RapidOCR are preserved verbatim in `evidence_files.raw_ocr_text` and `extracted_fields.raw_value`.
2. **Manual Field Correction Provenance**:
   When an authorized officer corrects an extracted field:
   - `extracted_fields.is_officer_corrected` is set to `1`.
   - `extracted_fields.original_value` records the exact pre-correction token string.
   - `extracted_fields.corrected_by_user_id` records the officer's user ID.
   - `extracted_fields.correction_reason` enforces a mandatory substantive justification.
   - An event is permanently appended to `audit_logs`.
3. **Deterministic Re-verification**:
   Applying a field correction immediately triggers automatic re-computation of the deterministic consistency rules against complainant claims, ensuring verification state always matches current evidence.

---

## 6. Secure Evidence File Handling

1. **Cryptographic Random Filenames**:
   Uploaded files are stripped of client filenames and saved to `data/evidence_files/` using a non-guessable UUID:
   ```python
   storage_filename = f"{uuid.uuid4().hex}_{safe_name}"
   ```
2. **Path Containment Enforcement**:
   Path traversal attacks (`../../`) are blocked by validating the resolved canonical path against the storage directory root:
   ```python
   resolved_path = (evidence_dir / storage_filename).resolve()
   if not str(resolved_path).startswith(str(evidence_dir.resolve())):
       raise HTTPException(status_code=400, detail="Invalid storage path traversal.")
   ```
3. **MIME-Type & Extension Whitelist**:
   Only `image/png`, `image/jpeg`, `image/webp`, and `application/pdf` are accepted.

---

## 7. In-Browser Direct Voice Privacy

1. **Direct Audio Capture**:
   Audio statements are recorded directly in the citizen's browser using standard `MediaRecorder` / Web Audio API.
2. **WAV Encoding**:
   Raw float audio frames are encoded in-browser into 16kHz mono 16-bit PCM WAV blobs. No proprietary binary codecs or unmonitored browser plugins are required.
3. **No External Fabrication**:
   The transcription service attempts genuine speech-to-text recognition. If silence, background noise, or unintelligible speech is detected, the pipeline returns a clear error and **never invents a fake transcript**.
4. **Editable Review**:
   Citizens are provided the transcript for review and manual correction before complaint submission.

---

## 8. Statutory Disclaimers

1. **Investigative Lead Notice**:
   All graph-based entity associations and cross-complaint connections are tagged with mandatory advisory notices:
   > *"Graph connections represent technical correlations derived from observable transaction artifacts. They do not constitute formal criminal attribution or legal guilt."*
2. **Emergency 1930 Cyber Helpline Notice**:
   Citizen intake surfaces prominent statutory guidance to dial **1930** (National Cybercrime Reporting Portal) or contact banks immediately within the initial "Golden Hours" to freeze debit transactions.
