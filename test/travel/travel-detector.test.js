const assert = require('assert');
const TravelDetector = require('../../src/travel/travel-detector');
const { TRAVEL_TYPES } = require('../../src/travel/travel-constants');

describe('TravelDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new TravelDetector();
  });

  describe('Flight Detection', () => {
    it('should detect flights from data', () => {
      const flightData = [
        {
          type: 'flight',
          departureTime: '2026-07-15T22:00:00Z',
          flightNumber: 'AA123',
          departure: 'JFK',
          arrival: 'LAX'
        }
      ];

      const flights = detector.detectFlights(flightData);
      assert.strictEqual(flights.length, 1);
      assert.strictEqual(flights[0].type, TRAVEL_TYPES.FLIGHT);
    });

    it('should detect red-eye flights', () => {
      const flightData = [
        {
          type: 'flight',
          departureTime: '2026-07-15T23:00:00Z',
          flightNumber: 'AA456'
        }
      ];

      const flights = detector.detectFlights(flightData);
      assert.ok(flights[0].isRedEye);
    });
  });

  describe('Uber Ride Detection', () => {
    it('should detect Uber rides from data', () => {
      const rideData = [
        {
          type: 'uber',
          startTime: '2026-07-15T20:00:00Z',
          pickup: 'Hotel',
          destination: 'Airport'
        }
      ];

      const rides = detector.detectUberRides(rideData);
      assert.strictEqual(rides.length, 1);
      assert.strictEqual(rides[0].type, TRAVEL_TYPES.UBER);
    });

    it('should detect airport rides', () => {
      const rideData = [
        {
          type: 'uber',
          startTime: '2026-07-15T20:00:00Z',
          pickup: 'Hotel',
          destination: 'JFK Airport'
        }
      ];

      const rides = detector.detectUberRides(rideData);
      assert.ok(rides[0].isAirport);
    });
  });
});