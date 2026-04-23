from pydantic import EmailStr, Field

from app.schemas.common import CamelModel


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    university_id: str | None = None
    major: str | None = None
    semester: str | None = None


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class UserResponse(CamelModel):
    id: str
    email: str
    name: str
    role: str
    university_id: str | None
    university_name: str | None = None
    major: str | None
    semester: str | None
    avatar_url: str | None
    is_active: bool


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

