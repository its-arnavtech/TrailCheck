import { getCurrentUser, type AuthenticatedUser } from "./api";
import {
  getStoredAuthToken,
  getStoredAuthUser,
  setStoredSession,
} from "./auth";

export type AuthSessionState = {
  isLoading: boolean;
  token: string | null;
  user: AuthenticatedUser | null;
};
let cachedToken: string | null = null;
let cachedUser: AuthenticatedUser | null = null;
let inFlight: { token: string; promise: Promise<AuthSessionState> } | null =
  null;
let generation = 0;
export function resetAuthSessionCache() {
  generation += 1;
  cachedToken = null;
  cachedUser = null;
  inFlight = null;
}
function currentSession(): AuthSessionState {
  return {
    isLoading: false,
    token: getStoredAuthToken(),
    user: getStoredAuthUser(),
  };
}
export async function resolveAuthSession(): Promise<AuthSessionState> {
  const token = getStoredAuthToken();
  if (!token) {
    resetAuthSessionCache();
    return { isLoading: false, token: null, user: null };
  }
  if (cachedToken === token && cachedUser)
    return { isLoading: false, token, user: cachedUser };
  if (inFlight?.token === token) return inFlight.promise;
  const requestGeneration = generation;
  const promise = getCurrentUser(token)
    .then((user) => {
      if (requestGeneration !== generation || getStoredAuthToken() !== token)
        return currentSession();
      cachedToken = token;
      cachedUser = user;
      setStoredSession(token, user);
      return { isLoading: false, token, user };
    })
    .catch(() => currentSession())
    .finally(() => {
      if (inFlight?.promise === promise) inFlight = null;
    });
  inFlight = { token, promise };
  return promise;
}
