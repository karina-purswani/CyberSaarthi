from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime
from app.services.field_normalization import (
    normalize_amount,
    normalize_upi_id,
    normalize_txn_id,
    normalize_phone,
    normalize_timestamp
)

class VerificationResultType:
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    MISSING_IN_COMPLAINT = "MISSING_IN_COMPLAINT"
    MISSING_IN_EVIDENCE = "MISSING_IN_EVIDENCE"
    UNABLE_TO_VERIFY = "UNABLE_TO_VERIFY"
    MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"

def map_result_to_display_status(result: str) -> str:
    """
    Maps 6-state deterministic verification results to high-level display statuses:
    - MATCH -> Consistent
    - MISMATCH -> Inconsistent
    - MISSING_IN_COMPLAINT / MISSING_IN_EVIDENCE / UNABLE_TO_VERIFY / MANUAL_REVIEW_REQUIRED -> Insufficient Data
    """
    if result == VerificationResultType.MATCH:
        return "Consistent"
    elif result == VerificationResultType.MISMATCH:
        return "Inconsistent"
    else:
        return "Insufficient Data"

class VerificationFinding:
    def __init__(
        self,
        complaint_id: str,
        evidence_id: Optional[str],
        field_name: str,
        complaint_value: Optional[str],
        evidence_value: Optional[str],
        normalized_complaint_value: Optional[str],
        normalized_evidence_value: Optional[str],
        result: str,
        reason: str,
        review_recommendation: str,
        display_status: Optional[str] = None,
        source_evidence: Optional[str] = None
    ):
        self.complaint_id = complaint_id
        self.evidence_id = evidence_id
        self.field_name = field_name
        self.complaint_value = complaint_value
        self.evidence_value = evidence_value
        self.normalized_complaint_value = normalized_complaint_value
        self.normalized_evidence_value = normalized_evidence_value
        self.result = result
        self.display_status = display_status or map_result_to_display_status(result)
        self.reason = reason
        self.review_recommendation = review_recommendation
        self.source_evidence = source_evidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "complaint_id": self.complaint_id,
            "evidence_id": self.evidence_id,
            "field_name": self.field_name,
            "complaint_value": self.complaint_value,
            "evidence_value": self.evidence_value,
            "normalized_complaint_value": self.normalized_complaint_value,
            "normalized_evidence_value": self.normalized_evidence_value,
            "result": self.result,
            "display_status": self.display_status,
            "reason": self.reason,
            "review_recommendation": self.review_recommendation,
            "source_evidence": self.source_evidence
        }

def verify_amount(
    complaint_id: str,
    evidence_id: Optional[str],
    reported_amount: Optional[Any],
    extracted_amount: Optional[Dict[str, Any]]
) -> VerificationFinding:
    raw_comp = str(reported_amount) if reported_amount is not None else None
    raw_ev = extracted_amount.get("raw") if extracted_amount else None
    
    dec_comp, norm_comp = normalize_amount(reported_amount)
    
    dec_ev = None
    norm_ev = None
    if extracted_amount:
        if "normalized" in extracted_amount and extracted_amount["normalized"]:
            norm_ev = extracted_amount["normalized"]
            try:
                dec_ev = Decimal(norm_ev)
            except Exception:
                dec_ev, norm_ev = normalize_amount(raw_ev)
        else:
            dec_ev, norm_ev = normalize_amount(raw_ev)

    display_ev = raw_ev
    if display_ev and (display_ev.startswith('R') or display_ev.startswith('r')) and len(display_ev) > 1 and display_ev[1].isdigit():
        display_ev = '₹' + display_ev[1:]

    if dec_comp is None and dec_ev is None:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_amount",
            complaint_value=raw_comp,
            evidence_value=display_ev,
            normalized_complaint_value=None,
            normalized_evidence_value=None,
            result=VerificationResultType.UNABLE_TO_VERIFY,
            reason="Neither complaint nor evidence provided a parseable monetary amount.",
            review_recommendation="Request bank statement or transaction receipt from complainant."
        )

    if dec_comp is None and dec_ev is not None:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_amount",
            complaint_value=raw_comp,
            evidence_value=display_ev,
            normalized_complaint_value=None,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MISSING_IN_COMPLAINT,
            reason=f"Evidence contains ₹{norm_ev}, but amount was omitted in citizen statement.",
            review_recommendation="Adopt receipt amount as preliminary baseline pending officer confirmation."
        )

    if dec_comp is not None and dec_ev is None:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_amount",
            complaint_value=raw_comp,
            evidence_value=display_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=None,
            result=VerificationResultType.MISSING_IN_EVIDENCE,
            reason=f"Complainant reported ₹{norm_comp}, but no readable transaction amount was detected in uploaded receipt.",
            review_recommendation="Inspect raw receipt image manually to confirm if amount was cropped or illegible."
        )

    # Both values present - compare decimals
    if dec_comp == dec_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_amount",
            complaint_value=raw_comp,
            evidence_value=display_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MATCH,
            reason=f"Exact monetary match verified: ₹{norm_comp}.",
            review_recommendation="No discrepancy. Field confirmed."
        )
    else:
        diff = abs(dec_comp - dec_ev)
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_amount",
            complaint_value=raw_comp,
            evidence_value=display_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MISMATCH,
            reason=f"Monetary conflict: Complaint claims ₹{norm_comp}, but receipt indicates ₹{norm_ev} (Delta: ₹{diff:.2f}). Note: This discrepancy does not automatically establish forgery; verify multiple transfers or partial payment.",
            review_recommendation="Conduct manual review. Prompt complainant to clarify whether multiple transactions took place."
        )

def verify_txn_id(
    complaint_id: str,
    evidence_id: Optional[str],
    reported_txn: Optional[str],
    extracted_txn: Optional[Dict[str, Any]]
) -> VerificationFinding:
    raw_comp = reported_txn
    raw_ev = extracted_txn.get("raw") if extracted_txn else None
    
    norm_comp = normalize_txn_id(reported_txn)
    norm_ev = extracted_txn.get("normalized") if extracted_txn else None
    if not norm_ev and raw_ev:
        norm_ev = normalize_txn_id(raw_ev)

    if not norm_comp and not norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=None,
            normalized_evidence_value=None,
            result=VerificationResultType.UNABLE_TO_VERIFY,
            reason="Transaction reference / UTR is missing from both citizen report and evidence OCR.",
            review_recommendation="Request transaction confirmation SMS or net banking passbook entry."
        )

    if not norm_comp and norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=None,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MISSING_IN_COMPLAINT,
            reason=f"Receipt contains UTR/Txn ID '{norm_ev}', which was not provided in written complaint.",
            review_recommendation="Use receipt UTR identifier for bank liaison inquiry."
        )

    if norm_comp and not norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=None,
            result=VerificationResultType.MISSING_IN_EVIDENCE,
            reason=f"Complainant reported Txn ID '{norm_comp}', but receipt OCR did not identify a matching UTR token.",
            review_recommendation="Inspect receipt visually to check if UTR is in un-extracted section."
        )

    if norm_comp == norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MATCH,
            reason=f"Transaction reference matches across report and receipt: '{norm_comp}'.",
            review_recommendation="Confirmed identifier. Validated for banking inquiry."
        )
    else:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="transaction_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MISMATCH,
            reason=f"Identifier conflict: Complaint states '{norm_comp}', but receipt extraction indicates '{norm_ev}'.",
            review_recommendation="Check if citizen submitted screenshot for a different transaction."
        )

def verify_upi_id(
    complaint_id: str,
    evidence_id: Optional[str],
    reported_upi: Optional[str],
    extracted_upi: Optional[Dict[str, Any]]
) -> VerificationFinding:
    raw_comp = reported_upi
    raw_ev = (extracted_upi.get("normalized") or extracted_upi.get("raw")) if extracted_upi else None
    
    norm_comp = normalize_upi_id(reported_upi)
    norm_ev = extracted_upi.get("normalized") if extracted_upi else None
    if not norm_ev and raw_ev:
        norm_ev = normalize_upi_id(raw_ev)

    if not norm_comp and not norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="upi_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=None,
            normalized_evidence_value=None,
            result=VerificationResultType.UNABLE_TO_VERIFY,
            reason="No UPI Virtual Payment Address (VPA) specified in complaint or detected in receipt.",
            review_recommendation="Check if transaction occurred via IMPS/NEFT or QR code without visible VPA text."
        )

    if not norm_comp and norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="upi_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=None,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MISSING_IN_COMPLAINT,
            reason=f"Receipt OCR discovered beneficiary UPI handle '{norm_ev}', omitted in written complaint.",
            review_recommendation="Add extracted handle to case record as suspect beneficiary."
        )

    if norm_comp and not norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="upi_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=None,
            result=VerificationResultType.MISSING_IN_EVIDENCE,
            reason=f"Citizen stated UPI handle '{norm_comp}', but receipt text does not contain this address.",
            review_recommendation="Confirm whether receipt is a bank SMS or app screenshot with masked handle."
        )

    if norm_comp == norm_ev:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="upi_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MATCH,
            reason=f"Suspect UPI handle confirmed identical across both sources: '{norm_comp}'.",
            review_recommendation="Strong indicator. Cross-reference across intelligence graph."
        )
    else:
        return VerificationFinding(
            complaint_id=complaint_id,
            evidence_id=evidence_id,
            field_name="upi_id",
            complaint_value=raw_comp,
            evidence_value=raw_ev,
            normalized_complaint_value=norm_comp,
            normalized_evidence_value=norm_ev,
            result=VerificationResultType.MISMATCH,
            reason=f"UPI handle mismatch: Complaint recorded '{norm_comp}', whereas receipt extraction shows '{norm_ev}'.",
            review_recommendation="Examine if citizen paid intermediary or multiple UPI IDs."
        )

def run_verification_pipeline(
    complaint: Dict[str, Any],
    extracted_fields: Dict[str, Any],
    evidence_id: Optional[str] = None
) -> List[VerificationFinding]:
    """
    Executes full deterministic verification between complaint inputs and OCR extracted fields.
    """
    complaint_id = complaint["id"]
    findings = []
    
    # 1. Amount
    findings.append(verify_amount(
        complaint_id=complaint_id,
        evidence_id=evidence_id,
        reported_amount=complaint.get("reported_amount"),
        extracted_amount=extracted_fields.get("amount")
    ))
    
    # 2. Transaction ID
    findings.append(verify_txn_id(
        complaint_id=complaint_id,
        evidence_id=evidence_id,
        reported_txn=complaint.get("reported_txn_id"),
        extracted_txn=extracted_fields.get("txn_id")
    ))
    
    # 3. UPI ID
    findings.append(verify_upi_id(
        complaint_id=complaint_id,
        evidence_id=evidence_id,
        reported_upi=complaint.get("reported_upi_id"),
        extracted_upi=extracted_fields.get("upi_id")
    ))
    
    return findings

def evaluate_complaint_consistency(conn, complaint_id: str) -> List[VerificationFinding]:
    """
    Comprehensive multi-evidence consistency evaluation.
    Evaluates persisted complaint data against all associated evidence files,
    preserving source attribution, detecting multi-evidence conflicts,
    handling zero-evidence cases gracefully, and persisting all findings.
    """
    import uuid
    complaint = conn.execute(
        "SELECT * FROM complaints WHERE id = ? OR reference_id = ?",
        (complaint_id, complaint_id)
    ).fetchone()
    if not complaint:
        return []

    c_id = complaint["id"]
    reported_amount = complaint["reported_amount"]
    reported_txn_id = complaint["reported_txn_id"]
    reported_upi_id = complaint["reported_upi_id"]

    evidence_files = conn.execute(
        "SELECT * FROM evidence_files WHERE complaint_id = ? ORDER BY created_at ASC",
        (c_id,)
    ).fetchall()

    findings: List[VerificationFinding] = []

    if not evidence_files:
        # Zero evidence submitted yet - provide clear Insufficient Data evaluation
        findings.append(verify_amount(
            complaint_id=c_id,
            evidence_id=None,
            reported_amount=reported_amount,
            extracted_amount=None
        ))
        findings.append(verify_txn_id(
            complaint_id=c_id,
            evidence_id=None,
            reported_txn=reported_txn_id,
            extracted_txn=None
        ))
        findings.append(verify_upi_id(
            complaint_id=c_id,
            evidence_id=None,
            reported_upi=reported_upi_id,
            extracted_upi=None
        ))
        for f in findings:
            f.source_evidence = "No Evidence Attached"
    else:
        # Single or multiple evidence files
        evidence_extractions: Dict[str, List[Dict[str, Any]]] = {
            "amount": [],
            "txn_id": [],
            "upi_id": []
        }

        for ev in evidence_files:
            ev_id = ev["id"]
            ev_name = ev["original_filename"]

            ef_rows = conn.execute(
                "SELECT * FROM extracted_fields WHERE evidence_id = ?",
                (ev_id,)
            ).fetchall()
            ef_dict = {}
            for r in ef_rows:
                fn = r["field_name"]
                ef_dict[fn] = {
                    "raw": r["raw_value"],
                    "normalized": r["normalized_value"],
                    "value": float(r["normalized_value"]) if fn == "amount" and r["normalized_value"] else None,
                    "context": r["source_context"],
                    "is_officer_corrected": bool(r["is_officer_corrected"])
                }
                if fn in evidence_extractions and r["normalized_value"]:
                    evidence_extractions[fn].append({
                        "evidence_id": ev_id,
                        "filename": ev_name,
                        "normalized": r["normalized_value"],
                        "raw": r["raw_value"]
                    })

            # Amount finding for this evidence
            f_amt = verify_amount(
                complaint_id=c_id,
                evidence_id=ev_id,
                reported_amount=reported_amount,
                extracted_amount=ef_dict.get("amount")
            )
            f_amt.source_evidence = ev_name
            findings.append(f_amt)

            # Txn ID finding for this evidence
            f_txn = verify_txn_id(
                complaint_id=c_id,
                evidence_id=ev_id,
                reported_txn=reported_txn_id,
                extracted_txn=ef_dict.get("txn_id")
            )
            f_txn.source_evidence = ev_name
            findings.append(f_txn)

            # UPI ID finding for this evidence
            f_upi = verify_upi_id(
                complaint_id=c_id,
                evidence_id=ev_id,
                reported_upi=reported_upi_id,
                extracted_upi=ef_dict.get("upi_id")
            )
            f_upi.source_evidence = ev_name
            findings.append(f_upi)

        # Detect cross-evidence divergence if multiple receipts exist
        if len(evidence_files) > 1:
            for fn, extracted_list in evidence_extractions.items():
                unique_vals = set(item["normalized"] for item in extracted_list)
                if len(unique_vals) > 1:
                    divergence_note = (
                        f" [Multi-Evidence Conflict: Other evidence for this complaint has differing values ("
                        + ", ".join(f"{item['filename']}: {item['normalized']}" for item in extracted_list)
                        + "). Both sources preserved for officer evaluation.]"
                    )
                    for f in findings:
                        if (
                            (fn == "amount" and f.field_name == "transaction_amount")
                            or (fn == "txn_id" and f.field_name == "transaction_id")
                            or (fn == "upi_id" and f.field_name == "upi_id")
                        ):
                            f.reason += divergence_note

    # Persist findings transactionally
    now_iso = datetime.now().isoformat()
    conn.execute("DELETE FROM verification_findings WHERE complaint_id = ?", (c_id,))

    for f in findings:
        vf_id = f"vf_{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO verification_findings (
                id, complaint_id, evidence_id, field_name,
                complaint_value, evidence_value,
                normalized_complaint_value, normalized_evidence_value,
                result, display_status, reason, review_recommendation, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                vf_id, c_id, f.evidence_id, f.field_name,
                f.complaint_value, f.evidence_value,
                f.normalized_complaint_value, f.normalized_evidence_value,
                f.result, f.display_status, f.reason, f.review_recommendation,
                now_iso
            )
        )

    return findings
