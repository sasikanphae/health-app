-- One row per device that turned on "แจ้งเตือนแม้ปิดแอป".
CREATE TABLE IF NOT EXISTS subs (
  id TEXT PRIMARY KEY,          -- hash of the push endpoint
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  token_hash TEXT NOT NULL,     -- the device keeps the token; only its hash is stored
  created INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

-- Upcoming reminders. payload is ciphertext made on the phone (plus check keys).
CREATE TABLE IF NOT EXISTS jobs (
  sub_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  at INTEGER NOT NULL,          -- epoch ms
  payload TEXT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub_id, job_id)
);
CREATE INDEX IF NOT EXISTS jobs_at ON jobs (at);
