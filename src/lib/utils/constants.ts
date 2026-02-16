export const APP_NAME = "NANTO ERP"
export const APP_DESCRIPTION = "Správa zakázek a skladů"

// Order status workflow - defines valid transitions
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  novy: ["potvrzeny"],
  potvrzeny: ["v_priprave", "novy"],
  v_priprave: ["naplanovany", "potvrzeny"],
  naplanovany: ["v_realizaci", "v_priprave"],
  v_realizaci: ["predano", "naplanovany"],
  predano: ["vyuctovano", "v_realizaci"],
  vyuctovano: ["dokonceny", "predano"],
  dokonceny: [],
}

// Categories from Raynet
export const CATEGORIES = [
  "Klimatizace",
  "Tepelná čerpadla",
  "Rekuperace",
  "Větrání",
] as const

// Stock thresholds
export const LOW_STOCK_THRESHOLD = 2

// File upload limits
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024 // 25MB
export const MAX_SIGNATURE_SIZE = 1 * 1024 * 1024 // 1MB
export const PHOTO_COMPRESSION_MAX_WIDTH = 2000
export const PHOTO_COMPRESSION_QUALITY = 0.85

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20

// AI rate limits
export const AI_RATE_LIMIT_PER_MINUTE = 10
