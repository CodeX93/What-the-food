/**
 * Utility for client-side image compression and resizing.
 * Helps reduce payload size for uploads and analysis.
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0 to 1
    type?: string; // 'image/jpeg', 'image/png', etc.
}

/**
 * Compresses and resizes an image file.
 * @param file The original File object
 * @param options Compression options (default: max 1200px, 0.8 quality jpeg)
 * @returns Promise resolving to the compressed File object
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.8,
        type = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                // Create canvas and draw image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.fillStyle = 'white'; // Handle transparency for JPEGs
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob/file
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Image compression failed'));
                            return;
                        }

                        // Create new file with same name but potentially new extension if type changed
                        const newName = file.name.replace(/\.[^/.]+$/, "") + (type === 'image/jpeg' ? '.jpg' : '.png');

                        const compressedFile = new File([blob], newName, {
                            type: type,
                            lastModified: Date.now(),
                        });

                        resolve(compressedFile);
                    },
                    type,
                    quality
                );
            };

            img.onerror = (error) => {
                reject(error);
            };
        };

        reader.onerror = (error) => {
            reject(error);
        };
    });
}

/**
 * Helper to convert a File to a Base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
}
