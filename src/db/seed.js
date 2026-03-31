const db = require("./db")

const sampleStores = [
  { name: "Downtown Store", address: "123 Main St", city: "San Francisco", state: "CA", zip_code: "94102", phone: "415-555-0101", lat: 37.7849, lng: -122.4094 },
  { name: "Marina Branch", address: "456 Marina Blvd", city: "San Francisco", state: "CA", zip_code: "94123", phone: "415-555-0102", lat: 37.8024, lng: -122.4382 },
  { name: "Mission District Store", address: "789 Valencia St", city: "San Francisco", state: "CA", zip_code: "94110", phone: "415-555-0103", lat: 37.7599, lng: -122.4148 },
  { name: "Oakland Main", address: "100 Broadway", city: "Oakland", state: "CA", zip_code: "94607", phone: "510-555-0104", lat: 37.7956, lng: -122.2755 },
  { name: "Berkeley Store", address: "200 University Ave", city: "Berkeley", state: "CA", zip_code: "94704", phone: "510-555-0105", lat: 37.8716, lng: -122.2727 },
  { name: "Palo Alto Center", address: "300 El Camino Real", city: "Palo Alto", state: "CA", zip_code: "94301", phone: "650-555-0106", lat: 37.4419, lng: -122.143 },
  { name: "San Jose Mall", address: "400 Santana Row", city: "San Jose", state: "CA", zip_code: "95128", phone: "408-555-0107", lat: 37.323, lng: -121.9473 },
  { name: "Fremont Plaza", address: "500 Fremont Blvd", city: "Fremont", state: "CA", zip_code: "94538", phone: "510-555-0108", lat: 37.5485, lng: -121.9886 }
]

async function seedDatabase() {
  try {
    await db.query("DELETE FROM stores")

    for (const store of sampleStores) {
      await db.query(
        `INSERT INTO stores (name, address, city, state, zip_code, phone, location)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography)`,
        [store.name, store.address, store.city, store.state, store.zip_code, store.phone, store.lng, store.lat]
      )
    }

    console.log(`Seeded ${sampleStores.length} stores successfully`)
  } catch (err) {
    console.error("Error seeding database:", err)
    throw err
  } finally {
    // Ensure pool is ended properly
    await db.end()
  }
}

seedDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
