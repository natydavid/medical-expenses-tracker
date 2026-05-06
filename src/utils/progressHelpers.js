export function computeSteps(treatment) {
  const { receipt, sent_ins1, approval_ins1, sent_ins2, approval_ins2 } = treatment
  return [
    { label: 'Receipt',     done: !!receipt },
    { label: 'Sent 1',      done: !!sent_ins1 || !!approval_ins1 },
    { label: 'Approved 1',  done: !!approval_ins1 },
    { label: 'Sent 2',      done: !!sent_ins2 || !!approval_ins2 },
    { label: 'Approved 2',  done: !!approval_ins2 },
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
  return {
    ...treatment,
    sent_ins1: treatment.sent_ins1 || !!treatment.approval_ins1,
    sent_ins2: treatment.sent_ins2 || !!treatment.approval_ins2,
  }
}
