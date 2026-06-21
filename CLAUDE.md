# Worldify — Regeln für Claude

## Design System (BINDEND)

**Vor jeder UI-Arbeit: `design.md` lesen. Keine Ausnahmen.**

- Alle Farben via CSS-Variablen (`var(--color-*)`) — keine Hex-Werte hardcoden
- Alle Border-Radius via `var(--radius-*)` — keine `px`-Werte direkt
- Alle Schatten via `var(--shadow-*)` — keine inline box-shadows
- Font-Sizes nur aus der Type Scale: 32, 24, 20, 16, 15, 13, 12, 11
- Font-Families nur via `var(--font-display)`, `var(--font-ui)`, `var(--font-mono)`
- Spacing-Werte müssen auf dem 4px-Grid liegen: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Icons: Lucide Icons, `strokeWidth={1.5}`, Größen 15/16/18/20
- Entity-Typ-Farben via `var(--color-{entity}-*)` Tokens

## Projekt-Gedächtnis

- `mind.md` ist das Projektgedächtnis — immer lesen und aktualisieren
- `design.md` ist das Design-Gesetz — alles UI-Relevante folgt diesem Dokument

## Tech Stack

- React + TypeScript + Vite 8
- Tailwind CSS v4
- Manrope (UI) + Instrument Serif (Display)
- Lucide Icons
- Zustand (State)
- React Router v6
- Deployment: Vercel
