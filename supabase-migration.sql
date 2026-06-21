-- ============================================================
-- WORLDIFY · Komplettes Schema
-- Im Supabase SQL Editor ausführen (New Query → einfügen → Run)
-- Idempotent: kann gefahrlos mehrfach laufen.
-- ============================================================

-- 1) UNIVERSES ------------------------------------------------
CREATE TABLE IF NOT EXISTS universes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE universes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own universes" ON universes;
CREATE POLICY "users own universes"
  ON universes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) ENTITIES -------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  universe_id       UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  name              TEXT NOT NULL,
  short_description TEXT,
  content           TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entities_universe_id_idx ON entities (universe_id);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own entities" ON entities;
CREATE POLICY "users own entities"
  ON entities FOR ALL
  USING (
    universe_id IN (SELECT id FROM universes WHERE user_id = auth.uid())
  )
  WITH CHECK (
    universe_id IN (SELECT id FROM universes WHERE user_id = auth.uid())
  );

-- 3) UNIVERSE_SETTINGS ---------------------------------------
-- library_items (Kategorien + Trennzeichen mit Icon/Singular/Feldern),
-- dashboard_containers, entity_order
CREATE TABLE IF NOT EXISTS universe_settings (
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  universe_id          UUID NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  library_items        JSONB NOT NULL DEFAULT '[]',
  dashboard_containers JSONB NOT NULL DEFAULT '[]',
  entity_order         JSONB NOT NULL DEFAULT '{}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, universe_id)
);

ALTER TABLE universe_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own their settings" ON universe_settings;
CREATE POLICY "users own their settings"
  ON universe_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) updated_at automatisch pflegen --------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS universes_updated_at ON universes;
CREATE TRIGGER universes_updated_at
  BEFORE UPDATE ON universes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS entities_updated_at ON entities;
CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS universe_settings_updated_at ON universe_settings;
CREATE TRIGGER universe_settings_updated_at
  BEFORE UPDATE ON universe_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
