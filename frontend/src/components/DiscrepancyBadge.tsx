import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, AlertCircle, Eye } from 'lucide-react';
import type { VerificationResultType } from '../types';

interface DiscrepancyBadgeProps {
  result: VerificationResultType | string;
}

export const DiscrepancyBadge: React.FC<DiscrepancyBadgeProps> = ({ result }) => {
  let bg = '#F3F4F6';
  let text = '#374151';
  let border = '#E5E7EB';
  let icon = <HelpCircle size={14} />;
  let label = result;

  switch (result) {
    case 'MATCH':
      bg = 'var(--status-match-bg)';
      text = 'var(--status-match-text)';
      border = 'var(--status-match-border)';
      icon = <CheckCircle2 size={14} color="#059669" />;
      label = 'Confirmed Match';
      break;
    case 'MISMATCH':
      bg = 'var(--status-mismatch-bg)';
      text = 'var(--status-mismatch-text)';
      border = 'var(--status-mismatch-border)';
      icon = <AlertCircle size={14} color="#DC2626" />;
      label = 'Discrepancy Conflict';
      break;
    case 'MISSING_IN_COMPLAINT':
      bg = 'var(--status-info-bg)';
      text = 'var(--status-info-text)';
      border = 'var(--status-info-border)';
      icon = <HelpCircle size={14} color="#2563EB" />;
      label = 'Missing in Complaint';
      break;
    case 'MISSING_IN_EVIDENCE':
      bg = 'var(--status-warning-bg)';
      text = 'var(--status-warning-text)';
      border = 'var(--status-warning-border)';
      icon = <AlertTriangle size={14} color="#D97706" />;
      label = 'Missing in Receipt';
      break;
    case 'MANUAL_REVIEW_REQUIRED':
      bg = 'var(--status-warning-bg)';
      text = 'var(--status-warning-text)';
      border = 'var(--status-warning-border)';
      icon = <Eye size={14} color="#D97706" />;
      label = 'Manual Review Required';
      break;
    case 'UNABLE_TO_VERIFY':
    default:
      bg = '#F3F4F6';
      text = '#6B7280';
      border = '#E5E7EB';
      icon = <HelpCircle size={14} color="#6B7280" />;
      label = 'Unable to Verify';
      break;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-sm)',
        padding: '0.2rem 0.55rem',
        fontSize: '0.78125rem',
        fontWeight: 600,
        lineHeight: 1.2
      }}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
