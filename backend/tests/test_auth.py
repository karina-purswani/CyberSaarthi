import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_officer_default_login():
    res = client.post("/api/auth/login", json={
        "email": "officer@cybersaarthi.gov.in",
        "password": "Officer@CyberSaarthi2026",
        "portal_type": "officer"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "OFFICER"
    assert data["user"]["email"] == "officer@cybersaarthi.gov.in"

def test_citizen_default_login():
    res = client.post("/api/auth/login", json={
        "email": "citizen@example.com",
        "password": "Citizen@CyberSaarthi2026",
        "portal_type": "citizen"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "CITIZEN"

def test_portal_segregation_citizen_blocked_from_officer_portal():
    res = client.post("/api/auth/login", json={
        "email": "citizen@example.com",
        "password": "Citizen@CyberSaarthi2026",
        "portal_type": "officer"
    })
    assert res.status_code == 403
    assert "Access restricted" in res.json()["detail"]

def test_invalid_login_credentials():
    res = client.post("/api/auth/login", json={
        "email": "officer@cybersaarthi.gov.in",
        "password": "WrongPassword123!",
        "portal_type": "officer"
    })
    assert res.status_code == 401

def test_citizen_registration_and_me():
    import uuid
    rand_email = f"test_{uuid.uuid4().hex[:8]}@citizen.org"
    res = client.post("/api/auth/register", json={
        "email": rand_email,
        "password": "SecurePassword2026!",
        "full_name": "Test Citizen User",
        "phone": "9812345678"
    })
    assert res.status_code == 201
    data = res.json()
    token = data["access_token"]
    assert data["user"]["role"] == "CITIZEN"

    # Test /api/auth/me with Bearer token
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    me = res_me.json()
    assert me["email"] == rand_email
    assert me["role"] == "CITIZEN"

def test_auth_me_unauthorized():
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_officer_provisioning_with_admin_key():
    import uuid
    rand_email = f"officer_{uuid.uuid4().hex[:8]}@cybersaarthi.gov.in"
    res = client.post("/api/auth/officer/provision", json={
        "email": rand_email,
        "password": "OfficerPassword2026!",
        "full_name": "Sub-Inspector Anita Desai",
        "badge_number": "MH-CYBER-5501",
        "department": "Cyber Crime Cell Thane",
        "phone": "9820011223",
        "role": "OFFICER",
        "admin_key": "CyberSaarthiOfficerSetup2026"
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "OFFICER"
    assert data["user"]["email"] == rand_email
    assert data["user"]["badge_number"] == "MH-CYBER-5501"

    # Test that newly provisioned officer can log in to the officer portal
    login_res = client.post("/api/auth/login", json={
        "email": rand_email,
        "password": "OfficerPassword2026!",
        "portal_type": "officer"
    })
    assert login_res.status_code == 200

def test_officer_provisioning_unauthorized():
    import uuid
    rand_email = f"fake_{uuid.uuid4().hex[:8]}@police.gov.in"
    res = client.post("/api/auth/officer/provision", json={
        "email": rand_email,
        "password": "SomePassword123!",
        "full_name": "Unauthorized Actor",
        "admin_key": "WrongInvalidCode"
    })
    assert res.status_code == 403
    assert "administrative authorization" in res.json()["detail"].lower()

def test_list_system_users_officer_access():
    login_res = client.post("/api/auth/login", json={
        "email": "officer@cybersaarthi.gov.in",
        "password": "Officer@CyberSaarthi2026",
        "portal_type": "officer"
    })
    token = login_res.json()["access_token"]
    res = client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 2
    emails = [u["email"] for u in users]
    assert "officer@cybersaarthi.gov.in" in emails

