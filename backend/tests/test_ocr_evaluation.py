import os
import io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import pytest
from app.services.evidence_extraction import process_evidence_file

def get_font(size: int = 20):
    font_paths = [
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\segoeui.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def generate_test_receipt(tmp_path: Path, filename: str, lines: list[str], rotate_deg: float = 0) -> Path:
    img = Image.new("RGB", (700, 600), color="#FFFFFF")
    draw = ImageDraw.Draw(img)
    font_header = get_font(22)
    font_body = get_font(18)

    draw.rectangle([20, 20, 680, 580], fill="#FAFAFA", outline="#D1D5DB", width=2)
    draw.rectangle([20, 20, 680, 90], fill="#176B65")
    draw.text((40, 35), "CyberSaarthi Receipt Extraction Benchmark", fill="#FFFFFF", font=font_header)

    y = 120
    for line in lines:
        if line.startswith("## "):
            draw.text((40, y), line[3:], fill="#111827", font=font_header)
            y += 45
        elif line.startswith("AMOUNT: "):
            draw.text((40, y), line, fill="#047857", font=font_header)
            y += 45
        else:
            draw.text((40, y), line, fill="#374151", font=font_body)
            y += 35

    if rotate_deg != 0:
        img = img.rotate(rotate_deg, fillcolor="#FFFFFF", expand=False)

    out_path = tmp_path / filename
    img.save(out_path)
    return out_path

BENCHMARK_CASES = [
    {
        "id": "std_gpay",
        "lines": [
            "## Google Pay",
            "AMOUNT: Rs. 25,000.00",
            "UPI Ref No: UPI309819283741",
            "Paid to: utility.desk@okhdfcbank",
            "Date: 15 Oct 2026, 04:32 PM"
        ],
        "expected": {
            "amount": "25000.00",
            "txn_id": "UPI309819283741",
            "upi_id": "utility.desk@okhdfcbank",
            "app": "Google Pay"
        }
    },
    {
        "id": "std_phonepe",
        "lines": [
            "## PhonePe",
            "AMOUNT: Rs. 4,500.00",
            "Txn ID: TXN882910482910",
            "Paid to: task.refund@ybl",
            "Date: 16-10-2026"
        ],
        "expected": {
            "amount": "4500.00",
            "txn_id": "TXN882910482910",
            "upi_id": "task.refund@ybl",
            "app": "PhonePe"
        }
    },
    {
        "id": "std_paytm",
        "lines": [
            "## Paytm",
            "AMOUNT: Rs. 12,500.00",
            "UTR: 409827384912",
            "Paid to: support.help@icici"
        ],
        "expected": {
            "amount": "12500.00",
            "txn_id": "409827384912",
            "upi_id": "support.help@icici",
            "app": "Paytm"
        }
    },
    {
        "id": "missing_txn_bhim",
        "lines": [
            "## BHIM UPI",
            "AMOUNT: Rs. 9,800.00",
            "Transferred to: courier.desk@oksbi"
        ],
        "expected": {
            "amount": "9800.00",
            "txn_id": None,
            "upi_id": "courier.desk@oksbi",
            "app": "BHIM UPI"
        }
    },
    {
        "id": "standalone_12digit_utr",
        "lines": [
            "## Google Pay",
            "AMOUNT: Rs. 15,200.00",
            "UTR 998877665544",
            "Paid to: vendor.pay@okaxis"
        ],
        "expected": {
            "amount": "15200.00",
            "txn_id": "998877665544",
            "upi_id": "vendor.pay@okaxis",
            "app": "Google Pay"
        }
    }
]

def test_ocr_benchmark_evaluation(tmp_path):
    """
    Executes repeatable synthetic receipt benchmark and computes accuracy percentages.
    """
    field_counts = {"amount": 0, "txn_id": 0, "upi_id": 0, "app": 0}
    field_matches = {"amount": 0, "txn_id": 0, "upi_id": 0, "app": 0}

    for case in BENCHMARK_CASES:
        p = generate_test_receipt(tmp_path, f"{case['id']}.png", case["lines"])
        res = process_evidence_file(p)
        extracted = res.structured_fields

        # Check amount
        exp_amt = case["expected"]["amount"]
        if exp_amt:
            field_counts["amount"] += 1
            if extracted.get("amount") and extracted["amount"].get("normalized") == exp_amt:
                field_matches["amount"] += 1

        # Check txn_id
        exp_txn = case["expected"]["txn_id"]
        if exp_txn:
            field_counts["txn_id"] += 1
            if extracted.get("txn_id") and extracted["txn_id"].get("normalized") == exp_txn:
                field_matches["txn_id"] += 1

        # Check upi_id
        exp_upi = case["expected"]["upi_id"]
        if exp_upi:
            field_counts["upi_id"] += 1
            if extracted.get("upi_id") and extracted["upi_id"].get("normalized") == exp_upi:
                field_matches["upi_id"] += 1

        # Check app
        exp_app = case["expected"]["app"]
        if exp_app:
            field_counts["app"] += 1
            if extracted.get("payment_app") and extracted["payment_app"].get("normalized") == exp_app:
                field_matches["app"] += 1

    amt_acc = (field_matches["amount"] / field_counts["amount"]) * 100
    txn_acc = (field_matches["txn_id"] / field_counts["txn_id"]) * 100
    upi_acc = (field_matches["upi_id"] / field_counts["upi_id"]) * 100
    app_acc = (field_matches["app"] / field_counts["app"]) * 100

    print(f"\n--- Synthetic Benchmark Accuracy ---")
    print(f"Amount Accuracy: {amt_acc:.1f}% ({field_matches['amount']}/{field_counts['amount']})")
    print(f"Txn ID Accuracy: {txn_acc:.1f}% ({field_matches['txn_id']}/{field_counts['txn_id']})")
    print(f"UPI ID Accuracy: {upi_acc:.1f}% ({field_matches['upi_id']}/{field_counts['upi_id']})")
    print(f"App Detect Acc:  {app_acc:.1f}% ({field_matches['app']}/{field_counts['app']})")

    assert amt_acc >= 80.0
    assert txn_acc >= 80.0
    assert upi_acc >= 80.0
    assert app_acc >= 80.0

def test_ocr_corrupted_and_empty_file_handling(tmp_path):
    empty_file = tmp_path / "empty.png"
    empty_file.write_bytes(b"")
    res_empty = process_evidence_file(empty_file)
    assert res_empty.structured_fields["amount"] is None
    assert res_empty.structured_fields["txn_id"] is None

    corrupt_file = tmp_path / "corrupt.png"
    corrupt_file.write_bytes(b"Not an image at all but random text bytes")
    res_corrupt = process_evidence_file(corrupt_file)
    assert res_corrupt.structured_fields["amount"] is None
