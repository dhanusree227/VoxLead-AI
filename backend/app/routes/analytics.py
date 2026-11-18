from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.call import Call
from app.models.lead import Lead
from app.models.user import User
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
def get_analytics_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    calls = db.query(Call).all()
    leads = db.query(Lead).all()

    total_calls = len(calls)
    completed_calls = sum(1 for c in calls if c.call_status == "Completed")
    hot_leads = sum(1 for l in leads if l.lead_status == "Hot")
    warm_leads = sum(1 for l in leads if l.lead_status == "Warm")
    cold_leads = sum(1 for l in leads if l.lead_status == "Cold")
    qualified_leads = hot_leads + warm_leads
    conversion_rate = round((qualified_leads / total_calls) * 100, 1) if total_calls > 0 else 0.0
    avg_duration = round(sum(c.duration for c in calls) / total_calls) if total_calls > 0 else 0

    return {
        "total_calls": total_calls,
        "completed_calls": completed_calls,
        "qualified_leads": qualified_leads,
        "conversion_rate": conversion_rate,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
        "avg_call_duration": avg_duration,
    }


@router.get("/call-trends")
def get_call_trends(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    calls = db.query(Call).order_by(Call.created_at.asc()).all()
    grouped = defaultdict(lambda: {"date": "", "total_calls": 0, "completed_calls": 0})

    for call in calls:
        day = call.created_at.strftime("%Y-%m-%d")
        grouped[day]["date"] = day
        grouped[day]["total_calls"] += 1
        if call.call_status == "Completed":
            grouped[day]["completed_calls"] += 1

    return list(grouped.values())


@router.get("/lead-distribution")
def get_lead_distribution(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    leads = db.query(Lead).all()
    status_counts = {"Hot": 0, "Warm": 0, "Cold": 0}
    source_counts = defaultdict(int)

    for lead in leads:
        if lead.lead_status in status_counts:
            status_counts[lead.lead_status] += 1
        source_counts[lead.lead_source or "Direct"] += 1

    return {
        "by_status": [{"name": k, "value": v} for k, v in status_counts.items()],
        "by_source": [{"source": k, "count": v} for k, v in source_counts.items()],
    }
