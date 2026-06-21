import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Globe, Users, MapPin, Shield, Sparkles, Bug,
  Languages, Package, BookOpen, Calendar, StickyNote,
  Search, Plus, Bell, Settings, ChevronDown, Eye, Heart,
  Star, Zap, Moon, Sun, Cloud, Feather, Compass, Anchor,
  MoreHorizontal, Pencil, Copy, Trash2,
} from 'lucide-react'

export default function DesignSystemPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 40 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-ui)', marginBottom: 20, padding: 0,
          }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back
        </button>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
          color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 8,
        }}>
          Design System
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>
          Parchment Dusk — the living style guide for Worldify. All tokens, components, and patterns.
        </p>
      </div>

      <DSSection title="Colors">
        <ColorSection />
      </DSSection>

      <DSSection title="Typography">
        <TypographySection />
      </DSSection>

      <DSSection title="Spacing">
        <SpacingSection />
      </DSSection>

      <DSSection title="Border Radius">
        <RadiusSection />
      </DSSection>

      <DSSection title="Shadows">
        <ShadowSection />
      </DSSection>

      <DSSection title="Buttons">
        <ButtonSection />
      </DSSection>

      <DSSection title="Inputs">
        <InputSection />
      </DSSection>

      <DSSection title="Badges & Tags">
        <BadgeSection />
      </DSSection>

      <DSSection title="Cards">
        <CardSection />
      </DSSection>

      <DSSection title="Icons">
        <IconSection />
      </DSSection>

      <DSSection title="Animations">
        <AnimationSection />
      </DSSection>

      <DSSection title="Skeleton">
        <SkeletonSection />
      </DSSection>

      <DSSection title="Tabs">
        <TabsSection />
      </DSSection>

      <DSSection title="Sidebar (Mini Preview)">
        <SidebarPreviewSection />
      </DSSection>
    </div>
  )
}

/* ─── Section wrapper ─────────────────────────────────── */

function DSSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-ui)',
        }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
      </div>
      {children}
    </section>
  )
}

/* ─── Colors ─────────────────────────────────────────── */

function ColorSection() {
  const groups = [
    {
      label: 'Primary',
      swatches: [
        { token: '--color-primary', label: 'Primary', border: false },
        { token: '--color-primary-hover', label: 'Primary Hover', border: false },
        { token: '--color-primary-light', label: 'Primary Light', border: true },
      ],
    },
    {
      label: 'Neutrals',
      swatches: [
        { token: '--color-bg', label: 'Background', border: true },
        { token: '--color-surface', label: 'Surface', border: true },
        { token: '--color-sidebar', label: 'Sidebar', border: true },
        { token: '--color-border', label: 'Border', border: true },
        { token: '--color-border-strong', label: 'Border Strong', border: true },
      ],
    },
    {
      label: 'Text',
      swatches: [
        { token: '--color-text', label: 'Text', border: false },
        { token: '--color-text-secondary', label: 'Secondary', border: false },
        { token: '--color-text-placeholder', label: 'Placeholder', border: false },
        { token: '--color-text-disabled', label: 'Disabled', border: true },
      ],
    },
    {
      label: 'Accent Gold',
      swatches: [
        { token: '--color-accent', label: 'Accent', border: false },
        { token: '--color-accent-light', label: 'Accent Light', border: true },
      ],
    },
    {
      label: 'Semantic',
      swatches: [
        { token: '--color-success', label: 'Success', border: false },
        { token: '--color-success-light', label: 'Success Light', border: true },
        { token: '--color-warning', label: 'Warning', border: false },
        { token: '--color-warning-light', label: 'Warning Light', border: true },
        { token: '--color-error', label: 'Error', border: false },
        { token: '--color-error-light', label: 'Error Light', border: true },
      ],
    },
    {
      label: 'Entity Types',
      swatches: [
        { token: null, label: 'Character', hex: '#7C3AED', border: false },
        { token: null, label: 'Location', hex: '#0D9488', border: false },
        { token: null, label: 'Faction', hex: '#D97706', border: false },
        { token: null, label: 'Magic System', hex: '#4F46E5', border: false },
        { token: null, label: 'Creature', hex: '#E11D48', border: false },
        { token: null, label: 'Language', hex: '#0891B2', border: false },
        { token: null, label: 'Item', hex: '#EA580C', border: false },
        { token: null, label: 'Story', hex: '#16A34A', border: false },
        { token: null, label: 'Event', hex: '#C026D3', border: false },
        { token: null, label: 'Note', hex: '#78716C', border: false },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map((g) => (
        <div key={g.label}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 8 }}>{g.label}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {g.swatches.map((s) => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 110 }}>
                <div style={{
                  height: 52,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: s.token ? `var(${s.token})` : (s as { hex?: string }).hex,
                  border: s.border ? '1px solid var(--color-border)' : 'none',
                }} />
                <div>
                  <p style={{ fontSize: 11, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', fontWeight: 500, marginBottom: 1 }}>{s.label}</p>
                  {s.token && <p style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.3 }}>{s.token}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Typography ─────────────────────────────────────── */

function TypographySection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Font Families */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {[
          { label: '--font-display', name: 'Instrument Serif', family: 'var(--font-display)', sample: 'The quick brown fox', weight: 400 },
          { label: '--font-ui', name: 'Manrope', family: 'var(--font-ui)', sample: 'The quick brown fox', weight: 400 },
          { label: '--font-mono', name: 'JetBrains Mono', family: 'var(--font-mono)', sample: 'const world = true', weight: 400 },
        ].map((f) => (
          <div key={f.label} style={{
            flex: 1, padding: 16, backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{f.label}</p>
            <p style={{ fontFamily: f.family, fontSize: 18, fontWeight: f.weight, color: 'var(--color-text)', marginBottom: 4 }}>{f.sample}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>{f.name}</p>
          </div>
        ))}
      </div>

      {/* Type Scale */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          { label: 'text-display', size: 32, weight: 700, family: 'var(--font-display)', sample: 'The World of Aethoria', desc: '32px / Bold / Playfair Display' },
          { label: 'text-heading-1', size: 24, weight: 600, family: 'var(--font-ui)', sample: 'All Characters', desc: '24px / Semibold / Inter' },
          { label: 'text-heading-2', size: 20, weight: 600, family: 'var(--font-ui)', sample: 'Elara Moonwhisper', desc: '20px / Semibold / Inter' },
          { label: 'text-heading-3', size: 16, weight: 600, family: 'var(--font-ui)', sample: 'Physical Description', desc: '16px / Semibold / Inter' },
          { label: 'text-body', size: 15, weight: 400, family: 'var(--font-ui)', sample: 'A seasoned elven ranger who wandered the northern forests for three centuries.', desc: '15px / Regular / Inter' },
          { label: 'text-body-sm', size: 13, weight: 400, family: 'var(--font-ui)', sample: 'Last updated 2 hours ago · 3 tags', desc: '13px / Regular / Inter' },
          { label: 'text-caption', size: 11, weight: 500, family: 'var(--font-ui)', sample: 'CHARACTER · ACTIVE', desc: '11px / Medium / Inter · uppercase' },
          { label: 'text-mono', size: 12, weight: 500, family: 'var(--font-mono)', sample: 'ENTITY_ID: CHR_0042', desc: '12px / Medium / JetBrains Mono · uppercase' },
        ].map((t, i) => (
          <div key={t.label} style={{
            display: 'flex', alignItems: 'baseline', gap: 20,
            padding: '14px 0',
            borderBottom: i < 7 ? '1px solid var(--color-border)' : 'none',
          }}>
            <div style={{ width: 140, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{t.label}</span>
              <p style={{ fontSize: 10, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>{t.desc}</p>
            </div>
            <span style={{
              fontFamily: t.family,
              fontSize: t.size,
              fontWeight: t.weight,
              color: 'var(--color-text)',
              letterSpacing: t.label === 'text-display' ? '-0.02em' : t.label === 'text-caption' ? '0.08em' : undefined,
              textTransform: t.label === 'text-caption' ? 'uppercase' : undefined,
              lineHeight: 1.3,
            }}>
              {t.sample}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Spacing ─────────────────────────────────────────── */

function SpacingSection() {
  const spaces = [
    { token: 'space-1', px: 4 }, { token: 'space-2', px: 8 },
    { token: 'space-3', px: 12 }, { token: 'space-4', px: 16 },
    { token: 'space-5', px: 20 }, { token: 'space-6', px: 24 },
    { token: 'space-8', px: 32 }, { token: 'space-10', px: 40 },
    { token: 'space-12', px: 48 }, { token: 'space-16', px: 64 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {spaces.map((s) => (
        <div key={s.token} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ width: 80, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{s.token}</span>
          <div style={{
            height: 20, width: s.px * 2, backgroundColor: 'var(--color-primary-light)',
            borderRadius: 3, border: '1px solid var(--color-primary)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-placeholder)' }}>{s.px}px</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Border Radius ──────────────────────────────────── */

function RadiusSection() {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {[
        { token: 'radius-sm', value: '2px' },
        { token: 'radius-md', value: '4px' },
        { token: 'radius-lg', value: '8px' },
        { token: 'radius-xl', value: '12px' },
        { token: 'radius-full', value: '9999px' },
      ].map((r) => (
        <div key={r.token} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 72, height: 72,
            backgroundColor: 'var(--color-primary-light)',
            border: '2px solid var(--color-primary)',
            borderRadius: `var(--${r.token})`,
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', marginBottom: 2 }}>{r.value}</p>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{r.token}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Shadows ─────────────────────────────────────────── */

function ShadowSection() {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {[
        { token: 'shadow-sm', label: 'Small', desc: 'Buttons, focused inputs' },
        { token: 'shadow-md', label: 'Medium', desc: 'Cards, dropdowns' },
        { token: 'shadow-lg', label: 'Large', desc: 'Modals, overlays' },
        { token: 'shadow-xl', label: 'X-Large', desc: 'Elevated panels' },
      ].map((s) => (
        <div key={s.token} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 120, height: 80,
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: `var(--${s.token})`,
            border: '1px solid var(--color-border)',
          }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 2 }}>{s.label}</p>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>{s.token}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Buttons ────────────────────────────────────────── */

function ButtonSection() {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-ui)',
    fontWeight: 500, cursor: 'pointer', border: 'none',
  } as React.CSSProperties

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* With icons */}
      <div>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>With Icon</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-primary)', color: '#fff' }}>
            <Plus size={15} strokeWidth={1.5} /> New Entity
          </button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            <Search size={15} strokeWidth={1.5} /> Search
          </button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}>
            <Settings size={15} strokeWidth={1.5} /> Settings
          </button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-error)', color: '#fff' }}>
            <Trash2 size={15} strokeWidth={1.5} /> Delete
          </button>
        </div>
      </div>

      {/* Plain — no icon */}
      <div>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plain</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-primary)', color: '#fff' }}>Save changes</button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>Cancel</button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}>Learn more</button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-error)', color: '#fff' }}>Delete</button>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sizes</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button style={{ ...base, height: 28, padding: '0 12px', fontSize: 12, backgroundColor: 'var(--color-primary)', color: '#fff' }}>
            <Plus size={12} strokeWidth={1.5} /> Small
          </button>
          <button style={{ ...base, height: 36, padding: '0 16px', fontSize: 14, backgroundColor: 'var(--color-primary)', color: '#fff' }}>
            <Plus size={15} strokeWidth={1.5} /> Medium
          </button>
          <button style={{ ...base, height: 44, padding: '0 20px', fontSize: 15, backgroundColor: 'var(--color-primary)', color: '#fff' }}>
            <Plus size={17} strokeWidth={1.5} /> Large
          </button>
        </div>
      </div>

      {/* Icon only */}
      <div>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Icon Only</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { icon: Plus, bg: 'var(--color-primary)', color: '#fff', border: 'none' },
            { icon: Search, bg: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
            { icon: Bell, bg: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' },
            { icon: Pencil, bg: 'transparent', color: 'var(--color-text-secondary)', border: 'none' },
            { icon: Trash2, bg: 'transparent', color: 'var(--color-error)', border: 'none' },
          ].map(({ icon: Icon, bg, color, border }, i) => (
            <button key={i} style={{
              ...base, width: 36, height: 36, padding: 0, justifyContent: 'center',
              backgroundColor: bg, color, border,
            }}>
              <Icon size={15} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

/* ─── Inputs ─────────────────────────────────────────── */

function InputSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
      {[
        { label: 'Default', placeholder: 'Entity name…', extra: {} },
        { label: 'Focus (simulated)', placeholder: 'Entity name…', extra: { borderColor: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)' } },
        { label: 'Error', placeholder: 'Entity name…', extra: { borderColor: 'var(--color-error)' } },
        { label: 'Disabled', placeholder: 'Disabled input', extra: { opacity: 0.5, cursor: 'not-allowed' } },
      ].map((inp) => (
        <div key={inp.label}>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--color-text-secondary)', marginBottom: 6 }}>{inp.label}</p>
          <input
            placeholder={inp.placeholder}
            disabled={inp.label === 'Disabled'}
            readOnly
            style={{
              width: '100%', height: 36, padding: '0 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontFamily: 'var(--font-ui)',
              color: 'var(--color-text)', outline: 'none',
              ...inp.extra,
            }}
          />
        </div>
      ))}
      <div>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Textarea</p>
        <textarea
          placeholder="Write your notes here…"
          rows={3}
          readOnly
          style={{
            width: '100%', padding: '8px 12px',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14, fontFamily: 'var(--font-ui)',
            color: 'var(--color-text)', outline: 'none', resize: 'none',
          }}
        />
      </div>
    </div>
  )
}

/* ─── Badges ─────────────────────────────────────────── */

function BadgeSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 10 }}>Status Badges</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Active', bg: 'var(--color-success-light)', color: 'var(--color-success)' },
            { label: 'Draft', bg: 'var(--color-warning-light)', color: 'var(--color-warning)' },
            { label: 'Archived', bg: 'var(--color-border)', color: 'var(--color-text-secondary)' },
            { label: 'Concept', bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
          ].map((b) => (
            <span key={b.label} style={{
              padding: '3px 10px', borderRadius: 'var(--radius-sm)',
              backgroundColor: b.bg, color: b.color,
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
            }}>{b.label}</span>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 10 }}>Entity Type Badges</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Character', bg: '#EDE9FE', color: '#7C3AED' },
            { label: 'Location', bg: '#CCFBF1', color: '#0D9488' },
            { label: 'Faction', bg: '#FEF3C7', color: '#D97706' },
            { label: 'Magic System', bg: '#E0E7FF', color: '#4F46E5' },
            { label: 'Creature', bg: '#FFE4E6', color: '#E11D48' },
            { label: 'Language', bg: '#CFFAFE', color: '#0891B2' },
            { label: 'Item', bg: '#FFEDD5', color: '#EA580C' },
            { label: 'Story', bg: '#DCFCE7', color: '#16A34A' },
            { label: 'Event', bg: '#FAE8FF', color: '#C026D3' },
            { label: 'Note', bg: '#F5F5F4', color: '#78716C' },
          ].map((b) => (
            <span key={b.label} style={{
              padding: '3px 10px', borderRadius: 'var(--radius-sm)',
              backgroundColor: b.bg, color: b.color,
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
            }}>{b.label}</span>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 10 }}>Tag (Accent Gold)</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {['#elven', '#ranger', '#forest'].map((t) => (
            <span key={t} style={{
              padding: '3px 10px', borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Cards ──────────────────────────────────────────── */

function CardSection() {
  return (
    <div style={{ maxWidth: 320 }}>
      <EntityCard />
    </div>
  )
}

function EntityCard() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const menuItems = [
    { icon: Pencil, label: 'Edit', color: 'var(--color-text)' },
    { icon: Copy, label: 'Duplicate', color: 'var(--color-text)' },
    { icon: Trash2, label: 'Delete', color: 'var(--color-error)' },
  ]

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 20,
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          padding: '3px 10px', borderRadius: 'var(--radius-sm)',
          backgroundColor: '#EDE9FE', color: '#7C3AED',
          fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
        }}>Character</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)',
            fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
          }}>Active</span>

          {/* 3-dot menu button */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: menuOpen ? 'var(--color-bg)' : 'transparent',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                transition: 'background 100ms ease',
              }}
              onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
              onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <MoreHorizontal size={15} strokeWidth={1.5} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                minWidth: 140,
                zIndex: 50,
                overflow: 'hidden',
                padding: 4,
                animation: 'modalIn 150ms ease-out',
              }}>
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px',
                      backgroundColor: 'transparent',
                      border: 'none', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: 13, fontFamily: 'var(--font-ui)',
                      color: item.color,
                      textAlign: 'left',
                      transition: 'background 100ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <item.icon size={14} strokeWidth={1.5} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <h3 style={{
        fontSize: 16, fontWeight: 600, color: 'var(--color-text)',
        fontFamily: 'var(--font-ui)', marginBottom: 6,
      }}>Elara Moonwhisper</h3>

      {/* Description */}
      <p style={{
        fontSize: 13, color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-ui)', lineHeight: 1.5, marginBottom: 14,
      }}>
        An elven ranger who guards the northern borders of Aethoria.
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {['#elven', '#ranger', '#hero'].map((t) => (
          <span key={t} style={{
            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
            fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)',
          }}>{t}</span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'var(--color-border)', marginBottom: 12 }} />

      {/* Meta */}
      <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)' }}>
        Created Jun 13 · Updated 2h ago
      </p>
    </div>
  )
}

/* ─── Icons ──────────────────────────────────────────── */

function IconSection() {
  const icons = [
    { icon: Globe, name: 'Globe' }, { icon: Users, name: 'Users' },
    { icon: MapPin, name: 'MapPin' }, { icon: Shield, name: 'Shield' },
    { icon: Sparkles, name: 'Sparkles' }, { icon: Bug, name: 'Bug' },
    { icon: Languages, name: 'Languages' }, { icon: Package, name: 'Package' },
    { icon: BookOpen, name: 'BookOpen' }, { icon: Calendar, name: 'Calendar' },
    { icon: StickyNote, name: 'StickyNote' }, { icon: Search, name: 'Search' },
    { icon: Plus, name: 'Plus' }, { icon: Bell, name: 'Bell' },
    { icon: Settings, name: 'Settings' }, { icon: ChevronDown, name: 'ChevronDown' },
    { icon: Eye, name: 'Eye' }, { icon: Heart, name: 'Heart' },
    { icon: Star, name: 'Star' }, { icon: Zap, name: 'Zap' },
    { icon: Moon, name: 'Moon' }, { icon: Sun, name: 'Sun' },
    { icon: Cloud, name: 'Cloud' }, { icon: Feather, name: 'Feather' },
    { icon: Compass, name: 'Compass' }, { icon: Anchor, name: 'Anchor' },
    { icon: ArrowLeft, name: 'ArrowLeft' },
  ]

  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 16 }}>
        Lucide Icons · stroke-width 1.5 · colors from token system
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {icons.map(({ icon: Icon, name }) => (
          <div key={name} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            padding: '10px 12px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            width: 72,
          }}>
            <Icon size={18} strokeWidth={1.5} color="var(--color-text)" />
            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Animations ─────────────────────────────────────── */

function AnimationSection() {
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', marginBottom: 16 }}>
        Hover each box to see the timing in action.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Micro', ms: 100, desc: 'Hover colors, icon tints' },
          { label: 'Standard', ms: 150, desc: 'Buttons, inputs, borders' },
          { label: 'Smooth', ms: 200, desc: 'Cards, modals, dropdowns' },
          { label: 'Layout', ms: 250, desc: 'Sidebar, panel transitions' },
        ].map((a) => (
          <AnimBox key={a.label} {...a} />
        ))}
      </div>
      <style>{`
        .anim-box { transition-property: background-color, box-shadow; }
        .anim-box:hover { background-color: var(--color-primary-light) !important; box-shadow: var(--shadow-md) !important; }
      `}</style>
    </div>
  )
}

function AnimBox({ label, ms, desc }: { label: string; ms: number; desc: string }) {
  return (
    <div
      className="anim-box"
      style={{
        width: 160, padding: '20px 16px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transitionDuration: `${ms}ms`,
        transitionTimingFunction: 'ease',
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{ms}ms</p>
      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────────── */

function SkeletonSection() {
  return (
    <div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -600px 0 }
          100% { background-position: 600px 0 }
        }
        .skeleton {
          background: linear-gradient(90deg, var(--color-border) 25%, var(--color-bg) 50%, var(--color-border) 75%);
          background-size: 1200px 100%;
          animation: shimmer 1.6s infinite linear;
          border-radius: var(--radius-md);
        }
      `}</style>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Text skeleton */}
        <div style={{
          padding: 20, backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          width: 280, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', marginBottom: 4 }}>Text lines</p>
          <div className="skeleton" style={{ height: 16, width: '60%' }} />
          <div className="skeleton" style={{ height: 12, width: '100%' }} />
          <div className="skeleton" style={{ height: 12, width: '85%' }} />
          <div className="skeleton" style={{ height: 12, width: '70%' }} />
        </div>

        {/* Card skeleton */}
        <div style={{
          padding: 20, backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
          width: 260,
        }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', fontFamily: 'var(--font-ui)', marginBottom: 12 }}>Entity card</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="skeleton" style={{ height: 22, width: 80 }} />
            <div className="skeleton" style={{ height: 22, width: 60 }} />
          </div>
          <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '100%', marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div className="skeleton" style={{ height: 20, width: 50 }} />
            <div className="skeleton" style={{ height: 20, width: 50 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Tabs ───────────────────────────────────────────── */

function TabsSection() {
  const [active, setActive] = useState('overview')
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
    { id: 'relations', label: 'Relations' },
    { id: 'history', label: 'History' },
  ]
  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 20, gap: 0,
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              padding: '8px 16px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--font-ui)',
              fontWeight: active === t.id ? 600 : 400,
              color: active === t.id ? 'var(--color-text)' : 'var(--color-text-secondary)',
              borderBottom: active === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 150ms ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div style={{
        padding: 20,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 13, color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-ui)',
      }}>
        Showing content for: <strong style={{ color: 'var(--color-text)' }}>{tabs.find(t => t.id === active)?.label}</strong>
      </div>
    </div>
  )
}

/* ─── Sidebar Preview ────────────────────────────────── */

function SidebarPreviewSection() {
  const items = ['All Entities', 'Characters', 'Locations', 'Factions', 'Magic Systems', 'Creatures']
  return (
    <div style={{ display: 'inline-flex' }}>
      <div style={{
        width: 200,
        backgroundColor: 'var(--color-sidebar)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, backgroundColor: 'var(--color-primary)',
            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={12} color="#fff" strokeWidth={1.5} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text)', letterSpacing: '-0.02em' }}>Worldify</span>
        </div>

        {/* Universe picker */}
        <div style={{ padding: '10px 10px 6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>My Universe</span>
            <ChevronDown size={12} color="var(--color-text-secondary)" strokeWidth={1.5} />
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '2px 6px 6px' }}>
          <p style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)', padding: '8px 6px 4px' }}>Library</p>
          {items.map((item, i) => (
            <div key={item} style={{
              padding: '5px 8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: i === 0 ? 'var(--color-primary-light)' : 'transparent',
              color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: 12, fontFamily: 'var(--font-ui)',
              fontWeight: i === 0 ? 500 : 400,
              marginBottom: 1,
            }}>
              {item}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 8px 10px', borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
          <div style={{ padding: '5px 8px', color: 'var(--color-text-secondary)', fontSize: 12, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={13} strokeWidth={1.5} /> Settings
          </div>
        </div>
      </div>
    </div>
  )
}
