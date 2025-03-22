/**
 * Utility functions for handling images
 */

// Base path for images
const IMAGE_BASE_PATH = '/img/';

/**
 * Resolves a local image path
 * @param imageName The image file name from JSON
 * @returns The full path to the image
 */
export function resolveImagePath(imageName: string | undefined): string | undefined {
  if (!imageName) return undefined;
  
  // If it's already a full URL or data URL, return as is
  if (imageName.startsWith('http') || imageName.startsWith('data:')) {
    return imageName;
  }
  
  // Otherwise, resolve it relative to our image folder
  return `${IMAGE_BASE_PATH}${imageName}`;
}

/**
 * Gets a fallback image for a specific category
 * @param category The post category
 * @returns Path to a fallback image
 */
export function getCategoryFallbackImage(category?: string): string {
  switch(category?.toLowerCase()) {
    case 'internship':
      return `${IMAGE_BASE_PATH}Internship_1.png`;
    case 'graduate program':
      return `${IMAGE_BASE_PATH}Admission_1.jpg`;
    case 'scholarship':
      return `${IMAGE_BASE_PATH}Scholarship3.jpg`;
    default:
      return `${IMAGE_BASE_PATH}Internship_2.png`;
  }
}
