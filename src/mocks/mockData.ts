import { User } from '../models/User';

export const mockUser: User = {
  studentId: 'user1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'student',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}; 