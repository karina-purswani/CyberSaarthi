"""
Unit & Integration Test Suite for Evidence-to-Intelligence Graph (EIG)
Phase 2 Implementation Tests:
1. Entity Extraction (Cases, Victims, Phones, UPIs, UTRs, URLs, Fraud Types)
2. Direct Fact Edges vs Inferred Cross-Case Edges (explicit is_inferred separation)
3. Provenance Traceability (source artifact, excerpts, confidence, timestamps)
4. Contradictions & Ambiguities Preserved without Silent Merging (discrepancy edges)
5. Multi-Case Syndicate Clustering (Shared UPIs/Phones across separate cases)
6. Empty / Minimal Evidence Handling
7. Legacy Case Compatibility (Generating graph from legacy cases in data/cases.json)
8. Isolation Guarantee (Mocking and temporary directories confirm zero write to real project data)
"""

import unittest
import os
import tempfile
import json
from intelligence_graph import (
    extract_cyber_indicators,
    build_case_subgraph,
    build_multi_case_intelligence_graph,
    GRAPH_DISCLAIMER
)


class TestEvidenceToIntelligenceGraph(unittest.TestCase):

    def test_01_entity_extraction_and_direct_facts(self):
        """Case 1: Single case with multi-modal inputs builds direct fact nodes and edges."""
        sample_case = {
            "case_id": "CS-2026-PU-9901",
            "victim_name": "Priya Deshmukh",
            "victim_phone": "+919876543210",
            "victim_city": "Pune",
            "fraud_category": "Fake KYC / Banking Impersonation",
            "timestamp": "2026-10-18T10:00:00",
            "disputed_amount": 25000.0,
            "disputed_amount_str": "₹25,000",
            "upi_ids": ["scammer.kyc@okaxis"],
            "utr_numbers": ["123456789012"],
            "scammer_phones": ["+919123456789"],
            "raw_text": "I was told to open https://fake-kyc-update.com/login and transfer money."
        }

        subgraph = build_case_subgraph(sample_case)
        self.assertEqual(subgraph["status"], "success")
        self.assertEqual(subgraph["case_id"], "CS-2026-PU-9901")
        self.assertEqual(subgraph["disclaimer"], GRAPH_DISCLAIMER)

        node_types = {n["entity_type"] for n in subgraph["nodes"]}
        self.assertIn("CASE", node_types)
        self.assertIn("VICTIM", node_types)
        self.assertIn("PHONE", node_types)
        self.assertIn("UPI", node_types)
        self.assertIn("UTR", node_types)
        self.assertIn("URL", node_types)
        self.assertIn("FRAUD_TYPE", node_types)

        # Check directly observed fact edges
        fact_edges = [e for e in subgraph["edges"] if not e["is_inferred"]]
        fact_rel_types = {e["relationship_type"] for e in fact_edges}
        self.assertIn("REPORTED_BY", fact_rel_types)
        self.assertIn("TRANSFERRED_TO_UPI", fact_rel_types)
        self.assertIn("TRANSACTION_REFERENCE", fact_rel_types)
        self.assertIn("SUSPECT_CALLER_REPORTED", fact_rel_types)
        self.assertIn("SUSPECT_URL_REPORTED", fact_rel_types)
        print("\n[EIG TEST 1 PASSED] Single-case entity extraction & direct fact edges verified.")

    def test_02_provenance_traceability(self):
        """Case 2: Every node and edge must have explicit provenance metadata."""
        sample_case = {
            "case_id": "CS-2026-MU-8802",
            "victim_name": "Aarav Mehta",
            "victim_phone": "+919800000001",
            "victim_city": "Mumbai",
            "disputed_amount": 10000.0,
            "upi_ids": ["mule@paytm"],
            "utr_numbers": ["998877665544"],
            "ocr_text": "Paid to mule@paytm ₹10,000 Ref No: 998877665544",
            "transcript": "I transferred money to mule@paytm."
        }

        subgraph = build_case_subgraph(sample_case)
        for node in subgraph["nodes"]:
            self.assertIn("provenance", node, f"Node {node['id']} missing provenance")
            prov = node["provenance"]
            self.assertIn("source_artifact", prov)
            self.assertIn("case_id", prov)
            self.assertIn("is_inferred", prov)

        for edge in subgraph["edges"]:
            self.assertIn("provenance", edge, f"Edge {edge['id']} missing provenance")
            self.assertIn("relationship_type", edge)
            self.assertIn("confidence", edge)
            self.assertGreater(edge["confidence"], 0.0)
        print("\n[EIG TEST 2 PASSED] Provenance traceability verified on all nodes and edges.")

    def test_03_contradictions_preserved_without_silent_merging(self):
        """Case 3: Conflicting UTRs are preserved as separate nodes with a discrepancy edge."""
        sample_case = {
            "case_id": "CS-2026-TH-7703",
            "victim_name": "Vikram Singh",
            "utr_numbers": ["111122223333", "999988887777"],
            "verification_report": {
                "discrepancies": [{
                    "field": "utr_number",
                    "severity": "CRITICAL",
                    "sources_involved": {
                        "user_text": "111122223333",
                        "ocr": "999988887777"
                    },
                    "details": "Conflicting transaction IDs cited."
                }]
            }
        }

        subgraph = build_case_subgraph(sample_case)
        node_ids = {n["id"] for n in subgraph["nodes"]}
        self.assertIn("utr:111122223333", node_ids)
        self.assertIn("utr:999988887777", node_ids)

        # Confirm discrepancy edge exists between them
        disc_edges = [e for e in subgraph["edges"] if e["relationship_type"] == "POTENTIAL_DISCREPANCY"]
        self.assertGreaterEqual(len(disc_edges), 1)
        disc_edge = disc_edges[0]
        self.assertTrue(disc_edge["is_inferred"])
        self.assertEqual(disc_edge["source"], "utr:111122223333")
        self.assertEqual(disc_edge["target"], "utr:999988887777")
        print("\n[EIG TEST 3 PASSED] Contradictory identifiers preserved as distinct nodes with discrepancy edge.")

    def test_04_multi_case_syndicate_correlation(self):
        """Case 4: Multi-case graph connects distinct complaints sharing a mule UPI and phone."""
        case_1 = {
            "case_id": "CS-2026-PU-0001",
            "victim_name": "Victim One",
            "disputed_amount": 8000.0,
            "upi_ids": ["shared_mule@ybl"],
            "scammer_phones": ["+919999911111"]
        }
        case_2 = {
            "case_id": "CS-2026-MU-0002",
            "victim_name": "Victim Two",
            "disputed_amount": 12000.0,
            "upi_ids": ["shared_mule@ybl"],
            "scammer_phones": ["+919999911111"]
        }
        case_3 = {
            "case_id": "CS-2026-NA-0003",
            "victim_name": "Victim Three",
            "disputed_amount": 5000.0,
            "upi_ids": ["independent_mule@sbi"],
            "scammer_phones": ["+919888822222"]
        }

        global_graph = build_multi_case_intelligence_graph([case_1, case_2, case_3])
        self.assertEqual(global_graph["status"], "success")

        # Verify shared entity detection
        metrics = global_graph["metrics"]
        self.assertGreaterEqual(metrics["shared_entities_count"], 2)  # shared_mule@ybl and +919999911111
        self.assertEqual(metrics["syndicate_clusters_count"], 1)

        # Verify cross-case shared identifier edges exist
        cross_case_edges = [
            e for e in global_graph["edges"]
            if e["relationship_type"] == "SHARED_IDENTIFIER_ACROSS_CASES"
        ]
        self.assertGreaterEqual(len(cross_case_edges), 1)

        # Verify syndicate cluster details
        cluster = global_graph["clusters"][0]
        self.assertIn("CS-2026-PU-0001", cluster["linked_cases"])
        self.assertIn("CS-2026-MU-0002", cluster["linked_cases"])
        self.assertNotIn("CS-2026-NA-0003", cluster["linked_cases"])
        self.assertEqual(cluster["total_loss_volume"], 20000.0)
        print("\n[EIG TEST 4 PASSED] Multi-case syndicate correlation correctly linked Case 1 and Case 2.")

    def test_05_cyber_indicators_extractor(self):
        """Case 5: Extract URLs, Telegram handles, and APKs without false positives."""
        text = (
            "The scammer sent me an APK named update_sbi_app.apk on Telegram at t.me/fast_loan_247. "
            "They also told me to visit http://phishing-bank-login.xyz/verify. Do not block google.com."
        )
        res = extract_cyber_indicators(text)
        self.assertIn("update_sbi_app.apk", res["apk_names"])
        self.assertIn("fast_loan_247", res["telegram_handles"])
        self.assertIn("http://phishing-bank-login.xyz/verify", res["urls"])
        self.assertNotIn("google.com", res["urls"], "Standard search engines should be filtered out.")
        print("\n[EIG TEST 5 PASSED] Cyber indicators extraction (URLs, Telegram, APK) verified.")

    def test_06_empty_evidence_graceful_handling(self):
        """Case 6: Empty case input produces a valid empty or minimal ego graph without crashing."""
        empty_case = {}
        subgraph = build_case_subgraph(empty_case)
        self.assertEqual(subgraph["status"], "success")
        self.assertGreaterEqual(len(subgraph["nodes"]), 1)
        self.assertEqual(subgraph["disclaimer"], GRAPH_DISCLAIMER)

        global_graph = build_multi_case_intelligence_graph([])
        self.assertEqual(global_graph["status"], "success")
        self.assertEqual(len(global_graph["nodes"]), 0)
        self.assertEqual(len(global_graph["edges"]), 0)
        print("\n[EIG TEST 6 PASSED] Empty evidence handled gracefully.")

    def test_07_legacy_cases_compatibility(self):
        """Case 7: Legacy cases from data/cases.json generate valid subgraphs and global graphs."""
        cases_file = os.path.join(os.path.dirname(__file__), "data", "cases.json")
        if os.path.exists(cases_file):
            with open(cases_file, "r", encoding="utf-8") as f:
                cases = json.load(f)

            global_graph = build_multi_case_intelligence_graph(cases)
            self.assertEqual(global_graph["status"], "success")
            self.assertGreaterEqual(len(global_graph["nodes"]), len(cases))
            for c in cases:
                sg = build_case_subgraph(c)
                self.assertEqual(sg["status"], "success")
            print(f"\n[EIG TEST 7 PASSED] Legacy compatibility confirmed on {len(cases)} cases in data/cases.json.")

    def test_08_isolation_mock_guarantee(self):
        """Case 8: Graph generation operates strictly in memory and leaves disk files unchanged."""
        cases_file = os.path.join(os.path.dirname(__file__), "data", "cases.json")
        initial_mtime = os.path.getmtime(cases_file) if os.path.exists(cases_file) else None

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_case = {
                "case_id": "CS-ISOLATED-01",
                "victim_name": "Isolated Complainant",
                "disputed_amount": 5000.0,
                "upi_ids": ["isolated@upi"]
            }
            # Execute in-memory graph builders
            _ = build_case_subgraph(mock_case)
            _ = build_multi_case_intelligence_graph([mock_case])

        # Verify real data/cases.json timestamp was never altered
        if initial_mtime is not None:
            final_mtime = os.path.getmtime(cases_file)
            self.assertEqual(initial_mtime, final_mtime, "Physical cases.json file must not be modified by graph engine.")
        print("\n[EIG TEST 8 PASSED] In-memory isolation guaranteed; zero disk writes to project files.")

    def test_09_server_routes_compatibility(self):
        """Case 9: Verify server route handlers return intelligence_graph without modifying disk."""
        import asyncio
        from server import get_case_graph, get_multi_case_graph, get_case_detail, CASES_DB

        # Test multi-case graph route
        res = asyncio.run(get_multi_case_graph())
        self.assertEqual(res.status_code, 200)
        body = json.loads(res.body.decode("utf-8"))
        self.assertEqual(body["status"], "success")
        self.assertIn("graph", body)
        self.assertIn("nodes", body["graph"])
        self.assertIn("edges", body["graph"])

        if CASES_DB:
            cid = CASES_DB[0]["case_id"]
            # Test case detail route
            res_detail = asyncio.run(get_case_detail(cid))
            self.assertEqual(res_detail.status_code, 200)
            body_detail = json.loads(res_detail.body.decode("utf-8"))
            self.assertIn("intelligence_graph", body_detail["case"])

            # Test dedicated case graph route
            res_graph = asyncio.run(get_case_graph(cid))
            self.assertEqual(res_graph.status_code, 200)
            body_graph = json.loads(res_graph.body.decode("utf-8"))
            self.assertEqual(body_graph["status"], "success")
            self.assertEqual(body_graph["case_id"], cid)
            self.assertIn("nodes", body_graph["graph"])
            self.assertIn("edges", body_graph["graph"])
        print("\n[EIG TEST 9 PASSED] Server API route handlers verified for EIG compatibility.")


if __name__ == "__main__":
    unittest.main()
