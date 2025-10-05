type EmailMap = Record<string, string | string[]>

const parseList = (val?: string) => (val || '')
  .split(/[,;\s]+/)
  .map(s => s.trim())
  .filter(Boolean)

const sanitizeKey = (name: string) => name
  .toUpperCase()
  .replace(/&/g, 'AND')
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const loadMapFromJson = (): EmailMap | null => {
  const raw = (import.meta as any).env?.VITE_CARRIER_EMAIL_MAP as string | undefined
  if (!raw) return null
  try {
    // Allow users to wrap the JSON in single quotes in .env files / dashboards
    let text = raw.trim()
    if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith("`") && text.endsWith("`"))) {
      text = text.slice(1, -1)
    }
    const parsed = JSON.parse(text) as EmailMap
    return parsed || null
  } catch (e) {
    console.warn('VITE_CARRIER_EMAIL_MAP is not valid JSON')
    return null
  }
}

export const getEmailsForCarrier = (carrier: string): string[] => {
  const envObj = (import.meta as any).env || {}
  const map = loadMapFromJson()
  if (map) {
    // Case-insensitive lookup
    const entry = Object.entries(map).find(([k]) => k.toLowerCase() === carrier.toLowerCase())?.[1]
    if (entry) return Array.isArray(entry) ? entry : parseList(entry as string)
  }

  const key = `VITE_CALLIN_EMAIL_TO_${sanitizeKey(carrier)}`
  const specific = envObj[key] as string | undefined
  if (specific) return parseList(specific)

  const fallback = envObj.VITE_CALLIN_EMAIL_TO as string | undefined
  return parseList(fallback)
}

export const envKeySuffixForCarrier = (carrier: string): string => sanitizeKey(carrier)
