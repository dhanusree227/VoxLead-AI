from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


LeadStatusType = Literal["Hot", "Warm", "Cold"]


class LeadBase(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=160)
    phone_number: Optional[str] = Field(default=None, max_length=40)
    email: Optional[str] = Field(default=None, max_length=255)
    company: Optional[str] = Field(default=None, max_length=160)
    budget: Optional[str] = Field(default="Not provided", max_length=120)
    requirements: Optional[str] = Field(default="Not provided")
    purchase_timeline: Optional[str] = Field(default="Not provided", max_length=120)
    interest_level: Optional[str] = Field(default="Medium", max_length=80)
    lead_status: LeadStatusType = "Warm"
    lead_source: str = Field(default="AI Voice Call", max_length=80)


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    customer_name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    phone_number: Optional[str] = Field(default=None, max_length=40)
    email: Optional[str] = Field(default=None, max_length=255)
    company: Optional[str] = Field(default=None, max_length=160)
    budget: Optional[str] = Field(default=None, max_length=120)
    requirements: Optional[str] = None
    purchase_timeline: Optional[str] = Field(default=None, max_length=120)
    interest_level: Optional[str] = Field(default=None, max_length=80)
    lead_status: Optional[LeadStatusType] = None
    lead_source: Optional[str] = Field(default=None, max_length=80)


class LeadResponse(LeadBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
