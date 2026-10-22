from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response, status
from app.services.report_generation import generate_investigation_report, generate_investigation_pdf
from app.core.security import get_optional_user, get_current_user
from app.db.database import get_connection

router = APIRouter(prefix="/reports", tags=["Reports"])

def check_complaint_access(complaint_id: str, current_user: Optional[dict]) -> tuple[dict, str]:
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT id, reference_id, user_id FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint record not found.")

        # Citizen can only access their own complaint
        if current_user and current_user.get("role") == "CITIZEN":
            if complaint["user_id"] != current_user.get("id"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You do not have permission to view reports for this case."
                )
        return dict(complaint), complaint["id"]
    finally:
        conn.close()

@router.get("/{complaint_id}")
def get_report(
    complaint_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    complaint_meta, canonical_id = check_complaint_access(complaint_id, current_user)
    report = generate_investigation_report(canonical_id)
    if not report:
        raise HTTPException(status_code=404, detail="Complaint not found for report generation.")
    return report

@router.get("/{complaint_id}/pdf")
def download_report_pdf(
    complaint_id: str,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    complaint_meta, canonical_id = check_complaint_access(complaint_id, current_user)
    pdf_bytes = generate_investigation_pdf(canonical_id)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Could not generate PDF for the requested complaint.")

    ref_id = complaint_meta["reference_id"]
    filename = f"cybersaarthi_dossier_{ref_id}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
        }
    )
