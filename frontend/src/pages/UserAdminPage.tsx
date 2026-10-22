import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, BadgeCheck, Phone, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchSystemUsers } from '../services/api';
import type { User } from '../types';

export const UserAdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    setError(null);
    fetchSystemUsers()
      .then(res => setUsers(res))
      .catch(err => setError(err.message || 'Failed to load user directory.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Officer & User Administration
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Authorized personnel directory, role assignments, and officer provisioning.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={loadUsers}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <Link
            to="/officer/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#1E40AF',
              color: '#FFFFFF',
              padding: '0.5rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <UserPlus size={15} />
            <span>Provision New Officer</span>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table Card */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="#1E40AF" />
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Registered Officers & System Accounts ({users.length})
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Database-backed RBAC directory
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No accounts found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>User / Official Name</th>
                  <th>Role</th>
                  <th>Badge & Station</th>
                  <th>Contact Info</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isOfficer = u.role === 'OFFICER';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {u.email}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.71875rem',
                            fontWeight: 700,
                            backgroundColor: isAdmin ? '#FDF2F8' : isOfficer ? '#EFF6FF' : 'var(--surface-subtle)',
                            color: isAdmin ? '#9D174D' : isOfficer ? '#1E40AF' : 'var(--text-secondary)',
                            border: `1px solid ${isAdmin ? '#FBCFE8' : isOfficer ? '#BFDBFE' : 'var(--border-light)'}`
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {u.badge_number ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                              <BadgeCheck size={13} color="#1E40AF" />
                              <span>{u.badge_number}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)' }}>
                          {u.department || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)' }}>
                          {u.phone ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={12} />
                              <span>{u.phone}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No phone</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
