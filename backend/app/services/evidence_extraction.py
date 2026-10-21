import re
import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.services.field_normalization import (
    normalize_amount,
    normalize_upi_id,
    normalize_txn_id,
    normalize_phone,
    normalize_timestamp
)

logger = logging.getLogger(__name__)

# Initialize RapidOCR singleton safely
_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _ocr_engine = RapidOCR()
            logger.info("RapidOCR initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize RapidOCR: {e}. Fallback parser will be used.")
            _ocr_engine = False
    return _ocr_engine if _ocr_engine is not False else None

class ExtractionResult:
    def __init__(
        self,
        raw_ocr_text: str,
        ocr_confidence: float,
        structured_fields: Dict[str, Any],
        lines: List[Dict[str, Any]],
        engine_used: str
    ):
        self.raw_ocr_text = raw_ocr_text
        self.ocr_confidence = ocr_confidence
        self.structured_fields = structured_fields
        self.lines = lines
        self.engine_used = engine_used

def extract_structured_fields_from_text(raw_text: str) -> Dict[str, Any]:
    """
    Deterministic rule-based entity extractor from OCR text.
    Extracts Amount, Txn/UTR ID, UPI ID, Phone, Timestamp, and App Name.
    """
    fields: Dict[str, Any] = {
        "amount": None,
        "txn_id": None,
        "upi_id": None,
        "phone": None,
        "timestamp": None,
        "payment_app": None
    }
    
    if not raw_text:
        return fields
    
    # 1. Detect Payment App
    app_patterns = [
        (r'\bGoogle\s*Pay\b|\bGPay\b', 'Google Pay'),
        (r'\bPhonePe\b', 'PhonePe'),
        (r'\bPaytm\b', 'Paytm'),
        (r'\bBHIM\b', 'BHIM UPI'),
        (r'\bCRED\b', 'CRED'),
        (r'\bAmazon\s*Pay\b', 'Amazon Pay'),
        (r'\bYONO\b', 'SBI YONO'),
        (r'\biMobile\b', 'ICICI iMobile')
    ]
    for pattern, name in app_patterns:
        if re.search(pattern, raw_text, re.IGNORECASE):
            fields["payment_app"] = {
                "raw": name,
                "normalized": name,
                "context": f"Detected keyword: {name}"
            }
            break

    # 2. Extract Amount
    # Common formats: ₹ 25,000, Rs. 25000.00, Paid ₹2,500, Amount: 1,500.00
    amount_matches = list(re.finditer(
        r'(?:Paid\s*to|Paid|Transferred|Payment\s*of|Amount|₹|Rs\.?|INR)\s*[:=.-]?\s*(?:[₹\$,B\s]|INR|Rs\.?)*([0-9,]+(?:\.[0-9]{1,2})?)',
        raw_text,
        re.IGNORECASE
    ))
    
    found_amount = None
    if amount_matches:
        for m in amount_matches:
            raw_matched = m.group(1).strip()
            dec, norm_str = normalize_amount(raw_matched)
            if dec and dec > 0:
                found_amount = {
                    "raw": m.group(0).strip(),
                    "normalized": norm_str,
                    "value": float(dec),
                    "context": m.group(0).strip()
                }
                break
    
    if not found_amount:
        # Fallback standalone currency symbols with digits
        standalone = re.search(r'[₹]\s*([0-9,]+(?:\.[0-9]{1,2})?)', raw_text)
        if standalone:
            dec, norm_str = normalize_amount(standalone.group(1))
            if dec and dec > 0:
                found_amount = {
                    "raw": standalone.group(0),
                    "normalized": norm_str,
                    "value": float(dec),
                    "context": standalone.group(0)
                }
                
    fields["amount"] = found_amount

    # 3. Extract UPI ID
    # Pattern: [a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}
    # Known banking handles: @oksbi, @okaxis, @okhdfcbank, @okicici, @ybl, @ibl, @axl, @paytm, @apl, @upi
    upi_matches = list(re.finditer(
        r'\b([a-zA-Z0-9._-]{3,}@(?!gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)[a-zA-Z0-9]{2,})\b',
        raw_text,
        re.IGNORECASE
    ))
    if upi_matches:
        for um in upi_matches:
            raw_upi = um.group(1).strip()
            norm_upi = normalize_upi_id(raw_upi)
            if norm_upi:
                fields["upi_id"] = {
                    "raw": raw_upi,
                    "normalized": norm_upi,
                    "context": um.group(0)
                }
                break

    # 4. Extract UTR / Transaction ID
    # Usually 12-digit numeric for UPI (UTR), or alphanumeric 10-25 chars
    utr_match = re.search(r'\b(?:UPI\s*Ref(?:\s*N[oa]\.?)?|UTR(?:\s*No\.?)?|Txn\s*ID|Transaction\s*ID|Ref\s*ID)[:\s#.-]*([0-9]{12}|[A-Za-z0-9]{10,24})\b', raw_text, re.IGNORECASE)
    if utr_match:
        raw_txn = utr_match.group(1).strip()
        norm_txn = normalize_txn_id(raw_txn)
        if norm_txn:
            fields["txn_id"] = {
                "raw": raw_txn,
                "normalized": norm_txn,
                "context": utr_match.group(0)
            }
    else:
        # Check for standalone 12-digit UTR on its own line or following standard labels
        digits_12 = re.search(r'\b([0-9]{12})\b', raw_text)
        if digits_12:
            norm_txn = normalize_txn_id(digits_12.group(1))
            fields["txn_id"] = {
                "raw": digits_12.group(1),
                "normalized": norm_txn,
                "context": f"Candidate 12-digit UTR: {digits_12.group(1)}"
            }

    # 5. Extract Phone Number
    phone_match = re.search(r'\b(?:\+91[\-\s]?)?([6-9]\d{9})\b', raw_text)
    if phone_match:
        raw_phone = phone_match.group(0).strip()
        norm_phone = normalize_phone(raw_phone)
        if norm_phone:
            fields["phone"] = {
                "raw": raw_phone,
                "normalized": norm_phone,
                "context": phone_match.group(0)
            }

    # 6. Extract Timestamp
    ts_match = re.search(
        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}(?:,?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?|\d{2}[/-]\d{2}[/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)\b',
        raw_text,
        re.IGNORECASE
    )
    if ts_match:
        raw_ts = ts_match.group(1).strip()
        norm_ts = normalize_timestamp(raw_ts)
        fields["timestamp"] = {
            "raw": raw_ts,
            "normalized": norm_ts,
            "context": ts_match.group(0)
        }

    return fields

def process_evidence_file(file_path: Path) -> ExtractionResult:
    """
    Executes OCR pipeline on the provided file path.
    Preserves raw OCR text, confidence scores, and structured entities.
    """
    ocr = get_ocr_engine()
    raw_lines = []
    text_pieces = []
    confidences = []
    engine_name = "rapidocr"
    
    if ocr and file_path.exists():
        try:
            results, elapse = ocr(str(file_path))
            if results:
                for item in results:
                    # RapidOCR returns [bbox, text, score]
                    bbox = item[0]
                    text = item[1].strip()
                    score = float(item[2])
                    if text:
                        text_pieces.append(text)
                        confidences.append(score)
                        raw_lines.append({
                            "bbox": bbox,
                            "text": text,
                            "confidence": round(score, 4)
                        })
        except Exception as e:
            logger.error(f"RapidOCR execution failed on {file_path.name}: {e}")
            engine_name = "fallback_heuristic"

    # Fallback if no OCR results or engine not initialized
    if not text_pieces:
        # Check if there is an accompanying synthetic text file or metadata
        meta_txt_path = file_path.with_suffix('.txt')
        if meta_txt_path.exists():
            with open(meta_txt_path, 'r', encoding='utf-8') as f:
                content = f.read()
            text_pieces = [l.strip() for l in content.splitlines() if l.strip()]
            confidences = [0.95] * len(text_pieces)
            engine_name = "demo_fixture_ocr"
        else:
            engine_name = "unprocessed_or_empty"

    raw_text = "\n".join(text_pieces)
    avg_confidence = round(sum(confidences) / len(confidences), 4) if confidences else 0.0
    structured = extract_structured_fields_from_text(raw_text)

    return ExtractionResult(
        raw_ocr_text=raw_text,
        ocr_confidence=avg_confidence,
        structured_fields=structured,
        lines=raw_lines,
        engine_used=engine_name
    )
