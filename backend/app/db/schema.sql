-- CyberSaarthi Database Schema

CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    reference_id TEXT NOT NULL UNIQUE,
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
    updated_at TEXT NOT NULL
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
    created_at TEXT NOT NULL,
    FOREIGN KEY(evidence_id) REFERENCES evidence_files(id) ON DELETE CASCADE,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
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
    note TEXT NOT NULL,
    review_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- Indexes for efficient triage and linking
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_ref ON complaints(reference_id);
CREATE INDEX IF NOT EXISTS idx_evidence_complaint ON evidence_files(complaint_id);
CREATE INDEX IF NOT EXISTS idx_extracted_complaint ON extracted_fields(complaint_id);
CREATE INDEX IF NOT EXISTS idx_findings_complaint ON verification_findings(complaint_id);
CREATE INDEX IF NOT EXISTS idx_graph_rel_complaint ON graph_relationships(complaint_id);
CREATE INDEX IF NOT EXISTS idx_graph_rel_indicator ON graph_relationships(indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicators_norm ON graph_indicators(normalized_value);
