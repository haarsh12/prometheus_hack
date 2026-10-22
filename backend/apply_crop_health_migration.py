"""Apply the idempotent CropVision/calendar PostgreSQL migration.

Run from ``backend`` with the normal DATABASE_URL configuration. Credentials
are read only from settings and are never printed by this script.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
import re

from sqlalchemy import text

from app.auth.session import get_engine
from app.config.settings import MissingConfigurationError


async def main() -> None:
    engine = get_engine()
    if engine is None:
        raise MissingConfigurationError("DATABASE_URL must be configured before applying the crop-health migration.")
    migration = (Path(__file__).parent / "migrations" / "create_crop_health_tables.sql").read_text(encoding="utf-8")
    without_comments = re.sub(r"(?m)^\s*--.*$", "", migration)
    statements = [statement.strip() for statement in without_comments.split(";") if statement.strip()]
    async with engine.begin() as connection:
        for statement in statements:
            await connection.execute(text(statement))
    await engine.dispose()
    print("CropVision and advisory-calendar tables are ready.")


if __name__ == "__main__":
    asyncio.run(main())
