import uuid
import sqlite3
from typing import Dict, Any, List, Optional
from app.db.database import get_connection

DISCLAIMER_TEXT = (
    "Shared indicator detected. This relationship is an investigative lead "
    "and does not establish common ownership or criminal responsibility."
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

def get_intelligence_graph_data(
    focus_complaint_id: Optional[str] = None,
    indicator_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns graph representation formatted for interactive visualization:
    - nodes: complaints & indicators
    - edges: relationship connections
    - lead_disclaimer: non-accustory investigative notice
    """
    conn = get_connection()
    try:
        # Determine which complaints to include
        if focus_complaint_id:
            # Get the focus complaint and any complaints sharing its indicators
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
                "SELECT * FROM complaints ORDER BY submission_time DESC LIMIT 50"
            ).fetchall()

        complaint_ids = [c["id"] for c in complaint_rows]
        if not complaint_ids:
            return {
                "nodes": [],
                "edges": [],
                "clusters": [],
                "lead_disclaimer": DISCLAIMER_TEXT
            }

        c_placeholders = ",".join("?" for _ in complaint_ids)
        
        # Query relationships
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

        # Build nodes and edges
        nodes = []
        edges = []
        node_ids = set()

        # Add complaint nodes
        for c in complaint_rows:
            nodes.append({
                "id": c["id"],
                "type": "COMPLAINT",
                "label": f"{c['reference_id']}",
                "reference_id": c["reference_id"],
                "incident_type": c["incident_type"],
                "amount": c["reported_amount"],
                "status": c["status"],
                "priority": c["priority"],
                "submission_time": c["submission_time"]
            })
            node_ids.add(c["id"])

        # Add indicator nodes and edges
        indicator_complaint_map: Dict[str, List[str]] = {}
        for r in rels:
            ind_id = r["indicator_id"]
            if ind_id not in node_ids:
                nodes.append({
                    "id": ind_id,
                    "type": "INDICATOR",
                    "indicator_type": r["indicator_type"],
                    "label": r["ind_norm"],
                    "raw_value": r["ind_raw"],
                    "normalized_value": r["ind_norm"]
                })
                node_ids.add(ind_id)

            edges.append({
                "id": r["id"],
                "source": r["complaint_id"],
                "target": ind_id,
                "relation": "CONTAINS_INDICATOR",
                "rule_applied": r["rule_applied"],
                "explanation": r["explanation"],
                "evidence_id": r["evidence_id"],
                "evidence_filename": r["evidence_filename"]
            })

            indicator_complaint_map.setdefault(ind_id, []).append(r["reference_id"])

        # Count shared clusters (indicators connected to >= 2 complaints)
        clusters = []
        for ind_id, comps in indicator_complaint_map.items():
            if len(comps) > 1:
                clusters.append({
                    "indicator_id": ind_id,
                    "connected_complaints": comps,
                    "count": len(comps)
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "clusters": clusters,
            "lead_disclaimer": DISCLAIMER_TEXT
        }
    finally:
        conn.close()
