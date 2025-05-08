/**
 * Formatting utilities for the UI
 */

/**
 * Formats an address for display by truncating the middle
 * @param address The Ethereum address to format
 * @param prefixLength Number of characters to keep at the start
 * @param suffixLength Number of characters to keep at the end
 * @returns Formatted address string
 */
export function formatAddress(
  address: string, 
  prefixLength = 6, 
  suffixLength = 4
): string {
  if (!address) return '';
  if (address.length < prefixLength + suffixLength) return address;
  
  const prefix = address.substring(0, prefixLength);
  const suffix = address.substring(address.length - suffixLength);
  
  return `${prefix}...${suffix}`;
}

/**
 * Formats a timestamp as a relative time from now (e.g., "2 minutes ago")
 * or as a full date if older than a day
 * @param timestamp Timestamp to format
 * @returns Formatted time string
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Less than a minute
  if (diff < 60000) {
    return 'just now';
  }
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Format as date
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

/**
 * Formats a value in wei to ether (or other token with 18 decimals)
 * @param value Wei value as string or BigInt
 * @param decimals Number of decimal places to show
 * @returns Formatted ether value as string
 */
export function formatWeiToEther(
  value: string | bigint, 
  decimals = 4
): string {
  try {
    const valueInWei = typeof value === 'string' ? BigInt(value) : value;
    // Convert to string and pad with zeros if needed
    let stringValue = valueInWei.toString();
    
    // Less than 1 ether
    if (valueInWei < BigInt(10**18)) {
      stringValue = stringValue.padStart(18, '0');
      const integerPart = '0';
      const decimalPart = stringValue.slice(0, decimals).padEnd(decimals, '0');
      return `${integerPart}.${decimalPart}`;
    }
    
    // More than 1 ether
    const integerPart = stringValue.slice(0, -18);
    const decimalPart = stringValue.slice(-18, -18 + decimals).padEnd(decimals, '0');
    return `${integerPart}.${decimalPart}`;
  } catch (error) {
    console.error('Error formatting wei to ether:', error);
    return '0.0000';
  }
}

/**
 * Formats a transaction hash for display
 * @param hash Transaction hash
 * @returns Formatted hash string
 */
export function formatTxHash(hash: string): string {
  if (!hash) return '';
  return formatAddress(hash, 10, 8);
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
} 