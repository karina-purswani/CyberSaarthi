import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import { fetchCitizenMetrics, getCurrentUser } from '../services/api';
import type { CitizenMetrics } from '../types';

export const CitizenDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<CitizenMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = getCurrentUser();

  useEffect(() => {
    fetchCitizenMetrics()
      .then(data => setMetrics(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading your complaint portfolio...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          Could not load dashboard information: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '1.5rem auto 3rem', padding: '0 1.5rem' }}>
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src="/favicon.png"
            alt="CyberSaarthi Logo"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              objectFit: 'contain',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-light)',
              backgroundColor: '#FFFFFF',
              padding: '2px'
            }}
          />
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Welcome, {user?.full_name || 'Citizen'}
            </h1>
            <p style={{ fontSize: '0.84375rem', color: 'var(--text-secondary)' }}>
              Citizen Case Management &amp; Evidence Intelligence Dashboard
            </p>
          </div>
        </div>

        <Link
          to="/citizen/new"
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
            textDecoration: 'none',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <PlusCircle size={16} />
          <span>File New Incident</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Total Complaints
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {metrics.total_complaints}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Awaiting Review
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#D97706' }}>
            {metrics.awaiting_review}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Under Investigation
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563EB' }}>
            {metrics.in_progress}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Verified / Closed
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>
            {metrics.verified_or_resolved}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Reported Loss
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            ₹{metrics.total_reported_loss.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Cyber Safety Guide Card */}
      <div
        style={{
          backgroundColor: 'var(--brand-subtle)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            backgroundColor: 'var(--brand-teal)',
            color: '#FFFFFF',
            padding: '0.6rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--brand-teal)', marginBottom: '0.2rem' }}>
              Citizen Cybercrime Prevention &amp; Safety Guide
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', maxWidth: '580px', lineHeight: 1.45 }}>
              Protect yourself from UPI collect frauds, deceptive QR codes, phishing links, and remote-access traps.
              Review actionable safety checklists and emergency Golden Hour steps.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <a
            href="tel:1930"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <PhoneCall size={13} />
            <span>Emergency 1930</span>
          </a>

          <Link
            to="/citizen/guide"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              padding: '0.55rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <span>Explore Safety Guide</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Recent Complaints Section */}
      <div style={{
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Your Recent Incident Reports
          </h2>
          {metrics.total_complaints > 0 && (
            <Link
              to="/citizen/complaints"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-teal)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
            >
              <span>View All Submissions</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {metrics.recent_complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No Complaints Submitted Yet
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
              You have not registered any cybercrime incidents under this account.
              If you have been a victim of financial cyber fraud, register your case to extract receipt evidence.
            </p>
            <Link
              to="/citizen/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <PlusCircle size={14} />
              <span>Submit First Incident Report</span>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Case Reference</th>
                  <th>Category</th>
                  <th>Claimed Amount</th>
                  <th>Status</th>
                  <th>Submission Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent_complaints.map(item => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-teal)' }}>
                        {item.reference_id}
                      </span>
                    </td>
                    <td>{item.incident_type}</td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>
                      {item.reported_amount ? `₹${item.reported_amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: item.status === 'VERIFIED' ? '#ECFDF5' : item.status === 'AWAITING_REVIEW' ? '#FFFBEB' : '#EFF6FF',
                        color: item.status === 'VERIFIED' ? '#065F46' : item.status === 'AWAITING_REVIEW' ? '#92400E' : '#1E40AF',
                        border: `1px solid ${item.status === 'VERIFIED' ? '#A7F3D0' : item.status === 'AWAITING_REVIEW' ? '#FDE68A' : '#BFDBFE'}`
                      }}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {new Date(item.submission_time).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        to={`/citizen/complaints/${item.id}`}
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--brand-teal)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: 'none'
                        }}
                      >
                        <span>Track Status</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
