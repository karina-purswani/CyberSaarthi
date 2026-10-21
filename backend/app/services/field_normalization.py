import re
from decimal import Decimal, InvalidOperation
from datetime import datetime
from typing import Optional, Tuple

def normalize_amount(raw_val: Optional[object]) -> Tuple[Optional[Decimal], Optional[str]]:
    """
    Normalizes monetary values.
    Handles '₹ 25,000.00', 'Rs. 25000', '25000/-', 'INR 25,000', floats, and ints.
    Returns (Decimal representation, normalized string '25000.00').
    """
    if raw_val is None:
        return None, None
    
    val_str = str(raw_val).strip()
    if not val_str:
        return None, None
    
    # Strip currency symbols, slashes, whitespace
    cleaned = re.sub(r'[₹\$,]|(?:INR|Rs\.?|/-)', '', val_str, flags=re.IGNORECASE).strip()
    
    # Match standard number pattern: 1234 or 1234.56
    match = re.search(r'(\d+(?:\.\d{1,2})?)', cleaned)
    if not match:
        return None, None
    
    number_str = match.group(1)
    try:
        dec = Decimal(number_str)
        # Format consistently with 2 decimal places
        canonical = f"{dec:.2f}"
        return dec, canonical
    except (InvalidOperation, ValueError):
        return None, None

COMMON_WEBMAIL = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", 
    "icloud.com", "rediffmail.com", "proton.me", "protonmail.com"
}

def normalize_upi_id(raw_val: Optional[str]) -> Optional[str]:
    """
    Normalizes UPI handles:
    - Trims whitespace
    - Lowercases
    - Filters common personal email domains
    - Validates presence of '@' and alphanumerics on both sides
    """
    if not raw_val:
        return None
    val = str(raw_val).strip().lower()
    # Check for basic UPI structure: username@psp
    if '@' in val:
        # Remove any surrounding punctuation or quotes
        val = re.sub(r'^[\'\"]|[\'\"]$', '', val)
        parts = val.split('@')
        if len(parts) == 2 and parts[0] and parts[1]:
            domain = parts[1].strip()
            if domain in COMMON_WEBMAIL:
                return None
            # Clean username and psp handle
            user = re.sub(r'[^a-z0-9._-]', '', parts[0])
            psp = re.sub(r'[^a-z0-9]', '', parts[1])
            if user and psp:
                return f"{user}@{psp}"
    return None

def normalize_txn_id(raw_val: Optional[str]) -> Optional[str]:
    """
    Normalizes Transaction / UTR / Order identifiers:
    - Strips whitespace, colons, hashes, and common label prefixes
    - Uppercases
    - Filters alphanumeric tokens
    """
    if not raw_val:
        return None
    val = str(raw_val).strip()
    # Strip common prefixes like 'UPI Ref No: ', 'UTR: ', 'Txn ID: '
    cleaned = re.sub(r'^(?:UPI\s*REF(?:\s*NO)?|UTR(?:\s*NO)?|TXN(?:\s*ID)?|REF(?:\s*NO)?|ORDER(?:\s*ID)?)(?:[:#\-]\s*|\s+)', '', val, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^A-Za-z0-9]', '', cleaned).upper()
    return cleaned if len(cleaned) >= 6 else None

def normalize_phone(raw_val: Optional[str]) -> Optional[str]:
    """
    Normalizes Indian phone numbers:
    - Strips non-digits
    - Removes leading +91, 91, or 0
    - Validates 10-digit mobile number
    """
    if not raw_val:
        return None
    digits = re.sub(r'\D', '', str(raw_val))
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]
    
    if len(digits) == 10 and digits[0] in '6789':
        return digits
    return None

def normalize_timestamp(raw_val: Optional[str]) -> Optional[str]:
    """
    Attempts to normalize various date/time formats into ISO 8601 (YYYY-MM-DDTHH:MM:SS)
    """
    if not raw_val:
        return None
    val = str(raw_val).strip()
    
    # Common formats in Indian payment receipts and forms
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %I:%M %p",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %I:%M %p",
        "%d-%m-%Y",
        "%d %b %Y, %I:%M %p",
        "%d %B %Y, %I:%M %p",
        "%d %b %Y %H:%M",
        "%d %b %Y"
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(val, fmt)
            return dt.isoformat()
        except ValueError:
            continue
            
    return val # Return as is if structured parse fails
