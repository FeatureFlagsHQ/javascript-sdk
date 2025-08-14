/**
 * FeatureFlagsHQ SDK Final Coverage Tests
 * Targeted tests for specific remaining uncovered lines
 */

import { FeatureFlagsHQSDK, validateProductionConfig, createProductionClient } from '../src/index';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FeatureFlagsHQ SDK - Final Coverage Push', () => {
  let sdk: FeatureFlagsHQSDK;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    if (sdk) {
      sdk.shutdown();
    }
  });

  describe('String Validation Edge Cases', () => {
    it('should handle dangerous characters in string validation', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'test\nclient\rid',
          clientSecret: 'test-client-secret-very-long-and-secure',
          offlineMode: true
        });
      }).toThrow('contains invalid characters');
    });

    it('should handle SQL patterns in string validation', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'test--client',
          clientSecret: 'test-client-secret-very-long-and-secure',
          offlineMode: true
        });
      }).toThrow('contains potentially dangerous content');
    });

    it('should handle too long strings', () => {
      const longString = 'a'.repeat(300);
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: longString,
          clientSecret: 'test-client-secret-very-long-and-secure',
          offlineMode: true
        });
      }).toThrow('too long');
    });

    it('should handle non-string types', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 123 as any,
          clientSecret: 'test-client-secret-very-long-and-secure',
          offlineMode: true
        });
      }).toThrow('must be a string');
    });

    it('should handle empty strings', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: '   ',
          clientSecret: 'test-client-secret-very-long-and-secure',
          offlineMode: true
        });
      }).toThrow('cannot be empty');
    });
  });

  describe('URL Validation Edge Cases', () => {
    it('should handle null URL', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret-very-long-and-secure',
          apiBaseUrl: null as any,
          offlineMode: true
        });
      }).toThrow('API base URL must be a non-empty string');
    });

    it('should handle invalid URL scheme', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret-very-long-and-secure',
          apiBaseUrl: 'ftp://invalid.com',
          offlineMode: true
        });
      }).toThrow();
    });

    it('should handle malformed URL', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret-very-long-and-secure',
          apiBaseUrl: 'not-a-url',
          offlineMode: true
        });
      }).toThrow('Invalid URL format');
    });
  });

  describe('Rate Limiting Coverage', () => {
    it('should create new rate limit entry when none exists', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: false
      });

      sdk['rateLimits'].clear();
      const result = sdk['rateLimitCheck']('new-user');
      expect(result).toBe(true);
      expect(sdk['rateLimits'].get('new-user')?.[0]).toBe(1);
    });
  });

  describe('Circuit Breaker Coverage', () => {
    it('should transition circuit breaker from half-open to closed', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: false
      });

      sdk['circuitBreaker'].state = 'half-open';
      sdk['recordApiSuccess']();
      expect(sdk['circuitBreaker'].state).toBe('closed');
    });
  });

  describe('Cleanup Stats Coverage', () => {
    it('should clean up unique users when limit exceeded', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      // Add users beyond limit
      for (let i = 0; i < 10005; i++) {
        sdk['stats'].unique_users.add(`user-${i}`);
      }

      sdk['cleanupOldStats']();
      expect(sdk['stats'].unique_users.size).toBeLessThanOrEqual(10000);
    });

    it('should clean up unique flags when limit exceeded', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      // Add flags beyond limit
      for (let i = 0; i < 1005; i++) {
        sdk['stats'].unique_flags_accessed.add(`flag-${i}`);
      }

      sdk['cleanupOldStats']();
      expect(sdk['stats'].unique_flags_accessed.size).toBeLessThanOrEqual(1000);
    });
  });

  describe('Segment Matching Error Handling', () => {
    it('should handle segment matching errors gracefully', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = sdk['checkSegmentMatch']({
        name: 'test-segment',
        value: null,
        type: 'int',
        comparator: '>'
      }, { 'test-segment': 'invalid' });

      expect(result).toBe(false);
    });
  });

  describe('Type Conversion Error Handling', () => {
    it('should handle conversion errors in convertValue', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = sdk['convertValue'](undefined, 'unknown-type');
      expect(result).toBeDefined();
    });

    it('should handle unknown types in getDefaultValue', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = sdk['getDefaultValue']('unknown-type');
      expect(result).toBeNull();
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle null userId validation', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = await sdk.get(null as any, 'test-flag', 'default');
      expect(result).toBe('default');
    });

    it('should handle null flagName validation', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = await sdk.get('test-user', null as any, 'default');
      expect(result).toBe('default');
    });
  });

  describe('getUserFlags Error Handling', () => {
    it('should handle invalid userId in getUserFlags', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = await sdk.getUserFlags('', {}, ['test-flag']);
      expect(result).toEqual({});
    });

    it('should filter invalid flag names in getUserFlags', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      sdk['flags'].set('valid-flag', {
        name: 'valid-flag',
        value: 'test',
        type: 'string',
        is_active: true
      });

      const result = await sdk.getUserFlags('test-user', {}, ['valid-flag', '', 'invalid@flag']);
      expect(result).toHaveProperty('valid-flag');
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe('Offline Mode Error Handling', () => {
    it('should handle refreshFlags in offline mode', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle flushLogs in offline mode', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true,
        enableMetrics: true
      });

      const result = await sdk.flushLogs();
      expect(result).toBe(false);
    });

    it('should handle flushLogs with metrics disabled', async () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: false,
        enableMetrics: false
      });

      const result = await sdk.flushLogs();
      expect(result).toBe(false);
    });
  });

  describe('Production Utilities Coverage', () => {
    it('should validate production config thoroughly', () => {
      const warnings1 = validateProductionConfig({
        apiBaseUrl: 'http://insecure.com',
        timeout: 3000,
        clientSecret: 'short'
      });

      expect(warnings1).toContain('Using HTTP instead of HTTPS - security risk');
      expect(warnings1).toContain('Timeout too low - may cause instability');
      expect(warnings1).toContain('Client secret appears to be weak');

      const warnings2 = validateProductionConfig({});
      expect(warnings2).toContain('Missing client secret');
    });

    it('should create production client with configuration warnings', () => {
      const client = createProductionClient(
        'test-client',
        'short-secret',
        'production',
        {
          apiBaseUrl: 'http://insecure.com',
          timeout: 3000
        }
      );

      expect(client).toBeInstanceOf(FeatureFlagsHQSDK);
      client.shutdown();
    });
  });

  describe('Error Statistics Coverage', () => {
    it('should handle stats error gracefully', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      // Mock stats to throw error
      const originalStats = sdk['stats'];
      Object.defineProperty(sdk, 'stats', {
        get: () => { throw new Error('Stats error'); },
        configurable: true
      });

      const stats = sdk.getStats();
      expect((stats as any).error).toBeDefined();

      // Restore
      Object.defineProperty(sdk, 'stats', {
        get: () => originalStats,
        configurable: true
      });
    });

    it('should handle health check error gracefully', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true
      });

      // Mock systemInfo to throw error
      const originalSystemInfo = sdk['systemInfo'];
      Object.defineProperty(sdk, 'systemInfo', {
        get: () => { throw new Error('System info error'); },
        configurable: true
      });

      const healthCheck = sdk.getHealthCheck();
      expect(healthCheck.status).toBe('error');
      expect(healthCheck.error).toBeDefined();

      // Restore
      Object.defineProperty(sdk, 'systemInfo', {
        get: () => originalSystemInfo,
        configurable: true
      });
    });
  });

  describe('Memory Management Coverage', () => {
    it('should prevent memory bloat in logs queue', () => {
      sdk = new FeatureFlagsHQSDK({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret-very-long-and-secure',
        environment: 'test',
        offlineMode: true,
        enableMetrics: true
      });

      // Fill queue to exactly 1000 (the limit)
      for (let i = 0; i < 1000; i++) {
        sdk['logsQueue'].push({
          user_id: `user-${i}`,
          flag_name: 'test-flag',
          flag_value: 'test',
          timestamp: new Date().toISOString(),
          session_id: sdk['sessionId'],
          evaluation_time_ms: 1,
          evaluation_context: {
            flag_active: true,
            flag_found: true,
            default_value_used: false,
            segments_matched: [],
            segments_evaluated: [],
            rollout_qualified: true,
            reason: 'test'
          },
          metadata: {
            sdk_version: '1.0.0',
            environment: 'test'
          }
        });
      }

      // This should not exceed the limit
      sdk['logAccess']('test-user', 'test-flag', 'test', {
        flag_active: true,
        flag_found: true,
        default_value_used: false,
        segments_matched: [],
        segments_evaluated: [],
        rollout_qualified: true,
        reason: 'test'
      }, 1);

      expect(sdk['logsQueue'].length).toBeLessThanOrEqual(1000);
    });
  });
});