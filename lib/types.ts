export interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear?: number;
  endYear?: number;
  gpa?: string;
  notes?: string;
}

export interface ExperienceEntry {
  organization: string;
  role: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface CVData {
  rawText: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  volunteerExperience: ExperienceEntry[];
  skills: string[];
  certifications: string[];
  languages: string[];
  parsedAt: string;
  sourceFileName: string;
}

export interface SavedOpportunity {
  opportunity: string;
  savedAt: string;
  status: "interested" | "in_progress" | "submitted" | "awarded" | "rejected" | "withdrawn";
  personalDeadlineReminder?: string;
  notes?: string;
  checkedDocs?: string[];
}

export interface Subscription {
  plan: "free" | "pro";
  status: "active" | "past_due" | "canceled" | "trialing";
  gateway?: "stripe" | "paystack";
  currentPeriodEnd?: string;
  trialStartedAt?: string;
}

export interface Celebration {
  _id: string;
  displayName: string;
  country?: string;
  photoUrl?: string;
  opportunityTitle: string;
  opportunityProvider?: string;
  awardType: string;
  message: string;
  isFeatured: boolean;
  createdAt: string;
}

export interface TestScores {
  ielts?: number;
  toefl?: number;
  gre?: number;
  gmat?: number;
  sat?: number;
  duolingo?: number;
}

export interface UserProfile {
  targetCountries: string[];
  targetFields: string[];
  targetDegreeLevel?: string;
  targetStartDate?: string;
  annualBudgetUSD?: number;
  testScores?: TestScores;
  updatedAt?: string;
}

export interface ReadinessDimension {
  id: string;
  label: string;
  score: number;
  max: number;
  feedback: string;
  actions: string[];
}

export interface ReadinessScore {
  overall: number;
  dimensions: ReadinessDimension[];
  topActions: { action: string; impact: "high" | "medium" | "low" }[];
  generatedAt: string;
  cvParsedAt?: string;
  profileUpdatedAt?: string;
}

export interface RoadmapWeek {
  week: number;
  label: string;
  tasks: string[];
  milestone?: string;
}

export interface Roadmap {
  title: string;
  overview: string;
  weeks: RoadmapWeek[];
  generatedAt: string;
  profileUpdatedAt?: string;
  completedTasks: string[];
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  country: string;
  photoUrl?: string;
  targetFields: string[];
  cvData?: CVData;
  savedOpportunities: SavedOpportunity[];
  subscription: Subscription;
  coachingUsed: number;
  isAdmin: boolean;
  isCoach?: boolean;
  profile?: UserProfile;
  readinessCache?: ReadinessScore;
  roadmapCache?: Roadmap;
}

export type OpportunityType = "scholarship" | "study_program" | "immigration_pathway" | "incubator" | "fellowship";
export type DegreeLevel = "undergraduate" | "masters" | "phd" | "postdoc" | "professional" | "none";

export interface Requirement {
  label: string;
  category: "academic" | "language" | "experience" | "citizenship" | "financial" | "other";
  isHard: boolean;
  detail?: string;
}

export interface EssayPrompt {
  promptId: string;
  label: string;
  question: string;
  maxCharacters?: number;
  maxWords?: number;
  guidance?: string;
}

export interface ReferenceLetterQuestion {
  text: string;
  optional?: boolean;
}

export interface ReferenceLetterConfig {
  instructions: string;
  questions: ReferenceLetterQuestion[];
  count: number;
}

export type ApplicationProcessType = "essay_based" | "document_based" | "hybrid";

export interface RequiredDocument {
  docId: string;
  label: string;
  description: string;
  category: "cv" | "leadership" | "work_experience" | "motivation" | "recommendation" | "other";
  isRequired: boolean;
  templateUrl?: string;
  instructions?: string;
}

export interface ApplicationProcess {
  type: ApplicationProcessType;
  requiredDocuments: RequiredDocument[];
  notes?: string;
}

export interface Opportunity {
  _id: string;
  title: string;
  provider: string;
  type: OpportunityType;
  country: string;
  region?: string;
  fieldsOfStudy: string[];
  degreeLevel: DegreeLevel;
  deadline?: string;
  applicationOpens?: string;
  fundingCoverage?: string;
  objectives: string;
  eligibilitySummary: string;
  requirements: Requirement[];
  essayPrompts?: EssayPrompt[];
  referenceLetterConfig?: ReferenceLetterConfig;
  applicationProcess?: ApplicationProcess;
  requiresInterview?: boolean;
  strongApplicantProfile?: string;
  winCount?: number;
  officialUrl: string;
  isActive: boolean;
}

export interface CompetitivePosition {
  tier: "strong" | "competitive" | "borderline" | "longshot";
  standoutFactors: string[];
  gapFromWinner: string;
}

export interface CoachingOutput {
  scholarshipObjectives: string;
  backgroundAlignment: string;
  essayStrategy: string;
  documentStrategy?: string;
  weaknesses: { gap: string; mitigation: string }[];
  requirementBreakdown: { requirementLabel: string; guidance: string }[];
  timeline: { milestone: string; targetDate?: string; deliverable: string }[];
  applicationGuide: string;
  competitivePosition?: CompetitivePosition;
  generatedAt: string;
  modelVersion: string;
  cvParsedAt?: string;
}

export interface RecommendationMatch {
  opportunityId: string;
  fitScore: number | null;
  fitTier: "strong" | "good" | "moderate" | "weak";
  reasoning: string;
  standoutFactor: string | null;
  urgency?: string;
  opportunity: Opportunity;
}

export interface EssayDraft {
  _id: string;
  promptId?: string;
  title: string;
  content: string;
  version: number;
  submittedAt: string;
  feedback?: {
    overallAssessment: string;
    strengths: string[];
    issues: { location: string; problem: string; suggestion: string }[];
    authenticityNotes: string;
    reviewedAt: string;
  };
  rewrite?: {
    content: string;
    styleNotes: string;
    changesApplied: string[];
    generatedAt: string;
  };
}

export interface ReferenceLetterReview {
  overallAssessment: string;
  strengths: string[];
  issues: { location: string; problem: string; suggestion: string }[];
  complianceNotes?: string;
  reviewedAt: string;
}

export interface ReferenceLetter {
  _id: string;
  letterType: "work" | "academic" | "other";
  originalFileName: string;
  refereeOrganization?: string;
  uploadedAt: string;
  review?: ReferenceLetterReview;
  /** Structured briefing document for the referee — guidance on what to write, not a ghostwritten letter */
  suggestedRewrite?: {
    content: string;
    styleNotes: string;
    generatedAt: string;
  };
}

export interface ApplicationDocumentReview {
  overallAssessment: string;
  strengths: string[];
  issues: { location: string; problem: string; suggestion: string }[];
  reviewedAt: string;
}

export interface ApplicationDocument {
  _id: string;
  docId: string;
  label: string;
  originalFileName: string;
  uploadedAt: string;
  review?: ApplicationDocumentReview;
  suggestion?: {
    content: string;
    styleNotes: string;
    generatedAt: string;
  };
}

export interface Application {
  _id: string;
  user: string;
  opportunity: Opportunity | string;
  targetApplications: { program?: string; school?: string }[];
  coaching?: CoachingOutput;
  essayDrafts: EssayDraft[];
  referenceLetters: ReferenceLetter[];
  applicationDocuments: ApplicationDocument[];
  status: "draft" | "coaching_generated" | "in_review" | "submitted" | "outcome_recorded";
  outcome?: "pending" | "awarded" | "rejected" | "waitlisted";
}

export interface AnswerFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

export interface InterviewQuestion {
  question: string;
  context: string;
  answer?: string;
  feedback?: AnswerFeedback;
  answeredAt?: string;
}

export interface Interview {
  _id: string;
  opportunity: string;
  opportunityTitle: string;
  opportunityProvider: string;
  questions: InterviewQuestion[];
  overallScore?: number;
  overallFeedback?: string;
  status: "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface CountryGuide {
  code: string;
  name: string;
  flag: string;
  tagline: string;
  overview: string;
  scholarshipCulture: string;
  livingCosts: string;
  visaProcess: string;
  topUniversities: string[];
  popularScholarships: string[];
  bestFor: string[];
  avgMonthlyExpensesUSD: number;
  officialLanguage: string;
  applicationLanguage: string;
  requiresLanguageTest: boolean;
  commonLanguageTests: string[];
  intakeMonths: string[];
  pros: string[];
  cons: string[];
}

export interface CountrySummary {
  code: string;
  name: string;
  flag: string;
  tagline: string;
  bestFor: string[];
  avgMonthlyExpensesUSD: number;
  applicationLanguage: string;
}

export type GrantTag =
  | "africa"
  | "technology"
  | "innovation"
  | "inclusion"
  | "talent"
  | "education"
  | "youth";

export interface Grant {
  _id: string;
  title: string;
  provider: string;
  description: string;
  amount?: string;
  deadline?: string;
  url: string;
  tags: GrantTag[];
  region?: string;
  source: string;
  imageUrl?: string;
  isOpen: boolean;
  scrapedAt: string;
}

export interface GrantsResponse {
  grants: Grant[];
  total: number;
  page: number;
  pages: number;
  lastScrapedAt: string | null;
}

export interface HumanCoach {
  _id: string;
  name: string;
  bio: string;
  photoUrl?: string;
  credential: "alumni" | "panel_member";
  credentialYear?: number;
  scholarships: { opportunityId: string; opportunityTitle: string }[];
  sessionFeeUSD: number;
  platformFeePercent: number;
  linkedIn?: string;
  status: "pending" | "approved" | "rejected";
  totalSessions: number;
  averageRating?: number;
  approvedAt?: string;
  createdAt: string;
}

export interface CoachingBooking {
  _id: string;
  userId: string;
  coachId: HumanCoach | string;
  opportunityId: { _id: string; title: string; country: string } | string;
  sessionType: "coaching" | "review";
  status: "pending_payment" | "requested" | "accepted" | "completed" | "cancelled";
  totalAmountUSD: number;
  coachPayoutUSD: number;
  platformFeeUSD: number;
  userMessage?: string;
  scheduledAt?: string;
  completedAt?: string;
  rating?: number;
  ratingComment?: string;
  createdAt: string;
}
