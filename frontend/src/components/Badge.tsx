import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  let bg = '#F3F4F6';
  let text = '#374151';
  let border = '#E5E7EB';

  switch (status.toUpperCase()) {
    case 'VERIFIED':
      bg = 'var(--status-match-bg)';
      text = 'var(--status-match-text)';
      border = 'var(--status-match-border)';
      break;
    case 'AWAITING_REVIEW':
      bg = 'var(--status-info-bg)';
      text = 'var(--status-info-text)';
      border = 'var(--status-info-border)';
      break;
    case 'IN_PROGRESS':
      bg = 'var(--status-warning-bg)';
      text = 'var(--status-warning-text)';
      border = 'var(--status-warning-border)';
      break;
    case 'FLAGGED_FOR_MANUAL_AUDIT':
    case 'HIGH':
      bg = 'var(--priority-high-bg)';
      text = 'var(--priority-high-text)';
      border = 'var(--status-mismatch-border)';
      break;
    case 'MEDIUM':
      bg = 'var(--priority-medium-bg)';
      text = 'var(--priority-medium-text)';
      border = 'var(--status-warning-border)';
      break;
    case 'LOW':
    case 'CLOSED':
      bg = 'var(--priority-low-bg)';
      text = 'var(--priority-low-text)';
      border = '#E5E7EB';
      break;
  }

  const padding = size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.65rem';
  const fontSize = size === 'sm' ? '0.75rem' : '0.8125rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-sm)',
        padding,
        fontSize,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        lineHeight: 1.2
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
