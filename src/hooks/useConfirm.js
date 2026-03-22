import { useState, useCallback } from 'react'

export function useConfirm() {
  const [state, setState] = useState(null)

  const confirm = useCallback((options) =>
    new Promise(resolve => {
      setState({ ...options, resolve })
    }), [])

  const handleConfirm = () => { state?.resolve(true);  setState(null) }
  const handleCancel  = () => { state?.resolve(false); setState(null) }

  return { confirm, confirmState: state, handleConfirm, handleCancel }
}
