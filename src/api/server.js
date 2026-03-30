require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const stores = require('./stores');
const routing = require('./routing');
const db = require('../db/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

app.get('/api/debug', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM stores');
    const extensions = await db.query('SELECT extname FROM pg_extension WHERE extname = $1', ['postgis']);
    res.json({
      status: 'connected',
      storeCount: result.rows[0].count,
      postgisEnabled: extensions.rows.length > 0,
      database: 'supabase'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

app.get('/api/stores', stores.getAllStores);
app.get('/api/stores/nearby', stores.getNearbyStores);
app.get('/api/stores/:id', stores.getStoreById);

app.get('/api/route', routing.getRoute);
app.get('/api/directions', routing.getDirections);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
