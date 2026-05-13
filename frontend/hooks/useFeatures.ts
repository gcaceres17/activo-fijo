'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { TenantFeature } from '@/types'

let _cache: TenantFeature[] | null = null

export function useFeatures() {
  const [features, setFeatures] = useState<TenantFeature[]>(_cache ?? [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) return
    api.get<TenantFeature[]>('/v1/tenants/me/features')
      .then(data => { _cache = data; setFeatures(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isEnabled = (feature: string): boolean => {
    const f = features.find(x => x.feature === feature)
    return f?.habilitado ?? true
  }

  return { features, loading, isEnabled }
}

export function clearFeaturesCache() {
  _cache = null
}
