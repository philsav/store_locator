require("dotenv").config()
const { Pool } = require("pg")

const isProduction = process.env.NODE_ENV === "production"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
})

pool.on("error", err => {
  console.error("Unexpected error on idle client", err)
})

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
}
