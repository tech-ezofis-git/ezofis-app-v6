import { useDirection } from '@mantine/core'
import { useLayoutEffect } from 'react'

/** Keeps Mantine + document direction locked to LTR (no mirrored layout). */
const ForceLtrDirection = () => {
  const { dir, setDirection } = useDirection()

  useLayoutEffect(() => {
    if (dir !== 'ltr') {
      setDirection('ltr')
    }
    document.documentElement.setAttribute('dir', 'ltr')
    document.body.setAttribute('dir', 'ltr')
  }, [dir, setDirection])

  return null
}

export default ForceLtrDirection
