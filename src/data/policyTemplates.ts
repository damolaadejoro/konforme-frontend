/**
 * Pre-built NIS2 policy templates for employee acknowledgment campaigns.
 *
 * Each template maps to one or more NIS2 controls and provides a structured
 * policy summary that employees read and acknowledge. All text is stored in
 * locale files under the `policyTemplates` section for i18n support.
 *
 * Usage: when creating a "Policy Acknowledgment" campaign, the user can pick
 * a template instead of writing policy content from scratch.
 */

export interface PolicyTemplate {
  id: string
  /** i18n key: policyTemplates.<id>.title */
  titleKey: string
  /** i18n key prefix: policyTemplates.<id>.summary — points are summary1..summaryN */
  summaryKeyPrefix: string
  /** Number of summary points in the template */
  summaryCount: number
  /** NIS2 article reference */
  article: string
  /** Control IDs this template supports */
  relatedControlIds: string[]
}

export const policyTemplates: PolicyTemplate[] = [
  {
    id: 'tpl-isp',
    titleKey: 'policyTemplates.tpl-isp.title',
    summaryKeyPrefix: 'policyTemplates.tpl-isp',
    summaryCount: 7,
    article: 'Art. 21(2)(a)',
    relatedControlIds: ['ctrl-001', 'ctrl-024'],
  },
  {
    id: 'tpl-aup',
    titleKey: 'policyTemplates.tpl-aup.title',
    summaryKeyPrefix: 'policyTemplates.tpl-aup',
    summaryCount: 6,
    article: 'Art. 21(2)(a)',
    relatedControlIds: ['ctrl-001'],
  },
  {
    id: 'tpl-irp',
    titleKey: 'policyTemplates.tpl-irp.title',
    summaryKeyPrefix: 'policyTemplates.tpl-irp',
    summaryCount: 6,
    article: 'Art. 21(2)(b)',
    relatedControlIds: ['ctrl-005', 'ctrl-006', 'ctrl-009'],
  },
  {
    id: 'tpl-bcp',
    titleKey: 'policyTemplates.tpl-bcp.title',
    summaryKeyPrefix: 'policyTemplates.tpl-bcp',
    summaryCount: 6,
    article: 'Art. 21(2)(c)',
    relatedControlIds: ['ctrl-010', 'ctrl-011'],
  },
  {
    id: 'tpl-acc',
    titleKey: 'policyTemplates.tpl-acc.title',
    summaryKeyPrefix: 'policyTemplates.tpl-acc',
    summaryCount: 7,
    article: 'Art. 21(2)(i)',
    relatedControlIds: ['ctrl-025', 'ctrl-026', 'ctrl-028'],
  },
  {
    id: 'tpl-sup',
    titleKey: 'policyTemplates.tpl-sup.title',
    summaryKeyPrefix: 'policyTemplates.tpl-sup',
    summaryCount: 6,
    article: 'Art. 21(2)(d)',
    relatedControlIds: ['ctrl-014', 'ctrl-015', 'ctrl-016'],
  },
  {
    id: 'tpl-enc',
    titleKey: 'policyTemplates.tpl-enc.title',
    summaryKeyPrefix: 'policyTemplates.tpl-enc',
    summaryCount: 6,
    article: 'Art. 21(2)(h)',
    relatedControlIds: ['ctrl-018', 'ctrl-021', 'ctrl-039'],
  },
  {
    id: 'tpl-hyg',
    titleKey: 'policyTemplates.tpl-hyg.title',
    summaryKeyPrefix: 'policyTemplates.tpl-hyg',
    summaryCount: 7,
    article: 'Art. 21(2)(g)',
    relatedControlIds: ['ctrl-023', 'ctrl-038'],
  },
]
