import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, FileSearch, Network, FileCheck, ShieldAlert, UploadCloud, Users } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/officer', label: 'Overview', icon: <LayoutDashboard size={18} />, end: true },
    { to: '/officer/queue', label: 'Complaint Queue', icon: <Inbox size={18} /> },
    { to: '/officer/import', label: 'Batch Import (CSV/JSON)', icon: <UploadCloud size={18} /> },
    { to: '/officer/evidence', label: 'Evidence Review', icon: <FileSearch size={18} /> },
    { to: '/officer/graph', label: 'Intelligence Graph', icon: <Network size={18} /> },
    { to: '/officer/reports', label: 'Investigation Reports', icon: <FileCheck size={18} /> },
    { to: '/officer/users', label: 'User Administration', icon: <Users size={18} /> }
  ];

  return (
    <aside
      style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: 'var(--surface-primary)',
        borderRight: '1px solid var(--border-light)',
        minHeight: 'calc(100vh - 53px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 0.75rem'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.5rem 0.85rem 0.5rem', borderBottom: '1px solid var(--border-light)', marginBottom: '0.75rem' }}>
          <img
            src="/favicon.png"
            alt="CyberSaarthi Logo"
            style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--brand-teal)', lineHeight: 1.1 }}>
              CyberSaarthi
            </div>
            <div style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              Officer Console
            </div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--brand-teal)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--brand-subtle)' : 'transparent',
                textDecoration: 'none',
                transition: 'background-color 0.1s ease'
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Restrained Civic Disclaimer in Sidebar */}
      <div
        style={{
          padding: '0.75rem',
          backgroundColor: 'var(--surface-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          fontSize: '0.71875rem',
          color: 'var(--text-muted)',
          lineHeight: 1.4
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
          <ShieldAlert size={13} color="var(--brand-teal)" />
          Human-in-the-Loop
        </div>
        All algorithmic extractions and links are investigative leads requiring officer evaluation.
      </div>
    </aside>
  );
};
