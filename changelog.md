# Changelog

All notable changes to the FeatureFlagsHQ JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added
- Initial release of FeatureFlagsHQ JavaScript/TypeScript SDK
- Full TypeScript support with comprehensive type definitions
- Cross-platform compatibility (Node.js and Browser environments)
- HMAC-SHA256 authentication for secure API communication
- Background flag polling with configurable intervals (5 minutes default)
- Circuit breaker pattern for fault tolerance and automatic recovery
- Rate limiting per user to prevent abuse (1000 requests/minute/user)
- Comprehensive input validation and sanitization
- Security filtering for sensitive data in logs
- Event-driven architecture with `ready`, `error`, `flagChange`, and `shutdown` events
- Offline mode support for environments without internet connectivity
- User segmentation with advanced targeting capabilities
- Flag evaluation methods: `getBool`, `getString`, `getInt`, `getFloat`, `getJson`
- Generic `get` method with automatic type inference
- Bulk flag evaluation with `getUserFlags` method
- Real-time flag change callbacks and notifications
- SDK health monitoring with `getHealthCheck()` method
- Comprehensive statistics tracking with `getStats()` method
- Manual flag refresh with `refreshFlags()` method
- Log flushing capabilities with `flushLogs()` method
- Production utilities with `createProductionClient` and `validateProductionConfig`
- Comprehensive error handling with graceful degradation
- Session metadata tracking and analytics
- Automatic log batching and upload (2 minute intervals)
- Support for multiple flag types: boolean, string, integer, float, JSON
- Advanced segment matching with multiple comparators (==, !=, >, <, >=, <=, contains)
- Rollout percentage support for gradual feature releases
- Memory-efficient caching with automatic cleanup
- UUID-based session tracking
- System information collection for analytics
- Environment variable support for configuration
- Clean shutdown process with proper resource cleanup

### Security
- HMAC-SHA256 request signing for API authentication
- Input validation against SQL injection and XSS attacks
- Sanitization of user IDs and flag names
- Security filtering of sensitive data in logs
- Rate limiting to prevent abuse
- Secure cross-platform crypto implementation

### Performance
- Background polling to minimize request latency
- Intelligent caching with configurable limits
- Circuit breaker pattern for resilience
- Batch log uploads for efficiency
- Memory management with automatic cleanup
- Evaluation time tracking and optimization

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Web Crypto API for secure operations
- Polyfills for cross-browser compatibility

### Node.js Support
- Node.js 16+
- CommonJS and ES modules support
- Native crypto module integration
- EventEmitter-based architecture

### Developer Experience
- Complete TypeScript type definitions
- Comprehensive JSDoc documentation
- Event-driven programming model
- Promise-based async API
- Clear error messages and debugging information
- Production-ready configuration validation