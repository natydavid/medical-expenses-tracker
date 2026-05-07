import { useState, useEffect, useCallback } from 'react'

const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const LS_TOKEN_KEY = 'med_access_token'
const LS_EXPIRY_KEY = 'med_token_expiry'

function readStoredToken() {
  try {
    const token = localStorage.getItem(LS_TOKEN_KEY)
    const expiry = Number(localStorage.getItem(LS_EXPIRY_KEY))
    if (token && expiry && Date.now() < expiry - 60_000) return token
  } catch {}
  return null
}

function writeToken(token, expiresIn) {
  try {
    localStorage.setItem(LS_TOKEN_KEY, token)
    localStorage.setItem(LS_EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
  } catch {}
}

function clearStoredToken() {
  try {
    localStorage.removeItem(LS_TOKEN_KEY)
    localStorage.removeItem(LS_EXPIRY_KEY)
  } catch {}
}

export function useGoogleAuth() {
  // Read localStorage exactly once. Both initial states derive from this single value
  // so they can never disagree (e.g. token truthy but loading also true).
  // window.__accessToken is set synchronously here so Drive API calls work
  // the moment the first effect fires — no async gap.
  const [accessToken, setAccessToken] = useState(() => {
    const token = readStoredToken()
    if (token) window.__accessToken = token
    return token
  })
  const [loading, setLoading] = useState(() => {
    // loading is only true when we have NO stored token and must wait for GIS
    return !readStoredToken()
  })
  const [client, setClient] = useState(null)

  useEffect(() => {
    // Capture whether we had a stored token at mount time. If yes, GIS init
    // does not need to release the loading gate (it was never set).
    const startedWithToken = !!readStoredToken()

    const interval = setInterval(() => {
      if (!window.google?.accounts?.oauth2) return
      clearInterval(interval)

      const c = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.access_token) {
            window.__accessToken = resp.access_token
            writeToken(resp.access_token, resp.expires_in || 3600)
            setAccessToken(resp.access_token)
          }
          setLoading(false)
        },
      })

      setClient(c)

      // Release the loading gate now that GIS is ready — but only when we
      // had no stored token. If we did, loading was already false on mount.
      if (!startedWithToken) setLoading(false)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const signIn = useCallback(() => {
    if (client) {
      setLoading(true)
      client.requestAccessToken()
    }
  }, [client])

  const signOut = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken)
    }
    clearStoredToken()
    window.__accessToken = null
    setAccessToken(null)
  }, [accessToken])

  return { accessToken, loading, signIn, signOut }
}
