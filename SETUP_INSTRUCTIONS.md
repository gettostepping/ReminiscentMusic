# Setup Instructions for Reminiscent

## Step 1: Create .env file

Create a `.env` file in the root directory with the following content:

```env
# Database - Get this from Neon console or run: npx neonctl@latest connection-string
DATABASE_URL="postgresql://user:password@hostname.neon.tech/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="Z4N5H2OXsFxe8L7BqA3EvGcg9Wb6JPMI"

# Discord OAuth (Optional - leave empty if not using Discord login)
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
```

### To get your Neon DATABASE_URL:

1. Go to https://console.neon.tech
2. Select your project (or create a new one)
3. Go to the "Connection Details" section
4. Copy the connection string and paste it in the `.env` file

OR run this command (after selecting your organization):
```bash
npx neonctl@latest connection-string
```

## Step 2: Run Database Migrations

Once your `.env` file is set up with the DATABASE_URL, run:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all the database tables
- Set up the schema
- Generate the Prisma Client

## Step 3: Start the Development Server

```bash
npm run dev
```

Then open http://localhost:3000 in your browser!

## Troubleshooting

### If you get a database connection error:
- Make sure your DATABASE_URL in `.env` is correct
- Check that your Neon database is running
- Verify the connection string includes `?sslmode=require`

### If you get Prisma errors:
- Run `npx prisma generate` to regenerate the Prisma Client
- Make sure all dependencies are installed: `npm install`

### To reset the database:
```bash
npx prisma migrate reset
```

This will drop all tables and recreate them (⚠️ deletes all data).

