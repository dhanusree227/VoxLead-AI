import hmac
import hashlib
import logging
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings
from app.schemas.voice_schema import VoiceAssistantConfig

logger = logging.getLogger(__name__)


class VapiService:
    BASE_URL = "https://api.vapi.ai"

    def __init__(self) -> None:
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return bool(
            (self.settings.vapi_api_key or "").strip()
            and (self.settings.vapi_assistant_id or "").strip()
        )

    def get_public_browser_config(self) -> Dict[str, Any]:
        return {
            "vapi_configured": self.is_configured(),
            "public_key_configured": bool((self.settings.vapi_public_key or "").strip()),
            "public_key": self.settings.vapi_public_key or None,
            "assistant_id": self.settings.vapi_assistant_id or None,
        }

    def verify_webhook_signature(self, raw_body: bytes, signature_header: Optional[str]) -> bool:
        secret = (self.settings.vapi_webhook_secret or "").strip()
        if not secret:
            return True
        if not signature_header:
            return False
        expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature_header)

    async def start_browser_session(
        self,
        assistant_config: Optional[VoiceAssistantConfig] = None,
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "mode": "simulated_preview",
                "vapi_configured": False,
                "message": (
                    "VAPI_API_KEY or VAPI_ASSISTANT_ID is missing. Running in Simulated Browser "
                    "Conversation Preview mode."
                ),
            }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/assistant/{self.settings.vapi_assistant_id}",
                headers={"Authorization": f"Bearer {self.settings.vapi_api_key}"},
            )
            if response.status_code >= 400:
                logger.warning("Vapi assistant lookup returned %s", response.status_code)

        return {
            "mode": "vapi_live",
            "vapi_configured": True,
            "public_key": self.settings.vapi_public_key or None,
            "assistant_id": self.settings.vapi_assistant_id,
            "overrides": {
                "firstMessage": assistant_config.greeting_message if assistant_config else None,
            },
        }


vapi_service = VapiService()
