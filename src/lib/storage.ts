const PARTICIPANT_TOKEN_KEY = "findminyan:participantToken";
const SEEKER_TOKEN_KEY = "findminyan:seekerToken";

function getOrCreate(key: string): string {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

/** Stable per-browser id used to toggle interest in a minyan (find page). */
export function getParticipantToken(): string {
  return getOrCreate(PARTICIPANT_TOKEN_KEY);
}

/** Stable per-browser id used to prove ownership of a created minyan, and
 * to look it back up ("mine") after a reload. */
export function getSeekerToken(): string {
  return getOrCreate(SEEKER_TOKEN_KEY);
}
