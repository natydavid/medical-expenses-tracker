import React from 'react'
import { computeSteps } from '../utils/progressHelpers'

export default function ProgressStepper({ treatment, size = 'sm' }) {
  const steps = computeSteps(treatment)

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-0.5">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div
              title={step.label}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold
                ${step.done
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-300'
                }`}
            >
              {step.done ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-3 ${steps[i + 1].done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
              ${step.done
                ? 'bg-green-500 border-green-500 text-white'
                : 'bg-white border-gray-300 text-gray-400'
              }`}
          >
            {step.done ? '✓' : i + 1}
          </div>
          <span className={`text-sm ${step.done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
