import { User } from '../models/User';
import { logger } from '../utils/logger';

export class UserService {
  private static users: User[] = [];
  private static readonly STORAGE_KEY = 'auth_user';
  
  // Parse CSV data into User objects
  static parseCSV(csvData: string): User[] {
    try {
      // Simplify the parsing to debug the issue
      const lines = csvData.split('\n');
      
      // Clean the lines (remove empty ones)
      const cleanedLines = lines.filter(line => line.trim().length > 0);
      
      if (cleanedLines.length <= 1) {
        logger.debug('CSV file appears to be empty or has only headers');
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
          
          // Split name into first and last name
          const fullName = nameIndex >= 0 && values[nameIndex] ? values[nameIndex].replace(/"/g, '') : 'Unknown User';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || 'User';
          
          // Create user object with all required properties
          const user: User = {
            studentId: studentIdIndex >= 0 && values[studentIdIndex] ? values[studentIdIndex].replace(/"/g, '') : `unknown-${index}`,
            name: fullName,
            firstName,
            lastName,
            email: emailIndex >= 0 && values[emailIndex] ? values[emailIndex].replace(/"/g, '') : '',
            centerName: centerNameIndex >= 0 && values[centerNameIndex] ? values[centerNameIndex].replace(/"/g, '') : undefined,
            category: categoryIndex >= 0 && values[categoryIndex] ? values[categoryIndex].replace(/"/g, '') : undefined,
            batch: batchIndex >= 0 && values[batchIndex] ? values[batchIndex].replace(/"/g, '') : undefined,
            role: 'student',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          return user;
        } catch (err) {
          logger.error(`Error parsing CSV line ${index + 1}:`, err);
          return null;
        }
      }).filter(user => user !== null) as User[];
      
      return users;
    } catch (error) {
      logger.error('Error parsing CSV:', error);
      return [];
    }
  }
  
  // Load users from CSV
  static async loadUsers(): Promise<User[]> {
    try {
      const response = await fetch('/data/users.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`);
      }
      
      const csvData = await response.text();
      this.users = this.parseCSV(csvData);
      
      return this.users;
    } catch (error) {
      logger.error('Failed to load users:', error);
      this.users = [];
      return this.users;
    }
  }
  
  // Find users by email
  static async findUsersByEmail(email: string): Promise<User[]> {
    if (this.users.length === 0) {
      await this.loadUsers();
    }
    
    // Normalize email for comparison
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find matching users with case-insensitive comparison
    const matchingUsers = this.users.filter(user => 
      user.email && 
      user.email.trim().toLowerCase() === normalizedEmail
    );
    
    if (matchingUsers.length === 0) {
      logger.debug('No users found for email', { email: normalizedEmail });
    } else {
      logger.debug('Found users for email', { 
        email: normalizedEmail, 
        count: matchingUsers.length 
      });
    }
    
    return matchingUsers;
  }
  
  // Find user by ID
  static async findUserById(studentId: string): Promise<User | null> {
    if (this.users.length === 0) {
      await this.loadUsers();
    }
    
    return this.users.find(user => user.studentId === studentId) || null;
  }
  
  // Login with email
  static async login(email: string, password: string): Promise<{
    success: boolean;
    users?: User[];
    message?: string;
  }> {
    try {
      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Simple validation for empty email or password
      if (!normalizedEmail) {
        return { success: false, message: 'Email is required' };
      }
      
      if (!password || password.trim() === '') {
        return { success: false, message: 'Password is required' };
      }

      const matchingUsers = await this.findUsersByEmail(normalizedEmail);
      
      if (matchingUsers.length === 0) {
        logger.warn('Login attempt with non-existent email', { email: normalizedEmail });
        return { success: false, message: 'Email not found. Please check your email and try again.' };
      }
      
      if (matchingUsers.length === 1) {
        // Single user found, auto-login
        this.setCurrentUser(matchingUsers[0]);
        logger.info('Single user login successful', { 
          email: normalizedEmail,
          userId: matchingUsers[0].studentId 
        });
        return { success: true, users: matchingUsers };
      }
      
      // Multiple users found, return the list for selection
      logger.info('Multiple profiles found for email', { 
        email: normalizedEmail,
        count: matchingUsers.length 
      });
      return { success: true, users: matchingUsers };
    } catch (error) {
      logger.error('Login error:', error);
      return { 
        success: false, 
        message: 'Login failed. Please try again later.' 
      };
    }
  }
  
  // Select a specific user profile (when multiple profiles share an email)
  static selectUserProfile(user: User): void {
    this.setCurrentUser(user);
  }
  
  // Set current user in localStorage
  static setCurrentUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }
  
  // Get current user from localStorage
  static getCurrentUser(): User | null {
    const userJson = localStorage.getItem(this.STORAGE_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }
  
  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
  
  // Logout user
  static logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Search users by query
  static async searchUsers(query: string): Promise<User[]> {
    try {
      logger.info('Starting user search for:', query);
      if (this.users.length === 0) {
        await this.loadUsers();
      }
      
      const searchQuery = query.toLowerCase().trim();
      logger.info('Searching through users:', this.users.length);
      
      const results = this.users.filter(user => {
        const matchEmail = user.email?.toLowerCase().includes(searchQuery);
        const matchName = user.name?.toLowerCase().includes(searchQuery);
        const matchFirstName = user.firstName?.toLowerCase().includes(searchQuery);
        const matchLastName = user.lastName?.toLowerCase().includes(searchQuery);
        const matchStudentId = user.studentId?.toLowerCase().includes(searchQuery);
        const matchCenter = user.centerName?.toLowerCase().includes(searchQuery);
        const matchCategory = user.category?.toLowerCase().includes(searchQuery);
        const matchBatch = user.batch?.toLowerCase().includes(searchQuery);
        
        return matchEmail || matchName || matchFirstName || matchLastName || 
               matchStudentId || matchCenter || matchCategory || matchBatch;
      });

      logger.info('Search results:', { 
        query: searchQuery, 
        resultCount: results.length 
      });
      
      return results;
    } catch (error) {
      logger.error('Error in searchUsers:', error);
      throw new Error('Failed to search users: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
}