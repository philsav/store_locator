require("dotenv").config()
const { Pool } = require("pg")

const isSupabase = process.env.DATABASE_URL.includes("supabase")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
})

async function initDatabase() {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS postgis;
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(20) NOT NULL,
        phone VARCHAR(20),
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS stores_location_idx ON stores USING GIST (location);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS stores_city_state_idx ON stores (city, state);
    `)

    await client.query("COMMIT")
    console.log("Database initialized successfully")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Error initializing database:", err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

initDatabase().catch(console.error)
