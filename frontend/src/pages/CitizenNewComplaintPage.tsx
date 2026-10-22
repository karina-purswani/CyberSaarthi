import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { submitComplaint } from '../services/api';
import { VoiceRecorder } from '../components/VoiceRecorder';

const INCIDENT_CATEGORIES = [
  'UPI Fraud',
  'Telegram / Work From Home Task Scam',
  'Fake Electricity Bill Disconnection Threat',
  'Impersonation Phishing (Bank / Police / Courier)',
  'Fake Customer Care Number Scam',
  'Investment / Part-time Job Scam',
  'Lottery / Prize Claim Scam',
  'Unauthorized SIM Swap / OTP Fraud',
  'Other Cyber-Fraud Incident'
];

export const CitizenNewComplaintPage: React.FC = () => {

  // Multi-lingual state
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');

  // Form Fields
  const [incidentType, setIncidentType] = useState(INCIDENT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [reportedAmount, setReportedAmount] = useState('');
  const [reportedUpi, setReportedUpi] = useState('');
  const [reportedTxn, setReportedTxn] = useState('');
  const [victimPhone, setVictimPhone] = useState('');
  const [victimState, setVictimState] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    reference_id: string;
    complaint_id: string;
    status: string;
  } | null>(null);

  const handleVoiceTranscription = (transcript: string) => {
    // Append or replace description with reviewed transcript
    setDescription(prev => (prev ? `${prev} ${transcript}` : transcript));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setError('Selected file exceeds the maximum 15MB limit.');
        return;
      }
      setEvidenceFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide an incident statement either by speaking or typing.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('language', language);
    formData.append('incident_type', incidentType);
    formData.append('description', description);
    if (reportedAmount) formData.append('reported_amount', reportedAmount);
    if (reportedUpi) formData.append('reported_upi_id', reportedUpi.trim());
    if (reportedTxn) formData.append('reported_txn_id', reportedTxn.trim());
    if (victimPhone) formData.append('victim_phone', victimPhone.trim());
    if (victimState) formData.append('victim_state', victimState.trim());
    if (evidenceFile) formData.append('evidence_file', evidenceFile);

    try {
      const res = await submitComplaint(formData);
      setSubmissionSuccess({
        reference_id: res.reference_id,
        complaint_id: res.complaint_id,
        status: res.status
      });
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Complaint submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={32} />
          </div>

          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Incident Evidence Registered Successfully
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Your statement and evidence have been processed by the local verification engine and indexed for authorized triage.
          </p>

          <div style={{
            backgroundColor: 'var(--surface-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '2rem'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
              Official Tracking Reference ID
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--brand-teal)' }}>
              {submissionSuccess.reference_id}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Please quote this reference in all future correspondence with cyber units.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link
              to={`/citizen/complaints/${submissionSuccess.complaint_id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>View Submitted Complaint</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              to="/citizen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--surface-primary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)',
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '2rem auto 4rem', padding: '0 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          File a Cyber-Fraud Incident Report
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Submit your spoken statement, written claim, and supporting payment app receipt screenshot.
        </p>
      </div>

      {/* Language Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        padding: '0.35rem',
        backgroundColor: 'var(--surface-subtle)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        width: 'fit-content'
      }}>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          style={{
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: language === 'en' ? 'var(--brand-teal)' : 'transparent',
            color: language === 'en' ? '#FFFFFF' : 'var(--text-secondary)'
          }}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage('hi')}
          style={{
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: language === 'hi' ? 'var(--brand-teal)' : 'transparent',
            color: language === 'hi' ? '#FFFFFF' : 'var(--text-secondary)'
          }}
        >
          हिन्दी (Hindi)
        </button>
        <button
          type="button"
          onClick={() => setLanguage('mr')}
          style={{
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: language === 'mr' ? 'var(--brand-teal)' : 'transparent',
            color: language === 'mr' ? '#FFFFFF' : 'var(--text-secondary)'
          }}
        >
          मराठी (Marathi)
        </button>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Step 1: Incident Classification */}
        <div style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            1. Incident Category
          </h2>
          <select
            value={incidentType}
            onChange={e => setIncidentType(e.target.value)}
            style={{ width: '100%', fontSize: '0.9375rem' }}
          >
            {INCIDENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Voice Input & Statement */}
        <div style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            2. Incident Statement (Speak or Type)
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Explain clearly how the cyber-fraud took place. You can speak directly into the microphone or type below.
          </p>

          {/* Interactive Microphone Recorder */}
          <VoiceRecorder
            language={language}
            onTranscriptionComplete={handleVoiceTranscription}
          />

          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
            Incident Description (Review &amp; Edit) *
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'कृपया बताएं कि क्या हुआ था (उदाहरण: बिजली काटने की धमकी देकर पैसे मांगे...)'
                : language === 'mr'
                ? 'नेमकी काय घटना घडली ते येथे नमूद करा...'
                : 'Describe how the fraud occurred, what message was received, and which accounts were targeted...'
            }
            style={{ width: '100%', fontSize: '0.9375rem', lineHeight: 1.5 }}
          />
        </div>

        {/* Step 3: Structured Claim Inputs */}
        <div style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            3. Transaction &amp; Claim Details (Optional)
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Provide known transaction details. These will be verified deterministically against your uploaded receipt.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Reported Loss Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={reportedAmount}
                onChange={e => setReportedAmount(e.target.value)}
                placeholder="e.g. 25000"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Suspect UPI Handle / VPA
              </label>
              <input
                type="text"
                value={reportedUpi}
                onChange={e => setReportedUpi(e.target.value)}
                placeholder="e.g. suspect.pay@okhdfcbank"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Transaction Ref / UTR
              </label>
              <input
                type="text"
                value={reportedTxn}
                onChange={e => setReportedTxn(e.target.value)}
                placeholder="e.g. UPI309819283741 or 12-digit UTR"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Contact Mobile Number
              </label>
              <input
                type="tel"
                value={victimPhone}
                onChange={e => setVictimPhone(e.target.value)}
                placeholder="10-digit number"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                State / Jurisdiction
              </label>
              <input
                type="text"
                value={victimState}
                onChange={e => setVictimState(e.target.value)}
                placeholder="e.g. Maharashtra, Delhi..."
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Step 4: Supporting Evidence Receipt Upload */}
        <div style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            4. Supporting Payment Receipt / Screenshot
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Upload Google Pay, PhonePe, Paytm, or bank transfer screenshot for local OCR extraction.
          </p>

          <label
            htmlFor="evidence-input"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1.5rem',
              border: '2px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-subtle)',
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={36} color="var(--brand-teal)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {evidenceFile ? evidenceFile.name : 'Click to select receipt screenshot'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              PNG, JPG, WEBP (Max 15MB)
            </div>
            <input
              id="evidence-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,audio/wav,audio/mp3"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Security and Consent Notice */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong>Privacy Guarantee:</strong> Evidence files are stored locally in sanitized storage with randomized UUID filenames.
          Never enter your UPI MPIN or bank passwords; CyberSaarthi will never ask for secret credentials.
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--brand-teal)',
            color: '#FFFFFF',
            padding: '0.85rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span>{submitting ? 'Running Local Extraction & Verification...' : 'Submit Incident for Local OCR & Verification'}</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};
