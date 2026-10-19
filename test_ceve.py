
"""
Synthetic Evidence Test Suite for Cross-Evidence Verification Engine (CEVE)

Tests:
1. Matching values across modalities
2. Mismatched amounts
3. Conflicting UTRs
4. Missing fields and non-punitive handling
5. Uncertain extractions
6. Single-source evidence baseline
7. Empty evidence
8. Backward compatibility with existing cases
9. Amount variance between 2% and 5%
10. Multi-transaction sum matching
11. Multi-transaction distinct UTRs
12. Low-confidence OCR tokens with empty OCR text
13. Voice + Text without OCR
14. OCR + Text without Voice
"""

import unittest

from verification_engine import (
    extract_source_forensic_entities,
    verify_cross_evidence,
)


class TestCrossEvidenceVerificationEngine(unittest.TestCase):

    def test_01_fully_matching_multi_modal_evidence(self):
        """All sources agree on amount, UTR, and UPI handle."""
        voice = (
            "I received a call and was tricked into transferring Rs 8500 "
            "to mule@okaxis. My bank UTR reference is 123456789012 "
            "on 13/10/2026."
        )
        ocr = (
            "Payment to mule@okaxis ₹8,500 Successful\n"
            "Bank UTR: 123456789012\n"
            "Date: 13/10/2026\n"
            "Google Pay UPI Transaction"
        )
        user_text = (
            "Fraudulent transaction of Rs. 8500 to mule@okaxis "
            "with UTR 123456789012."
        )

        report = verify_cross_evidence(
            voice_text=voice,
            ocr_text=ocr,
            user_text=user_text,
        )

        self.assertEqual(report["status"], "VERIFICATION_COMPLETE")
        self.assertEqual(len(report["available_sources"]), 3)
        self.assertEqual(len(report["discrepancies"]), 0)

        corrob_fields = [
            item["field"] for item in report["corroborations"]
        ]
        self.assertIn("disputed_amount", corrob_fields)
        self.assertIn("utr_number", corrob_fields)
        self.assertIn("upi_id", corrob_fields)

        confidence = report["confidence_assessment"]
        self.assertEqual(confidence["tier"], "HIGH_CORROBORATION")
        self.assertEqual(
            confidence["metric_name"],
            "Cross-Evidence Corroboration Index",
        )
        self.assertIn(
            "deterministic heuristic Corroboration Index",
            confidence["disclaimer"],
        )
        self.assertGreaterEqual(confidence["score"], 75.0)

        print(
            "\n[TEST 1 PASSED] Matching multimodal evidence:",
            confidence["score"],
            confidence["tier"],
        )

    def test_02_mismatched_amounts_discrepancy(self):
        """A single-transaction amount discrepancy should be flagged."""
        voice = "The scammer stole Rs 50000 from my account via UPI."
        ocr = "Debited ₹5,000 to merchant@paytm. UTR: 987654321098."

        report = verify_cross_evidence(
            voice_text=voice,
            ocr_text=ocr,
        )

        self.assertEqual(report["status"], "VERIFICATION_COMPLETE")
        self.assertGreaterEqual(len(report["discrepancies"]), 1)

        discrepancy = report["discrepancies"][0]
        self.assertEqual(discrepancy["field"], "disputed_amount")
        self.assertIn("voice", discrepancy["sources_involved"])
        self.assertIn("ocr", discrepancy["sources_involved"])

        confidence = report["confidence_assessment"]
        self.assertEqual(confidence["tier"], "DISCREPANCY_FLAGGED")
        self.assertLess(confidence["score"], 50.0)

        print(
            "\n[TEST 2 PASSED] Amount discrepancy:",
            confidence["score"],
            confidence["tier"],
        )

    def test_03_conflicting_utr_numbers(self):
        """Conflicting UTRs in a single-transaction context are flagged."""
        user_text = (
            "I transferred Rs 12000. Transaction reference UTR "
            "is 111122223333."
        )
        ocr = "Payment Receipt: ₹12,000 sent. Ref No: 999988887777."

        report = verify_cross_evidence(
            user_text=user_text,
            ocr_text=ocr,
        )

        self.assertGreaterEqual(len(report["discrepancies"]), 1)

        utr_discrepancy = next(
            (
                item
                for item in report["discrepancies"]
                if item["field"] == "utr_number"
            ),
            None,
        )

        self.assertIsNotNone(utr_discrepancy)
        self.assertEqual(utr_discrepancy["severity"], "CRITICAL")
        self.assertEqual(
            report["confidence_assessment"]["tier"],
            "DISCREPANCY_FLAGGED",
        )

        print("\n[TEST 3 PASSED] Conflicting UTRs flagged.")

    def test_04_missing_fields_non_punitive(self):
        """Missing information must not be treated as a contradiction."""
        voice = (
            "The scammer called me from 9876543210 and told me "
            "to scan a code."
        )
        ocr = "Paid ₹3,200 to scammer@ybl. Txn ID: 778899001122."

        report = verify_cross_evidence(
            voice_text=voice,
            ocr_text=ocr,
        )

        self.assertEqual(len(report["discrepancies"]), 0)

        missing_fields = [
            item["field"] for item in report["missing_information"]
        ]
        self.assertIn("scammer_phone", missing_fields)
        self.assertIn("disputed_amount", missing_fields)

        phone_missing = next(
            item
            for item in report["missing_information"]
            if item["field"] == "scammer_phone"
        )

        self.assertEqual(
            phone_missing["status"],
            "SINGLE_SOURCE_OBSERVED",
        )
        self.assertIn("voice", phone_missing["observed_in"])
        self.assertIn("ocr", phone_missing["unobserved_in"])

        confidence = report["confidence_assessment"]
        self.assertEqual(confidence["tier"], "MODERATE_EVIDENCE")

        print(
            "\n[TEST 4 PASSED] Missing information handled non-punitively."
        )

    def test_05_uncertain_extraction_handling(self):
        """Truncated UTR candidates and low-confidence OCR remain visible."""
        ocr_text = (
            "Transaction details: Txn ID: 4920194820. Amount: ₹4,000."
        )
        ocr_metadata = {
            "low_confidence_tokens": [
                {"text": "scammer_handle?", "confidence": 0.48}
            ]
        }

        report = verify_cross_evidence(
            ocr_text=ocr_text,
            ocr_metadata=ocr_metadata,
        )

        self.assertGreaterEqual(
            len(report["uncertain_extractions"]), 1
        )

        uncertainty_types = [
            item["type"]
            for item in report["uncertain_extractions"]
        ]
        self.assertIn("TRUNCATED_UTR_CANDIDATE", uncertainty_types)
        self.assertIn("LOW_CONFIDENCE_OCR_TEXT", uncertainty_types)

        confidence = report["confidence_assessment"]
        self.assertGreater(
            confidence["breakdown"]["uncertainty_penalty"], 0.0
        )

        print("\n[TEST 5 PASSED] Uncertain extractions retained.")

    def test_06_single_source_baseline(self):
        """A text-only complaint should produce a baseline assessment."""
        text = (
            "I lost ₹15,000 to phone 9123456780 "
            "on electricity bill threat."
        )

        report = verify_cross_evidence(user_text=text)

        self.assertEqual(len(report["available_sources"]), 1)
        self.assertEqual(len(report["discrepancies"]), 0)

        confidence = report["confidence_assessment"]
        self.assertEqual(confidence["tier"], "MODERATE_EVIDENCE")
        self.assertEqual(confidence["score"], 45.0)

        print("\n[TEST 6 PASSED] Single-source baseline verified.")

    def test_07_empty_input_edge_case(self):
        """An empty submission should not produce fabricated evidence."""
        report = verify_cross_evidence("", "", "")

        self.assertEqual(report["status"], "NO_EVIDENCE_PROVIDED")
        self.assertEqual(
            report["confidence_assessment"]["score"], 0.0
        )
        self.assertEqual(
            report["confidence_assessment"]["tier"], "NO_EVIDENCE"
        )

        print("\n[TEST 7 PASSED] Empty evidence handled.")

    def test_08_backward_compatibility_with_cases_db(self):
        """
        Existing case records retain their required review fields.

        Legacy cases are allowed to lack an intelligence graph.
        If a graph exists, its basic structure is validated.
        Cash-out prediction fields are not required.
        """
        from server import load_cases

        loaded_cases = load_cases()

        self.assertGreaterEqual(
            len(loaded_cases),
            1,
            "Must load existing cases from data/cases.json",
        )

        for case in loaded_cases:
            self.assertIn("case_id", case)
            self.assertIn("disputed_amount", case)
            self.assertIn("verification_report", case)

            verification_report = case["verification_report"]

            self.assertIn("status", verification_report)
            self.assertIn(
                "confidence_assessment", verification_report
            )

            confidence = verification_report["confidence_assessment"]
            self.assertIn("score", confidence)
            self.assertIn("tier", confidence)

            if "intelligence_graph" in case:
                graph = case["intelligence_graph"]
                self.assertIn("nodes", graph)
                self.assertIn("edges", graph)

        print(
            "\n[TEST 8 PASSED] Backward compatibility confirmed for "
            f"{len(loaded_cases)} cases."
        )

    def test_09_amount_variance_between_2_and_5_percent(self):
        """A 2%-5% variance should require review, not assert contradiction."""
        voice = "The unauthorized transaction was for Rs 10000 exactly."
        ocr = "Payment slip Total Debited: ₹9,700 UTR: 123456789012"

        report = verify_cross_evidence(
            voice_text=voice,
            ocr_text=ocr,
        )

        self.assertEqual(
            len(report["discrepancies"]),
            0,
            "A 2%-5% variance should not be a hard contradiction.",
        )

        self.assertGreaterEqual(len(report["ambiguous_findings"]), 1)

        finding = next(
            item
            for item in report["ambiguous_findings"]
            if item["field"] == "disputed_amount"
        )

        self.assertEqual(
            finding["status"], "UNRESOLVED_AMOUNT_VARIANCE"
        )
        self.assertAlmostEqual(
            finding["variance_percentage"], 3.0, delta=0.5
        )
        self.assertNotEqual(
            report["confidence_assessment"]["tier"],
            "DISCREPANCY_FLAGGED",
        )

        print("\n[TEST 9 PASSED] Amount variance flagged for review.")

    def test_10_multi_transaction_sum_matching(self):
        """A reported total may match the sum of multiple transactions."""
        voice = (
            "I lost a total of Rs 15000 across multiple transactions: "
            "Rs 5000, Rs 3000, and Rs 7000."
        )
        ocr = "Consolidated debit record: ₹15,000 sent via UPI."

        report = verify_cross_evidence(
            voice_text=voice,
            ocr_text=ocr,
        )

        self.assertEqual(len(report["discrepancies"]), 0)

        corroborated_fields = [
            item["field"] for item in report["corroborations"]
        ]
        self.assertIn("disputed_amount", corroborated_fields)

        print("\n[TEST 10 PASSED] Multi-transaction aggregate checked.")

    def test_11_multi_transaction_ambiguous_utrs_and_amounts(self):
        """Different transactions must not be assumed contradictory."""
        voice = (
            "I was defrauded in multiple transactions. One payment "
            "reference was UTR 111122223333 for Rs 10000."
        )
        ocr = "Transaction successful: ₹5,000 paid. Ref No: 999988887777."

        report = verify_cross_evidence(
            voice_text=voice,
            ocr_text=ocr,
        )

        self.assertEqual(
            len(report["discrepancies"]),
            0,
            "Do not assert contradiction across potentially distinct transactions.",
        )

        ambiguous_fields = [
            item["field"] for item in report["ambiguous_findings"]
        ]
        self.assertIn("disputed_amount", ambiguous_fields)
        self.assertIn("utr_number", ambiguous_fields)

        print("\n[TEST 11 PASSED] Multi-transaction ambiguity handled.")

    def test_12_low_confidence_ocr_tokens_when_text_empty(self):
        """Low-confidence OCR tokens remain visible when OCR text is empty."""
        ocr_metadata = {
            "low_confidence_tokens": [
                {"text": "blurred_receipt_line", "confidence": 0.38}
            ]
        }

        report = verify_cross_evidence(
            voice_text="I was scammed by caller 9876543210 for Rs 2000.",
            ocr_text="",
            ocr_metadata=ocr_metadata,
        )

        self.assertGreaterEqual(
            len(report["uncertain_extractions"]), 1
        )

        uncertain_item = report["uncertain_extractions"][0]
        self.assertEqual(
            uncertain_item["type"], "LOW_CONFIDENCE_OCR_TEXT"
        )
        self.assertEqual(
            uncertain_item["value"], "blurred_receipt_line"
        )
        self.assertEqual(
            uncertain_item["confidence_score"], 0.38
        )

        print("\n[TEST 12 PASSED] Low-confidence OCR token preserved.")

    def test_13_dual_modality_voice_and_text_without_ocr(self):
        """Voice and user text should corroborate without OCR."""
        voice = "I sent Rs 4500 to fraud@upi. UTR is 556677889900."
        user_text = (
            "Complaint for Rs 4500 debited to fraud@upi "
            "with UTR 556677889900."
        )

        report = verify_cross_evidence(
            voice_text=voice,
            user_text=user_text,
        )

        self.assertEqual(len(report["available_sources"]), 2)
        self.assertIn("voice", report["available_sources"])
        self.assertIn("user_text", report["available_sources"])
        self.assertNotIn("ocr", report["available_sources"])
        self.assertEqual(len(report["discrepancies"]), 0)
        self.assertGreaterEqual(
            report["confidence_assessment"]["score"], 75.0
        )

        print("\n[TEST 13 PASSED] Voice + Text corroboration checked.")

    def test_14_dual_modality_ocr_and_text_without_voice(self):
        """OCR and user text should corroborate without voice."""
        ocr = "Paid ₹6,000 to merchant@axis. UTR: 334455667788."
        user_text = (
            "I paid Rs 6000 via Google Pay, "
            "transaction UTR 334455667788."
        )

        report = verify_cross_evidence(
            ocr_text=ocr,
            user_text=user_text,
        )

        self.assertEqual(len(report["available_sources"]), 2)
        self.assertIn("ocr", report["available_sources"])
        self.assertIn("user_text", report["available_sources"])
        self.assertNotIn("voice", report["available_sources"])
        self.assertEqual(len(report["discrepancies"]), 0)
        self.assertGreaterEqual(
            report["confidence_assessment"]["score"], 75.0
        )

        print("\n[TEST 14 PASSED] OCR + Text corroboration checked.")


if __name__ == "__main__":
    unittest.main()
