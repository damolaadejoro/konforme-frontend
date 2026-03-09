import { useState, useEffect } from 'react'
import { getEUCountries } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { EUCountryInfo } from '../types/country'

let cachedCountries: EUCountryInfo[] | null = null

export function useCountryData() {
  const { country } = useAuth()
  const [countries, setCountries] = useState<EUCountryInfo[]>(cachedCountries || [])
  const [loading, setLoading] = useState(!cachedCountries)

  useEffect(() => {
    if (cachedCountries) {
      setCountries(cachedCountries)
      setLoading(false)
      return
    }
    getEUCountries()
      .then(data => {
        cachedCountries = data
        setCountries(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const currentCountry = countries.find(c => c.code === country) || null

  return { countries, currentCountry, loading }
}
