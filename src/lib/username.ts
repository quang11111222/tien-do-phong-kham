export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function usernameToInternalEmail(value: string) {
  return `${normalizeUsername(value)}@ptpk.local`
}
