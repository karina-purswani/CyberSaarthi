import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_connection
from app.services.report_generation import generate_investigation_pdf, generate_investigation_report

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    # Login officer
    res_off = client.post("/api/auth/login", json={
        "email": "officer@cybersaarthi.gov.in",
        "password": "Officer@CyberSaarthi2026",
        "portal_type": "officer"
    })
    off_token = res_off.json()["access_token"]

    # Login citizen
    res_cit = client.post("/api/auth/login", json={
        "email": "citizen@example.com",
        "password": "Citizen@CyberSaarthi2026",
        "portal_type": "citizen"
    })
    cit_token = res_cit.json()["access_token"]

    return {"officer": off_token, "citizen": cit_token}


def test_generate_pdf_for_real_case(auth_tokens):
    # 1. Fetch a real persisted complaint
    res_list = client.get("/api/complaints?limit=1", headers={"Authorization": f"Bearer {auth_tokens['officer']}"})
    assert res_list.status_code == 200
    items = res_list.json()["items"]
    assert len(items) > 0
    test_case = items[0]
    case_id = test_case["id"]
    ref_id = test_case["reference_id"]

    # 2. Call PDF endpoint
    res_pdf = client.get(f"/api/reports/{case_id}/pdf", headers={"Authorization": f"Bearer {auth_tokens['officer']}"})
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert "attachment;" in res_pdf.headers["content-disposition"]
    assert f"cybersaarthi_dossier_{ref_id}.pdf" in res_pdf.headers["content-disposition"]
    assert len(res_pdf.content) > 1000
    assert res_pdf.content.startswith(b"%PDF-")


def test_pdf_contains_case_specific_data():
    # 3. Create a synthetic case and generate PDF bytes
    conn = get_connection()
    c_id = f"cmp_pdf_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-PDF-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                victim_phone, victim_state, status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, 'usr_officer_sharma', datetime('now'), 'en', 'Credit Card Phishing',
                     'Victim received fraudulent banking SMS link.', 34500.0, 'TXN9988112233', 'scam.link@okhdfc',
                     '9876543210', 'Karnataka', 'UNDER_INVESTIGATION', 'HIGH', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )
        conn.commit()

        pdf_bytes = generate_investigation_pdf(c_id)
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 2000
        assert pdf_bytes.startswith(b"%PDF-")

        # Verify PDF text content using pypdf extraction
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) >= 1
        full_text = "".join(page.extract_text() for page in reader.pages)
        assert ref_id in full_text
        assert "CYBERSAARTHI" in full_text.upper()
        assert "Credit Card Phishing" in full_text
        assert "34,500.00" in full_text
    finally:
        conn.close()


def test_pdf_handles_empty_evidence_and_notes():
    # 4. Empty evidence and notes sections handled gracefully
    conn = get_connection()
    c_id = f"cmp_empty_pdf_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-EMPTY-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, 'usr_citizen_patel', datetime('now'), 'en', 'Identity Theft',
                     'Case without evidence attachments or notes.', 'AWAITING_REVIEW', 'LOW', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )
        conn.commit()

        pdf_bytes = generate_investigation_pdf(c_id)
        assert pdf_bytes is not None
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF-")
    finally:
        conn.close()


def test_pdf_unknown_case_returns_404():
    # 5. Unknown case returns 404
    res = client.get("/api/reports/cmp_does_not_exist_at_all/pdf")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_pdf_unauthorized_citizen_rejected(auth_tokens):
    # 6. Unauthorized citizen cannot download report of another user
    conn = get_connection()
    c_id = f"cmp_officer_only_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-OFFICER-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, 'usr_officer_sharma', datetime('now'), 'en', 'Classified Lead',
                     'Restricted case data', 'UNDER_INVESTIGATION', 'HIGH', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )
        conn.commit()
    finally:
        conn.close()

    # Citizen tries to access officer's case
    headers = {"Authorization": f"Bearer {auth_tokens['citizen']}"}
    res = client.get(f"/api/reports/{c_id}/pdf", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]
