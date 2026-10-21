import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database"] == "connected"

def test_demo_cases_endpoint():
    response = client.get("/api/demo/cases")
    assert response.status_code == 200
    data = response.json()
    assert len(data["scenarios"]) == 5

def test_complaints_list_endpoint():
    response = client.get("/api/complaints")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data

def test_overview_metrics_endpoint():
    response = client.get("/api/overview/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_complaints" in data
    assert "awaiting_review" in data
    assert "evidence_needing_manual_review" in data

def test_submit_complaint():
    payload = {
        "language": "en",
        "incident_type": "UPI Fraud",
        "description": "Automated integration test fraud submission.",
        "reported_amount": "5000.0",
        "reported_upi_id": "test.fraud@okaxis",
        "reported_txn_id": "UPI999888777666",
        "victim_phone": "9811223344",
        "victim_state": "Maharashtra"
    }
    response = client.post("/api/complaints/submit", data=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "CS-" in data["reference_id"]
