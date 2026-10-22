import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileCheck, 
  FileText, 
  Network, 
  Eye, 
  Send, 
  ShieldCheck,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { fetchComplaintDetail, addReviewNote, downloadReportPdf, uploadCaseEvidence } from '../services/api';
import type { ComplaintDetail } from '../types';
import { Badge } from '../components/Badge';
import { DiscrepancyBadge, DisplayStatusBadge } from '../components/DiscrepancyBadge';
import { ProvenancePill } from '../components/ProvenancePill';
import { DisclaimerNotice } from '../components/DisclaimerNotice';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review form state
  const [reviewerName, setReviewerName] = useState('Officer In-Charge');
  const [reviewNote, setReviewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [savingNote, setSavingNote] = useState(false);

  // PDF Export and Evidence Upload state
  const [exportingPdf, setExportingPdf] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCase = () => {
    if (!id) return;
    setLoading(true);
    fetchComplaintDetail(id)
      .then(res => {
        setData(res);
        setNewStatus(res.complaint.status);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!id || !data) return;
    setExportingPdf(true);
    try {
      const blob = await downloadReportPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CyberSaarthi_Dossier_${data.complaint.reference_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploadingEvidence(true);
    setUploadMessage(null);
    try {
      await uploadCaseEvidence(id, file);
      setUploadMessage({ type: 'success', text: `Uploaded "${file.name}" and re-ran consistency verification.` });
      loadCase();
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Evidence upload failed.' });
    } finally {
      setUploadingEvidence(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddReviewNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewNote.trim()) return;

    setSavingNote(true);
    try {
      await addReviewNote(id, {
        reviewer_name: reviewerName,
        note: reviewNote,
        review_status: newStatus
      });
      setReviewNote('');
      loadCase();
    } catch (err: any) {
      alert('Failed to save review note: ' + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading case file and evidence extraction...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B' }}>
        Failed to load case: {error}
      </div>
    );
  }

  const { complaint, evidence_files, verification_findings, reviewer_notes, related_leads } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* Top Navigation & Status Bar */}
      <div>
        <Link
          to="/officer/queue"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.5rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Complaint Queue</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {complaint.reference_id}
              </h1>
              <Badge status={complaint.priority} size="md" />
              <Badge status={complaint.status} size="md" />
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Submitted: {new Date(complaint.submission_time).toLocaleString()} | Category: <strong>{complaint.incident_type}</strong> | Language: <strong>{complaint.language.toUpperCase()}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.5rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: exportingPdf ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={15} />
              <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF Dossier'}</span>
            </button>

            <Link
              to={`/officer/reports/${complaint.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                padding: '0.5rem 0.9rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <FileCheck size={15} />
              <span>View Web Dossier</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Statement & Verification) vs Right Column (Evidence & Actions) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Citizen Statement Card */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--brand-teal)" />
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Original Citizen Narrative
                </h2>
              </div>
              <ProvenancePill origin="citizen" label={`Citizen Statement (${complaint.language.toUpperCase()})`} />
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', backgroundColor: 'var(--surface-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              {complaint.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1rem', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Reported Loss:</span>{' '}
                <strong className="tabular-nums">
                  {complaint.reported_amount ? `₹${complaint.reported_amount.toLocaleString('en-IN')}` : 'Not provided'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Reported UPI:</span>{' '}
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{complaint.reported_upi_id || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Reported Txn ID:</span>{' '}
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{complaint.reported_txn_id || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Jurisdiction:</span>{' '}
                <strong>{complaint.victim_state || 'Not specified'}</strong>
              </div>
            </div>
          </div>

          {/* Evidence Consistency Verification Engine Matrix */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--brand-teal)" />
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Evidence Consistency Verification Matrix
                  </h2>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Deterministic comparison using actual persisted complaint claims, extracted receipt tokens, and source attribution.
                </div>
              </div>
              <ProvenancePill origin="system" label="Deterministic Rule Engine" />
            </div>

            {verification_findings.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>No Evidence Findings Available</p>
                <p style={{ fontSize: '0.8125rem' }}>
                  No evidence files attached or processed for this complaint. Consistency checks require both complaint claims and evidence items.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>Entity Field</th>
                      <th style={{ width: '22%' }}>Complaint Claim</th>
                      <th style={{ width: '24%' }}>Evidence Token</th>
                      <th style={{ width: '16%' }}>Consistency Status</th>
                      <th style={{ width: '20%' }}>Rule Reason & Provenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verification_findings.map((vf) => {
                      const displayStatus = vf.display_status || (
                        vf.result === 'MATCH' ? 'Consistent' :
                        vf.result === 'MISMATCH' ? 'Inconsistent' : 'Insufficient Data'
                      );

                      // Check if associated extracted field was officer-corrected
                      const isCorrected = data.extracted_fields?.some(
                        ef => ef.field_name === vf.field_name && ef.is_officer_corrected
                      );

                      return (
                        <tr key={vf.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            <div>{vf.field_name.replace(/_/g, ' ').toUpperCase()}</div>
                            {vf.source_evidence && (
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                                Source: {vf.source_evidence}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                                {vf.complaint_value || <span style={{ color: 'var(--text-muted)' }}>Omitted / Not Reported</span>}
                              </span>
                              {vf.normalized_complaint_value && vf.normalized_complaint_value !== vf.complaint_value && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                  Normalized: <code>{vf.normalized_complaint_value}</code>
                                </span>
                              )}
                              <ProvenancePill origin="citizen" label="Citizen Reported" />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                                {vf.evidence_value || <span style={{ color: 'var(--text-muted)' }}>Not in receipt</span>}
                              </span>
                              {vf.normalized_evidence_value && vf.normalized_evidence_value !== vf.evidence_value && (
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                  Normalized: <code>{vf.normalized_evidence_value}</code>
                                </span>
                              )}
                              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <ProvenancePill origin={isCorrected ? "officer" : "ocr"} label={isCorrected ? "Officer Corrected" : "OCR Token"} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <DisplayStatusBadge status={displayStatus} />
                              <DiscrepancyBadge result={vf.result} />
                            </div>
                          </td>
                          <td style={{ fontSize: '0.78125rem', lineHeight: 1.4 }}>
                            <div style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                              {vf.reason}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.71875rem', fontStyle: 'italic' }}>
                              Action: {vf.review_recommendation}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Explanatory Legal Assistance Banner */}
            <div
              style={{
                backgroundColor: 'var(--surface-subtle)',
                borderTop: '1px solid var(--border-light)',
                padding: '0.75rem 1.25rem',
                fontSize: '0.71875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}
            >
              <strong>Investigative Assistance Note:</strong> Automated findings are preliminary, rule-based investigative assistance and do not constitute an FIR or a judicial determination of fraud or guilt.
            </div>
          </div>

          {/* Cross-Complaint Shared Indicator Leads */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Network size={18} color="var(--brand-teal)" />
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cross-Complaint Intelligence Leads
                </h2>
              </div>
              <Link
                to={`/officer/graph?focus_complaint_id=${complaint.id}`}
                style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--brand-teal)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <span>Explore in Interactive Graph</span>
                <Eye size={13} />
              </Link>
            </div>

            <DisclaimerNotice type="lead" />

            {related_leads.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                No cross-complaint connections found. Indicators appear isolated.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.75rem' }}>
                {related_leads.map((lead, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--surface-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.71875rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)' }}>
                          {lead.indicator_type}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                          {lead.normalized_value}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)' }}>
                        Also identified in complaint <strong>{lead.reference_id}</strong> ({lead.incident_type})
                      </div>
                    </div>

                    <Link
                      to={`/officer/complaints/${lead.id}`}
                      style={{
                        fontSize: '0.78125rem',
                        fontWeight: 600,
                        color: 'var(--brand-teal)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-primary)',
                        border: '1px solid var(--border-light)'
                      }}
                    >
                      Inspect Linked Case
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Evidence Preview & Officer Review Workflow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Evidence Files List & Preview Card */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Evidence Inventory ({evidence_files.length})
              </h3>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingEvidence}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.65rem',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--brand-teal)',
                    cursor: uploadingEvidence ? 'not-allowed' : 'pointer'
                  }}
                >
                  <UploadCloud size={13} />
                  <span>{uploadingEvidence ? 'Uploading...' : 'Attach Evidence'}</span>
                </button>
              </div>
            </div>

            {uploadMessage && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: uploadMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${uploadMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                  color: uploadMessage.type === 'success' ? '#065F46' : '#991B1B'
                }}
              >
                {uploadMessage.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{uploadMessage.text}</span>
              </div>
            )}

            {evidence_files.length === 0 ? (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No evidence files attached. Use &quot;Attach Evidence&quot; above to upload a receipt.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                        {ev.original_filename}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {(ev.file_size_bytes / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      OCR Confidence: <strong>{ev.ocr_confidence ? `${(ev.ocr_confidence * 100).toFixed(1)}%` : 'N/A'}</strong>
                    </div>

                    {/* Image display */}
                    {ev.file_type.startsWith('image/') && (
                      <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)', marginBottom: '0.5rem' }}>
                        <img
                          src={`/api/evidence/file/${ev.storage_filename}`}
                          alt="Evidence"
                          style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', backgroundColor: '#FFFFFF', display: 'block' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        to={`/officer/evidence?evidence_id=${ev.id}`}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--brand-teal)',
                          color: '#FFFFFF',
                          textDecoration: 'none'
                        }}
                      >
                        Inspect Full OCR
                      </Link>
                      <a
                        href={`/api/evidence/file/${ev.storage_filename}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--surface-primary)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--text-secondary)',
                          textDecoration: 'none'
                        }}
                      >
                        Raw File
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Officer Decision & Note Workflow */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <ShieldCheck size={16} color="var(--brand-teal)" />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Officer Review & Triage
              </h3>
            </div>

            <form onSubmit={handleAddReviewNote}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Update Review Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  <option value="AWAITING_REVIEW">Awaiting Review</option>
                  <option value="IN_PROGRESS">In Progress / Under Triage</option>
                  <option value="VERIFIED">Verified (Consistent)</option>
                  <option value="FLAGGED_FOR_MANUAL_AUDIT">Flagged For Manual Audit</option>
                  <option value="CLOSED">Closed / Resolved</option>
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Reviewer Name / Badge
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Official Review Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Record verification decision, bank liaison action, or audit notes..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8125rem', resize: 'vertical' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingNote}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'var(--brand-teal)',
                  color: '#FFFFFF',
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600
                }}
              >
                <Send size={13} />
                <span>{savingNote ? 'Recording...' : 'Commit Review Decision'}</span>
              </button>
            </form>

            {/* Past Reviewer Notes Log */}
            {reviewer_notes.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <h4 style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Audit Trail ({reviewer_notes.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {reviewer_notes.map((rn) => (
                    <div key={rn.id} style={{ fontSize: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>{rn.reviewer_name}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {new Date(rn.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {rn.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
