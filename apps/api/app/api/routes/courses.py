from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.entities import Course, CourseTopic, Department, Enrollment, Material
from app.schemas.course import CourseResponse, EnrollmentRequest, EnrollmentResponse, TopicResponse

router = APIRouter()


@router.get("", response_model=list[CourseResponse])
def list_courses(db: Session = Depends(get_db), user=Depends(get_current_user)) -> list[CourseResponse]:
    rows = (
        db.query(
            Course,
            Department.name.label("department_name"),
            func.count(func.distinct(CourseTopic.id)).label("topic_count"),
            func.count(func.distinct(Material.id)).label("material_count"),
        )
        .join(Department, Course.department_id == Department.id)
        .outerjoin(CourseTopic, CourseTopic.course_id == Course.id)
        .outerjoin(Material, Material.course_id == Course.id)
        .group_by(Course.id, Department.name)
        .order_by(Course.code.asc())
        .all()
    )
    return [
        CourseResponse.model_validate(
            {
                **course.__dict__,
                "department_name": department_name,
                "topic_count": topic_count,
                "material_count": material_count,
            }
        )
        for course, department_name, topic_count, material_count in rows
    ]


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> CourseResponse:
    course = db.query(Course).filter(Course.id == course_id, Course.deleted_at.is_(None)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    topics = db.query(CourseTopic).filter(CourseTopic.course_id == course_id, CourseTopic.deleted_at.is_(None)).all()
    department = db.query(Department).filter(Department.id == course.department_id).first() if course else None
    material_count = db.query(Material).filter(Material.course_id == course_id, Material.deleted_at.is_(None)).count()
    return CourseResponse.model_validate(
        {
            **course.__dict__,
            "department_name": department.name if department else None,
            "topic_count": len(topics),
            "material_count": material_count,
            "topics": [TopicResponse.model_validate(topic) for topic in topics],
        }
    )


@router.post("/enrollments", response_model=EnrollmentResponse)
def enroll(
    payload: EnrollmentRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> Enrollment:
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.course_id == payload.course_id)
        .first()
    )
    if not enrollment:
        enrollment = Enrollment(user_id=user.id, course_id=payload.course_id, status="active")
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
    return enrollment
