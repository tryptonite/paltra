type ComposeOptions = {
  to: string[]
  cc?: string[]
  subject?: string
  body?: string
  html?: boolean
  // Hints to keep users in their existing Outlook Web session
  loginHint?: string // user@company.com
  realm?: string // company.com tenant domain
  host?: string // outlook.office.com | outlook.office365.com | outlook.live.com
  composeStyle?: 'deeplink' | 'owa'
}

const buildOwaComposeUrl = ({
  to,
  cc = [],
  subject = '',
  body = '',
  html = false,
  loginHint,
  realm,
  host,
  composeStyle,
}: ComposeOptions) => {
  const resolvedHost = host || (import.meta as any).env?.VITE_OUTLOOK_HOST || 'outlook.office.com'
  const style = composeStyle || (import.meta as any).env?.VITE_OUTLOOK_COMPOSE_STYLE || 'owa'

  const base = style === 'owa'
    ? `https://${resolvedHost}/owa/`
    : `https://${resolvedHost}/mail/deeplink/compose`

  const params = new URLSearchParams()

  if (to?.length) params.set('to', to.join(';'))
  if (cc?.length) params.set('cc', cc.join(';'))
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  if (html) params.set('bodyIsHtml', 'true')

  // Help OWA pick the right tenant/account without prompting
  const envRealm = (import.meta as any).env?.VITE_OUTLOOK_REALM as string | undefined
  const realmParam = realm || envRealm
  const loginHintParam = loginHint || ((import.meta as any).env?.VITE_OUTLOOK_LOGIN_HINT as string | undefined)
  if (realmParam) params.set('realm', realmParam)
  if (loginHintParam) params.set('login_hint', loginHintParam)

  // For the /owa style, we must include a path param
  if (style === 'owa') {
    params.set('path', '/mail/action/compose')
    // exsvurl helps route to the expected tenant context without extra prompts
    params.set('exsvurl', '1')
  }

  return `${base}?${params.toString()}`
}

export const openOutlookCompose = (opts: ComposeOptions) => {
  try {
    const url = buildOwaComposeUrl(opts)
    // Prefer opening in a new tab so users keep context
    const win = window.open(url, '_blank', 'noopener')
    // If popup was blocked, fall back to same-tab navigation (still Outlook Web)
    if (win == null) window.location.assign(url)
  } catch (e) {
    console.error('Failed to open Outlook compose link', e)
    // As a final fallback, try same-tab navigation to Outlook Web
    // Never fall back to native mail clients per requirements
    try { const url = buildOwaComposeUrl(opts); window.location.assign(url) } catch {}
  }
}

export { buildOwaComposeUrl }
