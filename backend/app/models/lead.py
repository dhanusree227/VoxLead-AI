from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.call import Call


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    company: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    budget: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    purchase_timeline: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    interest_level: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    lead_status: Mapped[str] = mapped_column(String(20), nullable=False, default="Warm", index=True)
    lead_source: Mapped[str] = mapped_column(String(80), nullable=False, default="AI Voice Call")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    calls: Mapped[List["Call"]] = relationship(
        "Call",
        back_populates="lead",
        cascade="all, delete-orphan",
    )
