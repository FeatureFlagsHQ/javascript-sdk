# FeatureFlagsHQ JavaScript SDK

[![npm version](https://badge.fury.io/js/featureflagshq.svg)](https://badge.fury.io/js/featureflagshq)
[![JavaScript Support](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TypeScript Support](https://img.shields.io/badge/TypeScript-4.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A secure, high-performance JavaScript/TypeScript SDK for [FeatureFlagsHQ](https://featureflagshq.com) feature flag management with enterprise-grade security, offline support, and comprehensive analytics. Works in both Node.js and browser environments.

## ✨ Features

- 🔒 **Enterprise Security**: HMAC authentication, input validation, and security filtering
- ⚡ **High Performance**: Background polling, caching, and circuit breaker patterns
- 🌐 **Cross-Platform**: Works seamlessly in Node.js and browser environments
- 📊 **Analytics & Metrics**: Comprehensive usage tracking and statistics
- 🎯 **User Segmentation**: Advanced targeting based on user attributes
- 🔄 **Real-time Updates**: Background flag synchronization with change callbacks
- 🛡️ **Production Ready**: Rate limiting, error handling, and graceful degradation
- 📘 **TypeScript First**: Full TypeScript support with comprehensive type definitions

## 📦 Installation

```bash
npm install @featureflagshq/sdk
```

Or with yarn:
```bash
yarn add @featureflagshq/sdk
```

## 🚀 Quick Start

### TypeScript/ES6+

```typescript
import { FeatureFlagsHQSDK } from '@featureflagshq/sdk';

// Initialize the SDK
const sdk = new FeatureFlagsHQSDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'production' // or "staging", "development"
});

// Wait for SDK to initialize
sdk.on('ready', async () => {
  const userId = 'user_123';
  const isEnabled = await sdk.getBool(userId, 'new_dashboard', false);
  
  if (isEnabled) {
    console.log('New dashboard is enabled for this user!');
  } else {
    console.log('Using classic dashboard');
  }
});

// Clean shutdown
process.on('SIGTERM', () => {
  sdk.shutdown();
});
```

### CommonJS (Node.js)

```javascript
const { FeatureFlagsHQSDK } = require('featureflagshq');

const sdk = new FeatureFlagsHQSDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'production'
});

sdk.on('ready', async () => {
  const userId = 'user_123';
  const isEnabled = await sdk.getBool(userId, 'new_dashboard', false);
  console.log(`Feature enabled: ${isEnabled}`);
});
```

### Browser Usage

```html
<script src="https://unpkg.com/featureflagshq@latest/dist/featureflagshq.min.js"></script>
<script>
  const sdk = new FeatureFlagsHQSDK({
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    environment: 'production'
  });

  sdk.on('ready', async () => {
    const isEnabled = await sdk.getBool('user_123', 'new_feature', false);
    if (isEnabled) {
      document.getElementById('new-feature').style.display = 'block';
    }
  });
</script>
```

## ⚙️ Configuration

### 🌍 Environment Variables

The SDK can be configured using environment variables:

```bash
export FEATUREFLAGSHQ_CLIENT_ID="your_client_id"
export FEATUREFLAGSHQ_CLIENT_SECRET="your_client_secret"
export FEATUREFLAGSHQ_ENVIRONMENT="production"
```

```typescript
// SDK will automatically use environment variables
const sdk = new FeatureFlagsHQSDK();
```

### 🔧 Advanced Configuration

```typescript
import { FeatureFlagsHQSDK, SDKConfig } from '@featureflagshq/sdk';

const config: SDKConfig = {
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  environment: 'production',
  apiBaseUrl: 'https://api.featureflagshq.com', // Custom API endpoint
  timeout: 30000,                                // Request timeout (ms)
  maxRetries: 3,                                 // Number of retries
  offlineMode: false,                            // Enable offline mode
  enableMetrics: true,                           // Enable analytics
  onFlagChange: (name, oldValue, newValue) => {
    console.log(`Flag ${name} changed from ${oldValue} to ${newValue}`);
  }
};

const sdk = new FeatureFlagsHQSDK(config);
```

## 💡 Usage Examples

### 🎯 Basic Flag Evaluation

```typescript
import { FeatureFlagsHQSDK } from '@featureflagshq/sdk';

const sdk = new FeatureFlagsHQSDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret'
});

const userId = 'user_123';

// Boolean flags
const showBetaFeature = await sdk.getBool(userId, 'beta_feature', false);

// String flags
const buttonColor = await sdk.getString(userId, 'button_color', 'blue');

// Integer flags
const maxItems = await sdk.getInt(userId, 'max_items_per_page', 10);

// Float flags
const discountRate = await sdk.getFloat(userId, 'discount_rate', 0.0);

// JSON flags
const config = await sdk.getJson(userId, 'app_config', {});
```

### 👥 User Segmentation

```typescript
// Define user segments for targeting
const userSegments = {
  country: 'US',
  subscription: 'premium',
  age: 25,
  beta_user: true
};

// Evaluate flags with segments
const isPremiumFeatureEnabled = await sdk.getBool(
  'user_123',
  'premium_analytics',
  false,
  userSegments
);
```

### 📊 Bulk Flag Evaluation

```typescript
// Get all flags for a user
const allFlags = await sdk.getUserFlags('user_123', userSegments);
console.log('All flags for user:', allFlags);

// Get specific flags only
const specificFlags = await sdk.getUserFlags(
  'user_123',
  userSegments,
  ['feature_a', 'feature_b', 'feature_c']
);
```

### ⚛️ React Integration

```tsx
import React, { useState, useEffect } from 'react';
import { FeatureFlagsHQSDK } from '@featureflagshq/sdk';

const sdk = new FeatureFlagsHQSDK({
  clientId: process.env.REACT_APP_FEATUREFLAGSHQ_CLIENT_ID,
  clientSecret: process.env.REACT_APP_FEATUREFLAGSHQ_CLIENT_SECRET
});

function App() {
  const [showNewFeature, setShowNewFeature] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    sdk.on('ready', async () => {
      setSdkReady(true);
      const userId = 'user_123'; // Get from your auth system
      const enabled = await sdk.getBool(userId, 'new_dashboard', false);
      setShowNewFeature(enabled);
    });

    return () => {
      sdk.shutdown();
    };
  }, []);

  if (!sdkReady) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {showNewFeature ? (
        <NewDashboard />
      ) : (
        <ClassicDashboard />
      )}
    </div>
  );
}
```

### 🚂 Express.js Integration

```typescript
import express from 'express';
import { FeatureFlagsHQSDK } from '@featureflagshq/sdk';

const app = express();

// Initialize SDK once
const sdk = new FeatureFlagsHQSDK({
  clientId: process.env.FEATUREFLAGSHQ_CLIENT_ID,
  clientSecret: process.env.FEATUREFLAGSHQ_CLIENT_SECRET
});

app.get('/dashboard', async (req, res) => {
  const userId = req.user?.id; // Get from your auth system
  
  if (!userId) {
    return res.redirect('/login');
  }
  
  // Check if new dashboard is enabled
  const useNewDashboard = await sdk.getBool(userId, 'new_dashboard_v2', false);
  
  if (useNewDashboard) {
    res.render('dashboard_v2');
  } else {
    res.render('dashboard_v1');
  }
});

// Clean shutdown when app closes
process.on('SIGTERM', () => {
  sdk.shutdown();
  process.exit(0);
});

app.listen(3000);
```

### ▲ Next.js Integration

```typescript
// lib/featureflags.ts
import { FeatureFlagsHQSDK } from '@featureflagshq/sdk';

let sdk: FeatureFlagsHQSDK | null = null;

export function getFeatureFlagsSDK(): FeatureFlagsHQSDK {
  if (!sdk) {
    sdk = new FeatureFlagsHQSDK({
      clientId: process.env.FEATUREFLAGSHQ_CLIENT_ID!,
      clientSecret: process.env.FEATUREFLAGSHQ_CLIENT_SECRET!,
      environment: process.env.NODE_ENV
    });
  }
  return sdk;
}

// pages/api/feature-check.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getFeatureFlagsSDK } from '../../lib/featureflags';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sdk = getFeatureFlagsSDK();
  const { userId, flagName } = req.query;
  
  const isEnabled = await sdk.getBool(
    userId as string,
    flagName as string,
    false
  );
  
  res.json({ enabled: isEnabled });
}

// pages/dashboard.tsx
import { GetServerSideProps } from 'next';
import { getFeatureFlagsSDK } from '../lib/featureflags';

interface DashboardProps {
  showNewFeature: boolean;
}

export default function Dashboard({ showNewFeature }: DashboardProps) {
  return (
    <div>
      {showNewFeature ? <NewFeature /> : <OldFeature />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const sdk = getFeatureFlagsSDK();
  const userId = context.req.headers['user-id'] as string; // From your auth
  
  const showNewFeature = await sdk.getBool(userId, 'new_feature', false);
  
  return {
    props: {
      showNewFeature
    }
  };
};
```

## 🔥 Advanced Features

### 🔔 Flag Change Callbacks

```typescript
const sdk = new FeatureFlagsHQSDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  onFlagChange: (flagName, oldValue, newValue) => {
    console.log(`Flag '${flagName}' changed from ${oldValue} to ${newValue}`);
    // Trigger cache invalidation, send notifications, etc.
  }
});

// Or add listeners after initialization
sdk.on('flagChange', (flagName, oldValue, newValue) => {
  // Handle flag changes
});
```

### 🔄 Manual Refresh and Cache Control

```typescript
// Manually refresh flags from server
const success = await sdk.refreshFlags();
if (success) {
  console.log('Flags refreshed successfully');
}

// Get all cached flags
const allFlags = sdk.getAllFlags();
console.log('Cached flags:', Object.keys(allFlags));

// Force log upload
await sdk.flushLogs();
```

### 📈 SDK Health and Statistics

```typescript
// Get SDK health status
const health = sdk.getHealthCheck();
console.log(`SDK Status: ${health.status}`);
console.log(`Cached Flags: ${health.cached_flags_count}`);

// Get detailed usage statistics
const stats = sdk.getStats();
console.log(`Total API calls: ${stats.api_calls.total}`);
console.log(`Unique users: ${stats.unique_users_count}`);
console.log(`Circuit breaker state: ${stats.circuit_breaker.state}`);
```

### 📴 Offline Mode

```typescript
// Enable offline mode for environments without internet
const sdk = new FeatureFlagsHQSDK({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  offlineMode: true
});

// All flag evaluations will use default values in offline mode
const result = await sdk.getBool('user_123', 'feature_flag', true);
```

## ⚠️ Error Handling

The SDK includes comprehensive error handling and graceful degradation:

```typescript
try {
  const sdk = new FeatureFlagsHQSDK({
    clientId: 'invalid_client_id',
    clientSecret: 'invalid_secret'
  });
  
  // SDK will continue to work but use default values
  sdk.on('error', (error) => {
    console.error('SDK Error:', error);
  });
  
  // Check health to see if there are authentication issues
  sdk.on('ready', () => {
    const health = sdk.getHealthCheck();
    if (health.status !== 'healthy') {
      console.log('SDK not healthy:', health);
    }
  });
  
} catch (error) {
  console.error('Configuration error:', error);
}
```

## 💎 Best Practices

### 1️⃣ Singleton Pattern
Create one SDK instance per application and reuse it:

```typescript
// Good - single instance
const sdk = new FeatureFlagsHQSDK({
  clientId: process.env.FEATUREFLAGSHQ_CLIENT_ID,
  clientSecret: process.env.FEATUREFLAGSHQ_CLIENT_SECRET
});

// Bad - creates multiple instances
function getFlag() {
  const sdk = new FeatureFlagsHQSDK({ /* config */ });
  return sdk.getBool('user', 'flag');
}
```

### 2️⃣ Always Provide Default Values
```typescript
// Good - provides fallback behavior
const isEnabled = await sdk.getBool('user_123', 'new_feature', false);

// Risky - might return undefined in error cases
const isEnabled = await sdk.getBool('user_123', 'new_feature');
```

### 3️⃣ Wait for SDK Initialization
```typescript
// Good - wait for ready event
sdk.on('ready', async () => {
  const result = await sdk.getBool('user', 'flag', false);
});

// Or use promises
await new Promise((resolve) => {
  sdk.on('ready', resolve);
});
const result = await sdk.getBool('user', 'flag', false);
```

### 4️⃣ Monitor SDK Health
```typescript
// Periodically check SDK health in production
setInterval(() => {
  const health = sdk.getHealthCheck();
  if (health.status !== 'healthy') {
    console.warn('FeatureFlags SDK unhealthy:', health);
  }
}, 60000); // Check every minute
```

## 📚 API Reference

### 🏗️ Constructor Options

```typescript
interface SDKConfig {
  clientId?: string;
  clientSecret?: string;
  apiBaseUrl?: string;
  environment?: string;
  timeout?: number;
  maxRetries?: number;
  offlineMode?: boolean;
  enableMetrics?: boolean;
  onFlagChange?: (flagName: string, oldValue: any, newValue: any) => void;
}
```

### 🎛️ Main Methods

- `get(userId, flagName, defaultValue?, segments?)` - Get flag value with type inference
- `getBool(userId, flagName, defaultValue?, segments?)` - Get boolean flag
- `getString(userId, flagName, defaultValue?, segments?)` - Get string flag
- `getInt(userId, flagName, defaultValue?, segments?)` - Get integer flag
- `getFloat(userId, flagName, defaultValue?, segments?)` - Get float flag
- `getJson(userId, flagName, defaultValue?, segments?)` - Get JSON flag
- `getUserFlags(userId, segments?, flagKeys?)` - Get multiple flags for user
- `isFlagEnabledForUser(userId, flagName, segments?)` - Check if flag is enabled

### 🛠️ Management Methods

- `refreshFlags()` - Manually refresh flags from server
- `flushLogs()` - Upload pending analytics logs
- `getAllFlags()` - Get all cached flag definitions
- `getStats()` - Get SDK usage statistics
- `getHealthCheck()` - Get SDK health status
- `shutdown()` - Clean shutdown of background processes

### 📢 Events

- `ready` - SDK is initialized and ready to use
- `error` - SDK encountered an error
- `flagChange` - A flag value changed (if onFlagChange callback is set)
- `shutdown` - SDK has been shut down

## 🌐 Browser Compatibility

The SDK supports all modern browsers:

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

For older browsers, ensure you have polyfills for:
- `fetch` API
- `Promise`
- `EventTarget`

## 🟢 Node.js Compatibility

- Node.js 16+
- Compatible with ES modules and CommonJS

## 🏭 Production Utilities

```typescript
import { createProductionClient, validateProductionConfig } from '@featureflagshq/sdk';

// Validate configuration before deployment
const config = {
  clientId: process.env.FEATUREFLAGSHQ_CLIENT_ID,
  clientSecret: process.env.FEATUREFLAGSHQ_CLIENT_SECRET,
  environment: 'production'
};

const warnings = validateProductionConfig(config);
if (warnings.length > 0) {
  console.warn('Configuration warnings:', warnings);
}

// Create production-ready client with security hardening
const sdk = createProductionClient(
  config.clientId!,
  config.clientSecret!,
  'production',
  {
    timeout: 30000,
    maxRetries: 3
  }
);
```

## 🔐 Security

The SDK implements multiple security layers:

- **HMAC Authentication**: All API requests are signed with HMAC-SHA256
- **Input Validation**: All inputs are validated and sanitized
- **Security Filtering**: Sensitive data is filtered from logs
- **Rate Limiting**: Per-user rate limiting prevents abuse
- **Circuit Breaker**: Automatic failure detection and recovery
- **Cross-Platform Security**: Consistent security model across Node.js and browser

## 🆘 Support

- **Documentation**: [Official docs](https://featureflagshq.com/documentation/)
- **Issues**: [GitHub Issues](https://github.com/featureflagshq/javascript-sdk/issues)
- **Email**: hello@featureflagshq.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Built with ❤️ by the FeatureFlagsHQ Team**