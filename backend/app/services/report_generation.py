from datetime import datetime
from typing import Dict, Any, Optional
from app.db.database import get_connection

DISCLAIMER = (
    "NOTICE: This document is an automated investigation-support summary produced by CyberSaarthi. "
    "It is designed solely to assist law enforcement officers, cyber cells, and authorized reviewers. "
    "It is NOT a First Information Report (FIR), court summons, or determination of guilt."
)

def generate_investigation_report(complaint_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT * FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        
        if not complaint:
            return None
            
        c_id = complaint["id"]
        
        # Evidence files
        evidence_rows = conn.execute(
            "SELECT * FROM evidence_files WHERE complaint_id = ?",
            (c_id,)
        ).fetchall()
        
        # Extracted fields
        extracted_rows = conn.execute(
            "SELECT * FROM extracted_fields WHERE complaint_id = ?",
            (c_id,)
        ).fetchall()
        
        # Verification findings
        findings_rows = conn.execute(
            "SELECT * FROM verification_findings WHERE complaint_id = ?",
            (c_id,)
        ).fetchall()
        
        # Reviewer notes
        notes_rows = conn.execute(
            "SELECT * FROM reviewer_notes WHERE complaint_id = ? ORDER BY created_at DESC",
            (c_id,)
        ).fetchall()
        
        # Shared leads / graph connections
        related_rows = conn.execute(
            """
            SELECT gi.indicator_type, gi.normalized_value, c2.reference_id as related_ref, c2.incident_type as related_type
            FROM graph_relationships gr1
            JOIN graph_relationships gr2 ON gr1.indicator_id = gr2.indicator_id AND gr1.complaint_id != gr2.complaint_id
            JOIN graph_indicators gi ON gr1.indicator_id = gi.id
            JOIN complaints c2 ON gr2.complaint_id = c2.id
            WHERE gr1.complaint_id = ?
            """,
            (c_id,)
        ).fetchall()

        report = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "platform": "CyberSaarthi Intelligence v1.0",
                "document_type": "INVESTIGATION_SUPPORT_DOSSIER",
                "disclaimer": DISCLAIMER
            },
            "complaint": {
                "reference_id": complaint["reference_id"],
                "submission_time": complaint["submission_time"],
                "language": complaint["language"],
                "incident_type": complaint["incident_type"],
                "description": complaint["description"],
                "reported_amount": complaint["reported_amount"],
                "reported_txn_id": complaint["reported_txn_id"],
                "reported_upi_id": complaint["reported_upi_id"],
                "victim_phone": complaint["victim_phone"],
                "victim_state": complaint["victim_state"],
                "status": complaint["status"],
                "priority": complaint["priority"],
                "is_demo": bool(complaint["is_demo"])
            },
            "evidence_inventory": [
                {
                    "id": ev["id"],
                    "original_filename": ev["original_filename"],
                    "file_type": ev["file_type"],
                    "file_size_bytes": ev["file_size_bytes"],
                    "ocr_status": ev["ocr_status"],
                    "ocr_confidence": ev["ocr_confidence"]
                }
                for ev in evidence_rows
            ],
            "extracted_entities": [
                {
                    "field_name": ef["field_name"],
                    "raw_value": ef["raw_value"],
                    "normalized_value": ef["normalized_value"],
                    "confidence": ef["confidence"],
                    "source_context": ef["source_context"]
                }
                for ef in extracted_rows
            ],
            "verification_matrix": [
                {
                    "field_name": vf["field_name"],
                    "complaint_value": vf["complaint_value"],
                    "evidence_value": vf["evidence_value"],
                    "normalized_complaint_value": vf["normalized_complaint_value"],
                    "normalized_evidence_value": vf["normalized_evidence_value"],
                    "result": vf["result"],
                    "reason": vf["reason"],
                    "review_recommendation": vf["review_recommendation"]
                }
                for vf in findings_rows
            ],
            "investigative_leads": [
                {
                    "indicator_type": r["indicator_type"],
                    "indicator_value": r["normalized_value"],
                    "linked_complaint": r["related_ref"],
                    "linked_incident_type": r["related_type"]
                }
                for r in related_rows
            ],
            "reviewer_notes": [
                {
                    "reviewer_name": rn["reviewer_name"],
                    "note": rn["note"],
                    "status_at_review": rn["review_status"],
                    "timestamp": rn["created_at"]
                }
                for rn in notes_rows
            ]
        }
        return report
    finally:
        conn.close()
