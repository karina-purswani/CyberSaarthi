import io
import json
import pytest
import uuid
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_connection

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


def test_csv_import_preview_and_execute(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['officer']}"}

    ref1 = f"CS-IMP-{uuid.uuid4().hex[:4].upper()}"
    ref2 = f"CS-IMP-{uuid.uuid4().hex[:4].upper()}"
    txn1 = f"TXN{uuid.uuid4().hex[:10].upper()}"
    txn2 = f"TXN{uuid.uuid4().hex[:10].upper()}"

    csv_content = f"""incident_type,description,reported_amount,reported_txn_id,reported_upi_id,victim_phone,victim_state,reference_id
Investment Scam,Victim duped into fake crypto trading scheme,45000.00,{txn1},scam.trader@okaxis,9876543210,Maharashtra,{ref1}
Lottery Fraud,Victim received fake lottery WhatsApp notification,12500.00,{txn2},lottery.prize@ybl,9811223344,Gujarat,{ref2}
"""

    # 1. Preview
    files = {"file": ("test_import.csv", csv_content.encode("utf-8"), "text/csv")}
    res_prev = client.post("/api/complaints/import/preview", headers=headers, files=files)
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["total_records"] == 2
    assert prev_data["valid_records"] == 2
    assert prev_data["invalid_records"] == 0
    assert prev_data["duplicate_records"] == 0

    # 2. Execute
    exec_payload = {
        "records": [item["data"] for item in prev_data["records"]],
        "skip_duplicates": True
    }
    res_exec = client.post("/api/complaints/import/execute", headers=headers, json=exec_payload)
    assert res_exec.status_code == 200
    exec_data = res_exec.json()
    assert exec_data["success"] is True
    assert exec_data["imported_count"] == 2
    assert ref1 in exec_data["imported_reference_ids"]
    assert ref2 in exec_data["imported_reference_ids"]

    # 3. Verify records exist in database
    conn = get_connection()
    try:
        r1 = conn.execute("SELECT * FROM complaints WHERE reference_id = ?", (ref1,)).fetchone()
        assert r1 is not None
        assert r1["reported_amount"] == 45000.0
        assert r1["incident_type"] == "Investment Scam"

        # Verify initial consistency findings were created
        findings = conn.execute("SELECT * FROM verification_findings WHERE complaint_id = ?", (r1["id"],)).fetchall()
        assert len(findings) == 3
        for f in findings:
            assert f["display_status"] == "Insufficient Data"
    finally:
        conn.close()


def test_json_import_preview_and_execute(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['officer']}"}

    ref = f"CS-JSON-{uuid.uuid4().hex[:4].upper()}"
    txn = f"TXN{uuid.uuid4().hex[:10].upper()}"

    json_payload = [
        {
            "incident_type": "Identity Theft",
            "description": "Unauthorized loan account opened using victim PAN card.",
            "reported_amount": 78000.00,
            "reported_txn_id": txn,
            "reported_upi_id": "loan.fraud@icici",
            "victim_phone": "9922334455",
            "victim_state": "Delhi",
            "reference_id": ref
        }
    ]

    files = {"file": ("complaints.json", json.dumps(json_payload).encode("utf-8"), "application/json")}
    res_prev = client.post("/api/complaints/import/preview", headers=headers, files=files)
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["total_records"] == 1
    assert prev_data["valid_records"] == 1

    res_exec = client.post("/api/complaints/import/execute", headers=headers, json={
        "records": [item["data"] for item in prev_data["records"]],
        "skip_duplicates": True
    })
    assert res_exec.status_code == 200
    assert res_exec.json()["imported_count"] == 1
    assert ref in res_exec.json()["imported_reference_ids"]


def test_duplicate_and_invalid_import_handling(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['officer']}"}

    # Fetch an existing reference_id from the database
    conn = get_connection()
    try:
        existing = conn.execute("SELECT reference_id FROM complaints LIMIT 1").fetchone()
        existing_ref = existing["reference_id"]
    finally:
        conn.close()

    invalid_csv = f"""incident_type,description,reported_amount,reference_id
,Short,invalid_amount,CS-NEW-01
UPI Fraud,,5000.00,CS-NEW-02
Phishing,Legitimate description of fraud,10000.00,{existing_ref}
"""
    files = {"file": ("invalid.csv", invalid_csv.encode("utf-8"), "text/csv")}
    res = client.post("/api/complaints/import/preview", headers=headers, files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 3
    # Row 1 has missing incident_type, short description, invalid amount
    assert data["records"][0]["is_valid"] is False
    # Row 2 has missing description
    assert data["records"][1]["is_valid"] is False
    # Row 3 is duplicate of existing_ref
    assert data["records"][2]["is_duplicate"] is True
    assert "already exists" in data["records"][2]["duplicate_reason"]


def test_upload_evidence_to_existing_case(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['officer']}"}

    # 1. Create a synthetic case
    conn = get_connection()
    c_id = f"cmp_ev_up_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-EVUP-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, 'usr_officer_sharma', datetime('now'), 'en', 'E-Commerce Fraud',
                     'Purchased mobile phone via fake website.', 24999.0, 'TXN8899001122', 'gadgets.store@okaxis',
                     'AWAITING_REVIEW', 'MEDIUM', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )
        conn.commit()
    finally:
        conn.close()

    # 2. Generate a valid synthetic PNG image using Pillow
    img = Image.new("RGB", (300, 150), color=(255, 255, 255))
    img_buf = io.BytesIO()
    img.save(img_buf, format="PNG")
    img_bytes = img_buf.getvalue()

    # 3. Upload evidence
    files = {"evidence_file": ("test_receipt_payment.png", img_bytes, "image/png")}
    res_upload = client.post(f"/api/complaints/{c_id}/evidence", headers=headers, files=files)
    assert res_upload.status_code == 201
    up_data = res_upload.json()
    assert up_data["success"] is True
    assert up_data["original_filename"] == "test_receipt_payment.png"
    assert up_data["ocr_status"] == "COMPLETED"

    # 4. Verify evidence record and file persistence in SQLite
    conn = get_connection()
    try:
        ev_row = conn.execute("SELECT * FROM evidence_files WHERE complaint_id = ?", (c_id,)).fetchone()
        assert ev_row is not None
        assert ev_row["original_filename"] == "test_receipt_payment.png"
        assert ev_row["storage_filename"] == up_data["storage_filename"]

        # Verify evidence streaming endpoint works
        res_stream = client.get(f"/api/evidence/file/{ev_row['storage_filename']}", headers=headers)
        assert res_stream.status_code == 200
        assert res_stream.headers["content-type"] == "image/png"
        assert len(res_stream.content) == len(img_bytes)

        # Verify complaint details returned includes the attached evidence and findings
        res_detail = client.get(f"/api/complaints/{c_id}", headers=headers)
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert len(detail_data["evidence_files"]) == 1
        assert detail_data["evidence_files"][0]["original_filename"] == "test_receipt_payment.png"
    finally:
        conn.close()


def test_persistence_across_connection_reset():
    # 5. Verify records survive connection close & re-open
    conn = get_connection()
    test_ref = f"CS-PERSIST-{uuid.uuid4().hex[:4].upper()}"
    test_id = f"cmp_persist_{uuid.uuid4().hex[:8]}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (id, reference_id, user_id, submission_time, language, incident_type, description, status, priority, is_demo, created_at, updated_at)
            VALUES (?, ?, 'usr_citizen_patel', datetime('now'), 'en', 'Test Persist', 'Persistence check', 'AWAITING_REVIEW', 'LOW', 1, datetime('now'), datetime('now'))
            """,
            (test_id, test_ref)
        )
        conn.commit()
    finally:
        conn.close()

    # Reconnect fresh
    new_conn = get_connection()
    try:
        row = new_conn.execute("SELECT * FROM complaints WHERE reference_id = ?", (test_ref,)).fetchone()
        assert row is not None
        assert row["id"] == test_id
        assert row["description"] == "Persistence check"
    finally:
        new_conn.close()
