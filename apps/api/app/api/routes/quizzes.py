from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import enforce_rate_limit, get_current_user, get_db
from app.models.entities import QuizAttempt, QuizAttemptAnswer, QuizQuestion, QuizSet
from app.schemas.study import (
    QuizAttemptRequest,
    QuizAttemptResponse,
    QuizGenerationRequest,
    QuizQuestionResponse,
    QuizSetResponse,
)
from app.services.study import generate_quiz_set, performance_overview, submit_quiz_attempt

router = APIRouter()


@router.post("/generate", response_model=QuizSetResponse, dependencies=[Depends(enforce_rate_limit)])
def generate_quiz_endpoint(
    payload: QuizGenerationRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> QuizSetResponse:
    quiz = generate_quiz_set(db, user=user, payload=payload)
    return get_quiz_set(quiz.id, db=db, user=user)


@router.get("/sets/{quiz_id}", response_model=QuizSetResponse)
def get_quiz_set(quiz_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> QuizSetResponse:
    quiz = db.query(QuizSet).filter(QuizSet.id == quiz_id, QuizSet.user_id == user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz set not found.")
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_set_id == quiz.id).order_by(QuizQuestion.order_index.asc()).all()
    return QuizSetResponse(
        **QuizSetResponse.model_validate(quiz).model_dump(),
        questions=[QuizQuestionResponse.model_validate(question) for question in questions],
    )


@router.post("/attempts", response_model=QuizAttemptResponse)
def submit_attempt(
    payload: QuizAttemptRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> QuizAttemptResponse:
    attempt = submit_quiz_attempt(db, user=user, payload=payload)
    return get_attempt(attempt.id, db=db, user=user)


@router.get("/attempts/{attempt_id}", response_model=QuizAttemptResponse)
def get_attempt(attempt_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)) -> QuizAttemptResponse:
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user.id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    answers = db.query(QuizAttemptAnswer).filter(QuizAttemptAnswer.quiz_attempt_id == attempt.id).all()
    return QuizAttemptResponse(
        **QuizAttemptResponse.model_validate(attempt).model_dump(),
        answers=answers,
    )


@router.get("/performance/overview")
def performance(db: Session = Depends(get_db), user=Depends(get_current_user)) -> dict:
    return performance_overview(db, user=user)

