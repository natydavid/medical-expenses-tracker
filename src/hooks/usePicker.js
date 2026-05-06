import { useCallback, useEffect } from 'react'

export function usePicker() {
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.gapi) {
        clearInterval(interval)
        window.gapi.load('picker', () => {})
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const openPicker = useCallback((onPick) => {
    const token = window.__accessToken
    if (!token || !window.google?.picker) return

    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .setOAuthToken(token)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0]
          onPick({ fileId: doc.id, name: doc.name })
        }
      })
      .build()
    picker.setVisible(true)
  }, [])

  return { openPicker }
}
