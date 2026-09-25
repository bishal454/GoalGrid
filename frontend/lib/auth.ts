export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password?: string;
}
const USERS_KEY = "offside_users";
const CURRENT_USER_KEY = "offside_current_user_email";
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getCurrentUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem(CURRENT_USER_KEY);
  if (!email) return null;
  return getStoredUsers().find(user => user.email === email) || null;
}

export async function signUpUser(name: string, email: string, password: string): Promise<StoredUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const response = await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to sign up.");
  }

  const user: StoredUser = await response.json();

  const users = getStoredUsers().filter(u => u.email !== user.email);
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  localStorage.setItem(CURRENT_USER_KEY, user.email);

  return user;
}

export async function loginUser(email: string, password: string): Promise<StoredUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Invalid email or password.");
  }

  const user: StoredUser = await response.json();

  const users = getStoredUsers().filter(u => u.email !== user.email);
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  localStorage.setItem(CURRENT_USER_KEY, user.email);

  return user;
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getFavoriteTeamsKey() {
  const user = getCurrentUser();
  return user ? `followed_teams:${user.email}` : "followed_teams:guest";
}

/**
 * Fetches the user's profile from the backend and returns whether they
 * have completed onboarding. Returns true (skip onboarding) on network error
 * to avoid blocking users unnecessarily.
 */
export async function checkUserOnboarded(email: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/profile?email=${encodeURIComponent(email)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.onboarded === true;
  } catch {
    // If backend is unreachable, assume onboarded to avoid blocking login
    return true;
  }
}
