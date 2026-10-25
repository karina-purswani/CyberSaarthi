import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileSearch, Network, UserCheck, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <img
            src="/favicon.png"
            alt="CyberSaarthi Logo"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: 'var(--radius-lg)',
              objectFit: 'contain',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.15)'
            }}
          />
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: 'var(--brand-subtle)',
          color: 'var(--brand-teal)',
          padding: '0.35rem 0.85rem',
          borderRadius: '999px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          marginBottom: '1.25rem'
        }}>
          <Shield size={14} />
          Civic-Tech Cybercrime Evidence Intelligence
        </div>
        
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
          marginBottom: '1rem'
        }}>
          From Fragmented Evidence to <span style={{ color: 'var(--brand-teal)' }}>Traceable Intelligence</span>
        </h1>
        
        <p style={{
          fontSize: '1.125rem',
          color: 'var(--text-secondary)',
          maxWidth: '750px',
          margin: '0 auto 2rem',
          lineHeight: 1.6
        }}>
          CyberSaarthi assists cyber units and victims by extracting transactional tokens from payment receipts,
          running deterministic consistency verifications, and building cross-complaint relationship graphs to connect isolated frauds.
        </p>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/citizen/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              padding: '0.85rem 1.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span>Citizen Portal — File or Track</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/officer/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--surface-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              padding: '0.85rem 1.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <UserCheck size={16} color="var(--brand-teal)" />
            <span>Officer Investigation Workspace</span>
          </Link>
        </div>
      </section>

      {/* Statutory Helpline Alert Banner */}
      <div style={{
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        marginBottom: '3rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem'
      }}>
        <AlertTriangle size={20} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.84375rem', color: '#92400E', lineHeight: 1.5 }}>
          <strong>Statutory Emergency Notice:</strong> CyberSaarthi is a technical evidence analysis and investigation-support platform.
          It does not replace official police reporting. If you have lost money to cyber-fraud within the last 24 hours,
          immediately dial the <strong>National Cyber Crime Helpline at 1930</strong> or register at{' '}
          <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: '#B45309', textDecoration: 'underline', fontWeight: 600 }}>
            cybercrime.gov.in
          </a>{' '}
          to initiate bank account freezing.
        </div>
      </div>

      {/* Core Architectural Capabilities */}
      <section style={{ marginBottom: '3.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', textAlign: 'center' }}>
          Core Forensic &amp; Verification Architecture
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--brand-subtle)',
              color: 'var(--brand-teal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <FileSearch size={20} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Local RapidOCR Extraction
            </h3>
            <p style={{ fontSize: '0.84375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Runs CPU-optimized ONNX Optical Character Recognition locally to extract amounts, UPI handles, UTR numbers, and payment app names without sending citizen receipts to third-party cloud APIs.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={20} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              6-State Consistency Verification
            </h3>
            <p style={{ fontSize: '0.84375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Executes deterministic decimal math and identifier normalization to detect exact matches, amount conflicts, or missing fields between victim claims and receipt evidence.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Network size={20} />
            </div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Cross-Complaint Intelligence Graph
            </h3>
            <p style={{ fontSize: '0.84375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Automatically clusters shared suspect indicators (UPI VPAs, bank transaction references, contact numbers) across isolated complaints, generating traceable investigative leads.
            </p>
          </div>
        </div>
      </section>

      {/* Role Segregation Overview */}
      <section style={{
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-teal)', letterSpacing: '0.04em' }}>
                CITIZEN ACCESS
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Citizen Intake &amp; Case Tracking Portal
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="var(--brand-teal)" />
                Direct voice statement recording in English, Hindi, and Marathi
              </li>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="var(--brand-teal)" />
                Editable speech-to-text review before submission
              </li>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="var(--brand-teal)" />
                Track verification status of your own submitted complaints
              </li>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="var(--brand-teal)" />
                Complete privacy: your records are never exposed to other citizens
              </li>
            </ul>
            <Link
              to="/citizen/login"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--brand-teal)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Sign in to Citizen Portal</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#1E40AF', letterSpacing: '0.04em' }}>
                LAW ENFORCEMENT ACCESS
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Authorized Officer Workspace
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#1E40AF" />
                Filterable complaint triage queue with discrepancy indicators
              </li>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#1E40AF" />
                Side-by-side OCR receipt inspection and manual field correction
              </li>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#1E40AF" />
                Interactive intelligence graph linking multi-victim fraud syndicates
              </li>
              <li style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#1E40AF" />
                Exportable investigation dossiers with provenance audit trails
              </li>
            </ul>
            <Link
              to="/officer/login"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1E40AF',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Sign in to Officer Workspace</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
