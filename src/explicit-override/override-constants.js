/**
 * Explicit Override Constants for User Context
 */

const OVERRIDE_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  PENDING: 'pending'
};

const OVERRIDE_SOURCES = {
  USER_EXPLICIT: 'user_explicit',
  SYSTEM: 'system',
  APP: 'app',
  INFERENCE: 'inference'
};

const FIELD_STATUS = {
  FROZEN: 'frozen',
  MODIFIABLE: 'modifiable',
  OVERRIDDEN: 'overridden',
  CONFLICTING: 'conflicting'
};

const PRIORITY_LEVELS = {
  USER_EXPLICIT: 10,
  SYSTEM: 8,
  APP: 6,
  INFERENCE: 3,
  DEFAULT: 1
};

const CONFLICT_RESOLUTION = {
  USER_WINS: 'user_wins',
  SYSTEM_WINS: 'system_wins',
  APP_WINS: 'app_wins',
  INFERENCE_WINS: 'inference_wins',
  LAST_WRITE_WINS: 'last_write_wins'
};

module.exports = {
  OVERRIDE_STATUS,
  OVERRIDE_SOURCES,
  FIELD_STATUS,
  PRIORITY_LEVELS,
  CONFLICT_RESOLUTION
};