/**
 * Browser polyfill tests
 */

describe('Browser Polyfills', () => {
  // Simple test to verify polyfills can be imported
  it('should import browser polyfills without errors', () => {
    expect(() => {
      require('../src/browser-polyfill');
    }).not.toThrow();
  });

  it('should have crypto polyfill available', () => {
    const { crypto } = require('../src/browser-polyfill');
    expect(crypto).toBeDefined();
    expect(typeof crypto.createHash).toBe('function');
    expect(typeof crypto.createHmac).toBe('function');
  });

  it('should have EventEmitter polyfill available', () => {
    const { EventEmitter } = require('../src/browser-polyfill');
    expect(EventEmitter).toBeDefined();
    
    const emitter = new EventEmitter();
    expect(typeof emitter.on).toBe('function');
    expect(typeof emitter.emit).toBe('function');
    expect(typeof emitter.off).toBe('function');
  });

  it('should have process polyfill available', () => {
    const { process } = require('../src/browser-polyfill');
    expect(process).toBeDefined();
    expect(process).toHaveProperty('platform');
    expect(process).toHaveProperty('version');
    expect(process).toHaveProperty('pid');
    expect(process).toHaveProperty('env');
  });

  it('should have os polyfill available', () => {
    const { os } = require('../src/browser-polyfill');
    expect(os).toBeDefined();
    expect(typeof os.hostname).toBe('function');
    expect(typeof os.platform).toBe('function');
  });

  it('should have fetch polyfill available', () => {
    const { fetch } = require('../src/browser-polyfill');
    expect(fetch).toBeDefined();
    expect(typeof fetch).toBe('function');
  });

  it('should handle EventEmitter basic functionality', () => {
    const { EventEmitter } = require('../src/browser-polyfill');
    const emitter = new EventEmitter();
    
    const listener = jest.fn();
    emitter.on('test', listener);
    emitter.emit('test', 'data');
    
    expect(listener).toHaveBeenCalledWith('data');
  });

  it('should handle process properties', () => {
    const { process } = require('../src/browser-polyfill');
    
    expect(typeof process.platform).toBe('string');
    expect(typeof process.version).toBe('string');
    expect(typeof process.pid).toBe('number');
    expect(typeof process.env).toBe('object');
  });

  it('should handle os functions', () => {
    const { os } = require('../src/browser-polyfill');
    
    const hostname = os.hostname();
    const platform = os.platform();
    
    expect(typeof hostname).toBe('string');
    expect(typeof platform).toBe('string');
  });
});