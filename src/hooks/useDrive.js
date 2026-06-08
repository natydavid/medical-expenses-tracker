import { useState, useCallback } from 'react'
import { loadTreatments, saveTreatments } from '../utils/driveApi'

export function useDrive(onAuthError) {
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
      if (e.status === 401 && onAuthError) {
        onAuthError()
      } else {
        setError(e.message)
      }
    } finally {
      setSyncing(false)
    }
  }, [onAuthError])

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
