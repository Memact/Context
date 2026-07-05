/**
 * Travel Detector - Identifies travel events from various sources
 */

const { TRAVEL_TYPES, RED_EYE_HOURS } = require('./travel-constants');

class TravelDetector {
  constructor() {
    this.travelEvents = [];
  }

  /**
   * Detect flight events from data
   * @param {Array} data - Flight data array
   * @returns {Array} Detected flight events
   */
  detectFlights(data) {
    if (!Array.isArray(data)) return [];

    return data
      .filter(item => this.isFlight(item))
      .map(item => ({
        type: TRAVEL_TYPES.FLIGHT,
        isRedEye: this.isRedEyeFlight(item),
        timestamp: new Date(item.departureTime),
        source: item.source || 'airline',
        flightNumber: item.flightNumber,
        departure: item.departure,
        arrival: item.arrival,
        duration: item.duration
      }));
  }

  /**
   * Detect Uber rides from data
   * @param {Array} data - Uber ride data array
   * @returns {Array} Detected ride events
   */
  detectUberRides(data) {
    if (!Array.isArray(data)) return [];

    return data
      .filter(item => this.isUberRide(item))
      .map(item => ({
        type: TRAVEL_TYPES.UBER,
        timestamp: new Date(item.startTime),
        source: item.source || 'uber',
        destination: item.destination,
        pickup: item.pickup,
        isAirport: this.isAirportLocation(item)
      }));
  }

  /**
   * Check if item is a flight
   * @param {Object} item - Data item
   * @returns {boolean} True if flight
   */
  isFlight(item) {
    return item.type === 'flight' || 
           item.category === 'flight' ||
           (item.departureTime && item.arrivalTime) ||
           (item.flightNumber);
  }

  /**
   * Check if item is an Uber ride
   * @param {Object} item - Data item
   * @returns {boolean} True if Uber ride
   */
  isUberRide(item) {
    return item.type === 'uber' ||
           item.category === 'ride' ||
           (item.pickup && item.destination) ||
           (item.provider && item.provider.toLowerCase() === 'uber');
  }

  /**
   * Check if flight is a red-eye
   * @param {Object} flight - Flight data
   * @returns {boolean} True if red-eye
   */
  isRedEyeFlight(flight) {
    const departure = new Date(flight.departureTime);
    const hour = departure.getHours();
    const { START, END } = RED_EYE_HOURS;

    if (START > END) {
      return hour >= START || hour <= END;
    }
    return hour >= START && hour <= END;
  }

  /**
   * Check if location is an airport
   * @param {Object} item - Location data
   * @returns {boolean} True if airport
   */
  isAirportLocation(item) {
    const location = String(item.destination || item.pickup || '').toLowerCase();
    return location.includes('airport') ||
           location.includes('terminal') ||
           location.includes('international') ||
           location.includes('lax') ||
           location.includes('jfk');
  }

  /**
   * Get travel events within time window
   * @param {Date} date - Reference date
   * @param {number} hoursBefore - Hours before
   * @param {number} hoursAfter - Hours after
   * @returns {Array} Travel events
   */
  getTravelEventsAround(date, hoursBefore = 24, hoursAfter = 24) {
    const start = new Date(date);
    start.setHours(start.getHours() - hoursBefore);
    
    const end = new Date(date);
    end.setHours(end.getHours() + hoursAfter);

    return this.travelEvents.filter(event => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= start && eventTime <= end;
    });
  }

  /**
   * Add travel events
   * @param {Array} events - Travel events to add
   */
  addTravelEvents(events) {
    if (Array.isArray(events)) {
      this.travelEvents.push(...events);
    }
  }

  /**
   * Clear travel events
   */
  clearEvents() {
    this.travelEvents = [];
  }
}

module.exports = TravelDetector;