export function formatCurrency(amount) {
  return '₪' + Number(amount || 0).toLocaleString('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

export function monthKey(iso) {
  return iso ? iso.slice(0, 7) : ''
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-')
  return new Intl.DateTimeFormat('en-IL', { month: 'short', year: '2-digit' })
    .format(new Date(Number(y), Number(m) - 1, 1))
}
