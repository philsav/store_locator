-- Append 200 fictional portfolio demo stores: four per US state.
-- Coordinates are approximate sample points near each city, not verified business addresses.
-- Existing stores are preserved. Re-running skips already-added demo stores.
BEGIN;
WITH cities(state, city, lat, lng) AS (VALUES
  ('AL', 'Birmingham', 33.5186, -86.8104),
  ('AK', 'Anchorage', 61.2181, -149.9003),
  ('AZ', 'Phoenix', 33.4484, -112.0740),
  ('AR', 'Little Rock', 34.7465, -92.2896),
  ('CA', 'Los Angeles', 34.0522, -118.2437),
  ('CO', 'Denver', 39.7392, -104.9903),
  ('CT', 'Hartford', 41.7658, -72.6734),
  ('DE', 'Wilmington', 39.7391, -75.5398),
  ('FL', 'Orlando', 28.5383, -81.3792),
  ('GA', 'Atlanta', 33.7490, -84.3880),
  ('HI', 'Honolulu', 21.3099, -157.8581),
  ('ID', 'Boise', 43.6150, -116.2023),
  ('IL', 'Chicago', 41.8781, -87.6298),
  ('IN', 'Indianapolis', 39.7684, -86.1581),
  ('IA', 'Des Moines', 41.5868, -93.6250),
  ('KS', 'Wichita', 37.6872, -97.3301),
  ('KY', 'Louisville', 38.2527, -85.7585),
  ('LA', 'Baton Rouge', 30.4515, -91.1871),
  ('ME', 'Portland', 43.6591, -70.2568),
  ('MD', 'Baltimore', 39.2904, -76.6122),
  ('MA', 'Boston', 42.3601, -71.0589),
  ('MI', 'Detroit', 42.3314, -83.0458),
  ('MN', 'Minneapolis', 44.9778, -93.2650),
  ('MS', 'Jackson', 32.2988, -90.1848),
  ('MO', 'Kansas City', 39.0997, -94.5786),
  ('MT', 'Billings', 45.7833, -108.5007),
  ('NE', 'Omaha', 41.2565, -95.9345),
  ('NV', 'Las Vegas', 36.1699, -115.1398),
  ('NH', 'Manchester', 42.9956, -71.4548),
  ('NJ', 'Newark', 40.7357, -74.1724),
  ('NM', 'Albuquerque', 35.0844, -106.6504),
  ('NY', 'New York', 40.7128, -74.0060),
  ('NC', 'Charlotte', 35.2271, -80.8431),
  ('ND', 'Fargo', 46.8772, -96.7898),
  ('OH', 'Columbus', 39.9612, -82.9988),
  ('OK', 'Oklahoma City', 35.4676, -97.5164),
  ('OR', 'Portland', 45.5152, -122.6784),
  ('PA', 'Philadelphia', 39.9526, -75.1652),
  ('RI', 'Providence', 41.8240, -71.4128),
  ('SC', 'Columbia', 34.0007, -81.0348),
  ('SD', 'Sioux Falls', 43.5446, -96.7311),
  ('TN', 'Nashville', 36.1627, -86.7816),
  ('TX', 'Austin', 30.2672, -97.7431),
  ('UT', 'Salt Lake City', 40.7608, -111.8910),
  ('VT', 'Burlington', 44.4759, -73.2121),
  ('VA', 'Richmond', 37.5407, -77.4360),
  ('WA', 'Seattle', 47.6062, -122.3321),
  ('WV', 'Charleston', 38.3498, -81.6326),
  ('WI', 'Madison', 43.0731, -89.4012),
  ('WY', 'Cheyenne', 41.1400, -104.8202)
), branches(number, lat_offset, lng_offset) AS (VALUES
  (1, 0.000, 0.000), (2, 0.012, 0.000),
  (3, 0.000, -0.012), (4, -0.012, 0.000)
), candidates AS (
  SELECT city || ' Demo Store ' || number AS name,
    number || ' Sample Avenue (demo)' AS address, city, state,
    lat + lat_offset AS lat, lng + lng_offset AS lng
  FROM cities CROSS JOIN branches
), added AS (
  INSERT INTO stores(name, address, city, state, zip_code, phone, location)
  SELECT c.name, c.address, c.city, c.state, '00000', NULL,
    ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1 FROM stores s WHERE s.name = c.name AND s.city = c.city AND s.state = c.state
  )
  RETURNING id
)
SELECT COUNT(*) AS stores_added FROM added;
SELECT COUNT(*) AS total_stores, COUNT(DISTINCT state) AS states_covered FROM stores;
COMMIT;
