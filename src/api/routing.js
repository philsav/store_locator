async function getRoute(req, res) {
  const { start, end } = req.query

  if (!start || !end) {
    return res.status(400).json({ error: "start and end coordinates are required" })
  }
  // Validate coordinate format: lng,lat;lng,lat
  const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*;-?\d+\.?\d*,-?\d+\.?\d*$/
  if (!coordPattern.test(start) || !coordPattern.test(end)) {
    return res.status(400).json({ error: "Invalid coordinate format. Use lng,lat;lng,lat" })
  }
  const routingApiUrl = process.env.ROUTING_API_URL || "https://router.project-osrm.org"

  try {
    const response = await fetch(`${routingApiUrl}/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true`)

    if (!response.ok) {
      throw new Error(`Routing API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: "No route found" })
    }

    res.json({
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
      steps: data.routes[0].legs[0].steps.map(step => ({
        instruction: step.maneuver.type === "arrive" ? "Arrive at destination" : step.maneuver.modifier + " " + step.maneuver.type,
        distance: step.distance,
        duration: step.duration,
        name: step.name
      }))
    })
  } catch (err) {
    console.error("Routing error:", err)
    res.status(500).json({ error: "Failed to get route" })
  }
}

async function getDirections(req, res) {
  const { lat, lng, destLng, destLat } = req.query

  if (!lat || !lng || !destLng || !destLat) {
    return res.status(400).json({ error: "All coordinates (lat, lng, destLat, destLng) are required" })
  }
  // Validate coordinates are numeric
  const coords = { lat: parseFloat(lat), lng: parseFloat(lng), destLat: parseFloat(destLat), destLng: parseFloat(destLng) }
  if (Object.values(coords).some(c => isNaN(c))) {
    return res.status(400).json({ error: "All coordinates must be valid numbers" })
  }

  if (Math.abs(coords.lat) > 90 || Math.abs(coords.destLat) > 90 || Math.abs(coords.lng) > 180 || Math.abs(coords.destLng) > 180) {
    return res.status(400).json({ error: "Invalid coordinate values. Latitude must be between -90 and 90, Longitude between -180 and 180" })
  }
  const routingApis = [process.env.ROUTING_API_URL || "https://router.project-osrm.org", "https://routing.openstreetmap.de/routed-car/route/v1/driving", "https://graphhopper.com/api/1/route"]

  const osrmUrl = `${routingApis[0]}/route/v1/driving/${lng},${lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`

  async function tryOsrmRoute(url) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error("No route found")
      }
      return data
    } catch (err) {
      clearTimeout(timeout)
      throw err
    }
  }

  try {
    const data = await tryOsrmRoute(osrmUrl)
    const route = data.routes[0]

    res.json({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps: route.legs[0].steps.map(step => ({
        instruction: step.maneuver.type === "arrive" ? "Arrive at destination" : `${step.maneuver.modifier || ""} ${step.maneuver.type}`.trim(),
        distance: step.distance,
        duration: step.duration,
        name: step.name || "Unknown street"
      }))
    })
  } catch (err) {
    console.error("Directions error:", err.message)
    res.status(500).json({ error: "Routing service unavailable. Check your internet connection." })
  }
}

module.exports = {
  getRoute,
  getDirections
}
