import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CreditCard, 
  Globe, 
  KeyRound, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Cpu, 
  PhoneCall, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Info
} from 'lucide-react';

interface GuideSection {
  id: string;
  category: string;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  warningSigns: string[];
  safetyChecklist: string[];
  tacticsExplained: string;
  emergencyTip?: string;
}

export const CitizenPreventionGuidePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'upi-fraud': true,
    'post-incident': true
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    guideData.forEach(item => {
      allExpanded[item.id] = true;
    });
    setExpandedSections(allExpanded);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const guideData: GuideSection[] = [
    {
      id: 'upi-fraud',
      category: 'PAYMENTS',
      title: 'UPI & Digital Payment Fraud Prevention',
      shortDesc: 'Crucial rules for Google Pay, PhonePe, Paytm, BHIM, and banking QR transactions.',
      icon: <CreditCard size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'A common deception is telling a victim "Scan this QR code to receive your refund/cashback" or sending a collect request disguised as payment receipt. Scammers rely on confusion between sending and receiving money.',
      warningSigns: [
        'Anyone claiming that you must enter your UPI PIN to receive money or collect cashbacks.',
        'Unsolicited collect payment requests on PhonePe, Google Pay, or Paytm from unknown VPAs.',
        'QR codes sent via WhatsApp or SMS with instructions like "Scan & enter PIN to credit ₹5,000 to your account".',
        'Callers posing as army personnel, buyers on OLX, or customer service asking you to approve a test transaction of ₹1 or ₹5.'
      ],
      safetyChecklist: [
        'NEVER enter your UPI PIN to receive money. Entering a UPI PIN is exclusively used to debit (send) money from your account.',
        'Never disclose or approve payment requests from unknown Virtual Payment Addresses (VPAs).',
        'Reject any QR code sent for receiving money — QR codes can only be scanned to pay, not to receive.',
        'Always check the beneficiary name displayed on the UPI confirmation screen before entering your secret PIN.'
      ],
      emergencyTip: 'If money was debited erroneously, note down the 12-digit UPI UTR number immediately and call 1930.'
    },
    {
      id: 'phishing-sites',
      category: 'PHISHING',
      title: 'Phishing Links & Impersonation Websites',
      shortDesc: 'How to detect forged bank portals, spoofed utility bill SMS, and fake government domains.',
      icon: <Globe size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'Scammers send SMS messages claiming your electricity will be disconnected tonight, your SIM card will be blocked within 24 hours, or your bank KYC is pending. The link opens a clone of a legitimate bank or electricity board portal designed to harvest logins and OTPs.',
      warningSigns: [
        'SMS from personal 10-digit mobile numbers rather than verified 6-character sender IDs (e.g., VM-SBIINB).',
        'Urgent or threatening language: "Your power will be disconnected at 9:30 PM", "Account blocked immediately".',
        'Web addresses with subtle typos or strange domain endings (e.g., sbi-kyc-update.xyz or onlinesb1.com instead of sbi.co.in).',
        'Web forms requesting full debit card number, expiry date, CVV, and net banking password together.'
      ],
      safetyChecklist: [
        'Check website URLs meticulously in the address bar before entering credentials or mobile numbers.',
        'Never click on links inside unsolicited SMS or WhatsApp messages claiming urgent utility or KYC compliance.',
        'Always access net banking services by typing the official bank URL directly into your browser or using official mobile banking apps.',
        'Verify caller and sender credentials through official toll-free directory numbers rather than the contact number provided in the message.'
      ]
    },
    {
      id: 'account-security',
      category: 'SECURITY',
      title: 'OTP, Password & Multi-Factor Account Security',
      shortDesc: 'Hardening primary email, social accounts, and banking profiles against credential theft.',
      icon: <KeyRound size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'Attackers frequently pose as bank representatives, credit card department managers, or telecom engineers requesting an OTP under the pretext of "canceling an unauthorized charge" or "activating 5G service". The OTP actually authorizes the fraudulent debit or SIM transfer.',
      warningSigns: [
        'Any caller or chat agent asking for an OTP, security PIN, or password, regardless of who they claim to be.',
        'SMS messages containing an OTP that explicitly say "Do NOT share with anyone" or "for payment of ₹..." when you initiated no transaction.',
        'Unexpected password reset emails or two-factor prompt notifications on your smartphone.',
        'Requests to share the last 4 digits of Aadhaar along with an Aadhaar OTP received from UIDAI.'
      ],
      safetyChecklist: [
        'Never disclose OTPs, PINs, or recovery codes to anyone under any circumstances — genuine bank officials never ask for OTPs.',
        'Use strong, unique passphrases (14+ characters combining words, numbers, and symbols) rather than common passwords across multiple websites.',
        'Enable Multi-Factor Authentication (MFA / 2FA) using authenticator apps (like Google Authenticator) wherever supported.',
        'Review and update secondary recovery email addresses and phone numbers linked to your primary Google and Apple accounts.'
      ]
    },
    {
      id: 'social-identity',
      category: 'IDENTITY',
      title: 'Social Media Privacy & Identity Theft Prevention',
      shortDesc: 'Preventing profile cloning, impersonation scams, and personal data harvesting.',
      icon: <Users size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'Scammers download public profile pictures and contact lists to create duplicate accounts pretending to be your relative, colleague, or friend. They then message connections claiming an emergency hospitalization and asking for immediate UPI transfers.',
      warningSigns: [
        'A second friend request or message from someone you are already connected with on Instagram, Facebook, or LinkedIn.',
        'Messages asking for urgent financial help via UPI to an unfamiliar third-party name.',
        'Unsolicited video calls from unknown numbers on WhatsApp, which can be recorded and used for extortion or morphing.',
        'Tagging requests on posts claiming you won a giveaway or car.'
      ],
      safetyChecklist: [
        'Set your social media profiles to private or restrict post visibility strictly to confirmed friends and family.',
        'Never publicly upload boarding passes, flight tickets, PAN cards, Aadhaar cards, or home utility bills (barcodes can be decoded).',
        'Always verify any emergency money request by placing a direct voice or video call to the friend on their known regular phone number.',
        'Never answer video calls from unknown international or domestic numbers on messaging platforms.'
      ]
    },
    {
      id: 'job-investment',
      category: 'SCAMS',
      title: 'Job Offers, Investment & E-Commerce Scams',
      shortDesc: 'Identifying YouTube task scams, fake crypto/stock trading platforms, and counterfeit e-commerce.',
      icon: <TrendingUp size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'Victims receive WhatsApp invitations for part-time "Work from Home" tasks like liking YouTube videos or rating hotels for ₹50 per task. After small initial payouts to build trust, victims are lured into Telegram "VIP investment groups" where they are coerced into depositing lakhs of rupees that can never be withdrawn.',
      warningSigns: [
        'Unsolicited job offers on Telegram or WhatsApp offering ₹2,000–₹5,000 daily for minimal clerical or video-liking tasks.',
        'Demands for "registration fees", "tax clearance deposits", or "currency conversion fees" before withdrawing earned money.',
        'Stock or crypto investment apps shared via APK download links or unregulated websites promising guaranteed daily returns of 5%–50%.',
        'Shopping portals offering branded smartphones or luxury electronics at 80%–90% discounts with advance payment only.'
      ],
      safetyChecklist: [
        'Verify legitimate employers through official career pages and corporate email domains (e.g., @company.com, never @gmail.com).',
        'Verify investment brokers and advisory platforms on the official SEBI registry (sebi.gov.in) before depositing money.',
        'Never deposit funds into personal savings accounts or individual UPI IDs under the guise of trading investments.',
        'Use reputable e-commerce platforms with verified buyer protection and cash-on-delivery options for unfamiliar stores.'
      ]
    },
    {
      id: 'harassment-blackmail',
      category: 'HARASSMENT',
      title: 'Cyberbullying, Loan App Harassment & Blackmail',
      shortDesc: 'Handling illegal recovery threats, morphed photos, and online harassment safely.',
      icon: <AlertTriangle size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'Predatory instant-loan applications gain access to contacts and photo galleries during installation. If payments are disputed or delayed, operators send abusive messages and morphed photos to the victim\'s family and employers. Similar extortion occurs through video-call recording traps.',
      warningSigns: [
        'Instant loan apps installed outside Google Play Store / App Store requiring broad permissions to Contacts, Gallery, and Storage.',
        'Callers threatening defamation, sending morphed photos, or harassing family members over alleged dues.',
        'Blackmailers demanding money under threat of leaking private chats or doctored pictures.',
        'Anonymous accounts repeatedly sending abusive, threatening, or stalking messages on social media.'
      ],
      safetyChecklist: [
        'Do NOT send money or succumb to blackmail demands — paying money almost always results in higher subsequent demands.',
        'Preserve all digital evidence immediately: take full screenshots displaying timestamps, sender handles, phone numbers, and URLs.',
        'Do not delete threatening messages, call recordings, or chat transcripts before taking complete backups.',
        'Block and report abusive numbers on the messaging platform and register a complaint on cybercrime.gov.in (dial 1930 / Women Helpline 1091 / 181).'
      ]
    },
    {
      id: 'malware-remote',
      category: 'MALWARE',
      title: 'Remote Access Apps & Malware Traps',
      shortDesc: 'Defending devices against AnyDesk, TeamViewer, malicious APKs, and screen-sharing theft.',
      icon: <Cpu size={20} color="var(--brand-teal)" />,
      tacticsExplained:
        'A scammer poses as a bank representative or telecom support agent resolving a glitch and instructs the victim to install AnyDesk, RustDesk, TeamViewer, or QuickSupport from the app store. Once the victim grants permissions and reads out the 9-digit remote code, the scammer views the device screen in real time to intercept credentials and OTPs.',
      warningSigns: [
        'Any caller instructing you to download AnyDesk, TeamViewer, QuickSupport, or RustDesk on your phone or laptop.',
        'Instructions to download APK installation files sent over WhatsApp or Telegram under the guise of an updated banking app.',
        'Pop-up notifications claiming "Your phone is infected with 13 viruses, click to scan now".',
        'Callers asking you to keep your phone screen active while they "configure bank settings".'
      ],
      safetyChecklist: [
        'NEVER install remote desktop or screen-sharing software at the request of an incoming caller or stranger.',
        'If you have inadvertently installed a remote application, immediately turn on Airplane Mode or disconnect Wi-Fi and uninstall the application.',
        'Only install applications from official app stores (Google Play Store or Apple App Store); never enable "Install from Unknown Sources" for messaging apps.',
        'Keep your smartphone operating system and security patches up to date to protect against known exploits.'
      ]
    },
    {
      id: 'post-incident',
      category: 'EMERGENCY',
      title: 'Immediate Action: What to Do After a Cybercrime',
      shortDesc: 'Golden Hour steps, inter-bank freeze requisitions, and evidence preservation guidelines.',
      icon: <PhoneCall size={20} color="#DC2626" />,
      tacticsExplained:
        'The first 2 to 3 hours after a fraudulent transaction ("The Golden Hour") are the most critical window. Rapid notification allows the National Cyber Crime Reporting Portal (1930) and partner banks to place a temporary debit freeze on suspect beneficiary accounts before money is withdrawn at ATMs or laundered through mule networks.',
      warningSigns: [
        'Unauthorized debit SMS received from your bank without your initiation.',
        'Sudden loss of cellular network connectivity ("No Service" or "SIM Inactive") indicating a possible SIM Swap attack.',
        'Realizing you shared an OTP, UPI PIN, or remote screen-sharing access with an unknown party.',
        'Discovery that a website or investment platform has frozen your account and ceased responding.'
      ],
      safetyChecklist: [
        'STEP 1 — STOP FURTHER LOSS: Block debit/credit cards and disable net banking immediately via mobile banking app or your bank\'s emergency helpline.',
        'STEP 2 — CALL 1930 IMMEDIATELY: In India, dial 1930 (National Cyber Crime Reporting Helpline) to report financial fraud and trigger automated freeze requisitions with beneficiary banks.',
        'STEP 3 — LODGE OFFICIAL REPORT: File a formal complaint on the official government portal: https://cybercrime.gov.in/ with all transaction details.',
        'STEP 4 — PRESERVE EVIDENCE: Export and save transaction receipts, 12-digit UTR numbers, payment screenshots, scammer phone numbers, and chat logs.',
        'STEP 5 — SUBMIT IN CYBERSAARTHI: Use the CyberSaarthi intake portal to verify your receipts, extract entity tokens, and compile an investigation support dossier.'
      ],
      emergencyTip:
        'IMPORTANT LEGAL NOTICE: Reporting to 1930 and CyberSaarthi triggers tracking and inter-bank freezing requisitions, but does NOT legally guarantee recovery of lost funds. Prompt reporting within the Golden Hour maximizes recovery likelihood.'
    }
  ];

  const categories = [
    { key: 'ALL', label: 'All Prevention Topics' },
    { key: 'EMERGENCY', label: '🚨 Immediate Action (1930)' },
    { key: 'PAYMENTS', label: 'UPI & Payments' },
    { key: 'PHISHING', label: 'Phishing & Sites' },
    { key: 'SECURITY', label: 'Passwords & OTPs' },
    { key: 'IDENTITY', label: 'Social & Identity' },
    { key: 'SCAMS', label: 'Jobs & Investments' },
    { key: 'HARASSMENT', label: 'Bullying & Harassment' },
    { key: 'MALWARE', label: 'Malware & Remote Access' }
  ];

  const filteredData = useMemo(() => {
    return guideData.filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inShort = item.shortDesc.toLowerCase().includes(q);
      const inTactics = item.tacticsExplained.toLowerCase().includes(q);
      const inWarnings = item.warningSigns.some(w => w.toLowerCase().includes(q));
      const inChecklist = item.safetyChecklist.some(c => c.toLowerCase().includes(q));

      return inTitle || inShort || inTactics || inWarnings || inChecklist;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto 4rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <div style={{
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-teal)',
                padding: '0.45rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={24} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Citizen Cybercrime Prevention & Safety Guide
              </h1>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '680px', lineHeight: 1.5 }}>
              Practical, verified cyber safety guidelines to protect citizens against financial fraud, account takeovers, social impersonation, and digital extortion.
            </p>
          </div>

          <Link
            to="/citizen/new"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'var(--brand-teal)',
              color: '#FFFFFF',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span>File Incident Report</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Emergency Action & Helpline Alert Banner */}
      <div
        style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.75rem'
            }}>!</span>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#991B1B' }}>
                Victim of an Ongoing Financial Fraud? Act Immediately
              </div>
              <div style={{ fontSize: '0.78125rem', color: '#7F1D1D' }}>
                The first 2–3 hours ("Golden Hour") are critical for banks to freeze fraudulent debits before cash-out.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href="tel:1930"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <PhoneCall size={14} />
              <span>Dial 1930 (Helpline)</span>
            </a>

            <a
              href="https://cybercrime.gov.in/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#FFFFFF',
                color: '#991B1B',
                border: '1px solid #FECACA',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <span>cybercrime.gov.in</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#991B1B', lineHeight: 1.4, borderTop: '1px solid #FEE2E2', paddingTop: '0.5rem' }}>
          <strong>Statutory Advisory:</strong> Reporting to the National Cyber Crime portal or helpline initiates tracking and inter-bank freeze requisitions with participating financial institutions, but does not legally guarantee fund recovery. Never delay reporting.
        </div>
      </div>

      {/* Search Bar & Category Navigation */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Search safety advice (e.g. UPI PIN, fake call, AnyDesk, QR code, WhatsApp, job scam)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '38px',
              paddingRight: '12px',
              paddingTop: '0.65rem',
              paddingBottom: '0.65rem',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-md)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '0.2rem 0.4rem',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--brand-teal)' : '1px solid var(--border-light)',
                  backgroundColor: isSelected ? 'var(--brand-teal)' : 'var(--surface-subtle)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Expand/Collapse Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Showing {filteredData.length} of {guideData.length} safety categories</span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={expandAll}
              style={{ color: 'var(--brand-teal)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Expand All
            </button>
            <span>&bull;</span>
            <button
              onClick={collapseAll}
              style={{ color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Guide Cards Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredData.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '3rem 1.5rem',
              textAlign: 'center'
            }}
          >
            <Info size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              No guidelines matched your search
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
              Try searching with different terms like "PIN", "QR", "OTP", "Telegram", or select "All Prevention Topics".
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
              style={{
                backgroundColor: 'var(--brand-teal)',
                color: '#FFFFFF',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredData.map((section) => {
            const isExpanded = !!expandedSections[section.id];
            const isEmergency = section.category === 'EMERGENCY';

            return (
              <div
                key={section.id}
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: isEmergency ? '1.5px solid #FCA5A5' : '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* Section Header Accordion Trigger */}
                <div
                  onClick={() => toggleSection(section.id)}
                  style={{
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isExpanded ? (isEmergency ? '#FFF5F5' : 'var(--surface-subtle)') : 'transparent',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      backgroundColor: isEmergency ? '#FEE2E2' : 'var(--brand-subtle)',
                      padding: '0.45rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {section.icon}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {section.title}
                      </h2>
                      <p style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {section.shortDesc}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isEmergency ? '#FEE2E2' : 'var(--surface-primary)',
                      color: isEmergency ? '#991B1B' : 'var(--brand-teal)',
                      border: '1px solid var(--border-light)'
                    }}>
                      {isExpanded ? 'Hide Details' : 'View Checklist'}
                    </span>
                    {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Section Expanded Body */}
                {isExpanded && (
                  <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    {/* Scam Mechanics / How it works */}
                    <div style={{ backgroundColor: 'var(--surface-subtle)', borderLeft: '3px solid var(--brand-teal)', padding: '0.85rem 1.15rem', borderRadius: '0 4px 4px 0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-teal)', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                        💡 Modus Operandi (How Scammers Operate)
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>
                        {section.tacticsExplained}
                      </div>
                    </div>

                    {/* Dual Column: Warning Signs vs Safety Checklist */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                      
                      {/* Warning Signs (Red Flags) */}
                      <div style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
                          <XCircle size={16} color="#DC2626" />
                          <h4 style={{ fontSize: '0.84375rem', fontWeight: 800, color: '#991B1B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Warning Signs & Red Flags
                          </h4>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {section.warningSigns.map((w, idx) => (
                            <li key={idx} style={{ fontSize: '0.78125rem', color: '#7F1D1D', lineHeight: 1.45 }}>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Actionable Safety Checklist */}
                      <div style={{
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
                          <CheckCircle2 size={16} color="#059669" />
                          <h4 style={{ fontSize: '0.84375rem', fontWeight: 800, color: '#065F46', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Actionable Safety Checklist
                          </h4>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {section.safetyChecklist.map((c, idx) => (
                            <li key={idx} style={{ fontSize: '0.78125rem', color: '#064E3B', lineHeight: 1.45 }}>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    {/* Emergency Tip if present */}
                    {section.emergencyTip && (
                      <div style={{
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem 1rem',
                        fontSize: '0.78125rem',
                        color: '#92400E',
                        lineHeight: 1.45
                      }}>
                        <strong>Important:</strong> {section.emergencyTip}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Official Reporting Directory Footer Card */}
      <div
        style={{
          backgroundColor: 'var(--surface-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Official National Cybercrime Assistance Contacts (India)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              National Helpline (Financial)
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#DC2626', margin: '0.2rem 0' }}>
              1930
            </div>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
              Operational 24x7 across all Indian States &amp; UTs
            </div>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              National Reporting Portal
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--brand-teal)', margin: '0.35rem 0' }}>
              <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-teal)' }}>
                cybercrime.gov.in &rarr;
              </a>
            </div>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
              Official Ministry of Home Affairs Portal
            </div>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Women &amp; Child Safety
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
              1091 / 181
            </div>
            <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted)' }}>
              Specialized helpline for harassment &amp; stalking
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
