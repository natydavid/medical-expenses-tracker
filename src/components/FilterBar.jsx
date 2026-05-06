import React from 'react'

export default function FilterBar({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  return (
    <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter</span>

      <select
        value={filters.status}
        onChange={e => set('status', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <option value="all">All Statuses</option>
        <option value="not-started">Not Started</option>
        <option value="in-progress">In Progress</option>
        <option value="complete">Complete</option>
      </select>

      <select
        value={filters.type}
        onChange={e => set('type', e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <option value="all">All Types</option>
        <option value="physiotherapy">Physiotherapy</option>
        <option value="other">Other</option>
      </select>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">From</label>
        <input
          type="month"
          value={filters.from}
          onChange={e => set('from', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">To</label>
        <input
          type="month"
          value={filters.to}
          onChange={e => set('to', e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {(filters.status !== 'all' || filters.type !== 'all' || filters.from || filters.to) && (
        <button
          onClick={() => onChange({ status: 'all', type: 'all', from: '', to: '' })}
          className="text-xs text-blue-600 hover:underline ml-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
