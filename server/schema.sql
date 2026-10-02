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

-- รับกดพระ (see src/shop.js): the รุ่น the seller presses CF for, and customers' requests.
CREATE TABLE IF NOT EXISTS shop_batches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  release_at TEXT NOT NULL DEFAULT '', -- when the รุ่น opens for CF, as the seller typed it
  items TEXT NOT NULL DEFAULT '[]',    -- JSON [{ id, name, price, fee }]
  status TEXT NOT NULL DEFAULT 'open', -- open | closed
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY,
  batch_id TEXT,                       -- NULL = "please go press another รุ่น" (see wish)
  wish TEXT,
  customer TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  lines TEXT NOT NULL,                 -- JSON [{ itemId, qty, fee, who }]
  note TEXT NOT NULL DEFAULT '',
  token_hash TEXT NOT NULL,            -- the customer's browser keeps the token; only its hash is stored
  status TEXT NOT NULL,                -- pending | accepted | got | missed | declined | cancelled
  got TEXT,                            -- JSON { itemId|"wish": coins obtained }
  reply TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS shop_orders_batch ON shop_orders (batch_id, created);
-- Customers' browsers that asked to be told when a request changes.
CREATE TABLE IF NOT EXISTS shop_push (
  order_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,           -- hash of the push endpoint
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (order_id, endpoint_id)
);
