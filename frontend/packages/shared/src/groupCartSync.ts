import { useEffect } from 'react'
import { useCartStore } from './cartStore'
import { listenForCartUpdates } from './sharedCart'
import type { CartUpdatePayload } from './types'

// Mount once near the app root (not per-screen) — a teammate can add an
// item while this device is sitting on the menu screen, not the table-cart
// screen, and that broadcast still needs somewhere to land.
export function useGroupCartSync() {
  const groupRoom = useCartStore((s) => s.groupRoom)
  const applyRemoteUpdate = useCartStore((s) => s.applyRemoteUpdate)

  useEffect(() => {
    if (!groupRoom) return
    const unsubscribe = listenForCartUpdates(groupRoom, (payload: CartUpdatePayload) => {
      applyRemoteUpdate(payload)
    })
    return unsubscribe
  }, [groupRoom, applyRemoteUpdate])
}
