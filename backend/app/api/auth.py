import re
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.db.database import get_connection
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserProfile,
    ChangePasswordRequest
)

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

def log_audit_event(
    conn,
    user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    details: Optional[str],
    ip_address: Optional[str]
):
    audit_id = f"aud_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (audit_id, user_id, action, resource_type, resource_id, details, ip_address, now_iso)
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_citizen(payload: RegisterRequest, request: Request):
    """
    Public registration endpoint. Exclusively creates accounts with 'CITIZEN' role.
    Officer accounts must be provisioned via secure administrative processes.
    """
    email_clean = payload.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(status_code=400, detail="Invalid email address format.")
    
    conn = get_connection()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email_clean,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email address already exists.")

        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        pw_hash = hash_password(payload.password)
        now_iso = datetime.now(timezone.utc).isoformat()
        
        conn.execute(
            """
            INSERT INTO users (
                id, email, password_hash, full_name, role, badge_number,
                department, phone, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'CITIZEN', NULL, NULL, ?, 1, ?, ?)
            """,
            (user_id, email_clean, pw_hash, payload.full_name.strip(), payload.phone, now_iso, now_iso)
        )

        client_ip = request.client.host if request.client else None
        log_audit_event(
            conn=conn,
            user_id=user_id,
            action="CITIZEN_REGISTERED",
            resource_type="USER",
            resource_id=user_id,
            details=f"Citizen registered: {email_clean}",
            ip_address=client_ip
        )
        conn.commit()

        user_profile = UserProfile(
            id=user_id,
            email=email_clean,
            full_name=payload.full_name.strip(),
            role="CITIZEN",
            badge_number=None,
            department=None,
            phone=payload.phone,
            created_at=now_iso
        )

        token = create_access_token({
            "sub": user_id,
            "email": email_clean,
            "role": "CITIZEN",
            "full_name": payload.full_name.strip()
        })

        return TokenResponse(access_token=token, token_type="bearer", user=user_profile)
    finally:
        conn.close()

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request):
    """
    Authenticates Citizen or Officer credentials and returns a signed JWT access token.
    Enforces strict portal segregation: Citizens cannot access Officer portals.
    """
    email_clean = payload.email.strip().lower()
    conn = get_connection()
    try:
        user_row = conn.execute("SELECT * FROM users WHERE email = ?", (email_clean,)).fetchone()
        if not user_row or not verify_password(payload.password, user_row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        if not user_row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Contact an administrator."
            )

        # Enforce portal segregation
        user_role = user_row["role"]
        portal = (payload.portal_type or "").lower()
        if portal == "officer" and user_role not in ("OFFICER", "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted: Citizen credentials cannot access the Law Enforcement Officer Workspace."
            )

        client_ip = request.client.host if request.client else None
        log_audit_event(
            conn=conn,
            user_id=user_row["id"],
            action="USER_LOGIN",
            resource_type="USER",
            resource_id=user_row["id"],
            details=f"Successful login to {portal or 'general'} portal",
            ip_address=client_ip
        )
        conn.commit()

        user_profile = UserProfile(
            id=user_row["id"],
            email=user_row["email"],
            full_name=user_row["full_name"],
            role=user_row["role"],
            badge_number=user_row["badge_number"],
            department=user_row["department"],
            phone=user_row["phone"],
            created_at=user_row["created_at"]
        )

        token = create_access_token({
            "sub": user_row["id"],
            "email": user_row["email"],
            "role": user_row["role"],
            "full_name": user_row["full_name"]
        })

        return TokenResponse(access_token=token, token_type="bearer", user=user_profile)
    finally:
        conn.close()

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's profile.
    """
    return UserProfile(**current_user)

@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user), request: Request = None):
    """
    Allows authenticated users to change their password securely.
    """
    user_id = current_user["id"]
    conn = get_connection()
    try:
        user_row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row or not verify_password(payload.current_password, user_row["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password incorrect.")

        new_hash = hash_password(payload.new_password)
        now_iso = datetime.now(timezone.utc).isoformat()
        conn.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (new_hash, now_iso, user_id))
        
        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=user_id,
            action="PASSWORD_CHANGED",
            resource_type="USER",
            resource_id=user_id,
            details="Password successfully updated",
            ip_address=client_ip
        )
        conn.commit()
        return {"success": True, "message": "Password updated successfully."}
    finally:
        conn.close()

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user), request: Request = None):
    """
    Audit-logs session termination.
    """
    conn = get_connection()
    try:
        client_ip = request.client.host if request and request.client else None
        log_audit_event(
            conn=conn,
            user_id=current_user["id"],
            action="USER_LOGOUT",
            resource_type="USER",
            resource_id=current_user["id"],
            details="User logged out",
            ip_address=client_ip
        )
        conn.commit()
        return {"success": True, "message": "Logged out successfully."}
    finally:
        conn.close()
