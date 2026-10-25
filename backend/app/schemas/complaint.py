from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ComplaintCreateRequest(BaseModel):
    language: str = Field(default="en")
    incident_type: str
    description: str
    reported_amount: Optional[float] = None
    reported_txn_id: Optional[str] = None
    reported_upi_id: Optional[str] = None
    incident_datetime: Optional[str] = None
    victim_phone: Optional[str] = None
    victim_state: Optional[str] = None

class ReviewNoteRequest(BaseModel):
    reviewer_name: Optional[str] = None
    note: str
    review_status: str

class StatusUpdateRequest(BaseModel):
    new_status: str
    reason: Optional[str] = None

class FieldCorrectionRequest(BaseModel):
    corrected_value: str
    reason: str

class EmailReportRequest(BaseModel):
    recipient_email: Optional[str] = None

class EmailConfigResponse(BaseModel):
    smtp_configured: bool
    test_recipient_email: str
    email_from: str

class ComplaintSummaryItem(BaseModel):
    id: str
    reference_id: str
    submission_time: str
    language: str
    incident_type: str
    reported_amount: Optional[float] = None
    reported_upi_id: Optional[str] = None
    reported_txn_id: Optional[str] = None
    status: str
    priority: str
    evidence_count: int
    findings_count: int
    mismatch_count: int
    is_demo: bool

class OverviewMetrics(BaseModel):
    total_complaints: int
    awaiting_review: int
    under_investigation: int
    evidence_needing_manual_review: int
    complaints_with_shared_indicators: int
    total_amount_reported: float
    recent_submissions: List[Dict[str, Any]]

class ImportPreviewItem(BaseModel):
    row_number: int
    data: Dict[str, Any]
    is_valid: bool
    is_duplicate: bool
    errors: List[str]
    duplicate_reason: Optional[str] = None

class ImportPreviewResponse(BaseModel):
    total_records: int
    valid_records: int
    duplicate_records: int
    invalid_records: int
    records: List[ImportPreviewItem]

class ImportExecuteRequest(BaseModel):
    records: List[Dict[str, Any]]
    skip_duplicates: bool = True

class ImportExecuteResponse(BaseModel):
    success: bool
    imported_count: int
    skipped_count: int
    rejected_count: int
    imported_reference_ids: List[str]
    errors: List[str]
