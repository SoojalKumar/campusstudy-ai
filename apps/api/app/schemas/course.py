from pydantic import Field

from app.schemas.common import CamelModel, TimestampsMixin


class UniversityResponse(TimestampsMixin):
    name: str
    slug: str
    email_domain: str | None
    allow_self_signup: bool


class DepartmentResponse(TimestampsMixin):
    university_id: str
    name: str
    code: str


class TopicResponse(TimestampsMixin):
    course_id: str
    parent_topic_id: str | None
    title: str
    description: str | None


class CourseResponse(TimestampsMixin):
    university_id: str
    department_id: str
    code: str
    title: str
    description: str | None
    term: str
    year: int
    is_active: bool
    department_name: str | None = None
    topic_count: int = 0
    material_count: int = 0
    topics: list[TopicResponse] = Field(default_factory=list)


class EnrollmentRequest(CamelModel):
    course_id: str


class EnrollmentResponse(TimestampsMixin):
    user_id: str
    course_id: str
    status: str
