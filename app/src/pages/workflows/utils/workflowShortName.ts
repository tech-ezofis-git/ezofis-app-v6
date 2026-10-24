/** Default short name: the first word of the workflow name ("Accounts Payable" → "Accounts"). */
export const getDefaultShortName = (name?: string | null) =>
  String(name ?? '')
    .trim()
    .split(/\s+/)[0] || ''
