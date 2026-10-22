from typing import Optional
from fastapi import APIRouter, Query, Depends
from app.services.intelligence_graph import get_intelligence_graph_data
from app.core.security import get_optional_user

router = APIRouter(prefix="/graph", tags=["Intelligence Graph"])

@router.get("")
def get_graph(
    focus_complaint_id: Optional[str] = Query(None, description="Optional complaint ID to focus the subgraph on"),
    indicator_type: Optional[str] = Query(None, description="Filter by indicator type: UPI_ID, PHONE_NUMBER, TRANSACTION_ID, etc."),
    category: Optional[str] = Query(None, description="Filter by node category: COMPLAINT, EVIDENCE, PERSON, UPI_ID, PHONE_NUMBER, TRANSACTION_ID, BANK_ACCOUNT, IP_ADDRESS"),
    relationship_type: Optional[str] = Query(None, description="Filter by relationship: INVESTIGATIVE_LEAD, DIRECT_OBSERVED, EVIDENCE_LINK"),
    search: Optional[str] = Query(None, description="Search term for reference ID or indicator label"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    return get_intelligence_graph_data(
        focus_complaint_id=focus_complaint_id,
        indicator_type=indicator_type,
        category=category,
        relationship_type=relationship_type,
        search=search
    )
