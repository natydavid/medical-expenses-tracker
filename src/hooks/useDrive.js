import { useState, useCallback } from 'react'
import { loadTreatments, saveTreatments } from '../utils/driveApi'

export function useDrive() {
  const [treatments, setTreatments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const data = await loadTreatments()
      setTreatments(data.treatments || [])
      setLoaded(true)
    } catch (e) {
      // Surface the error — never silently fall back to empty data
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  const save = useCallback(async (updatedTreatments) => {
    setSyncing(true)
    setError(null)
    try {
      await saveTreatments({ version: 1, treatments: updatedTreatments })
      setTreatments(updatedTreatments)
    } catch (e) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  return { treatments, loaded, syncing, error, load, save }
}
