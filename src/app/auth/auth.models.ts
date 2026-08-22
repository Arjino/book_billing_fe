import { Role } from './role.model';

export interface AuthRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username?: string;
  role?: Role;
  companyId?: number;
  companyName?: string;
  partyId?: number;
}

export interface UserProfile {
  username: string;
  role: Role;
  companyId: number;
  companyName: string;
  partyId?: number;
}

export interface RegisterUserRequest {
  username: string;
  email: string;
  password: string;
  joinCode: string;
  claimedPartyId?: number;
  claimedName?: string;
  claimedPhone?: string;
  claimedGstin?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}
