import pytest
from decimal import Decimal
from app.services.field_normalization import (
    normalize_amount,
    normalize_upi_id,
    normalize_txn_id,
    normalize_phone,
    normalize_timestamp
)
from app.services.verification_engine import (
    verify_amount,
    verify_txn_id,
    verify_upi_id,
    VerificationResultType
)

def test_amount_normalization_formats():
    dec, norm = normalize_amount("₹ 25,000.00")
    assert dec == Decimal("25000.00")
    assert norm == "25000.00"

    dec, norm = normalize_amount("Rs. 4,500/-")
    assert dec == Decimal("4500.00")
    assert norm == "4500.00"

    dec, norm = normalize_amount("INR 1000")
    assert dec == Decimal("1000.00")
    assert norm == "1000.00"

    dec, norm = normalize_amount(15000)
    assert dec == Decimal("15000.00")

    dec, norm = normalize_amount("invalid text")
    assert dec is None
    assert norm is None

def test_upi_normalization():
    assert normalize_upi_id("utility.desk@okhdfcbank") == "utility.desk@okhdfcbank"
    assert normalize_upi_id("  TASK.REFUND@YBL  ") == "task.refund@ybl"
    assert normalize_upi_id("user@gmail.com") is None  # Filtered regular email
    assert normalize_upi_id("invalid-no-at") is None

def test_txn_id_normalization():
    assert normalize_txn_id("UPI Ref No: UPI309819283741") == "UPI309819283741"
    assert normalize_txn_id("  TXN882910482910  ") == "TXN882910482910"
    assert normalize_txn_id("short") is None

def test_verify_amount_match():
    finding = verify_amount(
        complaint_id="c1",
        evidence_id="e1",
        reported_amount=25000.0,
        extracted_amount={"raw": "₹ 25,000.00", "normalized": "25000.00"}
    )
    assert finding.result == VerificationResultType.MATCH
    assert "₹25000.00" in finding.reason

def test_verify_amount_mismatch():
    finding = verify_amount(
        complaint_id="c1",
        evidence_id="e1",
        reported_amount=45000.0,
        extracted_amount={"raw": "Paid ₹ 4,500.00", "normalized": "4500.00"}
    )
    assert finding.result == VerificationResultType.MISMATCH
    assert "Monetary conflict" in finding.reason
    assert "40500.00" in finding.reason

def test_verify_missing_in_complaint():
    finding = verify_txn_id(
        complaint_id="c1",
        evidence_id="e1",
        reported_txn=None,
        extracted_txn={"raw": "409827384912", "normalized": "409827384912"}
    )
    assert finding.result == VerificationResultType.MISSING_IN_COMPLAINT

def test_verify_missing_in_evidence():
    finding = verify_upi_id(
        complaint_id="c1",
        evidence_id="e1",
        reported_upi="support.help@icici",
        extracted_upi=None
    )
    assert finding.result == VerificationResultType.MISSING_IN_EVIDENCE
