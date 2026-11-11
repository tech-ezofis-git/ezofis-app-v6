// Google / Microsoft sign-in hands the browser a token that proves the person's
// email. The server checks that token, so it is sent with every social sign-in
// call. It is kept only in memory (never stored), and only for the same email
// and provider it was issued for.

type SocialProof = {
  accessToken?: string
  email: string
  idToken?: string
  provider: string
}

let current: SocialProof | null = null

const normalizeProvider = (provider: string) => {
  const value = provider.trim().toLowerCase()
  return value === 'office365' || value === 'microsoft entra id'
    ? 'microsoft'
    : value
}

export const setSocialProof = (proof: SocialProof) => {
  current = {
    ...proof,
    email: proof.email.trim().toLowerCase(),
    provider: normalizeProvider(proof.provider),
  }
}

export const clearSocialProof = () => {
  current = null
}

/** The token fields to send for this email and provider, or none when they do not match. */
export const getSocialProofFor = (
  email: string,
  provider: string,
): { accessToken?: string; idToken?: string } => {
  if (
    !current ||
    current.email !== email.trim().toLowerCase() ||
    current.provider !== normalizeProvider(provider)
  ) {
    return {}
  }
  return { accessToken: current.accessToken, idToken: current.idToken }
}
