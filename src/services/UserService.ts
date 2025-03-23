import { User } from '../models/User';

export interface IUserService {
  loadUsers(): Promise<User[]>;
  findUsersByEmail(email: string): Promise<User[]>;
  findUserById(studentId: string): Promise<User | null>;
  login(email: string, password: string): Promise<{
    success: boolean;
    users?: User[];
    message?: string;
  }>;
  selectUserProfile(user: User): void;
  setCurrentUser(user: User): void;
  getCurrentUser(): Promise<User | null>;
  isAuthenticated(): boolean;
  logout(): void;
  switchProfile(options: { keepEmail?: boolean; redirectToLogin?: boolean }): void;
}

export class UserService implements IUserService {
  private users: User[] = [];
  private readonly STORAGE_KEY = 'auth_user';
  
  // Parse CSV data into User objects
  private parseCSV(csvData: string): User[] {
    try {
      // Simplify the parsing to debug the issue
      const lines = csvData.split('\n');
      
      // Clean the lines (remove empty ones)
      const cleanedLines = lines.filter(line => line.trim().length > 0);
      
      if (cleanedLines.length <= 1) {
        console.warn('CSV file appears to be empty or has only headers');
        return [];
      }
      
      // Get headers
      const headers = cleanedLines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Find column indexes (case insensitive)
      const studentIdIndex = headers.indexOf('studentid');
      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const centerNameIndex = headers.indexOf('centername');
      const categoryIndex = headers.indexOf('category');
      const batchIndex = headers.indexOf('batch');
      
      // Parse data rows
      const users = cleanedLines.slice(1).map((line, index) => {
        try {
          // Improve CSV parsing for quoted fields
          let values: string[] = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          
          // Add the last value
          values.push(currentValue.trim());
          
          // Create user object
          const user: User = {
            studentId: studentIdIndex >= 0 && values[studentIdIndex] ? values[studentIdIndex].replace(/"/g, '') : `unknown-${index}`,
            name: nameIndex >= 0 && values[nameIndex] ? values[nameIndex].replace(/"/g, '') : 'Unknown User',
            email: emailIndex >= 0 && values[emailIndex] ? values[emailIndex].replace(/"/g, '') : '',
            centerName: centerNameIndex >= 0 && values[centerNameIndex] ? values[centerNameIndex].replace(/"/g, '') : undefined,
            category: categoryIndex >= 0 && values[categoryIndex] ? values[categoryIndex].replace(/"/g, '') : undefined,
            batch: batchIndex >= 0 && values[batchIndex] ? values[batchIndex].replace(/"/g, '') : undefined,
          };
          
          return user;
        } catch (err) {
          console.error(`Error parsing CSV line ${index + 1}:`, err);
          return null;
        }
      }).filter(user => user !== null) as User[];
      
      return users;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  }
  
  // Load users from CSV
  async loadUsers(): Promise<User[]> {
    try {
      const response = await fetch('/data/users.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`);
      }
      
      const csvData = await response.text();
      this.users = this.parseCSV(csvData);
      
      return this.users;
    } catch (error) {
      console.error('Failed to load users:', error);
      this.users = [];
      return this.users;
    }
  }
  
  // Find users by email
  async findUsersByEmail(email: string): Promise<User[]> {
    if (this.users.length === 0) {
      await this.loadUsers();
    }
    
    // Find matching users
    const matchingUsers = this.users.filter(user => 
      user.email && 
      user.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
    
    return matchingUsers;
  }
  
  // Find user by ID
  async findUserById(studentId: string): Promise<User | null> {
    if (this.users.length === 0) {
      await this.loadUsers();
    }
    
    return this.users.find(user => user.studentId === studentId) || null;
  }
  
  // Login with email
  async login(email: string, password: string): Promise<{
    success: boolean;
    users?: User[];
    message?: string;
  }> {
    try {
      // For prototype, password is always "test"
      if (password !== 'test') {
        return { success: false, message: 'Invalid password' };
      }
      
      // Simple validation for empty email
      if (!email || email.trim() === '') {
        return { success: false, message: 'Email is required' };
      }
      
      const matchingUsers = await this.findUsersByEmail(email);
      
      if (matchingUsers.length === 0) {
        return { success: false, message: 'Email not found' };
      }
      
      if (matchingUsers.length === 1) {
        // Single user found, auto-login
        this.setCurrentUser(matchingUsers[0]);
        return { success: true, users: matchingUsers };
      }
      
      // Multiple users found, return the list for selection
      return { success: true, users: matchingUsers };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed - ' + (error instanceof Error ? error.message : String(error)) };
    }
  }
  
  // Select a specific user profile (when multiple profiles share an email)
  selectUserProfile(user: User): void {
    this.setCurrentUser(user);
  }
  
  // Set current user in localStorage
  setCurrentUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }
  
  // Get current user from localStorage
  async getCurrentUser(): Promise<User | null> {
    const userJson = localStorage.getItem(this.STORAGE_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }
  
  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
  
  // Logout user
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Switch Profile
  switchProfile(options: { keepEmail?: boolean; redirectToLogin?: boolean }): void {
    localStorage.removeItem(this.STORAGE_KEY);
    if (options.keepEmail) {
      // Implement logic to keep the email if needed
      // For now, just navigate to login
      if (options.redirectToLogin) {
        //window.location.href = '/login'; // handled by component
      }
    } else {
      if (options.redirectToLogin) {
        //window.location.href = '/login'; // handled by component
      }
    }
  }
}
