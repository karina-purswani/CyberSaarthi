"""
CyberSaarthi - Evidence-to-Intelligence Graph (EIG)
Phase 2 Implementation: Modular Multi-Modal Forensic Knowledge Graph

Models explicit forensic entities, multi-source provenance, directly observed facts,
and analytical cross-case linkages without automated legal judgment or guilt inference.

Core Principles:
1. Provenance: Every node and edge is traceable to its source artifact, confidence, and excerpt.
2. Fact vs Inference: Directly observed facts are strictly distinguished from analytical inferences.
3. No Silent Merging: Conflicting or ambiguous identifiers are preserved as separate nodes with explicit discrepancy edges.
4. Non-Accusatory: Objective entity roles (e.g. 'DESTINATION_UPI_REPORTED', 'CALLER_SUSPECT_REPORTED').
5. Fully Deterministic: Pure Python graph builder compatible with Vis.js/Cytoscape.js.
"""

import re
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime


GRAPH_DISCLAIMER = (
    "This graph models evidence co-occurrence and cross-case linkages from complainant reports. "
    "Linkages represent reported associations and forensic indicators for human investigator analysis, "
    "not legal proof of guilt, ownership, or criminal conspiracy."
)


# ---------------------------------------------------------------------------
# ENTITY EXTRACTION HELPERS (URLs, APKs, Telegram Handles)
# ---------------------------------------------------------------------------
def extract_cyber_indicators(text: str) -> Dict[str, List[str]]:
    """Extract URLs, Telegram channels/links, and APK references from text."""
    cleaned = (text or "").strip()
    if not cleaned:
        return {"urls": [], "telegram_handles": [], "apk_names": []}

    # 1. URLs
    url_pattern = r"\b(?:https?://|www\.)[a-zA-Z0-9.\-_]+(?:\.[a-zA-Z]{2,})(?:/[a-zA-Z0-9.\-_#?&%=~+]*)?"
    raw_urls = re.findall(url_pattern, cleaned, re.IGNORECASE)
    # Exclude common search/email engines and strip trailing punctuation
    clean_urls = []
    for u in raw_urls:
        u_clean = u.rstrip(".,;!?:')\"").strip()
        u_lower = u_clean.lower()
        if not any(ign in u_lower for ign in ["google.com", "bing.com", "yahoo.com", "gmail.com"]):
            if u_clean:
                clean_urls.append(u_clean)

    # 2. Telegram Handles / Groups
    tg_pattern = r"\b(?:t\.me|telegram\.me)/([a-zA-Z0-9_]{4,})\b"
    raw_tg = re.findall(tg_pattern, cleaned, re.IGNORECASE)

    # 3. APK Names
    apk_pattern = r"\b([a-zA-Z0-9.\-_]+\.apk)\b"
    raw_apks = re.findall(apk_pattern, cleaned, re.IGNORECASE)

    return {
        "urls": sorted(list(set(clean_urls))),
        "telegram_handles": sorted(list(set(raw_tg))),
        "apk_names": sorted(list(set(raw_apks)))
    }


# ---------------------------------------------------------------------------
# SINGLE-CASE EGO-NETWORK BUILDER
# ---------------------------------------------------------------------------
def build_case_subgraph(case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Constructs an Evidence-to-Intelligence Graph for an individual case.
    Models directly observed facts and internal cross-evidence relationships.
    """
    cid = case.get("case_id", "CS-UNKNOWN")
    victim_name = case.get("victim_name", "Anonymous Citizen")
    victim_phone = case.get("victim_phone", "")
    fraud_cat = case.get("fraud_category", "Suspected Cyber Financial Fraud")
    case_ts = case.get("timestamp", datetime.now().isoformat())
    city = case.get("victim_city", "Unknown Jurisdiction")

    nodes: Dict[str, Dict[str, Any]] = {}
    edges: Dict[str, Dict[str, Any]] = {}

    def add_node(
        node_id: str,
        label: str,
        entity_type: str,
        role: str,
        provenance: Dict[str, Any],
        is_inferred: bool = False,
        properties: Optional[Dict[str, Any]] = None
    ):
        if node_id not in nodes:
            nodes[node_id] = {
                "id": node_id,
                "label": label,
                "entity_type": entity_type,
                "role": role,
                "is_inferred": is_inferred,
                "provenance": provenance,
                "properties": properties or {},
                "degree": 0
            }

    def add_edge(
        edge_id: str,
        source: str,
        target: str,
        relationship_type: str,
        details: str,
        provenance: Dict[str, Any],
        is_inferred: bool = False,
        confidence: float = 1.0
    ):
        if edge_id not in edges:
            edges[edge_id] = {
                "id": edge_id,
                "source": source,
                "target": target,
                "relationship_type": relationship_type,
                "details": details,
                "is_inferred": is_inferred,
                "confidence": round(confidence, 3),
                "provenance": provenance
            }
            if source in nodes:
                nodes[source]["degree"] += 1
            if target in nodes:
                nodes[target]["degree"] += 1

    # 1. Root Case Node
    case_node_id = f"case:{cid}"
    add_node(
        node_id=case_node_id,
        label=cid,
        entity_type="CASE",
        role="INCIDENT_RECORD",
        provenance={
            "source_artifact": "case_record",
            "case_id": cid,
            "timestamp": case_ts,
            "is_inferred": False
        },
        properties={
            "city": city,
            "threat_level": case.get("threat_level", "UNKNOWN"),
            "disputed_amount_str": case.get("disputed_amount_str", "Not Specified")
        }
    )

    # 2. Complainant / Victim Node
    victim_node_id = f"victim:{cid}:{re.sub(r'[^a-zA-Z0-9]', '_', victim_name.lower())}"
    add_node(
        node_id=victim_node_id,
        label=victim_name,
        entity_type="VICTIM",
        role="COMPLAINANT",
        provenance={
            "source_artifact": "user_metadata",
            "case_id": cid,
            "timestamp": case_ts,
            "is_inferred": False
        },
        properties={"registered_city": city}
    )
    add_edge(
        edge_id=f"{case_node_id}->{victim_node_id}:REPORTED_BY",
        source=case_node_id,
        target=victim_node_id,
        relationship_type="REPORTED_BY",
        details=f"Incident {cid} lodged by complainant {victim_name}.",
        provenance={"source_artifact": "user_metadata", "case_id": cid, "timestamp": case_ts, "is_inferred": False}
    )

    # 3. Complainant Contact Phone
    if victim_phone and victim_phone != "Not Provided":
        vphone_id = f"phone:{victim_phone}"
        add_node(
            node_id=vphone_id,
            label=victim_phone,
            entity_type="PHONE",
            role="COMPLAINANT_CONTACT",
            provenance={
                "source_artifact": "user_metadata",
                "case_id": cid,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        add_edge(
            edge_id=f"{victim_node_id}->{vphone_id}:HAS_REGISTERED_PHONE",
            source=victim_node_id,
            target=vphone_id,
            relationship_type="HAS_REGISTERED_PHONE",
            details="Registered contact number provided by complainant.",
            provenance={"source_artifact": "user_metadata", "case_id": cid, "timestamp": case_ts, "is_inferred": False}
        )

    # 4. Fraud Category Typology Node
    if fraud_cat:
        cat_id = f"fraud_type:{re.sub(r'[^a-zA-Z0-9]', '_', fraud_cat.lower())}"
        add_node(
            node_id=cat_id,
            label=fraud_cat,
            entity_type="FRAUD_TYPE",
            role="FRAUD_TYPOLOGY",
            provenance={
                "source_artifact": "forensic_classifier",
                "case_id": cid,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        add_edge(
            edge_id=f"{case_node_id}->{cat_id}:TYPIFIED_AS",
            source=case_node_id,
            target=cat_id,
            relationship_type="TYPIFIED_AS",
            details=f"Case classified under '{fraud_cat}' pattern.",
            provenance={"source_artifact": "forensic_classifier", "case_id": cid, "timestamp": case_ts, "is_inferred": False}
        )

    # 5. Extract multi-modal indicators and attach with explicit provenance
    transcript = case.get("transcript", "")
    ocr_text = case.get("ocr_text", "")
    raw_text = case.get("raw_text", "")

    # Retrieve source-level verification details if available
    vr = case.get("verification_report", {})
    sources_summary = vr.get("sources_summary", {})

    # Helper to deduce which artifact mentioned an entity
    def find_entity_source(value_str: str) -> Tuple[str, str, float]:
        v_lower = value_str.lower()
        if ocr_text and v_lower in ocr_text.lower():
            return "ocr", "Observed in uploaded receipt OCR text.", 0.85
        if transcript and v_lower in transcript.lower():
            return "voice", "Observed in spoken voice statement.", 0.80
        if raw_text and v_lower in raw_text.lower():
            return "user_text", "Observed in typed complaint notes.", 0.90
        return "case_record", "Extracted from case dossier.", 0.75

    # 5a. Mule / Beneficiary UPI Handles
    for upi in case.get("upi_ids", []):
        src_art, excerpt, conf = find_entity_source(upi)
        upi_id = f"upi:{upi.lower()}"
        add_node(
            node_id=upi_id,
            label=upi,
            entity_type="UPI",
            role="DESTINATION_UPI_REPORTED",
            provenance={
                "source_artifact": src_art,
                "case_id": cid,
                "evidence_excerpt": excerpt,
                "confidence": conf,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        add_edge(
            edge_id=f"{case_node_id}->{upi_id}:TRANSFERRED_TO_UPI",
            source=case_node_id,
            target=upi_id,
            relationship_type="TRANSFERRED_TO_UPI",
            details=f"Complainant reported transferring disputed funds to UPI '{upi}'.",
            provenance={
                "source_artifact": src_art,
                "case_id": cid,
                "evidence_excerpt": excerpt,
                "confidence": conf,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )

    # 5b. Bank UTR / Transaction References
    for utr in case.get("utr_numbers", []):
        src_art, excerpt, conf = find_entity_source(utr)
        utr_id = f"utr:{utr}"
        add_node(
            node_id=utr_id,
            label=utr,
            entity_type="UTR",
            role="BANK_TRANSACTION_REF",
            provenance={
                "source_artifact": src_art,
                "case_id": cid,
                "evidence_excerpt": excerpt,
                "confidence": conf,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        add_edge(
            edge_id=f"{case_node_id}->{utr_id}:TRANSACTION_REFERENCE",
            source=case_node_id,
            target=utr_id,
            relationship_type="TRANSACTION_REFERENCE",
            details=f"Banking UTR reference '{utr}' cited in evidence.",
            provenance={
                "source_artifact": src_art,
                "case_id": cid,
                "evidence_excerpt": excerpt,
                "confidence": conf,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        # Link UTR directly to UPI if both exist in the case
        for upi in case.get("upi_ids", []):
            upi_node_id = f"upi:{upi.lower()}"
            if upi_node_id in nodes:
                add_edge(
                    edge_id=f"{utr_id}->{upi_node_id}:ASSOCIATED_WITH_UPI",
                    source=utr_id,
                    target=upi_node_id,
                    relationship_type="ASSOCIATED_WITH_UPI",
                    details=f"UTR {utr} associated with recipient UPI '{upi}' in incident {cid}.",
                    provenance={"source_artifact": src_art, "case_id": cid, "timestamp": case_ts, "is_inferred": True},
                    is_inferred=True
                )

    # 5c. Suspect Caller Phones
    for phone in case.get("scammer_phones", []):
        src_art, excerpt, conf = find_entity_source(phone)
        phone_id = f"phone:{phone}"
        add_node(
            node_id=phone_id,
            label=phone,
            entity_type="PHONE",
            role="CALLER_SUSPECT_REPORTED",
            provenance={
                "source_artifact": src_art,
                "case_id": cid,
                "evidence_excerpt": excerpt,
                "confidence": conf,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        add_edge(
            edge_id=f"{case_node_id}->{phone_id}:SUSPECT_CALLER_REPORTED",
            source=case_node_id,
            target=phone_id,
            relationship_type="SUSPECT_CALLER_REPORTED",
            details=f"Complainant reported receiving calls/messages from suspect number {phone}.",
            provenance={
                "source_artifact": src_art,
                "case_id": cid,
                "evidence_excerpt": excerpt,
                "confidence": conf,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )

    # 5d. Cyber URLs / Phishing Links
    cyber_indicators = extract_cyber_indicators(raw_text or f"{transcript} {ocr_text}")
    for url in cyber_indicators["urls"]:
        url_id = f"url:{re.sub(r'[^a-zA-Z0-9]', '_', url.lower())[:32]}"
        add_node(
            node_id=url_id,
            label=url,
            entity_type="URL",
            role="SUSPICIOUS_LINK_REPORTED",
            provenance={
                "source_artifact": "evidence_text",
                "case_id": cid,
                "evidence_excerpt": url,
                "confidence": 0.85,
                "timestamp": case_ts,
                "is_inferred": False
            }
        )
        add_edge(
            edge_id=f"{case_node_id}->{url_id}:SUSPECT_URL_REPORTED",
            source=case_node_id,
            target=url_id,
            relationship_type="SUSPECT_URL_REPORTED",
            details=f"URL '{url}' provided as evidence artifact.",
            provenance={"source_artifact": "evidence_text", "case_id": cid, "timestamp": case_ts, "is_inferred": False}
        )

    for tg in cyber_indicators["telegram_handles"]:
        tg_id = f"telegram:@{tg.lower()}"
        add_node(
            node_id=tg_id,
            label=f"@{tg}",
            entity_type="URL",
            role="TELEGRAM_CHANNEL_REPORTED",
            provenance={"source_artifact": "evidence_text", "case_id": cid, "timestamp": case_ts, "is_inferred": False}
        )
        add_edge(
            edge_id=f"{case_node_id}->{tg_id}:TELEGRAM_CHANNEL_REPORTED",
            source=case_node_id,
            target=tg_id,
            relationship_type="TELEGRAM_CHANNEL_REPORTED",
            details=f"Telegram handle '@{tg}' reported as communication vector.",
            provenance={"source_artifact": "evidence_text", "case_id": cid, "timestamp": case_ts, "is_inferred": False}
        )

    # 6. Discrepancy & Ambiguous Edges (No Silent Merging)
    for disc in vr.get("discrepancies", []):
        if disc.get("field") == "utr_number":
            sources_inv = disc.get("sources_involved", {})
            utr_vals = list(sources_inv.values())
            if len(utr_vals) >= 2:
                u1_id = f"utr:{utr_vals[0]}"
                u2_id = f"utr:{utr_vals[1]}"
                if u1_id in nodes and u2_id in nodes:
                    add_edge(
                        edge_id=f"{u1_id}<->{u2_id}:CONTRADICTORY_UTR_CLAIM",
                        source=u1_id,
                        target=u2_id,
                        relationship_type="POTENTIAL_DISCREPANCY",
                        details=disc.get("details", "Conflicting UTR references cited for same incident."),
                        provenance={"source_artifact": "ceve_discrepancy_detector", "case_id": cid, "timestamp": case_ts, "is_inferred": True},
                        is_inferred=True,
                        confidence=0.90
                    )

    for amb in vr.get("ambiguous_findings", []):
        if amb.get("field") == "utr_number":
            sources_inv = amb.get("sources_involved", {})
            all_amb_utrs = []
            for u_list in sources_inv.values():
                if isinstance(u_list, list):
                    all_amb_utrs.extend(u_list)
            if len(all_amb_utrs) >= 2:
                u1_id = f"utr:{all_amb_utrs[0]}"
                u2_id = f"utr:{all_amb_utrs[1]}"
                if u1_id in nodes and u2_id in nodes:
                    add_edge(
                        edge_id=f"{u1_id}<->{u2_id}:AMBIGUOUS_MULTI_TXN_REFS",
                        source=u1_id,
                        target=u2_id,
                        relationship_type="AMBIGUOUS_MATCH_RELATION",
                        details=amb.get("details", "Distinct transaction references in multi-transaction context."),
                        provenance={"source_artifact": "ceve_ambiguity_detector", "case_id": cid, "timestamp": case_ts, "is_inferred": True},
                        is_inferred=True,
                        confidence=0.60
                    )

    return {
        "status": "success",
        "case_id": cid,
        "metric_name": "Evidence-to-Intelligence Graph",
        "disclaimer": GRAPH_DISCLAIMER,
        "nodes": list(nodes.values()),
        "edges": list(edges.values()),
        "metrics": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "direct_fact_edges": len([e for e in edges.values() if not e["is_inferred"]]),
            "inferred_edges": len([e for e in edges.values() if e["is_inferred"]])
        }
    }


# ---------------------------------------------------------------------------
# MULTI-CASE SYNDICATE NETWORK BUILDER
# ---------------------------------------------------------------------------
def build_multi_case_intelligence_graph(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Synthesizes the global Evidence-to-Intelligence Graph across all logged cases.
    Identifies shared infrastructure (Mule rings, shared phone numbers, repeating UTRs)
    and delineates syndicate clusters with explicit analytical provenance.
    """
    global_nodes: Dict[str, Dict[str, Any]] = {}
    global_edges: Dict[str, Dict[str, Any]] = {}

    # Map shared entities to case IDs: entity_id -> set(case_ids)
    entity_case_map: Dict[str, Set[str]] = {}
    entity_amount_map: Dict[str, float] = {}

    # 1. Process each case's subgraph into the global graph
    for c in cases:
        subgraph = build_case_subgraph(c)
        cid = c.get("case_id", "")
        c_amt = float(c.get("disputed_amount", 0.0) or 0.0)

        for node in subgraph["nodes"]:
            nid = node["id"]
            if nid not in global_nodes:
                global_nodes[nid] = node
                global_nodes[nid]["case_ids"] = [cid] if cid else []
            else:
                # Merge case_ids for repeating entities
                if cid and cid not in global_nodes[nid]["case_ids"]:
                    global_nodes[nid]["case_ids"].append(cid)

            # Track shared entities across distinct cases (exclude root case and victim nodes)
            if node["entity_type"] in ["UPI", "PHONE", "UTR", "URL"]:
                entity_case_map.setdefault(nid, set()).add(cid)
                entity_amount_map[nid] = entity_amount_map.get(nid, 0.0) + c_amt

        for edge in subgraph["edges"]:
            eid = edge["id"]
            if eid not in global_edges:
                global_edges[eid] = edge

    # 2. Derive Cross-Case Shared Infrastructure Inferences
    shared_entities_count = 0
    shared_entity_nodes: Set[str] = set()

    for nid, cids in entity_case_map.items():
        if len(cids) >= 2:
            shared_entities_count += 1
            shared_entity_nodes.add(nid)
            node_label = global_nodes[nid]["label"]
            node_type = global_nodes[nid]["entity_type"]

            # Add explicit cross-case shared identifier edges
            cid_list = sorted(list(cids))
            for i in range(len(cid_list)):
                for j in range(i + 1, len(cid_list)):
                    case_a_node = f"case:{cid_list[i]}"
                    case_b_node = f"case:{cid_list[j]}"
                    shared_edge_id = f"{case_a_node}<->{case_b_node}:SHARED_{node_type}_{nid}"

                    if case_a_node in global_nodes and case_b_node in global_nodes:
                        if shared_edge_id not in global_edges:
                            global_edges[shared_edge_id] = {
                                "id": shared_edge_id,
                                "source": case_a_node,
                                "target": case_b_node,
                                "relationship_type": "SHARED_IDENTIFIER_ACROSS_CASES",
                                "details": f"Independent incidents {cid_list[i]} and {cid_list[j]} both report identical {node_type} '{node_label}'.",
                                "is_inferred": True,
                                "confidence": 0.95,
                                "provenance": {
                                    "source_artifact": "cross_incident_inference",
                                    "entity_id": nid,
                                    "cases_linked": [cid_list[i], cid_list[j]],
                                    "timestamp": datetime.now().isoformat(),
                                    "is_inferred": True
                                }
                            }
                            global_nodes[case_a_node]["degree"] += 1
                            global_nodes[case_b_node]["degree"] += 1

    # 3. Detect Connected Syndicate Clusters
    # Group cases that share at least one identifier
    clusters: List[Dict[str, Any]] = []
    visited_cases: Set[str] = set()

    for nid in shared_entity_nodes:
        linked_cids = sorted(list(entity_case_map[nid]))
        cluster_cases = set(linked_cids)

        # Expand cluster with any cases sharing other entities linked to these cases
        expanded = True
        while expanded:
            expanded = False
            for other_nid, other_cids in entity_case_map.items():
                if len(other_cids) >= 2 and cluster_cases.intersection(other_cids):
                    new_cases = other_cids - cluster_cases
                    if new_cases:
                        cluster_cases.update(new_cases)
                        expanded = True

        cluster_cids_sorted = sorted(list(cluster_cases))
        cluster_key = "-".join(cluster_cids_sorted)
        if cluster_key not in visited_cases:
            visited_cases.add(cluster_key)

            # Gather all shared entities in this cluster
            cluster_shared_ents = [
                global_nodes[e]["label"] for e in shared_entity_nodes
                if entity_case_map[e].intersection(cluster_cases)
            ]

            # Sum loss volume across all cluster cases
            total_vol = sum(
                float(c.get("disputed_amount", 0.0) or 0.0)
                for c in cases if c.get("case_id") in cluster_cases
            )

            clusters.append({
                "cluster_id": f"SYNDICATE-{len(clusters) + 1:02d}",
                "name": f"Syndicate Cluster ({len(cluster_cases)} linked incidents)",
                "shared_identifiers": sorted(list(set(cluster_shared_ents))),
                "linked_cases": cluster_cids_sorted,
                "total_loss_volume": total_vol,
                "total_loss_volume_str": f"₹{int(total_vol):,}",
                "case_count": len(cluster_cases)
            })

    return {
        "status": "success",
        "metric_name": "Evidence-to-Intelligence Graph",
        "disclaimer": GRAPH_DISCLAIMER,
        "nodes": list(global_nodes.values()),
        "edges": list(global_edges.values()),
        "clusters": clusters,
        "metrics": {
            "total_nodes": len(global_nodes),
            "total_edges": len(global_edges),
            "direct_fact_edges": len([e for e in global_edges.values() if not e["is_inferred"]]),
            "inferred_edges": len([e for e in global_edges.values() if e["is_inferred"]]),
            "shared_entities_count": shared_entities_count,
            "syndicate_clusters_count": len(clusters)
        }
    }
