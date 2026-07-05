/**
 * Role Conflict Constants for Workspace Roles
 */

const ROLE_SOURCES = {
  GITHUB: 'github',
  NOTION: 'notion',
  SLACK: 'slack',
  GOOGLE_WORKSPACE: 'google_workspace',
  CUSTOM: 'custom'
};

const UNIFIED_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
  CONTRIBUTOR: 'contributor',
  MANAGER: 'manager',
  EDITOR: 'editor',
  GUEST: 'guest'
};

const ROLE_HIERARCHY = {
  [UNIFIED_ROLES.OWNER]: 100,
  [UNIFIED_ROLES.ADMIN]: 80,
  [UNIFIED_ROLES.MANAGER]: 70,
  [UNIFIED_ROLES.CONTRIBUTOR]: 60,
  [UNIFIED_ROLES.MEMBER]: 50,
  [UNIFIED_ROLES.EDITOR]: 40,
  [UNIFIED_ROLES.VIEWER]: 30,
  [UNIFIED_ROLES.GUEST]: 10
};

const SOURCE_MAPPINGS = {
  [ROLE_SOURCES.GITHUB]: {
    'admin': UNIFIED_ROLES.ADMIN,
    'maintain': UNIFIED_ROLES.CONTRIBUTOR,
    'write': UNIFIED_ROLES.MEMBER,
    'read': UNIFIED_ROLES.VIEWER,
    'owner': UNIFIED_ROLES.OWNER
  },
  [ROLE_SOURCES.NOTION]: {
    'owner': UNIFIED_ROLES.OWNER,
    'admin': UNIFIED_ROLES.ADMIN,
    'editor': UNIFIED_ROLES.EDITOR,
    'viewer': UNIFIED_ROLES.VIEWER,
    'commenter': UNIFIED_ROLES.VIEWER,
    'guest': UNIFIED_ROLES.GUEST
  },
  [ROLE_SOURCES.SLACK]: {
    'owner': UNIFIED_ROLES.OWNER,
    'admin': UNIFIED_ROLES.ADMIN,
    'member': UNIFIED_ROLES.MEMBER,
    'guest': UNIFIED_ROLES.GUEST
  },
  [ROLE_SOURCES.GOOGLE_WORKSPACE]: {
    'super_admin': UNIFIED_ROLES.OWNER,
    'admin': UNIFIED_ROLES.ADMIN,
    'user': UNIFIED_ROLES.MEMBER,
    'viewer': UNIFIED_ROLES.VIEWER
  }
};

const CONFLICT_TYPES = {
  ROLE_MISMATCH: 'role_mismatch',
  HIERARCHY_DIFFERENCE: 'hierarchy_difference',
  PERMISSION_OVERLAP: 'permission_overlap',
  MISSING_ROLE: 'missing_role'
};

const CONFLICT_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

module.exports = {
  ROLE_SOURCES,
  UNIFIED_ROLES,
  ROLE_HIERARCHY,
  SOURCE_MAPPINGS,
  CONFLICT_TYPES,
  CONFLICT_SEVERITY
};