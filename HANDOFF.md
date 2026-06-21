# Worldify — Handoff für Codex

> Vollständige Übergabe des aktuellen Projektstands. Erstellt von Claude (Sonnet/Opus).
> **Vor jeder UI-Arbeit:** `design.md` lesen (bindend). **Projektgedächtnis:** `mind.md`.

---

## 1. Was ist Worldify?

Private Worldbuilding Web-App für Fantasy-Autoren. Organisiert fiktive Universen mit
Charakteren, Orten, Fraktionen, Magie, Kreaturen, Items, Geschichten etc.
Design-Sprache: clean, modern, minimal (Notion/Linear/Raycast). Primärfarbe **Orange `#EA580C`**.

---

## 2. Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Inline-Styles mit CSS-Variablen aus `src/index.css` (Tailwind v4 installiert) |
| Routing | React Router v7 |
| State | Zustand (`src/store/useWorldStore.ts`) |
| Backend | **Supabase** (Auth + PostgreSQL) — LIVE |
| Icons | Lucide React, `strokeWidth={1.5}` |
| Fonts | Manrope (UI) + Instrument Serif (Display) |
| Deploy | Vercel (geplant, noch nicht erfolgt) |

**Build-Befehl:** `npm run build` (läuft sauber durch). Dev: `npm run dev`.

---

## 3. Supabase — Status: LIVE ✓

Das vollständige Schema wurde ausgeführt (`supabase-migration.sql`):

| Tabelle | Inhalt |
|---------|--------|
| `universes` | id, user_id, name, description, timestamps |
| `entities` | id, universe_id, type, name, short_description, content, tags[], status, timestamps |
| `universe_settings` | user_id, universe_id, **library_items** (JSONB), **dashboard_containers** (JSONB), **entity_order** (JSONB) |

- Alle mit **Row Level Security** (User sieht nur eigene Daten)
- `updated_at` per Trigger automatisch
- Schema ist idempotent — kann erneut ausgeführt werden

**Was in JSONB liegt** (kein Schema-Change nötig bei Erweiterung):
- `library_items`: Kategorien (mit icon, singular, fields, entityType) **und** Trennzeichen (dividers)
- `dashboard_containers`: Dashboard-Kacheln
- `entity_order`: Card-Reihenfolge je Kategorie

---

## 4. Datenmodell (`src/data/mockWorld.ts`)

```ts
EntityType = 'character'|'location'|'faction'|'magic_system'|'creature'
           |'language'|'item'|'story'|'event'|'note'
EntityStatus = 'draft'|'active'|'archived'|'concept'

Entity = { id, universeId, type, name, shortDescription, content, tags[], status, createdAt, updatedAt }

SidebarCategoryItem = {
  id, kind:'category', label, slug, description,
  entityType?,          // verknüpft Kategorie mit echtem Entity-Typ (Filter)
  icon?,                // lucide-Name (siehe categoryIcons.ts)
  singular?,            // z.B. "Charakter"
  iconUrl?,             // optionales Bild-Icon
  fields?: CategoryField[]   // eigene Element-Felder
}
SidebarDividerItem = { id, kind:'divider', label }

CategoryField = { id, name, type: CategoryFieldType }
CategoryFieldType = 'text'|'textarea'|'number'|'participants'|'sections'|'tasks'
```

**Wichtig:** Kategorien sind **dynamisch** — `entityType` ist optional. "Characters" ist nur
die erste Beispiel-Kategorie. Es gibt keine hardcodierten Typ-Routen mehr.

---

## 5. Routing (`src/App.tsx`)

```
/login                  → LoginPage (öffentlich)
/                       → DashboardPrototype  (das "Dashboard" der Sidebar)
/:categorySlug          → Dashboard           (Kategorie-Ansicht, Entity-Grid)
/entities/:id           → EntityPage          (Detailseite)
/design-system          → DesignSystemPage
```
Alles außer /login ist hinter `ProtectedRoute` + `AppLayout`.

**Achtung Namensverwirrung:**
- `DashboardPrototype.tsx` = die neue Startseite ("/") mit Universe-Banner + Kategorie-Karten
- `Dashboard.tsx` = die Kategorie-Detailansicht ("/:categorySlug") mit Entity-Grid + Filter

---

## 6. Was in DIESER Session gebaut wurde (chronologisch)

1. **EntityPage generalisiert** — Kategorie-Label aus `libraryItems`, echte Datumswerte
2. **Supabase-Settings-Sync** — `src/lib/supabaseSettings.ts` + Fire-and-forget Sync in
   `libraryItems.ts`, `dashboardContainers.ts`, `entityOrder.ts`. `loadWorldData` lädt von Supabase.
3. **UI-Polish** — Kategorie-Label auf Dashboard-Karten, dynamisches Create-Button-Label,
   Empty State mit Kategorie-Namen + CTA
4. **Responsive Sidebar** — Mobile Overlay (`min(300px,85vw)`) + Hamburger in TopBar,
   Desktop Collapse/Expand (56px ↔ 240px). Hook: `src/hooks/useWindowWidth.ts`
5. **TopBar Avatar-Dropdown** — Profil/Settings/Logout, Suche auf Mobile ausgeblendet
6. **EntityPage Hero** — Full-Bleed Cover-Banner (200/320px), Cover-Upload via FileReader,
   Tabs (Overview/Notes/Relations mit Icons), Overview = 2-Spalten (Galerie/Notizen links,
   Profil/Anhänge/Verknüpfungen rechts). Back-Button in TopBar (nicht mehr in Seite).
   Badges: über Bild weiß-transparent, sonst solide farbig (lesbar).
7. **DashboardPrototype** — neue Startseite: Universe-Titelbild-Banner (Gradient-Platzhalter,
   Name aus Store), Kategorie-Karten-Grid mit Thumbnails. Stat-Karten verworfen.
8. **"New Entity" Dropdown** — TopBar-Button öffnet Dropdown mit echten Kategorien
   (aus libraryItems, entityType→Icon). Alte "Schnell erstellen"-Pills entfernt.
9. **Kategorie-Zähler** — Pill rechts neben Kategorie-Titel (Singular/Plural)
10. **CategoryModal = Setup-Modal** (zentrale Arbeit):
    - Zweistufig: Liste (Vorschläge + "Eigene" + "Trennzeichen") → Setup-Form, smooth slideIn
    - Setup-Form: Name+Icon (kompakter Popover-Picker), Singularname, Beschreibung,
      **Feld-Builder** (Name + Typ via Icon-Popover, Liste mit Remove)
    - **Vorschläge führen auch durch Setup** (vorausgefüllt, entityType im Hintergrund)
    - **Trennzeichen**-View mit Text-Input + Live-Vorschau
    - Schlanke custom Scrollbar (`.ds-scroll`)
11. **Icon-System** — `src/lib/categoryIcons.ts` (24 Icons, name↔component), Sidebar nutzt `getCategoryIcon`
12. **Entity-Cover persistent** — `src/lib/entityMedia.ts` (localStorage, dataURL pro entityId).
    Dashboard `EntityCard` zeigt Cover-Banner oben (Bild oder Gradient+Emoji), Badges lesbar.
13. **Sidebar Remove-Button** — nur bei Row-Hover, roter Hover-State
14. **Bugfix** — `sanitizeLibraryItems` filterte Divider raus (jetzt erlaubt)

---

## 7. Store-Methoden (`useWorldStore.ts`)

Auth: `login/register/logout/hydrateAuth/applySession`
Daten: `loadWorldData` (Supabase → Store + localStorage-Cache)
Universe: `setActiveUniverse/setUniversesLocal`
Kategorien: `addCustomCategory(config)` (label/singular/description/icon/iconUrl/entityType/fields),
  `addLibraryDivider(label?)`, `removeLibraryItem(id)`
Dashboard: `addDashboardNoteContainer`, `addDashboardListContainer`, `moveDashboardContainer`, `moveCategoryEntity`
Entities: `createEntity`, `updateEntityLocal`, `deleteEntityLocal` (optimistisch; Supabase-Write
  passiert in `EntityModal.tsx` direkt)
Suche: `searchQuery/setSearchQuery`

---

## 8. Lokale Speicher-Layer (localStorage, Skeleton bis Supabase-Storage-Patch)

| Datei | Inhalt |
|-------|--------|
| `lib/libraryItems.ts` | Kategorien+Divider, synct zu Supabase |
| `lib/dashboardContainers.ts` | Dashboard-Kacheln, synct zu Supabase |
| `lib/entityOrder.ts` | Card-Reihenfolge, synct zu Supabase |
| `lib/universeMeta.ts` | Universe-Icon (lokal) |
| `lib/entityMedia.ts` | Entity-Cover-Bilder (lokal, NICHT in Supabase) |

---

## 9. Offene Punkte / Nächste Schritte

1. **DashboardPrototype an echte Daten** — Kategorie-Karten zeigen noch Demo-Inhalte
   (Elara, Cinderport...). Sollten `libraryItems` + echte `entities` aus dem Store ziehen.
2. **CategoryField nutzen** — Felder werden gespeichert, aber EntityModal/EntityPage nutzen sie
   noch nicht als echte Eingabefelder.
3. **Universe-Titelbild persistieren** — aktuell nur Gradient-Platzhalter im Banner.
4. **Entity-Cover zu Supabase Storage** — aktuell localStorage (dataURL), skaliert nicht.
5. **Vercel Deploy** — `.env` mit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
6. **Demo-Daten entfernen** — `demoUniverses`/`demoEntities` in mockWorld sind nur Fallback
   für Logout-State; DashboardPrototype hat eigene hardcodierte Demo-Kategorien.

---

## 10. Design-Regeln (NICHT verletzen — siehe design.md)

- Farben nur via `var(--color-*)`, Radius via `var(--radius-*)`, Shadows via `var(--shadow-*)`
- Font-Sizes nur: 32/24/20/16/15/13/12/11px
- Fonts: `var(--font-ui)` (Manrope), `var(--font-display)` (Instrument Serif) nur für Titel
- Icons: Lucide, `strokeWidth={1.5}`
- Primary ist Orange `#EA580C` — nicht ändern ohne Freigabe
- TypeScript strict, kein `any`

---

## 11. Wichtige Dateien zum Einlesen

```
design.md                              # Design-Gesetz
mind.md                                # Projektgedächtnis + Session-Log
src/index.css                          # Alle CSS-Tokens
src/data/mockWorld.ts                  # Datenmodell + Meta-Maps
src/store/useWorldStore.ts             # Zustand-Store
src/components/layout/AppLayout.tsx    # App-Shell
src/components/categories/CategoryModal.tsx  # Setup-Modal (komplex)
src/pages/EntityPage.tsx               # Entity-Detailseite
src/pages/DashboardPrototype.tsx       # Startseite
src/pages/Dashboard.tsx                # Kategorie-Ansicht
supabase-migration.sql                 # Vollständiges DB-Schema (bereits ausgeführt)
```

---

*Stand: 2026-06-14 — Build grün, Supabase live.*
