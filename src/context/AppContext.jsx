import React, { createContext, useContext, useEffect } from 'react'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { useDrive } from '../hooks/useDrive'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const auth = useGoogleAuth()
  const drive = useDrive(auth.signOut)

  useEffect(() => {
    if (auth.accessToken) {
      drive.load()
    }
  }, [auth.accessToken, drive.load])

  return (
    <AppContext.Provider value={{ auth, drive }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
