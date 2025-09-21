# Vercel Setup Instructions

## Environment Variables

Add these environment variables in your Vercel dashboard:

```
DATABASE_URL=postgresql://username:password@host:port/database
DIRECT_URL=postgresql://username:password@host:port/database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Build Process

The build process will:

1. Generate Prisma client from the shared schema in `packages/db`
2. Build the Next.js application

## Architecture

- **Source Schema**: Main schema in `packages/db/prisma/schema.prisma`
- **Local Copy**: Frontend has a local copy in `apps/frontend/prisma/schema.prisma`
- **Auto Sync**: Schema is automatically synced during build process
- **Vercel Compatible**: No symlinks or complex paths that Vercel can't handle

## Development Workflow

1. **Make schema changes** in `packages/db/prisma/schema.prisma`
2. **Run sync command**: `npm run sync-schema` (optional, auto-synced during build)
3. **Build works** on Vercel with local schema copy

## Important Notes

- Make sure your database is accessible from Vercel
- Ensure all environment variables are set correctly
- Schema is automatically synced during build time
- Schema changes should be made in `packages/db/prisma/schema.prisma`
- Local copy is maintained automatically for Vercel compatibility
