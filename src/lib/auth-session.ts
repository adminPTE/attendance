export type UserRole = "general" | "assigned";

export type AuthSession = {
  userRole: UserRole;
  userId: string;
  userName: string;
  departId: string;
  departName: string;
};

export const AUTH_SESSION_KEY = "attendance-auth-session";
export const AUTH_SESSION_EVENT = "attendance-auth-session-change";

let cachedRawSession: string | null = null;
let cachedParsedSession: AuthSession | null = null;

export const DEMO_ASSIGNED_SESSION: AuthSession = {
  userRole: "assigned",
  userId: "2309",
  userName: "ตั้งปณิธาน ศรีพิทักษ์",
  departId: "85",
  departName: "กลุ่มงานสุขภาพดิจิทัล",
};

export const DEMO_GENERAL_SESSION: AuthSession = {
  userRole: "general",
  userId: "2309",
  userName: "ตั้งปณิธาน ศรีพิทักษ์",
  departId: "85",
  departName: "กลุ่มงานสุขภาพดิจิทัล",
};

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = readCookie(AUTH_SESSION_KEY);

  if (!rawValue) {
    cachedRawSession = null;
    cachedParsedSession = null;
    return null;
  }

  if (rawValue === cachedRawSession) {
    return cachedParsedSession;
  }

  try {
    cachedRawSession = rawValue;
    cachedParsedSession = JSON.parse(rawValue) as AuthSession;
    return cachedParsedSession;
  } catch {
    cachedRawSession = null;
    cachedParsedSession = null;
    return null;
  }
}

export function writeAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  const rawValue = JSON.stringify(session);
  const encodedValue = encodeURIComponent(rawValue);
  document.cookie = `${AUTH_SESSION_KEY}=${encodedValue}; Path=/; SameSite=Lax`;
  cachedRawSession = rawValue;
  cachedParsedSession = session;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  document.cookie = `${AUTH_SESSION_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  cachedRawSession = null;
  cachedParsedSession = null;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function subscribeAuthSession(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(AUTH_SESSION_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(AUTH_SESSION_EVENT, handleChange);
  };
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const cookiePrefix = `${name}=`;
  const foundCookie = document.cookie
    .split("; ")
    .find((cookiePart) => cookiePart.startsWith(cookiePrefix));

  if (!foundCookie) {
    return null;
  }

  return decodeURIComponent(foundCookie.slice(cookiePrefix.length));
}
