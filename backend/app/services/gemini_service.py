import json
import logging
from typing import List

from google import genai
from google.genai import types

from app.config import get_settings
from app.schemas.call_schema import LeadQualificationResult

logger = logging.getLogger(__name__)


class GeminiNotConfiguredError(RuntimeError):
    pass


class GeminiService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        key = (self.settings.gemini_api_key or "").strip()
        return bool(key and key != "MY_GEMINI_API_KEY")

    def _get_client(self) -> genai.Client:
        if not self.is_configured():
            raise GeminiNotConfiguredError(
                "GEMINI_API_KEY is not configured. Set it in your environment variables."
            )
        return genai.Client(api_key=self.settings.gemini_api_key)

    def qualify_lead_from_transcript(self, transcript: str) -> LeadQualificationResult:
        client = self._get_client()

        system_instruction = (
            "You are an expert B2B revenue operations analyst. Analyze the voice call transcript "
            "and extract lead qualification data strictly from what the customer stated. "
            "Never invent or fabricate customer information. If a field was not mentioned, return 'Not provided'.\n\n"
            "Classification guidelines:\n"
            "- Hot: Strong purchase interest, clear requirements, budget identified, ready to purchase soon.\n"
            "- Warm: Interested but needs more information, decision not immediate, partial requirements known.\n"
            "- Cold: Little or no purchase interest, no clear requirement, not planning to purchase."
        )

        response = client.models.generate_content(
            model=self.settings.gemini_model,
            contents=f"Analyze the following sales call transcript:\n\n{transcript}",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=LeadQualificationResult,
            ),
        )

        raw_text = (response.text or "").strip()
        if not raw_text:
            raise ValueError("Gemini returned an empty qualification response.")

        parsed = json.loads(raw_text)
        return LeadQualificationResult.model_validate(parsed)

    def summarize_call(self, transcript: str) -> str:
        client = self._get_client()
        response = client.models.generate_content(
            model=self.settings.gemini_model,
            contents=(
                "Provide a concise 2-3 sentence executive summary of this sales call transcript, "
                "highlighting customer needs, budget, timeline, and outcome without inventing facts:\n\n"
                f"{transcript}"
            ),
        )
        return (response.text or "").strip()

    def generate_voice_turn(
        self,
        system_prompt: str,
        history: List[dict],
        user_message: str,
    ) -> dict:
        client = self._get_client()
        transcript_context = "\n".join(
            f"{'AI' if m['role'] == 'assistant' else 'Customer'}: {m['content']}"
            for m in history
        )
        prompt = (
            f"{system_prompt}\n\n"
            "Return JSON with fields: reply (string, max 2 natural spoken sentences) and "
            "should_end_call (boolean, true only when requirements, budget, and timeline are collected "
            "or the customer asks to end the call). Never repeat already answered questions.\n\n"
            f"Conversation so far:\n{transcript_context}\nCustomer: {user_message}"
        )

        response = client.models.generate_content(
            model=self.settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        data = json.loads((response.text or "{}").strip())
        return {
            "reply": str(data.get("reply") or "Thank you for sharing that. Could you tell me more about your timeline?"),
            "should_end_call": bool(data.get("should_end_call", False)),
        }


gemini_service = GeminiService()
