import pytest
import sqlite3
from app.db.database import get_connection
from app.db.init_db import init_db
from app.services.intelligence_graph import (
    register_indicator_and_link,
    get_intelligence_graph_data,
    DISCLAIMER_TEXT
)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_shared_indicator_creates_link():
    conn = get_connection()
    try:
        # Create 2 test complaints
        conn.execute("INSERT OR REPLACE INTO complaints (id, reference_id, submission_time, incident_type, description, status, priority, is_demo, created_at, updated_at) VALUES ('c_test_1', 'REF-001', '2026-10-20T10:00:00', 'UPI Fraud', 'Test 1', 'AWAITING_REVIEW', 'HIGH', 1, 'now', 'now')")
        conn.execute("INSERT OR REPLACE INTO complaints (id, reference_id, submission_time, incident_type, description, status, priority, is_demo, created_at, updated_at) VALUES ('c_test_2', 'REF-002', '2026-10-20T11:00:00', 'UPI Fraud', 'Test 2', 'AWAITING_REVIEW', 'HIGH', 1, 'now', 'now')")
        
        # Link both to the same normalized UPI
        register_indicator_and_link(
            conn=conn,
            complaint_id="c_test_1",
            evidence_id=None,
            indicator_type="UPI_ID",
            raw_val="suspect@ybl",
            norm_val="suspect@ybl",
            rule_applied="TEST_RULE",
            explanation="Test connection 1"
        )
        register_indicator_and_link(
            conn=conn,
            complaint_id="c_test_2",
            evidence_id=None,
            indicator_type="UPI_ID",
            raw_val="suspect@ybl",
            norm_val="suspect@ybl",
            rule_applied="TEST_RULE",
            explanation="Test connection 2"
        )
        conn.commit()
    finally:
        conn.close()

    graph = get_intelligence_graph_data(focus_complaint_id="c_test_1")
    assert graph["lead_disclaimer"] == DISCLAIMER_TEXT
    
    # Check that both REF-001 and REF-002 appear in nodes or clusters
    node_labels = [n["label"] for n in graph["nodes"]]
    assert "REF-001" in node_labels
    assert "REF-002" in node_labels
    assert "suspect@ybl" in node_labels
