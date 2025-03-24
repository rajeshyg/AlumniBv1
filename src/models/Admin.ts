export interface Admin {
  email: string;
  role: 'system_admin' | 'moderator';
}

export interface AdminRole {
  type: 'system_admin' | 'moderator';
  permissions: string[];
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  system_admin: ['manage_users', 'manage_posts', 'manage_settings', 'approve_posts'],
  moderator: ['review_posts', 'approve_posts']
};
