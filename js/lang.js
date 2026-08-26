/* lang.js — EN/FIL translation toggle, persists to localStorage */

(function () {
  var STORAGE_KEY = 'jac-lang';

  /* Translation dictionary — keys match [data-i18n] attribute values */
  var DICT = {
    /* Nav */
    'nav.dashboard':        { en: 'Dashboard',        fil: 'Dashboard' },
    'nav.tripPlanner':      { en: 'Trip Planner',     fil: 'Plano ng Biyahe' },
    'nav.tickets':          { en: 'Tickets',          fil: 'Mga Tiket' },
    'nav.trackBus':         { en: 'Track My Bus',     fil: 'Subaybayan ang Bus' },
    'nav.weather':          { en: 'Weather',          fil: 'Panahon' },
    'nav.accommodation':    { en: 'Accommodation',    fil: 'Tirahan' },
    'nav.fares':            { en: 'Fares & Promos',   fil: 'Pamasahe at Promo' },
    'nav.padala':           { en: 'Padala (Cargo)',   fil: 'Padala (Kargamento)' },
    'nav.rewards':          { en: 'Rewards',          fil: 'Mga Gantimpala' },
    'nav.terminals':        { en: 'Terminals',        fil: 'Mga Terminal' },
    'nav.notifications':    { en: 'Notifications',    fil: 'Mga Abiso' },
    'nav.profile':          { en: 'Profile',          fil: 'Profil' },

    /* Tab bar */
    'tab.dashboard':        { en: 'Dashboard',        fil: 'Dashboard' },
    'tab.planner':          { en: 'Planner',          fil: 'Plano' },
    'tab.tickets':          { en: 'Tickets',          fil: 'Tiket' },
    'tab.track':            { en: 'Track',            fil: 'Subaybay' },
    'tab.profile':          { en: 'Profile',          fil: 'Profil' },

    /* Sidebar footer */
    'sidebar.logout':       { en: 'Log out',               fil: 'Mag-logout' },
    'sidebar.backToSite':   { en: '← Back to jacliner.com', fil: '← Bumalik sa jacliner.com' },
    'sidebar.points':       { en: 'Points',                fil: 'Puntos' },

    /* Page headings */
    'page.dashboard':       { en: 'Dashboard',             fil: 'Dashboard' },
    'page.tripPlanner':     { en: 'Trip Planner',          fil: 'Plano ng Biyahe' },
    'page.tickets':         { en: 'My Tickets',            fil: 'Mga Tiket Ko' },
    'page.weather':         { en: 'Weather',               fil: 'Panahon' },
    'page.terminals':       { en: 'Terminals & Directions', fil: 'Mga Terminal at Direksyon' },
    'page.notifications':   { en: 'Notifications',         fil: 'Mga Abiso' },
    'page.profile':         { en: 'Profile',               fil: 'Profil' },

    /* Dashboard */
    'dash.planTrip':        { en: 'Plan a Trip',           fil: 'Mag-plano ng Biyahe' },
    'dash.bookTickets':     { en: 'Book / View Tickets',   fil: 'Mag-book / Tingnan ang Tiket' },
    'dash.trackBus':        { en: 'Track My Bus',          fil: 'Subaybayan ang Bus Ko' },
    'dash.sendPadala':      { en: 'Send a Padala',         fil: 'Magpadala ng Padala' },
    'dash.destWeather':     { en: 'Destination Weather',   fil: 'Panahon sa Destinasyon' },
    'dash.fullForecast':    { en: 'Full forecast',         fil: 'Buong Hula' },
    'dash.points':          { en: 'Alagang JAC Points',    fil: 'Alagang JAC Puntos' },
    'dash.redeem':          { en: 'Redeem rewards',        fil: 'I-redeem ang Gantimpala' },
    'dash.activities':      { en: 'Local Activities & Dining', fil: 'Lokal na Aktibidad at Pagkain' },
    'dash.nearStop':        { en: 'Near your next stop',   fil: 'Malapit sa Susunod na Hinto' },
    'dash.autoSuggest':     { en: 'Auto-suggested based on your upcoming trip.', fil: 'Awtomatikong iminungkahi batay sa iyong paparating na biyahe.' },
    'dash.upcoming':        { en: 'Upcoming Trips',        fil: 'Mga Paparating na Biyahe' },
    'dash.onTime':          { en: 'ON TIME',               fil: 'SA ORAS' },

    /* Trip Planner */
    'plan.newTrip':         { en: 'New Trip',              fil: 'Bagong Biyahe' },
    'plan.heading':         { en: "Where's JAC taking you next?", fil: 'Saan ka susunod na ihatid ng JAC?' },
    'plan.from':            { en: 'From',                  fil: 'Mula' },
    'plan.to':              { en: 'To',                    fil: 'Patungo' },
    'plan.date':            { en: 'Date',                  fil: 'Petsa' },
    'plan.passengers':      { en: 'Passengers',            fil: 'Mga Pasahero' },
    'plan.searchBuses':     { en: 'Search buses',          fil: 'Maghanap ng Bus' },
    'plan.packing':         { en: 'Packing List',          fil: 'Listahan ng Gamit' },
    'plan.packingHeading':  { en: 'Lucena trip — Aug 17',  fil: 'Biyahe sa Lucena — Ago 17' },
    'plan.packingDesc':     { en: 'Auto-generated from the weather forecast at your destination.', fil: 'Awtomatikong nagawa mula sa hula ng panahon sa iyong destinasyon.' },
    'plan.saved':           { en: 'Saved Itineraries',     fil: 'Mga Naka-save na Itinerary' },
    'plan.noItinerary':     { en: 'No saved itineraries yet', fil: 'Wala pang naka-save na itinerary' },
    'plan.noItineraryDesc': { en: 'Search a route above and save it to plan multi-stop trips.', fil: 'Maghanap ng ruta sa itaas at i-save upang mag-plano ng multi-stop na biyahe.' },
    'plan.addItinerary':    { en: '+ Add Itinerary',       fil: '+ Magdagdag ng Itinerary' },
    'plan.availBuses':      { en: 'Available Buses',       fil: 'Mga Available na Bus' },
    'plan.select':          { en: 'Select',                fil: 'Piliin' },
    'plan.busType':         { en: 'Bus Type',              fil: 'Uri ng Bus' },
    'plan.allTypes':        { en: 'All Bus Types',         fil: 'Lahat ng Uri ng Bus' },
    'plan.seatsLeft':       { en: 'seats left',            fil: 'natitirang upuan' },

    /* Tickets */
    'tix.upcoming':         { en: 'Upcoming',              fil: 'Paparating' },
    'tix.past':             { en: 'Past Trips',            fil: 'Mga Nakaraang Biyahe' },
    'tix.reschedule':       { en: 'Reschedule',            fil: 'Muling I-iskedyul' },
    'tix.cancel':           { en: 'Cancel',                fil: 'Kanselahin' },
    'tix.select':           { en: 'Select',                fil: 'Piliin' },

    /* Weather */
    'wx.searchLabel':       { en: 'Select a place',        fil: 'Pumili ng lugar' },
    'wx.filter':            { en: 'View Forecast',         fil: 'Tingnan ang Hula' },
    'wx.forecast5':         { en: '5-Day Forecast',        fil: '5-Araw na Hula' },

    /* Terminals */
    'term.getDir':          { en: 'Get directions',        fil: 'Kumuha ng Direksyon' },
    'term.ticketing':       { en: 'Ticketing',             fil: 'Tiket' },
    'term.padala':          { en: 'Padala',                fil: 'Padala' },
    'term.wifi':            { en: 'WiFi',                  fil: 'WiFi' },
    'term.ferry':           { en: 'Ferry transfer',        fil: 'Paglipat ng Ferry' },
    'term.dirModal':        { en: 'Directions',            fil: 'Mga Direksyon' },
    'term.close':           { en: 'Close',                 fil: 'Isara' },

    /* Notifications */
    'notif.clearAll':       { en: 'Clear all',             fil: 'Burahin lahat' },
    'notif.empty':          { en: 'No notifications',      fil: 'Walang mga abiso' },

    /* Profile */
    'prof.account':         { en: 'Account',               fil: 'Account' },
    'prof.name':            { en: 'Name',                  fil: 'Pangalan' },
    'prof.email':           { en: 'Email',                 fil: 'Email' },
    'prof.mobile':          { en: 'Mobile',                fil: 'Telepono' },
    'prof.language':        { en: 'Language',              fil: 'Wika' },
    'prof.save':            { en: 'Save changes',          fil: 'I-save ang mga pagbabago' },
    'prof.logout':          { en: 'Log out',               fil: 'Mag-logout' },
    'prof.payment':         { en: 'Payment Methods',       fil: 'Mga Paraan ng Bayad' },
    'prof.addPayment':      { en: 'Add payment method',    fil: 'Magdagdag ng paraan ng bayad' },
    'prof.default':         { en: 'Default',               fil: 'Default' },
    'prof.backup':          { en: 'Backup',                fil: 'Backup' },
    'prof.remove':          { en: 'Remove',                fil: 'Alisin' },

    /* Shared buttons */
    'btn.confirm':          { en: 'Confirm',               fil: 'Kumpirmahin' },
    'btn.cancel':           { en: 'Cancel',                fil: 'Kanselahin' },
    'btn.close':            { en: 'Close',                 fil: 'Isara' },
    'btn.save':             { en: 'Save',                  fil: 'I-save' },
    'btn.add':              { en: 'Add',                   fil: 'Idagdag' },
    'btn.yes':              { en: 'Yes, continue',         fil: 'Oo, ituloy' },
    'btn.no':               { en: 'No, go back',           fil: 'Hindi, bumalik' },

    /* Confirmation dialogs */
    'confirm.cancel.title':          { en: 'Cancel this ticket?',          fil: 'Kanselahin ang tiket na ito?' },
    'confirm.cancel.msg':            { en: 'Do you still want to cancel? This action cannot be undone.', fil: 'Nais mo pa rin bang kanselahin? Hindi na mababawi ang aksyong ito.' },
    'confirm.clearNotif.title':      { en: 'Clear all notifications?',     fil: 'Burahin ang lahat ng abiso?' },
    'confirm.clearNotif.msg':        { en: 'All notifications will be permanently removed.', fil: 'Lahat ng abiso ay permanenteng matatanggal.' },
    'confirm.removePayment.title':   { en: 'Remove payment method?',       fil: 'Alisin ang paraan ng bayad?' },
    'confirm.removePayment.msg':     { en: 'This payment method will be removed from your account.', fil: 'Ang paraan ng bayad na ito ay aalisin sa iyong account.' },
    'confirm.deleteNotif.title':     { en: 'Delete notification?',         fil: 'Burahin ang abiso?' },
    'confirm.deleteNotif.msg':       { en: 'This notification will be permanently removed.', fil: 'Ang abisong ito ay permanenteng matatanggal.' },

    /* Chatbot widget (placeholder — not wired to a real assistant yet) */
    'chat.title':            { en: 'JAC Assistant',         fil: 'JAC Assistant' },
    'chat.status':           { en: 'Not available yet',     fil: 'Hindi pa available' },
    'chat.notAvailable':     { en: "Hi! I'm still being set up — this feature isn't available yet, but it's coming soon.", fil: 'Hi! Isinasaayos pa ako — hindi pa available ang feature na ito, pero paparating na!' },
    'chat.notAvailableReply':{ en: "Thanks for the message! I can't actually respond yet — this feature isn't available yet, but it's on the way.", fil: 'Salamat sa mensahe mo! Hindi ko pa talaga masasagot ito — hindi pa available ang feature na ito, pero papunta na!' },
    'chat.inputPlaceholder': { en: 'Type a message…',       fil: 'Mag-type ng mensahe…' },
    'chat.send':             { en: 'Send message',          fil: 'Ipadala ang mensahe' },
    'chat.openLabel':        { en: 'Open JAC Assistant chat', fil: 'Buksan ang chat ng JAC Assistant' },
    'chat.closeLabel':       { en: 'Close chat',            fil: 'Isara ang chat' },
  };

  /* Apply locale to all [data-i18n] elements. An element can opt into
     translating one of its own attributes (e.g. aria-label on an
     icon-only button) via data-i18n-attr="aria-label" instead of the
     default placeholder/textContent behavior. */
  function applyLang(locale) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!DICT[key] || DICT[key][locale] === undefined) return;
      var value = DICT[key][locale];
      var targetAttr = el.getAttribute('data-i18n-attr');
      if (targetAttr) {
        el.setAttribute(targetAttr, value);
      } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = value;
      } else {
        el.textContent = value;
      }
    });
    document.querySelectorAll('.lang-toggle button').forEach(function (btn) {
      var isActive = (locale === 'en' && btn.textContent.trim() === 'EN') ||
                     (locale === 'fil' && btn.textContent.trim() === 'FIL');
      btn.classList.toggle('active', isActive);
    });
    try { localStorage.setItem('jac-lang', locale); } catch (e) {}
  }

  /* Wire toggle buttons and restore saved preference */
  function wireLangToggle() {
    var saved = 'en';
    try { saved = localStorage.getItem('jac-lang') || 'en'; } catch (e) {}
    if (saved !== 'en' && saved !== 'fil') saved = 'en';
    applyLang(saved);
    document.querySelectorAll('.lang-toggle button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.textContent.trim() === 'EN' ? 'en' : 'fil');
      });
    });
  }

  window.applyLang = applyLang;
  window.DICT = DICT;

  document.addEventListener('DOMContentLoaded', wireLangToggle);
})();
