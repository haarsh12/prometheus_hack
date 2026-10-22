"""Weather safety checks for crop-treatment planning.

The browser sends only an explicitly user-approved field coordinate. The
OpenWeatherMap credential remains server-side and is never returned to the
client. This route intentionally produces a conservative recommendation: a
missing forecast is never reported as a safe spray window.
"""

from __future__ import annotations

from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.config.settings import MissingConfigurationError, Settings, get_settings

router = APIRouter(prefix="/api", tags=["crop health"])


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


@router.get("/crop-weather", response_model=SprayWeatherCheck)
async def crop_weather_check(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    settings: Settings = Depends(get_settings),
) -> SprayWeatherCheck:
    """Assess the first forecast slot for a conservative spray recommendation."""

    try:
        api_key = settings.require_openweather_api_key()
    except MissingConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather checks are not configured yet. Do not treat an unverified spray window as safe.",
        ) from error

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

    if rain_expected:
        result = ("avoid", "Rain is expected in the next forecast period. Delay any foliar spray and re-check the forecast.")
    elif wind_mps is not None and wind_mps > 4.5:
        result = ("avoid", "Wind is too strong for a reliable spray. Delay to reduce drift and uneven coverage.")
    elif temperature_c is not None and temperature_c >= 32:
        result = ("caution", "High heat is forecast. Prefer a cooler early-morning window after confirming the product label allows it.")
    else:
        result = ("safe", "No rain, high-wind or high-heat flag appears in the next forecast period. Confirm field conditions immediately before spraying.")

    return SprayWeatherCheck(
        status=result[0],
        summary=result[1],
        temperature_c=temperature_c,
        wind_mps=wind_mps,
        rain_expected=rain_expected,
        forecast_at=forecast_at,
    )
