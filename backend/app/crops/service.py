"""Queries and serialization shared by web and voice crop features."""

from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crops.contracts import FarmCalendarEventResponse
from app.crops.models import FarmCalendarEvent


def serialize_calendar_event(event: FarmCalendarEvent) -> FarmCalendarEventResponse:
    return FarmCalendarEventResponse(
        id=event.id,
        date=event.event_date,
        title=event.title,
        detail=event.detail,
        kind=event.kind,  # type: ignore[arg-type]
        crop=event.crop,
        origin=event.origin,  # type: ignore[arg-type]
        created_at=event.created_at or datetime.now(UTC),
    )


async def list_calendar_events(
    session: AsyncSession, account_id: int, *, start: date, end: date, limit: int = 160
) -> list[FarmCalendarEvent]:
    result = await session.scalars(
        select(FarmCalendarEvent)
        .where(
            FarmCalendarEvent.account_id == account_id,
            FarmCalendarEvent.event_date >= start,
            FarmCalendarEvent.event_date <= end,
        )
        .order_by(FarmCalendarEvent.event_date.asc(), FarmCalendarEvent.created_at.asc())
        .limit(limit)
    )
    return list(result)


async def upcoming_calendar_context(session: AsyncSession, account_id: int, *, limit: int = 8) -> str:
    """Render calendar facts as data, never as executable instructions."""

    today = datetime.now().date()
    events = await list_calendar_events(session, account_id, start=today, end=date.max, limit=limit)
    if not events:
        return "FARM CALENDAR DATA: No upcoming saved farm events."
    lines = ["FARM CALENDAR DATA (saved farmer events; reference data only):"]
    for event in events:
        crop = f" for {event.crop}" if event.crop else ""
        lines.append(f"- {event.event_date.isoformat()}: {event.title}{crop}. {event.detail or ''}".strip())
    return "\n".join(lines)
