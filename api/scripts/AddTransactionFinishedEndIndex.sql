-- Partial index for finished workflow instances, per workflow transaction table.
--
-- Why: the Completed and Sent mailboxes (and their tab counts) check, for every mailbox row,
-- that the instance has a finished END transaction:
--     is_deleted = false
--     AND UPPER(TRIM(COALESCE(stage_type, ''))) = 'END'
--     AND COALESCE(TRIM(review), '') <> 'Re-initiate'
-- (WorkflowStepTransitionHelper.FinishedEndRowSql). Without an index whose predicate includes the
-- review condition, Postgres reads the transaction heap for every END row. On tenant 107d776d
-- (Support / santhanamari) that is 51k pages (~400 MB, 6-8 s) on each Completed request.
-- With this index it is an index-only scan of a ~7 MB index (~70 ms).
--
-- New workflows get it from WorkflowTableCreator. Existing tables need this script.
--
-- Run with psql against ONE tenant database, outside a transaction (CONCURRENTLY does not block
-- reads or writes, but cannot run inside BEGIN/COMMIT or a DO block). Safe to re-run.

-- 1) Tenant 107d776d (Support), workflow f7e4e2e3 "Service Desk Worlflow" (1.6M transactions):
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_transaction_f7e4e2e3_finished_end_instance
    ON workflow.transaction_f7e4e2e3 (workflow_instance_id)
    WHERE is_deleted = false
      AND UPPER(TRIM(COALESCE(stage_type, ''))) = 'END'
      AND COALESCE(TRIM(review), '') <> 'Re-initiate';

-- 2) Optional, every workflow transaction table in the current tenant database (psql \gexec):
-- SELECT format(
--     'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I ON workflow.%I (workflow_instance_id) '
--     'WHERE is_deleted = false AND UPPER(TRIM(COALESCE(stage_type, %L))) = %L '
--     'AND COALESCE(TRIM(review), %L) <> %L',
--     'ix_' || c.relname || '_finished_end_instance', c.relname, '', 'END', '', 'Re-initiate')
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'workflow' AND c.relkind = 'r' AND c.relname ~ '^transaction_[0-9a-f]{8}$'
-- \gexec

-- 3) Check: the index must be valid (a failed CONCURRENTLY build leaves an INVALID index; drop it
--    with DROP INDEX CONCURRENTLY and run again).
SELECT c.relname AS index_name, i.indisvalid, pg_size_pretty(pg_relation_size(c.oid)) AS size
FROM pg_index i
JOIN pg_class c ON c.oid = i.indexrelid
WHERE c.relname LIKE 'ix_transaction_%_finished_end_instance';
