CREATE TABLE IF NOT EXISTS scheduler_states (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  state_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT scheduler_states_user_facility_unique UNIQUE (user_id, facility_id)
);

CREATE INDEX IF NOT EXISTS scheduler_states_facility_user_idx
  ON scheduler_states (facility_id, user_id);
