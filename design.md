# DESIGN.md — Worldify Design System

> **GESETZ:** Jede UI-Arbeit an Worldify folgt exakt diesem Dokument.
> Keine Abweichungen ohne explizite Änderung dieser Datei.
> Bei Widersprüchen gilt design.md — nicht Erinnerung, nicht Konvention.

---

## 1. Persönlichkeit & Philosophie

**Theme Name:** Parchment Dusk

**Kern-Identität:**
Worldify fühlt sich an wie das digitale Atelier eines Autors — ruhig, aufgeräumt, fokussiert. Es ist ein professionelles Werkzeug, das respektiert, dass der Inhalt (die Welt) die Hauptrolle spielt. Das Interface tritt zurück.

**Referenzen:** Notion · Linear · Raycast · Craft · polierte Admin-Dashboards

**Was Worldify ist:**
- Clean, warm, professionell
- Subtil literarisch — nicht explizit fantasy-dekoriert
- Viel Whitespace, starke Typografie
- Ruhig — keine Animation-Überwältigung, kein Clutter

**Was Worldify NICHT ist:**
- Kein Dark-Fantasy-Look (kein Dunkelgrau + Blutrot)
- Keine schwere Ornamentik, keine Scroll-Banner
- Kein buntes Dashboard mit 12 Farben
- Kein World Anvil-Klon

---

## 2. Farb-System

### Primärpalette

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `color-primary` | `#EA580C` | Buttons, aktive Nav-Items, Links, Focus-Ringe |
| `color-primary-hover` | `#C2410C` | Hover-State von Primary |
| `color-primary-light` | `#FFF3ED` | Hintergrund von Primary-Badges, sanfte Highlights |
| `color-primary-text` | `#FFFFFF` | Text auf Primary-Hintergrund |

### Neutrale (Warm-Gray Skala)

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `color-bg` | `#FAFAF8` | App-Hintergrund (Hauptfläche) |
| `color-surface` | `#FFFFFF` | Cards, Modals, Panels, Inputs |
| `color-sidebar` | `#F4F3F0` | Sidebar-Hintergrund |
| `color-border` | `#E7E5E4` | Alle Borders, Divider |
| `color-border-strong` | `#D6D3D1` | Stärkere Borders (z.B. aktive Input-Outline) |
| `color-text` | `#1C1917` | Primärer Text |
| `color-text-secondary` | `#78716C` | Sekundärer Text, Labels, Meta-Infos |
| `color-text-placeholder` | `#A8A29E` | Input-Placeholder |
| `color-text-disabled` | `#D6D3D1` | Deaktivierte Texte |

### Akzent-Farbe (Gold)

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `color-accent` | `#B8943F` | Tags, Hover-Highlights, besondere Badges |
| `color-accent-light` | `#F7F0E0` | Hintergrund von Accent-Badges |

### Semantische Farben

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `color-success` | `#16A34A` | Erfolgsmeldungen, "Active"-Status |
| `color-success-light` | `#DCFCE7` | Hintergrund von Success-Badges |
| `color-warning` | `#D97706` | Warnhinweise, "Draft"-Status |
| `color-warning-light` | `#FEF3C7` | Hintergrund von Warning-Badges |
| `color-error` | `#DC2626` | Fehlermeldungen, Destructive-Buttons |
| `color-error-light` | `#FEE2E2` | Hintergrund von Error-Badges |
| `color-info` | `#2563EB` | Informationshinweise |
| `color-info-light` | `#DBEAFE` | Hintergrund von Info-Badges |

### Entity-Typ Farben (je Entity-Typ)

| Entity | Farbe | Hex | Light BG |
|--------|-------|-----|---------|
| Character | Violet | `#7C3AED` | `#EDE9FE` |
| Location | Teal | `#0D9488` | `#CCFBF1` |
| Faction | Amber | `#D97706` | `#FEF3C7` |
| Magic System | Indigo | `#4F46E5` | `#E0E7FF` |
| Creature | Rose | `#E11D48` | `#FFE4E6` |
| Language | Cyan | `#0891B2` | `#CFFAFE` |
| Item | Orange | `#EA580C` | `#FFEDD5` |
| Story | Green | `#16A34A` | `#DCFCE7` |
| Event | Fuchsia | `#C026D3` | `#FAE8FF` |
| Note | Warm Gray | `#78716C` | `#F5F5F4` |

**CSS-Variable-Namenskonvention für Entity-Typ-Farben:**
- `--color-{entity-type}` → z.B. `--color-character`, `--color-story`, `--color-note`
- `--color-{entity-type}-light` → z.B. `--color-character-light`, `--color-story-light`, `--color-note-light`
- Alle sind in `index.css` definiert und entsprechen der Tabelle oben.

---

## 3. Typografie

### Font Families

```css
--font-display: 'Instrument Serif', Georgia, serif;
--font-ui:      'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;
```

**Regeln:**
- `font-display` NUR für große Überschriften (h1, Seiten-Titel, Universe-Namen)
- `font-ui` für ALLES andere (Nav, Buttons, Labels, Body, Cards)
- `font-mono` für IDs, Code-Snippets, technische Werte — **12px, uppercase, letter-spacing +0.06em**

### Typografie-Skala

| Token | Size | Weight | Line Height | Verwendung |
|-------|------|--------|-------------|-----------|
| `text-display` | 32px / 2rem | 700 (Bold) | 1.2 | Universe-Titel, große Seitenüberschriften — Instrument Serif |
| `text-heading-1` | 24px / 1.5rem | 600 (Semibold) | 1.3 | Seitenüberschriften — Manrope |
| `text-heading-2` | 20px / 1.25rem | 600 | 1.35 | Abschnitts-Titel, Card-Header |
| `text-heading-3` | 16px / 1rem | 600 | 1.4 | Sub-Überschriften, Sidebar-Sections |
| `text-body` | 15px / 0.9375rem | 400 (Regular) | 1.6 | Fließtext, Beschreibungen |
| `text-body-sm` | 13px / 0.8125rem | 400 | 1.5 | Meta-Infos, Labels, Tags |
| `text-caption` | 11px / 0.6875rem | 500 (Medium) | 1.4 | Timestamps, Badges, Hints |
| `text-mono` | 12px / 0.75rem | 500 | 1.5 | IDs, technische Werte — **uppercase** |

### Typografie-Regeln

- Text-Farbe immer aus `color-text` oder `color-text-secondary` — niemals reine Farben
- Maximale Zeilenbreite für Fließtext: **65ch**
- Letter-Spacing bei Display-Text: leicht negativ (`-0.02em`)
- Letter-Spacing bei Caps-Labels: positiv (`+0.08em`)

---

## 4. Spacing-System

Basis-Einheit: **4px**. Alle Abstände sind Vielfache davon.

| Token | Wert | Verwendung |
|-------|------|-----------|
| `space-1` | 4px | Micro-Abstände (Icon-Gap, Inline-Gaps) |
| `space-2` | 8px | Enge Abstände (Badge-Padding, kleine Gaps) |
| `space-3` | 12px | Standard Klein (Button-Padding-Y, Nav-Item-Gap) |
| `space-4` | 16px | Standard (Card-Padding innen, Input-Padding) |
| `space-5` | 20px | Standard Groß (Section-Gaps) |
| `space-6` | 24px | Komfortabel (Card-Gap, Panel-Padding) |
| `space-8` | 32px | Großzügig (Section-Trenner) |
| `space-10` | 40px | Layout-Abstände |
| `space-12` | 48px | Große Layout-Abstände |
| `space-16` | 64px | Sehr große Sektionen |

---

## 5. Border Radius

| Token | Wert | Verwendung |
|-------|------|-----------|
| `radius-sm` | 2px | Badges, Tags, kleine Elemente |
| `radius-md` | 4px | Buttons, Inputs, kleine Cards |
| `radius-lg` | 8px | Cards, Panels, Modals |
| `radius-xl` | 12px | Große Panels, Drawers |
| `radius-full` | 9999px | Pills, Avatar, runde Buttons |

---

## 6. Schatten (Shadows)

| Token | Wert | Verwendung |
|-------|------|-----------|
| `shadow-sm` | `0 1px 2px rgba(28,25,23,0.05)` | Buttons, Inputs im Fokus |
| `shadow-md` | `0 4px 12px rgba(28,25,23,0.08)` | Cards, Dropdowns |
| `shadow-lg` | `0 8px 24px rgba(28,25,23,0.10)` | Modals, Overlays |
| `shadow-xl` | `0 16px 40px rgba(28,25,23,0.12)` | Sehr elevierte Elemente |

**Regel:** Schatten sind subtil und warm — niemals blau/cool getönt.

---

## 7. Layout

### App-Struktur

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (240px)  │  MAIN CONTENT (flex-1)          │
│                   │                                  │
│  Logo             │  Top Bar (Search + Actions)     │
│  Universe Picker  │  ─────────────────────────────  │
│  ─────────────    │                                  │
│  Navigation       │  Content Area                   │
│  ─────────────    │  (Entity Grid / Detail View)    │
│  Settings         │                                  │
└─────────────────────────────────────────────────────┘
```

### Breakpoints

| Name | Wert | Verhalten |
|------|------|----------|
| `sm` | 640px | Sidebar collapsiert |
| `md` | 768px | 1-Spalten Grid |
| `lg` | 1024px | 2-Spalten Grid |
| `xl` | 1280px | 3-Spalten Grid |
| `2xl` | 1536px | 4-Spalten Grid |

### Sidebar

- Breite: **240px** (fest)
- Hintergrund: `color-sidebar` (`#F4F3F0`)
- Border rechts: `1px solid color-border`
- Kein Box-Shadow — Border reicht
- Nav-Item Padding: `space-2` vertikal, `space-4` horizontal
- Nav-Item aktiv: `color-primary-light` Hintergrund + `color-primary` Text + `color-primary` Left-Border (`3px`)
- Nav-Item hover: `color-border` Hintergrund
- Section-Labels: `text-caption`, `color-text-secondary`, uppercase, letter-spacing `+0.08em`

---

## 8. Komponenten

### Button

```
Varianten: primary | secondary | ghost | destructive
Größen:    sm | md | lg
```

| Variante | Hintergrund | Text | Border | Hover |
|----------|------------|------|--------|-------|
| `primary` | `color-primary` | White | — | `color-primary-hover` |
| `secondary` | `color-surface` | `color-text` | `color-border` | `color-bg` |
| `ghost` | transparent | `color-text-secondary` | — | `color-border` BG |
| `destructive` | `color-error` | White | — | `#B91C1C` |

| Größe | Padding | Font Size | Border Radius | Height |
|-------|---------|-----------|---------------|--------|
| `sm` | `6px 12px` | 13px | `radius-md` | 28px |
| `md` | `8px 16px` | 14px | `radius-md` | 36px |
| `lg` | `10px 20px` | 15px | `radius-md` | 44px |

**Regeln:**
- Immer `font-weight: 500`
- Immer `gap: space-2` wenn Icon dabei
- Focus: `outline: 2px solid color-primary` + `outline-offset: 2px`
- Transition: `background 150ms ease, box-shadow 150ms ease`

---

### Input / Textarea

- Hintergrund: `color-surface`
- Border: `1px solid color-border`
- Border Radius: `radius-md`
- Padding: `space-3` vertikal, `space-4` horizontal
- Font: `text-body`, `font-ui`
- Placeholder: `color-text-placeholder`
- Focus: Border `color-primary`, `shadow-sm`
- Error: Border `color-error`
- Transition: `border-color 150ms ease`

---

### Card (Entity Card)

- Hintergrund: `color-surface`
- Border: `1px solid color-border`
- Border Radius: `radius-lg`
- Padding: `space-6`
- Shadow: `shadow-sm`
- Hover: `shadow-md` + Border `color-border-strong`
- Transition: `box-shadow 200ms ease, border-color 200ms ease`

**Card-Aufbau:**
```
┌───────────────────────────────┐
│  [Type Badge]      [Status]   │  ← space-4 padding top
│                               │
│  Entity Name (heading-2)      │
│  Short description (body-sm)  │
│                               │
│  [Tag] [Tag] [Tag]            │
│  ─────────────────────────── │  ← Divider
│  Created · Updated (caption)  │  ← space-4 padding bottom
└───────────────────────────────┘
```

---

### Badge / Tag

```
Varianten: type (Entity-Farbe) | status | tag (accent gold) | custom
```

- Padding: `3px 8px` (`space-1` + `space-2`)
- Border Radius: `radius-sm`
- Font: `text-caption`, `font-weight: 500`
- Immer Hintergrund aus der Light-Variante der jeweiligen Farbe

---

### Status Badge

| Status | Farbe | Label |
|--------|-------|-------|
| Draft | `color-warning` / `color-warning-light` | Draft |
| Active | `color-success` / `color-success-light` | Active |
| Archived | `color-text-secondary` / `color-border` | Archived |
| Concept | `color-primary` / `color-primary-light` | Concept |

---

### Search Bar

- Breite: `100%` oder feste `320px` im Top-Bar
- Hintergrund: `color-surface`
- Border: `1px solid color-border`
- Border Radius: `radius-md`
- Padding links: `space-4` + Icon-Platz (`36px`)
- Placeholder: "Search entities…"
- Focus: wie Input

---

### Modal / Dialog

- Overlay: `rgba(28,25,23,0.4)` — warm, nicht blau-schwarz
- Panel: `color-surface`, `radius-xl`, `shadow-xl`
- Max-Width: `560px` (Standard), `720px` (Groß)
- Padding: `space-8`
- Animate: `scale(0.97) → scale(1)` + `opacity 0 → 1`, `200ms ease`

---

### Sidebar Navigation Struktur

```
[Worldify Logo]
[Universe Picker ▾]
────────────────────
LIBRARY
  • All Entities
  • Characters
  • Locations
  • Factions
  • Magic Systems
  • Creatures
  • Languages
  • Items
  • Stories
  • Events
  • Notes
────────────────────
TOOLS
  • Search
  • Timeline (future)
────────────────────
  [Settings]
  [User]
```

---

## 9. Icon-System

- Bibliothek: **Lucide Icons** (konsistent mit Linear/Notion-Ästhetik)
- Strich-Stärke: `1.5` (niemals `2` oder `1`)
- Standard-Größe: `16px` (Nav), `18px` (Buttons), `20px` (Headings)
- Farbe: immer aus dem Token-System, nie hardcoded
- Keine filled Icons außer bei aktiven Zuständen

---

## 10. Animationen & Übergänge

**Philosophie:** Dezent und funktional — keine Animationen um der Animation willen.

| Typ | Dauer | Easing | Verwendung |
|-----|-------|--------|-----------|
| Micro | 100ms | `ease` | Hover-States, Farb-Übergänge |
| Standard | 150ms | `ease` | Buttons, Inputs, Border-Übergänge |
| Smooth | 200ms | `ease-out` | Cards, Modals aufgehen, Dropdowns |
| Layout | 250ms | `ease-in-out` | Sidebar collapse, Panel-Übergänge |

**Verboten:**
- Bounce-Animationen
- Lange Animationen (> 300ms) für UI-Elemente
- Parallax oder Scroll-Effekte

---

## 11. Abstands-Regeln (Layout-Spezifisch)

- Zwischen Cards im Grid: `space-4` (`16px`)
- Padding des Content-Bereichs: `space-8` (`32px`)
- Top-Bar Höhe: `56px`
- Sidebar Width: `240px`
- Zwischen Sektionen in Detail-View: `space-8`
- Form-Felder Abstand: `space-5` (`20px`)

---

## 12. Do's & Don'ts

### DO ✓
- Viel Whitespace lassen
- Farben sparsam einsetzen — Neutralgrau dominiert
- `color-primary` nur für aktive/interaktive Elemente
- Konsistente Radius überall (nie mixen)
- Entity-Typ immer mit seiner definierten Farbe zeigen
- Font-Hierarchie strikt einhalten

### DON'T ✗
- Keine Farben außerhalb der Palette erfinden
- Kein `text-black` oder `#000000` — immer `color-text`
- Keine `border-radius` Werte außerhalb der Tokens
- Keine Inline-Schatten oder `drop-shadow` Filter
- Keine Random-Gradients
- Keine Schriftgrößen außerhalb der Skala
- Keine Icons mit `stroke-width: 2`
- Kein Clutter — wenn unsicher, weglassen

---

*Letzte Aktualisierung: 2026-06-13*
*Dieses Dokument ist bindend für alle UI-Arbeit an Worldify.*
