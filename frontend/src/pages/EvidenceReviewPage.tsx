import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Eye, 
  Edit3, 
  X, 
  CheckCircle
} from 'lucide-react';
import { 
  fetchComplaints, 
  fetchComplaintDetail, 
  fetchEvidenceDetail, 
  correctExtractedField,
  getEvidenceFileUrl 
} from '../services/api';
import type { ComplaintSummary, ComplaintDetail, EvidenceFile, ExtractedField } from '../types';
import { ProvenancePill } from '../components/ProvenancePill';
import { DiscrepancyBadge } from '../components/DiscrepancyBadge';

export const EvidenceReviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('');
  const [caseDetail, setCaseDetail] = useState<ComplaintDetail | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>('');
  const [evidenceData, setEvidenceData] = useState<EvidenceFile | null>(null);
  const [loading, setLoading] = useState(false);

  // Field Correction Modal / Form State
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);
  const [correctedValue, setCorrectedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Load complaints list for selector
  useEffect(() => {
    fetchComplaints({ limit: 50 })
      .then(res => {
        setComplaints(res.items);
        const queryId = searchParams.get('complaint_id');
        const evId = searchParams.get('evidence_id');
        if (queryId) {
          setSelectedComplaintId(queryId);
        } else if (res.items.length > 0) {
          setSelectedComplaintId(res.items[0].id);
        }
        if (evId) setSelectedEvidenceId(evId);
      })
      .catch(() => {});
  }, []);

  // Reload complaint & evidence data
  const reloadData = () => {
    if (!selectedComplaintId) return;
    setLoading(true);
    fetchComplaintDetail(selectedComplaintId)
      .then(res => {
        setCaseDetail(res);
        if (res.evidence_files.length > 0) {
          const matchEv = res.evidence_files.find(e => e.id === selectedEvidenceId);
          const activeEvId = matchEv ? matchEv.id : res.evidence_files[0].id;
          setSelectedEvidenceId(activeEvId);
          return fetchEvidenceDetail(activeEvId);
        } else {
          setSelectedEvidenceId('');
          setEvidenceData(null);
          return null;
        }
      })
      .then(evRes => {
        if (evRes) setEvidenceData(evRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // When selectedComplaintId changes, load case details
  useEffect(() => {
    reloadData();
  }, [selectedComplaintId]);

  // When selectedEvidenceId changes, fetch specific evidence details
  useEffect(() => {
    if (!selectedEvidenceId) return;
    fetchEvidenceDetail(selectedEvidenceId)
      .then(res => setEvidenceData(res))
      .catch(() => {});
  }, [selectedEvidenceId]);

  const handleOpenCorrection = (field: ExtractedField) => {
    setEditingField(field);
    setCorrectedValue(field.raw_value || '');
    setCorrectionReason('');
    setCorrectionError(null);
    setCorrectionSuccess(null);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField || !selectedComplaintId || !selectedEvidenceId) return;

    if (!correctedValue.trim()) {
      setCorrectionError('Corrected value cannot be empty.');
      return;
    }
    if (!correctionReason.trim()) {
      setCorrectionError('Official audit justification is required to record a manual correction.');
      return;
    }

    setSavingCorrection(true);
    setCorrectionError(null);
    try {
      await correctExtractedField(
        selectedComplaintId,
        selectedEvidenceId,
        editingField.id,
        correctedValue.trim(),
        correctionReason.trim()
      );
      setCorrectionSuccess(`Successfully corrected ${editingField.field_name.replace(/_/g, ' ')}. Verification findings recomputed.`);
      setEditingField(null);
      // Refresh case & evidence
      reloadData();
    } catch (err: any) {
      setCorrectionError(err.message || 'Failed to apply manual correction.');
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* Top Header & Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Evidence Extraction & Discrepancy Inspection
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Side-by-side inspection of citizen payment screenshots alongside raw OCR tokens, normalized fields, and provenance tracking.
          </p>
        </div>

        {/* Complaint Case Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Case:</span>
          <select
            value={selectedComplaintId}
            onChange={(e) => {
              setSelectedComplaintId(e.target.value);
              setSearchParams({ complaint_id: e.target.value });
            }}
            style={{ fontSize: '0.8125rem', minWidth: '240px' }}
          >
            {complaints.map(c => (
              <option key={c.id} value={c.id}>
                {c.reference_id} — {c.incident_type} {c.reported_amount ? `(₹${c.reported_amount.toLocaleString()})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {correctionSuccess && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-md)', color: '#166534', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} />
          <span>{correctionSuccess}</span>
        </div>
      )}

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading case evidence and extraction records...
        </div>
      )}

      {caseDetail && (
        <>
          {/* File Selector Tabs if multiple files */}
          {caseDetail.evidence_files.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              {caseDetail.evidence_files.map((ev, i) => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvidenceId(ev.id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: selectedEvidenceId === ev.id ? 700 : 500,
                    backgroundColor: selectedEvidenceId === ev.id ? 'var(--brand-teal)' : 'var(--surface-primary)',
                    color: selectedEvidenceId === ev.id ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  Evidence #{i + 1}: {ev.original_filename}
                </button>
              ))}
            </div>
          )}

          {/* Side by Side Split Pane */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', minHeight: '600px' }}>
            
            {/* Left Column: Original Document Image Viewer */}
            <div
              style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Eye size={16} color="var(--brand-teal)" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Original Evidence Document
                  </h3>
                </div>
                {evidenceData && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(evidenceData.file_size_bytes / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  overflow: 'auto'
                }}
              >
                {evidenceData && evidenceData.storage_filename ? (
                  <img
                    src={getEvidenceFileUrl(evidenceData.storage_filename)}
                    alt="Evidence Document"
                    style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: '4px' }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No receipt image attached to this complaint.
                  </div>
                )}
              </div>

              {evidenceData && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>File: <strong>{evidenceData.original_filename}</strong></span>
                  <a
                    href={getEvidenceFileUrl(evidenceData.storage_filename)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--brand-teal)', fontWeight: 600 }}
                  >
                    Open Full Resolution ↗
                  </a>
                </div>
              )}
            </div>

            {/* Right Column: OCR Extraction & Consistency Findings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Structured Extracted Tokens & Officer Provenance Corrections */}
              <div
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Extracted Fields & Provenance Audit
                    </h3>
                    <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      RapidOCR detected tokens with authorized officer manual correction capabilities.
                    </div>
                  </div>
                  <ProvenancePill origin="ocr" label="RapidOCR + Parser" />
                </div>

                {/* Extracted Fields Table */}
                {evidenceData && evidenceData.extracted_fields && evidenceData.extracted_fields.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {evidenceData.extracted_fields.map((ef) => (
                      <div
                        key={ef.id}
                        style={{
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.75rem',
                          backgroundColor: ef.is_officer_corrected ? '#F0FDFA' : 'var(--surface-subtle)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.71875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              {ef.field_name.replace(/_/g, ' ')}
                            </span>
                            {ef.is_officer_corrected ? (
                              <span style={{ fontSize: '0.625rem', fontWeight: 700, backgroundColor: '#CCFBF1', color: '#0F766E', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)' }}>
                                Officer Corrected
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.625rem', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)' }}>
                                Original OCR
                              </span>
                            )}
                          </div>

                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {ef.raw_value || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Not detected</span>}
                          </div>

                          {ef.is_officer_corrected && (
                            <div style={{ marginTop: '0.35rem', fontSize: '0.71875rem', color: '#0F766E', lineHeight: 1.3 }}>
                              <div>Original OCR: <span style={{ fontFamily: 'var(--font-mono)' }}>{ef.original_value || 'None'}</span></div>
                              <div>Reason: <em>{ef.correction_reason}</em></div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenCorrection(ef)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)',
                            backgroundColor: 'var(--surface-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--brand-teal)',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Correct</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    No structured entity tokens extracted from this document yet.
                  </div>
                )}
              </div>

              {/* Consistency Findings Matrix */}
              <div
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Verification Consistency Findings
                  </h3>
                  <ProvenancePill origin="system" label="Deterministic Rules" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {caseDetail.verification_findings.map((vf) => (
                    <div
                      key={vf.id}
                      style={{
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--surface-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.71875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {vf.field_name.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                          {vf.evidence_value || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Not detected</span>}
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Claimed: <strong>{vf.complaint_value || 'Omitted'}</strong> — {vf.reason}
                        </div>
                      </div>

                      <DiscrepancyBadge result={vf.result} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw OCR Text Box */}
              <div
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Raw Unprocessed OCR Text
                  </h3>
                  {evidenceData?.ocr_confidence && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--brand-teal)', fontWeight: 600 }}>
                      Confidence: {(evidenceData.ocr_confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Preserved raw text string returned by optical character recognition model for full source traceability.
                </div>

                <pre
                  style={{
                    backgroundColor: '#F8F9FA',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78125rem',
                    color: '#1F2937',
                    lineHeight: 1.5,
                    overflowY: 'auto',
                    maxHeight: '180px',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {evidenceData?.raw_ocr_text || 'No raw OCR text available.'}
                </pre>
              </div>

            </div>

          </div>
        </>
      )}

      {/* Manual Field Correction Modal */}
      {editingField && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="var(--brand-teal)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Correct Extracted Field
                </h3>
              </div>
              <button
                onClick={() => setEditingField(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Manually correct OCR extraction for field <strong style={{ textTransform: 'uppercase' }}>{editingField.field_name.replace(/_/g, ' ')}</strong>. The original value and your officer audit justification will be permanently recorded in the immutable provenance log.
            </div>

            {correctionError && (
              <div style={{ padding: '0.65rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
                {correctionError}
              </div>
            )}

            <form onSubmit={handleSaveCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Current / Detected Value
                </label>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', padding: '0.5rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                  {editingField.raw_value || 'None detected'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Corrected Value *
                </label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  placeholder="Enter verified correct value..."
                  style={{ width: '100%', fontSize: '0.875rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Official Audit Justification *
                </label>
                <textarea
                  rows={2}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. OCR misread digit '0' as '8' due to font artifact on receipt screenshot..."
                  style={{ width: '100%', fontSize: '0.8125rem', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--surface-primary)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCorrection}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--brand-teal)',
                    color: '#FFFFFF',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {savingCorrection ? 'Saving Correction...' : 'Commit Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
