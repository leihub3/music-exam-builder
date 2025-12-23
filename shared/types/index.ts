// =====================
// USER TYPES
// =====================

export type UserRole = 'ADMIN' | 'INSTITUTION_ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionMember {
  id: string;
  institutionId: string;
  userId: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  joinedAt: string;
  user?: User;
}

// =====================
// EXAM TYPES
// =====================

export type SectionCategory = 'EAR_TRAINING' | 'RHYTHM' | 'GENERAL';

export type SectionType = 
  | 'TRUE_FALSE' 
  | 'MULTIPLE_CHOICE' 
  | 'LISTENING' 
  | 'TRANSPOSITION' 
  | 'ORCHESTRATION'
  | 'LISTEN_AND_WRITE'
  | 'LISTEN_AND_REPEAT'
  | 'LISTEN_AND_COMPLETE'
  | 'INTERVAL_DICTATION'
  | 'CHORD_DICTATION'
  | 'PROGRESSION_DICTATION';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  institutionId: string;
  durationMinutes?: number;
  passingScore?: number;
  totalPoints: number;
  isPublished: boolean;
  availableFrom?: string;
  availableUntil?: string;
  createdAt: string;
  updatedAt: string;
  sections?: ExamSection[];
}

export interface ExamSection {
  id: string;
  examId: string;
  title: string;
  description?: string;
  orderIndex: number;
  sectionType: SectionType;
  sectionCategory?: SectionCategory;
  createdAt: string;
  questions?: Question[];
}

// =====================
// QUESTION TYPES
// =====================

export interface Question {
  id: string;
  sectionId: string;
  questionText: string;
  points: number;
  orderIndex: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  typeData?: QuestionTypeData;
}

// Backend response format (snake_case with nested type data)
export interface QuestionBackendResponse {
  id: string;
  section_id?: string;
  sectionId?: string;
  question_text?: string;
  questionText?: string;
  points: number;
  order_index?: number;
  orderIndex?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  section?: {
    section_type?: string;
    sectionType?: string;
    section_category?: string;
    sectionCategory?: string;
    id?: string;
  };
  true_false?: Array<{
    correct_answer?: boolean;
    audio_file_path?: string;
    notation_file_path?: string;
  }> | {
    correct_answer?: boolean;
    audio_file_path?: string;
    notation_file_path?: string;
  };
  multiple_choice?: Array<{
    options?: string[];
    correct_option_index?: number;
    audio_file_path?: string;
    option_notation_file_paths?: string[];
  }> | {
    options?: string[];
    correct_option_index?: number;
    audio_file_path?: string;
    option_notation_file_paths?: string[];
  };
  listening?: unknown;
  transposition?: unknown;
  orchestration?: unknown;
  listen_and_write?: Array<{
    audio_file_path?: string;
    correct_answer?: string;
    answer_format?: string;
    concert_a_play_limit?: number;
    reference_score_path?: string;
    reference_score_music_xml?: string;
  }> | {
    audio_file_path?: string;
    correct_answer?: string;
    answer_format?: string;
    concert_a_play_limit?: number;
    reference_score_path?: string;
    reference_score_music_xml?: string;
  };
  listen_and_repeat?: unknown;
  listen_and_complete?: unknown;
  interval_dictation?: Array<{
    example_play_limit?: number;
    tempo?: number;
    note_duration?: number;
    instrument?: string;
  }> | {
    example_play_limit?: number;
    tempo?: number;
    note_duration?: number;
    instrument?: string;
  };
  interval_dictation_items?: Array<{
    id?: string;
    question_id?: string;
    root_note?: string;
    correct_interval?: string;
    interval_direction?: string;
    order_index?: number;
  }> | {
    id?: string;
    question_id?: string;
    root_note?: string;
    correct_interval?: string;
    interval_direction?: string;
    order_index?: number;
  };
  chord_dictation?: Array<{
    example_play_limit?: number;
    tempo?: number;
    duration?: number;
    instrument?: string;
  }> | {
    example_play_limit?: number;
    tempo?: number;
    duration?: number;
    instrument?: string;
  };
  chord_dictation_items?: Array<{
    id?: string;
    question_id?: string;
    correct_chord?: string;
    chord_voicing?: string;
    chord_type?: string;
    octave?: number;
    order_index?: number;
  }> | {
    id?: string;
    question_id?: string;
    correct_chord?: string;
    chord_voicing?: string;
    chord_type?: string;
    octave?: number;
    order_index?: number;
  };
  progression_dictation?: Array<{
    correct_progression?: string[];
    progression_key?: string;
    progression_notation?: string;
    example_play_limit?: number;
    tempo?: number;
    chord_duration?: number;
    instrument?: string;
  }> | {
    correct_progression?: string[];
    progression_key?: string;
    progression_notation?: string;
    example_play_limit?: number;
    tempo?: number;
    chord_duration?: number;
    instrument?: string;
  };
  typeData?: QuestionTypeData;
}

export type QuestionTypeData =
  | TrueFalseQuestionData
  | MultipleChoiceQuestionData
  | ListeningQuestionData
  | TranspositionQuestionData
  | OrchestrationQuestionData
  | ListenAndWriteQuestionData
  | ListenAndRepeatQuestionData
  | ListenAndCompleteQuestionData
  | IntervalDictationQuestionData
  | ChordDictationQuestionData
  | ProgressionDictationQuestionData;

// Interval Dictation - supports multiple intervals per question
export interface IntervalDictationItem {
  rootNote?: string;
  correctInterval: string;
  intervalDirection?: 'ascending' | 'descending' | 'harmonic';
  orderIndex: number;
}

export interface IntervalDictationQuestionData {
  questionId: string;
  intervals: IntervalDictationItem[]; // Array of intervals for this question
  examplePlayLimit?: number; // Number of times students can play each interval example
  tempo?: number; // BPM (shared across all intervals)
  noteDuration?: number; // Duration in seconds (shared across all intervals)
  instrument?: 'piano' | 'sine' | 'synth'; // Instrument sound (shared across all intervals)
}

// Chord Dictation - supports multiple chords per question
export interface ChordDictationItem {
  correctChord: string;
  chordVoicing?: 'root' | 'first_inversion' | 'second_inversion' | 'open';
  chordType?: 'triad' | 'seventh' | 'extended';
  octave?: number;
  orderIndex: number;
}

export interface ChordDictationQuestionData {
  questionId: string;
  chords: ChordDictationItem[]; // Array of chords for this question
  examplePlayLimit?: number; // Number of times students can play each chord example
  tempo?: number; // BPM (shared across all chords)
  duration?: number; // Duration in seconds (shared across all chords)
  instrument?: 'piano' | 'sine' | 'synth'; // Instrument sound (shared across all chords)
}

export interface ProgressionDictationQuestionData {
  questionId: string;
  correctProgression: string[]; // Array of chord symbols (e.g., ['I', 'V', 'vi', 'IV'])
  progressionKey?: string; // Key of the progression (e.g., 'C major')
  progressionNotation?: 'roman' | 'jazz' | 'figured_bass'; // Notation style
  examplePlayLimit?: number; // Number of times students can play the progression
  tempo?: number; // BPM
  chordDuration?: number; // Duration of each chord in seconds
  instrument?: 'piano' | 'sine' | 'synth'; // Instrument sound
}

export interface TrueFalseQuestionData {
  questionId: string;
  correctAnswer: boolean;
  audioFilePath?: string;        // Optional audio file path for Ear Training
  notationFilePath?: string;     // Optional notation file path (MusicXML/PDF/image)
}

export interface MultipleChoiceQuestionData {
  questionId: string;
  options: string[];
  correctOptionIndex: number;
  audioFilePath?: string;        // Required for Ear Training
  optionNotationFilePaths?: string[];  // Array of notation file paths (one per option) - Required for Ear Training
}

export interface ListeningQuestionData {
  questionId: string;
  audioFilePath: string;
  questionType?: 'interval' | 'chord' | 'rhythm' | 'melody';
  options?: string[];
  correctAnswer: string;
}

export interface TranspositionQuestionData {
  questionId: string;
  sourceInstrument: string;
  targetInstrument: string;
  notationFilePath: string;
  referenceAnswerPath?: string;
}

export interface OrchestrationQuestionData {
  questionId: string;
  pianoScorePath: string;
  targetEnsemble: string;
  ensembleInstruments: string[];
  rubric: RubricItem[];
}

export interface ListenAndWriteQuestionData {
  questionId: string;
  audioFilePath: string;
  correctAnswer?: string;  // Optional - can be null if using reference score
  answerFormat?: 'notes' | 'text';
  concertAPlayLimit?: number;  // Number of times Concert A can be played (default: 3)
  referenceScorePath?: string;  // Path to reference MusicXML file
  referenceScoreMusicXML?: string;  // Inline MusicXML string from editor
}

export interface ListenAndRepeatQuestionData {
  questionId: string;
  audioFilePath: string;
  expectedNotes: string[];
  noteFormat?: 'solfege' | 'note_names' | 'both';
  tolerance?: 'strict' | 'flexible';
}

export interface ListenAndCompleteQuestionData {
  questionId: string;
  audioFilePath: string;
  incompleteScorePath?: string;
  incompleteScoreMusicXML?: string; // For editor-created incomplete scores
  completeScorePath?: string; // Reference complete score for evaluation
  completeScoreMusicXML?: string; // Reference complete score for evaluation
  blankPositions?: number[]; // Which notes/positions are blanks (for extraction)
}

export interface RubricItem {
  criteria: string;
  points: number;
}

// =====================
// EXAM TAKING TYPES
// =====================

export type ExamAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';

export interface ExamAssignment {
  id: string;
  examId: string;
  studentId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  exam?: Exam;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalPoints?: number;
  status: ExamAttemptStatus;
  timeSpentSeconds?: number;
  exam?: Exam;
  answers?: StudentAnswer[];
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  answer: any;
  submissionFilePath?: string;
  pointsEarned?: number;
  maxPoints: number;
  isGraded: boolean;
  gradedAt?: string;
  gradedBy?: string;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  question?: Question;
}

// =====================
// API RESPONSE TYPES
// =====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =====================
// FORM TYPES
// =====================

export interface CreateExamDTO {
  title: string;
  description?: string;
  institutionId: string;
  durationMinutes?: number;
  passingScore?: number;
  availableFrom?: string;
  availableUntil?: string;
}

export interface CreateSectionDTO {
  examId: string;
  title: string;
  description?: string;
  sectionType: SectionType;
  sectionCategory?: SectionCategory;
  orderIndex: number;
}

export interface CreateQuestionDTO {
  sectionId: string;
  questionText: string;
  points: number;
  orderIndex: number;
  typeData: QuestionTypeData;
}

export interface SubmitAnswerDTO {
  attemptId: string;
  questionId: string;
  answer: any;
  file?: File;
}

export interface GradeAnswerDTO {
  answerId: string;
  pointsEarned: number;
  feedback?: string;
}

// =====================
// MUSIC SPECIFIC TYPES
// =====================

export interface Instrument {
  name: string;
  transposition?: number; // Semitones from concert pitch
  clef: 'treble' | 'bass' | 'alto' | 'tenor';
}

export const COMMON_INSTRUMENTS: Record<string, Instrument> = {
  'Piano': { name: 'Piano', clef: 'treble' },
  'Clarinet in Bb': { name: 'Clarinet in Bb', transposition: -2, clef: 'treble' },
  'Horn in F': { name: 'Horn in F', transposition: 7, clef: 'treble' },
  'Trumpet in Bb': { name: 'Trumpet in Bb', transposition: -2, clef: 'treble' },
  'Alto Saxophone': { name: 'Alto Saxophone', transposition: -9, clef: 'treble' },
  'Tenor Saxophone': { name: 'Tenor Saxophone', transposition: -14, clef: 'treble' },
  'French Horn': { name: 'French Horn', transposition: 7, clef: 'treble' },
  'Trombone': { name: 'Trombone', clef: 'bass' },
  'Violin': { name: 'Violin', clef: 'treble' },
  'Viola': { name: 'Viola', clef: 'alto' },
  'Cello': { name: 'Cello', clef: 'bass' },
  'Double Bass': { name: 'Double Bass', clef: 'bass' },
};

export type EnsembleType = 
  | 'string_quartet'
  | 'brass_quintet'
  | 'woodwind_quintet'
  | 'full_orchestra'
  | 'chamber_orchestra'
  | 'wind_ensemble';

export const ENSEMBLE_TEMPLATES: Record<EnsembleType, string[]> = {
  string_quartet: ['Violin I', 'Violin II', 'Viola', 'Cello'],
  brass_quintet: ['Trumpet 1', 'Trumpet 2', 'Horn in F', 'Trombone', 'Tuba'],
  woodwind_quintet: ['Flute', 'Oboe', 'Clarinet in Bb', 'Bassoon', 'Horn in F'],
  full_orchestra: [
    'Flute', 'Oboe', 'Clarinet in Bb', 'Bassoon',
    'Horn in F', 'Trumpet in Bb', 'Trombone', 'Tuba',
    'Timpani', 'Percussion',
    'Violin I', 'Violin II', 'Viola', 'Cello', 'Double Bass'
  ],
  chamber_orchestra: [
    'Violin I', 'Violin II', 'Viola', 'Cello', 'Double Bass',
    'Flute', 'Oboe', 'Clarinet in Bb', 'Bassoon', 'Horn in F'
  ],
  wind_ensemble: [
    'Piccolo', 'Flute', 'Oboe', 'Bassoon',
    'Clarinet in Bb', 'Bass Clarinet', 'Alto Saxophone', 'Tenor Saxophone', 'Baritone Saxophone',
    'Trumpet in Bb', 'Horn in F', 'Trombone', 'Euphonium', 'Tuba',
    'Percussion', 'Timpani'
  ]
};

