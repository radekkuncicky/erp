import { format, formatDistanceToNow, parseISO } from "date-fns"
import { cs } from "date-fns/locale"

// Czech currency formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Czech number formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("cs-CZ").format(num)
}

// Czech date formatting
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "d. M. yyyy", { locale: cs })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "d. M. yyyy HH:mm", { locale: cs })
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "d. M.", { locale: cs })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return formatDistanceToNow(d, { locale: cs, addSuffix: true })
}

// Phone formatting
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, "")
  if (cleaned.startsWith("+420") && cleaned.length === 13) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`
  }
  return phone
}

// Order status labels in Czech
export const ORDER_STATUS_LABELS: Record<string, string> = {
  novy: "Nový",
  potvrzeny: "Potvrzený",
  v_priprave: "V přípravě",
  naplanovany: "Naplánovaný",
  v_realizaci: "V realizaci",
  predano: "Předáno",
  vyuctovano: "Vyúčtováno",
  dokonceny: "Dokončený",
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  novy: "bg-blue-100 text-blue-800",
  potvrzeny: "bg-purple-100 text-purple-800",
  v_priprave: "bg-yellow-100 text-yellow-800",
  naplanovany: "bg-indigo-100 text-indigo-800",
  v_realizaci: "bg-orange-100 text-orange-800",
  predano: "bg-green-100 text-green-800",
  vyuctovano: "bg-emerald-100 text-emerald-800",
  dokonceny: "bg-gray-100 text-gray-800",
}

// Unit labels in Czech
export const UNIT_LABELS: Record<string, string> = {
  ks: "ks",
  m: "m",
  m2: "m²",
  hod: "hod",
  komplet: "kpl",
}

// Map Raynet unit number to our enum
export function mapRaynetUnit(unitNumber: number): string {
  const unitMap: Record<number, string> = {
    1: "ks",
    2: "m",
    3: "m2",
    4: "hod",
    5: "komplet",
  }
  return unitMap[unitNumber] || "ks"
}
