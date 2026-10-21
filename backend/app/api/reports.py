from fastapi import APIRouter, HTTPException
from app.services.report_generation import generate_investigation_report

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{complaint_id}")
def get_report(complaint_id: str):
    report = generate_investigation_report(complaint_id)
    if not report:
        raise HTTPException(status_code=404, detail="Complaint not found for report generation.")
    return report
