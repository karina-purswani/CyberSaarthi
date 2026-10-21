import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DATA_DIR = Path(__file__).parent
STORAGE_EVIDENCE_DIR = DATA_DIR.parent / "storage" / "evidence"
STORAGE_EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def create_receipt_image(filename: str, lines: list[str]) -> Path:
    img = Image.new("RGB", (700, 850), color="#FFFFFF")
    draw = ImageDraw.Draw(img)
    
    # Draw simple receipt card
    draw.rectangle([20, 20, 680, 830], fill="#FAFAFA", outline="#D1D5DB", width=2)
    # Header bar
    draw.rectangle([20, 20, 680, 110], fill="#176B65")
    
    # Try default font or basic PIL bitmap font
    y = 50
    draw.text((40, y), "CyberSaarthi - Transaction Receipt", fill="#FFFFFF")
    
    y = 140
    for line in lines:
        if line.startswith("---"):
            draw.line([(40, y), (660, y)], fill="#E5E7EB", width=2)
            y += 25
        elif line.startswith("## "):
            draw.text((40, y), line[3:], fill="#111827")
            y += 45
        elif line.startswith("AMOUNT: "):
            draw.text((40, y), line, fill="#047857")
            y += 45
        else:
            draw.text((40, y), line, fill="#374151")
            y += 35
            
    out_path = STORAGE_EVIDENCE_DIR / filename
    img.save(out_path)
    
    # Also write a companion .txt file with raw text for absolute test reproducibility
    txt_path = out_path.with_suffix('.txt')
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
        
    return out_path

def generate_fixtures():
    # Case 1: Match
    lines_1 = [
        "## Google Pay",
        "Payment Completed Successfully",
        "---",
        "AMOUNT: Paid ₹ 25,000.00",
        "---",
        "To: utility.desk@okhdfcbank",
        "From: Complainant Account",
        "UPI Ref No: UPI309819283741",
        "Transaction ID: UPI309819283741",
        "Date: 15 Oct 2026, 04:32 PM"
    ]
    create_receipt_image("demo_case_101.png", lines_1)

    # Case 2: Conflict
    lines_2 = [
        "## PhonePe",
        "Transaction Successful",
        "---",
        "AMOUNT: Paid ₹ 4,500.00",
        "---",
        "Transferred to: task.refund@ybl",
        "Txn ID: TXN882910482910",
        "Date: 16 Oct 2026, 11:15 AM"
    ]
    create_receipt_image("demo_case_102.png", lines_2)

    # Case 3: Missing Txn in Complaint
    lines_3 = [
        "## Paytm UPI",
        "Money Transferred",
        "---",
        "AMOUNT: Paid ₹ 12,500.00",
        "---",
        "Beneficiary: support.help@icici",
        "UPI Ref No: 409827384912",
        "Transaction ID: 409827384912",
        "Date: 17 Oct 2026, 02:20 PM"
    ]
    create_receipt_image("demo_case_103.png", lines_3)

    # Case 4: Shared UPI (utility.desk@okhdfcbank)
    lines_4 = [
        "## Google Pay",
        "Payment to Courier Support",
        "---",
        "AMOUNT: Paid ₹ 9,800.00",
        "---",
        "Beneficiary UPI: utility.desk@okhdfcbank",
        "UPI Ref No: UPI771829384910",
        "Transaction ID: UPI771829384910",
        "Date: 18 Oct 2026, 09:45 AM"
    ]
    create_receipt_image("demo_case_104.png", lines_4)

    # Case 5: Unrelated
    lines_5 = [
        "## BHIM UPI",
        "Payment Successful",
        "---",
        "AMOUNT: Paid ₹ 15,000.00",
        "---",
        "To: personal.aid99@axisbank",
        "Transaction ID: IMPS998877665544",
        "Date: 19 Oct 2026, 06:10 PM"
    ]
    create_receipt_image("demo_case_105.png", lines_5)

    cases = [
        {
            "id": "cmp_demo_101",
            "reference_id": "CS-2026-101",
            "submission_time": "2026-10-15T16:35:00",
            "language": "en",
            "incident_type": "UPI Fraud",
            "description": "Received threatening message stating electricity will be disconnected tonight. Paid through provided link.",
            "reported_amount": 25000.0,
            "reported_txn_id": "UPI309819283741",
            "reported_upi_id": "utility.desk@okhdfcbank",
            "incident_datetime": "2026-10-15T16:32:00",
            "victim_phone": "9820011223",
            "victim_state": "Maharashtra",
            "status": "VERIFIED",
            "priority": "HIGH",
            "is_demo": 1,
            "evidence_filename": "demo_case_101.png",
            "expected_scenario": "Scenario 1: Amount and transaction identifier match receipt perfectly."
        },
        {
            "id": "cmp_demo_102",
            "reference_id": "CS-2026-102",
            "submission_time": "2026-10-16T11:30:00",
            "language": "en",
            "incident_type": "Investment Scam",
            "description": "Telegram work from home task scam. Citizen claimed they lost ₹45,000 in this batch transaction.",
            "reported_amount": 45000.0,
            "reported_txn_id": "TXN882910482910",
            "reported_upi_id": "task.refund@ybl",
            "incident_datetime": "2026-10-16T11:15:00",
            "victim_phone": "9819022334",
            "victim_state": "Delhi",
            "status": "AWAITING_REVIEW",
            "priority": "HIGH",
            "evidence_filename": "demo_case_102.png",
            "expected_scenario": "Scenario 2: Discrepancy detected! Reported ₹45,000 vs receipt showing ₹4,500."
        },
        {
            "id": "cmp_demo_103",
            "reference_id": "CS-2026-103",
            "submission_time": "2026-10-17T14:45:00",
            "language": "hi",
            "incident_type": "Phishing / Identity Theft",
            "description": "फ़र्ज़ी कस्टमर केयर कॉल आया था। खाते से पैसे कट गए, मुझे ट्रांजैक्शन नंबर याद नहीं था।",
            "reported_amount": 12500.0,
            "reported_txn_id": None,
            "reported_upi_id": "support.help@icici",
            "incident_datetime": "2026-10-17T14:20:00",
            "victim_phone": "9876543210",
            "victim_state": "Madhya Pradesh",
            "status": "AWAITING_REVIEW",
            "priority": "MEDIUM",
            "evidence_filename": "demo_case_103.png",
            "expected_scenario": "Scenario 3: Missing Txn ID in citizen statement; extracted from receipt."
        },
        {
            "id": "cmp_demo_104",
            "reference_id": "CS-2026-104",
            "submission_time": "2026-10-18T10:00:00",
            "language": "mr",
            "incident_type": "UPI Fraud",
            "description": "कुरिअर पार्सल डिलिव्हरी शुल्काच्या नावाखाली ऑनलाइन फसवणूक झाली.",
            "reported_amount": 9800.0,
            "reported_txn_id": "UPI771829384910",
            "reported_upi_id": "utility.desk@okhdfcbank",
            "incident_datetime": "2026-10-18T09:45:00",
            "victim_phone": "9922113344",
            "victim_state": "Maharashtra",
            "status": "AWAITING_REVIEW",
            "priority": "MEDIUM",
            "evidence_filename": "demo_case_104.png",
            "expected_scenario": "Scenario 4: Shares identical suspect UPI utility.desk@okhdfcbank with CS-2026-101."
        },
        {
            "id": "cmp_demo_105",
            "reference_id": "CS-2026-105",
            "submission_time": "2026-10-19T18:30:00",
            "language": "en",
            "incident_type": "Other",
            "description": "Friend's Instagram account hacked asking for urgent medical emergency funds transfer.",
            "reported_amount": 15000.0,
            "reported_txn_id": "IMPS998877665544",
            "reported_upi_id": "personal.aid99@axisbank",
            "incident_datetime": "2026-10-19T18:10:00",
            "victim_phone": "9766554433",
            "victim_state": "Karnataka",
            "status": "AWAITING_REVIEW",
            "priority": "MEDIUM",
            "evidence_filename": "demo_case_105.png",
            "expected_scenario": "Scenario 5: Unrelated isolated case; no links to any other complaints in graph."
        }
    ]

    with open(DATA_DIR / "demo_cases.json", "w", encoding="utf-8") as f:
        json.dump(cases, f, indent=2)

    print(f"Generated {len(cases)} demo cases and images in storage.")

if __name__ == "__main__":
    generate_fixtures()
