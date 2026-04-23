from app.schemas.common import CamelModel


class AdminMetricsResponse(CamelModel):
    total_users: int
    total_courses: int
    total_materials: int
    failed_jobs: int
    active_students: int

