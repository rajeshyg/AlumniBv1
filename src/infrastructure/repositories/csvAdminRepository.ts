import { AdminRepository } from '../../domain/repositories/adminRepository';
import { UserService } from '../../services/UserService';
import { Admin } from '../../models/Admin';
import { AssignMentorRoleRepository } from '../../domain/usecases/assignMentorRole';
import { User } from '../../domain/entities/User';
import { UserRepository, UserSearchResult } from '../../domain/repositories/userRepository';

export class CsvAdminRepository implements AdminRepository, AssignMentorRoleRepository, UserRepository {
  private readonly adminFilePath = '/admin-emails.csv';
  private readonly usersFilePath = '/users.csv';
  private readonly userService = new UserService();

  private parseCsv(csvText: string): Array<{ email: string; role: string; studentId?: string }> {
    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = lines[0].toLowerCase().split(',');
    const emailIndex = headers.indexOf('email');
    const roleIndex = headers.indexOf('role');
    const studentIdIndex = headers.indexOf('studentid');

    if (emailIndex === -1 || roleIndex === -1) {
      throw new Error('Invalid CSV format: missing email or role column');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        email: values[emailIndex].toLowerCase(),
        role: values[roleIndex].toLowerCase(),
        studentId: studentIdIndex !== -1 ? values[studentIdIndex] : undefined
      };
    });
  }

  private stringifyCsv(data: Array<{ email: string; role: string; studentId?: string }>): string {
    const headers = ['email', 'role', 'studentid'];
    const rows = data.map(item => 
      `${item.email},${item.role},${item.studentId || ''}`
    );
    return [headers.join(','), ...rows].join('\n');
  }

  async getAdminEmails(): Promise<string[]> {
    const admins = await this.getAdmins();
    return admins.map(admin => admin.email.toLowerCase());
  }

  async getAdminWithRole(email: string): Promise<Admin | null> {
    try {
      const response = await fetch(this.adminFilePath);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const csvText = await response.text();
      const admins = this.parseCsv(csvText);
      const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
      
      return admin ? { email: admin.email, role: admin.role as Admin['role'] } : null;
    } catch (error) {
      console.error('Error getting admin with role:', error);
      return null;
    }
  }

  private async getAdmins(): Promise<Admin[]> {
    try {
      const response = await fetch(new URL('/admin-emails.csv', window.location.origin));
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const csvText = await response.text();
      console.log('Raw CSV text:', csvText);
      
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length <= 1) return [];
      
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');
      
      if (emailIndex === -1 || roleIndex === -1) {
        throw new Error('Invalid CSV format: missing email or role column');
      }
      
      return lines.slice(1)
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            email: values[emailIndex].toLowerCase(),
            role: values[roleIndex].toLowerCase() as Admin['role']
          };
        })
        .filter(admin => admin.email && admin.role);
    } catch (error) {
      console.error('Error loading admins:', error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const response = await fetch(this.adminFilePath);
      const csvText = await response.text();
      const admins = this.parseCsv(csvText);
      const admin = admins.find(a => a.email === userId);
      
      if (!admin) {
        return {
          id: userId,
          email: userId,
          role: 'student'
        };
      }

      return {
        id: userId,
        email: userId,
        role: admin.role as UserRole
      };
    } catch (error) {
      console.error('Error reading admin data:', error);
      return {
        id: userId,
        email: userId,
        role: 'student'
      };
    }
  }

  async updateUserRole(userId: string, role: string, studentId?: string): Promise<void> {
    try {
      console.log('Updating role for user:', userId, 'to:', role, 'with studentId:', studentId);
      
      // First, get current admin list
      console.log('Fetching current admin list from:', this.adminFilePath);
      const response = await fetch(this.adminFilePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch admin list: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('Current admin list CSV content:', csvText);
      
      const admins = this.parseCsv(csvText);
      // Look for exact match with email and studentId if provided
      const existingIndex = studentId 
        ? admins.findIndex(a => a.email.toLowerCase() === userId.toLowerCase() && a.studentId === studentId)
        : admins.findIndex(a => a.email.toLowerCase() === userId.toLowerCase());
      
      if (existingIndex >= 0) {
        console.log(`Updating existing user at index ${existingIndex}`);
        admins[existingIndex].role = role;
        if (studentId) {
          admins[existingIndex].studentId = studentId;
        }
      } else {
        console.log('Adding new user');
        admins.push({ email: userId, role, studentId });
      }

      const newCsvContent = this.stringifyCsv(admins);
      console.log('New CSV content to be sent:', newCsvContent);
      
      // Try PUT endpoint first (matches our server.js)
      try {
        console.log('Sending PUT request to update admin list');
        const updateResponse = await fetch('/admin-emails.csv', {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/plain', 
          },
          body: newCsvContent,
        });

        // Log full response for debugging
        console.log('Server response status:', updateResponse.status);
        const responseText = await updateResponse.text();
        console.log('Server response text:', responseText || "(empty response)");

        if (!updateResponse.ok) {
          throw new Error(`${updateResponse.status} - ${responseText || updateResponse.statusText}`);
        }
        
        console.log('Role updated successfully via PUT');
      } catch (putError) {
        console.error('PUT request failed:', putError);
        
        // Fallback to POST endpoint without /api prefix
        console.log('Trying POST endpoint as fallback');
        const postResponse = await fetch('/update-admin-roles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            csvContent: newCsvContent,
            email: userId, 
            role: role,
            studentId: studentId
          }),
        });
        
        if (!postResponse.ok) {
          const errorText = await postResponse.text();
          throw new Error(`POST fallback failed: ${postResponse.status} - ${errorText || postResponse.statusText}`);
        }
        console.log('Role updated successfully via POST fallback');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      // Rethrow with detailed message
      throw new Error(`Failed to update role: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    try {
      console.log('Starting search with query:', query);
      const users = await this.userService.searchUsers(query);
      console.log('Users found:', users);
      
      return users.map(user => ({
        id: user.studentId || user.email, // Use studentId as id if available
        email: user.email,
        name: user.name,
        phone: user.phone,
        studentId: user.studentId, // Make sure to include studentId in the result
        role: 'student' // Default role, will be updated if they're in admin list
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private parseUsersCsv(csvText: string): UserSearchResult[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headers = lines[0].toLowerCase().split(',');
    const emailIndex = headers.indexOf('email');
    const phoneIndex = headers.indexOf('phone');
    const nameIndex = headers.indexOf('name');

    if (emailIndex === -1) {
      throw new Error('Invalid CSV format: missing email column');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        id: values[emailIndex],
        email: values[emailIndex],
        phone: phoneIndex !== -1 ? values[phoneIndex] : undefined,
        name: nameIndex !== -1 ? values[nameIndex] : undefined,
        role: 'student' // Default role for users not in admin list
      };
    });
  }
}
