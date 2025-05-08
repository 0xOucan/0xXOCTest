/**
 * Rate limiting utility to prevent API abuse
 */

// Default rate limits
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 60; // 60 requests per minute

// Store IP-based request counts
interface RequestTracker {
  count: number;
  resetTime: number;
}

const requestMap: Map<string, RequestTracker> = new Map();

/**
 * Check if a request from the given IP is allowed based on rate limits
 * 
 * @param ip Client IP address
 * @param windowMs Time window in milliseconds
 * @param maxRequests Maximum requests allowed in the window
 * @returns Whether the request should be allowed
 */
export function isRequestAllowed(
  ip: string,
  windowMs: number = DEFAULT_WINDOW_MS,
  maxRequests: number = DEFAULT_MAX_REQUESTS
): boolean {
  const now = Date.now();
  
  // Get or create request tracker for this IP
  let tracker = requestMap.get(ip);
  if (!tracker) {
    tracker = {
      count: 0,
      resetTime: now + windowMs
    };
    requestMap.set(ip, tracker);
  }
  
  // Check if the window has reset
  if (now > tracker.resetTime) {
    tracker.count = 0;
    tracker.resetTime = now + windowMs;
  }
  
  // Increment count and check against limit
  tracker.count++;
  
  return tracker.count <= maxRequests;
}

/**
 * Clean up expired rate limit entries (call periodically to prevent memory leaks)
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  
  for (const [ip, tracker] of requestMap.entries()) {
    if (now > tracker.resetTime) {
      requestMap.delete(ip);
    }
  }
}

/**
 * Get remaining requests for an IP
 * 
 * @param ip Client IP address
 * @param maxRequests Maximum requests allowed in the window
 * @returns Number of remaining requests
 */
export function getRemainingRequests(
  ip: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS
): number {
  const tracker = requestMap.get(ip);
  
  if (!tracker) {
    return maxRequests;
  }
  
  return Math.max(0, maxRequests - tracker.count);
}

// Set up periodic cleanup to prevent memory leaks (every 5 minutes)
setInterval(cleanupRateLimiter, 5 * 60 * 1000); 