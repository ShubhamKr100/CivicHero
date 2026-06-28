export type IssueCategory = "Pothole" | "Garbage" | "Damaged Streetlight" | "Water Leakage" | "Other";
export type IssueStatus = "Reported" | "Verified" | "In Progress" | "Resolved";

export interface ClassificationResult {
  category: IssueCategory;
  description: string;
  severity: "Low" | "Medium" | "High";
  confidence: number;
}

export interface Submission {
  id: string;
  timestamp: string;
  imageUrl: string;
  result: ClassificationResult;
  rawJson: string;
  status: IssueStatus;
  upvotes: number;
  isUserSubmitted?: boolean; // Added to distinguish user reports from simulation presets
  location?: {
    latitude: number;
    longitude: number;
  };
  resolutionProofImageUrl?: string;
  resolutionVerified?: boolean;
  feedbackVotes?: {
    positive: number;
    negative: number;
  };
  feedbackReverted?: boolean;
}

export interface SamplePreset {
  id: string;
  name: string;
  category: IssueCategory;
  imageUrl: string;
  description: string;
  latitude: number;
  longitude: number;
}
