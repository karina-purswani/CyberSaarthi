import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { previewImportComplaints, executeImportComplaints } from '../services/api';
import type { ImportPreviewResponse, ImportExecuteResponse } from '../types';

export const ImportPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [executingImport, setExecutingImport] = useState(false);
  const [importResult, setImportResult] = useState<ImportExecuteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage(null);
    setLoadingPreview(true);

    try {
      const res = await previewImportComplaints(file);
      setPreviewData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse and validate import file.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData) return;
    setExecutingImport(true);
    setErrorMessage(null);

    // Filter valid records from preview
    const validRecords = previewData.preview
      .filter(r => r.is_valid && (!skipDuplicates || !r.is_duplicate))
      .map(r => r.data);

    if (validRecords.length === 0) {
      setErrorMessage('No valid records available to import.');
      setExecutingImport(false);
      return;
    }

    try {
      const result = await executeImportComplaints({
        records: validRecords,
        skip_duplicates: skipDuplicates
      });
      setImportResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Import execution failed.');
    } finally {
      setExecutingImport(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Persistent Batch Ingestion & Import
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Upload authentic structured complaints via CSV or JSON. Records are verified, persisted to SQLite, and automatically linked into the cross-intelligence graph.
          </p>
        </div>

        <button
          onClick={() => setShowFormatGuide(!showFormatGuide)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--brand-teal)',
            cursor: 'pointer'
          }}
        >
          <HelpCircle size={15} />
          <span>{showFormatGuide ? 'Hide Format Guide' : 'Accepted Format Guide'}</span>
        </button>
      </div>

      {/* Accepted Format Guide Dropdown */}
      {showFormatGuide && (
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)'
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--brand-teal)' }}>
            Structured Import Schema Specification
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <strong>Required Fields:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                <li><code>incident_type</code>: Phishing, UPI Fraud, Job Scam, Investment, etc.</li>
                <li><code>description</code>: Narrative statement describing the incident.</li>
              </ul>
              <strong style={{ marginTop: '0.5rem', display: 'block' }}>Optional Fields:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                <li><code>reported_amount</code>: Numerical amount lost (e.g. 15000 or 15000.50).</li>
                <li><code>reported_upi_id</code>: Suspect VPA handle (e.g. fraudster@ybl).</li>
                <li><code>reported_txn_id</code>: UTR / Bank transaction ID (12-character UTR).</li>
                <li><code>victim_phone</code>: 10-digit citizen mobile number.</li>
                <li><code>victim_state</code>: Jurisdiction / State name.</li>
                <li><code>priority</code>: HIGH, MEDIUM, or LOW.</li>
                <li><code>language</code>: en, hi, or mr.</li>
              </ul>
            </div>
            <div>
              <strong>Sample JSON Structure:</strong>
              <pre style={{ backgroundColor: 'var(--surface-subtle)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.71875rem', overflowX: 'auto', border: '1px solid var(--border-light)' }}>
{`[
  {
    "incident_type": "UPI Fraud",
    "description": "Unauthorized debit via deceptive link",
    "reported_amount": 24500,
    "reported_upi_id": "scam.target@upi",
    "reported_txn_id": "492019384729",
    "victim_phone": "9876543210",
    "victim_state": "Maharashtra",
    "priority": "HIGH"
  }
]`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Upload Dropzone (if not previewed yet and no result) */}
      {!previewData && !importResult && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '2px dashed var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            accept=".csv,text/csv,.json,application/json"
            style={{ display: 'none' }}
          />

          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-teal)' }}>
            <UploadCloud size={30} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Drag & Drop your CSV or JSON complaint file here
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Or click to browse your computer. Maximum file size: 10 MB.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.35rem 0.65rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <FileSpreadsheet size={14} color="#059669" />
              <span>Comma Separated (.csv)</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.35rem 0.65rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <FileCode size={14} color="#2563EB" />
              <span>JSON Array (.json)</span>
            </span>
          </div>

          {loadingPreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-teal)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <RefreshCw size={14} className="spin" />
              <span>Validating and inspecting records...</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Validation Preview Screen */}
      {previewData && !importResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* File summary and metrics */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                File Inspection Preview
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {selectedFile?.name} ({previewData.format.toUpperCase()})
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{previewData.total_records}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Total Records</div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', backgroundColor: '#ECFDF5', borderRadius: 'var(--radius-md)', color: '#065F46' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{previewData.valid_records}</div>
                <div style={{ fontSize: '0.6875rem' }}>Valid</div>
              </div>

              {previewData.duplicate_records > 0 && (
                <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', backgroundColor: '#FFFBEB', borderRadius: 'var(--radius-md)', color: '#92400E' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{previewData.duplicate_records}</div>
                  <div style={{ fontSize: '0.6875rem' }}>Duplicates</div>
                </div>
              )}

              {previewData.error_records > 0 && (
                <div style={{ textAlign: 'center', padding: '0.4rem 0.75rem', backgroundColor: '#FEF2F2', borderRadius: 'var(--radius-md)', color: '#991B1B' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{previewData.error_records}</div>
                  <div style={{ fontSize: '0.6875rem' }}>Errors</div>
                </div>
              )}
            </div>
          </div>

          {/* Action and options bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              <span>Skip duplicate records with existing reference IDs</span>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleReset}
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-light)',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel / Choose Another
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={executingImport || previewData.valid_records === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'var(--brand-teal)',
                  color: '#FFFFFF',
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: executingImport || previewData.valid_records === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <span>{executingImport ? 'Persisting Records...' : 'Proceed with Ingestion'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Table of inspected preview records */}
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-light)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Row-Level Validation Preview
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Row</th>
                    <th style={{ width: '130px' }}>Validation</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Suspect UPI / Txn</th>
                    <th>Narrative Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview.map((rec) => (
                    <tr key={rec.row_number} style={{ backgroundColor: !rec.is_valid ? '#FEF2F2' : rec.is_duplicate ? '#FFFBEB' : undefined }}>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{rec.row_number}</td>
                      <td>
                        {rec.is_valid ? (
                          rec.is_duplicate ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#B45309', fontSize: '0.75rem', fontWeight: 600 }}>
                              <AlertTriangle size={13} />
                              <span>Duplicate</span>
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>
                              <CheckCircle2 size={13} />
                              <span>Valid</span>
                            </span>
                          )
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626', fontSize: '0.75rem', fontWeight: 600 }}>
                              <XCircle size={13} />
                              <span>Invalid</span>
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#991B1B' }}>
                              {rec.errors.join('; ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{rec.data.incident_type || '—'}</td>
                      <td className="tabular-nums">
                        {rec.data.reported_amount != null ? `₹${Number(rec.data.reported_amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        <div>{rec.data.reported_upi_id || '—'}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{rec.data.reported_txn_id || ''}</div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.data.description || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Step 3: Import Outcome Report */}
      {importResult && (
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Import Transaction Completed
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Records have been persistently written to SQLite, verification checks triggered, and graph relationships indexed.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065F46' }}>{importResult.imported}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857' }}>Successfully Ingested</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400E' }}>{importResult.skipped}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309' }}>Skipped (Duplicates)</div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991B1B' }}>{importResult.rejected}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B91C1C' }}>Rejected (Validation Fail)</div>
            </div>
          </div>

          {importResult.reference_ids.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Created Complaint Reference IDs:
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {importResult.reference_ids.map((refId, idx) => {
                  const caseId = importResult.created_ids[idx];
                  return (
                    <Link
                      key={refId}
                      to={`/officer/complaints/${caseId}`}
                      style={{
                        padding: '0.35rem 0.65rem',
                        backgroundColor: 'var(--surface-subtle)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--brand-teal)',
                        textDecoration: 'none'
                      }}
                    >
                      {refId} &rarr;
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Link
              to="/officer/queue"
              style={{
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.55rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              View in Complaint Queue
            </Link>

            <button
              onClick={handleReset}
              style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                padding: '0.55rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Import Another File
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
