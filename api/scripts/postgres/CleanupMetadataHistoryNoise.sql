-- =============================================================================
-- Clean up noisy rows in repository."ItemMetadataHistory" (tenant database)
--
-- Before the fix, system updates (AP agent / workflow) were also recorded as
-- "Metadata edited", and JSON fields (e.g. Invoice Extracted Line Item) were logged
-- as changed when only spacing differed. New saves no longer do this; this script
-- removes the rows already written.
--
-- PART A (always): delete rows where old and new are the same JSON (spacing only).
-- PART B (optional): delete ALL history rows up to a cutoff time -- use this to drop
--   every row written before the fix was deployed (system and user rows can't be told
--   apart in old data). Set v_cutoff_utc; leave NULL to skip.
--
-- Dry run: ends with ROLLBACK and prints counts. Change the last line to COMMIT to apply.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    -- Example: '2026-10-27 13:00:00+00'  (the time the fix went live). NULL = skip part B.
    v_cutoff_utc timestamptz := NULL;
    v_rows bigint;
    v_deleted bigint := 0;
    r record;
    v_same boolean;
BEGIN
    IF to_regclass('repository."ItemMetadataHistory"') IS NULL THEN
        RAISE NOTICE 'repository.ItemMetadataHistory does not exist here. Nothing to do.';
        RETURN;
    END IF;

    -- PART A: same JSON, different spacing
    -- (Row-by-row so invalid JSON is skipped instead of failing; works on any PostgreSQL version.)
    FOR r IN
        SELECT "Id", "OldValue", "NewValue"
        FROM repository."ItemMetadataHistory"
        WHERE "OldValue" ~ '^\s*[\[{]' AND "NewValue" ~ '^\s*[\[{]'
    LOOP
        BEGIN
            v_same := r."OldValue"::jsonb = r."NewValue"::jsonb;
        EXCEPTION WHEN others THEN
            v_same := false;
        END;
        IF v_same THEN
            DELETE FROM repository."ItemMetadataHistory" WHERE "Id" = r."Id";
            v_deleted := v_deleted + 1;
        END IF;
    END LOOP;
    RAISE NOTICE 'Part A - formatting-only JSON rows: %', v_deleted;

    -- PART B: everything up to the cutoff
    IF v_cutoff_utc IS NOT NULL THEN
        DELETE FROM repository."ItemMetadataHistory" WHERE "ChangedAtUtc" <= v_cutoff_utc;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        RAISE NOTICE 'Part B - rows up to %: %', v_cutoff_utc, v_rows;
    ELSE
        RAISE NOTICE 'Part B - skipped (v_cutoff_utc is NULL)';
    END IF;

    SELECT count(*) INTO v_rows FROM repository."ItemMetadataHistory";
    RAISE NOTICE 'Rows remaining: %', v_rows;
END $$;

-- Dry run: nothing is saved. After checking the NOTICE counts, change to COMMIT; and run again.
ROLLBACK;
