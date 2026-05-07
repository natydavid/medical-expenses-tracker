import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import SignIn from './components/SignIn'
import Dashboard from './components/Dashboard'

function Spinner({ label }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  )
}

function LoadError({ error, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4 text-center p-6 max-w-sm">
        <div className="text-red-400 text-5xl">⚠</div>
        <p className="text-gray-800 font-semibold">Could not load treatments</p>
        <p className="text-sm text-gray-500 break-words">{error}</p>
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

function Inner() {
  const { auth, drive } = useApp()

  if (auth.loading) return <Spinner label="Connecting to Google…" />
  if (!auth.accessToken) return <SignIn />

  // Authenticated — wait for the initial Drive load
  if (!drive.loaded) {
    if (drive.error) return <LoadError error={drive.error} onRetry={drive.load} />
    return <Spinner label="Loading your treatments…" />
  }

  return <Dashboard />
}

export default function App() {
  return (
    <AppProvider>
      <Inner />
    </AppProvider>
  )
}
