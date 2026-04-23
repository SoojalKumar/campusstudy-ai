from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import University, User
from app.models.enums import UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


def serialize_user(user: User, university_name: str | None = None) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        university_id=user.university_id,
        university_name=university_name,
        major=user.major,
        semester=user.semester,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
    )


def register_user(db: Session, payload: RegisterRequest, allowed_domains: set[str]) -> TokenResponse:
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    domain = payload.email.split("@")[-1].lower()
    if allowed_domains and domain not in allowed_domains:
        raise HTTPException(status_code=400, detail="Email domain is not allowed for this campus pilot.")

    university = None
    if payload.university_id:
        university = db.query(University).filter(University.id == payload.university_id).first()
        if not university:
            raise HTTPException(status_code=404, detail="University not found.")

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        name=payload.name,
        role=UserRole.STUDENT,
        university_id=payload.university_id,
        major=payload.major,
        semester=payload.semester,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=serialize_user(user, university.name if university else None))


def login_user(db: Session, payload: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    university_name = None
    if user.university_id:
        university = db.query(University).filter(University.id == user.university_id).first()
        university_name = university.name if university else None
    token = create_access_token(user.id, user.role.value)
    return TokenResponse(access_token=token, user=serialize_user(user, university_name))

