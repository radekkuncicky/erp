export const PROTOCOL_SUMMARY_PROMPT = (data: {
  orderNumber: string
  clientName: string
  items: Array<{ name: string; quantity: number; isInstalled: boolean; notes?: string }>
  notes?: string
  handoverDate: string
}) => `Vytvoř stručné shrnutí předávacího protokolu zakázky ${data.orderNumber} pro klienta ${data.clientName}.

Datum předání: ${data.handoverDate}

Položky:
${data.items.map((i) => `- ${i.name} (${i.quantity}x) — ${i.isInstalled ? "nainstalováno" : "NENAINSTALOVÁNO"}${i.notes ? ` — pozn.: ${i.notes}` : ""}`).join("\n")}

${data.notes ? `Poznámky technika: ${data.notes}` : ""}

Shrň ve 2–3 větách: co bylo předáno, zda byly nějaké problémy, celkový stav.`

export const DEFECT_SUGGESTION_PROMPT = (description: string) =>
  `Technik na stavbě popsal tento problém: "${description}"

Navrhni 2–3 stručné kroky, jak problém vyřešit. Zaměř se na HVAC systémy (klimatizace, tepelná čerpadla, rekuperace). Buď praktický a konkrétní.`

export const DASHBOARD_INSIGHTS_PROMPT = (data: {
  activeOrders: number
  overdueOrders: number
  lowStockItems: number
  pendingSettlements: number
}) => `Stav firmy NANTO:
- Aktivních zakázek: ${data.activeOrders}
- Po termínu: ${data.overdueOrders}
- Nízký stav skladu: ${data.lowStockItems} položek
- Nevyúčtovaných: ${data.pendingSettlements}

Navrhni 1–2 věty s doporučením, na co se zaměřit. Buď stručný, věcný, bez superlativů.`

export const FINANCIAL_CROSSCHECK_PROMPT = (data: {
  orderTotal: number
  materialTotal: number
  laborTotal: number
  otherCosts: number
  depositPaid: number
  remaining: number
}) => `Zkontroluj finanční data vyúčtování:
- Celková cena zakázky: ${data.orderTotal} Kč
- Materiál: ${data.materialTotal} Kč
- Práce: ${data.laborTotal} Kč
- Ostatní: ${data.otherCosts} Kč
- Zaplacená záloha: ${data.depositPaid} Kč
- Doplatek: ${data.remaining} Kč

Pokud jsou čísla v pořádku, napiš "OK". Pokud vidíš nesrovnalost (např. materiál+práce neodpovídá celku, záporný doplatek), upozorni stručně.`
