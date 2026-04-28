import { useState, useCallback } from 'react'

export interface VinDecodeResult {
  vin: string
  year: string
  make: string
  model: string
  trim: string
  bodyStyle: string
  engine: string
  transmission: string
  drivetrain: string
  fuelType: string
  doors: string
  gvwr: string
  plantCountry: string
  errorCode: string
  errorText: string
}

const NHTSA_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

function extractValue(results: { Variable: string; Value: string | null }[], variable: string): string {
  return results.find(r => r.Variable === variable)?.Value ?? ''
}

export function useVinDecode() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VinDecodeResult | null>(null)

  const decode = useCallback(async (vin: string): Promise<VinDecodeResult | null> => {
    const cleaned = vin.trim().toUpperCase()
    if (cleaned.length !== 17) {
      setError('VIN must be exactly 17 characters')
      return null
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(
        `${NHTSA_BASE}/decodevinvaluesextended/${cleaned}?format=json`
      )
      if (!res.ok) throw new Error(`NHTSA API error: ${res.status}`)
      const data = await res.json()
      const r = data.Results?.[0]
      if (!r) throw new Error('No results from NHTSA')

      const errorCode = r.ErrorCode ?? ''
      if (errorCode !== '0') {
        const msg = r.ErrorText ?? 'VIN decode failed — check VIN and try again'
        setError(msg)
        return null
      }

      const decoded: VinDecodeResult = {
        vin: cleaned,
        year: r.ModelYear ?? '',
        make: r.Make ?? '',
        model: r.Model ?? '',
        trim: r.Trim ?? '',
        bodyStyle: r.BodyClass ?? '',
        engine: [r.DisplacementL ? `${Number(r.DisplacementL).toFixed(1)}L` : '', r.EngineCylinders ? `${r.EngineCylinders}-cyl` : ''].filter(Boolean).join(' '),
        transmission: r.TransmissionStyle ?? '',
        drivetrain: r.DriveType ?? '',
        fuelType: r.FuelTypePrimary ?? '',
        doors: r.Doors ?? '',
        gvwr: r.GVWR ?? '',
        plantCountry: r.PlantCountry ?? '',
        errorCode,
        errorText: r.ErrorText ?? '',
      }

      setResult(decoded)
      return decoded
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'VIN decode failed'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  return { decode, loading, error, result, reset }
}
