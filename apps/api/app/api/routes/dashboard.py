from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.schemas.study import DashboardResponse
from app.services.dashboard import build_dashboard

router = APIRouter()


@router.get("/overview", response_model=DashboardResponse)
def overview(db: Session = Depends(get_db), user=Depends(get_current_user)) -> DashboardResponse:
    return build_dashboard(db, user=user)

