import { User } from '../entities/User';

export interface UserSearchResult {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  role: string;
}

export interface UserRepository {
  searchUsers(query: string): Promise<UserSearchResult[]>;
}
