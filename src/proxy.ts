import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isExtension = origin?.startsWith('chrome-extension://');
  const isLocalhost = origin?.includes('localhost');

  // Allow requests from extension and localhost
  if (isExtension || isLocalhost || !origin) {
    const response = NextResponse.next();
    
    // CORS headers
    response.headers.set('Access-Control-Allow-Origin', isExtension ? '*' : origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }

  return NextResponse.next();
}

// Apply middleware to all API routes
export const config = {
  matcher: ['/api/:path*']
};
