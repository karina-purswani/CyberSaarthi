import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink,
  Mail,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  fetchComplaintDetail, 
  getEvidenceFileUrl, 
  fetchEmailConfig, 
  emailComplaintReport, 
  downloadReportPdf 
} from '../services/api';
import type { ComplaintDetail } from '../types';
import { Badge } from '../components/Badge';
import { DiscrepancyBadge } from '../components/DiscrepancyBadge';

export const CitizenCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email dossier state
  const [emailConfig, setEmailConfig] = useState<{
    smtp_configured: boolean;
    test_recipient_email: string;
    email_from: string;
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<{
    message: string;
    recipient: string;
    mode: string;
    dispatched_at: string;
  } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchEmailConfig().then(cfg => {
      setEmailConfig(cfg);
      if (cfg?.test_recipient_email) {
        setCustomEmail(cfg.test_recipient_email);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchComplaintDetail(id)
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Failed to load case status details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Retrieving official complaint tracking ledger...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B' }}>
        <strong>Error:</strong> {error || 'Case not found'}
        <div style={{ marginTop: '1rem' }}>
          <Link to="/citizen/complaints" style={{ color: 'var(--brand-teal)', fontWeight: 600 }}>
            ← Return to My Complaints
          </Link>
        </div>
      </div>
    );
  }

  const { complaint, evidence_files, verification_findings } = data;

  // Determine stage progress for the visual stepper
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PENDING_OCR':
        return 1;
      case 'EXTRACTED':
        return 2;
      case 'VERIFIED_CONSISTENT':
      case 'FLAGGED_DISCREPANCY':
        return 3;
      case 'UNDER_REVIEW':
      case 'AWAITING_REVIEW':
      case 'IN_PROGRESS':
        return 4;
      case 'RESOLVED':
      case 'CLOSED':
        return 5;
      default:
        return 2;
    }
  };

  const currentStage = getStageIndex(complaint.status);

  const handleDownloadPdf = async () => {
    if (!complaint) return;
    setDownloadingPdf(true);
    try {
      const blob = await downloadReportPdf(complaint.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cybersaarthi_dossier_${complaint.reference_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download PDF dossier: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendEmail = async (overrideEmail?: string) => {
    if (!complaint) return;
    setSendingEmail(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      const target = overrideEmail || (showCustomEmailInput && customEmail.trim() ? customEmail.trim() : undefined);
      const res = await emailComplaintReport(complaint.id, target);
      setEmailSuccess({
        message: res.message,
        recipient: res.recipient,
        mode: res.mode,
        dispatched_at: res.dispatched_at
      });
    } catch (err: any) {
      setEmailError(err.message || 'Failed to dispatch report email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const configuredTestEmail = emailConfig?.test_recipient_email || 'purswani2276@gmail.com';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      
      {/* Back Link */}
      <div>
        <Link
          to="/citizen/complaints"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to My Complaints</span>
        </Link>
      </div>

      {/* Case Header Card */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {complaint.reference_id}
            </h1>
            <Badge status={complaint.status} />
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            System Acknowledgment ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{complaint.id}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Submitted On: {new Date(complaint.submission_time).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Disputed Amount
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {complaint.reported_amount ? `₹${complaint.reported_amount.toLocaleString('en-IN')}` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.71875rem', color: 'var(--brand-teal)', fontWeight: 600 }}>
            Category: {complaint.incident_type}
          </div>
        </div>
      </div>

      {/* Report Dossier & Email Delivery Action Card */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Investigation Dossier &amp; Report Actions
            </h2>
            <p style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Download or email the authenticated CyberSaarthi report dossier with Section 65B advisory and extracted tokens.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--surface-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: downloadingPdf ? 'not-allowed' : 'pointer'
              }}
            >
              {downloadingPdf ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              <span>{downloadingPdf ? 'Exporting PDF...' : 'Download PDF Dossier'}</span>
            </button>

            {/* Email Report Button */}
            <button
              onClick={() => handleSendEmail()}
              disabled={sendingEmail}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: sendingEmail ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
                opacity: sendingEmail ? 0.7 : 1
              }}
            >
              {sendingEmail ? <Loader2 size={14} className="spin" /> : <Mail size={14} />}
              <span>
                {sendingEmail ? 'Dispatching...' : `Email Report to Demonstration Inbox`}
              </span>
            </button>
          </div>
        </div>

        {/* Demonstration Recipient Note */}
        <div style={{
          backgroundColor: 'var(--surface-subtle)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.78125rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Configured Demonstration Recipient:</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--brand-teal)',
              backgroundColor: '#FFFFFF',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)'
            }}>
              {configuredTestEmail}
            </span>
            <span style={{
              fontSize: '0.6875rem',
              padding: '0.1rem 0.35rem',
              borderRadius: '2px',
              backgroundColor: emailConfig?.smtp_configured ? '#ECFDF5' : '#FFFBEB',
              color: emailConfig?.smtp_configured ? '#065F46' : '#92400E',
              border: `1px solid ${emailConfig?.smtp_configured ? '#A7F3D0' : '#FDE68A'}`,
              fontWeight: 600
            }}>
              {emailConfig?.smtp_configured ? 'SMTP Active' : 'Simulation Mode'}
            </span>
          </div>

          <button
            onClick={() => setShowCustomEmailInput(!showCustomEmailInput)}
            style={{
              color: 'var(--brand-teal)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {showCustomEmailInput ? 'Hide Custom Recipient' : 'Change Recipient'}
          </button>
        </div>

        {/* Custom Recipient Input Bar */}
        {showCustomEmailInput && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap'
          }}>
            <label style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recipient Email:
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="e.g. your-inbox@example.com"
              style={{
                flex: 1,
                minWidth: '220px',
                fontSize: '0.8125rem',
                padding: '0.4rem 0.65rem'
              }}
            />
            <button
              onClick={() => handleSendEmail(customEmail.trim())}
              disabled={sendingEmail || !customEmail.trim()}
              style={{
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78125rem',
                fontWeight: 600,
                cursor: (sendingEmail || !customEmail.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              Send to this Address
            </button>
          </div>
        )}

        {/* Success Feedback Alert */}
        {emailSuccess && (
          <div style={{
            marginTop: '1rem',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <CheckCircle2 size={18} color="#059669" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#065F46', marginBottom: '0.2rem' }}>
                Report Dossier Successfully Dispatched ({emailSuccess.mode.toUpperCase()})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#047857', lineHeight: 1.45 }}>
                {emailSuccess.message}
              </div>
              <div style={{ fontSize: '0.71875rem', color: '#065F46', marginTop: '0.35rem', fontStyle: 'italic' }}>
                Note: This email is an informational copy and does NOT constitute confirmation of police action or fund recovery.
              </div>
            </div>
            <button
              onClick={() => setEmailSuccess(null)}
              style={{ fontSize: '0.75rem', color: '#047857', cursor: 'pointer', padding: '0.1rem 0.3rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Feedback Alert */}
        {emailError && (
          <div style={{
            marginTop: '1rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <AlertCircle size={18} color="#DC2626" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.2rem' }}>
                Email Dispatch Failed
              </div>
              <div style={{ fontSize: '0.75rem', color: '#B91C1C', lineHeight: 1.45 }}>
                {emailError}
              </div>
            </div>
            <button
              onClick={() => setEmailError(null)}
              style={{ fontSize: '0.75rem', color: '#991B1B', cursor: 'pointer', padding: '0.1rem 0.3rem' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Visual Tracking Progress Stepper */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
          Verification & Investigation Lifecycle
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', position: 'relative' }}>
          {[
            { step: 1, label: 'Intake Recorded', desc: 'Secure database registration' },
            { step: 2, label: 'OCR Evidence Extraction', desc: 'Entity parsing & normalization' },
            { step: 3, label: 'Consistency Audit', desc: 'Rule-based claim cross-check' },
            { step: 4, label: 'Officer Review', desc: 'Jurisdiction & LEA triage' },
            { step: 5, label: 'Action & Disposal', desc: 'Freezing request / Closure' }
          ].map((st) => {
            const isCompleted = currentStage >= st.step;
            const isCurrent = currentStage === st.step;

            return (
              <div
                key={st.step}
                style={{
                  border: isCurrent ? '2px solid var(--brand-teal)' : '1px solid var(--border-light)',
                  backgroundColor: isCompleted ? (isCurrent ? 'var(--brand-subtle)' : '#F8FAFC') : '#FAFAFA',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? 'var(--brand-teal)' : '#E2E8F0',
                      color: isCompleted ? '#FFFFFF' : '#64748B',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isCompleted && !isCurrent ? '✓' : st.step}
                  </span>
                  {isCurrent && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-teal)', letterSpacing: '0.04em' }}>
                      Current Stage
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {st.label}
                </div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                  {st.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Details Grid: Incident Statement & Verified Evidence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Left: Statement & Incident Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
              Your Incident Statement
            </h3>

            <div
              style={{
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {complaint.description || 'No descriptive narrative recorded.'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Incident Type:</span>{' '}
                <strong>{complaint.incident_type}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Filing Language:</span>{' '}
                <strong style={{ textTransform: 'uppercase' }}>{complaint.language || 'English'}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Registered Contact:</span>{' '}
                <strong>{complaint.victim_phone || 'None provided'}</strong>
              </div>
              <div style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Claimed Txn ID:</span>{' '}
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{complaint.reported_txn_id || 'None'}</strong>
              </div>
            </div>
          </div>

          {/* Suspect Identifiers Claimed */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
              Suspect & Transaction Identifiers
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Suspect UPI ID / VPA:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8125rem' }}>
                  {complaint.reported_upi_id || 'None specified'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Complainant State / Region:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8125rem' }}>
                  {complaint.victim_state || 'Not specified'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Claimed Incident Timestamp:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8125rem' }}>
                  {complaint.incident_datetime || 'Not specified'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Attached Evidence & Verification Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Evidence Attachments */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
              Attached Evidence ({evidence_files.length})
            </h3>

            {evidence_files.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No evidence files attached.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {evidence_files.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      backgroundColor: 'var(--surface-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {ev.original_filename}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {(ev.file_size_bytes / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    {ev.file_type.startsWith('image/') && (
                      <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)', marginBottom: '0.5rem' }}>
                        <img
                          src={getEvidenceFileUrl(ev.storage_filename)}
                          alt="Receipt Preview"
                          style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', backgroundColor: '#FFFFFF', display: 'block' }}
                        />
                      </div>
                    )}

                    <a
                      href={getEvidenceFileUrl(ev.storage_filename)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--brand-teal)',
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>View Uploaded File</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Findings */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Evidence Cross-Verification
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
              Comparison of claimed details against OCR tokens extracted from payment screenshots.
            </p>

            {verification_findings.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Verification checks pending.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {verification_findings.map((vf) => {
                  const isAmount = vf.field_name === 'transaction_amount';
                  const formattedReported = isAmount && vf.complaint_value && !isNaN(Number(vf.complaint_value))
                    ? `₹${Number(vf.complaint_value).toLocaleString('en-IN')}`
                    : (vf.complaint_value || 'None');

                  return (
                    <div
                      key={vf.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          {vf.field_name.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                          Reported: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formattedReported}</span>
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                          Receipt: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{vf.evidence_value || 'Not detected'}</span>
                        </div>
                        {vf.reason && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.35 }}>
                            {vf.reason}
                          </div>
                        )}
                      </div>
                      <DiscrepancyBadge result={vf.result} displayStatus={vf.display_status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
