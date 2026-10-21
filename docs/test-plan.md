# CyberSaarthi Comprehensive Test Plan

## 1. Scope & Objectives
This test plan validates the accuracy, resilience, and traceability of the CyberSaarthi cyber-fraud intelligence platform. It covers deterministic normalization, the evidence consistency verification engine, graph relationship derivation, and API route security.

## 2. Test Suites

### Suite A: Field Normalization & Sanitization
1. **Amount Normalization**:
   - `₹ 25,000.00` -> `Decimal("25000.00")`
   - `Rs. 2,500/-` -> `Decimal("2500.00")`
   - `INR 1000` -> `Decimal("1000.00")`
   - Invalid formats (e.g. text only `Twenty thousand`) -> `None` without crashing.
2. **UPI ID Normalization**:
   - `Payee.Merchant@OkAxis ` -> `payee.merchant@okaxis` (lowercased, trimmed).
   - Invalid strings without `@` -> rejected/flagged.
3. **Transaction ID Normalization**:
   - Strip spaces and uniform uppercase `upi 29849204920` -> `UPI29849204920`.
4. **Timestamp Parsing**:
   - Standard ISO formats, Indian standard formats (`DD/MM/YYYY hh:mm A`), and relative date handling.

### Suite B: Evidence Consistency Verification Engine
1. **Exact Match**:
   - Reported Amount: `25000.00`, Extracted: `25,000` -> Result: `MATCH`.
2. **Discrepancy / Conflict**:
   - Reported Amount: `25000.00`, Extracted: `2500` -> Result: `MISMATCH` with traceable reason.
3. **Missing in Complaint**:
   - Reported Txn ID: `None`, Extracted Txn ID: `TXN98765` -> Result: `MISSING_IN_COMPLAINT`.
4. **Missing in Evidence**:
   - Reported Txn ID: `TXN98765`, Extracted Txn ID: `None` -> Result: `MISSING_IN_EVIDENCE`.
5. **Unable to Verify**:
   - Both values unparseable or corrupted -> Result: `UNABLE_TO_VERIFY`.
6. **No Silent False Matches**:
   - Test that missing never equates to match.

### Suite C: Cross-Complaint Intelligence Graph
1. **Shared UPI Identifier**:
   - Complaints `CS-101` and `CS-104` both contain `fraudster@ybl`.
   - Engine must generate an indicator node `ind-upi-fraudster@ybl` and connect both complaints.
   - Provenance retains source complaint IDs, evidence reference, and investigative lead disclaimer.
2. **Unrelated Isolation**:
   - Complaint `CS-105` has isolated identifiers; verify it has 0 shared links.
3. **Multi-hop Linking**:
   - 3 complaints sharing phone number and UPI handle correctly represented without cycles.

### Suite D: API Integration & Security
1. **Health Check**: `GET /api/health` returns 200 with engine statuses.
2. **Valid Complaint Submission**: `POST /api/complaints/submit` with multipart form data.
3. **Invalid File Upload Rejection**: Rejects `.exe` or files exceeding 15MB.
4. **Path Traversal Protection**: Ensure file download attempts like `../../etc/passwd` or `..\..\cybersaarthi.db` return 400/404.
5. **Seed Data Reset**: Verify `POST /api/demo/seed` creates predictable synthetic scenarios cleanly.
