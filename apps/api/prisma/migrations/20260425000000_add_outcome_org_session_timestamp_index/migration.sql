-- Adds a composite index on (orgId, sessionName, timestamp) to support the
-- org-scoped lookup used by attachMeasuredOutcome. Without this index the
-- updated where clause would full-scan once attachMeasuredOutcome is hot.
-- Non-unique by design: multiple readings within one session in one org share
-- a sessionName and may share a timestamp at second precision; uniqueness is
-- enforced at the application layer via Outcome.id.

CREATE INDEX IF NOT EXISTS "outcomes_orgId_sessionName_timestamp_idx"
  ON "outcomes" ("orgId", "sessionName", "timestamp");
