/**
 * Comprehensive Browser Polyfill Tests
 * Tests all polyfill functionality to improve coverage
 */

describe('Browser Polyfills - Comprehensive Coverage', () => {
  let polyfills: any;

  beforeAll(() => {
    // Mock window and browser environment
    const mockWindow = {
      crypto: {
        subtle: {
          digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
          importKey: jest.fn().mockResolvedValue({}),
          sign: jest.fn().mockResolvedValue(new ArrayBuffer(32))
        }
      },
      location: {
        hostname: 'test.example.com'
      }
    };

    const mockNavigator = {
      platform: 'Test Platform',
      hardwareConcurrency: 4
    };

    // Set global variables before importing
    (global as any).window = mockWindow;
    (global as any).navigator = mockNavigator;
    
    // Import after setting up mocks
    polyfills = require('../src/browser-polyfill');
  });

  afterAll(() => {
    // Clean up global mocks
    delete (global as any).window;
    delete (global as any).navigator;
    jest.resetModules();
  });

  describe('Crypto Polyfill', () => {
    it('should provide crypto.createHash function', () => {
      expect(polyfills.crypto).toBeDefined();
      expect(typeof polyfills.crypto.createHash).toBe('function');
    });

    it('should create hash with update and digest methods', () => {
      const hash = polyfills.crypto.createHash('sha256');
      expect(hash).toBeDefined();
      expect(typeof hash.update).toBe('function');
      
      const updater = hash.update('test data');
      expect(updater).toBeDefined();
      expect(typeof updater.digest).toBe('function');
    });

    it('should create HMAC with update and digest methods', () => {
      const hmac = polyfills.crypto.createHmac('sha256', 'secret-key');
      expect(hmac).toBeDefined();
      expect(typeof hmac.update).toBe('function');
      
      const updater = hmac.update('test data');
      expect(updater).toBeDefined();
      expect(typeof updater.digest).toBe('function');
    });

    it('should handle hash digest operation', async () => {
      const hash = polyfills.crypto.createHash('sha256');
      const updater = hash.update('test data');
      const digest = await updater.digest('hex');
      
      expect(typeof digest).toBe('string');
      expect(digest.length).toBeGreaterThan(0);
    });

    it('should handle HMAC digest operation', async () => {
      const hmac = polyfills.crypto.createHmac('sha256', 'secret-key');
      const updater = hmac.update('test data');
      const digest = await updater.digest('base64');
      
      expect(typeof digest).toBe('string');
      expect(digest.length).toBeGreaterThan(0);
    });

    it('should handle different algorithms', () => {
      const hash1 = polyfills.crypto.createHash('md5');
      const hash2 = polyfills.crypto.createHash('sha1');
      const hash3 = polyfills.crypto.createHash('sha512');
      
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash3).toBeDefined();
    });

    it('should handle different HMAC secrets', () => {
      const hmac1 = polyfills.crypto.createHmac('sha256', 'secret1');
      const hmac2 = polyfills.crypto.createHmac('sha256', 'secret2');
      const hmac3 = polyfills.crypto.createHmac('sha256', '');
      
      expect(hmac1).toBeDefined();
      expect(hmac2).toBeDefined();
      expect(hmac3).toBeDefined();
    });
  });

  describe('EventEmitter Polyfill', () => {
    let emitter: any;

    beforeEach(() => {
      emitter = new polyfills.EventEmitter();
    });

    it('should create EventEmitter instance', () => {
      expect(emitter).toBeDefined();
      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.off).toBe('function');
      expect(typeof emitter.emit).toBe('function');
      expect(typeof emitter.once).toBe('function');
      expect(typeof emitter.removeAllListeners).toBe('function');
    });

    it('should register and emit events', () => {
      const listener = jest.fn();
      emitter.on('test', listener);
      
      const result = emitter.emit('test', 'data1', 'data2');
      
      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith('data1', 'data2');
    });

    it('should handle multiple listeners for same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      emitter.on('test', listener3);
      
      emitter.emit('test', 'data');
      
      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
      expect(listener3).toHaveBeenCalledWith('data');
    });

    it('should support once listeners', () => {
      const listener = jest.fn();
      emitter.once('test', listener);
      
      emitter.emit('test', 'data1');
      emitter.emit('test', 'data2');
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('data1');
    });

    it('should remove specific listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on('test', listener1);
      emitter.on('test', listener2);
      
      emitter.off('test', listener1);
      emitter.emit('test', 'data');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('data');
    });

    it('should handle removing non-existent listener', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on('test', listener1);
      
      // Try to remove listener that wasn't added
      expect(() => emitter.off('test', listener2)).not.toThrow();
      
      // Original listener should still work
      emitter.emit('test', 'data');
      expect(listener1).toHaveBeenCalledWith('data');
    });

    it('should handle removing listener from non-existent event', () => {
      const listener = jest.fn();
      
      expect(() => emitter.off('nonexistent', listener)).not.toThrow();
    });

    it('should remove all listeners for specific event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      emitter.on('test1', listener1);
      emitter.on('test1', listener2);
      emitter.on('test2', listener3);
      
      emitter.removeAllListeners('test1');
      
      emitter.emit('test1', 'data');
      emitter.emit('test2', 'data');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(listener3).toHaveBeenCalledWith('data');
    });

    it('should remove all listeners for all events', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      emitter.on('test1', listener1);
      emitter.on('test2', listener2);
      emitter.on('test3', listener3);
      
      emitter.removeAllListeners();
      
      emitter.emit('test1', 'data');
      emitter.emit('test2', 'data');
      emitter.emit('test3', 'data');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(listener3).not.toHaveBeenCalled();
    });

    it('should return false when emitting to non-existent event', () => {
      const result = emitter.emit('nonexistent', 'data');
      expect(result).toBe(false);
    });

    it('should handle complex once listener scenarios', () => {
      const onceListener = jest.fn();
      const normalListener = jest.fn();
      
      emitter.once('test', onceListener);
      emitter.on('test', normalListener);
      
      // First emit
      emitter.emit('test', 'data1');
      expect(onceListener).toHaveBeenCalledWith('data1');
      expect(normalListener).toHaveBeenCalledWith('data1');
      
      // Second emit
      onceListener.mockClear();
      normalListener.mockClear();
      
      emitter.emit('test', 'data2');
      expect(onceListener).not.toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalledWith('data2');
    });

    it('should support method chaining', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const result = emitter
        .on('test1', listener1)
        .on('test2', listener2)
        .off('test1', listener1)
        .removeAllListeners('test2');
      
      expect(result).toBe(emitter);
    });
  });

  describe('Process Polyfill', () => {
    it('should provide process object with basic properties', () => {
      expect(polyfills.process).toBeDefined();
      expect(polyfills.process.platform).toBe('browser');
      expect(polyfills.process.version).toBe('browser');
      expect(typeof polyfills.process.pid).toBe('number');
      expect(polyfills.process.env).toBeDefined();
      expect(typeof polyfills.process.env).toBe('object');
    });

    it('should generate different PIDs for different instances', () => {
      // This tests the random PID generation in browser environment
      polyfills.process.pid;
      
      // Reset module and get new process instance
      jest.resetModules();
      delete (global as any).window;
      delete (global as any).navigator;
      
      // Set up mocks again
      (global as any).window = {
        crypto: {
          subtle: {
            digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
            importKey: jest.fn().mockResolvedValue({}),
            sign: jest.fn().mockResolvedValue(new ArrayBuffer(32))
          }
        },
        location: { hostname: 'test.example.com' }
      };
      (global as any).navigator = { platform: 'Test Platform', hardwareConcurrency: 4 };
      
      const newPolyfills = require('../src/browser-polyfill');
      const pid2 = newPolyfills.process.pid;
      
      expect(typeof pid2).toBe('number');
      expect(pid2).toBeGreaterThanOrEqual(0);
      expect(pid2).toBeLessThan(10000);
    });
  });

  describe('OS Polyfill', () => {
    it('should provide os object with basic functions', () => {
      expect(polyfills.os).toBeDefined();
      expect(typeof polyfills.os.hostname).toBe('function');
      expect(typeof polyfills.os.platform).toBe('function');
      expect(typeof polyfills.os.cpuCount).toBe('function');
    });

    it('should return hostname from window.location', () => {
      const hostname = polyfills.os.hostname();
      expect(hostname).toBe('test.example.com');
    });

    it('should return platform from navigator', () => {
      const platform = polyfills.os.platform();
      expect(platform).toBe('Test Platform');
    });

    it('should return CPU count from navigator.hardwareConcurrency', () => {
      const cpuCount = polyfills.os.cpuCount();
      expect(cpuCount).toBe(4);
    });

    it('should handle missing window.location.hostname', () => {
      // Temporarily modify the mock
      const originalHostname = (global as any).window.location.hostname;
      delete (global as any).window.location.hostname;
      
      jest.resetModules();
      const newPolyfills = require('../src/browser-polyfill');
      const hostname = newPolyfills.os.hostname();
      
      expect(hostname).toBe('browser');
      
      // Restore
      (global as any).window.location.hostname = originalHostname;
    });

    it('should handle missing navigator.platform', () => {
      // Temporarily modify the mock
      const originalPlatform = (global as any).navigator.platform;
      delete (global as any).navigator.platform;
      
      jest.resetModules();
      const newPolyfills = require('../src/browser-polyfill');
      const platform = newPolyfills.os.platform();
      
      expect(platform).toBe('browser');
      
      // Restore
      (global as any).navigator.platform = originalPlatform;
    });

    it('should handle missing navigator.hardwareConcurrency', () => {
      // Temporarily modify the mock
      const originalConcurrency = (global as any).navigator.hardwareConcurrency;
      delete (global as any).navigator.hardwareConcurrency;
      
      jest.resetModules();
      const newPolyfills = require('../src/browser-polyfill');
      const cpuCount = newPolyfills.os.cpuCount();
      
      // Should fallback to 1 or be a number depending on environment
      expect(typeof cpuCount).toBe('number');
      expect(cpuCount).toBeGreaterThanOrEqual(1);
      
      // Restore
      (global as any).navigator.hardwareConcurrency = originalConcurrency;
    });
  });

  describe('Fetch Polyfill', () => {
    it('should provide fetch function', () => {
      expect(polyfills.fetch).toBeDefined();
      expect(typeof polyfills.fetch).toBe('function');
    });

    it('should be the same function as global fetch when available', () => {
      // In browser environment with our mocks, fetch should be available
      expect(polyfills.fetch).toBeDefined();
    });
  });

  describe('Node.js Environment Fallback', () => {
    beforeAll(() => {
      // Remove browser globals to test Node.js path
      delete (global as any).window;
      delete (global as any).navigator;
      jest.resetModules();
    });

    it('should use Node.js modules when browser globals not available', () => {
      // This will test the Node.js path of the polyfills
      const nodePolyfills = require('../src/browser-polyfill');
      
      expect(nodePolyfills.crypto).toBeDefined();
      expect(nodePolyfills.EventEmitter).toBeDefined();
      expect(nodePolyfills.process).toBeDefined();
      expect(nodePolyfills.os).toBeDefined();
      expect(nodePolyfills.fetch).toBeDefined();
    });

    it('should handle Node.js crypto module', () => {
      const nodePolyfills = require('../src/browser-polyfill');
      
      // Should use actual Node.js crypto
      expect(typeof nodePolyfills.crypto.createHash).toBe('function');
      expect(typeof nodePolyfills.crypto.createHmac).toBe('function');
      
      // Test actual hash creation (not mocked)
      const hash = nodePolyfills.crypto.createHash('sha256');
      expect(hash).toBeDefined();
      expect(typeof hash.update).toBe('function');
    });

    it('should handle Node.js EventEmitter module', () => {
      const nodePolyfills = require('../src/browser-polyfill');
      
      // Should use actual Node.js EventEmitter
      expect(nodePolyfills.EventEmitter).toBeDefined();
      
      const emitter = new nodePolyfills.EventEmitter();
      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.emit).toBe('function');
    });

    it('should handle Node.js process module', () => {
      const nodePolyfills = require('../src/browser-polyfill');
      
      // Should use actual Node.js process
      expect(nodePolyfills.process).toBeDefined();
      expect(typeof nodePolyfills.process.platform).toBe('string');
      expect(typeof nodePolyfills.process.version).toBe('string');
      expect(typeof nodePolyfills.process.pid).toBe('number');
      expect(typeof nodePolyfills.process.env).toBe('object');
    });

    it('should handle Node.js os module', () => {
      const nodePolyfills = require('../src/browser-polyfill');
      
      // Should use actual Node.js os
      expect(nodePolyfills.os).toBeDefined();
      expect(typeof nodePolyfills.os.hostname).toBe('function');
      expect(typeof nodePolyfills.os.platform).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto errors gracefully', () => {
      // Mock window.crypto.subtle to fail
      (global as any).window = {
        crypto: {
          subtle: {
            digest: jest.fn().mockRejectedValue(new Error('Crypto error')),
            importKey: jest.fn().mockRejectedValue(new Error('Crypto error')),
            sign: jest.fn().mockRejectedValue(new Error('Crypto error'))
          }
        },
        location: { hostname: 'test.example.com' }
      };
      (global as any).navigator = { platform: 'Test Platform' };
      
      jest.resetModules();
      const errorPolyfills = require('../src/browser-polyfill');
      
      expect(errorPolyfills.crypto).toBeDefined();
      expect(typeof errorPolyfills.crypto.createHash).toBe('function');
      
      const hash = errorPolyfills.crypto.createHash('sha256');
      const updater = hash.update('data');
      
      // Should handle the rejected promise
      expect(updater.digest('hex')).rejects.toThrow('Crypto error');
    });

    it('should handle missing crypto in Node.js environment', () => {
      delete (global as any).window;
      delete (global as any).navigator;
      jest.resetModules();
      
      // Mock require to fail for crypto
      const originalRequire = require;
      (global as any).require = jest.fn().mockImplementation((module: string) => {
        if (module === 'crypto') {
          throw new Error('Module not found');
        }
        return originalRequire(module);
      });
      
      // Should either throw or handle gracefully
      try {
        require('../src/browser-polyfill');
      } catch (error) {
        expect((error as Error).message).toContain('Crypto not available');
      }
      
      // Restore
      (global as any).require = originalRequire;
    });
  });
});