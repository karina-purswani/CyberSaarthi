import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, ArrowRight, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { fetchComplaints } from '../services/api';
import type { ComplaintSummary } from '../types';
import { Badge } from '../components/Badge';

export const QueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const categoryFilter = searchParams.get('incident_type') || '';
  const searchFilter = searchParams.get('search') || '';

  const loadData = () => {
    setLoading(true);
    fetchComplaints({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      incident_type: categoryFilter || undefined,
      search: searchFilter || undefined
    })
      .then(res => {
        setComplaints(res.items);
        setTotal(res.total);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, categoryFilter, searchFilter]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val);
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Complaint Queue & Case Triage
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
          Filter and inspect citizen incident reports with real-time discrepancy indicators.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search reference, description, UPI, or UTR..."
              value={searchFilter}
              onChange={(e) => updateParam('search', e.target.value)}
              style={{ width: '100%', paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => updateParam('status', e.target.value)}
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Review Statuses</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VERIFIED">Verified</option>
            <option value="FLAGGED_FOR_MANUAL_AUDIT">Flagged For Audit</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => updateParam('priority', e.target.value)}
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => updateParam('incident_type', e.target.value)}
            style={{ fontSize: '0.8125rem' }}
          >
            <option value="">All Categories</option>
            <option value="UPI Fraud">UPI Fraud</option>
            <option value="Investment Scam">Investment Scam</option>
            <option value="Phishing / Identity Theft">Phishing</option>
            <option value="Loan App Extortion">Loan App Extortion</option>
            <option value="Other">Other</option>
          </select>

          {(statusFilter || priorityFilter || categoryFilter || searchFilter) && (
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              style={{ fontSize: '0.8125rem', color: 'var(--brand-teal)', padding: '0.25rem 0.5rem', fontWeight: 600 }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Records Table */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-light)', fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Showing <strong>{complaints.length}</strong> of <strong>{total}</strong> records</span>
          {loading && <span style={{ color: 'var(--brand-teal)', fontWeight: 600 }}>Refreshing...</span>}
        </div>

        {error && (
          <div style={{ padding: '1.5rem', color: '#991B1B', backgroundColor: '#FEF2F2' }}>
            {error}
          </div>
        )}

        {!loading && complaints.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={36} color="var(--border-strong)" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No complaint records found
            </div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              Try adjusting your search criteria or clearing active filters.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Incident Type</th>
                  <th>Amount</th>
                  <th>Evidence</th>
                  <th>Consistency Status</th>
                  <th>Priority</th>
                  <th>Review Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-teal)' }}>
                          {c.reference_id}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.incident_type}</td>
                    <td className="tabular-nums" style={{ fontWeight: 600 }}>
                      {c.reported_amount ? `₹${c.reported_amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {c.evidence_count} file{c.evidence_count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      {c.mismatch_count > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#B91C1C',
                            backgroundColor: '#FEF2F2',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #FECACA'
                          }}
                        >
                          <AlertTriangle size={12} />
                          {c.mismatch_count} Discrepanc{c.mismatch_count > 1 ? 'ies' : 'y'}
                        </span>
                      ) : c.findings_count > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#065F46',
                            backgroundColor: '#ECFDF5',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #A7F3D0'
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Verified Match
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Pending Extraction
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge status={c.priority} size="sm" />
                    </td>
                    <td>
                      <Badge status={c.status} size="sm" />
                    </td>
                    <td style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)' }}>
                      {new Date(c.submission_time).toLocaleDateString()}
                    </td>
                    <td>
                      <Link
                        to={`/officer/complaints/${c.id}`}
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--brand-teal)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span>Inspect</span>
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
