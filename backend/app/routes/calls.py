from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.user import User
from app.schemas.call_schema import CallCreateRequest, CallResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/calls", tags=["Calls"])


@router.get("", response_model=List[CallResponse])
def list_calls(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Call).order_by(Call.created_at.desc()).all()


@router.post("", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
def create_call(
    payload: CallCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    call = Call(**payload.model_dump())
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


@router.get("/{call_id}", response_model=CallResponse)
def get_call(
    call_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found.")
    return call
