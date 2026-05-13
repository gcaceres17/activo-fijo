'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CategoriasRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/taxonomia') }, [router])
  return null
}
