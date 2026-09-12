const ROMAN_SECTION_PATTERN = /^[IVXLCDM]+$/i

export function displayWorkItemWbs(wbs: string): string {
  const parts = wbs.split('.')
  if (parts.length <= 1 || !ROMAN_SECTION_PATTERN.test(parts[0])) return wbs
  return parts.slice(1).join('.')
}
