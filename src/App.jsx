import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import SignIn from './components/SignIn'
import Dashboard from './components/Dashboard'

function Inner() {
  const { auth } = useApp()

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Connecting to Google…</span>
        </div>
      </div>
    )
  }

  if (!auth.accessToken) return <SignIn />
  return <Dashboard />
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
