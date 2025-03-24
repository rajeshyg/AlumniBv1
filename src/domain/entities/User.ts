export type UserRole = 'student' | 'mentor' | 'moderator' | 'system_admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}
