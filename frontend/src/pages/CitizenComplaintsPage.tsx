import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';
import { fetchComplaints } from '../services/api';
import type { ComplaintSummary } from '../types';
import { Badge } from '../components/Badge';

export const CitizenComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadComplaints = () => {
    setLoading(true);
    fetchComplaints({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      limit: 50
    })
      .then(res => {
        setComplaints(res.items);
      })
      .catch(err => {
        setError(err.message || 'Failed to load your complaints');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComplaints();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      
      {/* Header & Quick Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            My Submitted Complaints
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Official tracking ledger for your cyber-fraud evidence submissions and verification progress.
          </p>
        </div>

        <Link
          to="/citizen/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--brand-teal)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.875rem',
            padding: '0.65rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
          }}
        >
          <PlusCircle size={17} />
          <span>Report New Incident</span>
        </Link>
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
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Reference ID (e.g. CR-2026-...) or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.8125rem' }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-light)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-secondary)'
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '0.8125rem', minWidth: '170px' }}
          >
            <option value="">All Statuses</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VERIFIED">Verified (Consistent)</option>
            <option value="FLAGGED_FOR_MANUAL_AUDIT">Flagged Discrepancy</option>
            <option value="CLOSED">Closed / Resolved</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading your case records from secure database...
        </div>
      ) : error ? (
        <div style={{ padding: '1.5rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B' }}>
          {error}
        </div>
      ) : complaints.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px dashed var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center'
          }}
        >
          <FileText size={42} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No complaints found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            {searchTerm || statusFilter 
              ? 'No complaints matched your search filter criteria. Try clearing the filter.'
              : 'You have not submitted any cyber fraud incident reports under this account yet.'}
          </p>
          <Link
            to="/citizen/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.875rem',
              padding: '0.6rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none'
            }}
          >
            <PlusCircle size={16} />
            <span>Submit a Fraud Report Now</span>
          </Link>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--surface-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--surface-subtle)' }}>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Acknowledgment Reference
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Incident Type
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Amount Claimed
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Evidence Files
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Verification Status
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Submitted Date
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--brand-teal)' }}>
                      {c.reference_id}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      ID: {c.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {c.incident_type}
                    </div>
                    <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Submitted: {new Date(c.submission_time).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {c.reported_amount ? `₹${c.reported_amount.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {c.evidence_count} attached
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                    <Badge status={c.status} />
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                    {new Date(c.submission_time).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                    <Link
                      to={`/citizen/complaints/${c.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--brand-teal)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--brand-subtle)',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Track Progress</span>
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Advisory Card */}
      <div
        style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start'
        }}
      >
        <ShieldCheck size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.8125rem', color: '#166534', lineHeight: 1.5 }}>
          <strong>Statutory Cyber Helpline:</strong> In the event of an active financial drain, immediately dial <strong>1930</strong> (National Cybercrime Reporting Portal) or contact your banking branch within the initial 2-3 "Golden Hours" to freeze debit freeze transactions.
        </div>
      </div>

    </div>
  );
};
