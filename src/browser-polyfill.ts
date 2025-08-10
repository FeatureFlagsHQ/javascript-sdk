/**
 * Browser polyfills and compatibility layer
 * Handles differences between Node.js and browser environments
 */

// Crypto polyfill for browsers
export const crypto = (() => {
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    return {
      createHash: (_algorithm: string) => ({
        update: (data: string) => ({
          digest: (_encoding: string) => {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            return window.crypto.subtle.digest('SHA-256', dataBuffer).then(buffer => {
              const array = Array.from(new Uint8Array(buffer));
              return array.map(b => b.toString(16).padStart(2, '0')).join('');
            });
          }
        })
      }),
      createHmac: (_algorithm: string, secret: string) => ({
        update: (data: string) => ({
          digest: (_encoding: string) => {
            const encoder = new TextEncoder();
            const keyBuffer = encoder.encode(secret);
            const dataBuffer = encoder.encode(data);
            
            return window.crypto.subtle.importKey(
              'raw',
              keyBuffer,
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            ).then(key => 
              window.crypto.subtle.sign('HMAC', key, dataBuffer)
            ).then(signature => {
              const array = Array.from(new Uint8Array(signature));
              const base64 = btoa(String.fromCharCode.apply(null, array));
              return base64;
            });
          }
        })
      })
    };
  } else {
    // Node.js environment
    try {
      return require('crypto');
    } catch {
      throw new Error('Crypto not available in this environment');
    }
  }
})();

// EventEmitter polyfill for browsers
export const EventEmitter = (() => {
  if (typeof window !== 'undefined') {
    // Browser EventEmitter implementation
    return class EventEmitter {
      private events: Map<string, Function[]> = new Map();

      on(event: string, listener: Function): this {
        if (!this.events.has(event)) {
          this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
        return this;
      }

      once(event: string, listener: Function): this {
        const onceWrapper = (...args: any[]) => {
          this.off(event, onceWrapper);
          listener.apply(this, args);
        };
        return this.on(event, onceWrapper);
      }

      off(event: string, listener: Function): this {
        const listeners = this.events.get(event);
        if (listeners) {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        }
        return this;
      }

      emit(event: string, ...args: any[]): boolean {
        const listeners = this.events.get(event);
        if (listeners) {
          listeners.forEach(listener => listener.apply(this, args));
          return true;
        }
        return false;
      }

      removeAllListeners(event?: string): this {
        if (event) {
          this.events.delete(event);
        } else {
          this.events.clear();
        }
        return this;
      }
    };
  } else {
    // Node.js environment
    try {
      return require('events').EventEmitter;
    } catch {
      throw new Error('EventEmitter not available in this environment');
    }
  }
})();

// Process polyfill for browsers
export const process = (() => {
  if (typeof window !== 'undefined') {
    return {
      platform: 'browser',
      version: 'browser',
      pid: 1,
      env: {}
    };
  } else {
    return globalThis.process || require('process');
  }
})();

// OS polyfill for browsers
export const os = (() => {
  if (typeof window !== 'undefined') {
    return {
      hostname: () => window.location.hostname || 'browser',
      platform: () => navigator.platform || 'browser'
    };
  } else {
    try {
      return require('os');
    } catch {
      return {
        hostname: () => 'unknown',
        platform: () => 'unknown'
      };
    }
  }
})();

// Fetch polyfill check
export const fetch = (() => {
  if (typeof globalThis.fetch !== 'undefined') {
    return globalThis.fetch;
  } else if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch;
  } else {
    // Node.js environment - try to use node-fetch if available
    try {
      const nodeFetch = require('node-fetch');
      return nodeFetch.default || nodeFetch;
    } catch {
      throw new Error(
        'Fetch not available. In Node.js environments, please install node-fetch: npm install node-fetch'
      );
    }
  }
})();