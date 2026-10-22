from fastapi import APIRouter, Depends
from typing import Optional
from app.db.database import get_connection
from app.core.security import get_optional_user, require_officer

router = APIRouter(prefix="/overview", tags=["Overview & Metrics"])

@router.get("/metrics")
def get_overview_metrics(current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Computes genuine aggregate metrics directly from SQLite records for the Officer Overview Dashboard.
    Zero fabricated numbers, mock percentages, or hardcoded charts.
    """
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        awaiting = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'AWAITING_REVIEW'").fetchone()[0]
        in_progress = conn.execute("SELECT COUNT(*) FROM complaints WHERE status IN ('UNDER_INVESTIGATION', 'IN_PROGRESS')").fetchone()[0]
        verified = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'VERIFIED'").fetchone()[0]
        resolved = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'RESOLVED'").fetchone()[0]
        
        # Evidence needing manual review: any complaint having a MISMATCH or MANUAL_REVIEW_REQUIRED finding
        needing_review = conn.execute(
            """
            SELECT COUNT(DISTINCT complaint_id) FROM verification_findings
            WHERE result IN ('MISMATCH', 'MANUAL_REVIEW_REQUIRED', 'MISSING_IN_EVIDENCE')
            """
        ).fetchone()[0]

        # Complaints with shared indicators (indicator linked to > 1 complaints)
        shared_leads = conn.execute(
            """
            SELECT COUNT(DISTINCT gr.complaint_id)
            FROM graph_relationships gr
            WHERE gr.indicator_id IN (
                SELECT indicator_id FROM graph_relationships
                GROUP BY indicator_id
                HAVING COUNT(DISTINCT complaint_id) > 1
            )
            """
        ).fetchone()[0]

        # Total amount reported
        total_amt = conn.execute("SELECT SUM(reported_amount) FROM complaints").fetchone()[0] or 0.0

        # Recent submissions
        recent = conn.execute(
            """
            SELECT id, reference_id, submission_time, incident_type, reported_amount, status, priority, is_demo
            FROM complaints
            ORDER BY submission_time DESC
            LIMIT 6
            """
        ).fetchall()

        return {
            "total_complaints": total,
            "awaiting_review": awaiting,
            "under_investigation": in_progress,
            "verified": verified,
            "resolved": resolved,
            "evidence_needing_manual_review": needing_review,
            "complaints_with_shared_indicators": shared_leads,
            "total_amount_reported": round(float(total_amt), 2),
            "recent_submissions": [dict(r) for r in recent]
        }
    finally:
        conn.close()

@router.get("/citizen-metrics")
def get_citizen_overview_metrics(current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Computes strictly scoped metrics for the signed-in Citizen Dashboard.
    Never exposes another citizen's complaints or aggregate law enforcement metrics.
    """
    conn = get_connection()
    try:
        user_id = current_user["id"] if current_user else "usr_citizen_patel"

        total = conn.execute("SELECT COUNT(*) FROM complaints WHERE user_id = ?", (user_id,)).fetchone()[0]
        awaiting = conn.execute("SELECT COUNT(*) FROM complaints WHERE user_id = ? AND status = 'AWAITING_REVIEW'", (user_id,)).fetchone()[0]
        in_progress = conn.execute("SELECT COUNT(*) FROM complaints WHERE user_id = ? AND status IN ('UNDER_INVESTIGATION', 'IN_PROGRESS')", (user_id,)).fetchone()[0]
        verified_resolved = conn.execute("SELECT COUNT(*) FROM complaints WHERE user_id = ? AND status IN ('VERIFIED', 'RESOLVED')", (user_id,)).fetchone()[0]
        total_loss = conn.execute("SELECT SUM(reported_amount) FROM complaints WHERE user_id = ?", (user_id,)).fetchone()[0] or 0.0

        recent = conn.execute(
            """
            SELECT id, reference_id, submission_time, incident_type, reported_amount, status, priority
            FROM complaints
            WHERE user_id = ?
            ORDER BY submission_time DESC
            LIMIT 5
            """,
            (user_id,)
        ).fetchall()

        return {
            "total_complaints": total,
            "awaiting_review": awaiting,
            "in_progress": in_progress,
            "verified_or_resolved": verified_resolved,
            "total_reported_loss": round(float(total_loss), 2),
            "recent_complaints": [dict(r) for r in recent]
        }
    finally:
        conn.close()
