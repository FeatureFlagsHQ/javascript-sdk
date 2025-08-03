/**
 * FeatureFlagsHQ SDK Tests
 */

import { FeatureFlagsHQSDK, validateProductionConfig, createProductionClient } from '../src/index';

// Mock fetch
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FeatureFlagsHQ SDK', () => {
  let sdk: FeatureFlagsHQSDK;

  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret-very-long-and-secure',
    environment: 'test',
    offlineMode: true, // Use offline mode for tests to avoid network calls
  };

  const mockFlagResponse = {
    data: [
      {
        name: 'test-flag',
        value: 'test-value',
        type: 'string',
        is_active: true,
        rollout: { percentage: 100 }
      },
      {
        name: 'bool-flag',
        value: true,
        type: 'bool',
        is_active: true,
        rollout: { percentage: 100 }
      },
      {
        name: 'int-flag',
        value: 42,
        type: 'int',
        is_active: true,
        rollout: { percentage: 50 }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    if (sdk) {
      sdk.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid config', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK(mockConfig);
      }).not.toThrow();
    });

    it('should throw error with missing credentials', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({});
      }).toThrow('clientId and clientSecret are required');
    });

    it('should read credentials from environment variables', () => {
      process.env.FEATUREFLAGSHQ_CLIENT_ID = 'env-client-id';
      process.env.FEATUREFLAGSHQ_CLIENT_SECRET = 'env-client-secret-very-long';
      
      expect(() => {
        sdk = new FeatureFlagsHQSDK({ offlineMode: true });
      }).not.toThrow();

      delete process.env.FEATUREFLAGSHQ_CLIENT_ID;
      delete process.env.FEATUREFLAGSHQ_CLIENT_SECRET;
    });

    it('should validate URL format', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...mockConfig,
          apiBaseUrl: 'invalid-url'
        });
      }).toThrow('Invalid URL format');
    });

    it('should validate string inputs', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...mockConfig,
          clientId: ''
        });
      }).toThrow('clientId cannot be empty');
    });
  });

  describe('Flag Evaluation', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
      // Manually set flags for testing
      (sdk as any).flags.set('test-flag', mockFlagResponse.data[0]);
      (sdk as any).flags.set('bool-flag', mockFlagResponse.data[1]);
      (sdk as any).flags.set('int-flag', mockFlagResponse.data[2]);
    });

    it('should get string flag value', async () => {
      const result = await sdk.getString('user-123', 'test-flag');
      expect(result).toBe('test-value');
    });

    it('should get boolean flag value', async () => {
      const result = await sdk.getBool('user-123', 'bool-flag');
      expect(result).toBe(true);
    });

    it('should get integer flag value', async () => {
      const result = await sdk.getInt('user-123', 'int-flag');
      expect(result).toBe(42);
    });

    it('should return default value for non-existent flag', async () => {
      const result = await sdk.getString('user-123', 'non-existent', 'default');
      expect(result).toBe('default');
    });

    it('should validate user ID', async () => {
      const result = await sdk.getString('', 'test-flag', 'default');
      expect(result).toBe('default');
    });

    it('should validate flag name', async () => {
      const result = await sdk.getString('user-123', '', 'default');
      expect(result).toBe('default');
    });

    it('should handle segments correctly', async () => {
      const segments = { age: 25, country: 'US' };
      const result = await sdk.getString('user-123', 'test-flag', 'default', segments);
      expect(result).toBe('test-value');
    });

    it('should respect rollout percentage', async () => {
      // Test with a flag that has 50% rollout
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = await sdk.getInt(`user-${i}`, 'int-flag', 0);
        results.push(result);
      }
      
      // Should have some 0s (default) and some 42s (flag value)
      const defaultValues = results.filter(r => r === 0).length;
      const flagValues = results.filter(r => r === 42).length;
      expect(defaultValues + flagValues).toBe(100);
      expect(defaultValues).toBeGreaterThan(0);
      expect(flagValues).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK({
        ...mockConfig,
        offlineMode: false // Enable rate limiting
      });
    });

    it('should apply rate limiting', async () => {
      const userId = 'rate-limit-user';
      
      // Simulate exceeding rate limit
      for (let i = 0; i < 1005; i++) {
        (sdk as any).rateLimits.set(userId, [1001, Date.now()]);
      }
      
      const result = await sdk.getString(userId, 'test-flag', 'default');
      expect(result).toBe('default');
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK({
        ...mockConfig,
        offlineMode: false
      });
    });

    it('should open circuit breaker after failures', () => {
      const circuitBreaker = (sdk as any).circuitBreaker;
      
      // Simulate failures
      for (let i = 0; i < 5; i++) {
        (sdk as any).recordApiFailure();
      }
      
      expect(circuitBreaker.state).toBe('open');
    });

    it('should transition to half-open after timeout', () => {
      const circuitBreaker = (sdk as any).circuitBreaker;
      
      // Set circuit breaker to open state
      circuitBreaker.state = 'open';
      circuitBreaker.last_failure_time = Date.now() - 61000; // 61 seconds ago
      
      const canProceed = (sdk as any).checkCircuitBreaker();
      expect(canProceed).toBe(true);
      expect(circuitBreaker.state).toBe('half-open');
    });
  });

  describe('Statistics and Health', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
    });

    it('should return statistics', () => {
      const stats = sdk.getStats();
      expect(stats).toHaveProperty('total_user_accesses');
      expect(stats).toHaveProperty('cached_flags_count');
      expect(stats).toHaveProperty('session_id');
    });

    it('should return health check', () => {
      const health = sdk.getHealthCheck();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('sdk_version');
      expect(health).toHaveProperty('initialization_complete');
    });

    it('should track user access statistics', async () => {
      await sdk.getString('user-1', 'test-flag');
      await sdk.getString('user-2', 'test-flag');
      await sdk.getString('user-1', 'bool-flag');
      
      const stats = sdk.getStats();
      expect(stats.total_user_accesses).toBe(3);
      expect(stats.unique_users_count).toBe(2);
      expect(stats.unique_flags_count).toBe(2);
    });
  });

  describe('Multi-flag Operations', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
      (sdk as any).flags.set('test-flag', mockFlagResponse.data[0]);
      (sdk as any).flags.set('bool-flag', mockFlagResponse.data[1]);
      (sdk as any).flags.set('int-flag', mockFlagResponse.data[2]);
    });

    it('should get all flags for user', async () => {
      const userFlags = await sdk.getUserFlags('user-123');
      expect(userFlags).toHaveProperty('test-flag');
      expect(userFlags).toHaveProperty('bool-flag');
      expect(userFlags).toHaveProperty('int-flag');
    });

    it('should get specific flags for user', async () => {
      const userFlags = await sdk.getUserFlags('user-123', {}, ['test-flag', 'bool-flag']);
      expect(userFlags).toHaveProperty('test-flag');
      expect(userFlags).toHaveProperty('bool-flag');
      expect(userFlags).not.toHaveProperty('int-flag');
    });

    it('should get all cached flags', () => {
      const allFlags = sdk.getAllFlags();
      expect(Object.keys(allFlags)).toHaveLength(3);
      expect(allFlags).toHaveProperty('test-flag');
    });
  });

  describe('Manual Operations', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockFlagResponse
      } as Response);
    });

    it('should manually refresh flags in online mode', async () => {
      const onlineSdk = new FeatureFlagsHQSDK({
        ...mockConfig,
        offlineMode: false
      });
      
      const result = await onlineSdk.refreshFlags();
      expect(result).toBe(true);
      
      onlineSdk.shutdown();
    });

    it('should not refresh flags in offline mode', async () => {
      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should manually flush logs', async () => {
      const result = await sdk.flushLogs();
      expect(result).toBe(false); // Offline mode
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in flag evaluation', async () => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
      
      const invalidJsonFlag = {
        name: 'json-flag',
        value: 'invalid-json{',
        type: 'json',
        is_active: true
      };
      
      (sdk as any).flags.set('json-flag', invalidJsonFlag);
      
      const result = await sdk.getJson('user-123', 'json-flag', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should handle segment evaluation errors gracefully', async () => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
      
      const flagWithSegments = {
        name: 'segment-flag',
        value: 'segment-value',
        type: 'string',
        is_active: true,
        segments: [
          {
            name: 'age',
            value: 'invalid-number',
            type: 'int',
            comparator: '>'
          }
        ]
      };
      
      (sdk as any).flags.set('segment-flag', flagWithSegments);
      
      const result = await sdk.getString('user-123', 'segment-flag', 'default', { age: 25 });
      expect(result).toBe('default'); // Should return default due to segment evaluation error
    });
  });

  describe('Type Conversions', () => {
    beforeEach(() => {
      sdk = new FeatureFlagsHQSDK(mockConfig);
    });

    it('should convert string to boolean correctly', async () => {
      const trueFlag = { name: 'true-flag', value: 'true', type: 'bool', is_active: true };
      const falseFlag = { name: 'false-flag', value: 'false', type: 'bool', is_active: true };
      
      (sdk as any).flags.set('true-flag', trueFlag);
      (sdk as any).flags.set('false-flag', falseFlag);
      
      expect(await sdk.getBool('user-123', 'true-flag')).toBe(true);
      expect(await sdk.getBool('user-123', 'false-flag')).toBe(false);
    });

    it('should convert string to number correctly', async () => {
      const intFlag = { name: 'int-flag', value: '123', type: 'int', is_active: true };
      const floatFlag = { name: 'float-flag', value: '123.45', type: 'float', is_active: true };
      
      (sdk as any).flags.set('int-flag', intFlag);
      (sdk as any).flags.set('float-flag', floatFlag);
      
      expect(await sdk.getInt('user-123', 'int-flag')).toBe(123);
      expect(await sdk.getFloat('user-123', 'float-flag')).toBe(123.45);
    });

    it('should handle invalid conversions gracefully', async () => {
      const invalidFlag = { name: 'invalid-flag', value: 'not-a-number', type: 'int', is_active: true };
      (sdk as any).flags.set('invalid-flag', invalidFlag);
      
      expect(await sdk.getInt('user-123', 'invalid-flag', 999)).toBe(999);
    });
  });
});

describe('Utility Functions', () => {
  describe('validateProductionConfig', () => {
    it('should return warnings for insecure configuration', () => {
      const warnings = validateProductionConfig({
        apiBaseUrl: 'http://insecure.com',
        timeout: 1000,
        clientSecret: 'short'
      });
      
      expect(warnings).toContain('Using HTTP instead of HTTPS - security risk');
      expect(warnings).toContain('Timeout too low - may cause instability');
      expect(warnings).toContain('Client secret appears to be weak');
    });

    it('should return no warnings for secure configuration', () => {
      const warnings = validateProductionConfig({
        apiBaseUrl: 'https://secure.com',
        timeout: 30000,
        clientSecret: 'very-long-and-secure-client-secret-here'
      });
      
      expect(warnings).toHaveLength(0);
    });
  });

  describe('createProductionClient', () => {
    it('should create SDK with production configuration', () => {
      const sdk = createProductionClient(
        'prod-client-id',
        'very-long-and-secure-production-secret',
        'production',
        { offlineMode: true }
      );
      
      expect(sdk).toBeInstanceOf(FeatureFlagsHQSDK);
      sdk.shutdown();
    });
  });
});