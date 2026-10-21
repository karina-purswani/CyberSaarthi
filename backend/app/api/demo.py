import json
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from app.db.database import get_connection
from app.services.evidence_extraction import process_evidence_file
from app.services.verification_engine import run_verification_pipeline
from app.services.intelligence_graph import update_complaint_indicators

router = APIRouter(prefix="/demo", tags=["Demonstration"])

DEMO_CASES_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "demo_cases.json"

@router.get("/cases")
def list_demo_scenarios():
    """
    Returns the synthetic demonstration cases with documented expected outcomes for judge evaluation.
    """
    if not DEMO_CASES_FILE.exists():
        raise HTTPException(status_code=404, detail="Demo cases fixture not found.")
    with open(DEMO_CASES_FILE, "r", encoding="utf-8") as f:
        cases = json.load(f)
    return {"scenarios": cases}

@router.post("/seed")
def seed_demo_data():
    """
    Seeds the 5 documented demonstration scenarios into the database idempotently.
    Executes real OCR extraction on the generated receipt fixtures and links indicators.
    """
    if not DEMO_CASES_FILE.exists():
        raise HTTPException(status_code=404, detail="Demo cases fixture not found.")
        
    with open(DEMO_CASES_FILE, "r", encoding="utf-8") as f:
        cases = json.load(f)

    conn = get_connection()
    try:
        seeded_count = 0
        for item in cases:
            c_id = item["id"]
            # Check if complaint already exists
            existing = conn.execute("SELECT id FROM complaints WHERE id = ?", (c_id,)).fetchone()
            if existing:
                continue

            ref_id = item["reference_id"]
            now_iso = item["submission_time"]
            
            conn.execute(
                """
                INSERT INTO complaints (
                    id, reference_id, submission_time, language, incident_type,
                    description, reported_amount, reported_txn_id, reported_upi_id,
                    incident_datetime, victim_phone, victim_state, status, priority,
                    is_demo, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    c_id, ref_id, now_iso, item["language"], item["incident_type"],
                    item["description"], item["reported_amount"], item["reported_txn_id"],
                    item["reported_upi_id"], item["incident_datetime"], item["victim_phone"],
                    item["victim_state"], item.get("status", "AWAITING_REVIEW"),
                    item.get("priority", "MEDIUM"), now_iso, now_iso
                )
            )

            # Process evidence image if exists
            ev_filename = item.get("evidence_filename")
            if ev_filename:
                file_path = settings.storage_dir / ev_filename
                if file_path.exists():
                    ev_id = f"ev_{c_id}"
                    file_size = file_path.stat().st_size
                    
                    # Run extraction pipeline
                    extraction_res = process_evidence_file(file_path)
                    
                    conn.execute(
                        """
                        INSERT INTO evidence_files (
                            id, complaint_id, original_filename, storage_filename,
                            file_type, file_size_bytes, ocr_status, raw_ocr_text,
                            ocr_confidence, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            ev_id, c_id, ev_filename, ev_filename, "image/png",
                            file_size, "COMPLETED", extraction_res.raw_ocr_text,
                            extraction_res.ocr_confidence, now_iso
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
                                    ef_id, ev_id, c_id, fname,
                                    str(val_obj.get("raw", "")),
                                    str(val_obj.get("normalized", "")),
                                    extraction_res.ocr_confidence,
                                    val_obj.get("context", ""),
                                    now_iso
                                )
                            )

                    # Run verification pipeline
                    findings = run_verification_pipeline(
                        complaint={
                            "id": c_id,
                            "reported_amount": item.get("reported_amount"),
                            "reported_txn_id": item.get("reported_txn_id"),
                            "reported_upi_id": item.get("reported_upi_id")
                        },
                        extracted_fields=extraction_res.structured_fields,
                        evidence_id=ev_id
                    )

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
                                vf_id, c_id, ev_id, finding.field_name,
                                finding.complaint_value, finding.evidence_value,
                                finding.normalized_complaint_value, finding.normalized_evidence_value,
                                finding.result, finding.reason, finding.review_recommendation,
                                now_iso
                            )
                        )

            # Register indicators into graph
            update_complaint_indicators(conn, c_id)
            seeded_count += 1

        conn.commit()
        return {
            "success": True,
            "seeded_cases": seeded_count,
            "message": f"Successfully seeded {seeded_count} synthetic cases with OCR extraction and verified intelligence graph."
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")
    finally:
        conn.close()

@router.post("/reset")
def reset_demo_database():
    """
    Cleans database tables and reseeds fresh demo cases.
    """
    conn = get_connection()
    try:
        conn.execute("DELETE FROM reviewer_notes")
        conn.execute("DELETE FROM graph_relationships")
        conn.execute("DELETE FROM graph_indicators")
        conn.execute("DELETE FROM verification_findings")
        conn.execute("DELETE FROM extracted_fields")
        conn.execute("DELETE FROM evidence_files")
        conn.execute("DELETE FROM complaints")
        conn.commit()
    finally:
        conn.close()

    # Reseed
    return seed_demo_data()
