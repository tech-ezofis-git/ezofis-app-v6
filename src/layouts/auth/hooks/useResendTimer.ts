import { useEffect, useState } from 'react'

export default function useResendTimer(
  label = "Didn't receive the OTP? Resend",
) {
  const RESEND_SECONDS = 30

  const [elapsed, setElapsed] = useState(RESEND_SECONDS)

  const resendLabel = elapsed === 0 ? label : `${label} in ${elapsed}`

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (elapsed === 0) return
      setElapsed((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timerId)
  }, [elapsed])

  const resetTimer = () => setElapsed(RESEND_SECONDS)

  return { elapsed, resendLabel, resetTimer }
}
