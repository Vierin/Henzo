/**
 * Centralized route configuration
 * Used by middleware and route guards for consistent access control
 */

export type UserRole = 'CLIENT' | 'OWNER' | 'ADMIN';

export interface RouteConfig {
  public: readonly string[];
  client: readonly string[];
  owner: readonly string[];
  admin: readonly string[];
}

/**
 * Public routes - accessible without authentication
 */
export const publicRoutes = [
  '/', // client homepage
  '/business', // studio landing
  '/about',
  '/contact',
  '/terms-of-service',
  '/privacy-policy',
  '/login',
  '/register',
  '/forgot-password',
] as const;

/**
 * Client routes - require CLIENT role
 */
export const clientRoutes = [] as const;

/**
 * Owner routes - require OWNER role
 */
export const ownerRoutes = ['/owner'] as const;

/**
 * Admin routes - require ADMIN role
 */
export const adminRoutes = ['/admin'] as const;

/**
 * Route configuration object
 */
export const routeConfig: RouteConfig = {
  public: publicRoutes,
  client: clientRoutes,
  owner: ownerRoutes,
  admin: adminRoutes,
} as const;

/**
 * Role to routes mapping
 */
export const roleRouteMap: Record<UserRole, readonly string[]> = {
  CLIENT: clientRoutes,
  OWNER: ownerRoutes,
  ADMIN: adminRoutes,
} as const;

/**
 * Check if a path matches a route pattern
 * Supports exact matches and prefix matches
 */
export function isRouteMatch(path: string, routes: readonly string[]): boolean {
  return routes.some((route) => path === route || path.startsWith(`${route}/`));
}

/**
 * Check if route is public
 */
export function isPublicRoute(path: string): boolean {
  return isRouteMatch(path, publicRoutes);
}

/**
 * Check if route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  return (
    isRouteMatch(path, clientRoutes) ||
    isRouteMatch(path, ownerRoutes) ||
    isRouteMatch(path, adminRoutes)
  );
}

/**
 * Get required role for a route
 * Returns null if route is public or doesn't require specific role
 */
export function getRequiredRole(path: string): UserRole | null {
  if (isRouteMatch(path, clientRoutes)) return 'CLIENT';
  if (isRouteMatch(path, ownerRoutes)) return 'OWNER';
  if (isRouteMatch(path, adminRoutes)) return 'ADMIN';
  return null;
}

/**
 * Check if user role has access to route
 */
export function hasRouteAccess(
  path: string,
  userRole: UserRole | null,
): boolean {
  const requiredRole = getRequiredRole(path);
  if (!requiredRole) return true; // Public route or no role required
  if (!userRole) return false; // Protected route but no user role
  return userRole === requiredRole;
}

/**
 * Special route patterns that need custom handling
 */
export const specialRoutes = {
  business: {
    public: [] as string[],
    protected: (_path: string) => false,
  },
  ownerPrefix: (path: string) =>
    path === '/owner' || path.startsWith('/owner/'),
} as const;
