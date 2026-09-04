export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

export type Effort = (typeof EFFORTS)[number]

export const DEFAULT_EFFORT: Effort = 'high'

const LABELS: Record<Effort, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra',
  max: 'Max'
}

export function effortLabel(effort: Effort): string {
  return LABELS[effort]
}

export function effortsFor(model: string): Effort[] {
  return model.startsWith('claude-') ? [...EFFORTS] : EFFORTS.filter((level) => level !== 'max')
}

export function resolveEffort(model: string, wanted: Effort): Effort {
  return effortsFor(model).includes(wanted) ? wanted : DEFAULT_EFFORT
}
