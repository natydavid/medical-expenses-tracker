import React, { useState, useEffect } from 'react'
import { usePicker } from '../hooks/usePicker'
import { applyAutoSent, computeSteps } from '../utils/progressHelpers'
import { driveViewUrl } from '../utils/driveApi'
import ConfirmDialog from './ConfirmDialog'

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  type: 'physiotherapy',
  provider: '',
  description: '',
  cost: '',
  refund_ins1: '',
  refund_ins2: '',
  archived: false,
  receipt: null,
  approval_ins1: null,
  approval_ins2: null,
  sent_ins1: false,
  sent_ins2: false,
}

function FileAttachment({ label, file, onAttach, onRemove }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-32 flex-shrink-0">{label}</span>
      {file ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <a
            href={driveViewUrl(file.fileId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline truncate max-w-[220px]"
            title={file.name}
          >
            📎 {file.name}
          </a>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAttach}
          className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 transition"
        >
          + Attach from Drive
        </button>
      )}
    </div>
  )
}

export default function TreatmentModal({ treatment, onSave, onDelete, onClose }) {
  const isNew = !treatment?.id
  const [form, setForm] = useState(isNew ? EMPTY : { ...treatment })
  const [confirm, setConfirm] = useState(null)
  const { openPicker } = usePicker()

  useEffect(() => {
    setForm(isNew ? EMPTY : { ...treatment })
  }, [treatment])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const attach = (field) => {
    openPicker(fileRef => {
      setForm(f => {
        const updated = { ...f, [field]: fileRef }
        return applyAutoSent(updated)
      })
    })
  }

  const remove = (field) => {
    set(field, null)
  }

  const handleSentToggle = (field) => {
    const approvalField = field === 'sent_ins1' ? 'approval_ins1' : 'approval_ins2'
    if (form[approvalField]) return
    set(field, !form[field])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleaned = applyAutoSent({
      ...form,
      cost: parseFloat(form.cost) || 0,
      refund_ins1: parseFloat(form.refund_ins1) || 0,
      refund_ins2: parseFloat(form.refund_ins2) || 0,
      id: form.id || crypto.randomUUID(),
    })
    onSave(cleaned)
  }

  const handleDelete = () => {
    setConfirm({
      title: 'Delete Treatment',
      message: 'Are you sure you want to permanently delete this treatment? This cannot be undone.',
      onConfirm: () => { setConfirm(null); onDelete(form.id) },
      danger: true,
      confirmLabel: 'Delete',
    })
  }

  const sent1AutoLocked = !!form.approval_ins1
  const sent2AutoLocked = !!form.approval_ins2

  return (
    <>
      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
        />
      )}

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

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Provider / Clinic</label>
                <input
                  type="text"
                  value={form.provider}
                  onChange={e => set('provider', e.target.value)}
                  placeholder="e.g. Maccabi Physiotherapy Clinic"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cost (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={e => set('cost', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Refund Ins. 1 (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.refund_ins1}
                    onChange={e => set('refund_ins1', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Refund Ins. 2 (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.refund_ins2}
                    onChange={e => set('refund_ins2', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            </section>

            {/* Progress steps */}
            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress</h3>

              <div className="flex flex-col gap-4 border border-gray-100 rounded-xl p-4 bg-gray-50">
                {/* Step 1 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${form.receipt ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {form.receipt ? '✓' : '1'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">Receipt</span>
                  </div>
                  <div className="pl-8">
                    <FileAttachment
                      label=""
                      file={form.receipt}
                      onAttach={() => attach('receipt')}
                      onRemove={() => remove('receipt')}
                    />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3 pl-1">
                  <input
                    type="checkbox"
                    id="sent_ins1"
                    checked={form.sent_ins1 || sent1AutoLocked}
                    onChange={() => handleSentToggle('sent_ins1')}
                    disabled={sent1AutoLocked}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="sent_ins1" className={`text-sm ${form.sent_ins1 || sent1AutoLocked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    Sent to Insurer 1
                    {sent1AutoLocked && <span className="text-xs text-gray-400 ml-1">(auto)</span>}
                  </label>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${form.approval_ins1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {form.approval_ins1 ? '✓' : '3'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">Approval from Insurer 1</span>
                  </div>
                  <div className="pl-8">
                    <FileAttachment
                      label=""
                      file={form.approval_ins1}
                      onAttach={() => attach('approval_ins1')}
                      onRemove={() => remove('approval_ins1')}
                    />
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-3 pl-1">
                  <input
                    type="checkbox"
                    id="sent_ins2"
                    checked={form.sent_ins2 || sent2AutoLocked}
                    onChange={() => handleSentToggle('sent_ins2')}
                    disabled={sent2AutoLocked}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="sent_ins2" className={`text-sm ${form.sent_ins2 || sent2AutoLocked ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    Sent to Insurer 2
                    {sent2AutoLocked && <span className="text-xs text-gray-400 ml-1">(auto)</span>}
                  </label>
                </div>

                {/* Step 5 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${form.approval_ins2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {form.approval_ins2 ? '✓' : '5'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">Approval from Insurer 2</span>
                  </div>
                  <div className="pl-8">
                    <FileAttachment
                      label=""
                      file={form.approval_ins2}
                      onAttach={() => attach('approval_ins2')}
                      onRemove={() => remove('approval_ins2')}
                    />
                  </div>
                </div>
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
                  className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                >
                  {isNew ? 'Add Treatment' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
