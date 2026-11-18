from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.lead import Lead


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    lead_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vapi_call_id: Mapped[Optional[str]] = mapped_column(String(160), unique=True, nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False, default="Unknown Caller")
    phone_number: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    call_status: Mapped[str] = mapped_column(String(40), nullable=False, default="Completed", index=True)
    duration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    transcript: Mapped[str] = mapped_column(Text, nullable=False, default="")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    qualification_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    follow_up_recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    lead: Mapped[Optional["Lead"]] = relationship("Lead", back_populates="calls")
