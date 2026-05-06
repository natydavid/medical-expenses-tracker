import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { monthKey, monthLabel } from '../utils/formatters'
import { formatCurrency } from '../utils/formatters'

function buildMonthlyData(treatments) {
  const map = {}
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map[key] = { month: key, spent: 0, refunded: 0 }
  }

  treatments.filter(t => !t.archived).forEach(t => {
    const key = monthKey(t.date)
    if (!map[key]) map[key] = { month: key, spent: 0, refunded: 0 }
    map[key].spent += t.cost || 0
    map[key].refunded += (t.refund_ins1 || 0) + (t.refund_ins2 || 0)
  })

  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({ ...d, label: monthLabel(d.month) }))
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function MonthlyChart({ treatments }) {
  const data = useMemo(() => buildMonthlyData(treatments), [treatments])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spend vs. Refunds</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barGap={2} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `₪${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="spent" name="Spent" fill="#f87171" radius={[3, 3, 0, 0]} />
          <Bar dataKey="refunded" name="Refunded" fill="#4ade80" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
