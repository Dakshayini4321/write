import { WriterProfile, RubricCriterion } from "../types";

const APPLICANTS_KEY = 'veriscript_applicants';
const RUBRIC_KEY = 'veriscript_rubric';

// Default Rubric
const DEFAULT_RUBRIC: RubricCriterion[] = [
  { id: '1', category: 'Grammar & Mechanics', description: 'Accuracy of grammar, spelling, and punctuation.', maxPoints: 20 },
  { id: '2', category: 'Clarity & Flow', description: 'Logical progression of ideas and readability.', maxPoints: 20 },
  { id: '3', category: 'Technical Accuracy/Research', description: 'Correctness of facts or technical concepts.', maxPoints: 30 },
  { id: '4', category: 'Voice & Tone', description: 'Appropriateness of tone for the target audience.', maxPoints: 15 },
  { id: '5', category: 'Adherence to Prompt', description: 'How well the submission addresses the requirements.', maxPoints: 15 },
];

export const getApplicants = (): WriterProfile[] => {
  const data = localStorage.getItem(APPLICANTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveApplicant = (profile: WriterProfile): void => {
  const applicants = getApplicants();
  const existingIndex = applicants.findIndex(p => p.id === profile.id);
  
  if (existingIndex >= 0) {
    applicants[existingIndex] = profile;
  } else {
    applicants.push(profile);
  }
  
  localStorage.setItem(APPLICANTS_KEY, JSON.stringify(applicants));
};

export const getApplicantById = (id: string): WriterProfile | undefined => {
    return getApplicants().find(p => p.id === id);
}

export const clearAll = () => {
    localStorage.removeItem(APPLICANTS_KEY);
    localStorage.removeItem(RUBRIC_KEY);
}

export const getRubric = (): RubricCriterion[] => {
    const data = localStorage.getItem(RUBRIC_KEY);
    return data ? JSON.parse(data) : DEFAULT_RUBRIC;
}

export const saveRubric = (rubric: RubricCriterion[]): void => {
    localStorage.setItem(RUBRIC_KEY, JSON.stringify(rubric));
}
