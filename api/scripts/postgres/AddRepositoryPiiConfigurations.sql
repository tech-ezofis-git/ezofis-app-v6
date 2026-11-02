-- Folder PII configuration: extra sensitive field definitions (types that are not folder fields),
-- a version for optimistic concurrency, and the last AI suggestion (cached per folder definition).
-- Run per tenant database. The API also creates it on first use
-- (RepositoryPiiFieldService.EnsureTableAsync). Additive only: the existing PiiRedaction* columns
-- on repository."Repositories" are unchanged.

CREATE TABLE IF NOT EXISTS repository."RepositoryPiiConfigurations" (
    "RepositoryId" uuid PRIMARY KEY,
    "ConfigurationVersion" integer NOT NULL DEFAULT 0,
    "AdditionalFields" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "LastRecommendationAtUtc" timestamptz NULL,
    "LastRecommendationModel" varchar(120) NULL,
    "LastRecommendationMode" varchar(20) NULL,
    "LastRecommendationFingerprint" varchar(64) NULL,
    "LastRecommendationJson" jsonb NULL,
    "CreatedAtUtc" timestamptz NOT NULL DEFAULT now(),
    "CreatedBy" uuid NULL,
    "UpdatedAtUtc" timestamptz NULL,
    "UpdatedBy" uuid NULL
);
