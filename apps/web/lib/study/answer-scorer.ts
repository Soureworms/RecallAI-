export type AnswerAssessment = {
  score: number
  passed: boolean
  matchedKeywords: string[]
  missingKeywords: string[]
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "above",
  "be",
  "before",
  "by",
  "confirm",
  "confirming",
  "for",
  "from",
  "if",
  "in",
  "is",
  "it",
  "needed",
  "of",
  "on",
  "or",
  "over",
  "request",
  "required",
  "the",
  "their",
  "to",
  "with",
])

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function keywordTokens(value: string): string[] {
  const normalized = normalize(value)
  if (!normalized) return []

  return normalized
    .split(" ")
    .map((token) => token.replace(/s$/, ""))
    .filter((token) => token.length > 1 || /\d/.test(token))
    .filter((token) => !STOP_WORDS.has(token))
}

function uniqueTokens(value: string): Set<string> {
  return new Set(keywordTokens(value))
}

function numericTokens(tokens: Set<string>): string[] {
  return Array.from(tokens).filter((token) => /\d/.test(token))
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function scoreTypedAnswer(userAnswer: string, expectedAnswer: string): AnswerAssessment {
  const normalizedUser = normalize(userAnswer)
  const normalizedExpected = normalize(expectedAnswer)

  if (!normalizedUser || !normalizedExpected) {
    return { score: 0, passed: false, matchedKeywords: [], missingKeywords: keywordTokens(expectedAnswer) }
  }

  if (normalizedUser === normalizedExpected) {
    const tokens = keywordTokens(expectedAnswer)
    return { score: 100, passed: true, matchedKeywords: tokens, missingKeywords: [] }
  }

  const expected = uniqueTokens(expectedAnswer)
  const actual = uniqueTokens(userAnswer)

  if (expected.size === 0 || actual.size === 0) {
    return { score: 0, passed: false, matchedKeywords: [], missingKeywords: Array.from(expected) }
  }

  const matchedKeywords = Array.from(expected).filter((token) => actual.has(token))
  const missingKeywords = Array.from(expected).filter((token) => !actual.has(token))
  const recall = matchedKeywords.length / expected.size
  const precision = matchedKeywords.length / actual.size
  const tokenScore = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)

  const containsPhrase =
    normalizedUser.includes(normalizedExpected) || normalizedExpected.includes(normalizedUser)
  let score = Math.max(tokenScore * 100, containsPhrase ? 92 : 0)

  const requiredNumbers = numericTokens(expected)
  const missingNumbers = requiredNumbers.filter((token) => !actual.has(token))
  if (missingNumbers.length > 0) {
    score = Math.min(score, 65)
  }

  const finalScore = clampScore(score)

  return {
    score: finalScore,
    passed: finalScore >= 70,
    matchedKeywords,
    missingKeywords,
  }
}
