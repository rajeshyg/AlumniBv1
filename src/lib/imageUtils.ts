/**
 * Utility functions for handling images
 */
import { logger } from '../utils/logger';

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
  if (imageName.startsWith('http') || imageName.startsWith('data:') || imageName.startsWith('/')) {
    return imageName;
  }

  // Log the image path resolution for debugging
  logger.debug('Resolving image path', {
    original: imageName,
    resolved: `${IMAGE_BASE_PATH}${imageName}`
  });

  // Otherwise, resolve it relative to our image folder
  return `${IMAGE_BASE_PATH}${imageName}`;
}

/**
 * Gets a fallback image for a specific category or organization
 * @param category The post category
 * @param organization The organization associated with the post
 * @returns Path to a fallback image
 */
export function getCategoryFallbackImage(category?: string, organization?: string): string {
  let fallbackImage = '';

  // First check if we have an organization-specific image
  if (organization) {
    const orgLower = organization.toLowerCase();
    if (orgLower.includes('yale')) {
      fallbackImage = `${IMAGE_BASE_PATH}yale_logo.png`;
    } else if (orgLower.includes('google')) {
      fallbackImage = `${IMAGE_BASE_PATH}google_logo.png`;
    } else if (orgLower.includes('mit') || orgLower.includes('massachusetts institute')) {
      fallbackImage = `${IMAGE_BASE_PATH}mit_logo.png`;
    } else if (orgLower.includes('harvard')) {
      fallbackImage = `${IMAGE_BASE_PATH}harvard_logo.png`;
    } else if (orgLower.includes('stanford')) {
      fallbackImage = `${IMAGE_BASE_PATH}stanford_logo.png`;
    } else if (orgLower.includes('speakout')) {
      fallbackImage = `${IMAGE_BASE_PATH}Scholorship_2.jpeg`;
    } else if (orgLower.includes('wise')) {
      fallbackImage = `${IMAGE_BASE_PATH}wise_logo.png`;
    }
  }

  // If no organization match, fall back to category
  if (!fallbackImage && category) {
    switch(category.toLowerCase()) {
      case 'internship':
      case 'internships':
        fallbackImage = `${IMAGE_BASE_PATH}Internship_1.png`;
        break;
      case 'graduate program':
      case 'graduate programs':
      case 'admissions':
        fallbackImage = `${IMAGE_BASE_PATH}Admission_1.jpg`;
        break;
      case 'scholarship':
      case 'scholarships':
        fallbackImage = `${IMAGE_BASE_PATH}Scholarship3.jpg`;
        break;
      case 'research':
      case 'research opportunities':
        fallbackImage = `${IMAGE_BASE_PATH}research_logo.png`;
        break;
    }
  }

  // If still no match, use default
  if (!fallbackImage) {
    fallbackImage = `${IMAGE_BASE_PATH}Internship_2.png`;
  }

  logger.debug('Using fallback image', {
    category,
    organization,
    fallbackImage
  });

  return fallbackImage;
}
