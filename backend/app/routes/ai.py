from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.user import User
from app.schemas.call_schema import QualifyLeadRequest, SummarizeCallRequest
from app.services.gemini_service import GeminiNotConfiguredError, gemini_service
from app.services.qualification_service import qualify_and_persist_call
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/ai", tags=["Gemini AI"])


@router.post("/qualify-lead")
def qualify_lead(
    payload: QualifyLeadRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        qualification, call_record, lead = qualify_and_persist_call(
            db=db,
            transcript=payload.transcript,
            call_id=payload.call_id,
            customer_name=payload.customer_name,
            phone_number=payload.phone_number,
            persist=payload.persist,
        )
        return {
            "qualification": qualification.model_dump(),
            "call_id": call_record.id if call_record else None,
            "lead_id": lead.id if lead else None,
        }
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/summarize-call")
def summarize_call(
    payload: SummarizeCallRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        summary = gemini_service.summarize_call(payload.transcript)
        if payload.call_id is not None:
            call_record = db.query(Call).filter(Call.id == payload.call_id).first()
            if call_record:
                call_record.summary = summary
                db.commit()
        return {"summary": summary}
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
