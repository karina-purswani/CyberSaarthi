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


def test_citizen_metrics_endpoint():
    # Login as citizen
    login_res = client.post("/api/auth/login", json={
        "email": "citizen@example.com",
        "password": "Citizen@CyberSaarthi2026"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    
    res = client.get("/api/overview/citizen-metrics", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "total_complaints" in data
    assert "recent_complaints" in data

def test_officer_field_correction_provenance():
    # 1. Login as officer
    login_res = client.post("/api/auth/login", json={
        "email": "officer@cybersaarthi.gov.in",
        "password": "Officer@CyberSaarthi2026"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get complaints list
    list_res = client.get("/api/complaints", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) > 0
    target_c = items[0]

    # 3. Get complaint detail
    detail_res = client.get(f"/api/complaints/{target_c['id']}", headers=headers)
    assert detail_res.status_code == 200
    c_data = detail_res.json()
    
    if c_data.get("extracted_fields") and len(c_data["extracted_fields"]) > 0:
        field = c_data["extracted_fields"][0]
        evidence_id = field["evidence_id"]
        field_id = field["id"]
        original_raw = field.get("raw_value")

        # 4. Perform officer manual correction
        corr_res = client.post(
            f"/api/complaints/{target_c['id']}/evidence/{evidence_id}/fields/{field_id}/correct",
            headers=headers,
            json={
                "corrected_value": "99999",
                "reason": "Test audit correction of misrecognized numeral."
            }
        )
        assert corr_res.status_code == 200
        corr_data = corr_res.json()
        assert corr_data["is_officer_corrected"] is True
        assert corr_data["corrected_value"] == "99999"
        assert corr_data["reason"] == "Test audit correction of misrecognized numeral."
