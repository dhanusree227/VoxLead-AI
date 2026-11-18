from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models.call import Call
from app.models.lead import Lead
from app.schemas.call_schema import LeadQualificationResult
from app.services.gemini_service import gemini_service


def qualify_and_persist_call(
    db: Session,
    transcript: str,
    call_id: Optional[int] = None,
    customer_name: Optional[str] = None,
    phone_number: Optional[str] = None,
    duration: int = 0,
    vapi_call_id: Optional[str] = None,
    persist: bool = True,
) -> Tuple[LeadQualificationResult, Optional[Call], Optional[Lead]]:
    qualification = gemini_service.qualify_lead_from_transcript(transcript)

    if not persist:
        return qualification, None, None

    resolved_name = (
        qualification.customer_name
        if qualification.customer_name and qualification.customer_name != "Not provided"
        else (customer_name or "Inbound Prospect")
    )

    lead = Lead(
        customer_name=resolved_name,
        phone_number=phone_number,
        budget=qualification.budget,
        requirements=qualification.customer_requirements,
        purchase_timeline=qualification.purchase_timeline,
        interest_level=qualification.interest_level,
        lead_status=qualification.lead_status,
        lead_source="AI Voice Call",
    )
    db.add(lead)
    db.flush()

    call_record: Optional[Call] = None
    if call_id is not None:
        call_record = db.query(Call).filter(Call.id == call_id).first()

    if call_record is None:
        call_record = Call(
            lead_id=lead.id,
            vapi_call_id=vapi_call_id,
            customer_name=resolved_name,
            phone_number=phone_number,
            call_status="Completed",
            duration=duration,
            transcript=transcript,
            summary=qualification.summary,
            qualification_result=qualification.model_dump(),
            follow_up_recommendation=qualification.follow_up_recommendation,
        )
        db.add(call_record)
    else:
        call_record.lead_id = lead.id
        call_record.customer_name = resolved_name
        call_record.summary = qualification.summary
        call_record.qualification_result = qualification.model_dump()
        call_record.follow_up_recommendation = qualification.follow_up_recommendation

    db.commit()
    db.refresh(lead)
    db.refresh(call_record)
    return qualification, call_record, lead
