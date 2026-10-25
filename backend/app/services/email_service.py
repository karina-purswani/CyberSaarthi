import os
import re
import time
import smtplib
import ssl
import logging
import html
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Dict, Any, Optional

from app.core.config import settings
from app.db.database import get_connection
from app.services.report_generation import generate_investigation_pdf

logger = logging.getLogger("cybersaarthi.email")

# Email validation pattern (RFC 5322 compliant subset)
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

# In-memory debounce cache to prevent rapid duplicate sends: (complaint_id, recipient) -> timestamp
_recent_dispatches: Dict[str, float] = {}
DEBOUNCE_WINDOW_SECONDS = 15.0


def validate_email_address(email: str) -> bool:
    """Validates that the email address adheres to standard syntax."""
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def format_currency_in(amount: Optional[float]) -> str:
    """Formats amount into Indian Rupee notation if present."""
    if amount is None:
        return "N/A"
    try:
        return f"₹{amount:,.2f}"
    except Exception:
        return f"₹{amount}"


def build_report_mime_message(
    complaint: Dict[str, Any],
    pdf_bytes: bytes,
    recipient_email: str
) -> MIMEMultipart:
    """
    Constructs a multi-part MIME email containing:
    1. Plaintext fallback body
    2. Professional CyberSaarthi branded HTML body
    3. Official investigation PDF dossier attachment
    """
    ref_id = complaint.get("reference_id", "N/A")
    c_id = complaint.get("id", "N/A")
    incident_type = complaint.get("incident_type", "Cyber Incident")
    sub_time = complaint.get("submission_time", "N/A")
    amount_str = format_currency_in(complaint.get("reported_amount"))
    status_str = str(complaint.get("status", "AWAITING_REVIEW")).replace("_", " ")
    txn_id = complaint.get("reported_txn_id") or "None specified"
    upi_id = complaint.get("reported_upi_id") or "None specified"
    description = complaint.get("description", "No narrative recorded.")
    
    # Portal link for authenticated citizen review
    report_url = f"{settings.frontend_base_url.rstrip('/')}/citizen/complaints/{c_id}"

    # Create root multipart message
    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"CyberSaarthi — Cybercrime Report [{ref_id}]"
    msg["From"] = settings.email_from
    msg["To"] = recipient_email
    msg["X-Report-Reference"] = ref_id
    msg["X-Mailer"] = "CyberSaarthi-Evidence-Intelligence-Platform"

    # Plain text alternative
    text_content = f"""CYBERSAARTHI — CYBERCRIME REPORT COPY
==================================================
Case Reference ID: {ref_id}
System Complaint ID: {c_id}
Submission Date & Time: {sub_time}
Incident Category: {incident_type}
Reported Financial Loss: {amount_str}
Claimed Transaction ID: {txn_id}
Claimed Beneficiary UPI / VPA: {upi_id}
Current Status: {status_str}

INCIDENT SUMMARY:
{description}

TRACK IN PORTAL:
{report_url}

STATUTORY NOTICE & DISCLAIMER:
Notice: This email is an automated informational copy of your CyberSaarthi report
for your personal records. It does NOT constitute confirmation of police action,
First Information Report (FIR) registration, or fund recovery.

For financial cyber fraud in India, report immediately to the National Cyber Crime
Reporting Portal (https://cybercrime.gov.in/) and dial national helpline 1930.

Attached: Official CyberSaarthi Investigation Dossier (PDF).
"""

    # HTML body with CyberSaarthi branding and restrained civic design
    safe_desc = html.escape(description)
    safe_type = html.escape(incident_type)
    safe_ref = html.escape(ref_id)
    safe_cid = html.escape(c_id)
    safe_txn = html.escape(txn_id)
    safe_upi = html.escape(upi_id)
    safe_status = html.escape(status_str)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CyberSaarthi Report {safe_ref}</title>
</head>
<body style="margin:0; padding:0; background-color:#F6F7F5; font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif; color:#202B35; line-height:1.5;">
  <div style="max-width:640px; margin:24px auto; background-color:#FFFFFF; border:1px solid #E0E5E2; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    
    <!-- Top Branding Banner -->
    <div style="background-color:#176B65; color:#FFFFFF; padding:24px 32px; border-bottom:3px solid #125650;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <h1 style="margin:0; font-size:22px; font-weight:700; letter-spacing:-0.01em;">CyberSaarthi</h1>
            <p style="margin:4px 0 0; font-size:12px; color:#E8F3F1; text-transform:uppercase; letter-spacing:0.04em;">
              Evidence Intelligence Platform &bull; Citizen Dossier Copy
            </p>
          </td>
          <td align="right" valign="middle">
            <span style="display:inline-block; background-color:rgba(255,255,255,0.18); color:#FFFFFF; font-family:monospace; font-weight:700; font-size:13px; padding:4px 10px; border-radius:4px; border:1px solid rgba(255,255,255,0.3);">
              {safe_ref}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content Area -->
    <div style="padding:28px 32px;">
      <h2 style="font-size:17px; margin:0 0 12px; color:#176B65; font-weight:700;">
        Cybercrime Incident Report Acknowledgment
      </h2>
      <p style="font-size:14px; color:#65717D; margin:0 0 20px;">
        This communication confirms that your incident statement and electronic receipt records have been logged into the CyberSaarthi intelligence platform. A complete investigation support dossier is attached as a PDF.
      </p>

      <!-- Key Metadata Card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F9F8; border:1px solid #E0E5E2; border-radius:6px; margin-bottom:20px; font-size:13px;">
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; width:38%; font-weight:600;">Case Reference ID</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; font-family:monospace; font-weight:700; color:#176B65;">{safe_ref}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; font-weight:600;">System Record ID</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; font-family:monospace; color:#202B35;">{safe_cid}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; font-weight:600;">Incident Category</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; font-weight:600; color:#202B35;">{safe_type}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; font-weight:600;">Submission Timestamp</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#202B35;">{html.escape(str(sub_time))}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; font-weight:600;">Reported Financial Loss</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; font-weight:700; color:#202B35;">{amount_str}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; font-weight:600;">Claimed Txn ID / UTR</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; font-family:monospace; color:#202B35;">{safe_txn}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; color:#65717D; font-weight:600;">Suspect UPI ID / VPA</td>
          <td style="padding:10px 14px; border-bottom:1px solid #E0E5E2; font-family:monospace; color:#202B35;">{safe_upi}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; color:#65717D; font-weight:600;">Lifecycle Status</td>
          <td style="padding:10px 14px; font-weight:700; color:#176B65;">{safe_status}</td>
        </tr>
      </table>

      <!-- Incident Statement Narrative -->
      <div style="margin-bottom:24px;">
        <h3 style="font-size:13px; font-weight:700; color:#202B35; text-transform:uppercase; letter-spacing:0.04em; margin:0 0 8px;">
          Incident Narrative Summary
        </h3>
        <div style="background-color:#F8F9F8; border-left:3px solid #176B65; padding:12px 16px; border-radius:0 4px 4px 0; font-size:13px; color:#202B35; white-space:pre-wrap;">
          {safe_desc}
        </div>
      </div>

      <!-- Button Link to portal -->
      <div style="text-align:center; margin:28px 0;">
        <a href="{report_url}" style="display:inline-block; background-color:#176B65; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:14px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          View Case & Track Status in Portal &rarr;
        </a>
      </div>

      <!-- Statutory Advisory Alert Box -->
      <div style="background-color:#FFFBEB; border:1px solid #FDE68A; border-radius:6px; padding:14px 16px; margin-top:24px;">
        <p style="margin:0 0 6px; font-size:12px; font-weight:700; color:#92400E; text-transform:uppercase; letter-spacing:0.03em;">
          &bull; Mandatory Statutory Advisory &bull;
        </p>
        <p style="margin:0; font-size:12px; color:#78350F; line-height:1.5;">
          This email is an automated informational copy of your CyberSaarthi report for your personal records. It does <strong>NOT</strong> constitute confirmation of police action, First Information Report (FIR) registration, or fund recovery.
        </p>
        <p style="margin:8px 0 0; font-size:12px; color:#78350F; line-height:1.5;">
          In India, for immediate financial fraud response and inter-bank debit freezing, report via the official National Cyber Crime helpline <strong>1930</strong> and portal <a href="https://cybercrime.gov.in/" style="color:#92400E; font-weight:700;">https://cybercrime.gov.in/</a>.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color:#F0F2EF; border-top:1px solid #E0E5E2; padding:16px 32px; font-size:11px; color:#8E9BA7; text-align:center;">
      <p style="margin:0 0 4px;">
        CyberSaarthi &bull; Civic-Tech Multilingual Cyber-Fraud Evidence Intelligence Platform
      </p>
      <p style="margin:0;">
        This automated notification was generated at the request of an authorized user. Please do not reply directly to this email.
      </p>
    </div>

  </div>
</body>
</html>
"""

    # Assemble text + html alternative inside a multipart/alternative container
    alt_container = MIMEMultipart("alternative")
    alt_container.attach(MIMEText(text_content, "plain", "utf-8"))
    alt_container.attach(MIMEText(html_content, "html", "utf-8"))
    msg.attach(alt_container)

    # Attach the official generated PDF dossier
    pdf_filename = f"cybersaarthi_dossier_{ref_id}.pdf"
    pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_attachment.add_header("Content-Disposition", "attachment", filename=pdf_filename)
    msg.attach(pdf_attachment)

    return msg


def send_complaint_report_email(
    complaint_id: str,
    recipient_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validates, generates, and delivers the cybercrime investigation dossier via email.
    
    - Recipient resolution:
        1. Uses provided `recipient_email` if specified and valid.
        2. Otherwise falls back to configured `CYBERSAARTHI_TEST_EMAIL` demonstration inbox.
    - If `SMTP_HOST` is configured in settings:
        Dispatches via real SMTP server (with STARTTLS or SSL) with safe timeouts and error catching.
    - If `SMTP_HOST` is empty / unconfigured:
        Operates in safe demonstration simulation mode (fully verifies compilation, MIME generation,
        and PDF attachment, safely logging the dispatch without leaking credentials).
    - Prevents accidental rapid duplicate sends via debounce window.
    """
    # 1. Resolve recipient email address
    target_email = (recipient_email or "").strip()
    if not target_email:
        target_email = settings.test_recipient_email.strip()

    if not target_email or not validate_email_address(target_email):
        raise ValueError(
            f"Invalid or missing recipient email address: '{target_email}'. "
            "Please provide a valid recipient or configure CYBERSAARTHI_TEST_EMAIL."
        )

    # 2. Retrieve complaint record from database
    conn = get_connection()
    try:
        complaint = conn.execute(
            "SELECT * FROM complaints WHERE id = ? OR reference_id = ?",
            (complaint_id, complaint_id)
        ).fetchone()
        if not complaint:
            raise LookupError(f"Complaint record '{complaint_id}' does not exist.")
        complaint_dict = dict(complaint)
        canonical_id = complaint_dict["id"]
        ref_id = complaint_dict["reference_id"]
    finally:
        conn.close()

    # 3. Check debounce to prevent duplicate sends caused by double clicks
    debounce_key = f"{canonical_id}:{target_email.lower()}"
    now = time.time()
    last_sent = _recent_dispatches.get(debounce_key, 0.0)
    if now - last_sent < DEBOUNCE_WINDOW_SECONDS:
        remaining = int(DEBOUNCE_WINDOW_SECONDS - (now - last_sent))
        raise RuntimeError(
            f"A report email was recently dispatched for case {ref_id} to {target_email}. "
            f"Please wait {remaining} second(s) before requesting another send."
        )

    # 4. Generate the official investigation PDF dossier
    pdf_bytes = generate_investigation_pdf(canonical_id)
    if not pdf_bytes or len(pdf_bytes) < 100:
        raise RuntimeError(f"Failed to generate investigation PDF for case {ref_id}.")

    # 5. Build MIME message with attachment and legal disclaimers
    mime_msg = build_report_mime_message(complaint_dict, pdf_bytes, target_email)

    # 6. Dispatch via configured SMTP or run in safe simulation mode
    smtp_host = settings.smtp_host.strip()

    if smtp_host:
        # Real SMTP Delivery Path
        try:
            logger.info("Connecting to SMTP relay server at %s:%d for case %s", smtp_host, settings.smtp_port, ref_id)
            
            if settings.smtp_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_host, settings.smtp_port, context=context, timeout=12.0) as server:
                    if settings.smtp_user and settings.smtp_password:
                        server.login(settings.smtp_user, settings.smtp_password)
                    server.send_message(mime_msg)
            else:
                with smtplib.SMTP(smtp_host, settings.smtp_port, timeout=12.0) as server:
                    server.ehlo()
                    if settings.smtp_tls:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    if settings.smtp_user and settings.smtp_password:
                        server.login(settings.smtp_user, settings.smtp_password)
                    server.send_message(mime_msg)

            # Record debounce timestamp on successful relay acceptance
            _recent_dispatches[debounce_key] = now

            logger.info("Report email accepted by SMTP relay for %s -> %s", ref_id, target_email)
            return {
                "success": True,
                "status": "sent",
                "mode": "smtp",
                "recipient": target_email,
                "reference_id": ref_id,
                "message": (
                    f"Report successfully dispatched to demonstration inbox ({target_email}) via SMTP ({smtp_host}). "
                    "Provider acceptance confirms receipt by the outbound mail server. "
                    "Actual delivery timing depends on destination server acceptance and spam filtering."
                ),
                "pdf_filename": f"cybersaarthi_dossier_{ref_id}.pdf",
                "pdf_size_bytes": len(pdf_bytes),
                "dispatched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
            }

        except smtplib.SMTPAuthenticationError:
            logger.error("SMTP authentication failed for host %s (credentials rejected)", smtp_host)
            raise ConnectionError(
                "SMTP authentication failed with the configured email provider. Please verify SMTP_USER and SMTP_PASSWORD."
            )
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError) as e:
            logger.error("SMTP network connection failure to %s: %s", smtp_host, str(e))
            raise ConnectionError(
                f"Could not connect to SMTP server at {smtp_host}:{settings.smtp_port}. Please check network or port configuration."
            )
        except Exception as e:
            logger.error("Unexpected error during email dispatch to %s: %s", target_email, str(e))
            raise RuntimeError(
                "An unexpected error occurred while communicating with the email server. Please check server logs."
            )

    else:
        # Simulation Mode Path (When SMTP credentials are not yet configured in local environment)
        # Verifies the full pipeline end-to-end: payload assembly, HTML generation, and PDF dossier attachment
        _recent_dispatches[debounce_key] = now
        logger.info(
            "Report email compiled & verified in SIMULATION mode for case %s -> %s (PDF size: %d bytes)",
            ref_id, target_email, len(pdf_bytes)
        )
        return {
            "success": True,
            "status": "simulated",
            "mode": "simulated",
            "recipient": target_email,
            "reference_id": ref_id,
            "message": (
                f"Report email and PDF dossier successfully generated and verified for recipient {target_email}. "
                "The platform is currently operating in simulation mode because SMTP_HOST is not set in your .env file. "
                "To enable live SMTP delivery, specify SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and CYBERSAARTHI_TEST_EMAIL."
            ),
            "pdf_filename": f"cybersaarthi_dossier_{ref_id}.pdf",
            "pdf_size_bytes": len(pdf_bytes),
            "dispatched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
        }
