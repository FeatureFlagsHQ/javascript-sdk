# FeatureFlagsHQ SDK for JavaScript/TypeScript

[![npm version](https://badge.fury.io/js/%40featureflagshq%2Fsdk.svg)](https://badge.fury.io/js/%40featureflagshq%2Fsdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

Official FeatureFlagsHQ SDK for JavaScript/TypeScript with advanced security features, real-time updates, and comprehensive analytics.

## Features

- 🚀 **High Performance**: Optimized for speed with local caching and minimal latency
- 🔒 **Enterprise Security**: HMAC authentication, input validation, and rate limiting
- 🌐 **Universal**: Works in Node.js and browser environments
- 📊 **Advanced Analytics**: Comprehensive usage statistics and health monitoring
- 🔄 **Real-time Updates**: Live flag updates with change callbacks
- 🛡️ **Circuit Breaker**: Automatic failover protection for high availability
- 📱 **Offline Support**: Graceful degradation when network is unavailable
- 🎯 **Segment Targeting**: Advanced user segmentation and rollout controls
- 📝 **Full TypeScript**: Complete type safety and IntelliSense support

## Installation

```bash
npm install @featureflagshq/sdk
```

For Node.js environments, you may also need:
```bash
npm install node-fetch  # For Node.js < 18
```

## Quick Start

### Basic Usage

```typescript
import { FeatureFlagsHQSDK } from '@featureflagshq/sdk';

// Initialize the SDK
const sdk = new FeatureFlagsHQSDK({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  environment: 'production'
});

// Wait for initialization
sdk.on('ready', async () => {
  // Get a feature flag value
  const isNewFeatureEnabled = await sdk.getBool('user-123', 'new-feature-flag');
  
  if (isNewFeatureEnabled) {
    // Show new feature
    console.log('New feature is enabled!');
  }
});
```

### Environment Variables

You can also configure the SDK using environment variables:

```bash
export FEATUREFLAGSHQ_CLIENT_ID="your-client-id"
export FEATUREFLAGSHQ_CLIENT_SECRET="your-client-secret"
export FEATUREFLAGSHQ_ENVIRONMENT="production"
```

```typescript
// SDK will automatically use environment variables
const sdk = new FeatureFlagsHQSDK();
```

## Configuration Options

```typescript
const sdk = new FeatureFlagsHQSDK({
  clientId: 'your-client-id',                    // Required: Your client ID
  clientSecret: 'your-client-secret',            // Required: Your client secret
  environment: 'production',                     // Environment name (default: 'production')
  apiBaseUrl: 'https://api.featureflagshq.com', // API base URL
  timeout: 30000,                                // Request timeout in ms (default: 30000)
  maxRetries: 3,                                 // Max retry attempts (default: 3)
  offlineMode: false,                            // Enable offline mode (default: false)
  enableMetrics: true,                           // Enable usage analytics (default: true)
  onFlagChange: (flagName, oldValue, newValue) => {
    console.log(`Flag ${flagName} changed from ${oldValue} to ${newValue}`);
  }
});
```

## API Reference

### Flag Evaluation Methods

#### `get(userId, flagName, defaultValue?, segments?)`
Get a flag value with automatic type detection.

```typescript
const value = await sdk.get('user-123', 'my-flag', 'default-value');
```

#### `getBool(userId, flagName, defaultValue?, segments?)`
Get a boolean flag value.

```typescript
const enabled = await sdk.getBool('user-123', 'feature-enabled', false);
```

#### `getString(userId, flagName, defaultValue?, segments?)`
Get a string flag value.

```typescript
const message = await sdk.getString('user-123', 'welcome-message', 'Hello!');
```

#### `getInt(userId, flagName, defaultValue?, segments?)`
Get an integer flag value.

```typescript
const timeout = await sdk.getInt('user-123', 'api-timeout', 5000);
```

#### `getFloat(userId, flagName, defaultValue?, segments?)`
Get a float flag value.

```typescript
const rate = await sdk.getFloat('user-123', 'conversion-rate', 0.1);
```

#### `getJson(userId, flagName, defaultValue?, segments?)`
Get a JSON flag value.

```typescript
const config = await sdk.getJson('user-123', 'app-config', {});
```

### Segment Targeting

Use segments to target specific user groups:

```typescript
const segments = {
  age: 25,
  country: 'US',
  plan: 'premium',
  beta_user: true
};

const isEnabled = await sdk.getBool('user-123', 'premium-feature', false, segments);
```

### Bulk Operations

#### `getUserFlags(userId, segments?, flagKeys?)`
Get multiple flags for a user at once.

```typescript
// Get all flags for a user
const allFlags = await sdk.getUserFlags('user-123');

// Get specific flags only
const specificFlags = await sdk.getUserFlags('user-123', {}, ['feature-a', 'feature-b']);

// Get flags with segments
const flagsWithSegments = await sdk.getUserFlags('user-123', { plan: 'premium' });
```

#### `getAllFlags()`
Get all cached flag configurations.

```typescript
const flagConfigs = sdk.getAllFlags();
```

### Management Methods

#### `refreshFlags()`
Manually refresh flags from the server.

```typescript
const success = await sdk.refreshFlags();
```

#### `flushLogs()`
Manually upload pending analytics logs.

```typescript
const success = await sdk.flushLogs();
```

### Monitoring and Health

#### `getStats()`
Get comprehensive SDK usage statistics.

```typescript
const stats = sdk.getStats();
console.log(`Total accesses: ${stats.total_user_accesses}`);
console.log(`Unique users: ${stats.unique_users_count}`);
console.log(`Cache hit rate: ${stats.api_calls.successful / stats.api_calls.total}`);
```

#### `getHealthCheck()`
Get SDK health status.

```typescript
const health = sdk.getHealthCheck();
console.log(`Status: ${health.status}`);
console.log(`Last sync: ${health.last_sync}`);
```

### Event Handling

The SDK extends EventEmitter and emits several events:

```typescript
sdk.on('ready', () => {
  console.log('SDK is ready to use');
});

sdk.on('error', (error) => {
  console.error('SDK error:', error);
});

sdk.on('shutdown', () => {
  console.log('SDK has been shut down');
});
```

### Cleanup

Always shutdown the SDK when your application exits:

```typescript
// Graceful shutdown
sdk.shutdown();

// Or use try-with-resources pattern
const sdk = new FeatureFlagsHQSDK(config);
try {
  // Use SDK
} finally {
  sdk.shutdown();
}
```

## Advanced Usage

### Production Configuration

Use the production helper for secure deployments:

```typescript
import { createProductionClient } from '@featureflagshq/sdk';

const sdk = createProductionClient(
  'your-client-id',
  'your-client-secret',
  'production',
  {
    timeout: 30000,
    enableMetrics: true
  }
);
```

### Offline Mode

For applications that need to work without network connectivity:

```typescript
const sdk = new FeatureFlagsHQSDK({
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  offlineMode: true  // Disables network calls
});
```

### Rate Limiting

The SDK includes built-in rate limiting (1000 requests per minute per user) to protect your infrastructure.

### Circuit Breaker

Automatic circuit breaker protection prevents cascading failures:
- Opens after 5 consecutive failures
- Enters half-open state after 60 seconds
- Automatically closes on successful requests

## Error Handling

The SDK handles errors gracefully and provides detailed error information:

```typescript
try {
  const value = await sdk.getBool('user-123', 'my-flag');
} catch (error) {
  console.error('Flag evaluation failed:', error.message);
  // SDK will return default value on errors
}
```

## Browser Support

The SDK works in all modern browsers and includes polyfills for:
- Fetch API
- Crypto (Web Crypto API)
- EventEmitter

## Node.js Support

- Node.js 14.0.0 or higher
- Optional: `node-fetch` for Node.js < 18

## TypeScript Support

The SDK is written in TypeScript and includes comprehensive type definitions:

```typescript
import { FeatureFlagsHQSDK, SDKConfig, FlagData } from '@featureflagshq/sdk';

const config: SDKConfig = {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
};

const sdk = new FeatureFlagsHQSDK(config);
```

## Security Features

- **HMAC Authentication**: All API requests are signed with HMAC-SHA256
- **Input Validation**: Comprehensive validation prevents injection attacks
- **Rate Limiting**: Per-user rate limiting prevents abuse
- **Secure Logging**: Sensitive data is automatically redacted from logs
- **Content Security**: Protection against XSS and injection attacks

## Performance

- **Local Caching**: Flags are cached locally for zero-latency access
- **Background Updates**: Flags are updated every 5 minutes in the background
- **Efficient Networking**: Minimal network usage with intelligent retry logic
- **Memory Management**: Automatic cleanup prevents memory leaks

## Analytics and Monitoring

The SDK automatically collects analytics (can be disabled):

- Flag usage statistics
- User access patterns
- Performance metrics
- Error rates and types
- Circuit breaker status

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@featureflagshq.com
- 📖 Documentation: https://docs.featureflagshq.com
- 🐛 Issues: https://github.com/featureflagshq/sdk-node/issues
- 💬 Community: https://community.featureflagshq.com

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.