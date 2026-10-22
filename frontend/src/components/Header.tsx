import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, CheckCircle2, AlertCircle, LogOut, User as UserIcon, LayoutDashboard, PlusCircle, ListFilter, Network, FileText, UserCheck } from 'lucide-react';
import { fetchHealth, getCurrentUser, logoutUser } from '../services/api';
import type { User } from '../types';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [location.pathname]);

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

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    if (location.pathname.startsWith('/officer')) {
      navigate('/officer/login');
    } else {
      navigate('/');
    }
  };

  const isOfficerArea = location.pathname.startsWith('/officer');
  const isCitizenArea = location.pathname.startsWith('/citizen');

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

        {/* Dynamic Context Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.75rem' }}>
          {/* Officer Navigation */}
          {currentUser && (currentUser.role === 'OFFICER' || currentUser.role === 'ADMIN') && isOfficerArea && (
            <>
              <Link
                to="/officer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === '/officer' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/officer' ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <LayoutDashboard size={14} />
                Overview
              </Link>
              <Link
                to="/officer/queue"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === '/officer/queue' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/officer/queue' ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <ListFilter size={14} />
                Triage Queue
              </Link>
              <Link
                to="/officer/graph"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === '/officer/graph' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/officer/graph' ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <Network size={14} />
                Intelligence Graph
              </Link>
              <Link
                to="/officer/reports"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname.startsWith('/officer/reports') ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname.startsWith('/officer/reports') ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <FileText size={14} />
                Dossiers
              </Link>
            </>
          )}

          {/* Citizen Navigation */}
          {currentUser && currentUser.role === 'CITIZEN' && (isCitizenArea || location.pathname === '/') && (
            <>
              <Link
                to="/citizen"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === '/citizen' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/citizen' ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <LayoutDashboard size={14} />
                My Dashboard
              </Link>
              <Link
                to="/citizen/new"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === '/citizen/new' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/citizen/new' ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <PlusCircle size={14} />
                File Complaint
              </Link>
              <Link
                to="/citizen/complaints"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === '/citizen/complaints' ? 'var(--brand-teal)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/citizen/complaints' ? 'var(--brand-subtle)' : 'transparent'
                }}
              >
                <ListFilter size={14} />
                My Submissions
              </Link>
            </>
          )}

          {/* Public / Unauthenticated Navigation */}
          {!currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <Link
                to="/citizen/login"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--brand-teal)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  backgroundColor: 'var(--brand-subtle)'
                }}
              >
                Citizen Portal
              </Link>
              <Link
                to="/officer/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none'
                }}
              >
                <UserCheck size={14} />
                Officer Login
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Right controls: Health status + User Profile & Sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Real Backend health status pill */}
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

        {/* User Session Bar */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Link
              to={currentUser.role === 'CITIZEN' ? '/citizen/profile' : '/officer'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-light)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78125rem',
                fontWeight: 600
              }}
            >
              <UserIcon size={13} color="var(--brand-teal)" />
              <span>{currentUser.full_name}</span>
              <span style={{
                fontSize: '0.65rem',
                padding: '0.1rem 0.35rem',
                borderRadius: '2px',
                backgroundColor: currentUser.role === 'OFFICER' ? '#EFF6FF' : '#F0FDF4',
                color: currentUser.role === 'OFFICER' ? '#1E40AF' : '#166534',
                fontWeight: 700
              }}>
                {currentUser.role}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78125rem',
                fontWeight: 500,
                color: '#991B1B',
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0.35rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
