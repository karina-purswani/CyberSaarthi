import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Building, BadgeCheck, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { provisionOfficer, setAuthSession } from '../services/api';

export const OfficerRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'OFFICER' | 'ADMIN'>('OFFICER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('CyberSaarthiOfficerSetup2026');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const auth = await provisionOfficer({
        full_name: fullName,
        email,
        badge_number: badgeNumber || undefined,
        department: department || undefined,
        phone: phone || undefined,
        role,
        password,
        admin_key: adminKey
      });

      // Set active session for the newly provisioned officer
      setAuthSession(auth);
      navigate('/officer');
    } catch (err: any) {
      setError(err.message || 'Officer provisioning failed. Check administrative authorization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2.5rem auto', padding: '0 1.5rem', paddingBottom: '3rem' }}>
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/favicon.png"
            alt="CyberSaarthi Logo"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: 'var(--radius-lg)',
              objectFit: 'contain',
              marginBottom: '0.75rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            Officer Account Onboarding & Provisioning
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Authorized onboarding for law enforcement investigators, cyber forensic analysts, and system administrators.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Officer Full Name & Title *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Inspector Rajesh V. Sharma"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Official Police / LEA Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer.name@cybersaarthi.gov.in"
                style={{ width: '100%', paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          {/* Grid: Badge & Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Badge / Service ID
              </label>
              <div style={{ position: 'relative' }}>
                <BadgeCheck size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="MH-CYBER-7821"
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Department / Cell
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Cyber Cell, Zone 1"
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>
          </div>

          {/* Grid: Phone & Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Official Contact Phone
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Assigned Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'OFFICER' | 'ADMIN')}
                style={{ width: '100%', padding: '0.55rem' }}
              >
                <option value="OFFICER">Police Investigator (Officer)</option>
                <option value="ADMIN">System Administrator (Admin)</option>
              </select>
            </div>
          </div>

          {/* Grid: Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Password (min 8) *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Confirm Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', paddingLeft: '2.25rem' }}
                />
              </div>
            </div>
          </div>

          {/* Administrative Setup Key */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Agency Setup Key / Authorization Code *
              </label>
              <span style={{ fontSize: '0.71875rem', color: '#1E40AF' }}>Pre-filled for local prototype</span>
            </div>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
              <input
                type="text"
                required
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter officer onboarding authorization key"
                style={{ width: '100%', paddingLeft: '2.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
              />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Default Evaluation Key: <code>CyberSaarthiOfficerSetup2026</code>. Prevents unauthorized public signups while enabling authorized officer provisioning.
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: '#1E40AF',
              color: '#FFFFFF',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.75rem',
              border: 'none'
            }}
          >
            <span>{loading ? 'Provisioning Account...' : 'Provision Officer Account'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Already have an officer account?{' '}
            <Link to="/officer/login" style={{ color: '#1E40AF', fontWeight: 600 }}>
              Sign In to Officer Workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
