import os
import uuid
import random
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Query, status
from app.core.config import settings
from app.db.database import get_connection
from app.schemas.complaint import ReviewNoteRequest
from app.services.evidence_extraction import process_evidence_file
from app.services.verification_engine import run_verification_pipeline
from app.services.intelligence_graph import update_complaint_indicators

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_reference_id() -> str:
    year = datetime.now().year
    rand_part = random.randint(1000, 9999)
    return f"CS-{year}-{rand_part}"

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
    evidence_file: Optional[UploadFile] = File(None)
):
    complaint_id = f"cmp_{uuid.uuid4().hex[:12]}"
    reference_id = generate_reference_id()
    now_iso = datetime.now().isoformat()
    
    # Simple rule for priority
    priority = "MEDIUM"
    if reported_amount and reported_amount >= 50000:
        priority = "HIGH"
    elif reported_amount and reported_amount < 5000:
        priority = "LOW"

    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                incident_datetime, victim_phone, victim_state, status, priority,
                is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                complaint_id, reference_id, now_iso, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                incident_datetime, victim_phone, victim_state, "AWAITING_REVIEW",
                priority, now_iso, now_iso
            )
        )

        evidence_id = None
        extraction_res = None
        evidence_summary = None

        if evidence_file and evidence_file.filename:
            content_type = evidence_file.content_type or ""
            # File validation
            is_image = any(content_type.startswith(t) for t in ["image/jpeg", "image/png", "image/webp"])
            is_audio = any(content_type.startswith(t) for t in ["audio/"])
            
            # Read content and check size
            file_bytes = await evidence_file.read()
            if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.max_upload_size_mb}MB.")

            # Generate safe storage filename
            ext = os.path.splitext(evidence_file.filename)[1].lower()
            if not ext:
                ext = ".png" if is_image else ".mp3"
                
            storage_filename = f"{uuid.uuid4().hex}{ext}"
            file_dest = settings.storage_dir / storage_filename
            with open(file_dest, "wb") as f:
                f.write(file_bytes)

            evidence_id = f"ev_{uuid.uuid4().hex[:12]}"
            
            # Run extraction pipeline
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
                            source_context, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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

            # Persist verification findings
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
    limit: int = 50,
    offset: int = 0
):
    conn = get_connection()
    try:
        query = "SELECT * FROM complaints WHERE 1=1"
        params = []
        
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

        total = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        return {"total": total, "items": items}
    finally:
        conn.close()

@router.get("/{complaint_id}")
def get_complaint_details(complaint_id: str):
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT * FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")

        c_id = complaint["id"]
        
        # Evidence files
        evidence = conn.execute("SELECT * FROM evidence_files WHERE complaint_id = ?", (c_id,)).fetchall()
        
        # Extracted fields
        extracted = conn.execute("SELECT * FROM extracted_fields WHERE complaint_id = ?", (c_id,)).fetchall()
        
        # Verification findings
        findings = conn.execute("SELECT * FROM verification_findings WHERE complaint_id = ?", (c_id,)).fetchall()
        
        # Reviewer notes
        notes = conn.execute("SELECT * FROM reviewer_notes WHERE complaint_id = ? ORDER BY created_at DESC", (c_id,)).fetchall()
        
        # Related complaints through shared indicators
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
            "reviewer_notes": [dict(n) for n in notes],
            "related_leads": [dict(rel) for rel in related]
        }
    finally:
        conn.close()

@router.post("/{complaint_id}/review")
def add_review_note(complaint_id: str, payload: ReviewNoteRequest):
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT id FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")
            
        c_id = complaint["id"]
        note_id = f"rn_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now().isoformat()
        
        conn.execute(
            """
            INSERT INTO reviewer_notes (id, complaint_id, reviewer_name, note, review_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (note_id, c_id, payload.reviewer_name, payload.note, payload.review_status, now_iso)
        )
        
        # Update complaint status
        conn.execute(
            "UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?",
            (payload.review_status, now_iso, c_id)
        )
        conn.commit()
        return {"success": True, "note_id": note_id, "updated_status": payload.review_status}
    finally:
        conn.close()
