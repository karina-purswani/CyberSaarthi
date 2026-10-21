import React from 'react';
import { User, Cpu, ShieldCheck, FileText } from 'lucide-react';

interface ProvenancePillProps {
  origin: 'citizen' | 'ocr' | 'system' | 'officer';
  label?: string;
}

export const ProvenancePill: React.FC<ProvenancePillProps> = ({ origin, label }) => {
  let text = label || 'Source';
  let icon = <User size={12} />;
  let bg = '#F3F4F6';
  let color = '#4B5563';

  if (origin === 'citizen') {
    text = label || 'Citizen Statement';
    icon = <User size={12} />;
    bg = '#F0FDF4';
    color = '#15803D';
  } else if (origin === 'ocr') {
    text = label || 'OCR Extracted';
    icon = <FileText size={12} />;
    bg = '#EFF6FF';
    color = '#1D4ED8';
  } else if (origin === 'system') {
    text = label || 'System Logic';
    icon = <Cpu size={12} />;
    bg = '#F5F3FF';
    color = '#6D28D9';
  } else if (origin === 'officer') {
    text = label || 'Officer Decision';
    icon = <ShieldCheck size={12} />;
    bg = '#FFFBEB';
    color = '#B45309';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.71875rem',
        fontWeight: 500,
        backgroundColor: bg,
        color: color,
        padding: '0.15rem 0.45rem',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${color}33`,
        letterSpacing: '0.01em'
      }}
    >
      {icon}
      {text}
    </span>
  );
};
