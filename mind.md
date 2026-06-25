# MIND.md — Worldify Projektgedächtnis

> Dieses Dokument ist mein internes Gehirn für das Worldify-Projekt.
> Wenn ich den Faden verliere, lese ich zuerst hier nach.

---

## PROTOKOLL — Wenn ich feststecke oder Fehler mache

1. **STOPP** — nicht raten, nicht halluzinieren
2. **mind.md lesen** — Was war der letzte bekannte Stand? Was steht im Error Log?
3. **Lücke identifizieren** — Was genau weiß ich nicht? Was fehlt mir?
4. **Ehrlich kommunizieren** — Nutzer informieren, gezielt fragen
5. **Erst dann weitermachen** — mit verifizierten Fakten, nicht Vermutungen
6. **Eintragen** — Fehler ins Error Log, Lösung dokumentieren

> mind.md gewinnt immer gegen meine Erinnerung. Bei Widerspruch: Datei lesen, nicht annehmen.

---

## Projektüberblick

- **Projektname:** Worldify
- **Pfad:** `C:\Users\brend\Desktop\Brendel AI\Worldify`
- **Status:** Planung abgeschlossen — Briefing erhalten, bereit zum Bauen (Stand: 2026-06-13)
- **Kurzbeschreibung:** Private Worldbuilding Web-App für Fantasy-Geschichten. Sauberes, professionelles Tool zum Organisieren fiktiver Universen mit Charakteren, Orten, Fraktionen, Magie-Systemen, Kreaturen, Sprachen, Items, Geschichten und Notizen.
- **Scope:** Privat, kein SaaS, kein World Anvil-Klon — fokussiert und schlank

---

## Ziele & Anforderungen

### Kern-Konzept
Alles ist eine **Entity** innerhalb eines **Universe**.

### Entity-Typen
- Character
- Location
- Faction
- Magic System
- Creature
- Language
- Item
- Story
- Event
- Note

### Entity-Felder (jede Entity hat)
- `name`
- `type`
- `short description`
- `content / notes`
- `tags`
- `status`
- `created_at`
- `updated_at`

### Feature-Liste (Priorität: erst Fundament, dann Features)
- [x] Briefing erhalten
- [ ] Projektstruktur & Tech-Stack aufsetzen
- [ ] Layout: Sidebar-Navigation, professionelles Grid
- [ ] Universe-Übersicht (mehrere Welten verwalten)
- [ ] Entity-Karten (schöne Cards)
- [ ] Entity erstellen / bearbeiten / löschen
- [ ] Suche & Filterung
- [ ] Tags-System
- [ ] Status-System

### Design-Richtung
- Modern, clean, minimal, professionell
- Inspiriert von: **Notion, Linear, Raycast**, polierte Admin-Dashboards
- Keine schwere Fantasy-Dekoration, kein Clutter
- Ruhiges helles UI mit subtiler Fantasy-Atmosphäre
- Guter Whitespace, starke Typografie

---

## Architektur & Technologie-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---------|-------------|------------|
| Framework | **React + Vite** | Nutzer bestätigt |
| Primary Color | **Orange `#EA580C`** | Nutzer bestätigt, Hover `#C2410C`, Light `#FFF3ED` |
| Styling | **Tailwind CSS v4** | Design-Token-System aus design.md |
| Icons | **Lucide Icons** | festgelegt in design.md |
| Fonts | **Inter + Playfair Display** | festgelegt in design.md (Google Fonts) |
| Routing | **React Router v6** | Standard für React SPA |
| Datenhaltung | **localStorage + Zustand** | privat, kein Backend nötig |
| Deployment | **Vercel** | Nutzer bestätigt |
| Design System | **design.md** | BINDEND für alle UI-Arbeit |

---

## Aktueller Stand

### Was zuletzt getan wurde
- `2026-06-13` — mind.md erstellt
- `2026-06-13` — Briefing erhalten und dokumentiert
- `2026-06-13` — **design.md fertiggestellt** — komplettes Design System "Parchment Dusk"
- `2026-06-13` — Custom Theme in Theme-Factory gespeichert
- `2026-06-13` — Grundgerüst gebaut: AppLayout, Sidebar, TopBar, Dashboard, SettingsModal (5 Tabs)
- `2026-06-13` — **Design System Page fertig** — /design-system Route mit 14 Sektionen
- `2026-06-13` — **Design System Audit** — 35 fehlende CSS-Tokens ergänzt, design.md Font-Referenzen gefixt, CLAUDE.md mit Enforcement-Regeln erstellt
- `2026-06-14` — Entity-Detailseite erweitert: Teilnehmer verlinken bestehende Characters, Verknüpfungen werden persistent gespeichert und im rechten Panel angezeigt
- `2026-06-14` — Verknüpfungs-Modal verbessert: Kategorie-Filter, Suche und direkte klickbare Entity-Liste mit Typ-Icon statt Select-Feld
- `2026-06-14` — Aufgaben, Abschnitte und Textbereiche nutzen jetzt einen richtigen Editor-Modal statt umständlicher Inline-Eingaben; Listeneinträge können hinzugefügt, bearbeitet und gelöscht werden
- `2026-06-14` — Notizen und Galerie auf konsistente Modals umgestellt; Notizen haben jetzt einen eigenen Editor, Galerie verwaltet Cover-Bilder zentral im Modal
- `2026-06-14` — Teilnehmer und Verknüpfungen auf schnelle Mehrfachauswahl mit Suche umgestellt; bestehende Links werden gefiltert und gesammelt in einem Schritt hinzugefügt
- `2026-06-14` — Bonus-Polish: Listenmodule unterstützen Umordnung im Editor, Verknüpfungen haben Confirm-Remove-Flow und der Vite-Build ist per Manual Chunks besser gesplittet
- `2026-06-15` — Login-Seite responsive für Tablet und Mobile gemacht; Panel stapelt nun sauber, Spacing und Typografie skalieren mit der Viewport-Breite
- `2026-06-15` — Kategorie-Bearbeiten-Flow repariert; `CategoryModal` hatte einen Hook-Order-Fehler durch ein frühes `return null`, wodurch der Screen nach dem Öffnen hängen konnte
- `2026-06-15` — Kategorien können jetzt sicher gelöscht werden: im Bearbeiten-Modal gibt es einen Delete-Button mit `Bist du sicher?`-Bestätigung; nach dem Löschen wird sauber zurück navigiert
- `2026-06-15` — Robustheits-Pass gestartet: Entity-Löschung räumt jetzt Feldwerte, Teilnehmer-Referenzen und Verknüpfungen mit auf; neue Entities speichern Custom-Feldwerte direkt über die echte Supabase-ID; Kategorien normalisieren Namen/Felder sauberer und verhindern unsaubere Dubletten
- `2026-06-15` — Eigene Kategorien filtern jetzt korrekt über eine echte Entity→Kategorie-Zuordnung statt nur über `entityType`; dadurch zeigen Custom-Kategorien keine fremden Einträge mehr, und die Zuordnung wird bei Create/Edit sowie Kategorie-Löschung sauber mitgeführt
- `2026-06-15` — Create-Modal ist jetzt kategoriebewusst: beim Erstellen innerhalb einer Kategorie-Seite wird die aktive Kategorie immer mitgegeben, im Modal direkt angezeigt und der passende empfohlene Typ automatisch daran gebunden
- `2026-06-16` — Sidebar: LibraryItemRow ist jetzt per HTML5 DnD umsortierbar; Drag-Handle und Delete-Button sind hover-only (opacity 0→1 mit Transition); Dividers nutzen cursor:grab als einzige Affordance
- `2026-06-16` — Dashboard: EntityCard Drag-Handle ist hover-only (opacity Transition); HeaderActionButton und GalleryView mit hover-States; EmptyPanel gap auf CSS-Variable
- `2026-06-16` — Audit-Pass (kurzfristig): Dead Code in Dashboard.tsx entfernt (isOverviewPage, DashboardContainerCard etc.); toSingular als geteilte lib; Umlaut-Fixes; Custom-Category-Farben propagieren korrekt; CategoryCard hover-State im Dashboard-Übersicht
- `2026-06-17` — **Mittelfristig + Langfristig vollständig implementiert:**
  - **Gallery View** (3. Ansichtsmodus neben Grid/List): kompakte Bildkarten 200px, dunkler Gradient-Overlay, funktioniert in Light + Dark Mode
  - **Bulk-Operationen**: "Auswahl" Toggle-Button in Toolbar, Checkbox pro Card/GalleryCard, fixierte BulkActionBar am unteren Bildschirmrand mit "Alle auswählen" + "Löschen"
  - **Custom Dropdown**: DashboardSelect nutzt jetzt ein Custom-Dropdown statt nativem `<select>` — Click-Outside-Handler, Chevron-Animation, aktiver Eintrag mit Checkmark
  - **Search Expansion**: Suche durchsucht jetzt auch Feldwerte + Notiz-Content (JSON-Parsing) zusätzlich zu Name/Description/Tags
  - **CategoryNoteCard "+"**: Notizen können direkt mit einem Button unten in bestehende Note-Container hinzugefügt werden
  - **Keyboard Shortcuts**: `⌘K` / `Ctrl+K` fokussiert Suche; `n` öffnet Create-Modal (außerhalb von Inputs)
  - **Dark Mode**: CSS-Variable-basiert via `[data-theme="dark"]` in index.css, Toggle im Avatar-Menü (Moon/Sun Icon), Persistenz via localStorage
- `2026-06-17` — **CategoryModal iconUrl Upload**: Eigenes Bild als Kategorie-Icon — Canvas-Resize auf 128px, Base64/WebP-Speicherung in libraryItems (localStorage), Preview im Modal-Button, "Entfernen"-Flow; SidebarItem rendert iconUrl als `<img>` wenn gesetzt
- `2026-06-18` — **Audit-Pass & Bug-Fixes:**
  - `<button>` in `<button>` (Sidebar Universe-Picker): Vite-Cache-Problem verhinderte, dass der Fix live ging — Cache gelöscht, Server neu gestartet, 0 Konsolen-Fehler ✓
  - `EntityListRow` hatte `bulkMode`/`isSelected`/`onSelect` Props nicht → Klicks öffneten Entity-Seite statt zu selektieren. Props vollständig hinzugefügt, Checkbox-UI und Zeilenhervorhebung ergänzt ✓
  - Bulk-Status-Change schrieb nicht nach Supabase (`updateEntityLocal` ist nur In-Memory) → `supabase.from('entities').update(...)` nach jedem Status-Wechsel hinzugefügt ✓
- `2026-06-18` — **Alle offenen Langfristig-Items implementiert:**
  - **FOUC Fix**: Inline-Script im `<head>` von index.html setzt `data-theme` sofort aus localStorage vor React-Mount — kein weißer Flash mehr
  - **Bulk Status-Wechsel**: BulkActionBar hat jetzt einen "Status"-Button mit Dropdown (öffnet nach oben), zeigt alle 4 Status zur Auswahl, setzt alle gewählten Entities auf neuen Status und schließt Bulk-Modus
  - **Timeline View**: 4. Ansichtsmodus (Clock-Icon) in der View-Toggle-Gruppe; gruppiert Entities nach Monat von `updatedAt`, zeigt vertikale Zeitlinie mit monatlichen Abschnitten und Entitäts-Cards
  - **Global Search Panel**: ⌘K / Ctrl+K öffnet ein globales Such-Modal mit Backdrop-Blur, Echtzeit-Suche über alle Entities des aktiven Universe, Entity-Typ-Badges, Keyboard-Hints (↵ / Esc); TopBar-Input auf "Filtern…" umbenannt (ist Category-Filter, nicht globale Suche)
  - **Entity Relationship Graph**: Neue Route `/graph`, erreichbar via `G`-Taste oder Browser-Navigation; Kraft-Simulation (150 Iterationen, eigene Implementierung ohne D3) positioniert alle Universe-Entities als Nodes; Hover hebt Verbindungen hervor; Klick öffnet Entity; Legende nach Typ; Zurück-Button via AppLayout
- `2026-06-18` — **Wikipedia-Links + Notes-Redesign:**
  - **Entity-Namen-Verlinkung in Text**: `parseTextMentions()` in `src/lib/entityMentions.ts` erkennt Entity-Namen im Text (min. 3 Zeichen, longest-match, Wortgrenzen inkl. Umlaute). `MentionText` (read-only) und `LiveMentionEditor` (editor) rendern Treffer farbig+unterstrichen.
  - **LiveMentionEditor** (`src/components/editor/LiveMentionEditor.tsx`): Mirror-Overlay-Technik — transparente Textarea (Input, sichtbarer Cursor via `caretColor`) + absolut positionierter Mirror-Div (styled HTML mit Mention-Spans). Mentions erscheinen sofort während des Tippens, kein Modus-Wechsel nötig.
  - **NotesTab komplett redesigned**: 2-Panel-Layout (220px Notizliste links + Editor rechts). Notizen fühlen sich jetzt wie echte Wiki-Seiten an — Icon, großer Titel, Trennlinie, dann LiveMentionEditor. Kein Expand/Collapse mehr. Word-Count + Delete in Toolbar.

### Nächste Schritte
1. ~~Tech-Stack bestätigen~~ ✓ React + Vite + Vercel
2. Projektstruktur anlegen (Vite init, Tailwind, Router, Zustand)
3. Layout + Sidebar bauen (nach design.md)
4. Entity-System implementieren

---

## Fehler-Log (Error Log)

| Datum | Fehler | Kontext | Lösung / Status |
|-------|--------|---------|----------------|
| 2026-06-21 | Universe-Banner zwischen Browsern nicht synchron / altes Bild sichtbar | Upload überschrieb immer denselben Storage-Pfad, DB-Updates liefen fire-and-forget, offene Sessions hatten keinen Refresh und Remote-`null` entfernte stale lokale Werte nicht. | Gefixt: versionierte Storage-Pfade, bestätigte DB-Writes, autoritativer Remote-Cache, alte Datei-Cleanup, Realtime + Focus/Visibility-Refresh + 30s Fallback. |
| — | — | — | — |

---

## Erfolgs-Log (Success Log)

| Datum | Meilenstein | Details |
|-------|------------|---------|
| 2026-06-13 | Projekt gestartet | mind.md angelegt |
| 2026-06-13 | Briefing dokumentiert | Alle Anforderungen klar verstanden und eingetragen |
| 2026-06-13 | Design System fertig | design.md mit vollständigem Token-System, Komponenten, Layout-Regeln |

---

## Offene Fragen

- [ ] Welcher Tech-Stack? (React/Vue/Svelte? Vite? Electron für Desktop?)
- [ ] Datenhaltung: lokal (SQLite/JSON) oder Browser (localStorage/IndexedDB)?
- [ ] Soll die App im Browser laufen oder als Desktop-App?
- [ ] Mehrere Universen gleichzeitig oder eines aktiv?
- [ ] Gibt es ein Design/Mockup oder freie Hand?

---

## Wichtige Entscheidungen & Kontext

## Versions-Regel

- Worldify arbeitet ab jetzt mit einer sichtbaren App-Version.
- Startversion ist **1.01**.
- Nach jedem inhaltlichen Update wird die Version um **0.01** erhöht:
  - `1.01`
  - `1.02`
  - `1.03`
  - usw.
- Die aktuelle Versionsnummer steht in der UI direkt unter dem **Worldify**-Logo in der Sidebar.
- Bei künftigen Updates muss die sichtbare Versionsnummer und dieser Verlauf konsistent mitgezogen werden.

- App ist **privat** —
- Kein World Anvil-Klon — Fokus auf Einfachheit und Qualität statt Feature-Breite
- Erst Layout & Entity-System polieren, dann erweiterte Features

---

## Bekannte Stolperstellen

*(Wird befüllt sobald erste Entwicklung beginnt)*

---

## Update 2026-06-13

- Preview-Skeleton fur das spatere Datenmodell gebaut
- Fake-Login + Protected Route eingefuhrt
- Demo-Universes und Demo-Entities in Mock-Daten angelegt
- Dashboard als gefiltertes Entity-Grid vorbereitet
- Detailseite und Create-Modal ohne Persistenz eingebaut
- Architektur so angelegt, dass spater ein echter Service oder Supabase hinter den Store gesetzt werden kann

## Update 2026-06-14

- Supabase Auth und echte Universe- sowie Entity-Daten sind angebunden
- Universe-Create/Edit/Delete ist in der Sidebar eingebaut
- Library-Kategorien werden als lokales Gerust pro User und Universe gespeichert
- Custom-Kategorien und Divider konnen in der Sidebar wieder entfernt werden
- Dashboard hat jetzt ein erstes Filter- und Sortier-Gerust mit Status-Filter, Sortierung und Ergebniszahler
- Universe-Icons haben jetzt ein lokales Upload-Skeleton mit Vorschau im Modal und Anzeige in der Sidebar
- Dashboard nutzt jetzt verschiebbare Container fur Kategorien, Quick Notes und Listen
- Kategorien sind als individuelle Container gedacht, Characters ist nur die erste Beispiel-Kategorie

## Supabase-Patch-Strategie

SQL-Migrationen werden gesammelt und in **Major Patches** ausgeführt — nicht jede Session.

Offene Migrationen: KEINE — am 2026-06-14 ausgeführt ✓
- `supabase-migration.sql` enthält jetzt VOLLES Schema: universes, entities, universe_settings (alle mit RLS + updated_at Trigger). User hat erfolgreich ausgeführt ("Success. No rows returned").

Code ist sync-fähig: localStorage-Cache + Supabase-Sync via supabaseSettings.ts.

## NÄCHSTE SESSION — Wo weitermachen

1. ~~EntityPage generalisieren~~ ✓
2. ~~Supabase-Settings-Sync Code~~ ✓ — wartet auf Major Patch Migration
3. ~~UI-Polish A~~ ✓ — Kategorie-Label auf Karten, Create-Button-Label dynamisch, Empty State mit Kategorie-Namen + CTA
4. ~~Responsive Sidebar~~ ✓ — Mobile Overlay + Hamburger, Desktop Collapse/Expand
5. ~~Entity-Detail-Seite ausbauen~~ ✓ — Hero-Header mit Emoji/Farbe, Tabs (Overview/Notes/Relations), Meta-Sidebar
6. ~~EntityPage Full-Bleed Cover~~ ✓ — Hero deckt ganze Breite, Cover-Upload mit FileReader, Text wird weiß über Bild
7. ~~Dashboard-Prototyp~~ ✓ — neue Route `/prototype`, statisch. Konzept: Schnellzugriff-Pills (skaliert 5-20 Kategorien) + Kategorie-Karten-Grid (auto-fill). Jeder Eintrag mit Thumbnail (Icon-Platzhalter, vorbereitet für echte Bilder via <img> im 32px overflow-hidden Rahmen). Stat-Karten verworfen.
8. ~~Dashboard-Prototyp als echtes Dashboard~~ ✓ — Route `/` → DashboardPrototype, Universe-Titelbild-Banner, Universe-Name aus Store. Kategorie-Inhalte noch Demo. Altes Dashboard.tsx nur noch für `/:categorySlug`.
9. ~~"Schnell erstellen" als Dropdown~~ ✓ — Pills aus Dashboard entfernt, "New Entity" Button in TopBar öffnet jetzt Dropdown mit echten Kategorien (aus libraryItems, entityType→Icon/Farbe). Klick öffnet Create-Modal mit Typ.
10. ~~CategoryModal zweistufig~~ ✓ — Ansicht 1: Vorschläge + "Eigene Kategorie"-Zeile (›). Ansicht 2: Formular mit Zurück. Smooth slideIn-Übergang. Alte Inline-Form ersetzt.
11. ~~Dashboard Kategorie-Zähler~~ ✓ — Pill rechts neben Titel (Singular/Plural), "Card verschieben"-Leiste entfernt
12. ~~CategoryModal größer + Scrollbar~~ ✓ — 85vh hoch, Untertitel-Hinweis, schlanke custom Scrollbar (.ds-scroll Klasse, 8px). Wiederverwendbar für andere Scroll-Bereiche.
13. ~~Icon-Picker für eigene Kategorien~~ ✓ — neue `src/lib/categoryIcons.ts` (24 Icons, name→component). SidebarCategoryItem.icon Feld, addLibraryCategory(label,desc,type,icon). Picker-Grid in CategoryModal Custom-View. Sidebar nutzt getCategoryIcon().
14. ~~Icon-Picker kompakt~~ ✓ — statt offenem Grid jetzt kleiner Icon-Button + Popover-Grid (6 Spalten) neben dem Namensfeld
15. ~~Kategorie-Setup-Modal mit eigenen Feldern~~ ✓ — CategoryField Typ (text/textarea/number/participants/sections/tasks), categoryFieldTypeMeta. SidebarCategoryItem.fields/singular/iconUrl. Store addCustomCategory(config). Custom-View: Singularname, Beschreibung, Feld-Builder (Name+Typ+Liste mit Remove).
16. ~~Feld-Builder modernisiert~~ ✓ — Typ-Icons (fieldTypeIcon Map), Felder als Zeilen mit Icon-Box, Typ-Picker als Popover statt nativem Select, oranger +-Button
17. ~~Vorschläge führen auch durch Setup~~ ✓ — handleSuggestion füllt Custom-View vor (Name/Icon/Beschreibung/entityType im Hintergrund), kein Direkt-Anlegen mehr. addLibraryCategory im Modal entfernt, alles über addCustomCategory.
18. ~~Trennzeichen anlegen~~ ✓ — Store addLibraryDivider(label?), CategoryModal 3. View 'divider' mit Text-Input + Live-Vorschau (Text zentriert zwischen Linien, oder reine Linie). sanitizeLibraryItems erlaubt jetzt auch 'divider' (war Bug: filterte raus).
19. ~~EntityPage volle Breite + lesbare Badges~~ ✓ — maxWidth-Constraint weg (Content full-width). Badges: mit Cover weiß-transparent, ohne Cover solide farbig (badgeStyle wieder rein).
20. SUPABASE LIVE ✓ — User hat Schema ausgeführt, "My Universe" lädt echt aus DB. Demo-Entities (entity-elara etc.) existieren nicht mehr → EntityPage redirected. Dashboard-Prototyp zeigt noch Demo-Kategorien (hardcoded).
21. ~~Entity-Cover persistent + auf Karten~~ ✓ — neue src/lib/entityMedia.ts (localStorage, cover dataURL pro entityId). EntityPage lädt/speichert via get/set/removeEntityCover. Dashboard EntityCard zeigt Cover-Banner oben (Bild oder Farbverlauf+Emoji), Badges lesbar drüber. Skeleton bis Supabase-Storage-Patch.
22. Nächste: DashboardPrototype an echte Daten, Felder beim Entity nutzen, Vercel Deploy

Offene Stelle: EntityPage Hero ist im `<main>` mit padding 32 — voll-bündig (full bleed bis Fensterrand) bräuchte negative Margins. Aktuell volle Breite innerhalb des Content-Paddings.

Relevante Dateien für nächste Session:
- `src/pages/EntityPage.tsx` — singularLabel noch aus typeMeta, sollte aus libraryItems kommen
- `src/store/useWorldStore.ts` — createEntity/updateEntityLocal noch ohne Supabase
- `src/lib/libraryItems.ts`, `src/lib/dashboardContainers.ts`, `src/lib/entityOrder.ts` — localStorage-Layer

## Update 2026-06-14 (Session 2)

- `SidebarCategoryItem` hat jetzt optionales `entityType?: EntityType` Feld
- `defaultLibraryItems` Characters hat `entityType: 'character'`
- App.tsx: alle hardcodierten Typ-Routen entfernt — nur `/:categorySlug` bleibt
- Dashboard.tsx: `routeTypeMap` entfernt — `activeType` wird aus `libraryItems` by slug abgeleitet
- Dashboard `DashboardContainerCard`: `slugToEntityType()` entfernt, lookup via `libraryItems`
- EntityPage.tsx: Back-Link nutzt `navigate(-1)` statt hardcodierter Route
- Store `addLibraryCategory`: nimmt optionales `entityType` entgegen
- CategoryModal: alle Suggestions mit passenden `EntityType` verknüpft (9 von 11)
- Build: ✓ erfolgreich

## Update 2026-06-14 (Session 3)

- `DashboardPrototype.tsx` nutzt jetzt echte `libraryItems` und echte `entities` aus dem Store statt Demo-Kategorien
- Dashboard-Startseite zeigt pro Kategorie echte Anzahl und echte Vorschau-Eintrage des aktiven Universes
- Kategorie-Karten verlinken jetzt direkt auf `/:categorySlug`, Vorschau-Eintrage direkt auf `/entities/:id`
- Plus-Button auf jeder Kategorie-Karte nutzt jetzt `openCreateModal(category.entityType)`
- Empty-State fur fehlende Kategorien auf der Dashboard-Startseite eingebaut
- Build: erfolgreich

## Update 2026-06-14 (Session 4)

- Entity-Detailseite: Kategorie-Feld-Container haben jetzt minimalistische `+`-Action im Header
- Doppelte kleine Innen-Labels in den Haupt-Kategorie-Feldern entfernt, damit nur Container-Titel + Inhalt sichtbar bleiben
- Quick-Add fur Notizen und Haupt-Kategorie-Felder eingebaut
- Notizen speichern direkt in Supabase, Kategorie-Feld-Werte weiterhin im lokalen Feldspeicher
- Build: erfolgreich

## Update 2026-06-14 (Session 5)

- Teilnehmer-Felder auf der Entity-Detailseite nutzen jetzt echte Character-Referenzen statt nur Freitext
- Neue Helper-Datei `src/lib/entityRelations.ts` fur Encode/Decode von verlinkten Entity-Referenzen
- Teilnehmer-Quick-Add zeigt vorhandene Characters aus demselben Universe als Auswahl an
- Bereits verlinkte Characters werden im Picker als schon verbunden markiert
- Teilnehmer-Anzeige im Detail ist jetzt klickbar und springt direkt zur verknupften Entity
- Dashboard-Vorschau fuer Teilnehmer zeigt jetzt lesbare Namen statt rohe Referenz-Strings
- Build: erfolgreich

*Letzte Aktualisierung: 2026-06-14*

- 2026-06-15 � Dashboard-Startseite nutzt jetzt ebenfalls die echte Entity?Kategorie-Zuordnung; Kategorie-Karten und Counts zeigen dadurch die aktuellen Eintr�ge korrekt an

- 2026-06-15 � Kategorie-QA weiter gesch�rft: globale Create-Auswahl arbeitet jetzt mit echten Kategorien statt deduplizierten Typen, und Custom-Kategorien d�rfen denselben empfohlenen Typ teilen ohne blockiert zu werden

- 2026-06-15 � TopBar-Create-Dropdown zeigt jetzt alle echten Kategorien an, auch komplett eigene ohne empfohlenen Typ; dadurch lassen sich Eintr�ge global konsistent in jede Kategorie anlegen

- 2026-06-15 � Dashboard-Kategoriekarten erzeugen bei komplett eigenen Kategorien keinen falschen character-Fallback mehr, sondern �ffnen den Create-Flow direkt mit der echten Kategorie

- 2026-06-15 - Entity-Detailseite und Verknuepfungs-Modal respektieren jetzt echte Kategorien statt nur globale Typen; Profil zeigt Kategorie + Systemtyp getrennt und Relations filtern/suchen ueber die zugewiesene Kategorie

- 2026-06-15 - Kategoriegebundenes Entity-Modal gehaertet: eigene Kategorien ohne empfohlenen Systemtyp zeigen jetzt zusaetzlich ein sichtbares Systemtyp-Feld statt still auf Characters zu fallen

- 2026-06-15 - Dashboard-Startseite gehaertet: Custom-Kategorien zaehlen jetzt nur echte zugewiesene Eintraege; Systemtyp-Fallback bleibt nur fuer eingebaute Standard-Kategorien aktiv. Doppelte Kategorienamen werden im Store pro Universe abgefangen

- 2026-06-15 - Kategorie-Modal final gehaertet: doppelte Kategorienamen geben jetzt direkt sichtbares Feedback statt still zu scheitern

- 2026-06-15 - Entity-Detailseiten verbessert: neue Uebersichts-Kachel mit Schnellstatus und Verknuepfungen nach Kategorie gruppiert fuer bessere Orientierung

- 2026-06-15 - Teilnehmer-Picker enthaertet: Labels und Suche sind jetzt feldbezogen statt hart auf Characters getrimmt, inklusive sauberem Keine-Treffer-Zustand

- 2026-06-15 - OXC-Umstellung abgeschlossen: oxlint als Projekt-Linter eingebunden (
pm run lint), Windows-stabiles Script via oxlint ./src --deny warnings, Build weiterhin erfolgreich

- 2026-06-15 - Entity-Create-Modal weiter gehaertet: wenn ein Eintrag innerhalb einer konkreten Kategorie-Seite erstellt oder bearbeitet wird, bindet sich das Modal jetzt zuerst hart an den echten Kategorie-Slug statt ueber Systemtyp-Fallbacks zu raten

- 2026-06-15 - Kategorie-Matching zentralisiert: Dashboard-Startseite und Kategorie-Seiten nutzen jetzt dieselbe isEntityInCategory-Logik wie die restlichen Flows, damit Counts, Vorschauen und Filter nicht mehr auseinanderlaufen

- 2026-06-15 - Entity-Detailseite und Relations-Modal weiter vereinheitlicht: fuer Anzeige, Gruppierung und Auswahl wird jetzt zuerst die echte zugewiesene Kategorie gelesen und nur danach auf Built-in-Systemtypen zurueckgefallen

## Update 2026-06-16 (Session UI-Polish)

- Sidebar collapsed-State: Logo + Expand-Button waren gequetscht nebeneinander → im collapsed State nur noch der Expand-Button, kein separates Logo
- Dashboard Kategorie-Grid (Dashboard.tsx): `repeat(auto-fit, minmax(320px, 380px))` → `repeat(auto-fill, minmax(260px, 1fr))` → kein Whitespace mehr rechts, Karten füllen volle Breite
- EntityCard Hero-Höhe von 148px auf 180px erhöht — Cover-Bild / Farbfläche sichtbarer
- Grid/List-Toggle: neue `viewMode` State ('grid' | 'list'), Toggle-Buttons (LayoutGrid / List Icons) im Toolbar, Listenansicht zeigt kompakte Zeilen mit Thumbnail + Name + Status
- viewMode persistent via localStorage (`worldify_view_mode`) — bleibt beim Kategorie-Wechsel erhalten
- Backup-Button z-index Fix: Content-Div mit z-index:1 hat Klick-Events auf Backup+Import-Buttons blockiert → Buttons-Container bekommt z-index:2
- Backup-Timestamp in TopBar: `lastBackupAt` im Zustand-Store (init aus localStorage), nach jedem Export gesetzt, TopBar zeigt "Backup TT.MM. HH:MM" in Placeholder-Farbe

## Update 2026-06-17 (Session Audit-Fixes)

Alle 10 kurzfristigen Audit-Punkte abgearbeitet:

1. **Custom Kategoriefarbe auf Overview** — `DashboardPrototype.tsx` liest jetzt `category.color` (hex aus Color-Picker) und wendet es auf Icon-BG + Vorschau-Items an; Fallback auf entityTypeMeta-Farbe
2. **EntityCard Drag-Handle nur bei Hover** — `isCardHovered` State in EntityCard, opacity 0→1 mit transition
3. **HeaderActionButton Hover-State** — `hovered` State, primary → `color-primary-hover`, secondary → `color-bg`
4. **CategoryCard Hover** — `shadow-md` + stärkere Border bei Hover auf der Overview
5. **Umlaut-Typos** — "Eintrage" → "Einträge", "fur" → "für" in DashboardPrototype.tsx
6. **Dead Code entfernt** — `DashboardContainerCard`, `NoteContainerCard`, `ListContainerCard`, `isOverviewPage`, `categoryContainerCards`, `addDashboardListContainer`, `useLocation`, `CheckSquare`, `ListPlus`, `DashboardListContainer`, `DashboardContainer` aus Dashboard.tsx gelöscht
7. **`toSingular` shared util** — neue Datei `src/lib/toSingular.ts`, beide Dashboard-Dateien importieren daraus, lokale Duplikate entfernt
8. **EntityListRow Emoji → Lucide Icon** — `typeEmoji()` durch `ENTITY_TYPE_ICONS[entity.type]` ersetzt, `typeEmoji`-Funktion gelöscht
9. **`gap: 16` → `var(--space-4)`** — Design-System-Verstoß in EmptyPanel behoben
10. **design.md Update** — Entity-Typ CSS-Variable-Namenskonvention dokumentiert
- Build: ✓ keine TypeScript-Fehler

## Update 2026-06-17 (Session Drag-and-Drop Sidebar)

- Sidebar Library-Items sind jetzt per Drag-and-Drop umordnerbar (native HTML5 DnD)
- `reorderLibraryItems(fromIndex, toIndex)` im Store — spliced `libraryItems`, persistiert via `saveLibraryItemsForScope`
- `LibraryItemRow` bekommt `draggable` + alle Drag-Events als Props vom Sidebar-Parent
- Visuelles Feedback: gezogenes Item wird halbtransparent (`opacity: 0.4`), Drop-Target bekommt primary-Outline (Kategorien) oder dickere farbige Linie (Divider)
- `GripVertical`-Icon (12px) erscheint auf Hover — bei Kategorien rechts am Rand, bei Divider links vor dem Label — `visibility: hidden` verhindert Layout-Shift
- Drag-State im Sidebar-Parent: `draggingIndex` + `dragOverIndex` als State, lösen Re-Render für visuelle Rückmeldung aus
- Build: erfolgreich, keine TypeScript-Fehler

## Update 2026-06-16 (Session Notes-Multi)

- Notes-System komplett ersetzt: `entity.content` speichert jetzt ein JSON-Array von `Note`-Objekten (`id, icon, title, text, createdAt`)
- `parseNotes()` liest JSON-Array oder wandelt Legacy-Plaintext als einzelne Notiz um — keine Migration nötig
- `serializeNotes()` schreibt JSON zurück in Supabase via `handleSaveNotes()`
- Neues `NotesTab`: Liste von `NoteCard`-Komponenten mit Collapse/Expand, Emoji-Icon-Picker (5×4 Grid, 20 Icons), Titel-Input, Textarea, Delete-Button — alles inline ohne Modal
- Auto-Save bei jeder Änderung (title/text/icon) via `persistNotes()` → `onSave`
- Empty State mit "Erste Notiz erstellen" CTA
- `NoteIconPicker`: 5-spaltig, öffnet als Popover direkt am Icon-Button, `stopPropagation` verhindert Kollision mit Toggle-Klick
- `QuickNotesList` (Overview-Tab): zeigt max. 4 Notiz-Titel als kompakte Liste, "+ Notiz" fügt direkt neue Note zum JSON-Array hinzu
- `QuickAddNotes` + `NotesEditorModal` komplett entfernt — kein Modal mehr für Notizen
- Build-Fixes: `SidebarItem` → `SidebarLibraryItem` in export/importWorldData, unused `ImagePlus` entfernt, `singularLabel` aus `EntityListRow` entfernt

## Update 2026-06-15 (Session Export/Import)

- Eigene Kategorien (Custom-Kategorie-Namen wie "Hanfsorten", "Schriften") erscheinen jetzt im Kategorie-Select des EntityModal — Fix: hardcoded entityTypes-Array durch libraryItems.filter(kind==='category') ersetzt
- Status-Feld auf EntityPage interaktiv: Draft/Active Toggle-Buttons als Pill-Gruppe im Hero, daneben Archiv-Icon (Shapes) neben Edit-Button — schreibt direkt in Supabase
- Export-Feature gebaut: `src/lib/exportWorldData.ts` — ZIP mit worldify-data.json (vollstaendiger Backup) + README + Markdown pro Entity (gruppiert nach echter Kategorie via getEntityCategorySlug)
- Import-Feature gebaut: `src/lib/importWorldData.ts` — liest ZIP, legt NEUES Universe in Supabase an, importiert alle Entities + Kategorien in dieses Universe
- jszip als Dependency hinzugefuegt (npm install jszip)
- Backup vereinfacht: kein Dialog mehr — Backup-Button laedt direkt ZIP des aktiven Universe herunter (kein Universum-Auswahlschritt)
- Auto-Backup beim Logout: TopBar prueft vor logout() ob entities vorhanden, exportiert dann automatisch ZIP — kein manueller Schritt noetig

Relevante neue Dateien:
- `src/lib/exportWorldData.ts` — ZIP-Export (JSON + Markdown)
- `src/lib/importWorldData.ts` — ZIP-Import in neues Universe

## Update 2026-06-18 (Session UI-Improvements – Alle 8 Items)

Alle 8 geplanten Verbesserungen implementiert:

1. **Search Panel Keyboard-Navigation** — `activeIndex` State, ArrowUp/Down/Enter-Handler, `itemRefs` für scrollIntoView, Footer-Hints aktualisiert
2. **Graph Verbindungs-Hinweis** — Low-links-Bar unter dem SVG: bei 0 oder < 5% Verbindungen erscheint ein primär-farbiger Hinweis-Banner
3. **Bulk Mode in Gallery + Timeline** — Gallery war bereits implementiert; Timeline-Einträge haben jetzt dieselbe Bulk-Mode-Logik (Link-Prevention + isSelected-Styling + Checkbox)
4. **Filter Feedback / Count** — `totalCategoryCount` useMemo zeigt `"X von Y Einträge"` wenn Suchquery aktiv
5. **Bulk Delete Confirmation** — `window.confirm()` mit Anzahl vor dem Löschen
6. **Status Toggle Clarity** — EntityPage Hero-Toggle: "Status"-Label davor, jetzt 3 Optionen (Draft / Active / Concept) statt 2
7. **Status Counts im Filter-Dropdown** — `statusCounts` useMemo berechnet Anzahl pro Status (ohne Status-Filter); Labels zeigen z.B. `"Active (12)"`, `"Draft (7)"`
8. **Graph Zoom + Pan** — Mausrad-Zoom (non-passive wheel listener), Drag-to-Pan, 3 Zoom-Buttons (ZoomIn / ZoomOut / Reset), Footer-Hinweis aktualisiert. Content in `<g transform>` gewrapped.

Technisches Detail Graph Zoom:
- `svgRef` + non-passive `wheel` event über `useEffect` (React onWheel ist passive und kann nicht `preventDefault`)
- Zoom zentriert auf Cursor-Position: `newTx = mx - (mx - prev.tx) * ratio`
- Drag: `dragRef` (useRef, kein State) speichert Start-Koordinaten für stabile pan-Berechnung
- SVG-Koordinaten: Maus-Position via `getBoundingClientRect()` + Skalierung auf W/H

Bulk Status Supabase-Persistence:
- `updateEntityLocal` ist nur in-memory — Supabase-Write zusätzlich erforderlich (bereits in Session davor gepatcht)

Build: ✓ keine TypeScript-Fehler erwartet

## Update 2026-06-18 (Session UI-Improvements 2 – 6 weitere Items)

1. **Tag-Filter im Dashboard** — `tagFilter` State, `availableTags` useMemo, klickbare Tag-Chips über dem Grid, Tags auf EntityCard + EntityListRow sind klickbar (onTagClick prop). Klick auf aktiven Tag deaktiviert ihn wieder.
2. **Entity duplizieren** — `handleDuplicate()` in EntityPage: erstellt Kopie via `createEntity()` + Supabase-Insert, navigiert zur neuen Entity. Button "Kopie" (CopyPlus-Icon) im Hero-Overlay.
3. **Zuletzt bearbeitet** — `recentEntities` useMemo (top 8 nach updatedAt) auf DashboardPrototype-Startseite als horizontale Scroll-Leiste mit kleinen Karten + Typ-Icon.
4. **Graph Typ-Filter** — `hiddenTypes` State (Set), Legende wird zu klickbaren Buttons; aktiver Typ hat normale Farbe, versteckter Typ wird halbtransparent. Nodes + Edges per opacity/pointerEvents ausgeblendet (Layout bleibt stabil). "Alle zeigen" Reset-Button erscheint wenn etwas versteckt ist.
5. **Keyboard Shortcuts Modal** — `?`-Taste (außerhalb Inputs) öffnet Modal. `?`-Button in TopBar (als `onOpenShortcuts` Prop). Modal listet alle Shortcuts. Esc schließt.
6. **Inline-Name-Edit in Listenansicht** — Doppelklick auf Entity-Name in EntityListRow aktiviert Inline-Input. Enter/Blur speichert via updateEntityLocal + Supabase. Esc bricht ab. useRef für autofocus+select.

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-21 — Feldinhalte als kompakte Dashboard-Pills

- Große Aufgaben-/Abschnitts-Vorschauen aus den Grid-Entity-Cards entfernt.
- Direkt neben der Gesamt-Pill (`1 Feld` / `N Felder`) erscheinen jetzt alle befüllten Custom-Felder horizontal als Zähler-Pills, z. B. `2 Aufgaben` oder `3 Abschnitte`.
- Abschnittszahlen werden korrekt aus dem JSON-Array gelesen; Legacy-Werte, Aufgaben und Teilnehmer werden zeilenbasiert gezählt.
- Text-, Textarea- und Number-Felder zählen als ein befüllter Eintrag.
- Die Pill-Zeile bleibt einzeilig und horizontal scrollbar, damit sie auch auf Tablet und Mobile kompakt funktioniert.
- `Dashboard.tsx` wurde mit oxlint geprüft; keine neuen Warnungen durch diese Änderung. Der lokale Server antwortet mit HTTP 200.

## Update 2026-06-21 — Writer-Arbeitsbereich für Abschnitte

- `sections` in `EntityPage.tsx` von kompakten Chapter-Cards zu einem fokussierten Manuskript-Editor ausgebaut.
- Jeder Schreibabschnitt besitzt jetzt ein frei benennbares Label (z. B. Kapitel, Szene, Dialog, Quest oder Lore), einen Titel und einen großen Fließtextbereich.
- Editor mit 65ch-Lesebreite, 16px Schreibtext, großzügiger Zeilenhöhe sowie Live-Wort- und Zeichenzähler.
- Bestehende Abschnittsdaten bleiben kompatibel; das JSON-Format wurde lediglich um das optionale Feld `label` erweitert.
- Read-View zeigt Abschnittstyp, Titel, Manuskripttext und Textstatistik als ruhige Writer-Card.
- Tablet/Mobile: reduzierte Panel-Paddings, responsive 20px-Titel, mindestens 320px Schreibfläche sowie gestapelte Footer-Aktionen mit Touch-tauglicher Anordnung.
- Gesamt-Build aktuell durch bereits vorhandene, nicht zu diesem Feature gehörende TypeScript-Fehler in mehreren Dateien blockiert; der neue Writer-Code erzeugt in der Build-Ausgabe keinen zusätzlichen Fehler.

## Update 2026-06-18 (Session Features 2–7)

1. **Timeline visuell** — Gruppierung jetzt nach Jahr (älteste zuerst, aufsteigend). Nur Entities MIT `timelineDate` in der Haupttimeline — Entities ohne Datum landen in einem separaten "Ohne Datum"-Abschnitt unten mit grauem Dot. Jahreszahlen in `var(--font-display)`, 20px fett.
2. **Relations Typen** — `StoredEntityLink` hat jetzt `relationType?: string`. `addEntityLink(entityId, targetId, relationType?)` speichert den Typ. RelationsPickerModal: neue Chip-Reihe "Beziehungstyp" (Verbündeter, Feind, Familie, Mentor, Rivale, Partner, Untergebener, Neutral). Der gewählte Typ wird beim Verknüpfen mitgegeben und als oranger Pill-Badge unter dem Entity-Namen in der Verknüpfungen-Sidebar angezeigt.
3. **Entity-Templates** — EntityModal zeigt im Create-Modus eine "Schnellstart-Vorlage" Chip-Reihe (typabhängig). Character: Held/Antagonist/Mentor/Sidekick/Händler; Location: Stadt/Festung/Verlies/Wald/Tempel; Faction, Creature, Item, Magic System, Story analog. Klick setzt `draft.tags` auf Template-Tags, Klick erneut leert wieder.
4. **Lese-Modus Notizen** — `Maximize2`-Button im NotesTab-Toolbar (sichtbar wenn Text vorhanden). Öffnet Fullscreen-Overlay: schwarzer Backdrop mit blur(6px), weißes Panel maxWidth 680px, Emoji + Titel (32px display font), Trennlinie, Text in `MentionText` (18px Instrument Serif, lineHeight 1.85), Wordcount + Schließen-Hinweis unten. Schließen via X-Button, Backdrop-Klick oder Escape.
5. **Hover-Vorschau Mentions** — Tooltip in `MentionText.tsx` verbessert: echtes Lucide-Icon (via `getCategoryIcon`) statt Buchstabe, Typ-Label darunter, max-width 280px, Tags als Chips, padding/border-radius poliert.
6. **Status-Farben Karten** — EntityCard hat jetzt `borderLeft: 3px solid {statusColor}`. Draft=orange, Active=grün, Concept=blau, Archived=grau. Andere Borders bleiben 1px normal.

## Update 2026-06-18 (Session Backlinks)

- **Backlinks-Panel "Erwähnt in"** — rechte Sidebar der EntityPage (OverviewTab), nach "Profil" und vor "Anhänge". `useMemo` iteriert alle Universe-Entities, parst deren Notizen via `parseNotes()` + `parseTextMentions()`, filtert auf Mentions der aktuellen Entity. Jede Quelle erscheint als klickbare Karte mit Typ-Icon und Typ-Farbe. Leerer Zustand: "Keine Erwähnungen in anderen Notizen."
- Import: `parseTextMentions` aus `entityMentions.ts`, `Quote`-Icon (Lucide), `useMemo` (React) — alle in EntityPage.tsx ergänzt.

## Update 2026-06-18 (Session LiveMentionEditor + UX-Fixes)

1. **LiveMentionEditor** — Mirror-Overlay-Technik: transparente Textarea (Input, sichtbarer Cursor via caretColor) + absolut positionierter Mirror-Div (dangerouslySetInnerHTML mit Mention-Spans, pointer-events: none). Mentions erscheinen sofort während des Tippens.
2. **NotesTab 2-Panel-Redesign** — 220px Notizliste links + Editor rechts. Neue Notizen oben (prepend statt append). Auto-Focus auf Titel-Input via useRef + useEffect + 50ms setTimeout. `key={selectedNote.id}` auf LiveMentionEditor + Titel-Input für sauberes Remount beim Notiz-Wechsel.
3. **SYSTEMTYP-Feld entfernt** — native `<select>` aus EntityModal entfernt, da KATEGORIE-Feld diese Info bereits abdeckt.
4. **Timeline-Datum** — neues `timelineDate?: string` Feld auf Entity. Supabase-Spalte `timeline_date date` vom User angelegt. MapEntityRow, Store, EntityModal alle angepasst. Timeline-Gruppierung nutzt `entity.timelineDate ?? entity.createdAt`.
5. **Übersicht-Section entfernt** — KATEGORIE/FELDER/LINKS Stat-Karten aus OverviewTab entfernt. Galerie jetzt an erster Stelle.
6. **Toast-Notifications** — Zustand-Store: `toast: { message, id } | null`, `showToast()` mit 3s Auto-Clear, `clearToast()`. AppLayout rendert fixierten Toast unten zentriert mit `toastIn` CSS-Animation. EntityModal zeigt Toast nach Create/Edit.
7. **"Notiz hinzufügen" Fix** — Button in Dashboard schaltet jetzt automatisch auf Grid-Ansicht um (handleSetViewMode('grid')) und zeigt Toast "Notizblock hinzugefügt". War vorher bei List/Gallery/Timeline unsichtbar ohne Feedback.

## Update 2026-06-19 (Session Grand Plan — 16 Features)

**Grand Plan komplett implementiert.** Neue Seiten, Views, Tools und Editor-Features — kein Rückfragen, alles in einem Durchgang.

### Neue Seiten & Routen
- **TrashPage** (`/trash`) — Papierkorb: gelöschte Entities 30 Tage aufbewahrt. Restore (createEntity + Supabase INSERT), Permanent Delete, "Papierkorb leeren". `src/lib/entityTrash.ts`.
- **ArchivePage** (`/archive`) — Liste aller Entities mit `status === 'archived'`. Restore als Draft mit Supabase-Update + logActivity.
- **StatsPage** (`/stats`) — 4 Stat-Karten (Gesamt/Aktiv/Archiviert/Tags), Status-Verteilung als Balken, 7-Tage-Aktivitätschart, Kategorien-Balken, Top-Tags-Cloud.

### Neue Sidebar-Navigation
- **Tools-Sektion** in Sidebar unter Library: Statistik (`/stats`), Archiv (`/archive`), Papierkorb (`/trash`).

### Neue Dashboard-Views (Dashboard.tsx)
- **Kanban-View** (5. Modus, KanbanSquare-Icon): 3 Spalten (Concept / Draft / Active), Entities als Karten mit Hover-Farbwechsel, Tag-Filter klickbar, Karten-Count-Badge pro Spalte.
- **Table-View** (6. Modus, Table2-Icon): Spreadsheet mit Spalten Name/Beschreibung/Tags/Status/Bearbeitet. Doppelklick auf Name oder Beschreibung → Inline-Edit mit Supabase-Persist.

### Skeleton Loader
- **SkeletonCard** — animierte Placeholder-Karten (`shimmer`-Animation) ersetzen LoadingPanel beim initialen Laden. 6 Karten im gleichen Grid-Layout.

### DashboardPrototype (Universe Overview)
- **Universe Banner** — "Banner"-Button in der Hero-Area; Bild-Upload als dataURL, gespeichert in `src/lib/universeBanner.ts` (localStorage pro Universe). Hero-Gradient wird über das Bild gelegt, Text wechselt zu weiß.
- **Activity Feed** — "Aktivitäten"-Sektion vor dem Kategorien-Grid. Liest letzte 8 Einträge aus `activityLog.ts`, zeigt Farbpunkt + Entity-Name + Aktion + Zeit-Ago.

### EntityPage — Notes Editor Improvements
- **AutoSave-Indikator** — Kleiner Status-Dot (6px) neben Wordcount: "Speichert…" (grau shimmer) → "Gespeichert" (grün) → verschwindet nach 2 Sek. `saveStatus: 'idle' | 'saving' | 'saved'` State in NotesTab.
- **Markdown-Toolbar** — Zeile mit 6 Buttons über dem LiveMentionEditor: **B** (Fett), *I* (Kursiv), H1, H2, — (Trennlinie), • (Liste). Fügen Markdown-Syntax an Cursor-Position ein via `editorTextareaRef`.
- **LiveMentionEditor** bekommt optionales `textareaRef?: RefObject<HTMLTextAreaElement | null>` Prop, damit externe Toolbar auf den textarea zugreifen kann.

### Neue Lib-Dateien
- `src/lib/activityLog.ts` — Ring-Buffer (max 100), logActivity(), getActivityForUniverse()
- `src/lib/entityTrash.ts` — moveToTrash(), restoreFromTrash(), permanentDeleteFromTrash(), emptyTrashForUniverse(), 30-Tage-Expiry
- `src/lib/universeBanner.ts` — getUniverseBanner(), setUniverseBanner(), removeUniverseBanner()

### Store-Updates (useWorldStore.ts)
- `createEntity` loggt Activity ('created')
- `trashEntityLocally(entityId)` — speichert Entity in Trash bevor sie aus State entfernt wird

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-19 (Session Dashboard UX-Polish)

6 Dashboard-Verbesserungen implementiert (step-by-step, kein Rückfragen):

1. **Reading-Mode Overlay (createPortal)** — Overlay war unsichtbar wegen `overflow: hidden` Ancestor. Fix: `createPortal(..., document.body)` — rendert direkt in `<body>`, umgeht jeden Stacking Context.
2. **Status-Border entfernt** — `borderLeft` auf EntityCard vollständig entfernt. Nur `boxShadow: var(--shadow-sm/md)` bleibt.
3. **Cover Placeholder** — Bei fehlendem Cover-Bild: großes Entity-Typ-Icon (80px, opacity 0.2) zentriert in der Cover-Fläche.
4. **Pinned/Favoriten** — Pin-Button (26px) im Cover-Bereich rechts unten, hover-only. `togglePinEntity()` im Store → `entityPins.ts` → localStorage `worldify-entity-pins`. "Angepinnt"-Sektion ganz oben im Grid.
5. **Card Quick-Actions** — Hover-Bar unterhalb des Links: Status-Pills (Draft/Active/Concept), Pencil (Umbenennen inline), Copy (Duplizieren), Trash (Löschen). Alle Aktionen stoppen Propagation zur Link-Navigation.
6. **Weitere Improvements:**
   - **Status-Verteilungsleiste**: Dünner 4px-Balken direkt unter dem Seiten-Titel; segmentiert nach Active/Draft/Concept (flex-Proportionen), nur bei `statusCounts.all > 0`.
   - **Sort-Indikator**: DashboardSelect bekommt `isModified?: boolean` — Sort-Dropdown hat primär-farbige Border + primär-Hintergrund wenn nicht auf Default ("Zuletzt bearbeitet").
   - **Inline Name-Edit (Grid)**: EntityCard hat `editingName` State + `commitNameEdit()`. Pencil-Button im Quick-Action-Bar → Name wird zu `<input>` (mit `stopPropagation` gegen Link-Navigation). Enter/Blur speichert in Supabase.
   - **Notiz-Karte Titel-UX**: Pencil-Icon (11px) erscheint neben Titel auf Hover (`opacity 0→1`), zeigt dass Klick = Bearbeiten.

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-18 (Session Pinned Entities)

- **Pinned/Favoriten**: Entities anpinnen — Pin-Button erscheint on Hover im Cover-Bereich einer EntityCard (unten rechts, 26px, wird orange wenn aktiv). Geklickt: `togglePinEntity()` im Store → `togglePin()` in `entityPins.ts` → localStorage `worldify-entity-pins`.
- Pinned Entities erscheinen als separate "Angepinnt"-Sektion (mit Pin-Icon, uppercase Label, Trennlinie) ganz oben im Grid, nur in Grid-Ansicht.
- `pinnedEntityIds` State im Store, wird bei Universe-Wechsel (`setActiveUniverse`) aus localStorage neu geladen.
- Neue Datei: `src/lib/entityPins.ts`

## Update 2026-06-18 (Session Wikipedia-Links Feature)

### Feature: Entity-Mentions — Wikipedia-Style Auto-Links in Text

Überall wo Text steht (Notes, Custom-Felder) werden Entity-Namen automatisch erkannt und als klickbare Links gerendert.

**Neue Dateien:**
- `src/lib/entityMentions.ts` — `parseTextMentions(text, entities, currentEntityId)` → `MentionSegment[]`
  - Longest-match-first (sortiert nach Namenslänge desc)
  - Word-Boundary-Regex (inkl. Deutsche Umlaute)
  - Mindestlänge 3 Zeichen, Selbst-Verlinkung ausgeschlossen
- `src/components/editor/MentionText.tsx` — Render-Komponente
  - Wandelt Segmente in JSX, Mentions als klickbare `<span>` mit Entity-Typ-Farbe + Underline
  - Hover-Tooltip: Entity-Name, Typ, Kurzbeschreibung (dark background, arrow)
  - Newline-Handling via Zeilengruppen

**Geänderte Dateien:**
- `EntityPage.tsx` — NoteWriter bekommt `noteViewMode: 'read' | 'edit'` State
  - Read-Mode: `<MentionText>` (default wenn Notiz Inhalt hat)
  - Edit-Mode: Textarea (wie vorher)
  - Toggle-Button in Toolbar (Pencil-Icon)
  - Klick auf Read-Text → wechselt zu Edit
  - entities + currentEntityId über NotesTab → NoteWriter weitergegeben
- `EntityPage.tsx` — `FieldValuePreview` textarea-Typ nutzt jetzt `<MentionText>`
- `EntityPage.tsx` — `CategoryFieldTab` bekommt entities + currentEntityId Props

**Pattern: View/Edit Split** — kein Rich-Text-Editor nötig, kein neues Dependency.
Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-19 (Session Tag-Autocomplete + Dashboard-Bilder)

1. **Tag-Autocomplete** — `src/components/ui/TagInput.tsx` (neue Komponente). Chip-Eingabe: vorhandene Tags erscheinen als goldene Pills mit × Button. Tippen zeigt Dropdown mit allen existierenden Tags des Universe (alphabetisch sortiert, dedupliziert). Enter/Komma fügt Tag hinzu, Backspace entfernt letzten Tag. Arrow-Keys navigieren das Dropdown, Escape schließt. `EntityModal.tsx`: `draft.tags: string` → `string[]`, `useMemo` für Tag-Suggestions aus allen Universe-Entities, TagInput ersetzt die alte Input-Zeile. Template-Chips setzen direkt `string[]`.

2. **Dashboard Entity-Bilder** — `DashboardPrototype.tsx`: `previewItems` in `categories` useMemo erweitert um `avatar: string | null` und `cover: string | null` (via `getEntityAvatar`/`getEntityCover` aus localStorage). CategoryCard zeigt echtes Bild (Avatar priorität vor Cover) als 32×32 `object-fit: cover` in den Vorschau-Zeilen — Fallback auf Icon-Box wenn kein Bild. "Zuletzt bearbeitet"-Strip zeigt ebenfalls Entity-Bild (24×24) statt Typ-Icon wenn vorhanden.

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-19 (Session Code-Review Bug-Fixes)

Code-Review (high effort) abgeschlossen. 4 Bugs gefunden und gefixt:

1. **[CRITICAL] Bulk-Delete fehlte Supabase-Delete-Call** (`Dashboard.tsx`) — `for (const id of selectedIds)` rief nur `deleteEntityLocal(id)` auf. Entities verschwanden lokal aber blieben in der DB → erschienen beim nächsten Reload. Fix: `supabase.from('entities').delete().eq('id', id)` in der Schleife ergänzt.

2. **[HIGH] TrashPage Restore fehlendes `timeline_date`** (`TrashPage.tsx`) — Supabase-Insert beim Wiederherstellen aus dem Papierkorb hatte `timeline_date` nicht im Payload. Entities verloren ihr Datum dauerhaft. Fix: `timeline_date: restored.timelineDate ?? null` hinzugefügt.

3. **[MEDIUM] `URL.revokeObjectURL` bei Upload-Fehler** (`EntityPage.tsx`) — Bei fehlgeschlagenem Upload (url = null) wurde das Blob-Preview-URL sofort revoked, während es noch als `src` im `<img>` verwendet wurde → kaputtes Bild. Fix: `revokeObjectURL` nur noch innerhalb des `if (url)` Blocks aufgerufen (für Cover, Avatar, Cover-im-Modal — alle 3 Stellen).

4. **[MEDIUM] `deleteEntityLocal` Side-Effects im Zustand-Set-Updater** (`useWorldStore.ts`) — `removeEntityCategorySlug`, `deleteEntityFieldValues`, `removeEntityReferencesFromFieldValues`, `removeEntityLinksForEntity` wurden innerhalb des `set()` Callbacks aufgerufen → in React Strict Mode feuern sie doppelt. Fix: Side-Effects vor den `set()`-Call verschoben.

Build: ✓ erwartet ohne TypeScript-Fehler

## Update 2026-06-19 (Session Sync-Audit + Storage-Fixes)

Gründlicher Sync-Audit aller Datenpfade. 4 Fixes, kritische architekturelle Lücken dokumentiert.

### Gefixte Bugs

1. **`handleSaveNotes` löschte `timelineDate`** — `updateEntityLocal` fehlte `timelineDate: entity.timelineDate`. Timeline-Datum verschwand nach Notiz-Speicherung bis Reload. Fix: Feld ergänzt.

2. **Entity-Reihenfolge nicht von Supabase geladen** — `entity_order` aus `universe_settings` wurde in `loadWorldData` ignoriert. Neue Funktion `restoreEntityOrderFromRemote` in `entityOrder.ts` + Aufruf in `loadWorldData`.

3. **`syncCoversFromStorage` überschrieb frisch hochgeladene Cover** — ersetzte kompletten Cache, frisch hochgeladene Bilder gingen verloren. Fix: Merge mit bestehendem Cache statt Komplettersatz.

4. **Demo-Daten-Flash beim Login** — Fake-Demo-Entities sichtbar während `loadWorldData` lief. Fix: `isLoadingWorld` Gate in AppLayout — zeigt Lade-Spinner statt Demo-Content.

### Kritische architekturelle Lücken (brauchen Supabase-Schema-Erweiterung)

Diese Daten sind 100% localStorage-only — verloren bei Browser-Löschen oder anderem Gerät:
- **Entity-Feldwerte** (`worldify-entity-field-values`) — KRITISCH
- **Entity-Kategorie-Zuordnungen** (`worldify-entity-category-assignments`) — KRITISCH
- **Entity-Links/Relationen** (`worldify-entity-links`) — KRITISCH
- Entity-Pins, Universe-Banner, Universe-Icon-URLs — Mittel

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-19 (Session Kategorie-Banner)

- Neue Datei `src/lib/categoryBanner.ts` — gleiche Struktur wie `universeBanner.ts`, keyed by `categorySlug`
- `Dashboard.tsx` (Kategorie-Seite): Header-Sektion zu Full-Bleed-Banner-Hero umgebaut
  - Negativmargins (`-32px` auf alle Seiten) für full-bleed
  - Ohne Bild: subtiler Farbgradient (Category-Color oder Primary-Light)
  - Mit Bild: dunkle Overlay-Gradient + Titel weiß + Text-Shadow
  - "Banner"-Button (absolut positioniert oben-rechts) öffnet File-Input
  - Titel + Einträge-Pill passen Farbe/Hintergrund ans Banner an
  - Status-Leiste und Action-Buttons unterhalb des Banners (normale Breite)
  - `useEffect([categorySlug])` lädt Banner neu bei Kategoriewechsel
- Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-19 (Session Akzentfarbe)

- Neue Datei `src/lib/accentColor.ts` — 8 kuratierte Presets (Orange, Amber, Smaragd, Teal, Sky, Indigo, Violett, Rosé) mit Light/Dark-Varianten
- `applyAccentPreset(id)` setzt `--color-primary`, `--color-primary-hover`, `--color-primary-light` via `document.documentElement.style.setProperty` → sofort wirksam in der gesamten App
- `loadAccentFromStorage()` wird beim App-Start in `AppLayout.tsx` aufgerufen (zusammen mit Dark-Mode-Init)
- Settings → Appearance: Farbkreis-Picker (8 Swatches), Checkmark auf aktivem Swatch, "Aktive Farbe" Preview-Leiste
- Theme-Toggle (Hell/Dunkel) re-appliziert den Accent damit Light/Dark-Varianten korrekt gesetzt werden
- Persistenz via `localStorage['worldify_accent']`
- Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-19 (Session Supabase-Schema-Migration + Sync-Implementierung)

SQL-Migration `002` erfolgreich ausgeführt. Neue Spalten/Tabellen:
- `entities.timeline_date TEXT` — (war schon im Code, fehlte im Schema)
- `entities.category_slug TEXT` — Kategorie-Zuordnung pro Entity
- `entities.field_values JSONB DEFAULT '{}'` — benutzerdefinierte Felder
- `universe_settings.entity_pins TEXT[] DEFAULT '{}'` — angepinnte Entities
- Neue Tabelle `entity_links` (id, user_id, universe_id, entity_id, target_id, relation_type, created_at) + RLS + Indexes

Sync-Implementierung abgeschlossen. Alle 4 kritischen localStorage-only Datenpfade jetzt gegen Supabase gesichert:

**Write-Through (Supabase bekommt alle Änderungen):**
- `EntityModal.tsx` Update: `category_slug` + `field_values` in `.update()` payload
- `EntityModal.tsx` Insert: `category_slug` + `field_values` in `.insert()` payload
- `EntityPage.tsx` `handleSaveFieldValue`: fire-and-forget `supabase.update({ field_values })`
- `EntityPage.tsx` `onLink`: fire-and-forget `supabase.from('entity_links').upsert(...)`
- `EntityPage.tsx` `onConfirm` (remove link): fire-and-forget `supabase.from('entity_links').delete(...)`
- `useWorldStore.ts` `togglePinEntity`: fire-and-forget `syncEntityPinsToSupabase`

**Read-From-Supabase (loadWorldData bevölkert localStorage):**
- Entity-Query selektiert jetzt `category_slug, field_values`
- Nach dem Entity-Load: `setEntityCategorySlug` + `saveEntityFieldValues` für jeden Row mit Daten
- Neuer Query: `entity_links` alle für den User → `loadEntityLinksFromRemote` in entityLinks.ts
- Entity-Pins: aus `universe_settings.entity_pins` → localStorage

**Neue/geänderte Dateien:**
- `src/lib/supabaseSettings.ts` — `UniverseSettings.entity_pins`, `syncEntityPinsToSupabase()`
- `src/lib/entityLinks.ts` — `loadEntityLinksFromRemote()` für Bulk-Import
- `src/store/useWorldStore.ts` — Imports + loadWorldData + togglePinEntity

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-20 (Session Supabase Storage + UX-Polish)

### Supabase Storage — Universe Icons & Trash

- **`worldify-images` Bucket** — User hat Bucket via Supabase Dashboard angelegt (Public: ON). RLS-Policies existierten bereits (42710 beim Re-Erstellen → kein Problem).
- **DB-Migrationen** — 3 separate ALTER TABLE-Statements (deadlock bei gebündeltem Run → einzeln ausgeführt):
  - `universe_settings ADD COLUMN IF NOT EXISTS entity_pins TEXT[] DEFAULT '{}'`
  - `universe_settings ADD COLUMN IF NOT EXISTS category_banners JSONB DEFAULT '{}'`
  - `universes ADD COLUMN IF NOT EXISTS banner_url TEXT` + `icon_url TEXT`
- **`src/lib/imageUtils.ts`** (NEU) — Client-seitige JPEG-Kompression mit Binary Search (0.1–0.92, 6 Iterationen), MAX_BYTES = 777KB, MAX_DIMENSION = 1920px. Wird in entityMedia.ts, categoryBanner.ts, universeBanner.ts, universeMeta.ts, CategoryModal.tsx genutzt.
- **`src/lib/universeMeta.ts`** — `uploadUniverseIcon(userId, universeId, file)`: Komprimierung → Supabase Storage `{userId}/icons/universe-{universeId}` → `universes.icon_url` in DB schreiben. `loadUniverseIconsFromDB()` bevölkert localStorage aus DB-Rows.
- **`src/lib/entityTrash.ts`** — `moveToTrash` + Supabase-Upsert in `entity_trash` mit 30-Tage-`expires_at`. Restore/Delete/Empty feuern fire-and-forget Supabase-Deletes. `syncTrashFromSupabase(userId)` lädt Papierkorb beim Login.
- **`src/store/useWorldStore.ts`** — Universe-Query selektiert `banner_url, icon_url`. `loadUniverseIconsFromDB` nach Ladung. `trashEntityLocally` übergibt User-ID. `syncTrashFromSupabase` nach Entity-Load.
- **`src/components/world/UniverseModal.tsx`** — `URL.createObjectURL` für sofortige Preview, `uploadUniverseIcon` in `handleSubmit` vor `loadWorldData()`.

### Banner Drag-to-Reposition

- **`src/lib/bannerPosition.ts`** (NEU) — localStorage-Speicher für Banner-Fokuspunkte (0–100, Universe + Kategorie, getrennte Keys).
- **`src/hooks/useBannerDrag.ts`** (NEU) — Custom Hook: Maus-Down → window mousemove/mouseup → `position` State aktualisiert → mouseup → `onSave` wird aufgerufen. Drag-Richtung: nach unten = Position sinkt (Bild wandert nach unten, zeigt oben mehr).
- **`Dashboard.tsx`** + **`DashboardPrototype.tsx`** — Banner-Div nutzt `useBannerDrag`; `background-position: center ${Math.round(position)}%`; GripVertical-Overlay mit "Bild verschieben" / "Loslassen zum Speichern" erscheint bei Hover/Drag; `stopPropagation` auf Upload-Button-Container.

### Sidebar-Verbesserungen

- **Divider Label + Linie in einer Reihe** — `<span>` (flexShrink:0) + `<div style={{flex:1}}>` in `display:flex alignItems:center gap:6` — kein gestapeltes Layout mehr.
- **Tools unten angeheftet** — Tools-Sektion aus dem scrollbaren `<nav>` herausgenommen, als separates `<div>` mit `borderTop` direkt darunter (vor dem Kategorie-Footer).
- **Tools kollabierbar** — `toolsOpen` State (default: false). "TOOLS"-Label ist jetzt `<button>` mit ChevronRight/ChevronDown. Items rendern nur wenn `toolsOpen === true` (im collapsed Sidebar-Modus immer sichtbar).

Build: ✓ 0 TypeScript-Fehler

---

## Update 2026-06-20 (Session 2 — UX-Polish P2 + P3.1 Mobile)

### UX-Polish P2 (abgeschlossen in Session 1)
- **Divider Delete-Confirmation** — Inline "Löschen? 🗑 ✕" in Sidebar.tsx vor echtem Löschen
- **Content/Notes entfernt** — Raw-JSON-Problem; Feld komplett aus EntityModal.tsx entfernt
- **Quick Edit Profil-Panel** — Status-Dropdown + Tag-Chips inline in EntityPage.tsx OverviewTab
- **Dark Mode Buttons** — rgba-Hardcodes → var(--color-surface) + var(--color-border-strong) in Dashboard + DashboardPrototype
- **Timeline Month-Grouping** — Monat+Jahr (z.B. "April 2026"), exaktes Datum pro Entity
- **Kanban Tag-Grouping** — "Nach Status" / "Nach Tags" Toggle, dynamische Tag-Spalten
- **Systemtyp → Timeline-Datum** — Systemtyp aus Profil entfernt, Timeline-Datum eingebaut
- **View Toggle Active** — Aktive Ansicht: dark inverted (var(--color-text) bg + var(--color-bg) text)

### P3.1 Mobile-Polish

- **Kanban — Status-Modus** (`src/pages/Dashboard.tsx` `KanbanView`):
  - Grid von `repeat(3, 1fr)` → `repeat(3, minmax(180px, 1fr))` mit `minWidth: 480`
  - Wrapper-`<div>` mit `overflowX: 'auto'` → Kanban scrollt horizontal auf kleinen Screens
- **Kanban — Tag-Modus** (`src/pages/Dashboard.tsx` `KanbanView`):
  - `overflowX: 'auto'` war am Grid selbst (funktioniert nicht) → auf Wrapper-Div verlagert
- **TableView** (`src/pages/Dashboard.tsx` `TableView`):
  - Äußerer Wrapper: `overflowX: 'auto'` + `borderRadius` + `border`
  - Inneres Div: `minWidth: 560` damit Spalten bei Scroll lesbar bleiben
- **GraphPage** (`src/pages/GraphPage.tsx`):
  - `touchRef` — neuer `useRef` für Touch-State (1-Finger-Pan, 2-Finger-Pinch)
  - `handleTouchStart` — speichert Ausgangsposition + Transform in `touchRef`
  - `handleTouchMove` — 1 Finger: Pan via SVG-Koordinaten; 2 Finger: Pinch-Zoom mit Mittelpunkt
  - `handleTouchEnd` — löscht `touchRef` bei 0 verbleibenden Touches
  - SVG bekommt `touchAction: 'none'` + `onTouchStart/Move/End` Handler

Build: ✓ 0 TypeScript-Fehler

### P3.2 Globale Suche (fertig)
- `SearchPanel.tsx`: `activeUniverseId`-Filter entfernt — sucht jetzt über ALLE Universen
- Aktives Universum wird priorisiert (sort), andere erscheinen leicht gedimmt (opacity 0.75)
- Bei mehreren Universen: Universe-Name-Badge pro Result, Placeholder "Alle Universen durchsuchen…"
- `multiUniverse = universes.length > 1` steuert ob Universe-Infos angezeigt werden

### P3.3 Entity als PDF (fertig)
- `EntityPage.tsx`: `handleExportPDF()` — öffnet neues Fenster + `window.print()` (Browser PDF-Dialog)
- Rendert: Name, Typ, Status, Tags, Timeline-Datum, Kurzbeschreibung, alle Notizen, Kategorie-Felder, Verknüpfungen
- Notiz-Text: `##`/`#` → `<h3>`/`<h2>`, Leerzeilen → `<br>`, Rest → `<p>`
- Print-optimiertes CSS: A4, page-break-inside: avoid auf Note-Blöcken, saubere Typografie
- Button in EntityPage Hero-Toolbar: Edit · Kopie · **PDF** · Delete
- `FileDown`-Icon aus Lucide, `parseNotes` + `getEntityLinks` + `entityTypeMeta` + `statusMeta` genutzt

Build: ✓ 0 TypeScript-Fehler

### P3 komplett abgeschlossen ✓

---

## Update 2026-06-21 — Cover-Bild Reposition

**Flow:** Bild hochladen → automatisch Reposition-Modus → ziehen → "Done" → gespeichert

**`src/lib/bannerPosition.ts`**:
- `getEntityCoverPosition(entityId)` + `saveEntityCoverPosition(entityId, pos)` hinzugefügt (Key: `worldify-entity-cover-positions`)

**`src/pages/EntityPage.tsx`**:
- Import: `getEntityCoverPosition`, `saveEntityCoverPosition`, `useBannerDrag`, `GripVertical`
- State: `repositionMode` (bool) + `savedCoverPosition` (number, aus localStorage)
- Hook: `useBannerDrag(savedCoverPosition, () => {})` — `onSave` ist no-op; Position wird erst bei "Done" persistiert
- Hero `backgroundPosition`: `center ${coverPosition}%` statt hartkodiertem `center`
- Hero `cursor`: `grab`/`grabbing` im Reposition-Modus
- Nach Cover-Upload: `setRepositionMode(true)` automatisch
- Overlay-Buttons im Reposition-Modus: "Ziehen zum Verschieben" (hint) + "✓ Done" (primary)
- Overlay-Buttons normal: "Ändern" · "Verschieben" · "Entfernen"
- Edit/Kopie/PDF/Delete ausgeblendet während Reposition-Modus
- Entity-Navigation: `setSavedCoverPosition` + `setRepositionMode(false)` reset im `useEffect([id])`

Build: ✓ 0 TypeScript-Fehler

---

## Update 2026-06-21 — 5 Features (H/E/C/A/B)

### H: Entity-Seite auf Mobile (`EntityPage.tsx` — `OverviewTab`)
- `useWindowWidth` importiert aus `../hooks/useWindowWidth`
- `const windowWidth = useWindowWidth(); const isMobile = windowWidth < 640` in `OverviewTab`
- Grid: `gridTemplateColumns: isMobile ? '1fr' : '1fr 280px'` — stapelt auf Mobile

### E: ⌘K Typ-Filter (`SearchPanel.tsx`)
- `activeTypeFilter: EntityType | null` State
- `baseResults` (ungefiltert nach Typ) → `availableTypes` daraus berechnen
- `results` = baseResults gefiltert nach `activeTypeFilter` (wenn gesetzt)
- Type-Filter-Pills zwischen Input und Results — nur sichtbar wenn `availableTypes.length > 1`
- "Alle"-Button + je ein Pill pro Typ (farbig wenn aktiv), Reset bei Panel-Open

### C: Cover-Position → Supabase (`mockWorld.ts` + `EntityPage.tsx`)
- `DatabaseEntityRow.cover_position?: number | null` hinzugefügt
- `Entity.coverPosition?: number` hinzugefügt
- `mapEntityRow()`: `coverPosition: row.cover_position ?? undefined`
- "Done"-Click: `supabase.from('entities').update({ cover_position: pos }).eq('id', entity.id)` fire-and-forget
- `useEffect([id])`: liest `entity?.coverPosition ?? getEntityCoverPosition(id)` (DB-Wert bevorzugt)
- **Migration ausgeführt ✓** (2026-06-21): `ALTER TABLE entities ADD COLUMN IF NOT EXISTS cover_position SMALLINT DEFAULT 50;`

### A: Table View Sortierung (`Dashboard.tsx` — `TableView`)
- `sortField: 'name' | 'status' | 'updatedAt' | null` + `sortDir: 'asc' | 'desc'` States
- `handleSort(field)`: togglet dir wenn gleiches Feld, setzt 'asc' bei neuem Feld
- `sortedEntities`: Kopie sortiert mit String-Vergleich
- Spalten-Header Name/Status/Bearbeitet: `cursor: pointer`, `onClick: handleSort`, `↑`/`↓`/`↕`-Indikator

### B: Notizen Markdown-Rendering (`EntityPage.tsx`)
- `MentionChip` aus `MentionText.tsx` exportiert (war `function`, jetzt `export function`)
- Neue Helfer-Funktionen vor `NotesTab`:
  - `renderInlineMarkdown(text, keyPrefix)` — `**bold**` → `<strong>`, `*italic*` → `<em>` via Regex
  - `renderLineContent(line, entities, currentEntityId, lineKey)` — `parseTextMentions` + inline Markdown pro Segment
  - `renderMarkdownNote(text, entities, currentEntityId)` — Block-Parser: `## ` → `<h3>`, `# ` → `<h2>`, `- ` → `<ul><li>`, leer → Spacer, Rest → `<p>`
- Reading-Mode: `<MentionText>` ersetzt durch `renderMarkdownNote(selectedNote.text, entities ?? [], currentEntityId)`

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-21 — Status-Toggle + Interaktive Kategorie-Felder

- **Status-Toggle aus Hero entfernt** — war doppelt (Profil-Panel hat bereits Status-Dropdown). Zeile komplett entfernt aus `EntityPage.tsx`.
- **CategoryFieldTab vollständig interaktiv** (`EntityPage.tsx`):
  - `tasks` / `sections`: Listeneinträge hinzufügen, inline bearbeiten (Pencil-Icon), löschen (Trash2 + `window.confirm()`)
  - `textarea`: direkte Textarea-Bearbeitung, speichert onBlur
  - `text`: direktes Input-Feld, speichert onBlur
  - `number`: direktes Number-Input, speichert onBlur
  - `participants`: bleibt read-only (FieldValuePreview), Linking läuft über Relations-Modal
  - Daten-Format unverändert: newline-separierte Strings für tasks/sections
  - `onSave` Prop: feuert `handleSaveFieldValue(fieldId, value)` → Supabase + localStorage sync

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-21 — Mobile Polish + Bidirektionale Relations

### Reading Mode Mobile
- Body scroll lock via `useEffect` wenn `readingMode || focusMode` — `document.body.style.overflow = 'hidden'`
- Mobile: Full-Screen-Sheet statt Desktop-Overlay — Header (Icon + Titel + X), scrollbarer Content-Bereich mit `-webkit-overflow-scrolling: touch` + `overscrollBehavior: contain`, Prev/Next-Footer (44px Touch-Targets)

### Dashboard Banner-Bleed Fix
- `Dashboard.tsx` + `DashboardPrototype.tsx`: `marginTop/Left/Right` jetzt `isMobile ? -16 : -32`

### Bidirektionale Verknüpfungen
- `entityLinks.ts`: neue Funktion `getIncomingEntityLinks(targetId)`
- `EntityPage.tsx` `OverviewTab`: `incomingLinkedEntities` useMemo, zeigt "Verknüpft von"-Gruppe (read-only)

### GraphPage Mobile
- Header kompakter, Node-Radius größer (22/28 statt 17/22), Footer-Hint angepasst, Legend Dots-only

### Search Autocomplete (Ghost Text)
- `SearchPanel.tsx`: `suggestion` useMemo — findet erstes Entity dessen Name mit Query beginnt (prefix-match), priorisiert aktives Universe
- `ghostText = suggestion.slice(query.length)` — nur der fehlende Suffix
- CSS Overlay-Technik: transparenter `<span>{query}</span>` + grauer `<span>{ghostText}</span>` absolut überlagert
- Tab / → (am Ende des Inputs) akzeptiert den Vorschlag → `setQuery(suggestion)`
- Footer-Hint: `{ key: 'Tab', label: 'Autocomplete' }` ergänzt

### parseNotes Null-Safety
- `entity.content` aus Supabase kann `null` sein für neue Entities
- `parseNotes(content: string | null | undefined)` — Guard `if (!content?.trim()) return []`
- Normalisiert alle Note-Felder: `title/text/icon` auf leeren String falls undefined
- `QuickNotesList` + `NotesTab` Props: `content: string | null | undefined`
- `wordCount`: `selectedNote?.text?.trim()` (doppeltes Optional Chaining)
- Filter: `n.title?.trim() || n.text?.trim()` (optional chaining statt direktem Zugriff)

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-21 — Aufgaben-Checkboxen + Abschnitte als Chapters

### Aufgaben (tasks)
- Checkboxen klickbar: Klick auf Checkbox → `[x]` Prefix (erledigt), erneut → offen
- "Erledigte archivieren"-Button in Tab-Header: `[x]`-Einträge → `[~]`-Einträge
- Collapsible "Erledigt (N)"-Sektion am unteren Rand: zeigt archivierte Tasks, Wiederherstellen möglich
- Task-Format: plain text = offen, `[x] text` = erledigt, `[~] text` = archiviert (newline-separiert)

### Abschnitte → Chapters (sections)
- Datenformat: JSON-Array `[{"title":"...","body":"..."}]` statt plain text
- Legacy-Migration: alte Zeilen → `{title:'', body: text}` automatisch
- `parseSections(value)` / `serializeSections(items)` — Modul-Level Helfer in `EntityPage.tsx`
- Chapter-Card UI: Titel-Header (bold) + Body-Text, edit/delete buttons
- Bearbeitungsmode: Titel-Input (oben, fett) + Body-Textarea (unten), Speichern/Abbrechen
- Neuer Abschnitt: dashed-border Karte, Titel + Body eingeben → "Hinzufügen"

### Overview-Panel Fixes
- `StructuredPreviewItem` tasks: `[~]` → hidden (null), `[x]` → Strikethrough + ausgefüllte Checkbox
- `FieldValuePreview` sections: liest JSON via `parseSections()` → Chapter-Cards mit Titel + Body

Build: ✓ 0 TypeScript-Fehler

## Update 2026-06-21 — Neue Dashboard-Notizen oben

- `addDashboardNoteContainer` fügt neue Notizcontainer jetzt am Anfang der persistenten Containerliste ein statt am Ende.
- Kategorie-Notizen werden in Grid- und Listenansicht vor den Entity-Einträgen gerendert.
- Mehrere Notizen erscheinen mit der neuesten zuerst.
- Geänderte Dateien mit oxlint geprüft; nur bereits vorhandene Warnungen in `Dashboard.tsx`, keine neuen Fehler. Dev-Server: HTTP 200.

### Ergänzung — Notizhöhe im Grid
- Das Kategorie-Grid nutzt jetzt `alignItems: stretch`.
- `CategoryNoteCard` füllt mit `height: 100%` die jeweilige Grid-Zeile und ist dadurch exakt so hoch wie die benachbarte Entity-Card; `minHeight: 268px` schützt die Listenansicht.
- Oxlint (`--quiet`) ohne neue Fehler; Dev-Server HTTP 200.

## Update 2026-06-21 — Individuelle Icons für Kategorie-Felder

- `CategoryField` besitzt jetzt optional `icon?: string`; Speicherung läuft automatisch mit den bestehenden `library_items` durch localStorage + Supabase.
- Der vorhandene Kategorie-Icon-Picker wurde auf jede Feldzeile im Kategorie-Erstellen/Bearbeiten-Modal übertragen.
- Neue Felder erhalten typgerechte Defaults: Text, Textbereich, Zahl, Teilnehmer, Abschnitte und Aufgaben.
- Der Picker öffnet bei Feldzeilen nach oben, damit er im scrollbaren Modal und auf kleineren Displays nicht abgeschnitten wird.
- Gewählte Icons erscheinen in Entity-Tabs, Overview-Feldcontainern, Teilnehmer-/Zahl-Sidebar, interaktivem Feldeditor und Dashboard-Zähler-Pills.
- Zusätzliche Lucide-Icons in `categoryIcons.ts`; weiterhin `strokeWidth={1.5}` und Design-Token-konform.
- React-Best-Practices-Pass: zentrale Typen statt lokaler Duplikate, semantische Buttons, ARIA-Menüstatus, Escape-Schließen, keine neuen Hook-/Lint-/TypeScript-Probleme.
- Feld-Icon-Picker anschließend an den Kategorie-Picker angeglichen: keine eigene Max-Höhe und keine interne Scrollbar; alle Icons werden direkt im vollständigen Grid gezeigt.

## Update 2026-06-21 — Kategorien-/Feld-Icon-Sync gehärtet

- Kategorie-Erstellen und -Bearbeiten wartet jetzt auf die bestätigte Supabase-Speicherung; Modal schließt nur bei Erfolg und zeigt währenddessen `Synchronisiert…`.
- `library_items` wird nicht mehr blind als veraltetes Komplettarray überschrieben: neue CAS-Mutationen (`upsert`, `remove`, `reorder`, `replace`) arbeiten elementweise gegen `universe_settings.updated_at` und wiederholen Konflikte bis zu 3-mal.
- Feld-Icons bleiben als Teil von `CategoryField.icon` im JSONB `library_items` erhalten; Remote-Antwort wird nach jedem Write als autoritative lokale Version übernommen.
- Add, Update, Divider, Delete und Reorder nutzen konfliktgeschützte Mutationen; Import bleibt absichtlich `replace`.
- Remote-Laden nutzt nun reines Local-Cache-Hydrating und schreibt geladene Daten nicht versehentlich wieder zurück.
- AppLayout synchronisiert `library_items` über Supabase Realtime, Fenster-Fokus, Visibility-Change und 30-Sekunden-Fallback; alle Subscriptions/Timer werden sauber entfernt.
- Supabase/Postgres-Best-Practices: kurze CAS-Updates, `user_id + universe_id` Ownership-Filter, bestätigte `RETURNING`-Daten und Fehler-Toasts.
- Verifikation: geänderte Dateien oxlint-clean, keine neuen TypeScript-Fehler, Dev-Server HTTP 200. Gesamt-Build bleibt an den bereits dokumentierten Altfehlern blockiert.
## Update 2026-06-21 - Daten-Safety-Pass fuer Restpfade

- `universe_settings` nutzt jetzt dieselbe bestaetigte CAS-Strategie nicht mehr nur fuer `library_items`, sondern auch fuer `dashboard_containers`, `entity_order` und `entity_pins`.
- Neue lokale Cache-Helfer fuer Dashboard-Container, Entity-Reihenfolge und Pins trennen bewusst zwischen reinem Hydraten aus Supabase und echtem Remote-Speichern; geladene Daten feuern dadurch keine versehentlichen Writes mehr aus.
- Zustand-Store rollt optimistische Aenderungen bei Pins, Dashboard-Containern, Reihenfolge und Library-Reorder/Delete zurueck, wenn Supabase den Write nicht bestaetigt; Nutzer bekommt dabei einen Toast statt stiller Divergenz.
- `EntityPage` speichert Feldwerte jetzt mit bestaetigtem `select()`-Roundtrip und setzt lokalen Cache bei Fehlern wieder zurueck.
- Verknuepfungen (`entity_links`) werden beim Hinzufuegen/Entfernen nicht mehr fire-and-forget geschrieben; Fehler stellen die lokale Relation wieder her.
- "Kopie von Entity" erzeugt keine lokalen Ghost-Entities mehr: Insert passiert zuerst in Supabase, danach erst Navigation/Hydration.
- Cover-Position speichert nicht mehr blind im Hintergrund; bei fehlgeschlagenem Save wird die vorherige Position restauriert.
- Verifikation: `cmd /c npx oxlint --quiet` fuer die geaenderten Dateien gruen. Projektweiter Build laeuft weiterhin nicht komplett durch, aber die verbleibenden TypeScript-Fehler liegen in bereits bekannten Altbaustellen ausserhalb dieses Safety-Passes.

## Update 2026-06-21 - Gesamt-Build wieder gruen

- Bekannte Altfehler in `EntityModal.tsx`, `TopBar.tsx`, `AppLayout.tsx`, `Dashboard.tsx`, `EntityPage.tsx`, `StatsPage.tsx` und `TrashPage.tsx` bereinigt.
- Build-Blocker waren vor allem ungenutzte Altvariablen/-props, fehlende Typ-Narrowings bei `SidebarLibraryItem`, ein veralteter `DraftEntity`-Aufruf sowie ein paar React/TypeScript-Kanten im Notiz-Renderer.
- React-Best-Practices-Skill bewusst genutzt: nur minimale, gezielte Korrekturen statt groessem Refactor.
- Verifikation: `cmd /c npm run build` jetzt erfolgreich. `cmd /c npx oxlint --quiet` fuer die geaenderten Dateien ebenfalls gruen.
- Offener technischer Hinweis: Vite meldet weiterhin einen grossen Haupt-Chunk (`dist/assets/index-*.js` > 500 kB). Das ist kein Build-Fehler mehr, aber ein sinnvoller naechster Performance-Pass.

## Update 2026-06-21 - Safety, Sync und Performance auf Endstand gezogen

- **Daten-Sicherheit / Sync-Robustheit** weiter gehaertet:
  - `TrashPage` nutzt jetzt nur noch bestaetigte async-Restore/Delete/Empty-Flows gegen Supabase statt lokaler Fire-and-Forget-Aufrufe.
  - Restore rollt den Papierkorb bei fehlgeschlagenem Re-Insert best-effort zurueck, damit kein stiller Datenverlust entsteht.
  - `Dashboard.tsx` Bulk-Delete, Bulk-Status, Quick-Name-Edit, Quick-Duplicate, Quick-Delete, Quick-Status, Listen-Edit und Tabellen-Inline-Edit warten jetzt auf bestaetigte Supabase-Writes bzw. rollen lokal bei Fehlern zurueck.
  - `universeMeta.ts` wurde auf denselben robusten Medienpfad wie Banner/Cover umgestellt: versionierte Storage-Keys, bestaetigte DB-Writes, autoritativer Cache aus Supabase und Cleanup alter Dateien.
  - `trashEntityLocally` stellt geloeschte Entities bei fehlgeschlagenem Trash-Sync wieder lokal her, inklusive Kategorie, Feldwerten und ausgehenden Verknuepfungen.
- **Verifikation**: `cmd /c npx oxlint --quiet` fuer alle geaenderten Safety-Dateien gruen, `cmd /c npm run build` erneut erfolgreich.

## Update 2026-06-21 - Chunk-Splitting Pass abgeschlossen

- `src/App.tsx` wurde auf `React.lazy` + `Suspense` fuer `AppLayout` und alle Routen umgestellt.
- Der vorherige Hauptchunk (`dist/assets/index-*.js` ~550 kB) ist verschwunden; stattdessen entstehen klar getrennte Route-Chunks fuer Dashboard, EntityPage, AppLayout, Graph, Trash, Stats usw.
- Neuer Build-Stand nach dem Pass:
  - `dist/assets/index-*.js` ~81 kB
  - `Dashboard` ~69 kB
  - `EntityPage` ~115 kB
  - `AppLayout` ~87 kB
  - `supabase` bleibt als eigener Vendor-Chunk ~201 kB
- Ergebnis: deutlich besserer Initial-Load und saubere Grundlage fuer Vercel-Deployments.

## Update 2026-06-21 - Mobile/Tablet-QA + Vercel-Ready

- Playwright lokal nachinstalliert und fuer echte Device-Screenshots vorbereitet.
- Browser-QA war ohne eingeloggerten Storage-State nur auf die Login-Seite sofort voll verifizierbar; Mobile-Login rendert sauber ohne offensichtliche Overflow- oder Touch-Target-Probleme.
- Fuer App-Inhalte hinter Auth lief der Pass als kombinierter Screenshot-/Code-Audit weiter, weil der Headless-Context keine bestehende eingeloggte Session aus dem In-App-Browser uebernehmen konnte.
- `vercel.json` hinzugefuegt mit SPA-Rewrite auf `index.html`, damit Deep Links wie `/entities/...`, `/trash`, `/graph` oder Custom-Kategorie-Routen auf Vercel nicht in 404s laufen.

## Update 2026-06-21 - Release-Audit abgeschlossen

- Vollaudit ueber Persistenz, Sync, Import/Export, Render-Sicherheit und Deploy-Risiken gemacht.
- Wichtigste Befunde vor dem Fix:
  - Backups waren **nicht vollstaendig genug** fuer echten Reimport (Feldwerte, Kategorie-Zuordnung, Verknuepfungen, Medien-URLs, Positionen, Universe-Metadaten fehlten bzw. gingen verloren).
  - Import konnte bei Fehlern ein **halbfertiges Universe** hinterlassen.
  - Cross-Browser-Sync in `AppLayout` war stark fuer `library_items`, aber nicht gleichwertig fuer **Dashboard-Container, Reihenfolgen, Pins und Kategorie-Banner**.
  - `EntityModal` hatte noch einen unnötigen lokalen Create-Pfad vor dem finalen Reload; funktional meist okay, aber nicht sauber release-ready.
  - `LiveMentionEditor` nutzte weiter `dangerouslySetInnerHTML`; Text war bereits escaped, aber das `data-entity-id` Attribut wurde zusaetzlich gehaertet.

### Umgesetzte Release-Fixes

- **Backup / Restore**
  - `src/lib/exportWorldData.ts` exportiert jetzt Backup-Version `2.0`.
  - Export enthaelt jetzt: Universe-Metadaten, Kategorien/Felder, Dashboard-Container, Entity-Reihenfolge, Pins, Kategorie-Banner, Banner-/Cover-Positionen, Entities mit Feldwerten/Kategorie-Zuordnung/Timeline/Medien-URLs sowie Entity-Verknuepfungen.
  - `src/lib/importWorldData.ts` importiert diese Daten jetzt strukturiert und abwaertskompatibel zu alten Backups.
  - Import mappt alte Entity-IDs sauber auf neue IDs, damit Reihenfolgen, Pins und Verknuepfungen korrekt rekonstruiert werden.
  - Bei Import-Fehlern wird das neu angelegte Universe jetzt per Rollback wieder geloescht.

- **Sync-Haertung**
  - `src/components/layout/AppLayout.tsx` synchronisiert jetzt nicht mehr nur `library_items`, sondern auch `dashboard_containers`, `entity_order`, `entity_pins` und `category_banners` ueber Realtime + Focus/Visibility-Refresh.
  - Remote-Werte werden dabei auch lokal in die jeweiligen Scope-Caches zurueckgeschrieben.

- **Entity-Erstellung / Render-Sicherheit**
  - `src/components/entities/EntityModal.tsx` erzeugt keine zusaetzliche lokale Temp-Entity mehr vor dem finalen `loadWorldData()`.
  - `src/components/editor/LiveMentionEditor.tsx` escaped jetzt auch Attributwerte fuer Mention-Spans explizit.

### Verifikation

- `cmd /c npx oxlint --quiet` fuer die geaenderten Release-Dateien gruen.
- `cmd /c npm run build` nach dem Audit erneut erfolgreich.
- Ergebnis: App ist jetzt in einem echten **release-ready** Zustand fuer den aktuellen Scope (private Web-App mit Supabase + Vercel).

## Update 2026-06-21 - Auto-Backup UX erweitert

- Der Data-Tab in `SettingsModal` hat jetzt einen echten Auto-Backup-Bereich mit:
  - festem Backup-Ordner via File System Access API,
  - Intervall-Auswahl `6h / 12h / 24h`,
  - manuellem Button **"Jetzt testen"** fuer einen sofortigen rotierenden Auto-Backup-Write.
- Auto-Backups bleiben weiterhin absichtlich rotierend statt spammy: 4 feste Slots pro Universe werden ueberschrieben.
- Der manuelle Test nutzt denselben echten Backup-Pfad wie die automatische Ausfuehrung und schreibt sofort ein ZIP in den verbundenen Ordner.
- `backupAutomation.ts` akzeptiert Intervall-Werte jetzt sauber als `6 | 12 | 24` und persisted sie lokal.
- Verifikation: `cmd /c npx oxlint --quiet src\\lib\\backupAutomation.ts src\\components\\settings\\SettingsModal.tsx` gruen, `cmd /c npm run build` gruen.

## Update 2026-06-21 - Trash-/Persistenz-Hardening finalisiert

- Normale Delete-Flows gehen jetzt konsistent zuerst in den Papierkorb und erst danach aus `entities` raus.
- `trashEntityLocally` ist von fire-and-forget auf einen bestaetigten async-Flow umgestellt:
  - erst `moveToTrash(...)`,
  - dann Delete in Supabase,
  - bei Fehler Rollback des Trash-Eintrags via `restoreFromTrash(...)`.
- Entity-Detailseite loescht nicht mehr hart, sondern verschiebt sauber in den Papierkorb.
- Dashboard Quick Delete und Bulk Delete verschieben ebenfalls in den Papierkorb statt direkt dauerhaft zu loeschen.
- Texte im Confirm-Flow wurden entsprechend angepasst, damit die UX zur echten Datenlogik passt.
- Verifikation: `cmd /c npx oxlint --quiet src\\store\\useWorldStore.ts src\\pages\\Dashboard.tsx src\\pages\\EntityPage.tsx` gruen, `cmd /c npm run build` gruen.

## Update 2026-06-21 - Finaler 100%-Pass

- Universe-Delete in der Sidebar ist weiter gehaertet:
  - letztes verbleibendes Universe kann nicht geloescht werden,
  - Delete nutzt Ownership-Filter ueber `user_id`,
  - kein lokales optimistisches Entfernen mehr vor bestaetigtem Supabase-Delete,
  - Erfolg und Fehler werden sauber per Toast rueckgemeldet.
- Die bisherigen stillen Parser-Fallbacks in `EntityPage.tsx` wurden als absichtliche Legacy-Fallbacks dokumentiert:
  - Notes JSON -> Fallback auf Plaintext-Notiz
  - Sections JSON -> Fallback auf newline-basierte Abschnitte
- Verifikation: `cmd /c npx oxlint --quiet src\\components\\layout\\Sidebar.tsx src\\pages\\EntityPage.tsx` gruen, `cmd /c npm run build` gruen.

## Update 2026-06-21 - Zentrales Confirm-Dialog-System

- Neues zentrales `ConfirmDialog`-System eingefuehrt statt nativer Browser-Confirm-Popups fuer kritische Flows.
- Der Zustand lebt zentral im Store und wird per Promise-basiertem `openConfirmDialog(...)` angesteuert.
- `AppLayout` rendert den Dialog global, damit alle Seiten denselben Danger-/Confirm-Look nutzen.
- Bereits umgestellt:
  - Universe-Delete in der Sidebar
  - Entity-Delete auf der Entity-Seite
  - Quick Delete im Dashboard
  - Bulk Delete im Dashboard
  - Permanent Delete und Empty Trash in `TrashPage`
- Danach auch die kleineren Writer-/Inline-Loeschungen in `EntityPage.tsx` (Tasks/Abschnitte) auf denselben Flow umgestellt.
- Design-token-konform: Surface, Border, Radius, Shadow, UI-Type, Danger-/Primary-Buttons.
- Verifikation: `cmd /c npx oxlint --quiet` ueber alle betroffenen Dateien gruen, `cmd /c npm run build` gruen.

## Update 2026-06-21 - E2E-Grundgeruest mit Playwright

- Playwright als Dev-Dependency integriert (`@playwright/test`) inklusive `playwright.config.ts`.
- Neue npm-Skripte:
  - `npm run e2e`
  - `npm run e2e:headed`
- Eigener E2E-Modus ueber `VITE_E2E_MODE=true`:
  - `AuthBootstrap` schaltet fuer Testlaeufe auf einen stabilen auth-bypassed Zustand,
  - die App bleibt dabei mit Demo-State testbar, ohne echte Supabase-Anmeldung zu benoetigen.
- `DashboardPrototype` ueberspringt im E2E-Modus die Remote-Banner-Refreshes gegen Demo-IDs, damit Testlaeufe sauberer bleiben.
- Erste Smoke-Suite unter `e2e/app-smoke.spec.ts`:
  - Dashboard + Settings/Data-Tab rendern
  - Delete-Confirm auf der Entity-Seite oeffnet
  - Trash-Empty-State rendert
- Verifikation:
  - `npm run e2e` -> **3 Tests gruen**
  - `npm run build` -> gruen

### E2E-Welle 2

- Smoke-Suite erweitert um echte Mutations-/Dialog-Flows:
  - Delete-Confirm oeffnen + abbrechen
  - Delete-Confirm bestaetigen
  - Trash zeigt geloeschten Eintrag danach als wiederherstellbar
  - Import-Dialog oeffnet und zeigt die erwarteten Disabled-/Form-Zustaende
  - Settings/Data prueft den deaktivierten Auto-Backup-Test ohne verbundenen Ordner
- E2E-Modus wurde dafuer weiter gehaertet:
  - `AuthBootstrap` setzt einen stabilen Test-User
  - `trashEntityLocally` kann im E2E-Modus lokal mutieren, ohne echten Supabase-Delete zu brauchen
- Verifikation:
  - `npm run e2e` -> **6 Tests gruen**
  - `npm run build` -> gruen

## Update 2026-06-21 - Comprehensive Audit dokumentiert

- Eigenes Audit-Dokument angelegt: `docs/COMPREHENSIVE_AUDIT_2026-06-21.md`
- Audit-Schwerpunkte sauber dokumentiert: Daten-Sicherheit, Sync, Backup/Import, Trash/Delete, Build, E2E und Vercel-Readiness
- Beim Audit einen echten kleinen Flaky-Test-Fund direkt behoben:
  - Avatar-Menue bekam ein stabiles `aria-label`
  - Playwright-Smoketest nutzt jetzt den semantischen Selector statt einer Initiale
- Ziel davon: ehrlich dokumentierter Release-Stand plus robusteres E2E-Sicherheitsnetz

## Update 2026-06-22 - Versionierung eingeführt

- Neue Versionsregel festgelegt und in `mind.md` dokumentiert.
- Startversion ist **1.01**.
- Künftige Updates erhöhen die Version jeweils um **0.01**.
- Die aktuelle Version wird sichtbar direkt unter dem Worldify-Logo in der Sidebar angezeigt.

## Update 2026-06-22 - Version 1.02 - Create-Modal Draft-Reset gefixt

- Problem gefunden: Beim Erstellen neuer Entities konnte sich der eingegebene Name nach einiger Zeit wieder zurücksetzen.
- Ursache war ein unbeabsichtigtes Re-Initialisieren des Draft-State im `EntityModal`, wenn sich abhängige Daten im Hintergrund aktualisiert haben.
- Fix: Das Modal initialisiert den Draft jetzt nur noch beim echten Öffnen des Dialogs statt bei späteren Hintergrund-Updates.
- Sichtbare App-Version auf **1.02** erhöht.

## Update 2026-06-24 - Version 1.03 - Writer-Textarea ohne rechte Begrenzung

- Im Abschnitt-/Writer-Bereich gab es eine unsichtbare rechte Begrenzung bei der Texteingabe.
- Ursache war eine verbliebene `maxWidth: '65ch'` direkt auf den großen Writer-Textareas für Bearbeiten und Anlegen.
- Fix: Die Breitenbegrenzung wurde dort entfernt, damit die Eingabe den gesamten verfügbaren Editor-Bereich nutzt.
- Sichtbare App-Version auf **1.03** erhöht.

## Update 2026-06-24 - Version 1.04 - Writer-Toolbar für Abschnitte

- Der Abschnitt-/Writer-Bereich hat jetzt eine leichte Writing-Toolbar direkt über dem Textfeld.
- Unterstützt werden jetzt Fett, Kursiv, Durchgestrichen, große/kleine Überschriften, Pills und Trennlinien.
- Technisch bleibt der Editor bewusst leichtgewichtig: geschrieben wird weiter in einer stabilen Textarea, gespeichert als Textsyntax und direkt rich im Abschnitt gerendert.
- Dadurch fühlt sich der Bereich deutlich mehr wie ein echtes Schreibtool an, ohne die bestehende Datenstruktur für Abschnitte aufzubrechen.
- Sichtbare App-Version auf **1.04** erhöht.

## Update 2026-06-24 - Version 1.05 - Writer responsive für Tablet & Mobile

- Der neue Writer-Bereich wurde gezielt für Tablet und Mobile nachoptimiert.
- Toolbar-Buttons umbrechen auf kleinen Screens jetzt sauber in gut tappbare Reihen statt eng zu werden.
- Footer-Actions im Writer stapeln sich mobil auf volle Breite, damit Speichern/Abbrechen leichter bedienbar bleibt.
- Textarea-Höhen und Schriftgrößen skalieren auf kleineren Geräten angenehmer, ohne zu viel vertikalen Platz zu verschwenden.
- Die Rich-Preview nutzt auf kompakten Layouts keine harte Lesespalten-Begrenzung mehr und passt sich der verfügbaren Breite besser an.
- Sichtbare App-Version auf **1.05** erhöht.

## Update 2026-06-24 - Version 1.06 - Writer Shortcuts für Tastatur

- Der Writer unterstützt jetzt direkte Tastatur-Shortcuts für schnelles Formatieren.
- Aktuell eingebaut: `Ctrl/Cmd + B` für Fett, `Ctrl/Cmd + I` für Kursiv, `Ctrl/Cmd + D` für Trennlinie, `Ctrl/Cmd + 1` für H1 und `Ctrl/Cmd + 2` für H2.
- Durchgestrichen ist ebenfalls per Tastatur möglich über `Ctrl/Cmd + Shift + 7`.
- Die Shortcuts funktionieren sowohl beim Bearbeiten bestehender Abschnitte als auch beim Anlegen neuer Abschnitte.
- Sichtbare App-Version auf **1.06** erhöht.

## Update 2026-06-24 - Version 1.07 - Writer Heading-Hierarchie korrigiert

- Die In-Text-Überschriften im Writer wurden visuell unter den eigentlichen Abschnittstitel eingeordnet.
- `H1` rendert jetzt kleiner als zuvor und wirkt innerhalb des Abschnitts wie eine starke Zwischenüberschrift statt wie ein übergeordneter Titel.
- `H2` wurde entsprechend ebenfalls eine Stufe kleiner gesetzt, damit die Hierarchie klar und ruhig bleibt.
- Ziel war, dass der Abschnittstitel immer die höchste Ebene der Card bleibt.
- Sichtbare App-Version auf **1.07** erhöht.

## Update 2026-06-24 - Version 1.08 - Writer-Dialoge für Charaktere

- Der Writer unterstützt jetzt eigene Dialog-Blöcke für gesprochene Charakterzeilen.
- Neue Syntax: `[[say:Charakter|Gesprochener Text]]`
- Im Preview wird das als eigener Dialog-Container mit Sprechername und hervorgehobener Sprechzeile gerendert.
- Die Funktion ist responsive aufgebaut und bleibt auf Tablet und Mobile gut lesbar.
- Sichtbare App-Version auf **1.08** erhöht.

## Update 2026-06-24 - Version 1.09 - Live-Preview und einfacher Dialog-Flow im Writer

- Der Writer hat jetzt eine echte Live-Preview direkt im Editor, damit Fett, Überschriften, Pills, Trennlinien und Dialoge sofort sichtbar werden.
- Zusätzlich gibt es einen kleinen Dialog-Einfüger mit Sprecher + Text, damit Dialog-Blöcke nicht mehr händisch als Syntax geschrieben werden müssen.
- Dialog-Syntax wird im Preview jetzt robuster behandelt und auch dann sauber als eigener Block gerendert, wenn sie vorher mitten im Text stand.
- Ziel war, den Writer spürbar weniger technisch und deutlich näher an ein echtes Schreibtool zu bringen.
- Sichtbare App-Version auf **1.09** erhöht.

## Update 2026-06-24 - Version 1.10 - Direkter Live-Writer statt Preview

- Der Abschnitts-Writer wurde von Textarea + separater Preview auf einen direkten Live-Editor umgestellt.
- Formatierungen erscheinen jetzt direkt in der eigentlichen Schreibfläche während des Tippens.
- Dialoge, Pills, Überschriften und Trennlinien werden direkt inline dargestellt statt erst in einer separaten Vorschau.
- Die alte Syntax wird beim Öffnen bestehender Inhalte weiterhin sauber in die neue Live-Darstellung überführt.
- Sichtbare App-Version auf **1.10** erhöht.

## Update 2026-06-24 - Version 1.11 - Dialog-Schnellblock ausgeblendet

- Der zusätzliche Block "Dialog schnell einfügen" im Writer wurde wieder entfernt.
- Der Editor bleibt dadurch ruhiger und fokussierter auf die eigentliche Schreibfläche.
- Dialoge können weiterhin direkt über die Toolbar eingefügt werden, ohne dass das extra Panel sichtbar bleibt.
- Sichtbare App-Version auf **1.11** erhöht.

## Update 2026-06-24 - Version 1.12 - Rechte Begrenzung im Live-Writer weiter gelockert

- Im aktiven Live-Writer gab es auf Desktop weiterhin eine unsichtbare rechte Begrenzung, besonders bei Dialogblöcken.
- Ursache war eine verbliebene `max-width: 65ch` auf den Dialog-Containern innerhalb der eigentlichen Schreibfläche.
- Fix: In der aktiven Writer-Fläche nutzen Dialogblöcke jetzt die volle verfügbare Breite; die ruhigere Lesebreite bleibt nur in der normalen Anzeige erhalten.
- Sichtbare App-Version auf **1.12** erhöht.

## Update 2026-06-25 - Version 1.13 - Cover/Avatar-Sync an echte Entity-Struktur angepasst

- Beim Bild-Upload konnte ein Sync-Fehler wie `column entities.user_id does not exist` auftreten.
- Ursache war ein veralteter Filter in `entityMedia.ts`, der beim Update von `entities` noch auf `user_id` geprüft hat, obwohl diese Spalte in der Entity-Struktur nicht existiert.
- Fix: Cover- und Avatar-Sync aktualisieren die Entity jetzt nur noch über die echte `id`, genau wie andere Entity-Updates im Projekt.
- Sichtbare App-Version auf **1.13** erhöht.
