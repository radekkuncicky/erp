"use server"

import { generateText } from "./client"
import { PROTOCOL_SUMMARY_PROMPT, DEFECT_SUGGESTION_PROMPT, DASHBOARD_INSIGHTS_PROMPT } from "./prompts"

export async function generateProtocolSummary(data: {
  orderNumber: string
  clientName: string
  items: Array<{ name: string; quantity: number; isInstalled: boolean; notes?: string }>
  notes?: string
  handoverDate: string
}): Promise<{ data: string | null; error: string | null }> {
  try {
    const prompt = PROTOCOL_SUMMARY_PROMPT(data)
    const summary = await generateText(prompt)
    return { data: summary, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba AI"
    return { data: null, error: message }
  }
}

export async function generateDefectSuggestion(description: string): Promise<{ data: string | null; error: string | null }> {
  try {
    const prompt = DEFECT_SUGGESTION_PROMPT(description)
    const suggestion = await generateText(prompt)
    return { data: suggestion, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba AI"
    return { data: null, error: message }
  }
}

export async function generateDashboardInsights(data: {
  activeOrders: number
  overdueOrders: number
  lowStockItems: number
  pendingSettlements: number
}): Promise<{ data: string | null; error: string | null }> {
  try {
    const prompt = DASHBOARD_INSIGHTS_PROMPT(data)
    const insights = await generateText(prompt)
    return { data: insights, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba AI"
    return { data: null, error: message }
  }
}
