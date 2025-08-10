/**
 * SDK Internal Methods Tests
 * Tests for private methods and internal functionality to improve coverage
 */

import { FeatureFlagsHQSDK } from '../src/index';

// Mock fetch
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FeatureFlagsHQ SDK - Internal Methods Coverage', () => {
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
    
    // Mock console methods
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

  describe('Internal Initialization Process', () => {
    it('should handle initialization with successful flag fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              name: 'init-flag',
              value: 'init-value',
              type: 'string',
              is_active: true
            }
          ]
        })
      } as Response);

      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      // Wait for initialization
      await (sdk as any).waitForInitialization(1000);

      const flags = sdk.getAllFlags();
      expect(flags).toHaveProperty('init-flag');
      expect(flags['init-flag'].value).toBe('init-value');
    });

    it('should handle initialization with failed flag fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network error during init'));

      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      // Wait for initialization (should complete even with error)
      await (sdk as any).waitForInitialization(1000);

      const health = sdk.getHealthCheck();
      expect(health.initialization_complete).toBe(true);
    });

    it('should handle initialization timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [] })
          } as Response), 2000);
        })
      );

      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      // Wait with short timeout
      try {
        await (sdk as any).waitForInitialization(100);
      } catch (error) {
        expect((error as Error).message).toContain('Initialization timeout');
      }
    });

    it('should skip initialization in offline mode', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      await (sdk as any).waitForInitialization(100);

      const health = sdk.getHealthCheck();
      expect(health.initialization_complete).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Polling Worker Functionality', () => {
    it('should start polling worker and fetch flags periodically', async () => {
      let fetchCount = 0;
      mockFetch.mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                name: `poll-flag-${fetchCount}`,
                value: `poll-value-${fetchCount}`,
                type: 'string',
                is_active: true
              }
            ]
          })
        } as Response);
      });

      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        pollingInterval: 100 // Very short for testing
      });

      // Wait for multiple polling cycles
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(fetchCount).toBeGreaterThanOrEqual(2);

      const flags = sdk.getAllFlags();
      expect(Object.keys(flags).length).toBeGreaterThan(0);
    });

    it('should handle polling worker errors gracefully', async () => {
      let pollCount = 0;
      mockFetch.mockImplementation(() => {
        pollCount++;
        if (pollCount % 2 === 0) {
          return Promise.reject(new Error('Polling error'));
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
        pollingInterval: 50
      });

      // Wait for multiple polling attempts
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(pollCount).toBeGreaterThan(2);
      
      // SDK should still be healthy despite errors
      const health = sdk.getHealthCheck();
      expect(health.status).toBeDefined();
    });

    it('should update circuit breaker state based on polling results', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        // Fail first few attempts to trigger circuit breaker
        if (attemptCount <= 3) {
          return Promise.reject(new Error('Service unavailable'));
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
        pollingInterval: 50
      });

      // Wait for enough failures to open circuit breaker
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = sdk.getStats();
      expect(stats.circuit_breaker.failure_count).toBeGreaterThan(0);
    });

    it('should not start polling worker in offline mode', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true,
        pollingInterval: 50
      });

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Log Upload Worker', () => {
    it('should collect and upload logs periodically', async () => {
      let uploadAttempts = 0;
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/logs')) {
          uploadAttempts++;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response);
        }
        // For flag fetching
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [] })
        } as Response);
      });

      sdk = createSDK({
        ...validConfig,
        offlineMode: false,
        enableMetrics: true,
        logUploadInterval: 100
      });

      // Generate some log entries
      await sdk.getString('user-1', 'test-flag', 'default');
      await sdk.getBool('user-2', 'bool-flag', false);

      // Wait for log upload attempts
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(uploadAttempts).toBeGreaterThan(0);
    });

    it('should handle log upload failures', async () => {
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/logs')) {
          return Promise.reject(new Error('Log upload failed'));
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
        enableMetrics: true,
        logUploadInterval: 50
      });

      // Generate log entry
      await sdk.getString('user-1', 'test-flag', 'default');

      // Wait for upload attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle failure gracefully
      const stats = sdk.getStats();
      expect(stats.pending_user_logs).toBeDefined();
    });

    it('should batch multiple logs in single upload', async () => {
      let uploadPayloads: any[] = [];
      mockFetch.mockImplementation((url, options) => {
        if (typeof url === 'string' && url.includes('/logs') && options?.body) {
          const payload = JSON.parse(options.body as string);
          uploadPayloads.push(payload);
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true })
          } as Response);
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
        enableMetrics: true,
        logUploadInterval: 200
      });

      // Generate multiple log entries quickly
      await sdk.getString('user-1', 'flag-1', 'default');
      await sdk.getBool('user-2', 'flag-2', false);
      await sdk.getInt('user-3', 'flag-3', 0);

      // Wait for batch upload
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should have batched logs
      expect(uploadPayloads.length).toBeGreaterThan(0);
      if (uploadPayloads.length > 0) {
        const payload = uploadPayloads[0];
        expect(payload.logs).toBeInstanceOf(Array);
        expect(payload.logs.length).toBeGreaterThan(1);
      }
    });

    it('should not upload logs when metrics disabled', async () => {
      let uploadAttempts = 0;
      mockFetch.mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/logs')) {
          uploadAttempts++;
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
        enableMetrics: false,
        logUploadInterval: 50
      });

      await sdk.getString('user-1', 'test-flag', 'default');
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(uploadAttempts).toBe(0);
    });
  });

  describe('Hash Generation and Crypto Operations', () => {
    it('should generate consistent hashes for same input', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const hash1 = await (sdk as any).createHash('test-data');
      const hash2 = await (sdk as any).createHash('test-data');
      const hash3 = await (sdk as any).createHash('different-data');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different inputs', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const testInputs = ['input1', 'input2', 'input3', ''];
      const hashes = [];

      for (const input of testInputs) {
        const hash = await (sdk as any).createHash(input);
        hashes.push(hash);
      }

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(testInputs.length);
    });

    it('should handle crypto operations with different algorithms', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      } as Response);

      // This should trigger signature generation which uses crypto
      await sdk.refreshFlags();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Signature': expect.any(String)
          })
        })
      );
    });
  });

  describe('UUID Generation', () => {
    it('should generate valid UUID format', () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const uuid = (sdk as any).generateUuid();
      
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36);
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs', () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const uuids = [];
      for (let i = 0; i < 10; i++) {
        uuids.push((sdk as any).generateUuid());
      }

      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(10);
    });
  });

  describe('Session Metadata Generation', () => {
    it('should generate consistent session metadata', () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const metadata1 = (sdk as any).getSessionMetadata();
      const metadata2 = (sdk as any).getSessionMetadata();

      expect(metadata1).toBeDefined();
      expect(metadata1.session_id).toBe(metadata2.session_id);
      expect(metadata1.sdk_version).toBeDefined();
      expect(metadata1.environment).toBe('test');
      expect(metadata1.system_info).toBeDefined();
    });

    it('should include proper system information', () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const metadata = (sdk as any).getSessionMetadata();
      const systemInfo = metadata.system_info;

      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('hostname');
      expect(systemInfo).toHaveProperty('process_id');

      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.hostname).toBe('string');
      expect(typeof systemInfo.process_id).toBe('number');
    });
  });

  describe('Flag Evaluation Context', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should create detailed evaluation context for successful matches', async () => {
      const testFlag = {
        name: 'context-test-flag',
        value: 'context-value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'country',
            value: 'US',
            type: 'string',
            comparator: '=='
          }
        ],
        rollout: { percentage: 100 }
      };

      (sdk as any).flags.set('context-test-flag', testFlag);

      const [, context] = await (sdk as any).evaluateFlag(
        testFlag,
        'user-123',
        { country: 'US' }
      );
      expect(context.flag_found).toBe(true);
      expect(context.flag_active).toBe(true);
      expect(context.default_value_used).toBe(false);
      expect(context.segments_matched).toContain('country');
      expect(context.segments_evaluated).toContain('country');
      expect(context.rollout_qualified).toBe(true);
      expect(context.reason).toBe('flag_active_and_matched');
      expect(typeof context.total_sdk_time_ms).toBe('number');
    });

    it('should create evaluation context for failed segment matches', async () => {
      const testFlag = {
        name: 'context-fail-flag',
        value: 'context-value',
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

      (sdk as any).flags.set('context-fail-flag', testFlag);

      const [, context] = await (sdk as any).evaluateFlag(
        testFlag,
        'user-123',
        { country: 'CA' } // Different country
      );

      expect(context.flag_found).toBe(true);
      expect(context.flag_active).toBe(true);
      expect(context.default_value_used).toBe(true);
      expect(context.segments_matched).toHaveLength(0);
      expect(context.segments_evaluated).toContain('country');
      expect(context.reason).toBe('segments_not_matched');
    });

    it('should handle evaluation context for inactive flags', async () => {
      const inactiveFlag = {
        name: 'inactive-context-flag',
        value: 'inactive-value',
        type: 'string',
        is_active: false
      };

      (sdk as any).flags.set('inactive-context-flag', inactiveFlag);

      const [, context] = await (sdk as any).evaluateFlag(
        inactiveFlag,
        'user-123',
        {}
      );

      expect(context.flag_found).toBe(true);
      expect(context.flag_active).toBe(false);
      expect(context.default_value_used).toBe(true);
      expect(context.reason).toBe('flag_inactive');
    });
  });

  describe('Value Type Conversion Edge Cases', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });
    });

    it('should handle all supported value types in convertValue', () => {
      const testCases = [
        { value: 'string-test', type: 'string', expected: 'string-test' },
        { value: 'true', type: 'bool', expected: true },
        { value: 'false', type: 'bool', expected: false },
        { value: '123', type: 'int', expected: 123 },
        { value: '45.67', type: 'float', expected: 45.67 },
        { value: '{"key": "value"}', type: 'json', expected: { key: 'value' } },
        { value: 'invalid', type: 'unknown' as any, expected: 'invalid' }
      ];

      for (const testCase of testCases) {
        const result = (sdk as any).convertValue(testCase.value, testCase.type);
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should provide correct default values for each type', () => {
      const typeDefaults = [
        { type: 'string', expected: '' },
        { type: 'bool', expected: false },
        { type: 'int', expected: 0 },
        { type: 'float', expected: 0.0 },
        { type: 'json', expected: {} },
        { type: 'unknown' as any, expected: null }
      ];

      for (const { type, expected } of typeDefaults) {
        const result = (sdk as any).getDefaultValue(type);
        expect(result).toEqual(expected);
      }
    });
  });

  describe('System Information Collection', () => {
    it('should collect comprehensive system information', () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true
      });

      const systemInfo = (sdk as any).systemInfo;

      // Should have basic info
      expect(systemInfo.platform).toBeDefined();
      expect(systemInfo.hostname).toBeDefined();
      expect(systemInfo.process_id).toBeDefined();
      expect(systemInfo.node_version).toBeDefined();

      // Should be correct types
      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.hostname).toBe('string');
      expect(typeof systemInfo.process_id).toBe('number');
      expect(typeof systemInfo.node_version).toBe('string');

      // Optional fields may be present
      if (systemInfo.cpu_count !== undefined) {
        expect(typeof systemInfo.cpu_count).toBe('number');
        expect(systemInfo.cpu_count).toBeGreaterThan(0);
      }

      if (systemInfo.memory_total !== undefined) {
        expect(typeof systemInfo.memory_total).toBe('number');
        expect(systemInfo.memory_total).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Context and Logging', () => {
    it('should create proper log entries with all required fields', async () => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: true,
        enableMetrics: true
      });

      const testFlag = {
        name: 'log-test-flag',
        value: 'log-value',
        type: 'string',
        is_active: true
      };

      (sdk as any).flags.set('log-test-flag', testFlag);

      await sdk.getString('test-user', 'log-test-flag', 'default');

      const logs = (sdk as any).logs;
      expect(logs.length).toBeGreaterThan(0);

      const logEntry = logs[0];
      expect(logEntry).toHaveProperty('user_id');
      expect(logEntry).toHaveProperty('flag_name');
      expect(logEntry).toHaveProperty('flag_value');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('session_id');
      expect(logEntry).toHaveProperty('evaluation_time_ms');
      expect(logEntry).toHaveProperty('evaluation_context');
      expect(logEntry).toHaveProperty('metadata');

      expect(logEntry.user_id).toBe('test-user');
      expect(logEntry.flag_name).toBe('log-test-flag');
      expect(logEntry.flag_value).toBe('log-value');
      expect(typeof logEntry.evaluation_time_ms).toBe('number');
    });
  });
});