import type { TFunction } from 'i18next'
import { policyTemplates } from '../data/policyTemplates'

export function renderPolicyTemplate(templateId: string, t: TFunction): string {
  const tpl = policyTemplates.find(p => p.id === templateId)
  if (!tpl) return ''
  const title = t(tpl.titleKey)
  const points = Array.from({ length: tpl.summaryCount }, (_, i) =>
    `${i + 1}. ${t(`${tpl.summaryKeyPrefix}.summary${i + 1}`)}`
  )
  return `${title}\n\n${points.join('\n')}`
}
