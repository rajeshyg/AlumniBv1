export interface User {
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  centerName?: string;
  category?: string;
  batch?: string;
  role: 'student' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  awaitingProfileSelection: boolean;
}
