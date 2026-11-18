import logging
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.voice_schema import VoiceChatRequest, VoiceStartRequest
from app.services.gemini_service import GeminiNotConfiguredError, gemini_service
from app.services.qualification_service import qualify_and_persist_call
from app.services.vapi_service import vapi_service
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["Voice AI"])


@router.get("/config")
def get_voice_config(_: User = Depends(get_current_user)):
    return vapi_service.get_public_browser_config()


@router.post("/start")
async def start_voice_call(
    payload: VoiceStartRequest,
    _: User = Depends(get_current_user),
):
    return await vapi_service.start_browser_session(payload.assistant_config)


@router.post("/chat")
def voice_conversation_turn(
    payload: VoiceChatRequest,
    _: User = Depends(get_current_user),
):
    system_prompt = (
        payload.assistant_config.system_prompt
        if payload.assistant_config
        else "You are VoxLead AI, a polite B2B lead qualification voice assistant."
    )
    try:
        return gemini_service.generate_voice_turn(
            system_prompt=system_prompt,
            history=[m.model_dump() for m in payload.history],
            user_message=payload.user_message,
        )
    except GeminiNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/webhook")
async def vapi_webhook(
    request: Request,
    x_vapi_signature: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    if not vapi_service.verify_webhook_signature(raw_body, x_vapi_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature.")

    payload = await request.json()
    message = payload.get("message", {})
    event_type = message.get("type")

    if event_type == "end-of-call-report":
        transcript = message.get("transcript", "")
        call_obj = message.get("call", {})
        customer_obj = call_obj.get("customer", {})
        duration = int(message.get("durationSeconds") or 0)

        if transcript.strip():
            try:
                qualification, call_record, lead = qualify_and_persist_call(
                    db=db,
                    transcript=transcript,
                    customer_name=customer_obj.get("name"),
                    phone_number=customer_obj.get("number"),
                    duration=duration,
                    vapi_call_id=call_obj.get("id"),
                    persist=True,
                )
                return {
                    "status": "processed",
                    "call_id": call_record.id if call_record else None,
                    "lead_id": lead.id if lead else None,
                    "lead_status": qualification.lead_status,
                }
            except Exception as exc:
                logger.exception("Failed to process Vapi webhook report: %s", exc)
                raise HTTPException(status_code=500, detail="Webhook processing failed.") from exc

    return {"status": "ignored", "event_type": event_type}
