let userMarker
let storeMarkers = {}
let routingControl = null
let currentRoute = null
let selectedStore = null

const map = L.map("map").setView([37.7749, -122.4194], 11)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map)

const storeClusters = L.markerClusterGroup({
  maxClusterRadius: 50,
  showCoverageOnHover: false,
  disableClusteringAtZoom: 15,
  animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}).addTo(map)

async function loadStores() {
  try {
    const response = await fetch("/api/stores")
    const stores = await response.json()
    displayStores(stores)
    addStoreMarkers(stores)
  } catch (err) {
    console.error("Failed to load stores:", err)
    document.getElementById("storesContainer").innerHTML = '<p class="loading">Failed to load stores</p>'
  }
}

function displayStores(stores) {
  const container = document.getElementById("storesContainer")

  if (stores.length === 0) {
    container.innerHTML = '<p class="loading">No stores found</p>'
    return
  }

  container.innerHTML = stores
    .map(
      store => `
    <div class="store-item" data-id="${store.id}">
      <h3>${store.name}</h3>
      <p>${store.address}<br>${store.city}, ${store.state} ${store.zip_code}</p>
      ${store.distance ? `<p class="distance">${formatDistance(store.distance)} away</p>` : ""}
    </div>
  `
    )
    .join("")

  container.onclick = e => {
    const item = e.target.closest(".store-item")
    if (item) {
      selectStore(parseInt(item.dataset.id))
    }
  }
}

function addStoreMarkers(stores) {
  storeClusters.clearLayers()
  storeMarkers = {}
  selectedStore = null

  stores.forEach(store => {
    const marker = L.marker([store.lat, store.lng]).bindPopup(createPopupContent(store))

    storeMarkers[store.id] = marker
  })
  storeClusters.addLayers(Object.values(storeMarkers))

  if (stores.length > 0 && !userMarker) {
    const bounds = L.latLngBounds(stores.map(s => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

function createPopupContent(store) {
  return `
    <div class="store-popup">
      <h3>${store.name}</h3>
      <p>${store.address}</p>
      <p>${store.city}, ${store.state} ${store.zip_code}</p>
      <p>📞 ${store.phone || "N/A"}</p>
      <button class="btn btn-primary" onclick="getDirections(${store.lat}, ${store.lng})">
        Get Directions
      </button>
    </div>
  `
}

function selectStore(id) {
  document.querySelectorAll(".store-item").forEach(item => item.classList.remove("active"))
  document.querySelector(`.store-item[data-id="${id}"]`)?.classList.add("active")

  selectedStore = storeMarkers[id]
  const marker = storeMarkers[id]
  if (marker) {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: false })
    storeClusters.zoomToShowLayer(marker, () => {
      if (selectedStore === marker && storeClusters.hasLayer(marker)) marker.openPopup()
    })
  }
}

async function findNearbyStores(lat, lng) {
  const radius = document.getElementById("radius").value

  try {
    const response = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const stores = await response.json()
    displayStores(stores)
    addStoreMarkers(stores)
  } catch (err) {
    console.error("Failed to find nearby stores:", err)
    document.getElementById("storesContainer").innerHTML = '<p class="loading">Error loading stores</p>'
  }
}

async function geocodeAddress(address) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
    const results = await response.json()

    if (results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon)
      }
    }
    return null
  } catch (err) {
    console.error("Geocoding failed:", err)
    return null
  }
}

function getDirections(destLat, destLng) {
  if (!userMarker) {
    alert('Please search for your location or use "Use My Location" first')
    return
  }

  const userLat = userMarker.getLatLng().lat
  const userLng = userMarker.getLatLng().lng

  const url = `/api/directions?lat=${userLat}&lng=${userLng}&destLat=${destLat}&destLng=${destLng}`

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      return response.json()
    })
    .then(data => {
      if (!data.geometry || !data.distance) {
        alert("No route found")
        return
      }

      const route = { geometry: data.geometry, distance: data.distance, duration: data.duration }

      if (routingControl) {
        map.removeControl(routingControl)
      }

      routingControl = L.geoJSON(
        {
          type: "Feature",
          geometry: route.geometry
        },
        {
          style: { color: "#2563eb", weight: 5, opacity: 0.7 }
        }
      ).addTo(map)

      map.fitBounds(routingControl.getBounds(), { padding: [50, 50] })

      document.getElementById("directionsPanel").classList.remove("hidden")
      document.getElementById("routeInfo").innerHTML = `
        <p>Distance: <span class="distance-value">${formatDistance(route.distance)}</span></p>
        <p>Duration: <span class="duration-value">${formatDuration(route.duration)}</span></p>
      `

      const stepsHtml = data.steps
        ? data.steps
            .map(
              (step, idx) => `
        <div class="direction-step">
          <span class="step-number">${idx + 1}</span>
          <span class="step-instruction">${step.instruction}</span>
          <span class="step-distance">${formatDistance(step.distance)}</span>
        </div>
      `
            )
            .join("")
        : '<p class="loading">Route calculated</p>'

      document.getElementById("directionsList").innerHTML = stepsHtml || '<p class="loading">Route calculated</p>'
      document.getElementById("clearRoute").classList.remove("hidden")
    })
    .catch(err => {
      console.error("Routing error:", err)
      alert("Unable to calculate route. Please try again.")
    })
}

function clearRoute() {
  if (routingControl) {
    map.removeControl(routingControl)
    routingControl = null
  }
  currentRoute = null
  document.getElementById("directionsPanel").classList.add("hidden")
  document.getElementById("clearRoute").classList.add("hidden")
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

let debounceTimer

async function autocompleteSearch(query) {
  const resultsContainer = document.getElementById("autocompleteResults")

  if (query.length < 3) {
    resultsContainer.innerHTML = ""
    return
  }

  resultsContainer.innerHTML = '<div class="autocomplete-loading">Searching...</div>'

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`)
    const results = await response.json()

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="autocomplete-item"><span class="main-text">No results found</span></div>'
      return
    }

    resultsContainer.innerHTML = results
      .map(result => {
        const displayName = result.display_name.length > 60 ? result.display_name.substring(0, 60) + "..." : result.display_name
        return `
        <div class="autocomplete-item" data-lat="${result.lat}" data-lon="${result.lon}" data-name="${result.display_name}">
          <div class="main-text">${displayName}</div>
        </div>
      `
      })
      .join("")

    resultsContainer.addEventListener("click", e => {
      const item = e.target.closest(".autocomplete-item")
      if (item) {
        selectAutocompleteResult(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon), item.dataset.name)
      }
    })
  } catch (err) {
    console.error("Autocomplete error:", err)
    resultsContainer.innerHTML = ""
  }
}

function selectAutocompleteResult(lat, lng, displayName) {
  const input = document.getElementById("searchAddress")
  input.value = displayName.split(",")[0]
  document.getElementById("autocompleteResults").innerHTML = ""

  if (userMarker) {
    userMarker.setLatLng([lat, lng])
  } else {
    userMarker = L.marker([lat, lng]).addTo(map)
  }
  map.setView([lat, lng], 13)
  findNearbyStores(lat, lng)
}

document.getElementById("searchAddress").addEventListener("input", e => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    autocompleteSearch(e.target.value.trim())
  }, 300)
})

document.getElementById("findMeBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser")
    return
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords

      if (userMarker) {
        userMarker.setLatLng([latitude, longitude])
      } else {
        userMarker = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: "user-marker",
            html: '<div class="user-marker-inner"></div>',
            iconSize: [20, 20]
          })
        })
          .addTo(map)
          .bindPopup("Your Location")
      }

      map.setView([latitude, longitude], 13)
      findNearbyStores(latitude, longitude)
    },
    error => {
      console.error("Geolocation error:", error)
      alert("Unable to get your location. Please try searching for an address.")
    }
  )
})

document.getElementById("searchBtn").addEventListener("click", async () => {
  const address = document.getElementById("searchAddress").value.trim()
  if (!address) return

  const coords = await geocodeAddress(address)
  if (coords) {
    if (userMarker) {
      userMarker.setLatLng([coords.lat, coords.lng])
    } else {
      userMarker = L.marker([coords.lat, coords.lng]).addTo(map)
    }
    map.setView([coords.lat, coords.lng], 13)
    findNearbyStores(coords.lat, coords.lng)
  } else {
    alert("Address not found. Please try a different search.")
  }
})

document.getElementById("searchAddress").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    document.getElementById("autocompleteResults").innerHTML = ""
    document.getElementById("searchBtn").click()
  }
})

document.addEventListener("click", e => {
  if (!e.target.closest(".autocomplete-wrapper")) {
    document.getElementById("autocompleteResults").innerHTML = ""
  }
})

document.getElementById("closeDirections").addEventListener("click", clearRoute)
document.getElementById("clearRoute").addEventListener("click", clearRoute)

function resetAll() {
  if (userMarker) {
    map.removeLayer(userMarker)
    userMarker = null
  }

  storeClusters.clearLayers()
  storeMarkers = {}

  if (routingControl) {
    map.removeControl(routingControl)
    routingControl = null
  }

  currentRoute = null
  selectedStore = null

  document.getElementById("searchAddress").value = ""
  document.getElementById("autocompleteResults").innerHTML = ""
  document.getElementById("directionsPanel").classList.add("hidden")
  document.getElementById("clearRoute").classList.add("hidden")

  map.setView([37.7749, -122.4194], 11)
  loadStores()
}

document.getElementById("resetBtn").addEventListener("click", resetAll)
document.getElementById("resetMapBtn").addEventListener("click", resetAll)

loadStores()
