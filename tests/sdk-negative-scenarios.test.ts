/**
 * SDK Negative Scenarios and Error Condition Tests
 * Comprehensive testing of error paths and edge cases
 */

import { FeatureFlagsHQSDK } from '../src/index';

// Mock fetch
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FeatureFlagsHQ SDK - Negative Scenarios', () => {
  let sdk: FeatureFlagsHQSDK;
  const sdkInstances: FeatureFlagsHQSDK[] = [];

  const validConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret-very-long-and-secure',
    environment: 'test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Mock console methods to prevent noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(async () => {
    if (sdk) {
      sdk.shutdown();
      sdk = null as any;
    }
    
    for (const instance of sdkInstances) {
      if (instance) {
        instance.shutdown();
      }
    }
    sdkInstances.length = 0;
    
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  const createSDK = (config: any): FeatureFlagsHQSDK => {
    const instance = new FeatureFlagsHQSDK(config);
    sdkInstances.push(instance);
    return instance;
  };

  describe('Initialization Failures', () => {
    it('should handle missing clientId', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientSecret: 'valid-secret',
          offlineMode: true
        });
      }).toThrow('clientId and clientSecret are required');
    });

    it('should handle missing clientSecret', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'valid-id',
          offlineMode: true
        });
      }).toThrow('clientId and clientSecret are required');
    });

    it('should handle both missing credentials', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          offlineMode: true
        });
      }).toThrow('clientId and clientSecret are required');
    });

    it('should handle very short client secret', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'valid-id',
          clientSecret: 'short',
          offlineMode: true
        });
      }).not.toThrow();
    });

    it('should handle invalid timeout values', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          timeout: -1000,
          offlineMode: true
        });
      }).not.toThrow();
    });

    it('should handle invalid maxRetries values', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          maxRetries: -1,
          offlineMode: true
        });
      }).not.toThrow();
    });

    it('should handle zero timeout values', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          timeout: 0,
          offlineMode: true
        });
      }).not.toThrow();
    });
  });

  describe('Network Failures and Timeouts', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        timeout: 100, // Very short timeout for testing
        maxRetries: 1
      });
    });

    it('should handle complete network failure', async () => {
      const networkError = new Error('Network unavailable');
      (networkError as any).code = 'ENOTFOUND';
      mockFetch.mockRejectedValue(networkError);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      const stats = sdk.getStats();
      expect(stats.errors.network_errors).toBeGreaterThan(0);
    });

    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND api.featureflagshq.com'));

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle connection refused', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle SSL/TLS errors', async () => {
      mockFetch.mockRejectedValue(new Error('CERT_HAS_EXPIRED'));

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle request timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 200);
        })
      );

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle read timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Read timeout')), 200);
            })
          } as any), 50);
        })
      );

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });
  });

  describe('HTTP Error Responses', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });
    });

    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request format'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      const stats = sdk.getStats();
      expect(stats.errors.auth_errors).toBeGreaterThan(0);
    });

    it('should handle 403 Forbidden', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle 429 Too Many Requests', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'Retry-After' ? '60' : null
        }
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      const stats = sdk.getStats();
      expect(stats.errors.other_errors).toBeGreaterThan(0);
    });

    it('should handle 502 Bad Gateway', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle 503 Service Unavailable', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });
  });

  describe('Malformed Response Handling', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle invalid JSON structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'structure', missing: 'data_field' })
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Unexpected token in JSON'); }
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle corrupted flag data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              // Missing required fields
              name: 'incomplete-flag',
              // value: missing
              // type: missing
              is_active: true
            }
          ]
        })
      } as any);

      const result = await sdk.refreshFlags();
      // Should still return true but skip invalid flags
      expect(result).toBe(true);
    });

    it('should handle non-array data field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: 'not-an-array'
        })
      } as any);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });
  });

  describe('Input Validation Failures', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should reject malicious user IDs', async () => {
      const maliciousIds = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        'user\0null-byte',
        'user\r\nheader-injection: malicious',
        'user/*comment*/injection',
        String.fromCharCode(0) + 'null-prefix',
        'user' + '\x00' + 'embedded-null'
      ];

      for (const userId of maliciousIds) {
        const result = await sdk.getString(userId, 'test-flag', 'default');
        expect(result).toBe('default');
      }
    });

    it('should reject malicious flag names', async () => {
      const maliciousFlagNames = [
        'flag<script>alert(1)</script>',
        'flag"; DROP TABLE flags; --',
        '../../../config.json',
        'flag\0null',
        'flag\r\nheader: injection',
        'flag/**/injection'
      ];

      for (const flagName of maliciousFlagNames) {
        const result = await sdk.getString('user-123', flagName, 'default');
        expect(result).toBe('default');
      }
    });

    it('should reject oversized inputs', async () => {
      const oversizedUserId = 'a'.repeat(1000);
      const oversizedFlagName = 'flag-' + 'a'.repeat(500);
      
      const result1 = await sdk.getString(oversizedUserId, 'test-flag', 'default');
      const result2 = await sdk.getString('user-123', oversizedFlagName, 'default');
      
      expect(result1).toBe('default');
      expect(result2).toBe('default');
    });

    it('should handle null and undefined inputs', async () => {
      const result1 = await sdk.getString(null as any, 'test-flag', 'default');
      const result2 = await sdk.getString('user-123', null as any, 'default');
      const result3 = await sdk.getString(undefined as any, 'test-flag', 'default');
      const result4 = await sdk.getString('user-123', undefined as any, 'default');
      
      expect(result1).toBe('default');
      expect(result2).toBe('default');
      expect(result3).toBe('default');
      expect(result4).toBe('default');
    });

    it('should handle non-string inputs', async () => {
      const result1 = await sdk.getString(123 as any, 'test-flag', 'default');
      const result2 = await sdk.getString('user-123', 456 as any, 'default');
      const result3 = await sdk.getString({} as any, 'test-flag', 'default');
      const result4 = await sdk.getString('user-123', [] as any, 'default');
      
      expect(result1).toBe('default');
      expect(result2).toBe('default');
      expect(result3).toBe('default');
      expect(result4).toBe('default');
    });
  });

  describe('Segment Evaluation Failures', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should handle segments with invalid data types', async () => {
      const flagWithBadSegments = {
        name: 'bad-segments-flag',
        value: 'value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'age',
            value: 'not-a-number', // Should be number for int type
            type: 'int',
            comparator: '=='
          }
        ]
      };

      (sdk as any).flags.set('bad-segments-flag', flagWithBadSegments);

      const result = await sdk.getString('user-123', 'bad-segments-flag', 'default', {
        age: 25
      });
      
      expect(result).toBe('default'); // Should fail segment evaluation
    });

    it('should handle circular references in segment data', async () => {
      const segments: any = { country: 'US' };
      segments.self = segments; // Create circular reference
      
      const result = await sdk.getString('user-123', 'test-flag', 'default', segments);
      expect(result).toBe('default');
    });

    it('should handle segments with null/undefined values', async () => {
      const flagWithSegments = {
        name: 'null-segments-flag',
        value: 'value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'country',
            value: 'US',
            type: 'string',
            comparator: '=='
          }
        ]
      };

      (sdk as any).flags.set('null-segments-flag', flagWithSegments);

      const result = await sdk.getString('user-123', 'null-segments-flag', 'default', {
        country: null
      });
      
      expect(result).toBe('default');
    });

    it('should handle unsupported comparators', async () => {
      const flagWithBadComparator = {
        name: 'bad-comparator-flag',
        value: 'value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'score',
            value: 50,
            type: 'int',
            comparator: 'unsupported' as any
          }
        ]
      };

      (sdk as any).flags.set('bad-comparator-flag', flagWithBadComparator);

      const result = await sdk.getString('user-123', 'bad-comparator-flag', 'default', {
        score: 75
      });
      
      expect(result).toBe('default');
    });

    it('should handle division by zero in comparisons', async () => {
      const flagWithZeroDivision = {
        name: 'zero-division-flag',
        value: 'value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'ratio',
            value: 0,
            type: 'float',
            comparator: '>'
          }
        ]
      };

      (sdk as any).flags.set('zero-division-flag', flagWithZeroDivision);

      const result = await sdk.getString('user-123', 'zero-division-flag', 'default', {
        ratio: 1 / 0 // Infinity
      });
      
      // Should handle Infinity comparison
      expect(typeof result).toBe('string');
    });
  });

  describe('Type Conversion Failures', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should handle invalid JSON in flags', async () => {
      const invalidJsonFlag = {
        name: 'invalid-json-flag',
        value: '{"invalid": json, "missing": "quote}',
        type: 'json',
        is_active: true
      };

      (sdk as any).flags.set('invalid-json-flag', invalidJsonFlag);

      const result = await sdk.getJson('user-123', 'invalid-json-flag', { fallback: true });
      expect(result).toEqual({}); // Should return empty object for invalid JSON
    });

    it('should handle NaN in numeric conversions', async () => {
      const nanFlag = {
        name: 'nan-flag',
        value: 'definitely-not-a-number',
        type: 'int',
        is_active: true
      };

      (sdk as any).flags.set('nan-flag', nanFlag);

      const intResult = await sdk.getInt('user-123', 'nan-flag', 999);
      const floatResult = await sdk.getFloat('user-123', 'nan-flag', 99.9);
      
      expect(intResult).toBe(999);
      expect(floatResult).toBe(99.9);
    });

    it('should handle Infinity in numeric conversions', async () => {
      const infinityFlag = {
        name: 'infinity-flag',
        value: 'Infinity',
        type: 'float',
        is_active: true
      };

      (sdk as any).flags.set('infinity-flag', infinityFlag);

      const result = await sdk.getFloat('user-123', 'infinity-flag', 1.0);
      // Should either be Infinity or default (depending on implementation)
      expect(typeof result).toBe('number');
    });

    it('should handle very large numbers', async () => {
      const largeNumberFlag = {
        name: 'large-number-flag',
        value: Number.MAX_SAFE_INTEGER.toString() + '999',
        type: 'int',
        is_active: true
      };

      (sdk as any).flags.set('large-number-flag', largeNumberFlag);

      const result = await sdk.getInt('user-123', 'large-number-flag', 0);
      expect(typeof result).toBe('number');
    });

    it('should handle negative zero', async () => {
      const negativeZeroFlag = {
        name: 'negative-zero-flag',
        value: '-0',
        type: 'float',
        is_active: true
      };

      (sdk as any).flags.set('negative-zero-flag', negativeZeroFlag);

      const result = await sdk.getFloat('user-123', 'negative-zero-flag', 1.0);
      // parseFloat('-0') returns 0, not -0, which is expected JavaScript behavior
      expect(result).toBe(0);
    });
  });

  describe('Memory and Resource Exhaustion', () => {
    it('should handle excessive flag creation', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      // Try to create many flags to test memory limits
      for (let i = 0; i < 1000; i++) {
        const flag = {
          name: `flag-${i}`,
          value: `value-${i}`.repeat(100), // Large values
          type: 'string',
          is_active: true
        };
        (sdk as any).flags.set(`flag-${i}`, flag);
      }

      // Should still function
      const result = await sdk.getString('user-123', 'flag-500', 'default');
      expect(result).toBe('value-500'.repeat(100));
    });

    it('should handle excessive log generation', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true, // Prevent actual uploads
        enableMetrics: true
      });

      // Generate many logs
      for (let i = 0; i < 1000; i++) {
        await sdk.getString(`user-${i}`, 'test-flag', 'default');
      }

      const stats = sdk.getStats();
      expect(stats.pending_user_logs).toBeDefined();
      expect(stats.total_user_accesses).toBe(1000);
    });

    it('should handle rapid concurrent requests', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const testFlag = {
        name: 'concurrent-test-flag',
        value: 'concurrent-value',
        type: 'string',
        is_active: true
      };
      (sdk as any).flags.set('concurrent-test-flag', testFlag);

      // Make many concurrent requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        sdk.getString(`user-${i}`, 'concurrent-test-flag', 'default')
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results.every(r => r === 'concurrent-value')).toBe(true);
    });
  });

  describe('Authentication and Security Failures', () => {
    it('should handle signature generation failures', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      // Mock crypto to fail
      const originalCreateHash = require('crypto').createHash;
      jest.spyOn(require('crypto'), 'createHash').mockImplementation(() => {
        throw new Error('Crypto operation failed');
      });

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      // Restore
      require('crypto').createHash = originalCreateHash;
    });

    it('should handle timestamp manipulation', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      // Mock Date.now to return invalid timestamp
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockReturnValue(NaN);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      } as any);

      const result = await sdk.refreshFlags();
      // Should handle NaN timestamp gracefully
      expect(typeof result).toBe('boolean');

      // Restore
      Date.now = originalDateNow;
    });

    it('should handle invalid API base URL during runtime', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          apiBaseUrl: 'not-a-valid-url',
          offlineMode: true
        });
      }).toThrow('Invalid URL format');
    });
  });

  describe('Cleanup and Shutdown Failures', () => {
    it('should handle shutdown with pending operations', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        pollingInterval: 50,
        logUploadInterval: 50
      });

      // Start some operations
      const promise1 = sdk.refreshFlags();
      const promise2 = sdk.flushLogs();

      // Shutdown immediately
      sdk.shutdown();

      // Operations should complete or fail gracefully
      const results = await Promise.allSettled([promise1, promise2]);
      expect(results).toHaveLength(2);
    });

    it('should handle cleanup errors', () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      // Mock clearInterval to throw
      const originalClearInterval = global.clearInterval;
      global.clearInterval = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      // Should not throw
      expect(() => sdk.shutdown()).not.toThrow();

      // Restore
      global.clearInterval = originalClearInterval;
    });
  });
});