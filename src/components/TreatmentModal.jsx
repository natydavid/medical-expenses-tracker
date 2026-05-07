import React, { useState, useRef, useCallback } from 'react'
import { useUpload } from '../hooks/useUpload'
import { applyAutoSent } from '../utils/progressHelpers'
import { driveViewUrl, computeFolderPath } from '../utils/driveApi'
import ConfirmDialog from './ConfirmDialog'

function newTreatment() {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    type: 'physiotherapy',
    provider: '',
    receiptId: '',
    description: '',
    cost: '',
    refund_ins1: '',
    refund_ins2: '',
    archived: false,
    files: [],
    sent_ins1: false,
    sent_ins2: false,
    driveFolder: null,
  }
}

// Normalise treatments that were saved in the old format (flat receipt/approval fields)
function normalise(t) {
  if (t.files) return { ...t }
  const files = []
  if (t.receipt)       files.push({ role: 'receipt',      fileId: t.receipt.fileId,      name: t.receipt.name })
  if (t.approval_ins1) files.push({ role: 'approval_ins1', fileId: t.approval_ins1.fileId, name: t.approval_ins1.name })
  if (t.approval_ins2) files.push({ role: 'approval_ins2', fileId: t.approval_ins2.fileId, name: t.approval_ins2.name })
  const { receipt, approval_ins1, approval_ins2, ...rest } = t
  return { ...rest, files, driveFolder: null }
}

const ROLE_LABELS = {
  receipt:      'Receipt',
  approval_ins1: 'Approval — Insurer 1',
  approval_ins2: 'Approval — Insurer 2',
}

const STEP_NUMS = {
  receipt: 1,
  approval_ins1: 3,
  approval_ins2: 5,
}

function FileUploadRow({ role, file, uploading, onUpload, onRemove }) {
  const inputRef = useRef(null)

  const handleChange = useCallback((e) => {
    const f = e.target.files[0]
    if (f) onUpload(f, role)
    e.target.value = ''
  }, [onUpload, role])

  const stepNum = STEP_NUMS[role]
  const done = !!file

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0
          ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
          {done ? '✓' : stepNum}
        </span>
        <span className="text-sm font-medium text-gray-700">{ROLE_LABELS[role]}</span>
      </div>

      <div className="pl-8">
        <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
        {file ? (
          <div className="flex items-center gap-2">
            <a
              href={driveViewUrl(file.fileId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline truncate max-w-[260px]"
              title={file.name}
            >
              📎 {file.name}
            </a>
            <button
              type="button"
              onClick={() => onRemove(role)}
              className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
            >
              Remove
            </button>
          </div>
        ) : uploading ? (
          <span className="text-sm text-blue-500 flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            Uploading…
          </span>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
          >
            + Upload file
          </button>
        )}
      </div>
    </div>
  )
}

function SentRow({ id, checked, autoLocked, label, onChange }) {
  return (
    <div className="flex items-center gap-3 pl-1">
      <input
        type="checkbox"
        id={id}
        checked={checked || autoLocked}
        onChange={onChange}
        disabled={autoLocked}
        className="w-4 h-4 text-blue-600 rounded"
      />
      <label htmlFor={id} className={`text-sm ${checked || autoLocked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
        {label}
        {autoLocked && <span className="text-xs text-gray-400 ml-1">(auto)</span>}
      </label>
    </div>
  )
}

export default function TreatmentModal({ treatment, onSave, onDelete, onClose }) {
  const isNew = !treatment?.id
  const [form, setForm] = useState(() => isNew ? newTreatment() : normalise(treatment))
  const [confirm, setConfirm] = useState(null)
  const { uploadFile, uploading, uploadError } = useUpload()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const getFile = (role) => form.files.find(f => f.role === role) || null

  const handleUpload = useCallback(async (file, role) => {
    try {
      const result = await uploadFile(file, role, form)
      setForm(f => ({
        ...f,
        files: [...f.files.filter(x => x.role !== role), { role, fileId: result.fileId, name: result.name }],
        driveFolder: result.folderPath,
        // auto-tick sent when approval is uploaded
        sent_ins1: f.sent_ins1 || role === 'approval_ins1',
        sent_ins2: f.sent_ins2 || role === 'approval_ins2',
      }))
    } catch {
      // uploadError already set in useUpload
    }
  }, [form, uploadFile])

  const handleRemove = (role) => {
    setForm(f => ({ ...f, files: f.files.filter(x => x.role !== role) }))
  }

  const handleSentToggle = (field) => {
    const approvalRole = field === 'sent_ins1' ? 'approval_ins1' : 'approval_ins2'
    if (form.files.some(f => f.role === approvalRole)) return
    set(field, !form[field])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleaned = applyAutoSent({
      ...form,
      cost:       parseFloat(form.cost) || 0,
      refund_ins1: parseFloat(form.refund_ins1) || 0,
      refund_ins2: parseFloat(form.refund_ins2) || 0,
      driveFolder: form.driveFolder || computeFolderPath(form),
    })
    onSave(cleaned)
  }

  const handleDelete = () => {
    setConfirm({
      title: 'Delete Treatment',
      message: 'Permanently delete this treatment? Files in Google Drive will remain.',
      onConfirm: () => { setConfirm(null); onDelete(form.id) },
      danger: true,
      confirmLabel: 'Delete',
    })
  }

  const sent1AutoLocked = form.files.some(f => f.role === 'approval_ins1')
  const sent2AutoLocked = form.files.some(f => f.role === 'approval_ins2')
  const anyUploading = Object.values(uploading).some(Boolean)
  // Show the folder that will actually be used for uploads:
  // if driveFolder is already locked (a file was uploaded), show that —
  // not a recomputed path that would give the user a false impression
  // that changing receiptId after uploading will change the Drive folder.
  const folderPreview = form.driveFolder || computeFolderPath(form)

  return (
    <>
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {isNew ? 'New Treatment' : 'Edit Treatment'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">

            {/* Basic info */}
            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="physiotherapy">Physiotherapy</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Provider / Clinic</label>
                  <input
                    type="text"
                    value={form.provider}
                    onChange={e => set('provider', e.target.value)}
                    placeholder="e.g. Maccabi Physiotherapy"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Receipt ID <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form.receiptId}
                    onChange={e => setForm(f => ({
                      ...f,
                      receiptId: e.target.value,
                      // If no files have been uploaded yet, clear driveFolder so the next
                      // upload computes the path fresh (picking up the new receiptId).
                      // If files already exist in Drive we can't move them, so leave it.
                      driveFolder: f.files.length === 0 ? null : f.driveFolder,
                    }))}
                    placeholder="e.g. 12345"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={2}
                  placeholder="Session notes, diagnosis, etc."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[['cost', 'Cost (₪)'], ['refund_ins1', 'Refund Ins. 1 (₪)'], ['refund_ins2', 'Refund Ins. 2 (₪)']].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form[key]}
                      onChange={e => set(key, e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Progress / files */}
            <section className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress & Files</h3>
              </div>

              {/* Drive folder preview */}
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono truncate" title={folderPreview}>
                📁 {folderPreview}
              </div>

              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                  Upload failed: {uploadError}
                </div>
              )}

              <div className="flex flex-col gap-4 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                {/* Step 1 — Receipt */}
                <FileUploadRow
                  role="receipt"
                  file={getFile('receipt')}
                  uploading={uploading['receipt']}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />

                {/* Step 2 — Sent to Ins. 1 */}
                <SentRow
                  id="sent_ins1"
                  checked={form.sent_ins1}
                  autoLocked={sent1AutoLocked}
                  label="Sent to Insurer 1"
                  onChange={() => handleSentToggle('sent_ins1')}
                />

                {/* Step 3 — Approval Ins. 1 */}
                <FileUploadRow
                  role="approval_ins1"
                  file={getFile('approval_ins1')}
                  uploading={uploading['approval_ins1']}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />

                {/* Step 4 — Sent to Ins. 2 */}
                <SentRow
                  id="sent_ins2"
                  checked={form.sent_ins2}
                  autoLocked={sent2AutoLocked}
                  label="Sent to Insurer 2"
                  onChange={() => handleSentToggle('sent_ins2')}
                />

                {/* Step 5 — Approval Ins. 2 */}
                <FileUploadRow
                  role="approval_ins2"
                  file={getFile('approval_ins2')}
                  uploading={uploading['approval_ins2']}
                  onUpload={handleUpload}
                  onRemove={handleRemove}
                />
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm text-red-500 hover:text-red-700 hover:underline"
                >
                  Delete
                </button>
              )}
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={anyUploading}
                  className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {anyUploading ? 'Uploading…' : isNew ? 'Add Treatment' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
