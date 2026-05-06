import { useState, useEffect, useCallback } from 'react'

// drive.file: create/read/write files and folders the app creates
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

export function useGoogleAuth() {
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval)
        const c = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (resp) => {
            if (resp.access_token) {
              window.__accessToken = resp.access_token
              setAccessToken(resp.access_token)
            }
            setLoading(false)
          },
        })
        setClient(c)
        setLoading(false)
      }
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
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken)
    }
    window.__accessToken = null
    setAccessToken(null)
  }, [accessToken])

  return { accessToken, loading, signIn, signOut }
}
