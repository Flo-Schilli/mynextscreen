/**
 * Atomic refresh-token rotation with replay detection (copied from the immich
 * reference). All keys are namespaced `auth:` so they never collide with the
 * BullMQ `bull:` keyspace on the shared Redis server.
 *
 * KEYS[1] = auth:refresh:<oldHash>   (active token record)
 * KEYS[2] = auth:consumed:<oldHash>  (tombstone after rotation — replay marker)
 * KEYS[3] = auth:refresh:<newHash>   (new active token record)
 * ARGV    = oldHash, newHash, issuedAt(ms), ttl(seconds)
 *
 * Returns {'ok', familyId, userId} | {'reuse', familyId} | {'unknown'}.
 */
export const ROTATE_REFRESH_SCRIPT = `
local activeKey = KEYS[1]
local consumedKey = KEYS[2]
local newKey = KEYS[3]
local oldHash = ARGV[1]
local newHash = ARGV[2]
local issuedAt = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local data = redis.call('GET', activeKey)
if not data then
  local cf = redis.call('GET', consumedKey)
  if cf then
    return {'reuse', cf}
  end
  return {'unknown'}
end

local parsed = cjson.decode(data)
local familyId = parsed.familyId
local userId = parsed.userId
local familySetKey = 'auth:family:' .. familyId

redis.call('DEL', activeKey)
redis.call('SET', consumedKey, familyId, 'EX', ttl)
redis.call('SREM', familySetKey, oldHash)

local newPayload = cjson.encode({
  userId = userId,
  familyId = familyId,
  issuedAt = issuedAt,
  parentHash = oldHash
})
redis.call('SET', newKey, newPayload, 'EX', ttl)
redis.call('SADD', familySetKey, newHash)
redis.call('EXPIRE', familySetKey, ttl)

return {'ok', familyId, userId}
`;

/**
 * Revoke an entire token family (logout / reuse-kill).
 * KEYS[1] = auth:family:<familyId>
 */
export const REVOKE_FAMILY_SCRIPT = `
local familySetKey = KEYS[1]
local members = redis.call('SMEMBERS', familySetKey)
for _, h in ipairs(members) do
  redis.call('DEL', 'auth:refresh:' .. h)
end
redis.call('DEL', familySetKey)
return #members
`;
