import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, FileText, Sparkles, Mic } from 'lucide-react';
import { submitComplaint, fetchDemoCases } from '../services/api';
import type { DemoCase } from '../types';

export const IntakePage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [incidentType, setIncidentType] = useState('UPI Fraud');
  const [description, setDescription] = useState('');
  const [reportedAmount, setReportedAmount] = useState('');
  const [reportedTxnId, setReportedTxnId] = useState('');
  const [reportedUpiId, setReportedUpiId] = useState('');
  const [incidentDatetime, setIncidentDatetime] = useState('');
  const [victimPhone, setVictimPhone] = useState('');
  const [victimState, setVictimState] = useState('');
  
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [demoScenarios, setDemoScenarios] = useState<DemoCase[]>([]);

  useEffect(() => {
    fetchDemoCases()
      .then(res => setDemoScenarios(res.scenarios))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEvidenceFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleLoadScenario = (sc: DemoCase) => {
    setLanguage(sc.language as any || 'en');
    setIncidentType(sc.incident_type);
    setDescription(sc.description);
    setReportedAmount(sc.reported_amount ? sc.reported_amount.toString() : '');
    setReportedTxnId(sc.reported_txn_id || '');
    setReportedUpiId(sc.reported_upi_id || '');
    setIncidentDatetime(sc.incident_datetime || '');
    setVictimPhone(sc.victim_phone || '');
    setVictimState(sc.victim_state || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe the incident in your own words.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('language', language);
    formData.append('incident_type', incidentType);
    formData.append('description', description);
    if (reportedAmount) formData.append('reported_amount', reportedAmount);
    if (reportedTxnId) formData.append('reported_txn_id', reportedTxnId);
    if (reportedUpiId) formData.append('reported_upi_id', reportedUpiId);
    if (incidentDatetime) formData.append('incident_datetime', incidentDatetime);
    if (victimPhone) formData.append('victim_phone', victimPhone);
    if (victimState) formData.append('victim_state', victimState);
    if (evidenceFile) formData.append('evidence_file', evidenceFile);

    try {
      const res = await submitComplaint(formData);
      setSuccessData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Multilingual translations for labels
  const t = {
    title: language === 'hi' ? 'साइबर धोखाधड़ी घटना रिपोर्ट' : language === 'mr' ? 'सायबर फसवणूक घटना तक्रार' : 'Report Cyber-Fraud Incident',
    subtitle: language === 'hi' 
      ? 'अपने भुगतान स्क्रीनशॉट और लेन-देन का विवरण सुरक्षित रूप से दर्ज करें।' 
      : language === 'mr' 
      ? 'आपले पेमेंट स्क्रीनशॉट आणि व्यवहार तपशील सुरक्षितपणे नोंदवा.' 
      : 'Submit your payment screenshots, transaction messages, and incident details for automated verification and triage.',
    descLabel: language === 'hi' ? 'घटना का विवरण *' : language === 'mr' ? 'घटनेचे वर्णन *' : 'Incident Narrative Statement *',
    descPlaceholder: language === 'hi' 
      ? 'धोखाधड़ी कैसे हुई, क्या कहा गया था, विस्तार से लिखें...' 
      : language === 'mr' 
      ? 'फसवणूक कशी झाली, काय सांगण्यात आले होते, ते सविस्तर लिहा...' 
      : 'Explain what occurred, who contacted you, what payment method was requested...',
    amountLabel: language === 'hi' ? 'खोई गई राशि (₹) (वैकल्पिक)' : language === 'mr' ? 'नुकसान झालेली रक्कम (₹) (पर्यायी)' : 'Lost / Transferred Amount (₹) (Optional)',
    upiLabel: language === 'hi' ? 'संदिग्ध UPI आईडी (वैकल्पिक)' : language === 'mr' ? 'संशयित UPI आयडी (पर्यायी)' : 'Suspect UPI ID / VPA (Optional)',
    txnLabel: language === 'hi' ? 'ट्रांजैक्शन / UTR नंबर (वैकल्पिक)' : language === 'mr' ? 'व्यवहार / UTR क्रमांक (पर्यायी)' : 'Transaction Reference / UTR (Optional)',
    submitBtn: language === 'hi' ? 'तक्रार सबमिट करें' : language === 'mr' ? 'तक्रार दाखल करा' : 'Submit Evidence for Verification'
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Top Banner */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {t.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '650px' }}>
              {t.subtitle}
            </p>
          </div>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface-subtle)', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Language:</span>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: language === 'en' ? 700 : 500,
                backgroundColor: language === 'en' ? 'var(--surface-primary)' : 'transparent',
                color: language === 'en' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                boxShadow: language === 'en' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: language === 'hi' ? 700 : 500,
                backgroundColor: language === 'hi' ? 'var(--surface-primary)' : 'transparent',
                color: language === 'hi' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                boxShadow: language === 'hi' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('mr')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: language === 'mr' ? 700 : 500,
                backgroundColor: language === 'mr' ? 'var(--surface-primary)' : 'transparent',
                color: language === 'mr' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                boxShadow: language === 'mr' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              मराठी
            </button>
          </div>
        </div>

        {/* Quick Scenario Loader Bar for Hackathon Judges */}
        {demoScenarios.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78125rem', fontWeight: 600, color: 'var(--brand-teal)', marginBottom: '0.5rem' }}>
              <Sparkles size={14} />
              Evaluation Presets (Pre-load test scenarios for instant demonstration):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {demoScenarios.map((sc, i) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleLoadScenario(sc)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-subtle)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  title={sc.expected_scenario}
                >
                  Scenario {i + 1}: {sc.incident_type} {sc.reported_amount ? `(₹${sc.reported_amount.toLocaleString()})` : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Modal / Card */}
      {successData && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem 2rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#065F46', marginBottom: '0.25rem' }}>
                Incident Registered Successfully
              </h2>
              <p style={{ color: '#047857', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                Your report has been received and indexed under official tracking reference:
              </p>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #6EE7B7',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: '#065F46',
                  marginBottom: '1rem'
                }}
              >
                {successData.reference_id}
              </div>

              {successData.evidence && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1FAE5',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    fontSize: '0.8125rem',
                    color: '#065F46',
                    marginBottom: '1rem'
                  }}
                >
                  <strong>Automated Evidence Pipeline Result:</strong>
                  <div style={{ marginTop: '0.35rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>OCR Status: <strong>{successData.evidence.ocr_status}</strong></div>
                    <div>Engine: <strong>{successData.evidence.ocr_engine}</strong></div>
                    {successData.evidence.extracted_fields?.amount && (
                      <div>Detected Amount: <strong>₹{successData.evidence.extracted_fields.amount.normalized}</strong></div>
                    )}
                    {successData.evidence.extracted_fields?.txn_id && (
                      <div>Detected UTR: <strong>{successData.evidence.extracted_fields.txn_id.normalized}</strong></div>
                    )}
                    {successData.evidence.extracted_fields?.upi_id && (
                      <div>Detected UPI: <strong>{successData.evidence.extracted_fields.upi_id.normalized}</strong></div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/officer/complaints/${successData.complaint_id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'var(--brand-teal)',
                    color: '#FFFFFF',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <span>Open in Officer Workspace</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessData(null);
                    setDescription('');
                    setReportedAmount('');
                    setReportedTxnId('');
                    setReportedUpiId('');
                    setEvidenceFile(null);
                    setPreviewUrl(null);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.75rem' }}>
          
          {/* Left Column: Incident narrative & details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Incident Category *
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="UPI Fraud">UPI Fraud / QR Code Scam</option>
                    <option value="Investment Scam">Investment Scam / Fake Part-time Jobs</option>
                    <option value="Phishing / Identity Theft">Phishing / Customer Care Impersonation</option>
                    <option value="Loan App Extortion">Instant Loan App Harassment</option>
                    <option value="Other">Other Financial Cyber Fraud</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Incident Date / Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={incidentDatetime}
                    onChange={(e) => setIncidentDatetime(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  {t.descLabel}
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descPlaceholder}
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  <FileText size={12} />
                  You may write in English, Hindi (हिंदी), or Marathi (मराठी).
                </div>
              </div>
            </div>

            {/* Structured Financial Details (Explicitly Optional) */}
            <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Optional Transaction Details (If Known)
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Fill only what you remember. Our deterministic engine compares these against your receipt.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    {t.amountLabel}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 25000"
                    value={reportedAmount}
                    onChange={(e) => setReportedAmount(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    {t.upiLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. suspect@okhdfcbank"
                    value={reportedUpiId}
                    onChange={(e) => setReportedUpiId(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    {t.txnLabel}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI309819283741 or UTR number"
                    value={reportedTxnId}
                    onChange={(e) => setReportedTxnId(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    State / Jurisdiction (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra, Delhi..."
                    value={victimState}
                    onChange={(e) => setVictimState(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Contact Mobile Number (Optional - for case follow-up only)
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={victimPhone}
                onChange={(e) => setVictimPhone(e.target.value)}
                style={{ width: '100%', maxWidth: '300px' }}
              />
              <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Never enter bank account passwords, UPI MPINs, or OTPs. CyberSaarthi never asks for credentials.
              </div>
            </div>

          </div>

          {/* Right Column: Evidence Upload and Previews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Supporting Evidence
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Upload payment app receipt screenshot, SMS confirmation, or bank statement image.
              </p>

              <div
                style={{
                  border: '2px dashed var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--surface-subtle)',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('evidence-upload-input')?.click()}
              >
                <UploadCloud size={32} color="var(--brand-teal)" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontSize: '0.84375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Click to choose file
                </div>
                <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  PNG, JPG, WEBP, MP3 or WAV (Max 15MB)
                </div>
                <input
                  id="evidence-upload-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,audio/mp3,audio/wav"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {evidenceFile && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                      {evidenceFile.name}
                    </div>
                    <span style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
                      {(evidenceFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>

                  {previewUrl && (
                    <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <img
                        src={previewUrl}
                        alt="Evidence Preview"
                        style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', backgroundColor: '#FFFFFF', display: 'block' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Voice statement note */}
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#EFF6FF', borderRadius: 'var(--radius-md)', border: '1px solid #BFDBFE', fontSize: '0.75rem', color: '#1E40AF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  <Mic size={13} />
                  Voice Statements Supported
                </div>
                Victims can upload audio clips (.mp3, .wav) containing spoken complaints.
              </div>
            </div>

            {/* Submission Actions */}
            {errorMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.85rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Running Evidence Pipeline...' : t.submitBtn}
            </button>

            <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
              By submitting, your evidence is evaluated through local deterministic consistency algorithms and indexed for authorized officer triage.
            </div>

          </div>

        </div>
      </form>
    </div>
  );
};
