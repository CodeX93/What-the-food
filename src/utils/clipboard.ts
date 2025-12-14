/**
 * Universal clipboard utility that works on both HTTP and HTTPS
 * Provides fallback methods for environments where Clipboard API is not available
 */

/**
 * Copy text to clipboard with automatic fallback for HTTP environments
 * @param text - The text to copy to clipboard
 * @returns Promise that resolves to true if copy was successful, false otherwise
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Try modern Clipboard API first (works on HTTPS and localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (clipboardError) {
        // Clipboard API failed, try fallback
        console.warn('Clipboard API failed, trying fallback method:', clipboardError);
      }
    }
    
    // Fallback for older browsers or HTTP environments
    // This method works on both HTTP and HTTPS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    textArea.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(textArea);
    
    // Select and copy
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length); // For mobile devices
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

/**
 * Check if clipboard operations are available
 * @returns true if clipboard operations are likely to work
 */
export const isClipboardAvailable = (): boolean => {
  return !!(
    (navigator.clipboard && navigator.clipboard.writeText) ||
    document.execCommand
  );
};
