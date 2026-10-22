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
