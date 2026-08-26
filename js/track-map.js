/* track-map.js — Leaflet live map for track-bus.html (simulated real-time GPS demo) */

(function () {
  if (typeof L === "undefined") return;

  var mapEl = document.getElementById("live-map");
  if (!mapEl) return;

  var trip = (typeof DB !== "undefined" && DB.trips && DB.trips[0]) || {};

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

  var ASSUMED_SPEED_KMH = 58;   // used for ETA math
  var SIM_ACCEL = 26;           // speeds up the on-screen animation for demo purposes
  var TICK_MS = 2000;

  /* ---- geometry helpers ---- */
  function haversine(a, b) {
    var R = 6371;
    var dLat = (b[0] - a[0]) * Math.PI / 180;
    var dLon = (b[1] - a[1]) * Math.PI / 180;
    var lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180;
    var h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  var segLens = [], totalKm = 0;
  for (var i = 0; i < ROUTE.length - 1; i++) {
    var len = haversine(ROUTE[i], ROUTE[i + 1]);
    segLens.push(len);
    totalKm += len;
  }

  function pointAtKm(km) {
    km = Math.max(0, Math.min(totalKm, km));
    var covered = 0;
    for (var s = 0; s < segLens.length; s++) {
      if (km <= covered + segLens[s] || s === segLens.length - 1) {
        var into = segLens[s] === 0 ? 0 : (km - covered) / segLens[s];
        into = Math.max(0, Math.min(1, into));
        var a = ROUTE[s], b = ROUTE[s + 1];
        return [a[0] + (b[0] - a[0]) * into, a[1] + (b[1] - a[1]) * into];
      }
      covered += segLens[s];
    }
    return ROUTE[ROUTE.length - 1];
  }

  function iconDiv(html, className, size) {
    return L.divIcon({ html: html, className: className, iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });
  }

  var busSvg = '<div class="bus-marker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 6v6" /><path d="M15 6v6" /><path d="M2 12h19.6" />' +
    '<path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />' +
    '<circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" /></svg></div>';

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

  var busMarker = L.marker(ROUTE[0], { icon: iconDiv(busSvg, "", [34, 34]), zIndexOffset: 1000 }).addTo(map);

  /* ---- simulated live progress ---- */
  var kmDone = totalKm * 0.665; // start ~66% of the way there, matching the "48 km left" placeholder
  var lastTick = Date.now();
  var arrived = false;

  var statStatus = document.getElementById("stat-status");
  var statEta = document.getElementById("stat-eta");
  var statDistance = document.getElementById("stat-distance");

  function formatEta(minsFromNow) {
    var d = new Date(Date.now() + minsFromNow * 60000);
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ampm;
  }

  function renderTick() {
    var remainingKm = Math.max(0, totalKm - kmDone);
    var pos = pointAtKm(kmDone);
    busMarker.setLatLng(pos);

    if (statDistance) statDistance.textContent = remainingKm < 1 ? "Arriving" : Math.round(remainingKm) + " km";
    if (statEta) statEta.textContent = remainingKm < 1 ? "Now" : formatEta((remainingKm / ASSUMED_SPEED_KMH) * 60);

    if (!arrived && remainingKm < 1) {
      arrived = true;
      if (statStatus) { statStatus.textContent = "Arrived"; statStatus.className = "pill ok"; }
      busMarker.bindPopup('<span class="map-popup-eyebrow">' + (trip.code || "JAC-88213") + '</span><strong>Arrived at destination</strong>');
      clearInterval(timer);
    } else {
      busMarker.bindPopup(
        '<span class="map-popup-eyebrow">' + (trip.code || "JAC-88213") + '</span><strong>En route to Lucena</strong>' +
        '<br />' + Math.round(remainingKm) + ' km left &middot; ETA ' + formatEta((remainingKm / ASSUMED_SPEED_KMH) * 60)
      );
    }
  }

  var timer = setInterval(function () {
    var now = Date.now();
    var elapsedSec = (now - lastTick) / 1000;
    lastTick = now;
    var jitter = 0.85 + Math.random() * 0.3;
    kmDone += (ASSUMED_SPEED_KMH / 3600) * elapsedSec * SIM_ACCEL * jitter;
    renderTick();
  }, TICK_MS);

  renderTick();

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
            .bindPopup('<span class="map-popup-eyebrow">Your location</span>Live GPS position')
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
