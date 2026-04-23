from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.main import app
from app.models.entities import Course, Department, Enrollment, Material, University, User
from app.models.enums import MaterialKind, ProcessingStage, ProcessingStatus, UserRole


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    from app.core.deps import get_db

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_data(db_session):
    university = University(name="Test University", slug="test-u", email_domain="student.pacific.edu")
    db_session.add(university)
    db_session.flush()
    department = Department(university_id=university.id, name="Computer Science", code="CS")
    db_session.add(department)
    db_session.flush()
    course = Course(
        university_id=university.id,
        department_id=department.id,
        code="CS101",
        title="Intro to Testing",
        description="Test course",
        term="Fall",
        year=2026,
    )
    owner = User(
        email="owner@student.pacific.edu",
        hashed_password=hash_password("StudentPass123!"),
        name="Owner Student",
        role=UserRole.STUDENT,
        university_id=university.id,
        major="CS",
        semester="Semester 1",
    )
    other = User(
        email="other@student.pacific.edu",
        hashed_password=hash_password("StudentPass123!"),
        name="Other Student",
        role=UserRole.STUDENT,
        university_id=university.id,
        major="CS",
        semester="Semester 1",
    )
    admin = User(
        email="admin@pacific.edu",
        hashed_password=hash_password("AdminPass123!"),
        name="Admin",
        role=UserRole.ADMIN,
        university_id=university.id,
        major="Admin",
        semester="Staff",
    )
    db_session.add_all([course, owner, other, admin])
    db_session.flush()
    db_session.add_all(
        [
            Enrollment(user_id=owner.id, course_id=course.id, status="active"),
            Enrollment(user_id=other.id, course_id=course.id, status="active"),
        ]
    )
    material = Material(
        owner_user_id=owner.id,
        course_id=course.id,
        title="Private Notes",
        file_name="notes.txt",
        file_type="txt",
        mime_type="text/plain",
        size_bytes=42,
        storage_key="tests/private-notes.txt",
        source_kind=MaterialKind.DOCUMENT,
        processing_stage=ProcessingStage.COMPLETED,
        processing_status=ProcessingStatus.COMPLETED,
        extracted_text="Testing protects behavior.",
        source_metadata={},
    )
    db_session.add(material)
    db_session.commit()
    return {
        "university": university,
        "department": department,
        "course": course,
        "owner": owner,
        "other": other,
        "admin": admin,
        "material": material,
    }


def bearer_for(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}
