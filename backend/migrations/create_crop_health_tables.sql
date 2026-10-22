-- ShetiMitra CropVision and advisory-calendar storage.
-- Safe to run more than once against PostgreSQL/Supabase.

CREATE TABLE IF NOT EXISTS shetimitra_farm_calendar_events (
    id VARCHAR(36) PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES sahayak_accounts(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    title VARCHAR(160) NOT NULL,
    detail TEXT,
    kind VARCHAR(24) NOT NULL DEFAULT 'personal',
    crop VARCHAR(80),
    origin VARCHAR(24) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_shetimitra_farm_calendar_events_account_id
    ON shetimitra_farm_calendar_events (account_id);
CREATE INDEX IF NOT EXISTS ix_shetimitra_farm_calendar_events_event_date
    ON shetimitra_farm_calendar_events (event_date);
CREATE INDEX IF NOT EXISTS ix_shetimitra_farm_calendar_events_account_date
    ON shetimitra_farm_calendar_events (account_id, event_date);

CREATE TABLE IF NOT EXISTS shetimitra_crop_diagnoses (
    id VARCHAR(36) PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES sahayak_accounts(id) ON DELETE CASCADE,
    crop VARCHAR(80) NOT NULL,
    growth_stage VARCHAR(80) NOT NULL,
    label VARCHAR(160) NOT NULL,
    category VARCHAR(32) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    severity VARCHAR(24) NOT NULL,
    result JSON NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_shetimitra_crop_diagnoses_account_id
    ON shetimitra_crop_diagnoses (account_id);
CREATE INDEX IF NOT EXISTS ix_shetimitra_crop_diagnoses_created_at
    ON shetimitra_crop_diagnoses (created_at);
