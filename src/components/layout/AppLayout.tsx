import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import SettingsModal from '../settings/SettingsModal'
import EntityModal from '../entities/EntityModal'
import CategoryModal from '../categories/CategoryModal'
import WorldDataBootstrap from '../world/WorldDataBootstrap'
import UniverseModal from '../world/UniverseModal'
import SearchPanel from '../search/SearchPanel'
import ConfirmDialog from '../shared/ConfirmDialog'
import type { EntityType, SidebarCategoryItem, SidebarLibraryItem, Universe } from '../../data/mockWorld'
import { useWorldStore } from '../../store/useWorldStore'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { loadAccentFromStorage } from '../../lib/accentColor'
import { supabase } from '../../lib/supabase'
import { loadUniverseSettingsFromSupabase } from '../../lib/supabaseSettings'
import { cacheLibraryItemsForScope } from '../../lib/libraryItems'
import { cacheDashboardContainersForScope } from '../../lib/dashboardContainers'
import { restoreEntityOrderFromRemote } from '../../lib/entityOrder'
import { setPinnedForUniverse } from '../../lib/entityPins'
import { loadCategoryBannersFromDB } from '../../lib/categoryBanner'
import { runAutoBackupForUniverse } from '../../lib/backupAutomation'

export default function AppLayout() {
  const universes = useWorldStore((state) => state.universes)
  const removeLibraryItem = useWorldStore((state) => state.removeLibraryItem)
  const toast = useWorldStore((state) => state.toast)
  const clearToast = useWorldStore((state) => state.clearToast)
  const confirmDialog = useWorldStore((state) => state.confirmDialog)
  const isLoadingWorld = useWorldStore((state) => state.isLoadingWorld)
  const user = useWorldStore((state) => state.user)
  const activeUniverseId = useWorldStore((state) => state.activeUniverseId)
  const entities = useWorldStore((state) => state.entities)
  const libraryItems = useWorldStore((state) => state.libraryItems)
  const location = useLocation()
  const navigate = useNavigate()
  const isEntityPage = location.pathname.startsWith('/entities/') || location.pathname === '/graph'
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SidebarCategoryItem | null>(null)
  const [universeCreateOpen, setUniverseCreateOpen] = useState(false)
  const [editingUniverse, setEditingUniverse] = useState<Universe | null>(null)
  const [createInitialType, setCreateInitialType] = useState<EntityType | undefined>(undefined)
  const [createInitialCategorySlug, setCreateInitialCategorySlug] = useState<string | undefined>(undefined)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 768

  const openCreateModal = (type?: EntityType, categorySlug?: string) => {
    setCreateInitialType(type)
    setCreateInitialCategorySlug(categorySlug)
    setCreateOpen(true)
  }

  // Init dark mode + accent color from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('worldify_theme')
    if (saved === 'dark') document.documentElement.dataset.theme = 'dark'
    loadAccentFromStorage()
  }, [])

  // Keep universe settings aligned across browsers.
  useEffect(() => {
    if (!user || !activeUniverseId) return
    let disposed = false

    const applyRemoteSettings = (settings: {
      library_items: SidebarLibraryItem[]
      dashboard_containers: ReturnType<typeof useWorldStore.getState>['dashboardContainers']
      entity_order: Record<string, string[]>
      entity_pins: string[]
      category_banners: Record<string, string>
    }) => {
      if (disposed) return
      cacheLibraryItemsForScope(user.id, activeUniverseId, settings.library_items)
      cacheDashboardContainersForScope(user.id, activeUniverseId, settings.dashboard_containers)
      restoreEntityOrderFromRemote(user.id, activeUniverseId, settings.entity_order)
      setPinnedForUniverse(activeUniverseId, settings.entity_pins)
      loadCategoryBannersFromDB(settings.category_banners)
      useWorldStore.setState({
        libraryItems: settings.library_items,
        dashboardContainers: settings.dashboard_containers,
        pinnedEntityIds: settings.entity_pins,
      })
    }
    const refreshCategories = async () => {
      const settings = await loadUniverseSettingsFromSupabase(user.id, activeUniverseId)
      if (settings) applyRemoteSettings(settings)
    }
    const handleFocus = () => { void refreshCategories() }
    const handleVisibility = () => { if (document.visibilityState === 'visible') void refreshCategories() }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    const channel = supabase
      .channel(`worldify-library-items-${activeUniverseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'universe_settings', filter: `universe_id=eq.${activeUniverseId}` },
        (payload) => {
          const next = payload.new as {
            library_items?: SidebarLibraryItem[]
            dashboard_containers?: ReturnType<typeof useWorldStore.getState>['dashboardContainers']
            entity_order?: Record<string, string[]>
            entity_pins?: string[]
            category_banners?: Record<string, string>
          }
          if (next.library_items || next.dashboard_containers || next.entity_order || next.entity_pins || next.category_banners) {
            applyRemoteSettings({
              library_items: next.library_items ?? [],
              dashboard_containers: next.dashboard_containers ?? [],
              entity_order: next.entity_order ?? {},
              entity_pins: next.entity_pins ?? [],
              category_banners: next.category_banners ?? {},
            })
          }
        },
      )
      .subscribe()
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshCategories()
    }, 30_000)
    void refreshCategories()

    return () => {
      disposed = true
      window.clearInterval(pollId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [activeUniverseId, user])

  useEffect(() => {
    if (!user || !activeUniverseId) return

    let running = false
    const runBackup = async () => {
      if (running) return
      const activeUniverse = useWorldStore.getState().universes.find((item) => item.id === activeUniverseId)
      if (!activeUniverse) return
      const exportEntities = useWorldStore.getState().entities.filter((entity) => entity.universeId === activeUniverseId)
      if (exportEntities.length === 0) return

      running = true
      try {
        const result = await runAutoBackupForUniverse({
          entities: exportEntities,
          libraryItems: useWorldStore.getState().libraryItems,
          universeName: activeUniverse.name,
          universeId: activeUniverseId,
        })
        if (result.saved) {
          useWorldStore.getState().showToast(`Auto-Backup gespeichert (${result.filename})`)
        }
      } catch (error) {
        useWorldStore.getState().showToast(error instanceof Error ? error.message : 'Auto-Backup fehlgeschlagen')
      } finally {
        running = false
      }
    }

    const handleFocus = () => { void runBackup() }
    const handleVisibility = () => { if (document.visibilityState === 'visible') void runBackup() }

    void runBackup()
    const intervalId = window.setInterval(() => { void runBackup() }, 60 * 60 * 1000)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeUniverseId, entities, libraryItems, user])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        return
      }

      if (!isInInput && event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        setCreateOpen(true)
      }

      if (!isInInput && event.key === 'g' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        navigate('/graph')
      }

      if (!isInInput && event.key === 's' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        navigate('/stats')
      }

      if (!isInInput && event.key === 't' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        navigate('/trash')
      }

      if (!isInInput && event.key === 'a' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        navigate('/archive')
      }

      if (!isInInput && event.key === '?' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setShortcutsOpen((v) => !v)
      }

      if (event.key === 'Escape') {
        setShortcutsOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <WorldDataBootstrap />

      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen ? (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28,25,23,0.35)',
            zIndex: 40,
            animation: 'fadeIn 150ms ease',
          }}
        />
      ) : null}

      <Sidebar
        isMobile={isMobile}
        isOpen={isMobile ? sidebarOpen : true}
        isCollapsed={!isMobile && sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCategories={() => {
          setEditingCategory(null)
          setCategoriesOpen(true)
        }}
        onOpenUniverseCreate={() => setUniverseCreateOpen(true)}
        onOpenUniverseEdit={(universeId) => {
          const universe = universes.find((item) => item.id === universeId) ?? null
          setEditingUniverse(universe)
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          onOpenCreate={openCreateModal}
          onOpenSettings={() => setSettingsOpen(true)}
          isMobile={isMobile}
          onOpenSidebar={() => setSidebarOpen(true)}
          showBack={isEntityPage}
          onBack={() => navigate(-1)}
        />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--color-bg)',
            padding: isMobile ? 16 : 32,
          }}
        >
          {isLoadingWorld ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Welt wird geladen…</span>
            </div>
          ) : (
            <Outlet context={{ openCreateModal, openCategoryEdit: (category: SidebarCategoryItem) => {
              setEditingCategory(category)
              setCategoriesOpen(true)
            } }} />
          )}
        </main>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <EntityModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setCreateInitialType(undefined)
          setCreateInitialCategorySlug(undefined)
        }}
        initialType={createInitialType}
        initialCategorySlug={createInitialCategorySlug}
      />
      <CategoryModal
        open={categoriesOpen}
        onClose={() => {
          setCategoriesOpen(false)
          setEditingCategory(null)
        }}
        onDeleteCategory={(category) => {
          removeLibraryItem(category.id)
          setCategoriesOpen(false)
          setEditingCategory(null)

          if (location.pathname === `/${category.slug}`) {
            navigate('/')
          }
        }}
        editingCategory={editingCategory}
      />
      <UniverseModal open={universeCreateOpen} onClose={() => setUniverseCreateOpen(false)} />
      <UniverseModal
        open={Boolean(editingUniverse)}
        onClose={() => setEditingUniverse(null)}
        universe={editingUniverse}
      />
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ConfirmDialog
        open={Boolean(confirmDialog?.open)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmVariant={confirmDialog?.confirmVariant}
        onConfirm={() => confirmDialog?.onConfirm?.()}
        onCancel={() => confirmDialog?.onCancel?.()}
      />

      {/* Toast notification */}
      {toast ? (
        <div
          key={toast.id}
          onClick={clearToast}
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            backgroundColor: 'var(--color-text)',
            color: 'var(--color-bg)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-lg)',
            fontSize: 13,
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            boxShadow: 'var(--shadow-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            animation: 'toastIn 200ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toast.message}
        </div>
      ) : null}
      {shortcutsOpen ? (
        <>
          <div onClick={() => setShortcutsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 301, width: 'min(420px, calc(100vw - 32px))', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>Tastaturkürzel</span>
              <button onClick={() => setShortcutsOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>✕</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {[
                { keys: ['⌘', 'K'], label: 'Suche öffnen' },
                { keys: ['N'], label: 'Neue Entity erstellen' },
                { keys: ['G'], label: 'Graph öffnen' },
                { keys: ['S'], label: 'Statistik öffnen' },
                { keys: ['T'], label: 'Papierkorb öffnen' },
                { keys: ['A'], label: 'Archiv öffnen' },
                { keys: ['?'], label: 'Diese Übersicht' },
                { keys: ['Esc'], label: 'Modal / Panel schließen' },
                { keys: ['↑', '↓'], label: 'Suchergebnis navigieren' },
                { keys: ['↵'], label: 'Suchergebnis öffnen' },
              ].map(({ keys, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}>{label}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {keys.map((k) => (
                      <kbd key={k} style={{ padding: '2px 7px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--color-text-secondary)' }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}>Kürzel funktionieren außerhalb von Eingabefeldern</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
