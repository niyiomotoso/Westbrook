-- Seed: brief §9 — Standard/Deluxe/Suite pre-created, three message
-- templates, default settings and loop meta. Idempotent via INSERT OR IGNORE.

INSERT OR IGNORE INTO meta (key, value) VALUES
  ('content_version', '1'),
  ('activate_at', '0'),
  ('loop_epoch', '0');

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('wall', '{"hotelName":"WestBrook","logoUrl":null,"timezone":"Africa/Lagos","cities":[{"label":"Lagos · local","timezone":"Africa/Lagos"},{"label":"London","timezone":"Europe/London"},{"label":"New York","timezone":"America/New_York"},{"label":"Dubai","timezone":"Asia/Dubai"},{"label":"Tokyo","timezone":"Asia/Tokyo"}],"breakfastLine":"7 – 10 am","checkoutLine":"12 noon","wifiName":"","wifiPassword":"","seasons":{"christmasStart":"12-01","christmasEnd":"01-06","christmasEnabled":true,"independenceDay":"10-01","independenceEnabled":true}}');

INSERT OR IGNORE INTO rooms (id, name, price_ngn, tag_text, enabled, sort, created_at) VALUES
  ('room-standard', 'Standard', 45000, NULL, 1, 0, 0),
  ('room-deluxe',   'Deluxe',   65000, NULL, 1, 1, 1),
  ('room-suite',    'Suite',   120000, NULL, 1, 2, 2);

INSERT OR IGNORE INTO templates (id, kicker, body, created_at) VALUES
  ('tpl-welcome-back', 'Welcome back', 'Welcome back to WestBrook, {name}. It is a pleasure to have you with us again.', 0),
  ('tpl-birthday', 'Happy birthday', 'Happy birthday, {name}. Everyone at WestBrook wishes you a wonderful day.', 1),
  ('tpl-anniversary', 'Happy anniversary', 'Happy anniversary, {name}. Wishing you many more years together. From all of us at WestBrook.', 2);
