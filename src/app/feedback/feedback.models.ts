export interface Feedback {
  id?: number;
  submittedBy?: string;
  category: string;
  description: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackDialogData {
  submittedBy: string;
  category: string;
  description: string;
  rating: number;
}
