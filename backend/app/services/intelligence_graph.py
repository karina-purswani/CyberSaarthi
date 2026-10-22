import uuid
import sqlite3
from typing import Dict, Any, List, Optional
from app.db.database import get_connection

DISCLAIMER_TEXT = (
    "Shared indicator detected. This relationship is an investigative lead "
    "and does not establish common ownership, identity, or criminal responsibility."
)

def register_indicator_and_link(
    conn: sqlite3.Connection,
    complaint_id: str,
    evidence_id: Optional[str],
    indicator_type: str,
    raw_val: str,
    norm_val: str,
    rule_applied: str,
    explanation: str
):
    """
    Registers an indicator into graph_indicators and connects it to the complaint.
    """
    # Check if indicator already exists
    row = conn.execute(
        "SELECT id FROM graph_indicators WHERE normalized_value = ?",
        (norm_val,)
    ).fetchone()
    
    if row:
        indicator_id = row["id"]
    else:
        indicator_id = f"ind_{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO graph_indicators (id, indicator_type, raw_value, normalized_value, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            """,
            (indicator_id, indicator_type, raw_val, norm_val)
        )
    
    # Check if link already exists
    link_exists = conn.execute(
        """
        SELECT id FROM graph_relationships 
        WHERE complaint_id = ? AND indicator_id = ?
        """,
        (complaint_id, indicator_id)
    ).fetchone()
    
    if not link_exists:
        rel_id = f"rel_{uuid.uuid4().hex[:12]}"
        conn.execute(
            """
            INSERT INTO graph_relationships (id, complaint_id, indicator_id, evidence_id, rule_applied, explanation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (rel_id, complaint_id, indicator_id, evidence_id, rule_applied, explanation)
        )

def update_complaint_indicators(conn: sqlite3.Connection, complaint_id: str):
    """
    Scans a complaint's citizen inputs and its associated extracted fields to register all valid indicators.
    """
    # 1. Fetch complaint data
    complaint = conn.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,)).fetchone()
    if not complaint:
        return

    # Check reported UPI
    if complaint["reported_upi_id"]:
        from app.services.field_normalization import normalize_upi_id
        norm_upi = normalize_upi_id(complaint["reported_upi_id"])
        if norm_upi:
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=None,
                indicator_type="UPI_ID",
                raw_val=complaint["reported_upi_id"],
                norm_val=norm_upi,
                rule_applied="CITIZEN_REPORTED_UPI_MATCH",
                explanation=f"Reported suspect UPI handle: {norm_upi}"
            )

    # Check reported Phone
    if complaint["victim_phone"]:
        from app.services.field_normalization import normalize_phone
        norm_phone = normalize_phone(complaint["victim_phone"])
        if norm_phone:
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=None,
                indicator_type="PHONE_NUMBER",
                raw_val=complaint["victim_phone"],
                norm_val=norm_phone,
                rule_applied="CITIZEN_REPORTED_CONTACT",
                explanation=f"Reported contact number: {norm_phone}"
            )

    # Check reported Txn ID
    if complaint["reported_txn_id"]:
        from app.services.field_normalization import normalize_txn_id
        norm_txn = normalize_txn_id(complaint["reported_txn_id"])
        if norm_txn:
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=None,
                indicator_type="TRANSACTION_ID",
                raw_val=complaint["reported_txn_id"],
                norm_val=norm_txn,
                rule_applied="CITIZEN_REPORTED_TXN_REF",
                explanation=f"Reported transaction/UTR reference: {norm_txn}"
            )

    # 2. Check extracted fields from evidence files
    fields = conn.execute(
        "SELECT * FROM extracted_fields WHERE complaint_id = ?",
        (complaint_id,)
    ).fetchall()
    
    for f in fields:
        fname = f["field_name"]
        raw_v = f["raw_value"]
        norm_v = f["normalized_value"]
        ev_id = f["evidence_id"]
        
        if not norm_v:
            continue

        if fname == "upi_id":
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=ev_id,
                indicator_type="UPI_ID",
                raw_val=raw_v,
                norm_val=norm_v,
                rule_applied="OCR_EXTRACTED_UPI_VPA",
                explanation=f"Extracted beneficiary UPI handle '{norm_v}' from evidence"
            )
        elif fname == "txn_id":
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=ev_id,
                indicator_type="TRANSACTION_ID",
                raw_val=raw_v,
                norm_val=norm_v,
                rule_applied="OCR_EXTRACTED_UTR",
                explanation=f"Extracted UTR/Transaction reference '{norm_v}' from evidence"
            )
        elif fname == "phone":
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=ev_id,
                indicator_type="PHONE_NUMBER",
                raw_val=raw_v,
                norm_val=norm_v,
                rule_applied="OCR_EXTRACTED_PHONE",
                explanation=f"Extracted contact phone '{norm_v}' from evidence"
            )
        elif fname in ("bank_account", "account_no", "account_number"):
            register_indicator_and_link(
                conn=conn,
                complaint_id=complaint_id,
                evidence_id=ev_id,
                indicator_type="BANK_ACCOUNT",
                raw_val=raw_v,
                norm_val=norm_v,
                rule_applied="OCR_EXTRACTED_BANK_ACCOUNT",
                explanation=f"Extracted bank account number '{norm_v}' from evidence"
            )

    # 3. Check audit logs for real IP address association
    audit_ip = conn.execute(
        "SELECT ip_address FROM audit_logs WHERE resource_id = ? AND ip_address IS NOT NULL LIMIT 1",
        (complaint_id,)
    ).fetchone()
    if audit_ip and audit_ip["ip_address"] and audit_ip["ip_address"] not in ("127.0.0.1", "localhost", "::1"):
        ip_val = audit_ip["ip_address"].strip()
        register_indicator_and_link(
            conn=conn,
            complaint_id=complaint_id,
            evidence_id=None,
            indicator_type="IP_ADDRESS",
            raw_val=ip_val,
            norm_val=ip_val,
            rule_applied="AUDIT_CLIENT_IP_MATCH",
            explanation=f"Observed client submission IP address: {ip_val}"
        )

def get_intelligence_graph_data(
    focus_complaint_id: Optional[str] = None,
    indicator_type: Optional[str] = None,
    category: Optional[str] = None,
    relationship_type: Optional[str] = None,
    search: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns graph representation formatted for interactive visualization:
    - nodes: complaints, indicators, evidence items, and people
    - edges: relationships with explicit classification (DIRECT_OBSERVED vs INVESTIGATIVE_LEAD vs EVIDENCE_LINK)
    - clusters: indicators linking multiple distinct complaints
    - available_categories & available_relationship_types for client filtering
    - lead_disclaimer: statutory non-accusatory investigative notice
    """
    conn = get_connection()
    try:
        # Determine which complaints to include
        if focus_complaint_id:
            rel_indicators = conn.execute(
                "SELECT indicator_id FROM graph_relationships WHERE complaint_id = ?",
                (focus_complaint_id,)
            ).fetchall()
            ind_ids = [r["indicator_id"] for r in rel_indicators]
            
            if ind_ids:
                placeholders = ",".join("?" for _ in ind_ids)
                complaint_rows = conn.execute(
                    f"""
                    SELECT DISTINCT c.* FROM complaints c
                    JOIN graph_relationships gr ON c.id = gr.complaint_id
                    WHERE gr.indicator_id IN ({placeholders}) OR c.id = ?
                    """,
                    (*ind_ids, focus_complaint_id)
                ).fetchall()
            else:
                complaint_rows = conn.execute(
                    "SELECT * FROM complaints WHERE id = ?",
                    (focus_complaint_id,)
                ).fetchall()
        else:
            complaint_rows = conn.execute(
                "SELECT * FROM complaints ORDER BY submission_time DESC LIMIT 60"
            ).fetchall()

        complaint_ids = [c["id"] for c in complaint_rows]
        if not complaint_ids:
            return {
                "nodes": [],
                "edges": [],
                "clusters": [],
                "available_categories": [],
                "available_relationship_types": [],
                "lead_disclaimer": DISCLAIMER_TEXT
            }

        c_placeholders = ",".join("?" for _ in complaint_ids)
        
        # 1. Query indicator relationships
        query = f"""
            SELECT gr.*, gi.indicator_type, gi.raw_value as ind_raw, gi.normalized_value as ind_norm,
                   c.reference_id, ef.original_filename as evidence_filename
            FROM graph_relationships gr
            JOIN graph_indicators gi ON gr.indicator_id = gi.id
            JOIN complaints c ON gr.complaint_id = c.id
            LEFT JOIN evidence_files ef ON gr.evidence_id = ef.id
            WHERE gr.complaint_id IN ({c_placeholders})
        """
        params = list(complaint_ids)
        if indicator_type:
            query += " AND gi.indicator_type = ?"
            params.append(indicator_type)
            
        rels = conn.execute(query, params).fetchall()

        # Build indicator-to-complaint connectivity map
        ind_complaint_map: Dict[str, List[str]] = {}
        for r in rels:
            ind_complaint_map.setdefault(r["indicator_id"], []).append(r["reference_id"])

        # 2. Query evidence files for included complaints
        evidence_rows = conn.execute(
            f"""
            SELECT id, complaint_id, original_filename, file_type, file_size_bytes, ocr_status
            FROM evidence_files
            WHERE complaint_id IN ({c_placeholders})
            """,
            params
        ).fetchall()

        # 3. Query user / complainant information
        user_rows = conn.execute(
            f"""
            SELECT DISTINCT u.id, u.full_name, u.email, u.phone, c.id as complaint_id
            FROM users u
            JOIN complaints c ON c.user_id = u.id
            WHERE c.id IN ({c_placeholders})
            """,
            params
        ).fetchall()

        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        node_ids = set()
        categories_present = set(["COMPLAINT"])
        relationship_types_present = set()

        # Add complaint nodes
        for c in complaint_rows:
            nodes.append({
                "id": c["id"],
                "type": "COMPLAINT",
                "category": "COMPLAINT",
                "label": f"{c['reference_id']}",
                "reference_id": c["reference_id"],
                "incident_type": c["incident_type"],
                "amount": c["reported_amount"],
                "status": c["status"],
                "priority": c["priority"],
                "submission_time": c["submission_time"],
                "description": c["description"][:120] if c["description"] else None
            })
            node_ids.add(c["id"])

        # Add evidence item nodes & edges
        for ev in evidence_rows:
            ev_node_id = f"node_ev_{ev['id']}"
            if ev_node_id not in node_ids:
                nodes.append({
                    "id": ev_node_id,
                    "type": "EVIDENCE",
                    "category": "EVIDENCE",
                    "label": ev["original_filename"],
                    "file_type": ev["file_type"],
                    "file_size": ev["file_size_bytes"],
                    "ocr_status": ev["ocr_status"],
                    "complaint_id": ev["complaint_id"]
                })
                node_ids.add(ev_node_id)
                categories_present.add("EVIDENCE")

            edges.append({
                "id": f"edge_ev_{ev['id']}",
                "source": ev["complaint_id"],
                "target": ev_node_id,
                "relation": "ATTACHED_EVIDENCE",
                "relationship_type": "EVIDENCE_LINK",
                "rule_applied": "PHYSICAL_DIGITAL_EVIDENCE_ATTACHMENT",
                "explanation": f"Submitted evidence document '{ev['original_filename']}'"
            })
            relationship_types_present.add("EVIDENCE_LINK")

        # Add person / citizen complainant nodes & edges
        for u in user_rows:
            u_node_id = f"node_usr_{u['id']}"
            if u_node_id not in node_ids:
                nodes.append({
                    "id": u_node_id,
                    "type": "PERSON",
                    "category": "PERSON",
                    "label": u["full_name"],
                    "email": u["email"],
                    "phone": u["phone"]
                })
                node_ids.add(u_node_id)
                categories_present.add("PERSON")

            edges.append({
                "id": f"edge_usr_{u['id']}_{u['complaint_id']}",
                "source": u["complaint_id"],
                "target": u_node_id,
                "relation": "REPORTED_BY",
                "relationship_type": "DIRECT_OBSERVED",
                "rule_applied": "CITIZEN_COMPLAINT_FILING",
                "explanation": f"Complainant narrative authored by {u['full_name']}"
            })
            relationship_types_present.add("DIRECT_OBSERVED")

        # Add indicator nodes & edges
        for r in rels:
            ind_id = r["indicator_id"]
            ind_type = r["indicator_type"]
            connected_refs = ind_complaint_map.get(ind_id, [])

            if ind_id not in node_ids:
                nodes.append({
                    "id": ind_id,
                    "type": "INDICATOR",
                    "category": ind_type,
                    "indicator_type": ind_type,
                    "label": r["ind_norm"],
                    "raw_value": r["ind_raw"],
                    "normalized_value": r["ind_norm"],
                    "is_shared": len(connected_refs) > 1,
                    "connected_case_count": len(connected_refs)
                })
                node_ids.add(ind_id)
                categories_present.add(ind_type)

            # Classify relationship: investigative lead (shared) vs direct observed (single case)
            is_shared = len(connected_refs) > 1
            rel_type = "INVESTIGATIVE_LEAD" if is_shared else "DIRECT_OBSERVED"
            relationship_types_present.add(rel_type)

            edges.append({
                "id": r["id"],
                "source": r["complaint_id"],
                "target": ind_id,
                "relation": "SHARED_INDICATOR" if is_shared else "CONTAINS_INDICATOR",
                "relationship_type": rel_type,
                "rule_applied": r["rule_applied"],
                "explanation": r["explanation"] + (f" (Shared across {len(connected_refs)} cases)" if is_shared else ""),
                "evidence_id": r["evidence_id"],
                "evidence_filename": r["evidence_filename"]
            })

        # Calculate clusters of multi-victim shared indicators
        clusters = []
        for ind_id, comps in ind_complaint_map.items():
            if len(comps) > 1:
                clusters.append({
                    "indicator_id": ind_id,
                    "connected_complaints": comps,
                    "count": len(comps)
                })

        # Apply in-memory filters if specified
        filtered_nodes = nodes
        if category:
            cat_clean = category.strip().upper()
            filtered_nodes = [n for n in filtered_nodes if n.get("category") == cat_clean or n.get("type") == cat_clean]
        
        if search:
            s = search.strip().lower()
            filtered_nodes = [
                n for n in filtered_nodes
                if s in str(n.get("label", "")).lower()
                or s in str(n.get("reference_id", "")).lower()
                or s in str(n.get("normalized_value", "")).lower()
            ]

        # Filter edges to only those connecting remaining nodes
        remaining_node_ids = set(n["id"] for n in filtered_nodes)
        filtered_edges = [
            e for e in edges
            if e["source"] in remaining_node_ids and e["target"] in remaining_node_ids
        ]

        if relationship_type:
            rt_clean = relationship_type.strip().upper()
            filtered_edges = [e for e in filtered_edges if e.get("relationship_type") == rt_clean]

        return {
            "nodes": filtered_nodes,
            "edges": filtered_edges,
            "clusters": clusters,
            "available_categories": sorted(list(categories_present)),
            "available_relationship_types": sorted(list(relationship_types_present)),
            "total_nodes": len(filtered_nodes),
            "total_edges": len(filtered_edges),
            "lead_disclaimer": DISCLAIMER_TEXT
        }
    finally:
        conn.close()
