# CyberSaarthi System Architecture

## Overview
CyberSaarthi is a civic-tech cyber-fraud evidence intelligence and investigation-support platform. It processes fragmented victim complaints (text, audio statements, payment receipts/screenshots), extracts verifiable transactional entities, executes deterministic consistency checks, and derives transparent cross-complaint relationship intelligence.

## Architectural Principles
1. **Source Traceability First**: Every verification status, mismatch, or cross-complaint connection must retain direct provenance to the supporting citizen input or raw OCR token.
2. **Deterministic Integrity**: Financial and identifier comparisons rely on exact normalization rules, decimal math, and unambiguous semantic states—never hallucinated by an LLM.
3. **Investigative Lead Clarification**: Graph connections represent investigative leads based on shared observable indicators; they do not pronounce legal guilt or official police disposition.
4. **Resilient Local Execution**: Operates completely on local CPU without mandatory external API keys or cloud database dependencies.

## Component Breakdown

### 1. Presentation Layer (Frontend)
- **Framework**: React 19 + TypeScript + Vite.
- **Visual Design**: Restrained Civic-Tech design tokens (Light theme, Brand Teal `#176B65`, Surface `#FFFFFF`, Background `#F6F7F5`, Border `#E0E5E2`).
- **Workspaces**:
  - **Citizen Intake**: Accessible reporting flow with multilingual support (English, Hindi, Marathi), live file previews, structured optional inputs, and progress tracking.
  - **Officer Investigation Workspace**:
    - *Overview*: Aggregate metrics, active triage queue, recent activity, system health.
    - *Complaint Queue*: Filterable, searchable data grid with priority indicators.
    - *Case Details*: Provenance-tagged complaint view, verification findings matrix, reviewer notes, audit log.
    - *Evidence Review*: Side-by-side inspection comparing original document images with raw OCR and normalized tokens.
    - *Intelligence Graph*: Interactive node-edge visualization showing shared indicators with detailed provenance inspection.
    - *Reports*: Formal investigation-support dossier generator with print and JSON export.

### 2. Service Layer (Backend)
- **Framework**: FastAPI (Python 3.14).
- **Core Modules**:
  - `evidence_extraction.py`: RapidOCR integration, payment screenshot entity parsing (Amount, Txn ID, UPI ID, Phone, Timestamp, App Name).
  - `field_normalization.py`: Safe decimal conversion, currency cleaning, canonical UPI identifier normalization, ISO 8601 timestamp parsing.
  - `verification_engine.py`: Six-state consistency engine (`MATCH`, `MISMATCH`, `MISSING_IN_COMPLAINT`, `MISSING_IN_EVIDENCE`, `UNABLE_TO_VERIFY`, `MANUAL_REVIEW_REQUIRED`).
  - `intelligence_graph.py`: Entity linking engine establishing relationships (`Complaint -> HasIndicator -> Identifier <- HasIndicator <- Complaint`) with rule provenance and lead notices.
  - `report_generation.py`: Assembles structured case summaries for export.

### 3. Data & Storage Layer
- **Database**: SQLite with WAL mode, normalized tables with foreign key cascades.
- **File Storage**: Local file system storage using cryptographically random UUID names, mime-type verification, and path containment to prevent directory traversal.
