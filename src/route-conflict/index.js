/**
 * Route Conflict Module - Main Export
 */

const RouteAnalyzer = require('./route-analyzer');
const RouteResolver = require('./route-resolver');
const {
  ROUTE_SOURCES,
  ROUTE_STATUS,
  COMPARISON_METRICS,
  PREFERENCE_WEIGHTS,
  CONFLICT_TYPES
} = require('./route-constants');

module.exports = {
  RouteAnalyzer,
  RouteResolver,
  ROUTE_SOURCES,
  ROUTE_STATUS,
  COMPARISON_METRICS,
  PREFERENCE_WEIGHTS,
  CONFLICT_TYPES
};