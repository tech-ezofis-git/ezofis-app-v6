type PiiPrivacyVeilProps = {
  visible: boolean
}

/**
 * Opaque cover so the user cannot read PII while redaction is still scanning.
 * The document may render underneath (needed for text-layer measurement).
 */
const PiiPrivacyVeil = ({ visible }: PiiPrivacyVeilProps) => {
  if (!visible) return null

  return (
    <div
      aria-busy='true'
      aria-live='polite'
      className='absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[var(--gray-1)] px-6'
    >
      <div
        className='size-8 animate-spin rounded-full border-2 border-gray-4 border-t-[var(--primary-9)]'
        aria-hidden='true'
      />
      <div className='text-center'>
        <p className='text-sm font-semibold text-gray-12'>
          Protecting sensitive data
        </p>
        <p className='mt-1 text-12 text-gray-9'>
          Scanning document for PII before preview…
        </p>
      </div>
    </div>
  )
}

export default PiiPrivacyVeil
