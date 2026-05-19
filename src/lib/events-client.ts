// Client-side helper pour émettre un event de tracking depuis le navigateur.
// Utilise `sendBeacon` quand dispo (n'est pas annulé même si la page se ferme
// pendant le scroll/click), fallback `fetch keepalive` pour les vieux user-agents
// ou si la queue beacon est pleine.
//
// Best-effort : un event raté n'a pas vocation à faire crasher l'UI. La promise
// est jamais rethrown.

type EventKind =
  | 'SCROLL_50'
  | 'SCROLL_COMPLETE'
  | 'INTERACTION_START'
  | 'INTERACTION_DONE'

export function sendEvent(dropSlug: string, kind: EventKind): void {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({ dropSlug, kind })

  // sendBeacon préféré : survit à un unmount / fermeture d'onglet. Wrap en Blob
  // pour forcer le Content-Type — sinon le serveur le voit comme text/plain.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' })
    if (navigator.sendBeacon('/api/events', blob)) return
    // Si sendBeacon refuse (queue pleine), on tombe sur le fallback fetch.
  }

  // Fallback : fetch keepalive — équivalent moderne de sendBeacon pour les
  // navigateurs qui le préfèrent ou en cas de saturation queue.
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* swallow — tracking best-effort */
  })
}
