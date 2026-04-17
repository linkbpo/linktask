/**
 * Gera um access_token Google a partir de uma Service Account JSON.
 * Implementa o fluxo JWT Bearer: https://developers.google.com/identity/protocols/oauth2/service-account
 */

interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri: string
}

export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON secret not set')

  const sa: ServiceAccount = JSON.parse(saJson)
  if (!sa.client_email || !sa.private_key || !sa.token_uri) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing required fields (client_email, private_key, token_uri)')
  }
  const now = Math.floor(Date.now() / 1000)

  // Build JWT header + payload
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: unknown): string => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj))
    let str = ''
    for (const b of bytes) str += String.fromCharCode(b)
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  // Import RSA private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const signatureB64 = btoa(
    new Uint8Array(signature).reduce((s, b) => s + String.fromCharCode(b), '')
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const jwt = `${signingInput}.${signatureB64}`

  // Exchange JWT for access_token
  const tokenRes = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Failed to get Google access token: ${err}`)
  }

  const { access_token } = await tokenRes.json()
  if (!access_token) throw new Error('Google token response did not include access_token')
  return access_token
}
