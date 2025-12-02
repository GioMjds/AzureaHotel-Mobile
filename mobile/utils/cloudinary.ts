/**
 * Cloudinary image URL utilities for React Native / Expo
 * Ensures proper URL formatting and provides fallback handling
 */

// Default placeholder image when no image is available
const DEFAULT_PLACEHOLDER = 'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains';

/**
 * Converts AVIF/WebP images to a more compatible format for React Native
 * Some devices/emulators may not support AVIF format
 */
function ensureCompatibleFormat(url: string): string {
    // If it's a Cloudinary URL and ends with .avif, convert to auto format
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        // Check if URL already has transformations
        const hasTransformations = /\/upload\/[a-z]_/.test(url);
        
        if (!hasTransformations) {
            // Add format auto transformation for best compatibility
            return url.replace('/upload/', '/upload/f_auto,q_auto/');
        } else if (url.endsWith('.avif')) {
            // Replace .avif extension with .jpg for compatibility
            return url.replace('.avif', '.jpg');
        }
    }
    return url;
}

/**
 * Ensures a Cloudinary URL is properly formatted for expo-image
 * Handles edge cases like:
 * - Missing protocol (http:// or https://)
 * - Null/undefined URLs
 * - Empty strings
 * - Non-Cloudinary URLs
 * - AVIF format conversion for better device compatibility
 * 
 * @param url - The image URL from the API
 * @param placeholder - Optional custom placeholder URL
 * @returns A valid HTTPS URL for expo-image
 */
export function getCloudinaryUrl(
    url: string | null | undefined,
    placeholder?: string
): string {
    // Return placeholder if URL is falsy
    if (!url || url.trim() === '') {
        return placeholder || DEFAULT_PLACEHOLDER;
    }

    let processedUrl = url;

    // If URL already has https://, use it
    if (url.startsWith('https://')) {
        processedUrl = url;
    }
    // If URL has http://, convert to https://
    else if (url.startsWith('http://')) {
        processedUrl = url.replace('http://', 'https://');
    }
    // If URL starts with //, add https:
    else if (url.startsWith('//')) {
        processedUrl = `https:${url}`;
    }
    // If it's a Cloudinary path without protocol (starts with res.cloudinary.com)
    else if (url.startsWith('res.cloudinary.com')) {
        processedUrl = `https://${url}`;
    }
    // If it's just a path, assume it's invalid
    else if (url.startsWith('/')) {
        return placeholder || DEFAULT_PLACEHOLDER;
    }

    // Ensure compatible format (convert AVIF to auto format)
    const finalUrl = ensureCompatibleFormat(processedUrl);

    return finalUrl;
}

/**
 * Get optimized Cloudinary URL with transformations
 * Adds width, quality, and format transformations for better mobile performance
 * 
 * @param url - The original Cloudinary image URL
 * @param options - Transformation options
 * @returns Optimized Cloudinary URL
 */
export function getOptimizedCloudinaryUrl(
    url: string | null | undefined,
    options: {
        width?: number;
        height?: number;
        quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
        format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    } = {}
): string {
    const validUrl = getCloudinaryUrl(url);
    
    // If it's not a Cloudinary URL, return as-is
    if (!validUrl.includes('res.cloudinary.com')) {
        return validUrl;
    }

    const { width, height, quality = 'auto', format = 'auto' } = options;
    
    // Build transformation string
    const transforms: string[] = [];
    
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    transforms.push(`q_${quality}`);
    transforms.push(`f_${format}`);
    
    // If no transformations needed, return original
    if (transforms.length === 0) {
        return validUrl;
    }

    const transformString = transforms.join(',');

    // Insert transformation after /upload/
    return validUrl.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Create an expo-image compatible source object
 * 
 * @param url - The image URL
 * @param placeholder - Optional placeholder URL
 * @returns Source object for expo-image
 */
export function createImageSource(
    url: string | null | undefined,
    placeholder?: string
): { uri: string } {
    return {
        uri: getCloudinaryUrl(url, placeholder),
    };
}

/**
 * Validate if a URL is a valid Cloudinary URL
 * 
 * @param url - The URL to validate
 * @returns Boolean indicating if it's a valid Cloudinary URL
 */
export function isValidCloudinaryUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    
    const normalizedUrl = getCloudinaryUrl(url);
    return normalizedUrl.includes('res.cloudinary.com');
}

export default {
    getCloudinaryUrl,
    getOptimizedCloudinaryUrl,
    createImageSource,
    isValidCloudinaryUrl,
    DEFAULT_PLACEHOLDER,
};
