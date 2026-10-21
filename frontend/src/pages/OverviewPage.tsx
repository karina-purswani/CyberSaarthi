import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Inbox, 
  AlertTriangle, 
  Network, 
  IndianRupee, 
  Clock, 
  ArrowRight, 
  Sparkles,
  ExternalLink 
} from 'lucide-react';
import { fetchOverviewMetrics, fetchDemoCases } from '../services/api';
import type { OverviewMetrics, DemoCase } from '../types';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { DisclaimerNotice } from '../components/DisclaimerNotice';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [demoCases, setDemoCases] = useState<DemoCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchOverviewMetrics(), fetchDemoCases()])
      .then(([m, d]) => {
        setMetrics(m);
        setDemoCases(d.scenarios);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading live investigation intelligence metrics...
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B' }}>
        Failed to load overview data: {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* Page Title & Context */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Operational Triage & Intelligence Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Live metrics aggregated from stored complaints, OCR evidence extractions, and indicator linking rules.
          </p>
        </div>

        <Link
          to="/officer/queue"
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
            textDecoration: 'none'
          }}
        >
          <span>Open Complaint Queue</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Demo environment banner */}
      <DisclaimerNotice
        type="demo"
        customMessage="This instance contains synthetic demonstration records covering exact match, amount discrepancy, missing UTR, and shared syndicate UPI links for hackathon evaluation."
      />

      {/* Primary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem'
        }}
      >
        <StatCard
          label="Total Intake Records"
          value={metrics.total_complaints}
          subtext="Indexed citizen incidents"
          icon={<Inbox size={20} />}
          onClick={() => navigate('/officer/queue')}
        />
        <StatCard
          label="Awaiting Officer Triage"
          value={metrics.awaiting_review}
          subtext="Pending verification review"
          icon={<Clock size={20} />}
          accent="amber"
          onClick={() => navigate('/officer/queue?status=AWAITING_REVIEW')}
        />
        <StatCard
          label="Evidence Discrepancies"
          value={metrics.evidence_needing_manual_review}
          subtext="Amount or ID conflicts detected"
          icon={<AlertTriangle size={20} />}
          accent="red"
          onClick={() => navigate('/officer/queue?filter=discrepancies')}
        />
        <StatCard
          label="Shared Indicator Leads"
          value={metrics.complaints_with_shared_indicators}
          subtext="Complaints linked by common UPI/Phone"
          icon={<Network size={20} />}
          accent="teal"
          onClick={() => navigate('/officer/graph')}
        />
        <StatCard
          label="Reported Financial Impact"
          value={`₹${metrics.total_amount_reported.toLocaleString('en-IN')}`}
          subtext="Cumulative alleged loss"
          icon={<IndianRupee size={20} />}
        />
      </div>

      {/* Quick Judge Evaluation Guide: Fictional Test Scenarios */}
      {demoCases.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-teal)', marginBottom: '0.65rem' }}>
            <Sparkles size={16} />
            Pre-Configured Demonstration Test Scenarios
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Judges can click any scenario below to immediately inspect the specific verification finding or cross-complaint link:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {demoCases.map((sc, index) => (
              <div
                key={sc.id}
                onClick={() => navigate(`/officer/complaints/${sc.id}`)}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--surface-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78125rem', fontWeight: 700, color: 'var(--brand-teal)' }}>
                      {sc.reference_id}
                    </span>
                    <Badge status={sc.priority} size="sm" />
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Scenario {index + 1}: {sc.incident_type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {sc.expected_scenario}
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-teal)' }}>
                  <span>Inspect Case</span>
                  <ExternalLink size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Submissions Table */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Recent Incident Submissions
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing latest {metrics.recent_submissions.length} reports
            </div>
          </div>
          <Link
            to="/officer/queue"
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--brand-teal)' }}
          >
            View all records →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Reference ID</th>
                <th>Category</th>
                <th>Reported Amount</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-teal)' }}>
                      {sub.reference_id}
                    </span>
                    {sub.is_demo && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '0.1rem 0.3rem', borderRadius: '2px' }}>
                        DEMO
                      </span>
                    )}
                  </td>
                  <td>{sub.incident_type}</td>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {sub.reported_amount ? `₹${sub.reported_amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td>
                    <Badge status={sub.priority} size="sm" />
                  </td>
                  <td>
                    <Badge status={sub.status} size="sm" />
                  </td>
                  <td style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)' }}>
                    {new Date(sub.submission_time).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      to={`/officer/complaints/${sub.id}`}
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--brand-teal)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <span>Review</span>
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
