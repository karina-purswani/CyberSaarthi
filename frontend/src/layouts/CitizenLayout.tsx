import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

export const CitizenLayout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
      <footer
        style={{
          borderTop: '1px solid var(--border-light)',
          backgroundColor: 'var(--surface-primary)',
          padding: '1.25rem 2rem',
          textAlign: 'center',
          fontSize: '0.78125rem',
          color: 'var(--text-muted)'
        }}
      >
        CyberSaarthi — Multilingual Cyber-Fraud Evidence Analysis & Investigation Support Platform. Fictional prototype for technical evaluation.
      </footer>
    </div>
  );
};
