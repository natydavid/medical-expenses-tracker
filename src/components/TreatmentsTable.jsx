import React from 'react'
import { formatCurrency, formatDate } from '../utils/formatters'
import { isComplete, isInProgress } from '../utils/progressHelpers'
import ProgressStepper from './ProgressStepper'

function StatusBadge({ treatment }) {
  if (isComplete(treatment)) return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Complete</span>
  if (isInProgress(treatment)) return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">In Progress</span>
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 font-medium">Not Started</span>
}

export default function TreatmentsTable({ treatments, onEdit, onArchive }) {
  if (treatments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
        <p className="text-gray-400 text-sm">No treatments found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Provider</th>
            <th className="px-4 py-3 text-left">Description</th>
            <th className="px-4 py-3 text-right">Cost</th>
            <th className="px-4 py-3 text-right">Refunded</th>
            <th className="px-4 py-3 text-center">Progress</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {treatments.map((t, i) => {
            const refunded = (t.refund_ins1 || 0) + (t.refund_ins2 || 0)
            const complete = isComplete(t)
            return (
              <tr
                key={t.id}
                onClick={() => onEdit(t)}
                className={`border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'} ${t.archived ? 'opacity-60' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="px-4 py-3 capitalize text-gray-700">{t.type}</td>
                <td className="px-4 py-3 text-gray-800 font-medium max-w-[140px] truncate">{t.provider}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{t.description}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(t.cost)}</td>
                <td className="px-4 py-3 text-right text-green-700 font-medium">{refunded > 0 ? formatCurrency(refunded) : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <ProgressStepper treatment={t} size="sm" />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge treatment={t} />
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-xs text-blue-600 hover:underline px-2 py-1"
                    >
                      Edit
                    </button>
                    {complete && !t.archived && (
                      <button
                        onClick={() => onArchive(t)}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline px-2 py-1"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
