/**
 * Atomic state changes for agent backups. Plain get-then-set would let a
 * cancel and an apply cross: the apply reads "analysed", the cancel deletes the
 * session and frees the agent, then the apply writes the session back and the
 * agent restores with no operation holding it.
 */

/**
 * Replaces an import session only if it is still in the expected state.
 *
 * KEYS[1] = the session record
 * ARGV    = expected state, new record (JSON), ttl (seconds)
 * Returns 1 when replaced, 0 when the session is gone or has moved on.
 */
export const TRANSITION_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 0
end
if cjson.decode(raw).state ~= ARGV[1] then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`;

/**
 * Deletes an import session unless it is in one of the given states.
 *
 * KEYS[1] = the session record
 * ARGV    = states that protect the session
 * Returns 1 when deleted, 0 when there was none, -1 when it is protected.
 */
export const DELETE_UNLESS_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 0
end
local state = cjson.decode(raw).state
for _, protected in ipairs(ARGV) do
  if state == protected then
    return -1
  end
end
redis.call('DEL', KEYS[1])
return 1
`;

/**
 * Changes an agent's operation lock only if it still belongs to that operation.
 *
 * KEYS[1] = the agent's lock
 * ARGV    = operation id, new value (JSON) or '' to delete, ttl (seconds)
 * Returns 1 when changed, 0 when the lock is gone or held by another operation.
 */
export const LOCK_UPDATE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 0
end
if cjson.decode(raw).id ~= ARGV[1] then
  return 0
end
if ARGV[2] == '' then
  redis.call('DEL', KEYS[1])
else
  redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
end
return 1
`;
