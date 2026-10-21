import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { fetchComplaints, fetchComplaintDetail, fetchEvidenceDetail } from '../services/api';
import type { ComplaintSummary, ComplaintDetail, EvidenceFile } from '../types';
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

  // When selectedComplaintId changes, load case details
  useEffect(() => {
    if (!selectedComplaintId) return;
    setLoading(true);
    fetchComplaintDetail(selectedComplaintId)
      .then(res => {
        setCaseDetail(res);
        if (res.evidence_files.length > 0) {
          const matchEv = res.evidence_files.find(e => e.id === selectedEvidenceId);
          setSelectedEvidenceId(matchEv ? matchEv.id : res.evidence_files[0].id);
        } else {
          setSelectedEvidenceId('');
          setEvidenceData(null);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedComplaintId]);

  // When selectedEvidenceId changes, fetch specific evidence details
  useEffect(() => {
    if (!selectedEvidenceId) return;
    fetchEvidenceDetail(selectedEvidenceId)
      .then(res => setEvidenceData(res))
      .catch(() => {});
  }, [selectedEvidenceId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      
      {/* Top Header & Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Evidence Extraction & Discrepancy Inspection
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Side-by-side inspection of citizen payment screenshots alongside raw OCR tokens and normalized fields.
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
            style={{ fontSize: '0.8125rem', minWidth: '220px' }}
          >
            {complaints.map(c => (
              <option key={c.id} value={c.id}>
                {c.reference_id} — {c.incident_type} {c.reported_amount ? `(₹${c.reported_amount.toLocaleString()})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading case evidence...
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
                    src={`/api/evidence/file/${evidenceData.storage_filename}`}
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
                    href={`/api/evidence/file/${evidenceData.storage_filename}`}
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
              
              {/* Structured Extracted Tokens */}
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
                    Structured Entity Extraction
                  </h3>
                  <ProvenancePill origin="ocr" label="RapidOCR + Parser" />
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
                          {vf.evidence_value || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Not detected in receipt</span>}
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Complainant Claimed: <strong>{vf.complaint_value || 'Omitted'}</strong>
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
                  flex: 1,
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
                  Preserved raw text string returned by the optical character recognition model for full source traceability.
                </div>

                <pre
                  style={{
                    flex: 1,
                    backgroundColor: '#F8F9FA',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78125rem',
                    color: '#1F2937',
                    lineHeight: 1.5,
                    overflowY: 'auto',
                    maxHeight: '220px',
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

    </div>
  );
};
