import os
import uuid
import random
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Query, Depends, Request, status
from app.core.config import settings
from app.core.security import get_optional_user, get_current_user, require_officer
from app.db.database import get_connection
from app.schemas.complaint import ReviewNoteRequest, StatusUpdateRequest, FieldCorrectionRequest
from app.services.evidence_extraction import process_evidence_file
from app.services.verification_engine import run_verification_pipeline
from app.services.intelligence_graph import update_complaint_indicators
from app.services.field_normalization import normalize_amount, normalize_upi_id, normalize_txn_id

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_reference_id() -> str:
    year = datetime.now().year
    rand_part = random.randint(1000, 9999)
    return f"CS-{year}-{rand_part}"

def log_audit_event(conn, user_id: Optional[str], action: str, resource_type: str, resource_id: Optional[str], details: Optional[str], ip_address: Optional[str]):
    audit_id = f"aud_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (audit_id, user_id, action, resource_type, resource_id, details, ip_address, now_iso)
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

            # Run deterministic verification pipeline
            findings = run_verification_pipeline(
                complaint={
                    "id": complaint_id,
                    "reported_amount": reported_amount,
                    "reported_txn_id": reported_txn_id,
                    "reported_upi_id": reported_upi_id
                },
                extracted_fields=extraction_res.structured_fields,
                evidence_id=evidence_id
            )

            # Persist findings
            for finding in findings:
                vf_id = f"vf_{uuid.uuid4().hex[:12]}"
                conn.execute(
                    """
                    INSERT INTO verification_findings (
                        id, complaint_id, evidence_id, field_name,
                        complaint_value, evidence_value,
                        normalized_complaint_value, normalized_evidence_value,
                        result, reason, review_recommendation, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        vf_id, complaint_id, evidence_id, finding.field_name,
                        finding.complaint_value, finding.evidence_value,
                        finding.normalized_complaint_value, finding.normalized_evidence_value,
                        finding.result, finding.reason, finding.review_recommendation,
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
    scope: Optional[str] = None,  # 'mine' or 'all'
    limit: int = 50,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Lists complaints based on role-based access control:
    - Citizens ONLY see their own submitted complaints.
    - Officers/Admins see all triage queue complaints or filter by assignment.
    """
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
    """
    Fetches full case details.
    Enforces privacy boundaries:
    - Citizens can ONLY access their own complaints; internal officer notes & investigative leads are redacted.
    - Officers/Admins have access to full case history, notes, OCR provenance, and graph links.
    """
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
        evidence = conn.execute("SELECT * FROM evidence_files WHERE complaint_id = ?", (c_id,)).fetchall()
        
        # Extracted fields
        extracted = conn.execute("SELECT * FROM extracted_fields WHERE complaint_id = ?", (c_id,)).fetchall()
        
        # Verification findings
        findings = conn.execute("SELECT * FROM verification_findings WHERE complaint_id = ?", (c_id,)).fetchall()
        
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
            "verification_findings": [dict(vf) for vf in findings],
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
    """
    Authorized officer workflow to append internal investigative notes and update review status.
    """
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
            # Record status change
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
    """
    Direct officer workflow to transition complaint lifecycle status with audit history.
    """
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
    """
    Authorized officer workflow to manually correct an OCR extracted entity.
    Maintains full provenance: preserves original OCR raw value, records officer ID and justification,
    and recalculates verification matrix and intelligence graph links.
    """
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

        # Reconstruct extracted fields dictionary to re-run verification pipeline
        all_fields = conn.execute("SELECT * FROM extracted_fields WHERE complaint_id = ?", (c_id,)).fetchall()
        structured = {}
        for f in all_fields:
            structured[f["field_name"]] = {
                "raw": f["raw_value"],
                "normalized": f["normalized_value"],
                "value": float(f["normalized_value"]) if f["field_name"] == "amount" and f["normalized_value"] else None,
                "context": f["source_context"]
            }

        # Clear and re-run verification findings
        conn.execute("DELETE FROM verification_findings WHERE complaint_id = ?", (c_id,))
        new_findings = run_verification_pipeline(
            complaint={
                "id": c_id,
                "reported_amount": complaint["reported_amount"],
                "reported_txn_id": complaint["reported_txn_id"],
                "reported_upi_id": complaint["reported_upi_id"]
            },
            extracted_fields=structured,
            evidence_id=evidence_id
        )

        for finding in new_findings:
            vf_id = f"vf_{uuid.uuid4().hex[:12]}"
            conn.execute(
                """
                INSERT INTO verification_findings (
                    id, complaint_id, evidence_id, field_name,
                    complaint_value, evidence_value,
                    normalized_complaint_value, normalized_evidence_value,
                    result, reason, review_recommendation, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    vf_id, c_id, evidence_id, finding.field_name,
                    finding.complaint_value, finding.evidence_value,
                    finding.normalized_complaint_value, finding.normalized_evidence_value,
                    finding.result, finding.reason, finding.review_recommendation,
                    now_iso
                )
            )

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
