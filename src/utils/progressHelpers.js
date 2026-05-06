// Compute the 5-step progress state from a treatment object.
// New model uses a `files` array; old model used separate receipt/approval fields.
function getFiles(treatment) {
  if (treatment.files) return treatment.files
  // Backward-compat: convert old flat fields to virtual files array
  const files = []
  if (treatment.receipt) files.push({ ...treatment.receipt, role: 'receipt' })
  if (treatment.approval_ins1) files.push({ ...treatment.approval_ins1, role: 'approval_ins1' })
  if (treatment.approval_ins2) files.push({ ...treatment.approval_ins2, role: 'approval_ins2' })
  return files
}

export function computeSteps(treatment) {
  const files = getFiles(treatment)
  const hasReceipt   = files.some(f => f.role === 'receipt')
  const hasApproval1 = files.some(f => f.role === 'approval_ins1')
  const hasApproval2 = files.some(f => f.role === 'approval_ins2')
  return [
    { label: 'Receipt',    done: hasReceipt },
    { label: 'Sent 1',     done: !!treatment.sent_ins1 || hasApproval1 },
    { label: 'Approved 1', done: hasApproval1 },
    { label: 'Sent 2',     done: !!treatment.sent_ins2 || hasApproval2 },
    { label: 'Approved 2', done: hasApproval2 },
  ]
}

export function isComplete(treatment) {
  return computeSteps(treatment).every(s => s.done)
}

export function isInProgress(treatment) {
  const steps = computeSteps(treatment)
  return steps.some(s => s.done) && !steps.every(s => s.done)
}

export function applyAutoSent(treatment) {
  const files = getFiles(treatment)
  return {
    ...treatment,
    sent_ins1: treatment.sent_ins1 || files.some(f => f.role === 'approval_ins1'),
    sent_ins2: treatment.sent_ins2 || files.some(f => f.role === 'approval_ins2'),
  }
}
