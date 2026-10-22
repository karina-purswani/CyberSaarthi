-- CyberSaarthi Database Schema
-- Strict Civic-Tech Relational Schema for CyberSaarthi Platform

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('CITIZEN', 'OFFICER', 'ADMIN')),
    badge_number TEXT,
    department TEXT,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    reference_id TEXT NOT NULL UNIQUE,
    user_id TEXT,
    submission_time TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    incident_type TEXT NOT NULL,
    description TEXT NOT NULL,
    reported_amount REAL,
    reported_txn_id TEXT,
    reported_upi_id TEXT,
    incident_datetime TEXT,
    victim_phone TEXT,
    victim_state TEXT,
    status TEXT NOT NULL DEFAULT 'AWAITING_REVIEW',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by_user_id TEXT,
    reason TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY(changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS evidence_files (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    storage_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    ocr_status TEXT NOT NULL DEFAULT 'PENDING',
    raw_ocr_text TEXT,
    ocr_confidence REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS extracted_fields (
    id TEXT PRIMARY KEY,
    evidence_id TEXT NOT NULL,
    complaint_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    raw_value TEXT,
    normalized_value TEXT,
    confidence REAL,
    source_context TEXT,
    is_officer_corrected INTEGER NOT NULL DEFAULT 0,
    original_value TEXT,
    corrected_by_user_id TEXT,
    correction_reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY(corrected_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS verification_findings (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    evidence_id TEXT,
    field_name TEXT NOT NULL,
    complaint_value TEXT,
    evidence_value TEXT,
    normalized_complaint_value TEXT,
    normalized_evidence_value TEXT,
    result TEXT NOT NULL,
    reason TEXT NOT NULL,
    review_recommendation TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS graph_indicators (
    id TEXT PRIMARY KEY,
    indicator_type TEXT NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_relationships (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    indicator_id TEXT NOT NULL,
    evidence_id TEXT,
    rule_applied TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY(indicator_id) REFERENCES graph_indicators(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_id) REFERENCES evidence_files(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviewer_notes (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_user_id TEXT,
    note TEXT NOT NULL,
    review_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY(reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient triage, security lookups and graph linking
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_ref ON complaints(reference_id);
CREATE INDEX IF NOT EXISTS idx_status_history_complaint ON complaint_status_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_evidence_complaint ON evidence_files(complaint_id);
CREATE INDEX IF NOT EXISTS idx_extracted_complaint ON extracted_fields(complaint_id);
CREATE INDEX IF NOT EXISTS idx_findings_complaint ON verification_findings(complaint_id);
CREATE INDEX IF NOT EXISTS idx_graph_rel_complaint ON graph_relationships(complaint_id);
CREATE INDEX IF NOT EXISTS idx_graph_rel_indicator ON graph_relationships(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicators_norm ON graph_indicators(normalized_value);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
