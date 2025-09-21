# Frontend Setup Instructions

## Environment Variables

Create a `.env.local` file in the `apps/frontend` directory with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Supabase Configuration (for authentication)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Production Deployment

For production deployment on Vercel:

1. Set `NEXT_PUBLIC_API_URL` to your Digital Ocean backend URL
2. Set Supabase environment variables for authentication

## Architecture

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: NestJS API deployed on Digital Ocean
- **Database**: PostgreSQL (managed by backend)
- **Authentication**: Supabase (handled by frontend)

## API Endpoints

All API requests go to the external backend:

- Salons: `/salons`
- Services: `/services`
- Bookings: `/appointments`
- Users: `/user`

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
