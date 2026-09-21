/* track-map.js — Leaflet route-overview map for track-bus.html.
   Informational only: it draws the approximate Pasay -> Lucena road route and
   the two terminals. JAC Go has no bus GPS feed, so no bus position, ETA or
   distance is shown or simulated. "Use my location" is the visitor's own
   browser geolocation. */

(function () {
  if (typeof L === "undefined") return;

  var mapEl = document.getElementById("live-map");
  if (!mapEl) return;

  /* Approximate real road route, Pasay (Buendia) -> Lucena Grand Central, via SLEX / STAR / Maharlika Hwy */
  var ROUTE = [
    [14.5514, 121.0031], // Pasay (Buendia) Terminal
    [14.4791, 121.0198], // Sucat
    [14.4187, 121.0388], // Alabang
    [14.2938, 121.0614], // Sto. Tomas exit, Batangas
    [14.1122, 121.1462], // Sto. Tomas town
    [14.0296, 121.3121], // Tiaong, Quezon
    [13.9871, 121.4483], // Candelaria, Quezon
    [13.9484, 121.5601], // Sariaya, Quezon
    [13.9314, 121.6169]  // Lucena Grand Central Terminal
  ];

  function iconDiv(html, className, size) {
    return L.divIcon({ html: html, className: className, iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });
  }

  /* ---- map init ---- */
  var map = L.map(mapEl, { scrollWheelZoom: false }).setView(ROUTE[0], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);

  var routeLine = L.polyline(ROUTE, { color: "#D81E27", weight: 4, opacity: 0.85, dashArray: "1,9", lineCap: "round" }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [28, 28] });

  L.marker(ROUTE[0], { icon: iconDiv('<div class="endpoint-marker origin"></div>', "", [14, 14]) })
    .addTo(map)
    .bindPopup('<span class="map-popup-eyebrow">Origin</span><strong>Pasay (Buendia) Terminal</strong>');

  L.marker(ROUTE[ROUTE.length - 1], { icon: iconDiv('<div class="endpoint-marker destination"></div>', "", [14, 14]) })
    .addTo(map)
    .bindPopup('<span class="map-popup-eyebrow">Destination</span><strong>Lucena Grand Central Terminal</strong>');

  /* ---- pin a location / use my location / clear pin ---- */
  var pinBtn = document.getElementById("pin-location-btn");
  var useLocBtn = document.getElementById("use-my-location-btn");
  var clearBtn = document.getElementById("clear-pin-btn");
  var hint = document.getElementById("map-hint");
  var DEFAULT_HINT = hint ? hint.textContent : "";

  var userPin = null;
  var pinningMode = false;

  function setHint(text) { if (hint) hint.textContent = text; }

  function showClearBtn(show) { if (clearBtn) clearBtn.hidden = !show; }

  function placeUserPin(latlng, label) {
    if (userPin) map.removeLayer(userPin);
    userPin = L.marker(latlng, { icon: iconDiv('<div class="user-pin-marker"></div>', "", [16, 16]) })
      .addTo(map)
      .bindPopup(label)
      .openPopup();
    showClearBtn(true);
  }

  function stopPinning() {
    pinningMode = false;
    mapEl.classList.remove("pinning");
    if (pinBtn) pinBtn.classList.remove("active");
  }

  if (pinBtn) {
    pinBtn.addEventListener("click", function () {
      pinningMode = !pinningMode;
      mapEl.classList.toggle("pinning", pinningMode);
      pinBtn.classList.toggle("active", pinningMode);
      setHint(pinningMode ? "Tap anywhere on the map to drop your pin." : DEFAULT_HINT);
    });
  }

  map.on("click", function (e) {
    if (!pinningMode) return;
    placeUserPin(e.latlng, '<span class="map-popup-eyebrow">Pinned location</span>Lat ' + e.latlng.lat.toFixed(4) + ", Lng " + e.latlng.lng.toFixed(4));
    setHint('Pin dropped. Use "Clear pin" to remove it, or pin a new spot.');
    stopPinning();
  });

  if (useLocBtn) {
    useLocBtn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        setHint("Your browser doesn't support location access.");
        return;
      }
      useLocBtn.disabled = true;
      var originalLabel = useLocBtn.textContent;
      useLocBtn.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          useLocBtn.disabled = false;
          useLocBtn.textContent = originalLabel;
          var latlng = [pos.coords.latitude, pos.coords.longitude];
          if (userPin) map.removeLayer(userPin);
          userPin = L.marker(latlng, { icon: iconDiv('<div class="user-location-marker"></div>', "", [16, 16]) })
            .addTo(map)
            .bindPopup('<span class="map-popup-eyebrow">Your location</span>Your device\'s current position')
            .openPopup();
          map.setView(latlng, 12);
          showClearBtn(true);
          setHint("Showing your current location on the map.");
        },
        function () {
          useLocBtn.disabled = false;
          useLocBtn.textContent = originalLabel;
          setHint("Couldn't get your location — check your browser's location permission.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (userPin) { map.removeLayer(userPin); userPin = null; }
      stopPinning();
      showClearBtn(false);
      setHint(DEFAULT_HINT);
    });
  }

  setTimeout(function () { map.invalidateSize(); }, 200);
})();
