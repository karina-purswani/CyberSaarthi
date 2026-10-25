import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Printer, Download, ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchInvestigationReport, fetchComplaints, downloadReportPdf, emailComplaintReport, fetchEmailConfig } from '../services/api';
import type { ComplaintSummary } from '../types';
import { DisclaimerNotice } from '../components/DisclaimerNotice';
import { DiscrepancyBadge } from '../components/DiscrepancyBadge';

export const ReportsPage: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [emailConfig, setEmailConfig] = useState<{ test_recipient_email: string; smtp_configured: boolean } | null>(null);

  useEffect(() => {
    fetchEmailConfig().then(cfg => setEmailConfig(cfg)).catch(() => {});
  }, []);

  // Load complaints list for selector
  useEffect(() => {
    fetchComplaints({ limit: 50 })
      .then(res => {
        setComplaints(res.items);
        const queryId = routeId || searchParams.get('complaint_id');
        if (queryId) {
          setSelectedId(queryId);
        } else if (res.items.length > 0) {
          setSelectedId(res.items[0].id);
        }
      })
      .catch(() => {});
  }, [routeId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetchInvestigationReport(selectedId)
      .then(res => setReport(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedId || !report) return;
    setExportingPdf(true);
    try {
      const blob = await downloadReportPdf(selectedId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CyberSaarthi_Dossier_${report.complaint.reference_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CyberSaarthi_Dossier_${report.complaint.reference_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmailDossier = async () => {
    if (!selectedId || !report) return;
    setSendingEmail(true);
    setEmailFeedback(null);
    try {
      const res = await emailComplaintReport(selectedId);
      setEmailFeedback({
        type: 'success',
        message: res.message
      });
    } catch (err: any) {
      setEmailFeedback({
        type: 'error',
        message: err.message || 'Failed to dispatch report by email.'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const configuredRecipient = emailConfig?.test_recipient_email || 'purswani2276@gmail.com';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Action bar (Hidden when printing) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link
            to="/officer/queue"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.35rem',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Queue</span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Investigation Support Dossier
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Case selector */}
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setSearchParams({ complaint_id: e.target.value });
            }}
            style={{ fontSize: '0.8125rem' }}
          >
            {complaints.map(c => (
              <option key={c.id} value={c.id}>
                {c.reference_id} ({c.incident_type})
              </option>
            ))}
          </select>

          <button
            onClick={handleDownloadPDF}
            disabled={exportingPdf || !report}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: exportingPdf ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={14} />
            <span>{exportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
          </button>

          <button
            onClick={handleEmailDossier}
            disabled={sendingEmail || !report}
            title={`Email to configured demonstration inbox (${configuredRecipient})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--brand-teal)',
              color: 'var(--brand-teal)',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: sendingEmail ? 'not-allowed' : 'pointer'
            }}
          >
            {sendingEmail ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
            <span>{sendingEmail ? 'Dispatching...' : 'Email Dossier'}</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--surface-secondary, #E2E8F0)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600
            }}
          >
            <Printer size={14} />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Email feedback alert */}
      {emailFeedback && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: emailFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${emailFeedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
          color: emailFeedback.type === 'success' ? '#065F46' : '#991B1B',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {emailFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{emailFeedback.message}</span>
          </div>
          <button
            onClick={() => setEmailFeedback(null)}
            style={{ cursor: 'pointer', padding: '0.1rem 0.3rem', fontSize: '0.75rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {loading && <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Generating report dossier...</div>}
      {error && <div style={{ padding: '1.5rem', color: '#991B1B', backgroundColor: '#FEF2F2' }}>{error}</div>}

      {/* Formal Printable Document Card */}
      {report && (
        <div
          id="printable-dossier"
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.75rem'
          }}
        >
          {/* Document Header */}
          <div style={{ borderBottom: '2px solid var(--border-light)', paddingBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src="/favicon.png"
                alt="CyberSaarthi Logo"
                style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
              />
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-teal)', letterSpacing: '-0.01em' }}>
                  CYBERSAARTHI
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Evidence Intelligence & Triage System
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {report.complaint.reference_id}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Generated: {new Date(report.meta.generated_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Mandatory Civic Legal Disclaimer */}
          <DisclaimerNotice type="report" />

          {/* Section 1: Complaint & Complainant Details */}
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
              1. Incident & Citizen Statement
            </h2>
            <div style={{ backgroundColor: 'var(--surface-subtle)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                <div>Category: <strong>{report.complaint.incident_type}</strong></div>
                <div>Submission Time: <strong>{new Date(report.complaint.submission_time).toLocaleString()}</strong></div>
                <div>Reported Amount: <strong>{report.complaint.reported_amount ? `₹${report.complaint.reported_amount.toLocaleString('en-IN')}` : 'None'}</strong></div>
                <div>Complainant Contact: <strong>{report.complaint.victim_phone || 'Not recorded'}</strong></div>
                <div>Reported Suspect UPI: <strong style={{ fontFamily: 'var(--font-mono)' }}>{report.complaint.reported_upi_id || 'None'}</strong></div>
                <div>Reported Txn ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{report.complaint.reported_txn_id || 'None'}</strong></div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Complainant Narrative ({report.complaint.language.toUpperCase()}):
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {report.complaint.description}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Evidence Files Inventory */}
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
              2. Uploaded Evidence Inventory ({report.evidence_inventory.length})
            </h2>
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>OCR Extraction</th>
                  <th>OCR Confidence</th>
                </tr>
              </thead>
              <tbody>
                {report.evidence_inventory.map((ev: any) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 600 }}>{ev.original_filename}</td>
                    <td>{ev.file_type}</td>
                    <td>{(ev.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td>{ev.ocr_status}</td>
                    <td>{ev.ocr_confidence ? `${(ev.ocr_confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Evidence Consistency Verification Matrix */}
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
              3. Deterministic Evidence Consistency Findings
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Complaint Value</th>
                  <th>Receipt OCR Value</th>
                  <th>Result</th>
                  <th>Finding & Traceability Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.verification_matrix.map((vm: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{vm.field_name.replace(/_/g, ' ').toUpperCase()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78125rem' }}>{vm.complaint_value || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78125rem' }}>{vm.evidence_value || '—'}</td>
                    <td>
                      <DiscrepancyBadge result={vm.result} />
                    </td>
                    <td style={{ fontSize: '0.78125rem', lineHeight: 1.4 }}>
                      <div>{vm.reason}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem', fontStyle: 'italic', marginTop: '0.15rem' }}>
                        Action: {vm.review_recommendation}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Cross-Complaint Intelligence Leads */}
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
              4. Cross-Complaint Shared Indicator Leads
            </h2>
            {report.investigative_leads.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0.5rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                No shared identifiers linked to other stored complaints.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Indicator Type</th>
                    <th>Shared Identifier</th>
                    <th>Linked Complaint Reference</th>
                    <th>Linked Incident Type</th>
                  </tr>
                </thead>
                <tbody>
                  {report.investigative_leads.map((lead: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{lead.indicator_type}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{lead.indicator_value}</td>
                      <td style={{ fontWeight: 600, color: 'var(--brand-teal)' }}>{lead.linked_complaint}</td>
                      <td>{lead.linked_incident_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 5: Reviewer Notes & Audit Trail */}
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-teal)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
              5. Officer Review Decisions & Audit Trail
            </h2>
            {report.reviewer_notes.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '0.5rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                No officer notes recorded yet. Complaint is currently in triage queue.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {report.reviewer_notes.map((rn: any, i: number) => (
                  <div key={i} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.2rem' }}>
                      <span>Reviewer: {rn.reviewer_name} (Status: {rn.status_at_review})</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rn.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>{rn.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Signature Box */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div>CyberSaarthi Intelligence System | Verification Platform</div>
            <div>Officer Signature / Seal: _____________________________</div>
          </div>

        </div>
      )}

    </div>
  );
};
