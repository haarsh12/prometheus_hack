"""Weather safety checks for crop-treatment planning.

The browser sends only an explicitly user-approved field coordinate. Any
configured OpenWeatherMap credential remains server-side and is never returned
to the client. When a private weather credential is not configured, the route
uses a no-key forecast fallback. It intentionally produces a conservative
recommendation: a missing forecast is never reported as a safe spray window.
"""

from __future__ import annotations

import asyncio
import logging
import time
import warnings
from collections import defaultdict, deque
from datetime import UTC, date, datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from starlette.datastructures import UploadFile

from app.auth.models import Account
from app.auth.security import get_current_account, get_optional_current_account, require_csrf
from app.auth.session import get_auth_session
from app.config.settings import MissingConfigurationError, Settings, get_settings
from app.crops.contracts import (
    CropDiagnosisResponse,
    FarmCalendarEventCreate,
    FarmCalendarEventResponse,
)
from app.crops.models import CropDiagnosisRecord, FarmCalendarEvent
from app.crops.service import list_calendar_events, serialize_calendar_event
from app.services.gemini import CropDiagnosisError, generate_crop_diagnosis

router = APIRouter(prefix="/api", tags=["crop health"])
logger = logging.getLogger("shetimitra.crops")

MAX_CROP_IMAGE_BYTES = 10 * 1024 * 1024
MAX_CROP_IMAGE_PIXELS = 20_000_000
MAX_CROP_IMAGE_DIMENSION = 8_192
_CROP_ANALYSES_PER_MINUTE = 8
_CROP_RATE_LIMIT_WINDOW_SECONDS = 60.0
_crop_rate_limit: dict[str, deque[float]] = defaultdict(deque)
_ALLOWED_CROPS = frozenset({"Cotton", "Wheat", "Paddy", "Soybean", "Tomato"})
_ALLOWED_GROWTH_STAGES = frozenset({"Seedling", "Vegetative", "Flowering", "Fruiting / grain fill", "Maturity"})
_IMAGE_FORMATS = {
    ".jpg": ("JPEG", "image/jpeg"),
    ".jpeg": ("JPEG", "image/jpeg"),
    ".png": ("PNG", "image/png"),
    ".webp": ("WEBP", "image/webp"),
}


class SprayWeatherCheck(BaseModel):
    """A bounded, farmer-facing spray-window assessment."""

    status: str = Field(description="safe, caution, or avoid")
    summary: str
    temperature_c: float | None = None
    wind_mps: float | None = None
    rain_expected: bool
    forecast_at: datetime | None = None
    provider: str = "OpenWeatherMap"


def _forecast_item(payload: object) -> dict[str, object] | None:
    if not isinstance(payload, dict):
        return None
    forecast = payload.get("list")
    if not isinstance(forecast, list) or not forecast:
        return None
    item = forecast[0]
    return item if isinstance(item, dict) else None


def _as_number(value: object) -> float | None:
    return float(value) if isinstance(value, (int, float)) else None


def _spray_recommendation(
    *,
    temperature_c: float | None,
    wind_mps: float | None,
    rain_expected: bool,
    forecast_period: str,
) -> tuple[str, str]:
    """Return a conservative, explainable treatment-weather recommendation."""

    if rain_expected:
        return "avoid", f"Rain is expected {forecast_period}. Delay any foliar spray and re-check the forecast."
    if wind_mps is not None and wind_mps > 4.5:
        return "avoid", "Wind is too strong for a reliable spray. Delay to reduce drift and uneven coverage."
    if temperature_c is not None and temperature_c >= 32:
        return "caution", "High heat is forecast. Prefer a cooler early-morning window after confirming the product label allows it."
    return (
        "safe",
        f"No rain, high-wind or high-heat flag appears {forecast_period}. Confirm field conditions immediately before spraying.",
    )


def _configured_openweather_api_key(settings: Settings) -> str | None:
    """Return a configured OpenWeather key without exposing it to the client."""

    if settings.openweather_api_key is None:
        return None
    api_key = settings.openweather_api_key.get_secret_value().strip()
    return api_key or None


async def _open_meteo_weather_check(latitude: float, longitude: float) -> SprayWeatherCheck:
    """Build a safe weather gate from Open-Meteo when no private key is present."""

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,wind_speed_10m,rain",
                    "hourly": "precipitation_probability,rain",
                    "forecast_hours": 6,
                    "timezone": "auto",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The weather forecast is unavailable. Check local conditions before spraying.",
        ) from error

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The weather provider returned no usable forecast. Check local conditions before spraying.",
        )

    current = payload.get("current")
    hourly = payload.get("hourly")
    if not isinstance(current, dict) or not isinstance(hourly, dict):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The weather provider returned no usable forecast. Check local conditions before spraying.",
        )

    temperature_c = _as_number(current.get("temperature_2m"))
    wind_value = _as_number(current.get("wind_speed_10m"))
    current_units = payload.get("current_units")
    wind_unit = current_units.get("wind_speed_10m") if isinstance(current_units, dict) else None
    wind_mps = wind_value / 3.6 if wind_value is not None and wind_unit == "km/h" else wind_value

    rain_probability = hourly.get("precipitation_probability")
    hourly_rain = hourly.get("rain")
    probabilities = rain_probability[:6] if isinstance(rain_probability, list) else []
    rain_values = hourly_rain[:6] if isinstance(hourly_rain, list) else []
    rain_expected = (
        (_as_number(current.get("rain")) or 0) > 0
        or any((_as_number(value) or 0) >= 40 for value in probabilities)
        or any((_as_number(value) or 0) > 0 for value in rain_values)
    )
    forecast_time = current.get("time")
    try:
        forecast_at = datetime.fromisoformat(forecast_time) if isinstance(forecast_time, str) else None
    except ValueError:
        forecast_at = None
    recommendation = _spray_recommendation(
        temperature_c=temperature_c,
        wind_mps=wind_mps,
        rain_expected=rain_expected,
        forecast_period="in the next six hours",
    )

    return SprayWeatherCheck(
        status=recommendation[0],
        summary=recommendation[1],
        temperature_c=temperature_c,
        wind_mps=wind_mps,
        rain_expected=rain_expected,
        forecast_at=forecast_at,
        provider="Open-Meteo",
    )


def _multipart_text(value: object, *, field: str) -> str:
    if not isinstance(value, str):
        raise HTTPException(status_code=422, detail=f"{field} must be text.")
    return value.strip()


def _enforce_crop_rate_limit(client_host: str) -> None:
    now = time.monotonic()
    requests = _crop_rate_limit[client_host]
    while requests and now - requests[0] >= _CROP_RATE_LIMIT_WINDOW_SECONDS:
        requests.popleft()
    if len(requests) >= _CROP_ANALYSES_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Too many photo analyses. Please wait a minute and try again.")
    requests.append(now)


async def _read_crop_image(upload: UploadFile) -> tuple[bytes, str]:
    """Validate a photo in memory without retaining a copy on the server."""

    filename = Path(upload.filename or "leaf-photo").name
    suffix = Path(filename).suffix.lower()
    expected = _IMAGE_FORMATS.get(suffix)
    if expected is None:
        raise HTTPException(status_code=422, detail="Use a JPG, PNG, or WebP leaf photo.")
    try:
        raw = await upload.read(MAX_CROP_IMAGE_BYTES + 1)
    finally:
        await upload.close()
    if not raw:
        raise HTTPException(status_code=422, detail="The leaf photo is empty.")
    if len(raw) > MAX_CROP_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Leaf photos must be 10 MB or smaller.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                if image.format != expected[0]:
                    raise HTTPException(status_code=422, detail="The photo contents do not match its file type.")
                width, height = image.size
                if (
                    width <= 0
                    or height <= 0
                    or width > MAX_CROP_IMAGE_DIMENSION
                    or height > MAX_CROP_IMAGE_DIMENSION
                    or width * height > MAX_CROP_IMAGE_PIXELS
                ):
                    raise HTTPException(status_code=422, detail="Leaf photos must be at most 8,192 pixels per side and 20 megapixels.")
                image.load()
    except HTTPException:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning, UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=422, detail="The leaf photo could not be read.") from error
    return raw, expected[1]


@router.get("/crop-weather", response_model=SprayWeatherCheck)
async def crop_weather_check(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    settings: Settings = Depends(get_settings),
) -> SprayWeatherCheck:
    """Assess the first forecast slot for a conservative spray recommendation."""

    api_key = _configured_openweather_api_key(settings)
    if api_key is None:
        return await _open_meteo_weather_check(latitude, longitude)

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={"lat": latitude, "lon": longitude, "appid": api_key, "units": "metric"},
            )
            response.raise_for_status()
            item = _forecast_item(response.json())
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The weather forecast is unavailable. Check local conditions before spraying.",
        ) from error

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The weather provider returned no usable forecast. Check local conditions before spraying.",
        )

    main = item.get("main") if isinstance(item.get("main"), dict) else {}
    wind = item.get("wind") if isinstance(item.get("wind"), dict) else {}
    weather = item.get("weather") if isinstance(item.get("weather"), list) else []
    weather_codes = [entry.get("id") for entry in weather if isinstance(entry, dict)]
    precipitation = item.get("rain") if isinstance(item.get("rain"), dict) else {}
    temperature_c = _as_number(main.get("temp"))
    wind_mps = _as_number(wind.get("speed"))
    rain_expected = bool(precipitation) or any(isinstance(code, int) and 200 <= code < 600 for code in weather_codes)
    timestamp = item.get("dt")
    forecast_at = datetime.fromtimestamp(timestamp, tz=UTC) if isinstance(timestamp, int) else None

    result = _spray_recommendation(
        temperature_c=temperature_c,
        wind_mps=wind_mps,
        rain_expected=rain_expected,
        forecast_period="in the next forecast period",
    )

    return SprayWeatherCheck(
        status=result[0],
        summary=result[1],
        temperature_c=temperature_c,
        wind_mps=wind_mps,
        rain_expected=rain_expected,
        forecast_at=forecast_at,
    )


@router.post("/crop-diagnoses", response_model=CropDiagnosisResponse, status_code=status.HTTP_201_CREATED)
async def create_crop_diagnosis(
    request: Request,
    session: AsyncSession = Depends(get_auth_session),
    settings: Settings = Depends(get_settings),
) -> CropDiagnosisResponse:
    """Analyze an original farmer-uploaded leaf photo through CropVision.

    The bytes exist only for this request and provider call.  If the farmer is
    signed in, a result summary (never the photo) is saved to their health
    ledger. Guests still get a result but it stays in their browser.
    """

    _enforce_crop_rate_limit(request.client.host if request.client else "unknown")
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_CROP_IMAGE_BYTES + 64 * 1024:
                raise HTTPException(status_code=413, detail="Leaf photos must be 10 MB or smaller.")
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header.") from error
    try:
        async with request.form(max_files=1, max_fields=5, max_part_size=MAX_CROP_IMAGE_BYTES) as form:
            crop_value = form.get("crop")
            growth_stage_value = form.get("growth_stage")
            crop = crop_value.strip() if isinstance(crop_value, str) else None
            growth_stage = growth_stage_value.strip() if isinstance(growth_stage_value, str) else None
            image = form.get("image")
            if not isinstance(image, UploadFile):
                raise HTTPException(status_code=422, detail="A leaf photo is required.")
            if crop is not None and crop not in _ALLOWED_CROPS:
                raise HTTPException(status_code=422, detail="Choose a supported crop when supplying crop context.")
            if growth_stage is not None and growth_stage not in _ALLOWED_GROWTH_STAGES:
                raise HTTPException(status_code=422, detail="Choose a supported crop and growth stage.")
            image_data, image_mime_type = await _read_crop_image(image)
    except HTTPException:
        raise
    except Exception as error:
        logger.info("crop_upload_rejected reason=%s", type(error).__name__)
        raise HTTPException(status_code=422, detail="The leaf photo form could not be processed.") from error

    account = await get_optional_current_account(request, session, settings)
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                generate_crop_diagnosis,
                settings,
                image_data=image_data,
                image_mime_type=image_mime_type,
                crop=crop,
                growth_stage=growth_stage,
                state=account.state if account else None,
                district=account.district if account else None,
            ),
            timeout=50,
        )
    except asyncio.TimeoutError as error:
        raise HTTPException(status_code=504, detail="The photo analysis took too long. Please try again.") from error
    except (MissingConfigurationError, CropDiagnosisError) as error:
        logger.warning("crop_diagnosis_unavailable reason=%s", type(error).__name__)
        raise HTTPException(status_code=503, detail="CropVision analysis is not available right now. Please try again shortly.") from error
    except Exception:
        logger.exception("crop_diagnosis_failed")
        raise HTTPException(status_code=502, detail="The leaf photo could not be analysed. Please use a clearer photo and try again.") from None

    diagnosis_id = str(uuid4())
    captured_at = datetime.now(UTC)
    saved = account is not None
    if account is not None:
        try:
            session.add(
                CropDiagnosisRecord(
                    id=diagnosis_id,
                    account_id=account.id,
                    crop=result.identified_crop,
                    growth_stage=result.identified_growth_stage,
                    label=result.label,
                    category=result.category,
                    confidence=result.confidence,
                    severity=result.severity,
                    result=result.model_dump(mode="json"),
                )
            )
            await session.commit()
        except SQLAlchemyError:
            # A history-table migration must never prevent the farmer from
            # receiving the diagnosis that was already produced. The result
            # remains in the browser and can be scheduled locally.
            await session.rollback()
            saved = False
            logger.exception("crop_diagnosis_history_save_failed")
    return CropDiagnosisResponse(
        id=diagnosis_id,
        crop=result.identified_crop,
        growth_stage=result.identified_growth_stage,
        captured_at=captured_at,
        saved=saved,
        **result.model_dump(),
    )


@router.get("/farm-calendar", response_model=list[FarmCalendarEventResponse])
async def get_farm_calendar(
    start: date = Query(),
    end: date = Query(),
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_auth_session),
) -> list[FarmCalendarEventResponse]:
    """Return a signed-in farmer's calendar events in a bounded date range."""

    if end < start:
        raise HTTPException(status_code=422, detail="Calendar end date must be after its start date.")
    if (end - start).days > 370:
        raise HTTPException(status_code=422, detail="Choose a calendar range of one year or less.")
    try:
        events = await list_calendar_events(session, account.id, start=start, end=end)
    except SQLAlchemyError as error:
        logger.exception("farm_calendar_read_failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Farm calendar storage needs an update. Your device calendar remains available; please refresh shortly.",
        ) from error
    return [serialize_calendar_event(event) for event in events]


@router.post("/farm-calendar", response_model=FarmCalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def create_farm_calendar_event(
    payload: FarmCalendarEventCreate,
    _: None = Depends(require_csrf),
    account: Account = Depends(get_current_account),
    session: AsyncSession = Depends(get_auth_session),
) -> FarmCalendarEventResponse:
    """Save an explicit farmer-approved calendar entry."""

    event = FarmCalendarEvent(
        id=str(uuid4()),
        account_id=account.id,
        event_date=payload.event_date,
        title=payload.title.strip(),
        detail=payload.detail.strip() if payload.detail else None,
        kind=payload.kind,
        crop=payload.crop.strip() if payload.crop else None,
        origin=payload.origin,
    )
    try:
        session.add(event)
        await session.commit()
        await session.refresh(event)
    except SQLAlchemyError as error:
        await session.rollback()
        logger.exception("farm_calendar_write_failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Farm calendar storage needs an update. Please try again shortly.",
        ) from error
    return serialize_calendar_event(event)
