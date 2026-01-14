/**
 * Converts a tag name to a URL-friendly slug
 * Examples: "Pasta" -> "pasta", "Spicy Food" -> "spicy-food"
 */
export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Converts a slug back to a display-friendly tag name
 * Example: "spicy-food" -> "Spicy Food"
 */
export function slugToTag(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
