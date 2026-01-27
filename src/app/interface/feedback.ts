export interface Feedback {
  id?: number;
  category: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackDialogData {
  category: string;
  description: string;
}
