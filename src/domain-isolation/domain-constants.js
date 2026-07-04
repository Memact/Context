/**
 * Domain Isolation Constants for Code vs Documentation
 */

const DOMAIN_TYPES = {
  TECHNICAL: 'technical',
  DOCUMENTATION: 'documentation',
  GENERAL: 'general'
};

const SOURCE_TYPES = {
  CODE_EDITOR: 'code_editor',
  WORKSPACE_NOTES: 'workspace_notes',
  ESLINT: 'eslint',
  STYLE_GUIDE: 'style_guide',
  PRETTIER: 'prettier',
  NOTION: 'notion'
};

const CONTEXT_TYPES = {
  LINTING: 'linting',
  FORMATTING: 'formatting',
  STYLING: 'styling',
  WRITING: 'writing',
  DOCUMENTATION: 'documentation'
};

const ISOLATION_RULES = {
  [SOURCE_TYPES.ESLINT]: {
    domain: DOMAIN_TYPES.TECHNICAL,
    allowedContexts: [CONTEXT_TYPES.LINTING, CONTEXT_TYPES.FORMATTING],
    priority: 10,
    mergeable: false
  },
  [SOURCE_TYPES.PRETTIER]: {
    domain: DOMAIN_TYPES.TECHNICAL,
    allowedContexts: [CONTEXT_TYPES.FORMATTING],
    priority: 9,
    mergeable: false
  },
  [SOURCE_TYPES.NOTION]: {
    domain: DOMAIN_TYPES.DOCUMENTATION,
    allowedContexts: [CONTEXT_TYPES.WRITING, CONTEXT_TYPES.DOCUMENTATION],
    priority: 8,
    mergeable: false
  },
  [SOURCE_TYPES.STYLE_GUIDE]: {
    domain: DOMAIN_TYPES.DOCUMENTATION,
    allowedContexts: [CONTEXT_TYPES.STYLING, CONTEXT_TYPES.WRITING],
    priority: 7,
    mergeable: false
  },
  [SOURCE_TYPES.CODE_EDITOR]: {
    domain: DOMAIN_TYPES.TECHNICAL,
    allowedContexts: [CONTEXT_TYPES.LINTING, CONTEXT_TYPES.FORMATTING],
    priority: 9,
    mergeable: false
  },
  [SOURCE_TYPES.WORKSPACE_NOTES]: {
    domain: DOMAIN_TYPES.DOCUMENTATION,
    allowedContexts: [CONTEXT_TYPES.WRITING, CONTEXT_TYPES.DOCUMENTATION],
    priority: 8,
    mergeable: false
  }
};

const CONFLICT_TYPES = {
  DOMAIN_MISMATCH: 'domain_mismatch',
  CONTEXT_OVERLAP: 'context_overlap',
  PRIORITY_CONFLICT: 'priority_conflict'
};

const ISOLATION_STATUS = {
  ISOLATED: 'isolated',
  CONFLICTING: 'conflicting',
  RESOLVED: 'resolved',
  PENDING: 'pending'
};

module.exports = {
  DOMAIN_TYPES,
  SOURCE_TYPES,
  CONTEXT_TYPES,
  ISOLATION_RULES,
  CONFLICT_TYPES,
  ISOLATION_STATUS
};