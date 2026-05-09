import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { isComplete, isInProgress } from '../utils/progressHelpers'
import { deleteTreatmentFolder, moveTreatmentFiles, computeFolderPath } from '../utils/driveApi'
import TotalsPanel from './TotalsPanel'
import MonthlyChart from './MonthlyChart'
import FilterBar from './FilterBar'
import TreatmentsTable from './TreatmentsTable'
import TreatmentModal from './TreatmentModal'
import ConfirmDialog from './ConfirmDialog'

const DEFAULT_FILTERS = { status: 'all', type: 'all', from: '', to: '' }

function applyFilters(treatments, filters, archiveMode) {
  return treatments
    .filter(t => archiveMode ? t.archived : !t.archived)
    .filter(t => {
      if (filters.status === 'complete') return isComplete(t)
      if (filters.status === 'in-progress') return isInProgress(t)
      if (filters.status === 'not-started') return !isComplete(t) && !isInProgress(t)
      return true
    })
    .filter(t => filters.type === 'all' || t.type === filters.type)
    .filter(t => !filters.from || t.date >= filters.from + '-01')
    .filter(t => !filters.to || t.date <= filters.to + '-31')
    .sort((a, b) => b.date.localeCompare(a.date))
}

export default function Dashboard() {
  const { auth, drive } = useApp()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [archiveMode, setArchiveMode] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [archiveConfirm, setArchiveConfirm] = useState(null)

  const filtered = useMemo(
    () => applyFilters(drive.treatments, filters, archiveMode),
    [drive.treatments, filters, archiveMode]
  )

  const openNew = () => { setEditTarget(null); setShowModal(true) }
  const openEdit = (t) => { setEditTarget(t); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditTarget(null) }

  const handleSave = async (updated) => {
    const exists = drive.treatments.find(t => t.id === updated.id)
    let treatmentToSave = updated

    if (exists && updated.driveFolder) {
      const newFolder = computeFolderPath(updated)
      if (newFolder !== updated.driveFolder) {
        if (updated.files.length > 0) {
          // Path-affecting fields changed and files exist — move them to the new folder.
          // On failure keep the old driveFolder so files remain accessible.
          try {
            const moved = await moveTreatmentFiles(updated.driveFolder, newFolder, updated.files)
            treatmentToSave = { ...updated, driveFolder: moved }
          } catch {
            treatmentToSave = updated
          }
        } else {
          // No files to move — clear driveFolder so the next upload recomputes
          // the path from the current fields instead of using the stale path.
          treatmentToSave = { ...updated, driveFolder: null }
        }
      }
    }

    const next = exists
      ? drive.treatments.map(t => t.id === updated.id ? treatmentToSave : t)
      : [...drive.treatments, treatmentToSave]
    await drive.save(next)
    closeModal()
  }

  const handleDelete = async (id) => {
    const treatment = drive.treatments.find(t => t.id === id)
    await drive.save(drive.treatments.filter(t => t.id !== id))
    // Delete the Drive folder after the JSON is updated so a Drive failure
    // never leaves a phantom record in the app.
    if (treatment?.driveFolder) {
      try { await deleteTreatmentFolder(treatment.driveFolder) } catch {}
    }
    closeModal()
  }

  const handleArchive = (t) => {
    setArchiveConfirm(t)
  }

  const confirmArchive = async () => {
    const t = archiveConfirm
    setArchiveConfirm(null)
    await drive.save(drive.treatments.map(x => x.id === t.id ? { ...x, archived: true } : x))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <span className="text-xl">🏥</span>
          <h1 className="text-base font-bold text-gray-900 tracking-tight">Medical Expenses</h1>
          {drive.syncing && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Saving…</span>
          )}
          {drive.error && (
            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full" title={drive.error}>⚠ Sync error</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setArchiveMode(m => !m)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition ${archiveMode ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {archiveMode ? '📦 Archive Mode' : '📦 Archive'}
            </button>
            <button
              onClick={openNew}
              className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              + New Treatment
            </button>
            <button
              onClick={auth.signOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {!archiveMode && (
          <>
            <TotalsPanel treatments={drive.treatments} />
            <MonthlyChart treatments={drive.treatments} />
          </>
        )}

        {archiveMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 font-medium">
            Showing archived (completed) treatments
          </div>
        )}

        <FilterBar filters={filters} onChange={setFilters} />

        <TreatmentsTable
          treatments={filtered}
          onEdit={openEdit}
          onArchive={handleArchive}
        />
      </main>

      {showModal && (
        <TreatmentModal
          treatment={editTarget}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}

      {archiveConfirm && (
        <ConfirmDialog
          title="Archive Treatment"
          message={`Archive "${archiveConfirm.provider || 'this treatment'}"? It will be hidden from the main view but you can find it in Archive Mode.`}
          confirmLabel="Archive"
          onConfirm={confirmArchive}
          onCancel={() => setArchiveConfirm(null)}
        />
      )}
    </div>
  )
}
