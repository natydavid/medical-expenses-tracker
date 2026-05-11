import React from 'react'
import { formatCurrency } from '../utils/formatters'

function Card({ label, amount, color }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-sm font-medium opacity-75 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{formatCurrency(amount)}</p>
    </div>
  )
}

export default function TotalsPanel({ treatments }) {
  const active = treatments.filter(t => !t.archived)
  const spent = active.reduce((s, t) => s + (t.cost || 0), 0)
  const refunded = active.reduce((s, t) => {
    const ins = t.insurers ?? 2
    return s + (t.refund_ins1 || 0) + (ins === 2 ? (t.refund_ins2 || 0) : 0)
  }, 0)
  const outstanding = spent - refunded

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card label="Total Spent" amount={spent} color="bg-red-50 text-red-900" />
      <Card label="Total Refunded" amount={refunded} color="bg-green-50 text-green-900" />
      <Card label="Outstanding" amount={outstanding} color="bg-amber-50 text-amber-900" />
    </div>
  )
}
