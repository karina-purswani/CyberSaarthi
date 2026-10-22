export type VerificationResultType = 
  | 'MATCH' 
  | 'MISMATCH' 
  | 'MISSING_IN_COMPLAINT' 
  | 'MISSING_IN_EVIDENCE' 
  | 'UNABLE_TO_VERIFY' 
  | 'MANUAL_REVIEW_REQUIRED';

export type IncidentStatus = 
  | 'AWAITING_REVIEW' 
  | 'UNDER_INVESTIGATION' 
  | 'IN_PROGRESS' 
  | 'VERIFIED' 
  | 'REJECTED'
  | 'RESOLVED';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type UserRole = 'CITIZEN' | 'OFFICER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  badge_number?: string | null;
  department?: string | null;
  phone?: string | null;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ComplaintSummary {
  id: string;
  reference_id: string;
  user_id?: string;
  submission_time: string;
  language: string;
  incident_type: string;
  reported_amount: number | null;
  reported_upi_id: string | null;
  reported_txn_id: string | null;
  status: IncidentStatus;
  priority: PriorityLevel;
  evidence_count: number;
  findings_count: number;
  mismatch_count: number;
  is_demo: boolean;
}

export interface EvidenceFile {
  id: string;
  complaint_id: string;
  original_filename: string;
  storage_filename: string;
  file_type: string;
  file_size_bytes: number;
  ocr_status: string;
  ocr_confidence: number | null;
  raw_ocr_text: string | null;
  created_at: string;
  extracted_fields?: ExtractedField[];
}

export interface ExtractedField {
  id: string;
  evidence_id: string;
  complaint_id: string;
  field_name: string;
  raw_value: string | null;
  normalized_value: string | null;
  confidence: number | null;
  source_context: string | null;
  is_officer_corrected?: boolean;
  original_value?: string | null;
  corrected_by_user_id?: string | null;
  correction_reason?: string | null;
  created_at: string;
}

export interface VerificationFinding {
  id: string;
  complaint_id: string;
  evidence_id: string | null;
  field_name: string;
  complaint_value: string | null;
  evidence_value: string | null;
  normalized_complaint_value: string | null;
  normalized_evidence_value: string | null;
  result: VerificationResultType;
  display_status?: 'Consistent' | 'Inconsistent' | 'Insufficient Data' | string;
  source_evidence?: string | null;
  reason: string;
  review_recommendation: string;
  created_at: string;
}

export interface ImportPreviewRecord {
  row_number: number;
  is_valid: boolean;
  errors: string[];
  is_duplicate: boolean;
  data: Record<string, any>;
}

export interface ImportPreviewResponse {
  total_records: number;
  valid_records: number;
  error_records: number;
  duplicate_records: number;
  preview: ImportPreviewRecord[];
  format: string;
}

export interface ImportExecuteRequest {
  records: Array<Record<string, any>>;
  skip_duplicates?: boolean;
}

export interface ImportExecuteResponse {
  total: number;
  imported: number;
  skipped: number;
  rejected: number;
  created_ids: string[];
  reference_ids: string[];
  errors: string[];
}

export interface ReviewerNote {
  id: string;
  complaint_id: string;
  reviewer_name: string;
  reviewer_full_name?: string;
  badge_number?: string;
  note: string;
  review_status: string;
  created_at: string;
}

export interface StatusHistoryItem {
  id: string;
  complaint_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_name?: string | null;
  changed_by_role?: string | null;
  reason?: string | null;
  timestamp: string;
}

export interface RelatedLead {
  id: string;
  reference_id: string;
  incident_type: string;
  reported_amount: number | null;
  indicator_type: string;
  normalized_value: string;
  rule_applied: string;
}

export interface ComplaintDetail {
  complaint: {
    id: string;
    reference_id: string;
    user_id?: string;
    submission_time: string;
    language: string;
    incident_type: string;
    description: string;
    reported_amount: number | null;
    reported_txn_id: string | null;
    reported_upi_id: string | null;
    incident_datetime: string | null;
    victim_phone: string | null;
    victim_state: string | null;
    status: IncidentStatus;
    priority: PriorityLevel;
    is_demo: boolean;
    created_at: string;
    updated_at: string;
  };
  evidence_files: EvidenceFile[];
  extracted_fields: ExtractedField[];
  verification_findings: VerificationFinding[];
  status_history?: StatusHistoryItem[];
  reviewer_notes: ReviewerNote[];
  related_leads: RelatedLead[];
}

export interface GraphNode {
  id: string;
  type: string;
  category?: string;
  label: string;
  reference_id?: string;
  incident_type?: string;
  amount?: number | null;
  status?: string;
  priority?: string;
  indicator_type?: string;
  raw_value?: string;
  normalized_value?: string;
  details?: Record<string, any>;
  source_evidence?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  relationship_type?: string;
  rule_applied: string;
  basis_rule?: string;
  explanation: string;
  evidence_id: string | null;
  evidence_filename: string | null;
  source_evidence?: string | null;
}

export interface GraphCluster {
  indicator_id: string;
  connected_complaints: string[];
  count: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
  lead_disclaimer: string;
}

export interface OverviewMetrics {
  total_complaints: number;
  awaiting_review: number;
  under_investigation: number;
  verified?: number;
  resolved?: number;
  evidence_needing_manual_review: number;
  complaints_with_shared_indicators: number;
  total_amount_reported: number;
  recent_submissions: Array<{
    id: string;
    reference_id: string;
    submission_time: string;
    incident_type: string;
    reported_amount: number | null;
    status: string;
    priority: string;
    is_demo: boolean;
  }>;
}

export interface CitizenMetrics {
  total_complaints: number;
  awaiting_review: number;
  in_progress: number;
  verified_or_resolved: number;
  total_reported_loss: number;
  recent_complaints: Array<{
    id: string;
    reference_id: string;
    submission_time: string;
    incident_type: string;
    reported_amount: number | null;
    status: string;
    priority: string;
  }>;
}

export interface VoiceTranscriptionResult {
  success: boolean;
  transcript: string | null;
  language: string;
  duration_seconds: number | null;
  error_type: string | null;
  message: string;
}
