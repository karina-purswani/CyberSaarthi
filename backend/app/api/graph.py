from typing import Optional
from fastapi import APIRouter, Query
from app.services.intelligence_graph import get_intelligence_graph_data

router = APIRouter(prefix="/graph", tags=["Intelligence Graph"])

@router.get("")
def get_graph(
    focus_complaint_id: Optional[str] = Query(None, description="Optional complaint ID to focus the subgraph on"),
    indicator_type: Optional[str] = Query(None, description="Filter by indicator type: UPI_ID, PHONE_NUMBER, TRANSACTION_ID")
):
    return get_intelligence_graph_data(
        focus_complaint_id=focus_complaint_id,
        indicator_type=indicator_type
    )
