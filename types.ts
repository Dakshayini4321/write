export enum Track {
  ACADEMIC = 'ACADEMIC',
  TECHNICAL = 'TECHNICAL',
  BOTH = 'BOTH'
}

export enum ApplicationStatus {
  PROFILE_SUBMITTED = 'PROFILE_SUBMITTED',
  ASSESSMENT_PENDING = 'ASSESSMENT_PENDING',
  REVIEWING = 'REVIEWING',
  ONBOARDED = 'ONBOARDED',
  REJECTED = 'REJECTED'
}

export interface WritingSample {
  id: string;
  title: string;
  content: string;
  type: 'UPLOADED_SAMPLE' | 'ASSESSMENT_TASK';
  dateSubmitted: string;
}

export interface StyleMetrics {
  vocabularyRichness: number; // 0-100
  sentenceComplexity: number; // 0-100
  passiveVoiceUsage: number; // 0-100
  tone: string;
  detectedAiProbability: number; // 0-100
  consistencyScore: number; // 0-100 (vs other samples)
  keyTraits: string[];
}

export interface RubricCriterion {
  id: string;
  category: string;
  description: string;
  maxPoints: number;
}

export interface RubricScore {
  criterionId: string;
  score: number;
  comments: string;
}

export interface PlagiarismResult {
  score: number; // 0-100 (Similarity score)
  sources: { title: string; uri: string }[];
  analysis: string;
}

export interface AssessmentResult {
  overallScore: number; // 0-100
  rubricScores: RubricScore[];
  feedback: string;
  authorshipMatchScore: number; // 0-100 (Does it match provided samples?)
  metrics: StyleMetrics;
  plagiarism?: PlagiarismResult;
  timeTakenSeconds?: number;
  pasteCount?: number;
}

export interface WriterProfile {
  id: string;
  fullName: string;
  email: string;
  track?: Track;
  experienceYears: number;
  bio: string;
  samples: WritingSample[];
  assessment?: {
    taskPrompt: string;
    submission: string;
    result: AssessmentResult | null;
    meta: {
        startTime: number;
        endTime: number;
        pasteCount: number;
    }
  };
  status: ApplicationStatus;
  appliedDate: string;
}

export interface AiAnalysisResponse {
  metrics: StyleMetrics;
  rubricScores: RubricScore[];
  feedback: string;
  summary: string;
}
