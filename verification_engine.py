"""
CyberSaarthi - Cross-Evidence Verification Engine (CEVE)
Phase 1 Implementation: Backend Multi-Modal Forensic Verification

Analyzes, cross-references, and corroborates forensic indicators across:
1. Voice statement transcript (ASR / Whisper / Web Speech)
2. OCR text extracted from payment receipts / chat screenshots (RapidOCR)
3. Citizen-entered complaint text / notes

Core Capabilities:
- Identifies corroborated facts across distinct submitted modalities
- Detects unresolved variances (2% - 5%) requiring manual review
- Detects multi-transaction contexts, sum matches, and partial transaction installments
- Distinguishes assertive contradictions from ambiguous multi-transaction relationships
- Preserves low-confidence OCR tokens even when no text meets standard extraction thresholds
- Identifies missing information across modalities without treating absence as a contradiction
- Produces a deterministic, heuristic Cross-Evidence Corroboration Index (not a guilt/fraud probability)
"""

import re
from typing import Dict, Any, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# SOURCE-SPECIFIC ENTITY EXTRACTION
# ---------------------------------------------------------------------------
def extract_source_forensic_entities(
    text: str,
    source_name: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Extract forensic indicators strictly from a single evidence modality.
    Tags all extracted entities with the specified source_name.
    Preserves low-confidence tokens even when main text is empty.
    """
    cleaned_text = (text or "").strip()
    uncertain_candidates: List[Dict[str, Any]] = []

    # Capture low-confidence OCR tokens from metadata regardless of main text presence
    if metadata and metadata.get("low_confidence_tokens"):
        for tok in metadata["low_confidence_tokens"]:
            uncertain_candidates.append({
                "type": "LOW_CONFIDENCE_OCR_TEXT",
                "value": tok.get("text", ""),
                "source": source_name,
                "confidence_score": tok.get("confidence", 0.0),
                "reason": f"OCR text fell below standard extraction threshold (confidence: {tok.get('confidence', 0.0):.2f})."
            })

    if not cleaned_text:
        return {
            "source": source_name,
            "has_content": len(uncertain_candidates) > 0,
            "text_length": 0,
            "disputed_amount": 0.0,
            "disputed_amount_str": "Not Specified",
            "amount_candidates": [],
            "upi_ids": [],
            "utr_numbers": [],
            "scammer_phones": [],
            "dates": [],
            "times": [],
            "fraud_category": "Unspecified Incident",
            "uncertain_candidates": uncertain_candidates,
            "has_multi_transaction_indicators": False
        }

    # 1. Disputed Amounts
    amount_matches: List[float] = []
    amt_regexes = [
        r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)",
        r"([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs\.?|inr|/-|रुपये|रुपया)",
        r"(?:रुपये|रुपया)\s*([\d,]+(?:\.\d{1,2})?)"
    ]
    for pattern in amt_regexes:
        for match in re.finditer(pattern, cleaned_text, re.IGNORECASE):
            raw_val = match.group(1).replace(",", "").strip()
            try:
                val = float(raw_val)
                if val >= 10.0:
                    amount_matches.append(val)
            except ValueError:
                pass

    unique_amounts = sorted(list(set(amount_matches)), reverse=True)
    primary_amount = unique_amounts[0] if unique_amounts else 0.0
    primary_amount_str = f"₹{int(primary_amount):,}" if primary_amount > 0 else "Not Specified"

    # Multi-transaction indicators (requires plural transactions or explicit multi keywords, not singular 'transaction')
    multi_txn_pattern = r"\b(?:multiple\s+transactions?|several\s+transactions?|transactions|installments?|total\s+(?:loss|amount|of)?|again|twice|thrice|parts)\b"
    has_multi_indicators = (len(unique_amounts) > 1) or bool(re.search(multi_txn_pattern, cleaned_text, re.IGNORECASE))

    # 2. UPI IDs
    upi_pattern = r"\b[a-zA-Z0-9.\-_]{2,256}@(?!gmail|yahoo|outlook|hotmail|icloud|email|domain)[a-zA-Z]{2,64}\b"
    raw_upis = re.findall(upi_pattern, cleaned_text, re.IGNORECASE)
    upi_ids = sorted(list(set([u.strip().lower() for u in raw_upis])))

    # 3. 12-Digit Bank UTR / Transaction Reference IDs
    utr_pattern_1 = r"\b\d{12}\b"
    utr_pattern_2 = r"(?:utr(?:\s*(?:id|no|num|number))?|txn(?:\s*(?:id|no|num|number))?|transaction(?:\s*(?:id|no|num|number|ref))?|ref(?:\s*(?:id|no|num|number))?)\s*[:#-]?\s*([0-9a-zA-Z]{10,22})"

    clean_utrs: Set[str] = set()
    for u in re.findall(utr_pattern_1, cleaned_text):
        if u.startswith("91") and len(u) == 12:
            continue
        clean_utrs.add(u)

    for m in re.finditer(utr_pattern_2, cleaned_text, re.IGNORECASE):
        candidate = m.group(1).strip()
        if len(candidate) == 12 and candidate.isdigit():
            clean_utrs.add(candidate)
        elif len(candidate) in (10, 11) and candidate.isdigit():
            uncertain_candidates.append({
                "type": "TRUNCATED_UTR_CANDIDATE",
                "value": candidate,
                "source": source_name,
                "reason": f"{len(candidate)}-digit numeric reference found near transaction keyword; potential truncated 12-digit UTR.",
                "confidence": "LOW"
            })
        elif 10 <= len(candidate) <= 22:
            clean_utrs.add(candidate)

    # 4. Scammer Phone Numbers
    phone_pattern = r"(?<!\d)(?:(?:\+91|91|0)[\-\s]?)?([6-9]\d{9})(?!\d)"
    phone_matches = re.finditer(phone_pattern, cleaned_text)
    scammer_phones = sorted(list(set([f"+91{p.group(1)}" for p in phone_matches])))

    # 5. Dates & Timestamps
    date_patterns = [
        r"\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b",
        r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b"
    ]
    dates_found: Set[str] = set()
    for dp in date_patterns:
        for m in re.finditer(dp, cleaned_text, re.IGNORECASE):
            dates_found.add(m.group(1).strip())

    time_pattern = r"\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b"
    times_found = sorted(list(set([m.group(1).strip() for m in re.finditer(time_pattern, cleaned_text)])))

    # 6. Fraud Classification Heuristics
    text_lower = cleaned_text.lower()
    kw_map = {
        "Electricity / Utility Bill Scam": ["electricity", "power", "bill", "mseb", "light bill", "discom", "power cut", "वीज", "बिजली", "महावितरण"],
        "Fake KYC / Banking Impersonation": ["kyc", "pan card", "aadhar", "bank account", "suspend", "block", "manager", "केवायसी", "पॅन कार्ड", "खाते बंद", "बँक"],
        "Work-From-Home / Task Scam": ["telegram", "task", "youtube", "like", "commission", "vip task", "work from home", "part time", "पार्ट टाइम", "टास्क"],
        "Lottery / Prize Scam": ["lottery", "kbc", "lucky draw", "prize", "winner", "crorepati", "car", "लॉटरी", "इनाम", "करोडपती"],
        "Unauthorized UPI / QR Collect Scam": ["collect request", "qr code", "scan", "refund", "pin", "पिन टाका", "रिफंड", "क्युआर कोड"],
        "Sextortion / Video Call Extortion": ["video call", "nude", "blackmail", "obscene", "facebook", "व्हिडिओ कॉल", "ब्लॅकमेल"]
    }
    categories_scores = {cat: 0 for cat in kw_map}
    for cat, keywords in kw_map.items():
        for kw in keywords:
            if kw in text_lower:
                categories_scores[cat] += 2

    best_category = max(categories_scores.items(), key=lambda x: x[1])
    fraud_category = best_category[0] if best_category[1] > 0 else "Suspected Cyber Financial Fraud"

    return {
        "source": source_name,
        "has_content": True,
        "text_length": len(cleaned_text),
        "disputed_amount": primary_amount,
        "disputed_amount_str": primary_amount_str,
        "amount_candidates": unique_amounts,
        "upi_ids": upi_ids,
        "utr_numbers": sorted(list(clean_utrs)),
        "scammer_phones": scammer_phones,
        "dates": sorted(list(dates_found)),
        "times": times_found,
        "fraud_category": fraud_category,
        "uncertain_candidates": uncertain_candidates,
        "has_multi_transaction_indicators": has_multi_indicators
    }


# ---------------------------------------------------------------------------
# CROSS-EVIDENCE VERIFICATION ENGINE
# ---------------------------------------------------------------------------
def verify_cross_evidence(
    voice_text: str = "",
    ocr_text: str = "",
    user_text: str = "",
    ocr_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes Cross-Evidence Verification Engine (CEVE):
    1. Extracts forensic indicators independently for all present modalities.
    2. Identifies corroborations, discrepancies, ambiguous findings, missing info, and uncertain items.
    3. Calculates an explainable, transparent Cross-Evidence Corroboration Index.
    """
    # Step 1: Extract entities per source
    sources: Dict[str, Dict[str, Any]] = {}

    voice_entities = extract_source_forensic_entities(voice_text, "voice")
    if voice_entities["has_content"]:
        sources["voice"] = voice_entities

    ocr_entities = extract_source_forensic_entities(ocr_text, "ocr", metadata=ocr_metadata)
    # Include OCR source if it has parsed content OR low-confidence tokens to review
    if ocr_entities["has_content"] or ocr_entities["uncertain_candidates"]:
        sources["ocr"] = ocr_entities

    user_text_entities = extract_source_forensic_entities(user_text, "user_text")
    if user_text_entities["has_content"]:
        sources["user_text"] = user_text_entities

    available_sources = [s for s, d in sources.items() if d.get("has_content", False)]
    # If a source has uncertain candidates but no main content, keep it in sources for transparency
    all_active_sources = list(sources.keys())
    num_sources = len(available_sources)

    corroborations: List[Dict[str, Any]] = []
    discrepancies: List[Dict[str, Any]] = []
    ambiguous_findings: List[Dict[str, Any]] = []
    missing_information: List[Dict[str, Any]] = []
    uncertain_extractions: List[Dict[str, Any]] = []

    # Collect uncertain extractions from each source
    for src_name, src_data in sources.items():
        for unc in src_data.get("uncertain_candidates", []):
            uncertain_extractions.append(unc)

    # Empty submission edge case
    if len(all_active_sources) == 0:
        return {
            "status": "NO_EVIDENCE_PROVIDED",
            "available_sources": [],
            "sources_summary": {},
            "corroborations": [],
            "discrepancies": [],
            "ambiguous_findings": [],
            "missing_information": [{
                "field": "all",
                "status": "MISSING",
                "details": "No voice recording, OCR receipt, or textual complaint was provided."
            }],
            "uncertain_extractions": [],
            "confidence_assessment": {
                "score": 0.0,
                "tier": "NO_EVIDENCE",
                "metric_name": "Cross-Evidence Corroboration Index",
                "rationale": "No incident evidence provided to verify.",
                "disclaimer": "This score is a deterministic heuristic Corroboration Index measuring consistency across submitted evidence artifacts. It does not represent a statistical probability of fraud, evidence authenticity, or legal guilt.",
                "breakdown": {
                    "base_score": 0.0,
                    "corroboration_bonus": 0.0,
                    "discrepancy_penalty": 0.0,
                    "uncertainty_penalty": 0.0,
                    "unresolved_penalty": 0.0
                },
                "tier_definition": "Zero evidence submitted for analysis."
            },
            "consolidated_entities": {
                "disputed_amount": 0.0,
                "disputed_amount_str": "Not Specified",
                "upi_ids": [],
                "utr_numbers": [],
                "scammer_phones": [],
                "fraud_category": "Unspecified Incident"
            }
        }

    # Step 2: Cross-Source Entity Comparisons

    # --- A. Disputed Amounts Comparison ---
    sources_with_amounts = {
        src: data for src, data in sources.items() if data.get("disputed_amount", 0.0) > 0
    }

    if len(sources_with_amounts) >= 2:
        source_pairs = list(sources_with_amounts.items())
        checked_pairs = set()
        for i in range(len(source_pairs)):
            for j in range(i + 1, len(source_pairs)):
                src1, data1 = source_pairs[i]
                src2, data2 = source_pairs[j]
                pair_key = tuple(sorted([src1, src2]))
                if pair_key in checked_pairs:
                    continue
                checked_pairs.add(pair_key)

                amt1 = data1["disputed_amount"]
                amt2 = data2["disputed_amount"]
                candidates1 = data1.get("amount_candidates", [amt1])
                candidates2 = data2.get("amount_candidates", [amt2])
                has_multi = data1.get("has_multi_transaction_indicators") or data2.get("has_multi_transaction_indicators")

                diff = abs(amt1 - amt2)
                rel_diff = diff / max(amt1, amt2) if max(amt1, amt2) > 0 else 0

                # Check 1: Direct Corroboration (<= 2% variance)
                if rel_diff <= 0.02:
                    corroborations.append({
                        "field": "disputed_amount",
                        "value": amt1,
                        "value_str": f"₹{int(amt1):,}",
                        "sources": [src1, src2],
                        "details": f"Disputed amount ₹{int(amt1):,} matches consistently across {src1} and {src2}."
                    })
                # Check 2: Multi-transaction sum match or candidate subset match
                elif len(candidates1) > 1 and abs(sum(candidates1) - amt2) / max(sum(candidates1), amt2) <= 0.02:
                    corroborations.append({
                        "field": "disputed_amount",
                        "value": amt2,
                        "value_str": f"₹{int(amt2):,}",
                        "sources": [src1, src2],
                        "details": f"Amount in {src2} (₹{int(amt2):,}) matches the aggregate sum of sub-transactions in {src1}."
                    })
                elif len(candidates2) > 1 and abs(sum(candidates2) - amt1) / max(sum(candidates2), amt1) <= 0.02:
                    corroborations.append({
                        "field": "disputed_amount",
                        "value": amt1,
                        "value_str": f"₹{int(amt1):,}",
                        "sources": [src1, src2],
                        "details": f"Amount in {src1} (₹{int(amt1):,}) matches the aggregate sum of sub-transactions in {src2}."
                    })
                elif any(abs(c - amt2) / max(c, amt2) <= 0.02 for c in candidates1 if c > 0):
                    corroborations.append({
                        "field": "disputed_amount",
                        "value": amt2,
                        "value_str": f"₹{int(amt2):,}",
                        "sources": [src1, src2],
                        "details": f"Amount ₹{int(amt2):,} in {src2} corroborates an individual transaction candidate reported in {src1}."
                    })
                elif any(abs(c - amt1) / max(c, amt1) <= 0.02 for c in candidates2 if c > 0):
                    corroborations.append({
                        "field": "disputed_amount",
                        "value": amt1,
                        "value_str": f"₹{int(amt1):,}",
                        "sources": [src1, src2],
                        "details": f"Amount ₹{int(amt1):,} in {src1} corroborates an individual transaction candidate reported in {src2}."
                    })
                # Check 3: Unresolved Variance (Between 2% and 5%) -> Review Required (not a contradiction)
                elif 0.02 < rel_diff <= 0.05:
                    ambiguous_findings.append({
                        "field": "disputed_amount",
                        "status": "UNRESOLVED_AMOUNT_VARIANCE",
                        "sources_involved": {
                            src1: f"₹{int(amt1):,}",
                            src2: f"₹{int(amt2):,}"
                        },
                        "variance_percentage": round(rel_diff * 100, 2),
                        "details": f"Unresolved amount variance: {src1} indicates ₹{int(amt1):,}, whereas {src2} indicates ₹{int(amt2):,} (variance of {rel_diff*100:.1f}%). Requires manual review to confirm if this reflects processing fees, taxes, or minor estimation."
                    })
                # Check 4: Difference > 5% with multi-transaction context -> Ambiguous relationship
                elif has_multi:
                    ambiguous_findings.append({
                        "field": "disputed_amount",
                        "status": "AMBIGUOUS_MULTI_TRANSACTION_RELATION",
                        "sources_involved": {
                            src1: f"₹{int(amt1):,}",
                            src2: f"₹{int(amt2):,}"
                        },
                        "discrepancy_amount": diff,
                        "details": f"Multi-transaction variance: {src1} reports ₹{int(amt1):,}, while {src2} reports ₹{int(amt2):,}. One or both sources indicate multiple transactions; relationship is ambiguous rather than an established contradiction."
                    })
                # Check 5: Direct single-transaction contradiction
                else:
                    discrepancies.append({
                        "field": "disputed_amount",
                        "severity": "CRITICAL" if rel_diff > 0.20 else "HIGH",
                        "sources_involved": {
                            src1: f"₹{int(amt1):,}",
                            src2: f"₹{int(amt2):,}"
                        },
                        "discrepancy_amount": diff,
                        "details": f"Amount discrepancy: {src1} specifies ₹{int(amt1):,}, whereas {src2} indicates ₹{int(amt2):,} (difference of ₹{int(diff):,})."
                    })
    elif len(sources_with_amounts) == 1:
        present_src = list(sources_with_amounts.keys())[0]
        unobserved = [s for s in available_sources if s != present_src]
        if unobserved:
            missing_information.append({
                "field": "disputed_amount",
                "observed_in": present_src,
                "value": f"₹{int(sources_with_amounts[present_src]['disputed_amount']):,}",
                "unobserved_in": unobserved,
                "status": "SINGLE_SOURCE_OBSERVED",
                "details": f"Disputed amount observed in {present_src}; not explicitly stated in {', '.join(unobserved)}."
            })

    # --- B. Bank UTR / Transaction Reference IDs Comparison ---
    all_utrs: Set[str] = set()
    utrs_by_source: Dict[str, List[str]] = {
        src: data["utr_numbers"] for src, data in sources.items() if data.get("utr_numbers")
    }
    for utrs in utrs_by_source.values():
        all_utrs.update(utrs)

    for utr in all_utrs:
        matching_sources = [src for src, utrs in utrs_by_source.items() if utr in utrs]
        if len(matching_sources) >= 2:
            corroborations.append({
                "field": "utr_number",
                "value": utr,
                "sources": matching_sources,
                "details": f"Bank UTR / Transaction ID {utr} corroborated across {', '.join(matching_sources)}."
            })
        else:
            present_src = matching_sources[0]
            unobserved = [s for s in available_sources if s != present_src]
            if unobserved:
                missing_information.append({
                    "field": "utr_number",
                    "value": utr,
                    "observed_in": present_src,
                    "unobserved_in": unobserved,
                    "status": "SINGLE_SOURCE_OBSERVED",
                    "details": f"UTR {utr} extracted from {present_src}; not found in {', '.join(unobserved)}."
                })

    # Check for UTR relationships when multiple sources have distinct UTRs
    if len(utrs_by_source) >= 2:
        source_names = list(utrs_by_source.keys())
        src_a, src_b = source_names[0], source_names[1]
        utrs_a = utrs_by_source[src_a]
        utrs_b = utrs_by_source[src_b]

        has_overlap = bool(set(utrs_a).intersection(set(utrs_b)))
        if not has_overlap:
            has_multi = (
                len(utrs_a) > 1 or len(utrs_b) > 1 or
                sources[src_a].get("has_multi_transaction_indicators") or
                sources[src_b].get("has_multi_transaction_indicators")
            )
            if has_multi:
                ambiguous_findings.append({
                    "field": "utr_number",
                    "status": "DISTINCT_TRANSACTION_REFS_OBSERVED",
                    "sources_involved": {
                        src_a: utrs_a,
                        src_b: utrs_b
                    },
                    "details": f"Distinct transaction references observed ({src_a}: {', '.join(utrs_a)}, {src_b}: {', '.join(utrs_b)}). In multi-transaction contexts, distinct UTRs may represent separate installments rather than a contradiction."
                })
            else:
                discrepancies.append({
                    "field": "utr_number",
                    "severity": "CRITICAL",
                    "sources_involved": {
                        src_a: utrs_a[0],
                        src_b: utrs_b[0]
                    },
                    "details": f"Conflicting transaction IDs: {src_a} references {utrs_a[0]}, while {src_b} references {utrs_b[0]} for a single reported incident."
                })

    # --- C. Mule UPI IDs Comparison ---
    all_upis: Set[str] = set()
    upis_by_source: Dict[str, List[str]] = {
        src: data["upi_ids"] for src, data in sources.items() if data.get("upi_ids")
    }
    for upis in upis_by_source.values():
        all_upis.update(upis)

    for upi in all_upis:
        matching_sources = [src for src, upis in upis_by_source.items() if upi in upis]
        if len(matching_sources) >= 2:
            corroborations.append({
                "field": "upi_id",
                "value": upi,
                "sources": matching_sources,
                "details": f"Mule UPI handle '{upi}' verified across {', '.join(matching_sources)}."
            })
        else:
            present_src = matching_sources[0]
            unobserved = [s for s in available_sources if s != present_src]
            if unobserved:
                missing_information.append({
                    "field": "upi_id",
                    "value": upi,
                    "observed_in": present_src,
                    "unobserved_in": unobserved,
                    "status": "SINGLE_SOURCE_OBSERVED",
                    "details": f"UPI handle '{upi}' identified in {present_src}; not present in {', '.join(unobserved)}."
                })

    # --- D. Scammer Phone Numbers Comparison ---
    all_phones: Set[str] = set()
    phones_by_source: Dict[str, List[str]] = {
        src: data["scammer_phones"] for src, data in sources.items() if data.get("scammer_phones")
    }
    for phones in phones_by_source.values():
        all_phones.update(phones)

    for phone in all_phones:
        matching_sources = [src for src, phones in phones_by_source.items() if phone in phones]
        if len(matching_sources) >= 2:
            corroborations.append({
                "field": "scammer_phone",
                "value": phone,
                "sources": matching_sources,
                "details": f"Suspect phone number {phone} corroborated across {', '.join(matching_sources)}."
            })
        else:
            present_src = matching_sources[0]
            unobserved = [s for s in available_sources if s != present_src]
            if unobserved:
                missing_information.append({
                    "field": "scammer_phone",
                    "value": phone,
                    "observed_in": present_src,
                    "unobserved_in": unobserved,
                    "status": "SINGLE_SOURCE_OBSERVED",
                    "details": f"Suspect phone number {phone} mentioned in {present_src}; not detected in {', '.join(unobserved)} (expected for standard payment receipts)."
                })

    # --- E. Incident Dates Comparison ---
    all_dates: Set[str] = set()
    dates_by_source: Dict[str, List[str]] = {
        src: data["dates"] for src, data in sources.items() if data.get("dates")
    }
    for dates in dates_by_source.values():
        all_dates.update(dates)

    for dt in all_dates:
        matching_sources = [src for src, dates in dates_by_source.items() if dt in dates]
        if len(matching_sources) >= 2:
            corroborations.append({
                "field": "transaction_date",
                "value": dt,
                "sources": matching_sources,
                "details": f"Incident transaction date '{dt}' matches across {', '.join(matching_sources)}."
            })

    # Step 3: Explainable Heuristic Cross-Evidence Corroboration Index
    # Formula: Score = Base + Corroboration_Bonus - Discrepancy_Penalty - Uncertainty_Penalty - Unresolved_Penalty
    base_scores = {
        1: 45.0,  # Single evidence source baseline
        2: 65.0,  # Dual modality baseline
        3: 75.0   # Tri-modality baseline
    }
    base_score = base_scores.get(num_sources, 45.0)

    # Corroboration Bonus
    corrob_bonus = 0.0
    for c in corroborations:
        if c["field"] == "utr_number":
            corrob_bonus += 15.0
        elif c["field"] == "disputed_amount":
            corrob_bonus += 10.0
        elif c["field"] == "upi_id":
            corrob_bonus += 10.0
        elif c["field"] == "scammer_phone":
            corrob_bonus += 5.0
        elif c["field"] == "transaction_date":
            corrob_bonus += 5.0
    corrob_bonus = min(30.0, corrob_bonus)

    # Discrepancy Penalty
    discrep_penalty = 0.0
    for d in discrepancies:
        if d.get("severity") == "CRITICAL":
            discrep_penalty += 30.0
        else:
            discrep_penalty += 20.0
    discrep_penalty = min(60.0, discrep_penalty)

    # Uncertainty Penalty
    uncertain_penalty = min(15.0, len(uncertain_extractions) * 3.0)

    # Minor unresolved variance penalty (2% to 5% variance or ambiguous UTRs)
    unresolved_penalty = min(10.0, len(ambiguous_findings) * 3.0)

    # Raw Score Calculation
    raw_score = base_score + corrob_bonus - discrep_penalty - uncertain_penalty - unresolved_penalty

    # Tier mapping & clamping
    if len(discrepancies) > 0:
        final_score = round(max(10.0, min(48.0, raw_score)), 1)
        tier = "DISCREPANCY_FLAGGED"
        tier_def = "Discrepancy detected: Direct contradiction identified between submitted evidence sources (e.g., receipt amount differs from statement). Manual investigator review recommended."
    else:
        final_score = round(max(15.0, min(96.0, raw_score)), 1)
        if final_score >= 75.0:
            tier = "HIGH_CORROBORATION"
            tier_def = "High consistency: Core forensic indicators are corroborated across distinct submitted evidence modalities with no material contradictions."
        elif final_score >= 40.0:
            tier = "MODERATE_EVIDENCE"
            tier_def = "Moderate consistency: Indicators are consistent across available sources, primarily reliant on single-source observation or partial overlap."
        else:
            tier = "LOW_CORROBORATION"
            tier_def = "Low consistency: Limited evidence provided or extraction ambiguity prevents comprehensive cross-source verification."

    rationale_parts = [
        f"Base score: {base_score} ({num_sources} submitted modalit{'y' if num_sources == 1 else 'ies'}: {', '.join(available_sources) if available_sources else 'none'})"
    ]
    if corrob_bonus > 0:
        rationale_parts.append(f"+{corrob_bonus:.1f} corroboration bonus ({len(corroborations)} match{'es' if len(corroborations) != 1 else ''})")
    if discrep_penalty > 0:
        rationale_parts.append(f"-{discrep_penalty:.1f} discrepancy penalty ({len(discrepancies)} conflict{'s' if len(discrepancies) != 1 else ''})")
    if uncertain_penalty > 0:
        rationale_parts.append(f"-{uncertain_penalty:.1f} uncertainty penalty ({len(uncertain_extractions)} ambiguous item{'s' if len(uncertain_extractions) != 1 else ''})")
    if unresolved_penalty > 0:
        rationale_parts.append(f"-{unresolved_penalty:.1f} unresolved variance penalty ({len(ambiguous_findings)} item{'s' if len(ambiguous_findings) != 1 else ''})")

    rationale_str = "; ".join(rationale_parts) + f" = {final_score}% ({tier})."
    disclaimer_str = "This score is a deterministic heuristic Corroboration Index measuring consistency across submitted evidence artifacts. It does not represent a statistical probability of fraud, evidence authenticity, or legal guilt."

    # Step 4: Consolidated Unified Forensic Entities
    all_amounts = [d["disputed_amount"] for d in sources.values() if d.get("disputed_amount", 0.0) > 0]
    consolidated_amount = max(all_amounts) if all_amounts else 0.0
    consolidated_amount_str = f"₹{int(consolidated_amount):,}" if consolidated_amount > 0 else "Not Specified"

    consolidated_upis = sorted(list(all_upis))
    consolidated_utrs = sorted(list(all_utrs))
    consolidated_phones = sorted(list(all_phones))

    # Determine primary fraud category
    cat_counts: Dict[str, int] = {}
    for src_data in sources.values():
        c = src_data.get("fraud_category", "")
        if c and c != "Suspected Cyber Financial Fraud" and c != "Unspecified Incident":
            cat_counts[c] = cat_counts.get(c, 0) + 1
    if cat_counts:
        consolidated_category = max(cat_counts.items(), key=lambda x: x[1])[0]
    else:
        consolidated_category = "Suspected Cyber Financial Fraud"

    sources_summary = {
        src: {
            "has_content": data.get("has_content", False),
            "text_length": data.get("text_length", 0),
            "disputed_amount": data.get("disputed_amount", 0.0),
            "utr_count": len(data.get("utr_numbers", [])),
            "upi_count": len(data.get("upi_ids", [])),
            "phone_count": len(data.get("scammer_phones", [])),
            "fraud_category": data.get("fraud_category", "Unspecified Incident"),
            "uncertain_count": len(data.get("uncertain_candidates", []))
        }
        for src, data in sources.items()
    }

    return {
        "status": "VERIFICATION_COMPLETE",
        "available_sources": available_sources,
        "sources_summary": sources_summary,
        "corroborations": corroborations,
        "discrepancies": discrepancies,
        "ambiguous_findings": ambiguous_findings,
        "missing_information": missing_information,
        "uncertain_extractions": uncertain_extractions,
        "confidence_assessment": {
            "score": final_score,
            "tier": tier,
            "metric_name": "Cross-Evidence Corroboration Index",
            "rationale": rationale_str,
            "disclaimer": disclaimer_str,
            "breakdown": {
                "base_score": base_score,
                "corroboration_bonus": corrob_bonus,
                "discrepancy_penalty": discrep_penalty,
                "uncertainty_penalty": uncertain_penalty,
                "unresolved_penalty": unresolved_penalty
            },
            "tier_definition": tier_def
        },
        "consolidated_entities": {
            "disputed_amount": consolidated_amount,
            "disputed_amount_str": consolidated_amount_str,
            "upi_ids": consolidated_upis,
            "utr_numbers": consolidated_utrs,
            "scammer_phones": consolidated_phones,
            "fraud_category": consolidated_category
        }
    }
