# Deploy on Render

This app serves its frontend and Express API from one Node web service.
The database must support PostgreSQL and PostGIS. Reuse the existing
database connection if available; the server code refers to Neon.

1. Create a Render web service from this repository, or use its Blueprint.
2. Select the Free instance type, build command `npm install`, and start
   command `npm start`. Use Node 22 and `NODE_ENV=production`.
3. Enter the PostgreSQL connection string as the secret `DATABASE_URL`
   environment variable in Render. Never commit the connection string.
4. Deploy and verify `/healthz`, `/api/stores`, and the map interface.
5. Replace the old Replit URL in the Beracah Design portfolio only after
   store loading, nearby search, and directions work at the new URL.

The health endpoint checks the web process, not database connectivity.
For a new empty database, enable PostGIS and create the schema using
`npm run db:init`. Review connection/TLS settings before running it.
Do not run `npm run seed` against an existing database: it deletes all
current stores before adding the sample data.

Render free services can sleep when idle, causing a delayed first visit.
