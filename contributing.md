# Contributing to FeatureFlagsHQ JavaScript SDK

Thank you for your interest in contributing to the FeatureFlagsHQ JavaScript/TypeScript SDK! We welcome contributions from the community.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Issue Reporting](#issue-reporting)

## Getting Started

### Prerequisites

- **Node.js** 16 or higher
- **npm** or **yarn** package manager
- **Git** installed and configured
- Basic familiarity with TypeScript and feature flags

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/javascript-sdk.git
   cd javascript-sdk
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/featureflagshq/javascript-sdk.git
   ```

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your FeatureFlagsHQ credentials for testing:
   ```bash
   export FEATUREFLAGSHQ_CLIENT_ID="your-test-client-id"
   export FEATUREFLAGSHQ_CLIENT_SECRET="your-test-client-secret"
   ```

3. Run tests to ensure everything works:
   ```bash
   npm test
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## How to Contribute

### Types of Contributions

- **Bug fixes** - Fix issues in the SDK functionality
- **Feature additions** - Add new feature flag capabilities
- **Performance optimizations** - Improve SDK performance and caching
- **Documentation improvements** - Enhance README or examples
- **Test coverage** - Add or improve test cases
- **Framework integrations** - Improve React, Vue, Angular examples

### Before You Start

1. Check existing issues for related work
2. Create an issue for significant changes to discuss the approach
3. Ensure changes align with SDK principles of simplicity and reliability

## Pull Request Process

### Creating a Pull Request

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/add-batch-evaluation
   # or
   git checkout -b fix/cache-invalidation-bug
   ```

2. **Make your changes** following our coding standards

3. **Write or update tests** for your changes

4. **Run the full test suite**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit your changes** with descriptive messages:
   ```bash
   git commit -m "feat: add batch flag evaluation support"
   git commit -m "fix: resolve cache invalidation in local mode"
   ```

6. **Push to your fork** and **open a pull request**

### Pull Request Requirements

Before submitting, ensure your PR:

- ✅ Passes all tests (`npm test`)
- ✅ Follows coding standards (`npm run lint`)
- ✅ TypeScript compiles without errors (`npm run type-check`)
- ✅ Has appropriate test coverage
- ✅ Updates documentation if needed
- ✅ Maintains backward compatibility (unless breaking change is justified)

## Coding Standards

### Code Style

We use automated tools to maintain consistent code style:

- **Prettier** for code formatting
- **ESLint** for linting
- **TypeScript** for type checking

Run formatting and linting:
```bash
npm run format
npm run lint
npm run type-check
```

### TypeScript

Always use TypeScript with proper type definitions:

```typescript
interface FlagOptions {
  defaultValue?: any;
  segments?: Record<string, any>;
}

async getBool(
  userId: string,
  flagName: string,
  defaultValue: boolean = false,
  segments?: Record<string, any>
): Promise<boolean> {
  // Implementation
}
```

### Error Handling

- Create custom error classes
- Provide meaningful error messages
- Always handle network timeouts and API errors gracefully

```typescript
export class FeatureFlagsHQError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeatureFlagsHQError';
  }
}

export class APIError extends FeatureFlagsHQError {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'APIError';
  }
}
```

### Documentation

Use JSDoc comments for all public methods:

```typescript
/**
 * Get the boolean value of a feature flag for a specific user.
 * 
 * @param userId - The unique identifier for the user
 * @param flagName - The unique identifier for the feature flag
 * @param defaultValue - Default value to return if flag evaluation fails
 * @param segments - User segments for targeting
 * @returns The evaluated flag value (true/false)
 * 
 * @example
 * ```typescript
 * const sdk = new FeatureFlagsHQSDK({ clientId: 'your-id', clientSecret: 'your-secret' });
 * const isEnabled = await sdk.getBool('user123', 'new-checkout');
 * if (isEnabled) {
 *   // Show new checkout flow
 * }
 * ```
 */
```

## Testing Guidelines

### Test Structure

- Use **Jest** as the testing framework
- Organize tests in `__tests__` directories or `.test.ts` files
- Use mocking for external dependencies
- Include both unit tests and integration tests

### Writing Tests

```typescript
import { FeatureFlagsHQSDK } from '../src/sdk';

describe('FeatureFlagsHQSDK', () => {
  test('should return flag value successfully', async () => {
    const sdk = new FeatureFlagsHQSDK({
      clientId: 'test-id',
      clientSecret: 'test-secret'
    });

    // Mock the API call
    jest.spyOn(sdk as any, 'fetchFlags').mockResolvedValue({
      'test-flag': { value: true, type: 'bool', is_active: true }
    });

    const result = await sdk.getBool('user123', 'test-flag');
    expect(result).toBe(true);
  });

  test('should return default value on error', async () => {
    const sdk = new FeatureFlagsHQSDK({
      clientId: 'test-id',
      clientSecret: 'test-secret'
    });

    // Mock API failure
    jest.spyOn(sdk as any, 'fetchFlags').mockRejectedValue(new Error('API Error'));

    const result = await sdk.getBool('user123', 'test-flag', true);
    expect(result).toBe(true);
  });
});
```

### Browser and Node.js Testing

Test both environments:
```bash
npm run test:node    # Node.js tests
npm run test:browser # Browser tests (if applicable)
```

## Issue Reporting

### Bug Reports

When reporting bugs, include:

- **Node.js version** and browser (if applicable)
- **SDK version** you're using
- **Minimal code example** that reproduces the issue
- **Expected behavior** vs actual behavior
- **Error messages** and stack traces

### Feature Requests

For feature requests, describe:

- **Use case** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Impact** - Who would benefit from this feature?

### Security Issues

For security vulnerabilities:
- **Do not** create public issues
- Email hello@featureflagshq.com with details

## SDK Design Principles

1. **Fail gracefully** - Always return default values when API is unavailable
2. **Performance first** - Cache aggressively, minimize API calls
3. **Cross-platform** - Work in both Node.js and browser environments
4. **TypeScript first** - Provide excellent type safety and IDE support
5. **Framework agnostic** - Core SDK should work without specific frameworks

## Development Workflow

### Syncing with Upstream

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Available Scripts

- `npm run build` - Build the SDK
- `npm test` - Run all tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

---

Thank you for contributing to FeatureFlagsHQ! 🚀

For questions about contributing, reach out at hello@featureflagshq.com or open a GitHub issue.