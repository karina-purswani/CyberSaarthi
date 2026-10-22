import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink
} from 'lucide-react';
import { fetchComplaintDetail, getEvidenceFileUrl } from '../services/api';
import type { ComplaintDetail } from '../types';
import { Badge } from '../components/Badge';
import { DiscrepancyBadge } from '../components/DiscrepancyBadge';

export const CitizenCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                {verification_findings.map((vf) => (
                  <div
                    key={vf.id}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface-subtle)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {vf.field_name.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                        Reported: <span style={{ fontFamily: 'var(--font-mono)' }}>{vf.complaint_value || 'None'}</span>
                      </div>
                      <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                        Receipt: <span style={{ fontFamily: 'var(--font-mono)' }}>{vf.evidence_value || 'Not detected'}</span>
                      </div>
                    </div>
                    <DiscrepancyBadge result={vf.result} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
