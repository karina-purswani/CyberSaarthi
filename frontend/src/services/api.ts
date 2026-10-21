import type {
  ComplaintSummary,
  ComplaintDetail,
  OverviewMetrics,
  GraphData,
  DemoCase
} from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchOverviewMetrics(): Promise<OverviewMetrics> {
  const res = await fetch(`${API_BASE}/overview/metrics`);
  if (!res.ok) throw new Error('Failed to load overview metrics');
  return res.json();
}

export async function fetchComplaints(params?: {
  status?: string;
  priority?: string;
  incident_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; items: ComplaintSummary[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.priority) query.append('priority', params.priority);
  if (params?.incident_type) query.append('incident_type', params.incident_type);
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.offset) query.append('offset', params.offset.toString());

  const res = await fetch(`${API_BASE}/complaints?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load complaints');
  return res.json();
}

export async function fetchComplaintDetail(id: string): Promise<ComplaintDetail> {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load complaint details');
  return res.json();
}

export async function submitComplaint(formData: FormData) {
  const res = await fetch(`${API_BASE}/complaints/submit`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Submission failed' }));
    throw new Error(errorData.detail || 'Complaint submission failed');
  }
  return res.json();
}

export async function addReviewNote(
  complaintId: string,
  payload: { reviewer_name: string; note: string; review_status: string }
) {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(complaintId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to submit review note');
  return res.json();
}

export async function fetchEvidenceDetail(evidenceId: string) {
  const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}`);
  if (!res.ok) throw new Error('Failed to load evidence details');
  return res.json();
}

export async function fetchGraph(params?: {
  focus_complaint_id?: string;
  indicator_type?: string;
}): Promise<GraphData> {
  const query = new URLSearchParams();
  if (params?.focus_complaint_id) query.append('focus_complaint_id', params.focus_complaint_id);
  if (params?.indicator_type) query.append('indicator_type', params.indicator_type);

  const res = await fetch(`${API_BASE}/graph?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load intelligence graph');
  return res.json();
}

export async function fetchInvestigationReport(complaintId: string) {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(complaintId)}`);
  if (!res.ok) throw new Error('Failed to load investigation report');
  return res.json();
}

export async function fetchDemoCases(): Promise<{ scenarios: DemoCase[] }> {
  const res = await fetch(`${API_BASE}/demo/cases`);
  if (!res.ok) throw new Error('Failed to load demo cases');
  return res.json();
}

export async function seedDemoData() {
  const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to seed demo data');
  return res.json();
}

export async function resetDemoData() {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo data');
  return res.json();
}
