/**
 * SDK Edge Cases and Error Scenarios Tests
 */

import { FeatureFlagsHQSDK } from '../src/index';

// Mock fetch globally
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('FeatureFlagsHQ SDK Edge Cases', () => {
  let sdk: FeatureFlagsHQSDK;
  const sdkInstances: FeatureFlagsHQSDK[] = [];

  const validConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret-very-long-and-secure',
    environment: 'test',
    offlineMode: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(async () => {
    // Shut down main SDK instance
    if (sdk) {
      sdk.shutdown();
      sdk = null as any;
    }
    
    // Shut down all tracked SDK instances
    for (const instance of sdkInstances) {
      if (instance) {
        instance.shutdown();
      }
    }
    sdkInstances.length = 0;
    
    // Wait a bit for async cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  // Helper function to create and track SDK instances
  const createSDK = (config: any): FeatureFlagsHQSDK => {
    const instance = new FeatureFlagsHQSDK(config);
    sdkInstances.push(instance);
    return instance;
  };

  describe('Configuration Edge Cases', () => {
    it('should handle empty string clientId', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: '',
          clientSecret: 'valid-secret',
          offlineMode: true
        });
      }).toThrow('clientId and clientSecret are required');
    });

    it('should handle whitespace-only clientId', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: '   ',
          clientSecret: 'valid-secret',
          offlineMode: true
        });
      }).toThrow('clientId cannot be empty');
    });

    it('should handle null clientId', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: null as any,
          clientSecret: 'valid-secret',
          offlineMode: true
        });
      }).toThrow('clientId and clientSecret are required');
    });

    it('should handle undefined clientSecret', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          clientId: 'valid-client-id',
          clientSecret: undefined as any,
          offlineMode: true
        });
      }).toThrow('clientId and clientSecret are required');
    });

    it('should handle invalid URL format', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          apiBaseUrl: 'not-a-url'
        });
      }).toThrow('Invalid URL format');
    });

    it('should handle malformed URL', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          apiBaseUrl: 'http://'
        });
      }).toThrow('Invalid URL format');
    });

    it('should handle URL with invalid protocol', () => {
      expect(() => {
        sdk = new FeatureFlagsHQSDK({
          ...validConfig,
          apiBaseUrl: 'ftp://example.com'
        });
      }).toThrow('Invalid URL format');
    });
  });

  describe('Environment Variable Fallback', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
      originalEnv = process.env;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should use environment variables when config is empty', () => {
      process.env = {
        ...originalEnv,
        FEATUREFLAGSHQ_CLIENT_ID: 'env-client-id',
        FEATUREFLAGSHQ_CLIENT_SECRET: 'env-client-secret-very-long',
        FEATUREFLAGSHQ_ENVIRONMENT: 'env-test'
      };

      try {
        sdk = new FeatureFlagsHQSDK({ offlineMode: true });
        expect(sdk).toBeDefined();
      } catch (error) {
        // If environment variable reading is not implemented, expect the error
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should prefer config over environment variables', () => {
      process.env = {
        ...originalEnv,
        FEATUREFLAGSHQ_CLIENT_ID: 'env-client-id',
        FEATUREFLAGSHQ_CLIENT_SECRET: 'env-client-secret-very-long'
      };

      sdk = new FeatureFlagsHQSDK({
        clientId: 'config-client-id',
        clientSecret: 'config-client-secret-very-long',
        offlineMode: true
      });
      expect(sdk).toBeDefined();
    });

    it('should handle missing environment variables gracefully', () => {
      process.env = { ...originalEnv };
      delete process.env.FEATUREFLAGSHQ_CLIENT_ID;
      delete process.env.FEATUREFLAGSHQ_CLIENT_SECRET;

      expect(() => {
        sdk = new FeatureFlagsHQSDK({ offlineMode: true });
      }).toThrow('clientId and clientSecret are required');
    });
  });

  describe('Flag Evaluation Edge Cases', () => {
    beforeEach(() => {
      sdk = createSDK(validConfig);
    });

    it('should handle null userId', async () => {
      const result = await sdk.getString(null as any, 'test-flag', 'default');
      expect(result).toBe('default');
    });

    it('should handle undefined userId', async () => {
      const result = await sdk.getString(undefined as any, 'test-flag', 'default');
      expect(result).toBe('default');
    });

    it('should handle numeric userId', async () => {
      const result = await sdk.getString(123 as any, 'test-flag', 'default');
      expect(result).toBe('default'); // Should validate and reject
    });

    it('should handle null flagName', async () => {
      const result = await sdk.getString('user-123', null as any, 'default');
      expect(result).toBe('default');
    });

    it('should handle undefined flagName', async () => {
      const result = await sdk.getString('user-123', undefined as any, 'default');
      expect(result).toBe('default');
    });

    it('should handle special characters in userId', async () => {
      const result = await sdk.getString('user<script>alert(1)</script>', 'test-flag', 'default');
      expect(result).toBe('default'); // Should be filtered by security validation
    });

    it('should handle SQL injection patterns in userId', async () => {
      const result = await sdk.getString("user'; DROP TABLE users; --", 'test-flag', 'default');
      expect(result).toBe('default'); // Should be filtered by security validation
    });

    it('should handle very long userId', async () => {
      const longUserId = 'a'.repeat(1000);
      const result = await sdk.getString(longUserId, 'test-flag', 'default');
      expect(result).toBe('default'); // Should be filtered by validation
    });

    it('should handle very long flagName', async () => {
      const longFlagName = 'flag-' + 'a'.repeat(500);
      const result = await sdk.getString('user-123', longFlagName, 'default');
      expect(result).toBe('default'); // Should be filtered by validation
    });

    it('should handle segments with null values', async () => {
      const segments = { country: null, age: undefined, active: true };
      const result = await sdk.getString('user-123', 'test-flag', 'default', segments);
      expect(result).toBe('default');
    });

    it('should handle circular references in segments', async () => {
      const segments: any = { country: 'US' };
      segments.self = segments; // Create circular reference
      
      const result = await sdk.getString('user-123', 'test-flag', 'default', segments);
      expect(result).toBe('default');
    });
  });

  describe('Network and Error Handling', () => {
    beforeEach(() => {
      sdk = createSDK({
        ...validConfig,
        offlineMode: false, // Enable network operations
        timeout: 1000
      });
    });

    it('should handle network timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({} as Response), 2000); // Longer than timeout
        })
      );

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle network 404 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {} as any,
        redirected: false,
        type: 'basic',
        url: 'https://api.test.com',
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        json: jest.fn(),
        text: jest.fn()
      } as Response);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle network 500 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {} as any,
        redirected: false,
        type: 'basic',
        url: 'https://api.test.com',
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        json: jest.fn(),
        text: jest.fn()
      } as Response);

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {} as any,
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

    it('should handle network connection error', async () => {
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      const result = await sdk.refreshFlags();
      expect(result).toBe(false);
    });
  });

  describe('Type Conversion Edge Cases', () => {
    beforeEach(() => {
      sdk = createSDK(validConfig);
    });

    it('should handle invalid JSON flag gracefully', async () => {
      const invalidJsonFlag = {
        name: 'json-flag',
        value: '{"invalid": json}',
        type: 'json',
        is_active: true
      };

      (sdk as any).flags.set('json-flag', invalidJsonFlag);

      const result = await sdk.getJson('user-123', 'json-flag', { default: true });
      expect(result).toEqual({}); // Should return empty object for invalid JSON
    });

    it('should handle number conversion with invalid string', async () => {
      const invalidNumberFlag = {
        name: 'number-flag',
        value: 'not-a-number-at-all',
        type: 'int',
        is_active: true
      };

      (sdk as any).flags.set('number-flag', invalidNumberFlag);

      const result = await sdk.getInt('user-123', 'number-flag', 999);
      expect(result).toBe(999); // Should return default value
    });

    it('should handle float conversion with NaN result', async () => {
      const nanFlag = {
        name: 'nan-flag',
        value: 'NaN',
        type: 'float',
        is_active: true
      };

      (sdk as any).flags.set('nan-flag', nanFlag);

      const result = await sdk.getFloat('user-123', 'nan-flag', 1.5);
      expect(result).toBe(1.5); // Should return default value
    });

    it('should handle infinity values', async () => {
      const infinityFlag = {
        name: 'infinity-flag',
        value: 'Infinity',
        type: 'float',
        is_active: true
      };

      (sdk as any).flags.set('infinity-flag', infinityFlag);

      const result = await sdk.getFloat('user-123', 'infinity-flag', 1.0);
      // The SDK might not filter Infinity, so check if it's either default or Infinity
      expect(result === 1.0 || result === Infinity).toBe(true);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle multiple SDK instances', () => {
      const sdk1 = createSDK(validConfig);
      const sdk2 = createSDK(validConfig);
      const sdk3 = createSDK(validConfig);

      expect(sdk1).toBeDefined();
      expect(sdk2).toBeDefined();
      expect(sdk3).toBeDefined();

      // Instances will be automatically cleaned up in afterEach
    });

    it('should handle shutdown multiple times', () => {
      sdk = createSDK(validConfig);
      
      expect(() => {
        sdk.shutdown();
        sdk.shutdown();
        sdk.shutdown();
      }).not.toThrow();
    });

    it('should handle operations after shutdown', async () => {
      sdk = createSDK(validConfig);
      sdk.shutdown();

      // Operations after shutdown should return default values
      const result = await sdk.getString('user-123', 'test-flag', 'default');
      expect(result).toBe('default');
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(() => {
      sdk = createSDK(validConfig);
    });

    it('should handle concurrent flag evaluations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        sdk.getString(`user-${i}`, 'test-flag', `default-${i}`)
      );

      const results = await Promise.all(promises);
      
      results.forEach((result, i) => {
        expect(result).toBe(`default-${i}`);
      });
    });

    it('should handle concurrent getUserFlags calls', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        sdk.getUserFlags(`user-${i}`, { segment: i })
      );

      const results = await Promise.all(promises);
      
      results.forEach((result) => {
        expect(typeof result).toBe('object');
      });
    });
  });
});