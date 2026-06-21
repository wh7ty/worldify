export type AccentPreset = {
  id: string
  label: string
  light: { primary: string; hover: string; bg: string }
  dark: { primary: string; hover: string; bg: string }
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'orange',
    label: 'Orange',
    light: { primary: '#EA580C', hover: '#C2410C', bg: '#FFF3ED' },
    dark:  { primary: '#F97316', hover: '#EA580C', bg: '#2C1503' },
  },
  {
    id: 'amber',
    label: 'Amber',
    light: { primary: '#D97706', hover: '#B45309', bg: '#FEF3C7' },
    dark:  { primary: '#FCD34D', hover: '#F59E0B', bg: '#1C1400' },
  },
  {
    id: 'emerald',
    label: 'Smaragd',
    light: { primary: '#059669', hover: '#047857', bg: '#ECFDF5' },
    dark:  { primary: '#34D399', hover: '#10B981', bg: '#021A0F' },
  },
  {
    id: 'teal',
    label: 'Teal',
    light: { primary: '#0D9488', hover: '#0F766E', bg: '#F0FDFA' },
    dark:  { primary: '#2DD4BF', hover: '#14B8A6', bg: '#042420' },
  },
  {
    id: 'sky',
    label: 'Sky',
    light: { primary: '#0284C7', hover: '#0369A1', bg: '#E0F2FE' },
    dark:  { primary: '#38BDF8', hover: '#0EA5E9', bg: '#041824' },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    light: { primary: '#4F46E5', hover: '#4338CA', bg: '#EEF2FF' },
    dark:  { primary: '#818CF8', hover: '#6366F1', bg: '#0F0E2A' },
  },
  {
    id: 'violet',
    label: 'Violett',
    light: { primary: '#7C3AED', hover: '#6D28D9', bg: '#F5F3FF' },
    dark:  { primary: '#A78BFA', hover: '#7C3AED', bg: '#1E1432' },
  },
  {
    id: 'rose',
    label: 'Rosé',
    light: { primary: '#E11D48', hover: '#BE123C', bg: '#FFF1F2' },
    dark:  { primary: '#FB7185', hover: '#F43F5E', bg: '#200D10' },
  },
]

const STORAGE_KEY = 'worldify_accent'

export function getStoredAccentId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? 'orange'
}

export function applyAccentPreset(presetId: string) {
  const preset = ACCENT_PRESETS.find((p) => p.id === presetId) ?? ACCENT_PRESETS[0]
  const isDark = document.documentElement.dataset.theme === 'dark'
  const colors = isDark ? preset.dark : preset.light

  document.documentElement.style.setProperty('--color-primary', colors.primary)
  document.documentElement.style.setProperty('--color-primary-hover', colors.hover)
  document.documentElement.style.setProperty('--color-primary-light', colors.bg)
  localStorage.setItem(STORAGE_KEY, preset.id)
}

export function loadAccentFromStorage() {
  applyAccentPreset(getStoredAccentId())
}
