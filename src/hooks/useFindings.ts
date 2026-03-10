import { useState, useMemo } from 'react'
import { Finding, Severity, FindingStatus } from '../types'

interface Filters {
  severity: Severity | 'all'
  status: FindingStatus | 'all'
  article: string
  region: string
  search: string
}

export function useFindings(allFindings: Finding[] = []) {
  const [filters, setFilters] = useState<Filters>({
    severity: 'all',
    status: 'all',
    article: 'all',
    region: 'all',
    search: '',
  })

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return allFindings.filter(f => {
      if (filters.severity !== 'all' && f.severity !== filters.severity) return false
      if (filters.status !== 'all' && f.status !== filters.status) return false
      if (filters.article !== 'all' && f.article !== filters.article) return false
      if (filters.region !== 'all' && f.region !== filters.region) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!f.checkName.toLowerCase().includes(q) && !f.resource.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allFindings, filters])

  const articles = useMemo(() => {
    const set = new Set(allFindings.map(f => f.article))
    return Array.from(set).sort()
  }, [allFindings])

  const regions = useMemo(() => {
    const set = new Set(allFindings.map(f => f.region))
    return Array.from(set).sort()
  }, [allFindings])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return {
    findings: filtered as Finding[],
    filters,
    setFilters,
    expandedId,
    toggleExpand,
    articles,
    regions,
    total: allFindings.length,
  }
}
