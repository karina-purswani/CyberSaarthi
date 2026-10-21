import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export const OfficerLayout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            padding: '1.75rem 2rem',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-app)'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
