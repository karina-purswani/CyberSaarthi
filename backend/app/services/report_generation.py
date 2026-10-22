import io
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.db.database import get_connection
from app.services.verification_engine import map_result_to_display_status

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

DISCLAIMER = (
    "NOTICE: This document is an automated investigation-support summary produced by CyberSaarthi. "
    "It is designed solely to assist law enforcement officers, cyber cells, and authorized reviewers. "
    "It is NOT a First Information Report (FIR), court summons, or determination of guilt."
)

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas for dynamic total page count, running headers, and footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#176B65"))
        self.drawString(40, 808, "CYBERSAARTHI — CYBER-FRAUD EVIDENCE INTELLIGENCE PLATFORM")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(555, 808, "INVESTIGATION SUPPORT DOSSIER")

        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(40, 802, 555, 802)

        # Footer
        self.line(40, 42, 555, 42)
        self.setFont("Helvetica-Bold", 7)
        self.setFillColor(colors.HexColor("#991B1B"))
        self.drawString(40, 31, "CONFIDENTIAL // LAW ENFORCEMENT INVESTIGATION AID // NOT AN FIR")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(555, 31, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def generate_investigation_report(complaint_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT * FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        
        if not complaint:
            return None
            
        c_id = complaint["id"]
        
        # Evidence files
        evidence_rows = conn.execute(
            "SELECT * FROM evidence_files WHERE complaint_id = ? ORDER BY created_at ASC",
            (c_id,)
        ).fetchall()
        
        # Extracted fields
        extracted_rows = conn.execute(
            """
            SELECT ef.*, ev.original_filename as evidence_filename
            FROM extracted_fields ef
            LEFT JOIN evidence_files ev ON ef.evidence_id = ev.id
            WHERE ef.complaint_id = ?
            ORDER BY ef.field_name ASC
            """,
            (c_id,)
        ).fetchall()
        
        # Verification findings joined with evidence files for source attribution
        findings_rows = conn.execute(
            """
            SELECT vf.*, ev.original_filename as evidence_filename
            FROM verification_findings vf
            LEFT JOIN evidence_files ev ON vf.evidence_id = ev.id
            WHERE vf.complaint_id = ?
            ORDER BY vf.field_name ASC
            """,
            (c_id,)
        ).fetchall()
        
        # Reviewer notes
        notes_rows = conn.execute(
            "SELECT * FROM reviewer_notes WHERE complaint_id = ? ORDER BY created_at DESC",
            (c_id,)
        ).fetchall()
        
        # Shared leads / graph connections
        related_rows = conn.execute(
            """
            SELECT gi.indicator_type, gi.normalized_value, c2.reference_id as related_ref, c2.incident_type as related_type, gr1.rule_applied
            FROM graph_relationships gr1
            JOIN graph_relationships gr2 ON gr1.indicator_id = gr2.indicator_id AND gr1.complaint_id != gr2.complaint_id
            JOIN graph_indicators gi ON gr1.indicator_id = gi.id
            JOIN complaints c2 ON gr2.complaint_id = c2.id
            WHERE gr1.complaint_id = ?
            """,
            (c_id,)
        ).fetchall()

        report = {
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "platform": "CyberSaarthi Intelligence v1.0",
                "document_type": "INVESTIGATION_SUPPORT_DOSSIER",
                "disclaimer": DISCLAIMER
            },
            "complaint": {
                "id": complaint["id"],
                "reference_id": complaint["reference_id"],
                "submission_time": complaint["submission_time"],
                "language": complaint["language"],
                "incident_type": complaint["incident_type"],
                "description": complaint["description"],
                "reported_amount": complaint["reported_amount"],
                "reported_txn_id": complaint["reported_txn_id"],
                "reported_upi_id": complaint["reported_upi_id"],
                "victim_phone": complaint["victim_phone"],
                "victim_state": complaint["victim_state"],
                "status": complaint["status"],
                "priority": complaint["priority"],
                "is_demo": bool(complaint["is_demo"])
            },
            "evidence_inventory": [
                {
                    "id": ev["id"],
                    "original_filename": ev["original_filename"],
                    "file_type": ev["file_type"],
                    "file_size_bytes": ev["file_size_bytes"],
                    "ocr_status": ev["ocr_status"],
                    "ocr_confidence": ev["ocr_confidence"]
                }
                for ev in evidence_rows
            ],
            "extracted_entities": [
                {
                    "field_name": ef["field_name"],
                    "raw_value": ef["raw_value"],
                    "normalized_value": ef["normalized_value"],
                    "confidence": ef["confidence"],
                    "source_context": ef["source_context"],
                    "source_evidence": ef["evidence_filename"] or "Evidence Document",
                    "is_officer_corrected": bool(ef["is_officer_corrected"])
                }
                for ef in extracted_rows
            ],
            "verification_matrix": [
                {
                    "field_name": vf["field_name"],
                    "complaint_value": vf["complaint_value"],
                    "evidence_value": vf["evidence_value"],
                    "normalized_complaint_value": vf["normalized_complaint_value"],
                    "normalized_evidence_value": vf["normalized_evidence_value"],
                    "result": vf["result"],
                    "display_status": vf["display_status"] or map_result_to_display_status(vf["result"]),
                    "source_evidence": vf["evidence_filename"] or ("No Evidence Attached" if not vf["evidence_id"] else "Evidence Document"),
                    "reason": vf["reason"],
                    "review_recommendation": vf["review_recommendation"]
                }
                for vf in findings_rows
            ],
            "investigative_leads": [
                {
                    "indicator_type": r["indicator_type"],
                    "indicator_value": r["normalized_value"],
                    "linked_complaint": r["related_ref"],
                    "linked_incident_type": r["related_type"],
                    "rule_applied": r["rule_applied"]
                }
                for r in related_rows
            ],
            "reviewer_notes": [
                {
                    "reviewer_name": rn["reviewer_name"],
                    "note": rn["note"],
                    "status_at_review": rn["review_status"],
                    "timestamp": rn["created_at"]
                }
                for rn in notes_rows
            ]
        }
        return report
    finally:
        conn.close()


def generate_investigation_pdf(complaint_id: str) -> Optional[bytes]:
    """
    Generates a formal, server-rendered multi-page A4 PDF investigation dossier.
    Includes case metadata, verbatim narrative, evidence inventory, verification matrix,
    cross-case intelligence leads, and statutory disclaimer.
    """
    data = generate_investigation_report(complaint_id)
    if not data:
        return None

    c = data["complaint"]
    meta = data["meta"]
    evidence_inventory = data["evidence_inventory"]
    extracted_entities = data["extracted_entities"]
    verification_matrix = data["verification_matrix"]
    leads = data["investigative_leads"]
    notes = data["reviewer_notes"]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=52,
        bottomMargin=52
    )

    styles = getSampleStyleSheet()

    # Custom typography & styles
    c_teal = colors.HexColor("#176B65")
    c_dark = colors.HexColor("#0F172A")
    c_muted = colors.HexColor("#475569")
    c_border = colors.HexColor("#CBD5E1")
    c_bg_subtle = colors.HexColor("#F8FAFC")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=c_teal,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#DC2626"),
        spaceAfter=10
    )
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=c_teal,
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=c_dark
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#92400E")
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=c_dark
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title & Header
    story.append(Paragraph("CYBERSAARTHI INVESTIGATION DOSSIER", title_style))
    story.append(Paragraph("CONFIDENTIAL // LAW ENFORCEMENT & CYBER CELL INVESTIGATIVE AID", subtitle_style))

    # Disclaimer Box
    disclaimer_table = Table(
        [[Paragraph(f"<b>LEGAL NOTICE:</b> {DISCLAIMER}", disclaimer_style)]],
        colWidths=[515]
    )
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
        ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#F59E0B")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(disclaimer_table)
    story.append(Spacer(1, 8))

    # Metadata Grid Table
    formatted_amount = f"INR {c['reported_amount']:,.2f}" if c.get("reported_amount") is not None else "Not specified"
    meta_data = [
        [
            Paragraph("<b>Case Reference:</b>", body_style), Paragraph(str(c.get("reference_id")), body_bold),
            Paragraph("<b>Generated At:</b>", body_style), Paragraph(datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), body_style)
        ],
        [
            Paragraph("<b>Incident Category:</b>", body_style), Paragraph(str(c.get("incident_type")), body_style),
            Paragraph("<b>Submission Time:</b>", body_style), Paragraph(str(c.get("submission_time"))[:19].replace("T", " "), body_style)
        ],
        [
            Paragraph("<b>Review Status:</b>", body_style), Paragraph(str(c.get("status")), body_bold),
            Paragraph("<b>Priority Level:</b>", body_style), Paragraph(str(c.get("priority")), body_bold)
        ],
        [
            Paragraph("<b>Claimed Amount:</b>", body_style), Paragraph(formatted_amount, body_bold),
            Paragraph("<b>Complainant Phone:</b>", body_style), Paragraph(str(c.get("victim_phone") or "Omitted"), body_style)
        ],
        [
            Paragraph("<b>Reported UPI VPA:</b>", body_style), Paragraph(str(c.get("reported_upi_id") or "Omitted"), body_style),
            Paragraph("<b>Reported UTR/Txn:</b>", body_style), Paragraph(str(c.get("reported_txn_id") or "Omitted"), body_style)
        ],
        [
            Paragraph("<b>State / Region:</b>", body_style), Paragraph(str(c.get("victim_state") or "Unspecified"), body_style),
            Paragraph("<b>Intake Language:</b>", body_style), Paragraph(str(c.get("language", "en")).upper(), body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[105, 152, 105, 153])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_bg_subtle),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # Section 1: Verbatim Citizen Narrative
    story.append(Paragraph("1. Incident Narrative & Reported Statements", section_h1))
    narrative_p = Paragraph(c.get("description", "No narrative provided.").replace("\n", "<br/>"), body_style)
    narrative_table = Table([[narrative_p]], colWidths=[515])
    narrative_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(narrative_table)
    story.append(Spacer(1, 8))

    # Section 2: Evidence Inventory
    story.append(Paragraph("2. Physical / Digital Evidence Inventory", section_h1))
    if not evidence_inventory:
        story.append(Paragraph("<i>No evidence attachments submitted for this complaint.</i>", body_style))
    else:
        ev_header = [
            Paragraph("<b>Original Filename</b>", table_cell_bold),
            Paragraph("<b>Format / MIME</b>", table_cell_bold),
            Paragraph("<b>Size</b>", table_cell_bold),
            Paragraph("<b>OCR Status</b>", table_cell_bold),
            Paragraph("<b>Confidence</b>", table_cell_bold)
        ]
        ev_rows = [ev_header]
        for ev in evidence_inventory:
            size_kb = f"{ev['file_size_bytes'] / 1024:.1f} KB" if ev.get("file_size_bytes") else "—"
            conf = f"{ev['ocr_confidence'] * 100:.1f}%" if ev.get("ocr_confidence") else "N/A"
            ev_rows.append([
                Paragraph(str(ev.get("original_filename", "evidence")), table_cell),
                Paragraph(str(ev.get("file_type", "image")), table_cell),
                Paragraph(size_kb, table_cell),
                Paragraph(str(ev.get("ocr_status", "PENDING")), table_cell),
                Paragraph(conf, table_cell)
            ])
        ev_table = Table(ev_rows, colWidths=[180, 115, 65, 80, 75])
        ev_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(ev_table)
    story.append(Spacer(1, 8))

    # Section 3: Evidence Consistency Matrix
    story.append(Paragraph("3. Evidence Consistency Verification Matrix (Deterministic Rules)", section_h1))
    if not verification_matrix:
        story.append(Paragraph("<i>No verification findings recorded. Evidence awaiting review.</i>", body_style))
    else:
        v_header = [
            Paragraph("<b>Entity Field</b>", table_cell_bold),
            Paragraph("<b>Citizen Claim</b>", table_cell_bold),
            Paragraph("<b>Receipt Extraction</b>", table_cell_bold),
            Paragraph("<b>Source Evidence</b>", table_cell_bold),
            Paragraph("<b>Display Status</b>", table_cell_bold),
            Paragraph("<b>Rule & Verification Reason</b>", table_cell_bold)
        ]
        v_rows = [v_header]
        for vf in verification_matrix:
            d_status = vf.get("display_status") or map_result_to_display_status(vf.get("result", ""))
            result_code = vf.get("result", "")
            status_text = f"<b>{d_status}</b><br/>({result_code})"

            # Highlight style for cell
            bg_color = colors.HexColor("#ECFDF5") if d_status == "Consistent" else (
                colors.HexColor("#FEF2F2") if d_status == "Inconsistent" else colors.HexColor("#FFFBEB")
            )

            v_rows.append([
                Paragraph(vf.get("field_name", "").replace("_", " ").title(), table_cell_bold),
                Paragraph(str(vf.get("complaint_value") or "Omitted"), table_cell),
                Paragraph(str(vf.get("evidence_value") or "Not found"), table_cell),
                Paragraph(str(vf.get("source_evidence") or "—"), table_cell),
                Paragraph(status_text, table_cell),
                Paragraph(f"{vf.get('reason', '')}<br/><i>Recommendation: {vf.get('review_recommendation', '')}</i>", table_cell)
            ])
        v_table = Table(v_rows, colWidths=[90, 75, 75, 75, 75, 125])
        v_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(v_table)
    story.append(Spacer(1, 8))

    # Section 4: Extracted OCR Tokens & Provenance
    story.append(Paragraph("4. Extracted OCR Tokens & Entity Provenance", section_h1))
    if not extracted_entities:
        story.append(Paragraph("<i>No structured entities extracted from evidence.</i>", body_style))
    else:
        ef_header = [
            Paragraph("<b>Field Name</b>", table_cell_bold),
            Paragraph("<b>Raw Value</b>", table_cell_bold),
            Paragraph("<b>Normalized Value</b>", table_cell_bold),
            Paragraph("<b>Source Context</b>", table_cell_bold),
            Paragraph("<b>Correction Status</b>", table_cell_bold)
        ]
        ef_rows = [ef_header]
        for ef in extracted_entities:
            corr_status = "Officer Corrected" if ef.get("is_officer_corrected") else "OCR Derived"
            ef_rows.append([
                Paragraph(ef.get("field_name", "").replace("_", " ").title(), table_cell_bold),
                Paragraph(str(ef.get("raw_value") or "—"), table_cell),
                Paragraph(str(ef.get("normalized_value") or "—"), table_cell),
                Paragraph(str(ef.get("source_context") or "—"), table_cell),
                Paragraph(corr_status, table_cell)
            ])
        ef_table = Table(ef_rows, colWidths=[95, 110, 110, 110, 90])
        ef_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(ef_table)
    story.append(Spacer(1, 8))

    # Section 5: Cross-Complaint Intelligence Leads
    story.append(Paragraph("5. Cross-Complaint Intelligence Leads & Shared Indicators", section_h1))
    if not leads:
        story.append(Paragraph("<i>No cross-complaint indicator connections detected. Case appears isolated.</i>", body_style))
    else:
        lead_header = [
            Paragraph("<b>Shared Indicator Type</b>", table_cell_bold),
            Paragraph("<b>Indicator Value</b>", table_cell_bold),
            Paragraph("<b>Connected Case</b>", table_cell_bold),
            Paragraph("<b>Connected Incident</b>", table_cell_bold),
            Paragraph("<b>Rule Applied</b>", table_cell_bold)
        ]
        lead_rows = [lead_header]
        for ld in leads:
            lead_rows.append([
                Paragraph(str(ld.get("indicator_type", "")), table_cell_bold),
                Paragraph(str(ld.get("indicator_value", "")), table_cell),
                Paragraph(str(ld.get("linked_complaint", "")), table_cell_bold),
                Paragraph(str(ld.get("linked_incident_type", "")), table_cell),
                Paragraph(str(ld.get("rule_applied", "INDICATOR_MATCH")), table_cell)
            ])
        lead_table = Table(lead_rows, colWidths=[105, 130, 95, 95, 90])
        lead_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(lead_table)
    story.append(Spacer(1, 8))

    # Section 6: Officer Case Notes & Review Decisions
    story.append(Paragraph("6. Authorized Officer Review Decisions & Audit Notes", section_h1))
    if not notes:
        story.append(Paragraph("<i>No officer notes recorded yet.</i>", body_style))
    else:
        note_header = [
            Paragraph("<b>Officer Name</b>", table_cell_bold),
            Paragraph("<b>Status at Review</b>", table_cell_bold),
            Paragraph("<b>Investigative Decision / Note</b>", table_cell_bold),
            Paragraph("<b>Timestamp</b>", table_cell_bold)
        ]
        note_rows = [note_header]
        for n in notes:
            note_rows.append([
                Paragraph(str(n.get("reviewer_name", "Officer")), table_cell_bold),
                Paragraph(str(n.get("status_at_review", "")), table_cell),
                Paragraph(str(n.get("note", "")), table_cell),
                Paragraph(str(n.get("timestamp", ""))[:19].replace("T", " "), table_cell)
            ])
        note_table = Table(note_rows, colWidths=[100, 85, 230, 100])
        note_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ('BOX', (0, 0), (-1, -1), 0.5, c_border),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(note_table)
    story.append(Spacer(1, 10))

    # Section 7: Section 65B Notice & Debit Freeze Requisition Advisory
    cert_text = (
        "<b>STATUTORY ADVISORY & REQUISITION AID (INDIAN EVIDENCE ACT SECTION 65B / BNSS):</b><br/>"
        "This dossier compiles electronic evidence hashes, extraction tokens, and deterministic rule outcomes "
        "generated by CyberSaarthi. For banking freeze requisitions under Section 106 BNSS / 91 CrPC, "
        "rely upon the validated UTR/Txn ID and beneficiary UPI VPA documented in Section 3. "
        "All automated extractions must be corroborated by investigating officers before filing formal charges."
    )
    cert_table = Table([[Paragraph(cert_text, body_style)]], colWidths=[515])
    cert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#3B82F6")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(cert_table)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()
