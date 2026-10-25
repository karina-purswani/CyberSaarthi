from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response, status
from app.services.report_generation import generate_investigation_report, generate_investigation_pdf
from app.services.email_service import send_complaint_report_email
from app.schemas.complaint import EmailReportRequest, EmailConfigResponse
from app.core.security import get_optional_user, get_current_user
from app.core.config import settings
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
                    detail="Access denied. You do not have permission to view or dispatch reports for this case."
                )
        return dict(complaint), complaint["id"]
    finally:
        conn.close()

@router.get("/email-config", response_model=EmailConfigResponse)
def get_email_configuration(
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Returns public email dispatch status and configured demonstration inbox address.
    Never exposes passwords, keys, or internal transport credentials.
    """
    return {
        "smtp_configured": bool(settings.smtp_host.strip()),
        "test_recipient_email": settings.test_recipient_email,
        "email_from": settings.email_from
    }

@router.post("/{complaint_id}/email")
def email_report_dossier(
    complaint_id: str,
    request: Optional[EmailReportRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates and emails the cybercrime report and PDF dossier to the demonstration inbox.
    Strictly enforces citizen ownership or officer/admin authorization.
    """
    complaint_meta, canonical_id = check_complaint_access(complaint_id, current_user)
    
    recipient = request.recipient_email if request else None
    
    try:
        result = send_complaint_report_email(canonical_id, recipient)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        # Debounce or generation error
        err_msg = str(e)
        if "recently dispatched" in err_msg:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=err_msg)
    except ConnectionError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete email dispatch. Please try again later."
        )

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

