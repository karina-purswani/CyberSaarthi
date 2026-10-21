import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, RefreshCw, CheckCircle2, AlertCircle, FilePlus, UserCheck } from 'lucide-react';
import { fetchHealth, resetDemoData } from '../services/api';

export const Header: React.FC = () => {
  const location = useLocation();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [resetting, setResetting] = useState(false);
  const isOfficer = location.pathname.startsWith('/officer');

  const checkStatus = async () => {
    try {
      const data = await fetchHealth();
      setHealthy(data.status === 'healthy');
    } catch {
      setHealthy(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset local demonstration database to clean initial state?')) return;
    try {
      setResetting(true);
      await resetDemoData();
      window.location.reload();
    } catch (e) {
      alert('Failed to reset demo data: ' + e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--surface-primary)',
        borderBottom: '1px solid var(--border-light)',
        padding: '0.65rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div
            style={{
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Shield size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--brand-teal)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              CyberSaarthi
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
              Evidence Intelligence Platform
            </div>
          </div>
        </Link>

        {/* Workspace Mode Switcher */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '1rem', backgroundColor: 'var(--surface-subtle)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: !isOfficer ? 'var(--brand-teal)' : 'var(--text-secondary)',
              backgroundColor: !isOfficer ? 'var(--surface-primary)' : 'transparent',
              boxShadow: !isOfficer ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <FilePlus size={14} />
            Citizen Intake
          </Link>
          <Link
            to="/officer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isOfficer ? 'var(--brand-teal)' : 'var(--text-secondary)',
              backgroundColor: isOfficer ? 'var(--surface-primary)' : 'transparent',
              boxShadow: isOfficer ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <UserCheck size={14} />
            Officer Workspace
          </Link>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Backend health status pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: healthy ? '#ECFDF5' : '#FEF2F2',
            color: healthy ? '#065F46' : '#991B1B',
            border: `1px solid ${healthy ? '#A7F3D0' : '#FECACA'}`
          }}
        >
          {healthy ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span>{healthy ? 'Engine Active' : 'Connecting...'}</span>
        </div>

        {/* Demo data badge */}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #BFDBFE',
            padding: '0.15rem 0.45rem',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          Sample Data
        </span>

        {/* Reset Demo Data Button */}
        <button
          onClick={handleResetDemo}
          disabled={resetting}
          title="Reset sample demonstration database"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.78125rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--surface-subtle)',
            border: '1px solid var(--border-light)',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <RefreshCw size={13} className={resetting ? 'spin' : ''} />
          <span>{resetting ? 'Resetting...' : 'Reset Fixtures'}</span>
        </button>
      </div>
    </header>
  );
};
