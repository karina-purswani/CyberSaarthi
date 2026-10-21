import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface DisclaimerNoticeProps {
  type?: 'lead' | 'report' | 'demo';
  customMessage?: string;
}

export const DisclaimerNotice: React.FC<DisclaimerNoticeProps> = ({ type = 'lead', customMessage }) => {
  let icon = <Info size={16} color="var(--brand-teal)" />;
  let title = 'Investigative Notice';
  let message = customMessage || 'Information presented is for analytical triage and investigation assistance.';
  let bg = 'var(--surface-subtle)';
  let borderColor = 'var(--border-light)';
  let textColor = 'var(--text-secondary)';

  if (type === 'lead') {
    icon = <AlertTriangle size={16} color="#B45309" />;
    title = 'Investigative Lead Notice';
    message = customMessage || 'Shared indicators represent investigative leads derived from observed identifiers. They do not establish common ownership, syndicate guilt, or criminal responsibility.';
    bg = 'var(--status-warning-bg)';
    borderColor = 'var(--status-warning-border)';
    textColor = 'var(--status-warning-text)';
  } else if (type === 'report') {
    icon = <ShieldAlert size={16} color="var(--brand-teal)" />;
    title = 'Non-FIR Notice';
    message = customMessage || 'This summary is an automated investigation-support document produced by CyberSaarthi. It is NOT an official First Information Report (FIR), judicial summons, or conclusive finding of guilt.';
    bg = '#F0FDF4';
    borderColor = '#BBF7D0';
    textColor = '#166534';
  } else if (type === 'demo') {
    icon = <Info size={16} color="#1E40AF" />;
    title = 'Demonstration Environment';
    message = customMessage || 'Sample fictional cases are currently active for hackathon demonstration. All identifiers, names, and transaction references are synthetic.';
    bg = 'var(--status-info-bg)';
    borderColor = 'var(--status-info-border)';
    textColor = 'var(--status-info-text)';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        fontSize: '0.84375rem',
        color: textColor,
        lineHeight: 1.45,
        margin: '0.5rem 0'
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div>
        <strong style={{ display: 'block', marginBottom: '0.15rem' }}>{title}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
};
