import { useState, useEffect } from 'react'
import { getCountries, getCountry, type CountryListItem, type CountryDetail } from '../services/api'
import { useAuth } from '../context/AuthContext'

let cachedCountries: CountryListItem[] | null = null
const cachedDetails: Record<string, CountryDetail> = {}

export function useCountryData() {
  const { country } = useAuth()
  const [countries, setCountries] = useState<CountryListItem[]>(cachedCountries || [])
  const [currentCountry, setCurrentCountry] = useState<CountryDetail | null>(
    country ? cachedDetails[country] || null : null
  )
  const [loading, setLoading] = useState(!cachedCountries)

  // Fetch country list
  useEffect(() => {
    if (cachedCountries) {
      setCountries(cachedCountries)
      setLoading(false)
      return
    }
    getCountries()
      .then(data => {
        cachedCountries = data
        setCountries(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch full detail for selected country
  useEffect(() => {
    if (!country) {
      setCurrentCountry(null)
      return
    }
    if (cachedDetails[country]) {
      setCurrentCountry(cachedDetails[country])
      return
    }
    getCountry(country)
      .then(detail => {
        cachedDetails[country] = detail
        setCurrentCountry(detail)
      })
      .catch(() => setCurrentCountry(null))
  }, [country])

  return { countries, currentCountry, loading }
}
