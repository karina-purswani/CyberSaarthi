from typing import Optional
from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, description="Citizen's full name")
    phone: Optional[str] = Field(None, description="Contact mobile number")

class LoginRequest(BaseModel):
    email: str
    password: str
    portal_type: Optional[str] = Field(None, description="'citizen' or 'officer'")

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    badge_number: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class ProvisionOfficerRequest(BaseModel):
    email: str = Field(..., description="Official law enforcement or agency email")
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: str = Field(..., min_length=2, description="Officer's full name")
    badge_number: Optional[str] = Field(None, description="Official badge or service ID")
    department: Optional[str] = Field(None, description="Police station or investigative unit")
    phone: Optional[str] = Field(None, description="Contact phone number")
    role: Optional[str] = Field("OFFICER", description="'OFFICER' or 'ADMIN'")
    admin_key: Optional[str] = Field(None, description="Administrative authorization code for onboarding")

