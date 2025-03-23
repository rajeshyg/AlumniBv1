export interface User {
  studentId: string;
  name: string; // Full name as provided in CSV
  email: string;
  centerName?: string;
  category?: string;
  batch?: string;
  // Other fields we're not using yet but might be needed later
  // phone?: string;
  // fatherName?: string;
  // result?: string;
  // familyName?: string;
  // gitaFamily?: string;
  // familyId?: string;
  // isKurukshetra?: boolean;
  // isUpdated?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}
