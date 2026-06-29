import { NextResponse } from '@vercel/edge';
import type { NextRequest } from '@vercel/edge';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Use the env variable set on Vercel
  const backendUrl = process.env.BACKEND_API_URL || '';

  // 1. Rewrite API requests (/api/...)
  if (pathname.startsWith('/api/')) {
    return NextResponse.rewrite(new URL(pathname + search, backendUrl));
  }

  // 2. Rewrite upload requests (/uploads/...)
  if (pathname.startsWith('/uploads/')) {
    return NextResponse.rewrite(new URL(pathname + search, backendUrl));
  }

  // 3. Rewrite websocket connections (/ws/...)
  if (pathname.startsWith('/ws/')) {
    return NextResponse.rewrite(new URL(pathname + search, backendUrl));
  }

  // Let all other requests (static assets, page routes) pass through normally
  return NextResponse.next();
}
