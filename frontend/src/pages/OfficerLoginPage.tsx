import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { loginUser } from '../services/api';

export const OfficerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginUser(email, password, 'officer');
      navigate('/officer');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Authentication failed. Check your official credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto', padding: '0 1.5rem' }}>
      <div style={{
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/favicon.png"
            alt="CyberSaarthi Logo"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
              objectFit: 'contain',
              marginBottom: '0.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Officer Workspace Sign In
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Restricted to authorized law enforcement and cyber crime triage personnel.
          </p>
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
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Official Police / Officer Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="officer@cybersaarthi.gov.in"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          <div style={{
            fontSize: '0.71875rem',
            color: '#1E40AF',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            lineHeight: 1.4
          }}>
            <strong>Notice:</strong> All officer actions, including case status transitions, manual field corrections, and evidence downloads are immutably logged in the system audit trail.
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#1E40AF',
              color: '#FFFFFF',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.5rem'
            }}
          >
            <span>{loading ? 'Authenticating...' : 'Access Officer Workspace'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Need to provision a new officer or investigator?{' '}
            <Link to="/officer/register" style={{ color: '#1E40AF', fontWeight: 600 }}>
              Provision Officer Account
            </Link>
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Are you a citizen filing a complaint?{' '}
            <Link to="/citizen/login" style={{ color: 'var(--brand-teal)', fontWeight: 600 }}>
              Citizen Portal Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
