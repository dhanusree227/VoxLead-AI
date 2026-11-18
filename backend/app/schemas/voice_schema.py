from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VoiceAssistantConfig(BaseModel):
    assistant_name: str = Field(default="VoxLead Qualification Agent", max_length=120)
    description: str = Field(
        default="Inbound & outbound AI sales qualification specialist.",
        max_length=400,
    )
    voice_id: str = Field(default="jennifer-playht", max_length=80)
    language: str = Field(default="en", max_length=20)
    greeting_message: str = Field(
        default="Hello! I'm the VoxLead AI assistant. Is this a good time to speak?",
        max_length=500,
    )
    system_prompt: str = Field(
        default=(
            "You are VoxLead AI, a polite and concise B2B lead qualification assistant. "
            "Uncover the customer's name, software or service requirements, approximate budget, "
            "and purchase timeline without repeating questions. End the conversation politely once answered."
        ),
        max_length=4000,
    )
    max_duration_seconds: int = Field(default=300, ge=30, le=1800)


class VoiceStartRequest(BaseModel):
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    assistant_config: Optional[VoiceAssistantConfig] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class VoiceChatRequest(BaseModel):
    history: List[ChatMessage] = Field(default_factory=list)
    user_message: str = Field(..., min_length=1)
    assistant_config: Optional[VoiceAssistantConfig] = None


class VapiWebhookPayload(BaseModel):
    message: Dict[str, Any] = Field(default_factory=dict)
