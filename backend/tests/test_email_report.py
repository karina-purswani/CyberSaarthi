import pytest
import uuid
import smtplib
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_connection
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def auth_users():
    # Login officer
    res_off = client.post("/api/auth/login", json={
        "email": "officer@cybersaarthi.gov.in",
        "password": "Officer@CyberSaarthi2026",
        "portal_type": "officer"
    })
    off_token = res_off.json()["access_token"]

    # Login citizen 1 (citizen@example.com, id: usr_citizen_001)
    res_cit = client.post("/api/auth/login", json={
        "email": "citizen@example.com",
        "password": "Citizen@CyberSaarthi2026",
        "portal_type": "citizen"
    })
    cit_data = res_cit.json()
    cit_token = cit_data["access_token"]
    cit_id = cit_data["user"]["id"]

    # Register/login citizen 2
    cit2_email = f"citizen2_{uuid.uuid4().hex[:6]}@example.com"
    res_cit2 = client.post("/api/auth/register", json={
        "email": cit2_email,
        "password": "Password123!",
        "full_name": "Citizen Two",
        "phone": "9998887776"
    })
    cit2_data = res_cit2.json()
    cit2_token = cit2_data["access_token"]
    cit2_id = cit2_data["user"]["id"]

    return {
        "officer_token": off_token,
        "citizen1_token": cit_token,
        "citizen1_id": cit_id,
        "citizen2_token": cit2_token,
        "citizen2_id": cit2_id,
    }


def test_email_config_endpoint():
    res = client.get("/api/reports/email-config")
    assert res.status_code == 200
    data = res.json()
    assert "smtp_configured" in data
    assert "test_recipient_email" in data
    assert "email_from" in data
    # Ensure no credentials leaked
    assert "password" not in str(data).lower()
    assert "secret" not in str(data).lower()


def test_email_report_unauthenticated():
    res = client.post("/api/reports/some_complaint_id/email", json={})
    assert res.status_code == 401


def test_email_report_nonexistent_case(auth_users):
    res = client.post(
        "/api/reports/nonexistent_id_9999/email",
        headers={"Authorization": f"Bearer {auth_users['citizen1_token']}"},
        json={}
    )
    assert res.status_code == 404


def test_email_report_citizen_ownership_enforcement(auth_users):
    conn = get_connection()
    c_id = f"cmp_own_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-OWN-{uuid.uuid4().hex[:4].upper()}"
    try:
        # Insert complaint owned strictly by citizen 1
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                victim_phone, victim_state, status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, datetime('now'), 'en', 'UPI Collect Request Fraud',
                     'Scammer sent deceptive collect request.', 12500.0, 'TXN1122334455', 'fraud@okicici',
                     '9876543210', 'Maharashtra', 'AWAITING_REVIEW', 'MEDIUM', 0, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id, auth_users["citizen1_id"])
        )
        conn.commit()

        # Citizen 2 attempts to email Citizen 1's report -> Must return 403 Forbidden
        res_forbidden = client.post(
            f"/api/reports/{c_id}/email",
            headers={"Authorization": f"Bearer {auth_users['citizen2_token']}"},
            json={"recipient_email": "intruder@example.com"}
        )
        assert res_forbidden.status_code == 403
        assert "Access denied" in res_forbidden.json()["detail"]

        # Citizen 1 emails their OWN report -> Must succeed (200 OK)
        res_success = client.post(
            f"/api/reports/{c_id}/email",
            headers={"Authorization": f"Bearer {auth_users['citizen1_token']}"},
            json={"recipient_email": "owner-test@cybersaarthi.demo"}
        )
        assert res_success.status_code == 200
        data = res_success.json()
        assert data["success"] is True
        assert data["recipient"] == "owner-test@cybersaarthi.demo"
        assert data["reference_id"] == ref_id
        assert data["pdf_size_bytes"] > 500
        assert f"cybersaarthi_dossier_{ref_id}.pdf" in data["pdf_filename"]

        # Rapid duplicate send within debounce window -> Must return 429
        res_dup = client.post(
            f"/api/reports/{c_id}/email",
            headers={"Authorization": f"Bearer {auth_users['citizen1_token']}"},
            json={"recipient_email": "owner-test@cybersaarthi.demo"}
        )
        assert res_dup.status_code == 429
        assert "recently dispatched" in res_dup.json()["detail"]

    finally:
        conn.execute("DELETE FROM complaints WHERE id = ?", (c_id,))
        conn.commit()
        conn.close()


def test_email_report_mock_smtp_dispatch(auth_users):
    conn = get_connection()
    c_id = f"cmp_smtp_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-SMTP-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                victim_phone, victim_state, status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, datetime('now'), 'en', 'Phishing Portal',
                     'Fake banking login portal captured credentials.', 45000.0, 'TXN88776655', 'phish@okhdfc',
                     '9876543210', 'Delhi', 'UNDER_INVESTIGATION', 'HIGH', 0, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id, auth_users["citizen1_id"])
        )
        conn.commit()

        # Temporarily configure mock SMTP host in settings
        with patch.object(settings, "smtp_host", "smtp.mockmail.internal"):
            with patch.object(settings, "smtp_user", "test_user"):
                with patch.object(settings, "smtp_password", "test_pass"):
                    with patch("smtplib.SMTP") as mock_smtp_cls:
                        mock_server = MagicMock()
                        mock_smtp_cls.return_value.__enter__.return_value = mock_server

                        res = client.post(
                            f"/api/reports/{c_id}/email",
                            headers={"Authorization": f"Bearer {auth_users['citizen1_token']}"},
                            json={"recipient_email": "live-test@cybersaarthi.demo"}
                        )
                        assert res.status_code == 200
                        data = res.json()
                        assert data["status"] == "sent"
                        assert data["mode"] == "smtp"
                        assert mock_server.send_message.called
                        assert mock_server.login.called

    finally:
        conn.execute("DELETE FROM complaints WHERE id = ?", (c_id,))
        conn.commit()
        conn.close()


def test_email_report_smtp_connection_failure(auth_users):
    conn = get_connection()
    c_id = f"cmp_fail_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-FAIL-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                victim_phone, victim_state, status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, ?, datetime('now'), 'en', 'SIM Swap Fraud',
                     'SIM cloned and funds transferred.', 85000.0, 'TXN33221100', 'sim.fraud@okaxis',
                     '9876543210', 'Gujarat', 'AWAITING_REVIEW', 'HIGH', 0, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id, auth_users["citizen1_id"])
        )
        conn.commit()

        # Test SMTP server connection failure handling -> Must return 502 Bad Gateway
        with patch.object(settings, "smtp_host", "smtp.invalid.nonexistent.server"):
            with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, b"Connection refused")):
                res = client.post(
                    f"/api/reports/{c_id}/email",
                    headers={"Authorization": f"Bearer {auth_users['citizen1_token']}"},
                    json={"recipient_email": "fail-test@cybersaarthi.demo"}
                )
                assert res.status_code == 502
                assert "Could not connect to SMTP server" in res.json()["detail"]

    finally:
        conn.execute("DELETE FROM complaints WHERE id = ?", (c_id,))
        conn.commit()
        conn.close()
