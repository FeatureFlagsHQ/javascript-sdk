/**
 * Jest test setup file
 */

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeEach(() => {
  // Suppress SDK logging during tests unless explicitly testing logging
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  
  // Clear all timers
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// Mock fetch globally for tests
global.fetch = jest.fn();

// Mock crypto for tests
const mockCrypto = {
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockImplementation((data: string) => ({
      digest: jest.fn().mockImplementation(() => {
        // Create a simple hash based on the input to make rollout testing work
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) - hash + data.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
      })
    }))
  }),
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mocked-signature')
    })
  })
};

// Mock Node.js modules
jest.mock('crypto', () => mockCrypto, { virtual: true });
jest.mock('events', () => ({
  EventEmitter: class MockEventEmitter {
    private events: Map<string, Function[]> = new Map();
    on(event: string, listener: Function) { 
      if (!this.events.has(event)) this.events.set(event, []);
      this.events.get(event)!.push(listener);
      return this;
    }
    once(event: string, listener: Function) { return this.on(event, listener); }
    off(_event: string, _listener: Function) { return this; }
    emit(event: string, ...args: any[]) { 
      const listeners = this.events.get(event);
      if (listeners) listeners.forEach(l => l(...args));
      return true;
    }
    removeAllListeners() { return this; }
  }
}), { virtual: true });

jest.mock('process', () => ({
  platform: 'test',
  version: 'v16.0.0',
  pid: 1234,
  env: {}
}), { virtual: true });

jest.mock('os', () => ({
  hostname: () => 'test-hostname',
  platform: () => 'test-platform'
}), { virtual: true });

// Set test environment variables
process.env.NODE_ENV = 'test';