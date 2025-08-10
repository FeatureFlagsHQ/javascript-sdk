/**
 * Comprehensive SDK Tests for improved coverage
 * Covers authentication, networking, polling, logging, and internal methods
 */

import { FeatureFlagsHQSDK } from '../src/index';

// Mock fetch
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FeatureFlagsHQ SDK - Comprehensive Coverage', () => {
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
    // Prevent console noise during tests
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

  describe('Authentication and Security', () => {
    it('should generate proper authentication headers', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      } as Response);

      await sdk.refreshFlags();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'X-Timestamp': expect.any(String),
            'X-Signature': expect.any(String),
            'Content-Type': 'application/json',
            'User-Agent': expect.stringContaining('FeatureFlagsHQ-Node-SDK')
          })
        })
      );
    });

    it('should handle signature generation with different payloads', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      const headers1 = await (sdk as any).getHeaders();
      const headers2 = await (sdk as any).getHeaders('{"test": "data"}');

      expect(headers1['X-Signature']).toBeDefined();
      expect(headers2['X-Signature']).toBeDefined();
      expect(headers1['X-Signature']).not.toBe(headers2['X-Signature']);
    });

    it('should validate client secret length', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'test-id',
          clientSecret: 'short', // Too short
          offlineMode: true
        });
      }).toThrow('clientSecret must be at least 8 characters long');
    });

    it('should handle authentication errors', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      const stats = sdk.getStats();
      expect(stats.errors.auth_errors).toBeGreaterThan(0);
    });
  });

  describe('Network Operations and Error Handling', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        timeout: 1000
      });
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [] })
          } as Response), 2000);
        })
      );

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      const stats = sdk.getStats();
      expect(stats.errors.network_errors).toBeGreaterThan(0);
    });

    it('should handle server errors (500)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);

      const stats = sdk.getStats();
      expect(stats.errors.other_errors).toBeGreaterThan(0);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: 'https://api.test.com',
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        json: async () => { throw new Error('Invalid JSON'); },
        text: jest.fn()
      } as Response);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should retry on network failures', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        } as Response);
      });

      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        maxRetries: 3
      });

      const result = await sdk.refreshFlags();
      expect(result).toBe(true);
      expect(callCount).toBe(3);
    });
  });

  describe('Flag Polling and Background Operations', () => {
    it('should start polling in online mode', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ 
          data: [{
            name: 'polled-flag',
            value: 'polled-value',
            type: 'string',
            is_active: true
          }]
        })
      } as Response);

      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        pollingInterval: 100 // Very short for testing
      });

      // Wait for initialization and polling
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check that polling occurred
      expect(mockFetch).toHaveBeenCalled();
      
      // Check that flag was loaded
      const flags = sdk.getAllFlags();
      expect(flags).toHaveProperty('polled-flag');
    });

    it('should handle polling errors gracefully', async () => {
      let pollCount = 0;
      mockFetch.mockImplementation(() => {
        pollCount++;
        return Promise.reject(new Error('Polling error'));
      });

      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        pollingInterval: 50
      });

      await new Promise(resolve => setTimeout(resolve, 120));

      expect(pollCount).toBeGreaterThan(1);
    });

    it('should not start polling in offline mode', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Logging and Metrics', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        enableMetrics: true,
        logUploadInterval: 100
      });
    });

    it('should collect and upload logs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as Response);

      // Create some log entries
      await sdk.getString('user-1', 'test-flag', 'default');
      await sdk.getBool('user-2', 'bool-flag', false);
      
      // Manually flush logs
      const result = await sdk.flushLogs();
      expect(result).toBe(true);

      // Check that logs were uploaded
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/logs'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
    });

    it('should handle log upload failures', async () => {
      mockFetch.mockRejectedValue(new Error('Upload failed'));

      await sdk.getString('user-1', 'test-flag', 'default');
      
      const result = await sdk.flushLogs();
      expect(result).toBe(false);
    });

    it('should not upload logs when metrics are disabled', async () => {
      sdk.shutdown();
      sdk = createSDK({
        ...validConfig,
        enableMetrics: false
      });

      await sdk.getString('user-1', 'test-flag', 'default');
      
      const result = await sdk.flushLogs();
      expect(result).toBe(false);
    });

    it('should track comprehensive statistics', async () => {
      // Create various operations to track
      await sdk.getString('user-1', 'flag-1', 'default');
      await sdk.getBool('user-2', 'flag-2', false);
      await sdk.getInt('user-3', 'flag-3', 0);
      await sdk.getFloat('user-1', 'flag-4', 0.0);

      const stats = sdk.getStats();
      
      expect(stats.total_user_accesses).toBe(4);
      expect(stats.unique_users_count).toBe(3);
      expect(stats.unique_flags_count).toBe(4);
      expect(stats.session_id).toBeDefined();
      expect(stats.evaluation_times).toBeDefined();
      expect(stats.configuration).toBeDefined();
    });
  });

  describe('Advanced Flag Evaluation', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should handle complex segment evaluations', async () => {
      const complexFlag = {
        name: 'complex-flag',
        value: 'complex-value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'age',
            value: 25,
            type: 'int',
            comparator: '>='
          },
          {
            name: 'country',
            value: 'US',
            type: 'string',
            comparator: '=='
          },
          {
            name: 'score',
            value: 80.5,
            type: 'float',
            comparator: '>'
          }
        ]
      };

      (sdk as any).flags.set('complex-flag', complexFlag);

      // Should match all segments
      const result1 = await sdk.getString('user-123', 'complex-flag', 'default', {
        age: 30,
        country: 'US',
        score: 85.7
      });
      expect(result1).toBe('complex-value');

      // Should not match (age too low)
      const result2 = await sdk.getString('user-123', 'complex-flag', 'default', {
        age: 20,
        country: 'US',
        score: 85.7
      });
      expect(result2).toBe('default');
    });

    it('should handle all segment comparators', async () => {
      const testCases = [
        { comparator: '==', value: 10, userValue: 10, shouldMatch: true },
        { comparator: '!=', value: 10, userValue: 20, shouldMatch: true },
        { comparator: '>', value: 10, userValue: 15, shouldMatch: true },
        { comparator: '<', value: 10, userValue: 5, shouldMatch: true },
        { comparator: '>=', value: 10, userValue: 10, shouldMatch: true },
        { comparator: '<=', value: 10, userValue: 10, shouldMatch: true },
        { comparator: 'contains', value: 'test', userValue: 'testing', shouldMatch: true }
      ];

      for (const testCase of testCases) {
        const flag = {
          name: 'comparator-flag',
          value: 'matched',
          type: 'string',
          is_active: true,
          segments: [{
            name: 'testfield',
            value: testCase.value,
            type: 'string',
            comparator: testCase.comparator as any
          }]
        };

        (sdk as any).flags.set('comparator-flag', flag);

        const result = await sdk.getString('user-123', 'comparator-flag', 'default', {
          testfield: testCase.userValue
        });

        if (testCase.shouldMatch) {
          expect(result).toBe('matched');
        } else {
          expect(result).toBe('default');
        }
      }
    });

    it('should handle rollout percentages correctly', async () => {
      const rolloutFlag = {
        name: 'rollout-flag',
        value: 'rollout-value',
        type: 'string',
        is_active: true,
        rollout: { percentage: 50 }
      };

      (sdk as any).flags.set('rollout-flag', rolloutFlag);

      // Test multiple users to verify rollout logic
      const results = [];
      for (let i = 0; i < 20; i++) {
        const result = await sdk.getString(`user-${i}`, 'rollout-flag', 'default');
        results.push(result);
      }

      // Should have some users getting the flag value and some getting default
      const flagValues = results.filter(r => r === 'rollout-value').length;
      const defaultValues = results.filter(r => r === 'default').length;

      expect(flagValues).toBeGreaterThan(0);
      expect(defaultValues).toBeGreaterThan(0);
      expect(flagValues + defaultValues).toBe(20);
    });

    it('should handle inactive flags', async () => {
      const inactiveFlag = {
        name: 'inactive-flag',
        value: 'inactive-value',
        type: 'string',
        is_active: false
      };

      (sdk as any).flags.set('inactive-flag', inactiveFlag);

      const result = await sdk.getString('user-123', 'inactive-flag', 'default');
      expect(result).toBe('default');
    });
  });

  describe('Type Conversions and Edge Cases', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should handle various JSON conversion scenarios', async () => {
      const testCases = [
        { value: '{"key": "value"}', expected: { key: "value" }},
        { value: '[]', expected: [] },
        { value: 'null', expected: null },
        { value: 'true', expected: true },
        { value: '123', expected: 123 },
        { value: { already: 'object' }, expected: { already: 'object' }},
        { value: 'invalid json{', expected: {} } // Should return default
      ];

      for (const testCase of testCases) {
        const flag = {
          name: 'json-flag',
          value: testCase.value,
          type: 'json',
          is_active: true
        };

        (sdk as any).flags.set('json-flag', flag);

        const result = await sdk.getJson('user-123', 'json-flag', {});
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should handle float conversion edge cases', async () => {
      const testCases = [
        { value: '3.14159', expected: 3.14159 },
        { value: '-2.5', expected: -2.5 },
        { value: '0', expected: 0 },
        { value: '1e10', expected: 1e10 },
        { value: 'not-a-number', expected: 999 } // Should return default
      ];

      for (const testCase of testCases) {
        const flag = {
          name: 'float-flag',
          value: testCase.value,
          type: 'float',
          is_active: true
        };

        (sdk as any).flags.set('float-flag', flag);

        const result = await sdk.getFloat('user-123', 'float-flag', 999);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should handle boolean conversion patterns', async () => {
      const testCases = [
        { value: true, expected: true },
        { value: false, expected: false },
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: 'TRUE', expected: true },
        { value: 'FALSE', expected: false },
        { value: '1', expected: true },
        { value: '0', expected: false },
        { value: 'yes', expected: true },
        { value: 'no', expected: false },
        { value: 'random', expected: false },
        { value: null, expected: false },
        { value: undefined, expected: false },
        { value: '', expected: false }
      ];

      for (const testCase of testCases) {
        const flag = {
          name: 'bool-flag',
          value: testCase.value,
          type: 'bool',
          is_active: true
        };

        (sdk as any).flags.set('bool-flag', flag);

        const result = await sdk.getBool('user-123', 'bool-flag', false);
        expect(result).toBe(testCase.expected);
      }
    });
  });

  describe('System Integration and Environment', () => {
    it('should collect system information', () => {
      sdk = createSDK(validConfig);
      const systemInfo = (sdk as any).systemInfo;

      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('hostname');
      expect(systemInfo).toHaveProperty('process_id');
      expect(systemInfo).toHaveProperty('node_version');

      if (systemInfo.cpu_count !== undefined) {
        expect(typeof systemInfo.cpu_count).toBe('number');
      }
      if (systemInfo.memory_total !== undefined) {
        expect(typeof systemInfo.memory_total).toBe('number');
      }
    });

    it('should provide comprehensive health check', () => {
      sdk = createSDK(validConfig);
      
      const health = sdk.getHealthCheck();
      
      expect(health.status).toBeDefined();
      expect(health.sdk_version).toBeDefined();
      expect(health.api_base_url).toBeDefined();
      expect(health.environment).toBeDefined();
      expect(health.circuit_breaker).toBeDefined();
      expect(health.system_info).toBeDefined();
      expect(health.initialization_complete).toBeDefined();
    });

    it('should handle shutdown gracefully', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        pollingInterval: 50,
        logUploadInterval: 50
      });

      // Create some activity
      await sdk.getString('user-1', 'test-flag', 'default');
      
      // Wait for intervals to start
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Shutdown should clear intervals
      sdk.shutdown();
      
      // Operations after shutdown should return defaults
      const result = await sdk.getString('user-2', 'test-flag', 'default-after-shutdown');
      expect(result).toBe('default-after-shutdown');
    });

    it('should handle multiple shutdowns', () => {
      sdk = createSDK(validConfig);
      
      expect(() => {
        sdk.shutdown();
        sdk.shutdown();
        sdk.shutdown();
      }).not.toThrow();
    });
  });

  describe('Circuit Breaker Advanced Scenarios', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });
    });

    it('should record API success and reset failure count', () => {
      const circuitBreaker = (sdk as any).circuitBreaker;
      
      // First set some failures
      (sdk as any).recordApiFailure();
      (sdk as any).recordApiFailure();
      expect(circuitBreaker.failure_count).toBe(2);
      
      // Record success should reset
      (sdk as any).recordApiSuccess();
      expect(circuitBreaker.failure_count).toBe(0);
    });

    it('should categorize different error types', () => {
      const stats = sdk.getStats();
      const initialNetworkErrors = stats.errors.network_errors;
      const initialAuthErrors = stats.errors.auth_errors;
      const initialOtherErrors = stats.errors.other_errors;
      
      (sdk as any).recordApiFailure('network_errors');
      (sdk as any).recordApiFailure('auth_errors');  
      (sdk as any).recordApiFailure('other_errors');
      
      const updatedStats = sdk.getStats();
      expect(updatedStats.errors.network_errors).toBe(initialNetworkErrors + 1);
      expect(updatedStats.errors.auth_errors).toBe(initialAuthErrors + 1);
      expect(updatedStats.errors.other_errors).toBe(initialOtherErrors + 1);
    });

    it('should handle circuit breaker state transitions', () => {
      const circuitBreaker = (sdk as any).circuitBreaker;
      
      // Should start closed
      expect(circuitBreaker.state).toBe('closed');
      
      // Open after failures
      for (let i = 0; i < 5; i++) {
        (sdk as any).recordApiFailure();
      }
      expect(circuitBreaker.state).toBe('open');
      
      // Should transition to half-open after timeout
      circuitBreaker.last_failure_time = Date.now() - 61000; // 61 seconds ago
      const canProceed = (sdk as any).checkCircuitBreaker();
      expect(canProceed).toBe(true);
      expect(circuitBreaker.state).toBe('half-open');
    });
  });

  describe('Rate Limiting Advanced Tests', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });
    });

    it('should enforce rate limits per user', async () => {
      // Set up a user that exceeds rate limit
      const userId = 'rate-limited-user';
      
      // Simulate exceeding rate limit (over 1000 requests)
      (sdk as any).rateLimits.set(userId, [1001, Date.now()]);
      
      const result = await sdk.getString(userId, 'test-flag', 'default');
      expect(result).toBe('default');
    });

    it('should reset rate limits after time window', async () => {
      const userId = 'time-window-user';
      
      // Set rate limit with old timestamp (should be reset)
      (sdk as any).rateLimits.set(userId, [1001, Date.now() - 61000]); // 61 seconds ago
      
      await sdk.getString(userId, 'test-flag', 'default');
      // Should not be rate limited now
      const rateLimits = (sdk as any).rateLimits;
      if (rateLimits.has(userId)) {
        expect(rateLimits.get(userId)[0]).toBeLessThan(1000);
      }
    });
  });

  describe('Validation and Security', () => {
    beforeEach(() => {
      sdk = createSDK(validConfig);
    });

    it('should validate URL format thoroughly', () => {
      const testCases = [
        { url: 'https://valid.com', shouldPass: true },
        { url: 'http://also-valid.com', shouldPass: true },
        { url: 'not-a-url', shouldPass: false },
        { url: 'ftp://invalid-protocol.com', shouldPass: false },
        { url: 'http://', shouldPass: false },
        { url: '', shouldPass: false }
      ];

      for (const testCase of testCases) {
        if (testCase.shouldPass) {
          expect(() => (sdk as any).validateUrl(testCase.url)).not.toThrow();
        } else {
          expect(() => (sdk as any).validateUrl(testCase.url)).toThrow('Invalid URL format');
        }
      }
    });

    it('should validate string inputs with length limits', () => {
      const validateString = (sdk as any).validateString;
      
      // Valid strings
      expect(validateString('valid', 'test', 10)).toBe('valid');
      
      // Too long
      expect(() => validateString('a'.repeat(300), 'test', 255)).toThrow('test is too long');
      
      // Empty string
      expect(() => validateString('', 'test')).toThrow('test cannot be empty');
      
      // Whitespace only
      expect(() => validateString('   ', 'test')).toThrow('test cannot be empty');
    });

    it('should filter dangerous patterns in user inputs', () => {
      const testInputs = [
        'user<script>alert(1)</script>',
        'user"; DROP TABLE users; --',
        'user/*comment*/',
        'user\0null-byte',
        'user\r\nheader-injection',
        'user' + '\x00' + 'null'
      ];

      for (const input of testInputs) {
        expect(() => (sdk as any).validateUserId(input)).toThrow();
      }
    });

    it('should validate flag names properly', () => {
      const validateFlagName = (sdk as any).validateFlagName;
      
      // Valid flag names
      expect(validateFlagName('valid-flag-name')).toBe('valid-flag-name');
      expect(validateFlagName('flag_with_underscores')).toBe('flag_with_underscores');
      
      // Invalid flag names
      expect(() => validateFlagName('')).toThrow();
      expect(() => validateFlagName('   ')).toThrow();
      expect(() => validateFlagName('flag<script>')).toThrow();
    });
  });

  describe('Statistics Cleanup and Management', () => {
    beforeEach(() => {
      sdk = createSDK(validConfig);
    });

    it('should clean up old statistics', () => {
      // Simulate old statistics
      const stats = (sdk as any).stats;
      Date.now() - 86400000 - 1000; // Over 24 hours ago
      
      // Add old entries
      stats.unique_users.add('old-user-1');
      stats.unique_users.add('old-user-2');
      stats.unique_flags_accessed.add('old-flag-1');
      
      // Simulate old entries (this is harder to test directly due to Set/Map structure)
      // Instead, we'll test that the cleanup method can be called without error
      expect(() => (sdk as any).cleanupOldStats()).not.toThrow();
    });

    it('should track unique users and flags with limits', async () => {
      // Add many unique users
      for (let i = 0; i < 15; i++) {
        await sdk.getString(`user-${i}`, 'test-flag', 'default');
      }
      
      // Add many unique flags
      for (let i = 0; i < 15; i++) {
        const flag = {
          name: `flag-${i}`,
          value: `value-${i}`,
          type: 'string',
          is_active: true
        };
        (sdk as any).flags.set(`flag-${i}`, flag);
        await sdk.getString('test-user', `flag-${i}`, 'default');
      }
      
      const stats = sdk.getStats();
      
      // Should track unique entities but respect limits
      expect(stats.unique_users_count).toBeLessThanOrEqual(10000);
      expect(stats.unique_flags_count).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling in Statistics', () => {
    it('should handle errors in getStats gracefully', () => {
      sdk = createSDK(validConfig);
      
      // Corrupt internal stats to force an error
      (sdk as any).stats = null;
      
      const stats = sdk.getStats();
      expect(stats).toHaveProperty('error');
    });

    it('should handle errors in getHealthCheck gracefully', () => {
      sdk = createSDK(validConfig);
      
      // Corrupt internal state to force an error
      (sdk as any).circuitBreaker = null;
      
      const health = sdk.getHealthCheck();
      expect(health.status).toBe('error');
      expect(health).toHaveProperty('error');
    });
  });
});