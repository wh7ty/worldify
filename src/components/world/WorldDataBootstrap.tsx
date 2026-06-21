import { useEffect } from 'react'
import { useWorldStore } from '../../store/useWorldStore'

export default function WorldDataBootstrap() {
  const isAuthenticated = useWorldStore((state) => state.isAuthenticated)
  const authReady = useWorldStore((state) => state.authReady)
  const loadWorldData = useWorldStore((state) => state.loadWorldData)

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      return
    }

    void loadWorldData()
  }, [authReady, isAuthenticated, loadWorldData])

  return null
}
