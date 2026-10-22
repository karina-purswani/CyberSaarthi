import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from app.db.database import get_connection
from app.core.security import hash_password

def run_migrations(conn):
    """
    Applies non-destructive schema migrations to existing SQLite database.
    """
    # 1. Check complaints table columns
    complaint_cols = [row[1] for row in conn.execute("PRAGMA table_info(complaints)").fetchall()]
    if "user_id" not in complaint_cols:
        conn.execute("ALTER TABLE complaints ADD COLUMN user_id TEXT")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id)")
        
    # 2. Check extracted_fields table columns
    ef_cols = [row[1] for row in conn.execute("PRAGMA table_info(extracted_fields)").fetchall()]
    if "is_officer_corrected" not in ef_cols:
        conn.execute("ALTER TABLE extracted_fields ADD COLUMN is_officer_corrected INTEGER NOT NULL DEFAULT 0")
    if "original_value" not in ef_cols:
        conn.execute("ALTER TABLE extracted_fields ADD COLUMN original_value TEXT")
    if "corrected_by_user_id" not in ef_cols:
        conn.execute("ALTER TABLE extracted_fields ADD COLUMN corrected_by_user_id TEXT")
    if "correction_reason" not in ef_cols:
        conn.execute("ALTER TABLE extracted_fields ADD COLUMN correction_reason TEXT")

    # 3. Check reviewer_notes table columns
    rn_cols = [row[1] for row in conn.execute("PRAGMA table_info(reviewer_notes)").fetchall()]
    if "reviewer_user_id" not in rn_cols:
        conn.execute("ALTER TABLE reviewer_notes ADD COLUMN reviewer_user_id TEXT")

    # 4. Check verification_findings table columns
    vf_cols = [row[1] for row in conn.execute("PRAGMA table_info(verification_findings)").fetchall()]
    if "display_status" not in vf_cols:
        conn.execute("ALTER TABLE verification_findings ADD COLUMN display_status TEXT")

def seed_default_accounts(conn):
    """
    Provisions standard development/prototype roles if not present.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    
    accounts = [
        {
            "id": "usr_officer_sharma",
            "email": "officer@cybersaarthi.gov.in",
            "password": "Officer@CyberSaarthi2026",
            "full_name": "Inspector Rajesh Sharma",
            "role": "OFFICER",
            "badge_number": "MH-CYBER-8821",
            "department": "State Cyber Crime Investigation Cell",
            "phone": "9820011999"
        },
        {
            "id": "usr_admin_ops",
            "email": "admin@cybersaarthi.gov.in",
            "password": "Admin@CyberSaarthi2026",
            "full_name": "CyberSaarthi System Administrator",
            "role": "ADMIN",
            "badge_number": "SYS-ADMIN-01",
            "department": "CyberSaarthi Infrastructure & Security",
            "phone": "9820011000"
        },
        {
            "id": "usr_citizen_patel",
            "email": "citizen@example.com",
            "password": "Citizen@CyberSaarthi2026",
            "full_name": "Aarav Patel",
            "role": "CITIZEN",
            "badge_number": None,
            "department": None,
            "phone": "9820011223"
        }
    ]

    for acc in accounts:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (acc["email"],)).fetchone()
        if not existing:
            pw_hash = hash_password(acc["password"])
            conn.execute(
                """
                INSERT INTO users (
                    id, email, password_hash, full_name, role, badge_number,
                    department, phone, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    acc["id"], acc["email"], pw_hash, acc["full_name"],
                    acc["role"], acc["badge_number"], acc["department"],
                    acc["phone"], now_iso, now_iso
                )
            )

    # Link historical unassigned complaints to the default citizen account so they are not orphaned
    conn.execute(
        "UPDATE complaints SET user_id = 'usr_citizen_patel' WHERE user_id IS NULL OR user_id = ''"
    )

def init_db():
    schema_path = Path(__file__).parent / "schema.sql"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    
    conn = get_connection()
    try:
        conn.executescript(schema_sql)
        run_migrations(conn)
        seed_default_accounts(conn)
        conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized and migrated successfully.")
