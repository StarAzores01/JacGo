/* auth.js — mock authentication using localStorage (demo only, not production) */

const AUTH_USERS_KEY = "jacgo_users";
const AUTH_SESSION_KEY = "jacgo_session";

/* Seed default users from data.js on first load */
function seedUsers() {
  if (localStorage.getItem(AUTH_USERS_KEY)) return;
  const seed = (typeof DB !== "undefined" && DB.users) ? DB.users : [];
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(seed));
}

function getUsers() {
  seedUsers();
  try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || []; }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function login(email, password) {
  const match = getUsers().find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!match) return { ok: false, error: "Incorrect email or password." };
  localStorage.setItem(AUTH_SESSION_KEY, match.email);
  return { ok: true, user: match };
}

function signup(name, email, password) {
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const user = { name, email, password };
  users.push(user);
  saveUsers(users);
  localStorage.setItem(AUTH_SESSION_KEY, user.email);
  return { ok: true, user };
}

function logout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function getCurrentUser() {
  const email = localStorage.getItem(AUTH_SESSION_KEY);
  if (!email) return null;
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/* Redirect to login if not authenticated; returns true if redirecting */
function requireAuth() {
  if (!getCurrentUser()) {
    const page = window.location.pathname.split("/").pop();
    window.location.href = `login.html?redirect=${encodeURIComponent(page)}`;
    return true;
  }
  return false;
}
