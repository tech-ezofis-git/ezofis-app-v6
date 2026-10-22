import { createFileRoute } from '@tanstack/react-router'

// Microsoft sign-in (MSAL popup) comes back to this page with its result in the
// URL hash. It sits outside the _app guard and does nothing on purpose: any
// redirect here would clear the hash before MSAL reads it (hash_empty_error).
export const Route = createFileRoute('/msal-redirect')({
  component: () => (
    <p className='p-6 text-sm text-gray-10'>Completing sign-in…</p>
  ),
})
