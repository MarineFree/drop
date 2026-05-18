// Liste de métiers proposés à l'onboarding. Alignée avec le pitch deck slide 06.
// Le `value` est ce qui est stocké en DB (User.trade) et passé au prompt IA plus tard.
// Le `label` est affiché à l'utilisateur.
export const TRADES = [
  { value: 'artisans', label: 'Artisans' },
  { value: 'conseil-b2b', label: 'Conseil B2B' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'sante-bien-etre', label: 'Santé / Bien-être' },
  { value: 'formation', label: 'Formation' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'e-commerce-niche', label: 'E-commerce niche' },
  { value: 'autre', label: 'Autre' },
] as const

export type TradeValue = (typeof TRADES)[number]['value']
export const TRADE_VALUES: readonly TradeValue[] = TRADES.map(t => t.value)
