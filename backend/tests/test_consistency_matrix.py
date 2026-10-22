import pytest
import sqlite3
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_connection
from app.services.verification_engine import (
    verify_amount,
    verify_txn_id,
    verify_upi_id,
    evaluate_complaint_consistency,
    map_result_to_display_status,
    VerificationResultType
)

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


def test_matching_complaint_and_evidence():
    # 1. Matching complaint and evidence values
    res_amt = verify_amount(
        complaint_id="c_match",
        evidence_id="ev_1",
        reported_amount=15000.0,
        extracted_amount={"raw": "₹ 15,000.00", "normalized": "15000.00"}
    )
    assert res_amt.result == VerificationResultType.MATCH
    assert res_amt.display_status == "Consistent"
    assert map_result_to_display_status(res_amt.result) == "Consistent"

    res_txn = verify_txn_id(
        complaint_id="c_match",
        evidence_id="ev_1",
        reported_txn="UPI998877665544",
        extracted_txn={"raw": "UPI998877665544", "normalized": "UPI998877665544"}
    )
    assert res_txn.result == VerificationResultType.MATCH
    assert res_txn.display_status == "Consistent"

    res_upi = verify_upi_id(
        complaint_id="c_match",
        evidence_id="ev_1",
        reported_upi="merchant.pay@okaxis",
        extracted_upi={"raw": "merchant.pay@okaxis", "normalized": "merchant.pay@okaxis"}
    )
    assert res_upi.result == VerificationResultType.MATCH
    assert res_upi.display_status == "Consistent"


def test_conflicting_transaction_amounts():
    # 2. Conflicting transaction amounts
    finding = verify_amount(
        complaint_id="c_mismatch_amt",
        evidence_id="ev_amt",
        reported_amount=50000.0,
        extracted_amount={"raw": "₹ 5,000.00", "normalized": "5000.00"}
    )
    assert finding.result == VerificationResultType.MISMATCH
    assert finding.display_status == "Inconsistent"
    assert "Delta: ₹45000.00" in finding.reason
    assert "does not automatically establish forgery" in finding.reason


def test_conflicting_transaction_identifiers():
    # 3. Conflicting transaction identifiers
    finding = verify_txn_id(
        complaint_id="c_mismatch_txn",
        evidence_id="ev_txn",
        reported_txn="TXN111222333444",
        extracted_txn={"raw": "TXN999888777666", "normalized": "TXN999888777666"}
    )
    assert finding.result == VerificationResultType.MISMATCH
    assert finding.display_status == "Inconsistent"
    assert "Identifier conflict" in finding.reason


def test_missing_complaint_fields():
    # 4. Missing complaint fields
    finding = verify_txn_id(
        complaint_id="c_missing_comp",
        evidence_id="ev_1",
        reported_txn=None,
        extracted_txn={"raw": "UTR776655443322", "normalized": "UTR776655443322"}
    )
    assert finding.result == VerificationResultType.MISSING_IN_COMPLAINT
    assert finding.display_status == "Insufficient Data"
    assert "not provided in written complaint" in finding.reason


def test_missing_evidence_fields():
    # 5. Missing evidence fields
    finding = verify_upi_id(
        complaint_id="c_missing_ev",
        evidence_id="ev_1",
        reported_upi="suspect.fraud@ybl",
        extracted_upi=None
    )
    assert finding.result == VerificationResultType.MISSING_IN_EVIDENCE
    assert finding.display_status == "Insufficient Data"
    assert "does not contain this address" in finding.reason


def test_case_with_no_evidence():
    # 6. A case with zero evidence documents attached
    conn = get_connection()
    c_id = f"cmp_noev_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-NOEV-{uuid.uuid4().hex[:4].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, 'usr_citizen_patel', datetime('now'), 'en', 'UPI Fraud',
                     'Testing zero evidence evaluation', 12000.0, 'TXN000111222333', 'pay@ybl',
                     'AWAITING_REVIEW', 'MEDIUM', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )
        conn.commit()

        findings = evaluate_complaint_consistency(conn, c_id)
        conn.commit()

        assert len(findings) == 3
        for f in findings:
            assert f.display_status == "Insufficient Data"
            assert f.source_evidence == "No Evidence Attached"
            assert f.result == VerificationResultType.MISSING_IN_EVIDENCE

        # Test API detail reflects this
        res = client.get(f"/api/complaints/{c_id}")
        assert res.status_code == 200
        data = res.json()
        assert len(data["verification_findings"]) == 3
        for vf in data["verification_findings"]:
            assert vf["display_status"] == "Insufficient Data"
            assert vf["source_evidence"] == "No Evidence Attached"
    finally:
        conn.close()


def test_multiple_evidence_items_with_conflicting_values():
    # 7. Multiple evidence items with conflicting values
    conn = get_connection()
    c_id = f"cmp_multiev_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-MULTI-{uuid.uuid4().hex[:4].upper()}"
    ev1_id = f"ev_{uuid.uuid4().hex[:8]}"
    ev2_id = f"ev_{uuid.uuid4().hex[:8]}"

    try:
        conn.execute(
            """
            INSERT INTO complaints (
                id, reference_id, user_id, submission_time, language, incident_type,
                description, reported_amount, reported_txn_id, reported_upi_id,
                status, priority, is_demo, created_at, updated_at
            ) VALUES (?, ?, 'usr_citizen_patel', datetime('now'), 'en', 'Investment Scam',
                     'Multiple transfers', 15000.0, 'TXN555', 'seller@okaxis',
                     'AWAITING_REVIEW', 'HIGH', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )

        # Evidence file 1 (Amount: 5000.00)
        conn.execute(
            """
            INSERT INTO evidence_files (id, complaint_id, original_filename, storage_filename, file_type, file_size_bytes, ocr_status, created_at)
            VALUES (?, ?, 'receipt_transfer_1.png', 'store_1.png', 'image/png', 1024, 'COMPLETED', datetime('now'))
            """,
            (ev1_id, c_id)
        )
        conn.execute(
            """
            INSERT INTO extracted_fields (id, evidence_id, complaint_id, field_name, raw_value, normalized_value, created_at)
            VALUES (?, ?, ?, 'amount', '₹ 5,000.00', '5000.00', datetime('now'))
            """,
            (f"ef_{uuid.uuid4().hex[:8]}", ev1_id, c_id)
        )

        # Evidence file 2 (Amount: 10000.00)
        conn.execute(
            """
            INSERT INTO evidence_files (id, complaint_id, original_filename, storage_filename, file_type, file_size_bytes, ocr_status, created_at)
            VALUES (?, ?, 'receipt_transfer_2.png', 'store_2.png', 'image/png', 2048, 'COMPLETED', datetime('now'))
            """,
            (ev2_id, c_id)
        )
        conn.execute(
            """
            INSERT INTO extracted_fields (id, evidence_id, complaint_id, field_name, raw_value, normalized_value, created_at)
            VALUES (?, ?, ?, 'amount', '₹ 10,000.00', '10000.00', datetime('now'))
            """,
            (f"ef_{uuid.uuid4().hex[:8]}", ev2_id, c_id)
        )
        conn.commit()

        findings = evaluate_complaint_consistency(conn, c_id)
        conn.commit()

        # Both evidence files should be evaluated and attributed
        source_evidences = [f.source_evidence for f in findings]
        assert "receipt_transfer_1.png" in source_evidences
        assert "receipt_transfer_2.png" in source_evidences

        # Check that cross-evidence divergence is noted in amount findings
        amount_findings = [f for f in findings if f.field_name == "transaction_amount"]
        assert len(amount_findings) == 2
        for af in amount_findings:
            assert "Multi-Evidence Conflict" in af.reason
    finally:
        conn.close()


def test_unknown_case_id_returns_404():
    # 8. Unknown case IDs
    res = client.get("/api/complaints/cmp_non_existent_id_999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_unauthorized_access(auth_tokens):
    # 9. Unauthorized citizen access to another citizen's case
    conn = get_connection()
    other_cid = f"cmp_other_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-OTHER-{uuid.uuid4().hex[:6].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (id, reference_id, user_id, submission_time, language, incident_type, description, status, priority, is_demo, created_at, updated_at)
            VALUES (?, ?, 'usr_officer_sharma', datetime('now'), 'en', 'Phishing', 'Private notes', 'AWAITING_REVIEW', 'LOW', 1, datetime('now'), datetime('now'))
            """,
            (other_cid, ref_id)
        )
        conn.commit()
    finally:
        conn.close()

    # Attempt access as citizen (who does not own other_cid)
    headers = {"Authorization": f"Bearer {auth_tokens['citizen']}"}
    res = client.get(f"/api/complaints/{other_cid}", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


def test_backend_empty_or_malformed_case_handling():
    # 10. Incomplete / malformed complaint fields
    conn = get_connection()
    c_id = f"cmp_malformed_{uuid.uuid4().hex[:8]}"
    ref_id = f"CS-MALF-{uuid.uuid4().hex[:6].upper()}"
    try:
        conn.execute(
            """
            INSERT INTO complaints (id, reference_id, user_id, submission_time, language, incident_type, description, status, priority, is_demo, created_at, updated_at)
            VALUES (?, ?, 'usr_citizen_patel', datetime('now'), 'en', 'Unknown Scam', 'No numbers provided', 'AWAITING_REVIEW', 'LOW', 1, datetime('now'), datetime('now'))
            """,
            (c_id, ref_id)
        )
        conn.commit()

        findings = evaluate_complaint_consistency(conn, c_id)
        conn.commit()

        assert len(findings) == 3
        for f in findings:
            assert f.result == VerificationResultType.UNABLE_TO_VERIFY
            assert f.display_status == "Insufficient Data"
    finally:
        conn.close()
