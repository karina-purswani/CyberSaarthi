import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, AlertCircle, Eye } from 'lucide-react';
import type { VerificationResultType } from '../types';

interface DiscrepancyBadgeProps {
  result: VerificationResultType | string;
  displayStatus?: string;
}

export const DisplayStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  let bg = '#F3F4F6';
  let text = '#374151';
  let border = '#E5E7EB';
  let icon = <HelpCircle size={13} />;
  const normalized = (status || 'Insufficient Data').trim();

  if (normalized === 'Consistent') {
    bg = 'var(--status-match-bg)';
    text = 'var(--status-match-text)';
    border = 'var(--status-match-border)';
    icon = <CheckCircle2 size={13} color="#059669" />;
  } else if (normalized === 'Inconsistent') {
    bg = 'var(--status-mismatch-bg)';
    text = 'var(--status-mismatch-text)';
    border = 'var(--status-mismatch-border)';
    icon = <AlertCircle size={13} color="#DC2626" />;
  } else {
    // Insufficient Data
    bg = '#EFF6FF';
    text = '#1D4ED8';
    border = '#BFDBFE';
    icon = <HelpCircle size={13} color="#2563EB" />;
  }

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
        padding: '0.2rem 0.55rem',
        fontSize: '0.78125rem',
        fontWeight: 700,
        lineHeight: 1.2
      }}
    >
      {icon}
      <span>{normalized}</span>
    </span>
  );
};

export const DiscrepancyBadge: React.FC<DiscrepancyBadgeProps> = ({ result, displayStatus }) => {
  let bg = '#F3F4F6';
  let text = '#374151';
  let border = '#E5E7EB';
  let icon = <HelpCircle size={13} />;
  let label = result;

  switch (result) {
    case 'MATCH':
      bg = 'var(--status-match-bg)';
      text = 'var(--status-match-text)';
      border = 'var(--status-match-border)';
      icon = <CheckCircle2 size={13} color="#059669" />;
      label = 'MATCH (Exact)';
      break;
    case 'MISMATCH':
      bg = 'var(--status-mismatch-bg)';
      text = 'var(--status-mismatch-text)';
      border = 'var(--status-mismatch-border)';
      icon = <AlertCircle size={13} color="#DC2626" />;
      label = 'MISMATCH (Conflict)';
      break;
    case 'MISSING_IN_COMPLAINT':
      bg = 'var(--status-info-bg)';
      text = 'var(--status-info-text)';
      border = 'var(--status-info-border)';
      icon = <HelpCircle size={13} color="#2563EB" />;
      label = 'MISSING_IN_COMPLAINT';
      break;
    case 'MISSING_IN_EVIDENCE':
      bg = 'var(--status-warning-bg)';
      text = 'var(--status-warning-text)';
      border = 'var(--status-warning-border)';
      icon = <AlertTriangle size={13} color="#D97706" />;
      label = 'MISSING_IN_EVIDENCE';
      break;
    case 'MANUAL_REVIEW_REQUIRED':
      bg = 'var(--status-warning-bg)';
      text = 'var(--status-warning-text)';
      border = 'var(--status-warning-border)';
      icon = <Eye size={13} color="#D97706" />;
      label = 'MANUAL_REVIEW_REQUIRED';
      break;
    case 'UNABLE_TO_VERIFY':
    default:
      bg = '#F3F4F6';
      text = '#6B7280';
      border = '#E5E7EB';
      icon = <HelpCircle size={13} color="#6B7280" />;
      label = result || 'UNABLE_TO_VERIFY';
      break;
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      {displayStatus && <DisplayStatusBadge status={displayStatus} />}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          backgroundColor: bg,
          color: text,
          border: `1px solid ${border}`,
          borderRadius: 'var(--radius-sm)',
          padding: '0.15rem 0.45rem',
          fontSize: '0.71875rem',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.2
        }}
      >
        {icon}
        <span>{label}</span>
      </span>
    </div>
  );
};

