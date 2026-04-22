/**
 * Pre-built quiz question bank for NIS2 security awareness campaigns.
 * 24 questions across 6 categories, each with i18n key references.
 * Actual text lives in locale files under the "quizBank" namespace.
 */

export interface QuizTemplate {
  id: string
  questionKey: string
  optionKeyPrefix: string
  optionCount: number        // always 4
  correctAnswer: number      // 0-based index
  explanationKey: string
  category: QuizCategory
  relatedArticle: string
}

export type QuizCategory =
  | 'Security Awareness'
  | 'Incident Reporting'
  | 'Access Control'
  | 'Data Protection'
  | 'Supply Chain'
  | 'Business Continuity'

export const quizTemplates: QuizTemplate[] = [
  // --- Security Awareness (4 questions) ---
  {
    id: 'quiz-001',
    questionKey: 'quizBank.quiz-001.question',
    optionKeyPrefix: 'quizBank.quiz-001.option',
    optionCount: 4,
    correctAnswer: 2,
    explanationKey: 'quizBank.quiz-001.explanation',
    category: 'Security Awareness',
    relatedArticle: 'Art. 21(2)(g)',
  },
  {
    id: 'quiz-002',
    questionKey: 'quizBank.quiz-002.question',
    optionKeyPrefix: 'quizBank.quiz-002.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-002.explanation',
    category: 'Security Awareness',
    relatedArticle: 'Art. 21(2)(g)',
  },
  {
    id: 'quiz-003',
    questionKey: 'quizBank.quiz-003.question',
    optionKeyPrefix: 'quizBank.quiz-003.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-003.explanation',
    category: 'Security Awareness',
    relatedArticle: 'Art. 21(2)(g)',
  },
  {
    id: 'quiz-004',
    questionKey: 'quizBank.quiz-004.question',
    optionKeyPrefix: 'quizBank.quiz-004.option',
    optionCount: 4,
    correctAnswer: 2,
    explanationKey: 'quizBank.quiz-004.explanation',
    category: 'Security Awareness',
    relatedArticle: 'Art. 21(2)(g)',
  },

  // --- Incident Reporting (4 questions) ---
  {
    id: 'quiz-005',
    questionKey: 'quizBank.quiz-005.question',
    optionKeyPrefix: 'quizBank.quiz-005.option',
    optionCount: 4,
    correctAnswer: 0,
    explanationKey: 'quizBank.quiz-005.explanation',
    category: 'Incident Reporting',
    relatedArticle: 'Art. 21(2)(b)',
  },
  {
    id: 'quiz-006',
    questionKey: 'quizBank.quiz-006.question',
    optionKeyPrefix: 'quizBank.quiz-006.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-006.explanation',
    category: 'Incident Reporting',
    relatedArticle: 'Art. 23',
  },
  {
    id: 'quiz-007',
    questionKey: 'quizBank.quiz-007.question',
    optionKeyPrefix: 'quizBank.quiz-007.option',
    optionCount: 4,
    correctAnswer: 3,
    explanationKey: 'quizBank.quiz-007.explanation',
    category: 'Incident Reporting',
    relatedArticle: 'Art. 21(2)(b)',
  },
  {
    id: 'quiz-008',
    questionKey: 'quizBank.quiz-008.question',
    optionKeyPrefix: 'quizBank.quiz-008.option',
    optionCount: 4,
    correctAnswer: 2,
    explanationKey: 'quizBank.quiz-008.explanation',
    category: 'Incident Reporting',
    relatedArticle: 'Art. 23',
  },

  // --- Access Control (4 questions) ---
  {
    id: 'quiz-009',
    questionKey: 'quizBank.quiz-009.question',
    optionKeyPrefix: 'quizBank.quiz-009.option',
    optionCount: 4,
    correctAnswer: 0,
    explanationKey: 'quizBank.quiz-009.explanation',
    category: 'Access Control',
    relatedArticle: 'Art. 21(2)(i)',
  },
  {
    id: 'quiz-010',
    questionKey: 'quizBank.quiz-010.question',
    optionKeyPrefix: 'quizBank.quiz-010.option',
    optionCount: 4,
    correctAnswer: 3,
    explanationKey: 'quizBank.quiz-010.explanation',
    category: 'Access Control',
    relatedArticle: 'Art. 21(2)(i)',
  },
  {
    id: 'quiz-011',
    questionKey: 'quizBank.quiz-011.question',
    optionKeyPrefix: 'quizBank.quiz-011.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-011.explanation',
    category: 'Access Control',
    relatedArticle: 'Art. 21(2)(i)',
  },
  {
    id: 'quiz-012',
    questionKey: 'quizBank.quiz-012.question',
    optionKeyPrefix: 'quizBank.quiz-012.option',
    optionCount: 4,
    correctAnswer: 0,
    explanationKey: 'quizBank.quiz-012.explanation',
    category: 'Access Control',
    relatedArticle: 'Art. 21(2)(i)',
  },

  // --- Data Protection (4 questions) ---
  {
    id: 'quiz-013',
    questionKey: 'quizBank.quiz-013.question',
    optionKeyPrefix: 'quizBank.quiz-013.option',
    optionCount: 4,
    correctAnswer: 2,
    explanationKey: 'quizBank.quiz-013.explanation',
    category: 'Data Protection',
    relatedArticle: 'Art. 21(2)(h)',
  },
  {
    id: 'quiz-014',
    questionKey: 'quizBank.quiz-014.question',
    optionKeyPrefix: 'quizBank.quiz-014.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-014.explanation',
    category: 'Data Protection',
    relatedArticle: 'Art. 21(2)(h)',
  },
  {
    id: 'quiz-015',
    questionKey: 'quizBank.quiz-015.question',
    optionKeyPrefix: 'quizBank.quiz-015.option',
    optionCount: 4,
    correctAnswer: 3,
    explanationKey: 'quizBank.quiz-015.explanation',
    category: 'Data Protection',
    relatedArticle: 'Art. 21(2)(h)',
  },
  {
    id: 'quiz-016',
    questionKey: 'quizBank.quiz-016.question',
    optionKeyPrefix: 'quizBank.quiz-016.option',
    optionCount: 4,
    correctAnswer: 0,
    explanationKey: 'quizBank.quiz-016.explanation',
    category: 'Data Protection',
    relatedArticle: 'Art. 21(2)(h)',
  },

  // --- Supply Chain (4 questions) ---
  {
    id: 'quiz-017',
    questionKey: 'quizBank.quiz-017.question',
    optionKeyPrefix: 'quizBank.quiz-017.option',
    optionCount: 4,
    correctAnswer: 2,
    explanationKey: 'quizBank.quiz-017.explanation',
    category: 'Supply Chain',
    relatedArticle: 'Art. 21(2)(d)',
  },
  {
    id: 'quiz-018',
    questionKey: 'quizBank.quiz-018.question',
    optionKeyPrefix: 'quizBank.quiz-018.option',
    optionCount: 4,
    correctAnswer: 0,
    explanationKey: 'quizBank.quiz-018.explanation',
    category: 'Supply Chain',
    relatedArticle: 'Art. 21(2)(d)',
  },
  {
    id: 'quiz-019',
    questionKey: 'quizBank.quiz-019.question',
    optionKeyPrefix: 'quizBank.quiz-019.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-019.explanation',
    category: 'Supply Chain',
    relatedArticle: 'Art. 21(2)(d)',
  },
  {
    id: 'quiz-020',
    questionKey: 'quizBank.quiz-020.question',
    optionKeyPrefix: 'quizBank.quiz-020.option',
    optionCount: 4,
    correctAnswer: 3,
    explanationKey: 'quizBank.quiz-020.explanation',
    category: 'Supply Chain',
    relatedArticle: 'Art. 21(2)(d)',
  },

  // --- Business Continuity (4 questions) ---
  {
    id: 'quiz-021',
    questionKey: 'quizBank.quiz-021.question',
    optionKeyPrefix: 'quizBank.quiz-021.option',
    optionCount: 4,
    correctAnswer: 1,
    explanationKey: 'quizBank.quiz-021.explanation',
    category: 'Business Continuity',
    relatedArticle: 'Art. 21(2)(c)',
  },
  {
    id: 'quiz-022',
    questionKey: 'quizBank.quiz-022.question',
    optionKeyPrefix: 'quizBank.quiz-022.option',
    optionCount: 4,
    correctAnswer: 0,
    explanationKey: 'quizBank.quiz-022.explanation',
    category: 'Business Continuity',
    relatedArticle: 'Art. 21(2)(c)',
  },
  {
    id: 'quiz-023',
    questionKey: 'quizBank.quiz-023.question',
    optionKeyPrefix: 'quizBank.quiz-023.option',
    optionCount: 4,
    correctAnswer: 2,
    explanationKey: 'quizBank.quiz-023.explanation',
    category: 'Business Continuity',
    relatedArticle: 'Art. 21(2)(c)',
  },
  {
    id: 'quiz-024',
    questionKey: 'quizBank.quiz-024.question',
    optionKeyPrefix: 'quizBank.quiz-024.option',
    optionCount: 4,
    correctAnswer: 3,
    explanationKey: 'quizBank.quiz-024.explanation',
    category: 'Business Continuity',
    relatedArticle: 'Art. 21(2)(c)',
  },
]

/** Group templates by category for UI display */
export const quizCategories: QuizCategory[] = [
  'Security Awareness',
  'Incident Reporting',
  'Access Control',
  'Data Protection',
  'Supply Chain',
  'Business Continuity',
]
