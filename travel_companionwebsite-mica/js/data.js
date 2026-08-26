/* data.js — mock data for the JAC Go demo (stands in for a real API) */

const DB = {
  user: {
    name: "Mika Santos",
    tier: "Gold",
    points: 4280,
  },

  /* Demo accounts for login/signup (see auth.js) */
  users: [
    { name: "Mika Santos", email: "mika@jacliner.demo", password: "demo1234" },
  ],

  nextTrip: {
    origin: "PASAY",
    destination: "LUCENA",
    date: "AUG 17",
    time: "06:45",
    gate: "BAY 4",
    seat: "12A",
    status: "ON TIME",
  },

  trips: [
    { id: "t1", route: "Pasay (Buendia) → Lucena Grand Central", date: "Aug 17, 2026", time: "06:45 AM", seat: "12A", klass: "Deluxe",   fare: 450, status: "upcoming",  code: "JAC-88213" },
    { id: "t2", route: "Cubao → Calamba City",                   date: "Aug 22, 2026", time: "01:15 PM", seat: "07C", klass: "Ordinary", fare: 180, status: "upcoming",  code: "JAC-90142" },
    { id: "t3", route: "Lucena → Pasay (Buendia)",               date: "Jul 30, 2026", time: "05:00 PM", seat: "03B", klass: "Deluxe",   fare: 450, status: "completed", code: "JAC-81920" },
  ],

  weather: {
    origin:      { place: "Pasay",  temp: 30, desc: "Partly cloudy" },
    destination: { place: "Lucena", temp: 32, desc: "Sunny — pack light" },
    forecast: [
      { day: "Mon", temp: 31, ic: "sun" },
      { day: "Tue", temp: 29, ic: "cloud-sun" },
      { day: "Wed", temp: 28, ic: "cloud-sun-rain" },
      { day: "Thu", temp: 30, ic: "sun" },
      { day: "Fri", temp: 31, ic: "sun" },
    ],
  },

  fares: [
    { route: "Pasay – Lucena",              klass: "Ordinary", duration: "2h 45m", price: 320 },
    { route: "Pasay – Lucena",              klass: "Deluxe",   duration: "2h 30m", price: 450 },
    { route: "Cubao – Calamba",             klass: "Ordinary", duration: "1h 30m", price: 180 },
    { route: "Cubao – Santa Cruz, Laguna",  klass: "Deluxe",   duration: "2h 10m", price: 260 },
    { route: "Pasay – Batangas City",       klass: "Deluxe",   duration: "2h 20m", price: 380 },
    { route: "Lucena – Marinduque (bus+ferry)", klass: "Combo", duration: "4h 15m", price: 610 },
  ],

  accommodation: [
    { name: "Terrazza Inn Lucena",    loc: "5 min from Grand Central Terminal", price: "₱1,800/night", rating: 4.4 },
    { name: "Batangas Bay Hotel",     loc: "Near Batangas Port",                price: "₱2,300/night", rating: 4.2 },
    { name: "Calamba Garden Suites",  loc: "10 min from terminal",              price: "₱1,450/night", rating: 4.0 },
    { name: "RAYLux Hotel",     loc: "Lucena, Quezon",  price: null, rating: null, source: "osm", sourceUrl: "https://www.openstreetmap.org/node/13960806877" },
    { name: "Hotel Oliva 88",   loc: "Calamba, Laguna", price: null, rating: null, source: "osm", sourceUrl: "https://www.openstreetmap.org/node/4778056921" },
  ],

  terminals: [
    { name: "Pasay (Buendia) Terminal",      addr: "Sen. Gil J. Puyat Ave. cor. Donada St., Pasay", tags: ["Ticketing", "Padala", "WiFi"] },
    { name: "Cubao Terminal",                addr: "Aurora Blvd., Cubao, Quezon City",               tags: ["Ticketing", "WiFi"] },
    { name: "Calamba Terminal",              addr: "Brgy. 1, Crossing, Calamba City, Laguna",        tags: ["Ticketing", "Padala"] },
    { name: "Lucena Grand Central Terminal", addr: "Lucena City, Quezon",                            tags: ["Ticketing", "Padala", "Ferry transfer"] },
  ],

  rewards: [
    { title: "Free Seat Upgrade",      cost: 1200, desc: "Ordinary → Deluxe on any route" },
    { title: "₱150 Fare Voucher",      cost: 900,  desc: "Valid on any Southern Luzon route" },
    { title: "Priority Boarding Pass", cost: 600,  desc: "Skip the queue for 1 trip" },
    { title: "Free Padala Pickup",     cost: 400,  desc: "One free cargo pickup, up to 5kg" },
  ],

  notifications: [
    { type: "alert", text: "Your 06:45 AM trip to Lucena is on time. Gate opens 30 min before departure.", time: "Just now" },
    { type: "info",  text: "Rainy season advisory: light delays possible on Batangas routes this week.",   time: "2h ago" },
    { type: "promo", text: "Earn 2x points on Deluxe bookings this weekend.",                              time: "1d ago" },
  ],

  padalaHistory: [
    { code: "PAD-55210", from: "Pasay", to: "Lucena",  status: "In transit", weight: "3.2kg" },
    { code: "PAD-54810", from: "Cubao", to: "Calamba", status: "Delivered",  weight: "1.0kg" },
  ],

  /* Activities near the upcoming destination (OSM/Wikipedia sourced where noted) */
  activities: [
    { name: "Pagsanjan Falls",    type: "Activity", loc: "Cavinti, Laguna",          desc: "One of the Philippines' most famous waterfalls — reached by a dramatic boat ride through the gorge.", source: "osm+wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/Pagsanjan_Falls" },
    { name: "National Arts Center", type: "Activity", loc: "Mount Makiling, Los Baños, Laguna", desc: "Arts complex and residency campus on the slopes of Mount Makiling.", source: "osm+wikipedia", sourceUrl: "https://en.wikipedia.org/wiki/National_Arts_Center" },
    { name: "Buddy's Lucena",     type: "Dining",   loc: "Lucena, Quezon",           desc: "All-day Filipino comfort food, a local favorite since the '80s." },
  ],

  /* Packing checklist rendered on Trip Planner */
  packingList: [
    {
      category: "Clothing",
      items: ["Light, breathable clothing", "Extra shirt for the return trip", "Light jacket for aircon buses"],
    },
    {
      category: "Documents",
      items: ["Valid ID", "QR e-ticket / booking confirmation", "Hotel booking confirmation (if any)"],
    },
    {
      category: "Essentials",
      items: ["Sunscreen & cap", "Reusable water bottle", "Padala form (if shipping pasalubong home)", "Power bank"],
    },
  ],
};
