import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null) // { msg, type }

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
  }, [])

  const clearToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, clearToast }
}
