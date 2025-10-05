import { PDF } from './database'

/**
 * Priority Calculation Module
 *
 * Formula: Priority = Age Factor × Performance Factor × Repetition Factor
 */

export interface PDFWithPriority extends PDF {
  priority: number
}

const CONFIG = {
  ageExponent: 1.2,
  defaultScore: 2,
  ageWeight: 1.0,
  performanceWeight: 1.0,
  repetitionWeight: 1.0
}

/**
 * Calculate priority score for a single PDF
 */
export function calculatePriority(pdf: PDF): number {
  // 1. Age Factor - exponential growth
  const lastRevised = new Date(pdf.last_revised)
  const now = new Date()
  let daysSince = Math.floor((now.getTime() - lastRevised.getTime()) / (1000 * 60 * 60 * 24))

  // Ensure at least 1 day
  daysSince = Math.max(daysSince, 1)

  const ageFactor = Math.pow(daysSince, CONFIG.ageExponent) * CONFIG.ageWeight

  // 2. Performance Factor - invert score (lower score = higher priority)
  const lastScore = pdf.last_score || CONFIG.defaultScore
  const performanceFactor = (4 - lastScore) * CONFIG.performanceWeight

  // 3. Repetition Factor - diminishing returns
  const revisions = pdf.revisions || 0
  const repetitionFactor = (1 / (1 + revisions)) * CONFIG.repetitionWeight

  // Final score
  const priorityScore = ageFactor * performanceFactor * repetitionFactor

  return Math.round(priorityScore * 100) / 100 // Round to 2 decimals
}

/**
 * Rank all PDFs by priority
 */
export function rankPDFs(pdfs: PDF[]): PDFWithPriority[] {
  return pdfs
    .map(pdf => ({
      ...pdf,
      priority: calculatePriority(pdf)
    }))
    .sort((a, b) => b.priority - a.priority) // Descending order
}

/**
 * Get days since last revision
 */
export function getDaysSinceRevision(pdf: PDF): number {
  const lastRevised = new Date(pdf.last_revised)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - lastRevised.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(daysSince, 0)
}

/**
 * Format days into human-readable string
 */
export function formatTimeAgo(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}
