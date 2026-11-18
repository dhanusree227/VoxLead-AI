from datetime import datetime
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


class LeadQualificationResult(BaseModel):
    customer_name: Optional[str] = Field(default="Not provided")
    customer_requirements: Optional[str] = Field(default="Not provided")
    budget: Optional[str] = Field(default="Not provided")
    purchase_timeline: Optional[str] = Field(default="Not provided")
    interest_level: Optional[str] = Field(default="Not provided")
    lead_status: Literal["Hot", "Warm", "Cold"] = "Cold"
    summary: str = Field(..., min_length=1)
    follow_up_recommendation: str = Field(..., min_length=1)
    qualification_reasoning: Optional[str] = Field(default=None)


class CallCreateRequest(BaseModel):
    lead_id: Optional[int] = None
    vapi_call_id: Optional[str] = None
    customer_name: str = "Unknown Caller"
    phone_number: Optional[str] = None
    call_status: str = "Completed"
    duration: int = Field(default=0, ge=0)
    transcript: str = ""
    summary: Optional[str] = None
    qualification_result: Optional[Dict[str, Any]] = None
    follow_up_recommendation: Optional[str] = None


class CallResponse(BaseModel):
    id: int
    lead_id: Optional[int] = None
    vapi_call_id: Optional[str] = None
    customer_name: str
    phone_number: Optional[str] = None
    call_status: str
    duration: int
    transcript: str
    summary: Optional[str] = None
    qualification_result: Optional[Dict[str, Any]] = None
    follow_up_recommendation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class QualifyLeadRequest(BaseModel):
    transcript: str = Field(..., min_length=10)
    call_id: Optional[int] = None
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    persist: bool = True


class SummarizeCallRequest(BaseModel):
    transcript: str = Field(..., min_length=10)
    call_id: Optional[int] = None
