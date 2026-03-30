const db = require('../db/db');

async function getAllStores(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        id, name, address, city, state, zip_code, phone,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng
      FROM stores
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
}

async function getNearbyStores(req, res) {
  const { lat, lng, radius = 50000 } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const result = await db.query(`
      SELECT 
        id, name, address, city, state, zip_code, phone,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
      FROM stores
      WHERE ST_DWithin(
        location, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
        $3
      )
      ORDER BY distance
    `, [lng, lat, radius]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch nearby stores' });
  }
}

async function getStoreById(req, res) {
  const { id } = req.params;
  
  try {
    const result = await db.query(`
      SELECT 
        id, name, address, city, state, zip_code, phone,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng
      FROM stores
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
}

module.exports = {
  getAllStores,
  getNearbyStores,
  getStoreById,
};
