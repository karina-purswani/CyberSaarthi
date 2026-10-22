import os
import io
import csv
import json
import uuid
import random
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from PIL import Image

from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Query, Depends, Request, status
from app.core.config import settings
from app.core.security import get_optional_user, get_current_user, require_officer
from app.db.database import get_connection
from app.schemas.complaint import (
    ReviewNoteRequest,
    StatusUpdateRequest,
    FieldCorrectionRequest,
    ImportPreviewItem,
    ImportPreviewResponse,
    ImportExecuteRequest,
    ImportExecuteResponse
)
from app.services.evidence_extraction import process_evidence_file
from app.services.verification_engine import (
    evaluate_complaint_consistency,
    map_result_to_display_status,
    run_verification_pipeline
)
from app.services.intelligence_graph import update_complaint_indicators
from app.services.field_normalization import (
    normalize_amount,
    normalize_upi_id,
    normalize_txn_id,
    normalize_phone
)

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_reference_id() -> str:
    year = datetime.now().year
    rand_part = random.randint(1000, 9999)
    return f"CS-{year}-{rand_part}"

def log_audit_event(
    conn,
    user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    details: Optional[str],
    ip_address: Optional[str]
):
    audit_id = f"aud_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (audit_id, user_id, action, resource_type, resource_id, details, ip_address, now_iso)
    )

def parse_import_file(content: bytes, filename: str) -> tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Parses raw uploaded bytes into list of row dictionaries based on CSV or JSON format.
    """
    ext = os.path.splitext(filename)[1].lower()

    # Check JSON
    if ext == ".json" or content.strip().startswith((b"[", b"{")):
        try:
            parsed = json.loads(content.decode("utf-8"))
            if isinstance(parsed, list):
                return parsed, None
            elif isinstance(parsed, dict) and "complaints" in parsed:
                return parsed["complaints"], None
            elif isinstance(parsed, dict) and "records" in parsed:
                return parsed["records"], None
            elif isinstance(parsed, dict) and "items" in parsed:
                return parsed["items"], None
            else:
                return [parsed], None
        except Exception as e:
            return [], f"Invalid JSON format: {str(e)}"

    # Check CSV
    try:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        rows = []
        for r in reader:
            clean_row = {(k.strip() if k else ""): (v.strip() if v else "") for k, v in r.items() if k}
            rows.append(clean_row)
        return rows, None
    except Exception as e:
        return [], f"Invalid CSV format: {str(e)}"

def validate_import_row(
    row: Dict[str, Any],
    row_idx: int,
    conn,
    seen_refs: set,
    seen_txns: set,
    seen_fingerprints: set
) -> ImportPreviewItem:
    """
    Validates a single imported row against schema constraints and duplicate detection.
    """
    errors = []
    is_duplicate = False
    duplicate_reason = None

    # Required fields
    incident_type = (row.get("incident_type") or "").strip()
    description = (row.get("description") or "").strip()

    if not incident_type:
        errors.append("Field 'incident_type' is required.")
    if not description:
        errors.append("Field 'description' is required.")
    elif len(description) < 5:
        errors.append("Field 'description' must be at least 5 characters long.")

    # Amount validation
    raw_amount = row.get("reported_amount")
    parsed_amount = None
    if raw_amount not in (None, "", "null", "None"):
        dec, norm_amt = normalize_amount(raw_amount)
        if dec is not None:
            parsed_amount = float(dec)
        else:
            errors.append(f"Field 'reported_amount' has invalid numeric format: '{raw_amount}'")

    # Phone validation
    raw_phone = (row.get("victim_phone") or "").strip()
    if raw_phone:
        norm_phone = normalize_phone(raw_phone)
        if not norm_phone:
            errors.append("Field 'victim_phone' must be a valid 10-digit number.")
        else:
            row["victim_phone"] = norm_phone

    # Duplicate checks
    ref_id = (row.get("reference_id") or "").strip()
    txn_id = (row.get("reported_txn_id") or "").strip()
    norm_txn = normalize_txn_id(txn_id) if txn_id else None

    # Check A: reference_id
    if ref_id:
        if ref_id in seen_refs:
            is_duplicate = True
            duplicate_reason = f"Duplicate reference_id '{ref_id}' appears multiple times in upload file."
        else:
            seen_refs.add(ref_id)
            existing = conn.execute("SELECT id FROM complaints WHERE reference_id = ?", (ref_id,)).fetchone()
            if existing:
                is_duplicate = True
                duplicate_reason = f"Reference ID '{ref_id}' already exists in active database."

    # Check B: transaction ID idempotency
    if norm_txn and not is_duplicate:
        if norm_txn in seen_txns:
            is_duplicate = True
            duplicate_reason = f"Duplicate transaction ID '{norm_txn}' appears multiple times in upload file."
        else:
            seen_txns.add(norm_txn)
            existing_txn = conn.execute("SELECT reference_id FROM complaints WHERE reported_txn_id = ?", (norm_txn,)).fetchone()
            if existing_txn:
                is_duplicate = True
                duplicate_reason = f"Transaction ID '{norm_txn}' matches existing case {existing_txn['reference_id']}."

    # Check C: fingerprint
    fingerprint = f"{incident_type.lower()}|{parsed_amount}|{description[:40].lower()}"
    if fingerprint in seen_fingerprints and not is_duplicate:
        is_duplicate = True
        duplicate_reason = "Exact duplicate record found in previous row of this import file."
    else:
        seen_fingerprints.add(fingerprint)

    is_valid = len(errors) == 0

    clean_data = dict(row)
    if parsed_amount is not None:
        clean_data["reported_amount"] = parsed_amount

    return ImportPreviewItem(
        row_number=row_idx,
        data=clean_data,
        is_valid=is_valid,
        is_duplicate=is_duplicate,
        errors=errors,
        duplicate_reason=duplicate_reason
    )

@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    language: str = Form("en"),
    incident_type: str = Form(...),
    description: str = Form(...),
    reported_amount: Optional[float] = Form(None),
    reported_txn_id: Optional[str] = Form(None),
    reported_upi_id: Optional[str] = Form(None),
    incident_datetime: Optional[str] = Form(None),
    victim_phone: Optional[str] = Form(None),
    victim_state: Optional[str] = Form(None),
    evidence_file: Optional[UploadFile] = File(None),
    request: Request = None,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    complaint_id = f"cmp_{uuid.uuid4().hex[:12]}"
    reference_id = generate_reference_id()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Priority classification
    priority = "MEDIUM"
    if reported_amount and reported_amount >= 50000:
        priority = "HIGH"
    elif reported_amount and reported_amount < 5000:
        priority = "LOW"

    # Assign owner user_id
    user_id = current_user["id"] if current_user else "usr_citizen_patel"

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                incident_datetime, victim_phone, victim_state, status, priority,
                is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                complaint_id, reference_id, user_id, now_iso, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                incident_datetime, victim_phone, victim_state, "AWAITING_REVIEW",
                priority, now_iso, now_iso
            )
        )

        # Record initial status in history
        history_id = f"csh_{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO complaint_status_history (
                id, complaint_id, previous_status, new_status, changed_by_user_id, reason, timestamp
            ) VALUES (?, ?, NULL, 'AWAITING_REVIEW', ?, 'Initial citizen submission', ?)
            """,
            (history_id, complaint_id, user_id, now_iso)
        )

        evidence_id = None
        evidence_summary = None

        if evidence_file and evidence_file.filename:
            content_type = evidence_file.content_type or ""
            file_bytes = await evidence_file.read()
            if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.max_upload_size_mb}MB.")

            ext = os.path.splitext(evidence_file.filename)[1].lower()
            if not ext:
                ext = ".png"
                
            storage_filename = f"{uuid.uuid4().hex}{ext}"
            file_dest = settings.storage_dir / storage_filename
            with open(file_dest, "wb") as f:
                f.write(file_bytes)

            evidence_id = f"ev_{uuid.uuid4().hex[:12]}"
            
            # Execute OCR pipeline
            extraction_res = process_evidence_file(file_dest)
            
            conn.execute(
                """
                INSERT INTO evidence_files (
                    id, complaint_id, original_filename, storage_filename,
                    file_type, file_size_bytes, ocr_status, raw_ocr_text,
                    ocr_confidence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evidence_id, complaint_id, evidence_file.filename, storage_filename,
                    content_type or "image/png", len(file_bytes), "COMPLETED",
                    extraction_res.raw_ocr_text, extraction_res.ocr_confidence, now_iso
                )
            )

            # Insert extracted fields
            for fname, val_obj in extraction_res.structured_fields.items():
                if val_obj:
                    ef_id = f"ef_{uuid.uuid4().hex[:12]}"
                    conn.execute(
                        """
                        INSERT INTO extracted_fields (
                            id, evidence_id, complaint_id, field_name,
                            raw_value, normalized_value, confidence,
                            source_context, is_officer_corrected, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                        """,
                        (
                            ef_id, evidence_id, complaint_id, fname,
                            str(val_obj.get("raw", "")),
                            str(val_obj.get("normalized", "")),
                            extraction_res.ocr_confidence,
                            val_obj.get("context", ""),
                            now_iso
                        )
                    )

            evidence_summary = {
                "evidence_id": evidence_id,
                "original_filename": evidence_file.filename,
                "ocr_status": "COMPLETED",
                "ocr_engine": extraction_res.engine_used,
                "extracted_fields": extraction_res.structured_fields
            }

        # Run multi-evidence consistency evaluation (handles with or without evidence)
        evaluate_complaint_consistency(conn, complaint_id)

        # Update intelligence graph
        update_complaint_indicators(conn, complaint_id)

        # Audit log event
        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=user_id,
            action="COMPLAINT_SUBMITTED",
            resource_type="COMPLAINT",
            resource_id=complaint_id,
            details=f"Reference {reference_id} created by user {user_id}",
            ip_address=client_ip
        )
        conn.commit()

        return {
            "success": True,
            "complaint_id": complaint_id,
            "reference_id": reference_id,
            "submission_time": now_iso,
            "status": "AWAITING_REVIEW",
            "priority": priority,
            "evidence": evidence_summary,
            "message": f"Incident successfully registered under reference {reference_id}."
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")
    finally:
        conn.close()

@router.get("")
def list_complaints(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    incident_type: Optional[str] = None,
    search: Optional[str] = None,
    scope: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    conn = get_connection()
    try:
        query = "SELECT * FROM complaints WHERE 1=1"
        params = []

        is_citizen = current_user and current_user.get("role") == "CITIZEN"
        
        # Object-level ownership constraint
        if is_citizen or scope == "mine":
            uid = current_user["id"] if current_user else "usr_citizen_patel"
            query += " AND user_id = ?"
            params.append(uid)

        if status:
            query += " AND status = ?"
            params.append(status)
        if priority:
            query += " AND priority = ?"
            params.append(priority)
        if incident_type:
            query += " AND incident_type = ?"
            params.append(incident_type)
        if search:
            query += " AND (reference_id LIKE ? OR description LIKE ? OR reported_upi_id LIKE ? OR reported_txn_id LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term, term, term])

        # Count total
        count_query = query.replace("SELECT *", "SELECT COUNT(*)", 1)
        total = conn.execute(count_query, params).fetchone()[0]

        query += " ORDER BY submission_time DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()

        items = []
        for r in rows:
            c_id = r["id"]
            ev_count = conn.execute("SELECT COUNT(*) FROM evidence_files WHERE complaint_id = ?", (c_id,)).fetchone()[0]
            findings = conn.execute("SELECT result FROM verification_findings WHERE complaint_id = ?", (c_id,)).fetchall()
            findings_count = len(findings)
            mismatch_count = sum(1 for f in findings if f["result"] == "MISMATCH")

            items.append({
                "id": r["id"],
                "reference_id": r["reference_id"],
                "user_id": r["user_id"],
                "submission_time": r["submission_time"],
                "language": r["language"],
                "incident_type": r["incident_type"],
                "reported_amount": r["reported_amount"],
                "reported_upi_id": r["reported_upi_id"],
                "reported_txn_id": r["reported_txn_id"],
                "status": r["status"],
                "priority": r["priority"],
                "evidence_count": ev_count,
                "findings_count": findings_count,
                "mismatch_count": mismatch_count,
                "is_demo": bool(r["is_demo"])
            })

        return {"total": total, "items": items}
    finally:
        conn.close()

@router.get("/{complaint_id}")
def get_complaint_details(
    complaint_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT * FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")

        c_id = complaint["id"]
        is_citizen = current_user and current_user.get("role") == "CITIZEN"

        # Check citizen ownership
        if is_citizen and current_user["id"] != complaint["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You do not have permission to view another citizen's complaint."
            )

        # Evidence files
        evidence = conn.execute("SELECT * FROM evidence_files WHERE complaint_id = ? ORDER BY created_at ASC", (c_id,)).fetchall()
        
        # Extracted fields
        extracted = conn.execute(
            """
            SELECT ef.*, ev.original_filename as evidence_filename
            FROM extracted_fields ef
            LEFT JOIN evidence_files ev ON ef.evidence_id = ev.id
            WHERE ef.complaint_id = ?
            ORDER BY ef.field_name ASC
            """,
            (c_id,)
        ).fetchall()
        
        # Verification findings joined with evidence_files for source attribution and display status
        findings_rows = conn.execute(
            """
            SELECT vf.*, ev.original_filename as evidence_filename, ev.storage_filename as evidence_storage_filename
            FROM verification_findings vf
            LEFT JOIN evidence_files ev ON vf.evidence_id = ev.id
            WHERE vf.complaint_id = ?
            ORDER BY vf.field_name ASC, vf.created_at ASC
            """,
            (c_id,)
        ).fetchall()

        # If findings have not been generated yet, compute and persist them
        if not findings_rows:
            evaluate_complaint_consistency(conn, c_id)
            conn.commit()
            findings_rows = conn.execute(
                """
                SELECT vf.*, ev.original_filename as evidence_filename, ev.storage_filename as evidence_storage_filename
                FROM verification_findings vf
                LEFT JOIN evidence_files ev ON vf.evidence_id = ev.id
                WHERE vf.complaint_id = ?
                ORDER BY vf.field_name ASC, vf.created_at ASC
                """,
                (c_id,)
            ).fetchall()

        formatted_findings = []
        for row in findings_rows:
            d = dict(row)
            if not d.get("display_status"):
                d["display_status"] = map_result_to_display_status(d["result"])
            d["source_evidence"] = d.get("evidence_filename") or ("No Evidence Attached" if not d.get("evidence_id") else "Evidence Document")

            # Check for officer correction provenance on this field
            corr_row = conn.execute(
                """
                SELECT is_officer_corrected, original_value, correction_reason, corrected_by_user_id
                FROM extracted_fields
                WHERE complaint_id = ? AND field_name IN (?, ?) AND is_officer_corrected = 1
                LIMIT 1
                """,
                (
                    c_id,
                    d["field_name"],
                    "amount" if d["field_name"] == "transaction_amount" else ("txn_id" if d["field_name"] == "transaction_id" else d["field_name"])
                )
            ).fetchone()
            if corr_row:
                d["is_officer_corrected"] = True
                d["original_value"] = corr_row["original_value"]
                d["correction_reason"] = corr_row["correction_reason"]
            else:
                d["is_officer_corrected"] = False
                d["original_value"] = None
                d["correction_reason"] = None

            formatted_findings.append(d)

        # Status history
        history = conn.execute(
            """
            SELECT csh.*, u.full_name as changed_by_name, u.role as changed_by_role
            FROM complaint_status_history csh
            LEFT JOIN users u ON csh.changed_by_user_id = u.id
            WHERE csh.complaint_id = ?
            ORDER BY csh.timestamp ASC
            """,
            (c_id,)
        ).fetchall()

        # Reviewer notes & related investigative leads (Redacted for Citizens)
        if is_citizen:
            notes = []
            related = []
        else:
            notes = conn.execute(
                """
                SELECT rn.*, u.full_name as reviewer_full_name, u.badge_number
                FROM reviewer_notes rn
                LEFT JOIN users u ON rn.reviewer_user_id = u.id
                WHERE rn.complaint_id = ? ORDER BY rn.created_at DESC
                """,
                (c_id,)
            ).fetchall()

            related = conn.execute(
                """
                SELECT DISTINCT c2.id, c2.reference_id, c2.incident_type, c2.reported_amount,
                       gi.indicator_type, gi.normalized_value, gr1.rule_applied
                FROM graph_relationships gr1
                JOIN graph_relationships gr2 ON gr1.indicator_id = gr2.indicator_id AND gr1.complaint_id != gr2.complaint_id
                JOIN graph_indicators gi ON gr1.indicator_id = gi.id
                JOIN complaints c2 ON gr2.complaint_id = c2.id
                WHERE gr1.complaint_id = ?
                """,
                (c_id,)
            ).fetchall()

        return {
            "complaint": dict(complaint),
            "evidence_files": [dict(e) for e in evidence],
            "extracted_fields": [dict(ef) for ef in extracted],
            "verification_findings": formatted_findings,
            "status_history": [dict(h) for h in history],
            "reviewer_notes": [dict(n) for n in notes],
            "related_leads": [dict(rel) for rel in related]
        }
    finally:
        conn.close()

@router.post("/{complaint_id}/review")
def add_review_note(
    complaint_id: str,
    payload: ReviewNoteRequest,
    current_user: dict = Depends(require_officer),
    request: Request = None
):
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT id, status FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")
            
        c_id = complaint["id"]
        old_status = complaint["status"]
        note_id = f"rn_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        reviewer_name = payload.reviewer_name or current_user.get("full_name", "Officer")
        
        conn.execute(
            """
            INSERT INTO reviewer_notes (id, complaint_id, reviewer_name, reviewer_user_id, note, review_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (note_id, c_id, reviewer_name, current_user["id"], payload.note, payload.review_status, now_iso)
        )
        
        if payload.review_status and payload.review_status != old_status:
            conn.execute(
                "UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?",
                (payload.review_status, now_iso, c_id)
            )
            csh_id = f"csh_{uuid.uuid4().hex[:12]}"
            conn.execute(
                """
                INSERT INTO complaint_status_history (
                    id, complaint_id, previous_status, new_status, changed_by_user_id, reason, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (csh_id, c_id, old_status, payload.review_status, current_user["id"], payload.note[:100], now_iso)
            )

        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=current_user["id"],
            action="OFFICER_REVIEW_NOTE_ADDED",
            resource_type="COMPLAINT",
            resource_id=c_id,
            details=f"Note added by {reviewer_name}. Status changed to {payload.review_status}",
            ip_address=client_ip
        )

        conn.commit()
        return {"success": True, "note_id": note_id, "updated_status": payload.review_status}
    finally:
        conn.close()

@router.post("/{complaint_id}/status")
def update_status(
    complaint_id: str,
    payload: StatusUpdateRequest,
    current_user: dict = Depends(require_officer),
    request: Request = None
):
    valid_statuses = ["AWAITING_REVIEW", "UNDER_INVESTIGATION", "VERIFIED", "REJECTED", "RESOLVED"]
    if payload.new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {', '.join(valid_statuses)}")

    conn = get_connection()
    try:
        complaint = conn.execute("SELECT id, status FROM complaints WHERE id = ? OR reference_id = ?", (complaint_id, complaint_id)).fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")

        c_id = complaint["id"]
        old_status = complaint["status"]
        now_iso = datetime.now(timezone.utc).isoformat()

        conn.execute("UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?", (payload.new_status, now_iso, c_id))

        csh_id = f"csh_{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO complaint_status_history (id, complaint_id, previous_status, new_status, changed_by_user_id, reason, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (csh_id, c_id, old_status, payload.new_status, current_user["id"], payload.reason or "Officer status change", now_iso)
        )

        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=current_user["id"],
            action="COMPLAINT_STATUS_UPDATED",
            resource_type="COMPLAINT",
            resource_id=c_id,
            details=f"Status transitioned from {old_status} to {payload.new_status}. Reason: {payload.reason}",
            ip_address=client_ip
        )
        conn.commit()
        return {"success": True, "previous_status": old_status, "new_status": payload.new_status}
    finally:
        conn.close()

@router.post("/{complaint_id}/evidence/{evidence_id}/fields/{field_id}/correct")
def correct_extracted_field(
    complaint_id: str,
    evidence_id: str,
    field_id: str,
    payload: FieldCorrectionRequest,
    current_user: dict = Depends(require_officer),
    request: Request = None
):
    conn = get_connection()
    try:
        complaint = conn.execute("SELECT * FROM complaints WHERE id = ? OR reference_id = ?", (complaint_id, complaint_id)).fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")
        c_id = complaint["id"]

        field_row = conn.execute(
            "SELECT * FROM extracted_fields WHERE id = ? AND evidence_id = ? AND complaint_id = ?",
            (field_id, evidence_id, c_id)
        ).fetchone()
        if not field_row:
            raise HTTPException(status_code=404, detail="Extracted field record not found.")

        fname = field_row["field_name"]
        raw_val = payload.corrected_value.strip()

        # Compute normalized value
        norm_val = raw_val
        if fname == "amount":
            dec, norm_val = normalize_amount(raw_val)
        elif fname == "upi_id":
            norm_val = normalize_upi_id(raw_val) or raw_val
        elif fname == "txn_id":
            norm_val = normalize_txn_id(raw_val) or raw_val

        now_iso = datetime.now(timezone.utc).isoformat()
        original_val = field_row["original_value"] or field_row["raw_value"]

        # Update extracted field with provenance
        conn.execute(
            """
            UPDATE extracted_fields
            SET raw_value = ?, normalized_value = ?, is_officer_corrected = 1,
                original_value = ?, corrected_by_user_id = ?, correction_reason = ?,
                created_at = ?
            WHERE id = ?
            """,
            (raw_val, norm_val, original_val, current_user["id"], payload.reason, now_iso, field_id)
        )

        # Recalculate full multi-evidence consistency matrix
        evaluate_complaint_consistency(conn, c_id)

        # Refresh graph
        update_complaint_indicators(conn, c_id)

        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=current_user["id"],
            action="EXTRACTED_FIELD_CORRECTED",
            resource_type="EXTRACTED_FIELD",
            resource_id=field_id,
            details=f"Field '{fname}' corrected from '{original_val}' to '{raw_val}'. Justification: {payload.reason}",
            ip_address=client_ip
        )

        conn.commit()
        return {
            "success": True,
            "field_id": field_id,
            "field_name": fname,
            "normalized_value": norm_val,
            "is_officer_corrected": True,
            "original_value": original_val,
            "message": "Field corrected and consistency verification recomputed."
        }
    finally:
        conn.close()

@router.post("/{complaint_id}/evidence", status_code=status.HTTP_201_CREATED)
async def upload_case_evidence(
    complaint_id: str,
    evidence_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Attaches an additional evidence document to an existing complaint.
    Validates file content, enforces size limit, saves bytes to configured storage,
    runs OCR if image, records provenance, and recalculates consistency matrix and intelligence graph.
    """
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT id, reference_id, user_id FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")

        c_id = complaint["id"]

        # Citizen can only upload to their own complaint
        if current_user.get("role") == "CITIZEN" and complaint["user_id"] != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only attach evidence to your own complaint."
            )

        file_bytes = await evidence_file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum size of {settings.max_upload_size_mb}MB."
            )

        # Inspect image content
        is_image = False
        detected_mime = evidence_file.content_type or "application/octet-stream"
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
            is_image = True
            detected_mime = Image.MIME.get(img.format, detected_mime)
        except Exception:
            pass

        ext = os.path.splitext(evidence_file.filename or "")[1].lower()
        if not ext:
            ext = ".png" if is_image else ".bin"

        storage_filename = f"{uuid.uuid4().hex}{ext}"
        file_dest = settings.storage_dir / storage_filename
        with open(file_dest, "wb") as f:
            f.write(file_bytes)

        evidence_id = f"ev_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        ocr_status = "PENDING"
        raw_ocr_text = None
        ocr_confidence = None

        if is_image:
            extraction_res = process_evidence_file(file_dest)
            ocr_status = "COMPLETED"
            raw_ocr_text = extraction_res.raw_ocr_text
            ocr_confidence = extraction_res.ocr_confidence

        conn.execute(
            """
            INSERT INTO evidence_files (
                id, complaint_id, original_filename, storage_filename,
                file_type, file_size_bytes, ocr_status, raw_ocr_text,
                ocr_confidence, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                evidence_id, c_id, evidence_file.filename or "uploaded_evidence",
                storage_filename, detected_mime, len(file_bytes),
                ocr_status, raw_ocr_text, ocr_confidence, now_iso
            )
        )

        if is_image and extraction_res:
            for fname, val_obj in extraction_res.structured_fields.items():
                if val_obj:
                    ef_id = f"ef_{uuid.uuid4().hex[:12]}"
                    conn.execute(
                        """
                        INSERT INTO extracted_fields (
                            id, evidence_id, complaint_id, field_name,
                            raw_value, normalized_value, confidence,
                            source_context, is_officer_corrected, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                        """,
                        (
                            ef_id, evidence_id, c_id, fname,
                            str(val_obj.get("raw", "")),
                            str(val_obj.get("normalized", "")),
                            extraction_res.ocr_confidence,
                            val_obj.get("context", ""),
                            now_iso
                        )
                    )

        # Recalculate consistency matrix and graph
        evaluate_complaint_consistency(conn, c_id)
        update_complaint_indicators(conn, c_id)

        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=current_user.get("id"),
            action="EVIDENCE_UPLOADED",
            resource_type="EVIDENCE",
            resource_id=evidence_id,
            details=f"Evidence '{evidence_file.filename}' uploaded to case {complaint['reference_id']}",
            ip_address=client_ip
        )

        conn.commit()
        return {
            "success": True,
            "evidence_id": evidence_id,
            "original_filename": evidence_file.filename,
            "storage_filename": storage_filename,
            "file_size_bytes": len(file_bytes),
            "ocr_status": ocr_status,
            "ocr_confidence": ocr_confidence,
            "message": "Evidence successfully uploaded and consistency verification updated."
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process evidence upload: {str(e)}")
    finally:
        conn.close()

@router.post("/import/preview", response_model=ImportPreviewResponse)
async def preview_complaint_import(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_officer)
):
    """
    Validates CSV or JSON import file.
    Performs encoding, type, schema, and duplicate checks before final database ingestion.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.max_upload_size_mb}MB.")

    rows, error = parse_import_file(file_bytes, file.filename)
    if error:
        raise HTTPException(status_code=400, detail=f"Unable to parse import file: {error}")

    if not rows:
        raise HTTPException(status_code=400, detail="Import file contains zero valid data rows.")

    conn = get_connection()
    try:
        seen_refs = set()
        seen_txns = set()
        seen_fingerprints = set()

        preview_items = []
        valid_count = 0
        duplicate_count = 0
        invalid_count = 0

        for idx, row in enumerate(rows, start=1):
            item = validate_import_row(
                row=row,
                row_idx=idx,
                conn=conn,
                seen_refs=seen_refs,
                seen_txns=seen_txns,
                seen_fingerprints=seen_fingerprints
            )
            preview_items.append(item)
            if not item.is_valid:
                invalid_count += 1
            elif item.is_duplicate:
                duplicate_count += 1
            else:
                valid_count += 1

        return ImportPreviewResponse(
            total_records=len(rows),
            valid_records=valid_count,
            duplicate_records=duplicate_count,
            invalid_records=invalid_count,
            records=preview_items
        )
    finally:
        conn.close()

@router.post("/import/execute", response_model=ImportExecuteResponse)
async def execute_complaint_import(
    payload: ImportExecuteRequest,
    current_user: dict = Depends(require_officer),
    request: Request = None
):
    """
    Transactionally imports validated complaints into SQLite.
    Computes priority, initial status history, consistency matrix, and graph indicators.
    """
    if not payload.records:
        raise HTTPException(status_code=400, detail="No complaint records provided for import.")

    conn = get_connection()
    imported_ids = []
    skipped_count = 0
    rejected_count = 0
    errors = []

    try:
        seen_refs = set()
        seen_txns = set()
        seen_fingerprints = set()

        for idx, row in enumerate(payload.records, start=1):
            val_item = validate_import_row(
                row=row,
                row_idx=idx,
                conn=conn,
                seen_refs=seen_refs,
                seen_txns=seen_txns,
                seen_fingerprints=seen_fingerprints
            )

            if not val_item.is_valid:
                rejected_count += 1
                errors.append(f"Row {idx} rejected: {', '.join(val_item.errors)}")
                continue

            if val_item.is_duplicate:
                if payload.skip_duplicates:
                    skipped_count += 1
                    continue
                else:
                    rejected_count += 1
                    errors.append(f"Row {idx} rejected as duplicate: {val_item.duplicate_reason}")
                    continue

            # Record is valid and non-duplicate: proceed with insertion
            c_data = val_item.data
            complaint_id = f"cmp_{uuid.uuid4().hex[:12]}"
            ref_id = c_data.get("reference_id") or generate_reference_id()
            now_iso = datetime.now(timezone.utc).isoformat()

            amt = c_data.get("reported_amount")
            priority = "MEDIUM"
            if amt and amt >= 50000:
                priority = "HIGH"
            elif amt and amt < 5000:
                priority = "LOW"

            conn.execute(
                """
                INSERT INTO complaints (
                    id, reference_id, user_id, submission_time, language, incident_type,
                    description, reported_amount, reported_txn_id, reported_upi_id,
                    incident_datetime, victim_phone, victim_state, status, priority,
                    is_demo, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AWAITING_REVIEW', ?, 0, ?, ?)
                """,
                (
                    complaint_id,
                    ref_id,
                    current_user["id"],
                    now_iso,
                    c_data.get("language") or "en",
                    c_data["incident_type"],
                    c_data["description"],
                    amt,
                    c_data.get("reported_txn_id") or None,
                    c_data.get("reported_upi_id") or None,
                    c_data.get("incident_datetime") or None,
                    c_data.get("victim_phone") or None,
                    c_data.get("victim_state") or None,
                    priority,
                    now_iso,
                    now_iso
                )
            )

            # Insert initial status history
            csh_id = f"csh_{uuid.uuid4().hex[:12]}"
            conn.execute(
                """
                INSERT INTO complaint_status_history (
                    id, complaint_id, previous_status, new_status, changed_by_user_id, reason, timestamp
                ) VALUES (?, ?, NULL, 'AWAITING_REVIEW', ?, 'Imported via structured batch file', ?)
                """,
                (csh_id, complaint_id, current_user["id"], now_iso)
            )

            # Run consistency evaluation (initial baseline)
            evaluate_complaint_consistency(conn, complaint_id)

            # Update cross-complaint intelligence graph
            update_complaint_indicators(conn, complaint_id)

            imported_ids.append(ref_id)

        # Log audit event
        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=current_user["id"],
            action="DATA_IMPORT_EXECUTED",
            resource_type="COMPLAINTS_BATCH",
            resource_id=None,
            details=f"Imported {len(imported_ids)} complaints, skipped {skipped_count}, rejected {rejected_count}",
            ip_address=client_ip
        )

        conn.commit()

        return ImportExecuteResponse(
            success=True,
            imported_count=len(imported_ids),
            skipped_count=skipped_count,
            rejected_count=rejected_count,
            imported_reference_ids=imported_ids,
            errors=errors
        )
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Import transaction failed: {str(e)}")
    finally:
        conn.close()
