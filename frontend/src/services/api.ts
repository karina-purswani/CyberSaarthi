import type {
  ComplaintSummary,
  ComplaintDetail,
  OverviewMetrics,
  CitizenMetrics,
  GraphData,
  User,
  AuthResponse,
  VoiceTranscriptionResult
} from '../types';

const API_BASE = '/api';

// --- Auth Token & Session State ---

export function getAuthToken(): string | null {
  return localStorage.getItem('cybersaarthi_token');
}

export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem('cybersaarthi_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setAuthSession(auth: AuthResponse) {
  localStorage.setItem('cybersaarthi_token', auth.access_token);
  localStorage.setItem('cybersaarthi_user', JSON.stringify(auth.user));
}

export function clearAuthSession() {
  localStorage.removeItem('cybersaarthi_token');
  localStorage.removeItem('cybersaarthi_user');
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- Health ---

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

// --- Auth Endpoints ---

export async function loginUser(email: string, password: string, portalType?: 'citizen' | 'officer'): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, portal_type: portalType })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(errorData.detail || 'Sign-in failed.');
  }
  const data: AuthResponse = await res.json();
  setAuthSession(data);
  return data;
}

export async function registerCitizen(payload: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(errorData.detail || 'Registration failed.');
  }
  const data: AuthResponse = await res.json();
  setAuthSession(data);
  return data;
}

export async function provisionOfficer(payload: {
  email: string;
  password: string;
  full_name: string;
  badge_number?: string;
  department?: string;
  phone?: string;
  role?: string;
  admin_key?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/officer/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Officer provisioning failed' }));
    throw new Error(errorData.detail || 'Officer provisioning failed.');
  }
  const data: AuthResponse = await res.json();
  return data;
}

export async function fetchSystemUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load system users');
  return res.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load profile.');
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Password change failed' }));
    throw new Error(err.detail || 'Password change failed');
  }
  return res.json();
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders()
    });
  } catch {
    // Ignore error on network fail
  } finally {
    clearAuthSession();
  }
}

// --- Voice Transcription Endpoint ---

export async function transcribeVoiceAudio(audioBlob: Blob, language: string = 'en'): Promise<VoiceTranscriptionResult> {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'recording.wav');
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/voice/transcribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
    throw new Error(err.detail || 'Voice transcription failed.');
  }
  return res.json();
}

// --- Metrics Endpoints ---

export async function fetchOverviewMetrics(): Promise<OverviewMetrics> {
  const res = await fetch(`${API_BASE}/overview/metrics`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load overview metrics');
  return res.json();
}

export async function fetchCitizenMetrics(): Promise<CitizenMetrics> {
  const res = await fetch(`${API_BASE}/overview/citizen-metrics`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load citizen dashboard statistics');
  return res.json();
}

// --- Complaints Endpoints ---

export async function fetchComplaints(params?: {
  status?: string;
  priority?: string;
  incident_type?: string;
  search?: string;
  scope?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; items: ComplaintSummary[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.priority) query.append('priority', params.priority);
  if (params?.incident_type) query.append('incident_type', params.incident_type);
  if (params?.search) query.append('search', params.search);
  if (params?.scope) query.append('scope', params.scope);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.offset) query.append('offset', params.offset.toString());

  const res = await fetch(`${API_BASE}/complaints?${query.toString()}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load complaints');
  return res.json();
}

export async function fetchComplaintDetail(id: string): Promise<ComplaintDetail> {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(id)}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load complaint details');
  return res.json();
}

export async function submitComplaint(formData: FormData) {
  const res = await fetch(`${API_BASE}/complaints/submit`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Submission failed' }));
    throw new Error(errorData.detail || 'Complaint submission failed');
  }
  return res.json();
}

export async function updateComplaintStatus(
  complaintId: string,
  newStatus: string,
  reason?: string
) {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ new_status: newStatus, reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Status update failed' }));
    throw new Error(err.detail || 'Failed to update status');
  }
  return res.json();
}

export async function addReviewNote(
  complaintId: string,
  payload: { reviewer_name?: string; note: string; review_status: string }
) {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to submit review note');
  return res.json();
}

export async function correctExtractedField(
  complaintId: string,
  evidenceId: string,
  fieldId: string,
  correctedValue: string,
  reason: string
) {
  const res = await fetch(
    `${API_BASE}/complaints/${encodeURIComponent(complaintId)}/evidence/${encodeURIComponent(evidenceId)}/fields/${encodeURIComponent(fieldId)}/correct`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ corrected_value: correctedValue, reason })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Correction failed' }));
    throw new Error(err.detail || 'Failed to correct field');
  }
  return res.json();
}

export async function uploadCaseEvidence(complaintId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/evidence`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload evidence' }));
    throw new Error(err.detail || 'Evidence upload failed');
  }
  return res.json();
}

// --- Import Endpoints ---

export async function previewImportComplaints(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/complaints/import/preview`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Import preview failed' }));
    throw new Error(err.detail || 'Failed to preview import file');
  }
  return res.json();
}

export async function executeImportComplaints(payload: {
  records: Array<Record<string, any>>;
  skip_duplicates?: boolean;
}) {
  const res = await fetch(`${API_BASE}/complaints/import/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Import execution failed' }));
    throw new Error(err.detail || 'Failed to execute import');
  }
  return res.json();
}

// --- Evidence & Graph Endpoints ---

export async function fetchEvidenceDetail(evidenceId: string) {
  const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load evidence details');
  return res.json();
}

export function getEvidenceFileUrl(storageFilename: string): string {
  return `${API_BASE}/evidence/file/${encodeURIComponent(storageFilename)}`;
}

export async function fetchGraph(params?: {
  focus_complaint_id?: string;
  indicator_type?: string;
  category?: string;
  relationship_type?: string;
  search?: string;
}): Promise<GraphData> {
  const query = new URLSearchParams();
  if (params?.focus_complaint_id) query.append('focus_complaint_id', params.focus_complaint_id);
  if (params?.indicator_type) query.append('indicator_type', params.indicator_type);
  if (params?.category) query.append('category', params.category);
  if (params?.relationship_type) query.append('relationship_type', params.relationship_type);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/graph?${query.toString()}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load intelligence graph');
  return res.json();
}

export async function fetchInvestigationReport(complaintId: string) {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(complaintId)}`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load investigation report');
  return res.json();
}

export async function downloadReportPdf(complaintId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(complaintId)}/pdf`, {
    headers: authHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'PDF generation failed' }));
    throw new Error(err.detail || 'Failed to download investigation report PDF');
  }
  return res.blob();
}

export async function fetchEmailConfig(): Promise<{
  smtp_configured: boolean;
  test_recipient_email: string;
  email_from: string;
}> {
  const res = await fetch(`${API_BASE}/reports/email-config`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to load email service configuration');
  return res.json();
}

export async function emailComplaintReport(
  complaintId: string,
  recipientEmail?: string
): Promise<{
  success: boolean;
  status: string;
  mode: string;
  recipient: string;
  reference_id: string;
  message: string;
  pdf_filename: string;
  pdf_size_bytes: number;
  dispatched_at: string;
}> {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(complaintId)}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ recipient_email: recipientEmail || null })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Report email dispatch failed' }));
    throw new Error(errorData.detail || 'Failed to dispatch report copy by email');
  }

  return res.json();
}

