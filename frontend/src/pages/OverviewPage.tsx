import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Inbox, 
  AlertTriangle, 
  Network, 
  IndianRupee, 
  Clock, 
  ArrowRight, 
  Layers, 
  FileCheck 
} from 'lucide-react';
import { fetchOverviewMetrics } from '../services/api';
import type { OverviewMetrics } from '../types';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewMetrics()
      .then((m) => {
        setMetrics(m);
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

      {/* Operational Highlights Card */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--brand-teal)" />
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Quick Investigation Actions & Priority Queues
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-time triage filters
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div
            onClick={() => navigate('/officer/queue?filter=discrepancies')}
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #FECACA',
              backgroundColor: '#FEF2F2',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#991B1B', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                <AlertTriangle size={16} />
                <span>Evidence Discrepancy Queue</span>
              </div>
              <div style={{ fontSize: '0.78125rem', color: '#7F1D1D', lineHeight: 1.4 }}>
                {metrics.evidence_needing_manual_review} case(s) where OCR extracted receipt amounts or transaction IDs conflict with complainant statements.
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Filter Discrepancies</span>
              <ArrowRight size={12} />
            </div>
          </div>

          <div
            onClick={() => navigate('/officer/graph')}
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #CCFBF1',
              backgroundColor: '#F0FDFA',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0F766E', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                <Network size={16} />
                <span>Multi-Victim Syndicate Links</span>
              </div>
              <div style={{ fontSize: '0.78125rem', color: '#115E59', lineHeight: 1.4 }}>
                {metrics.complaints_with_shared_indicators} case(s) sharing common suspect UPI handles, telephone numbers, or beneficiary accounts.
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: '#0F766E', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Open Intelligence Graph</span>
              <ArrowRight size={12} />
            </div>
          </div>

          <div
            onClick={() => navigate('/officer/reports')}
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                <FileCheck size={16} color="var(--brand-teal)" />
                <span>Investigation Reports</span>
              </div>
              <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Generate printable Section 65B-ready evidence dossiers and bank debit freeze requisition notices.
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-teal)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Generate Reports</span>
              <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>

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
              Showing latest {metrics.recent_submissions.length} reports from database
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
