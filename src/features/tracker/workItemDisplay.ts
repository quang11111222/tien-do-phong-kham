const ROMAN_SECTION_PATTERN = /^[IVXLCDM]+$/i

export function displayWorkItemWbs(wbs: string): string {
  const parts = wbs.split('.')
  if (parts.length <= 1 || !ROMAN_SECTION_PATTERN.test(parts[0])) return wbs
  return parts.slice(1).join('.')
}

export function actualCompletionDate(value: string | null): string | null {
  if (!value) return null
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return year && month && day ? `${year}-${month}-${day}` : null
}

export function requiresLateReason(endDate: string | null, status: string, currentDate: string): boolean {
  return status !== 'completed' && status !== 'pending_approval' && Boolean(endDate && endDate < currentDate)
}
