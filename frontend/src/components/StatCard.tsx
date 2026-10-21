import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: 'default' | 'amber' | 'teal' | 'red';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = 'default',
  onClick
}) => {
  let accentBorder = 'transparent';
  if (accent === 'teal') accentBorder = 'var(--brand-teal)';
  else if (accent === 'amber') accentBorder = '#D97706';
  else if (accent === 'red') accentBorder = '#DC2626';

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--surface-primary)',
        border: '1px solid var(--border-light)',
        borderLeft: accent !== 'default' ? `4px solid ${accentBorder}` : '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.15rem 1.25rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {label}
        </span>
        {icon && <div style={{ color: 'var(--text-muted)' }}>{icon}</div>}
      </div>
      <div>
        <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};
