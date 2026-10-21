from fastapi import APIRouter
from app.db.database import get_connection

router = APIRouter(prefix="/overview", tags=["Overview"])

@router.get("/metrics")
def get_overview_metrics():
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        awaiting = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'AWAITING_REVIEW'").fetchone()[0]
        in_progress = conn.execute("SELECT COUNT(*) FROM complaints WHERE status = 'IN_PROGRESS'").fetchone()[0]
        
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

        # Recent 6 submissions
        recent = conn.execute(
            """
            SELECT id, reference_id, submission_time, incident_type, reported_amount, status, priority, is_demo
            FROM complaints
            ORDER BY submission_time DESC
            LIMIT 6
            """
        ).fetchall()

        # Check if demo cases present
        demo_count = conn.execute("SELECT COUNT(*) FROM complaints WHERE is_demo = 1").fetchone()[0]

        return {
            "total_complaints": total,
            "awaiting_review": awaiting,
            "under_investigation": in_progress,
            "evidence_needing_manual_review": needing_review,
            "complaints_with_shared_indicators": shared_leads,
            "total_amount_reported": round(float(total_amt), 2),
            "recent_submissions": [dict(r) for r in recent],
            "contains_demo_data": demo_count > 0,
            "demo_count": demo_count
        }
    finally:
        conn.close()
