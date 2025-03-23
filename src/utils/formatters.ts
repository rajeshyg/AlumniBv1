/**
 * Format a full name to display name (FirstName LastInitial)
 * Example: "John Smith" -> "John S"
 */
export function formatDisplayName(fullName: string | undefined): string {
  if (!fullName) return '';
  
  // Remove any quotes that might have been picked up from CSV
  const cleanName = fullName.replace(/["']/g, '').trim();
  
  const parts = cleanName.split(' ');
  if (parts.length === 1) return parts[0];
  
  const firstName = parts[0];S
  const lastInitial = parts[parts.length - 1][0];
  
  return `${firstName} ${lastInitial}`;
}

/**
 * Format date to a localized string
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
}
