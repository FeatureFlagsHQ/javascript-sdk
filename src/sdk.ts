/**
 * FeatureFlagsHQ SDK - Core functionality with Enhanced Logging
 * TypeScript/JavaScript SDK for Node.js and Browser environments
 */

// Import polyfills for cross-platform compatibility
let crypto: any;
let EventEmitter: any;
let process: any;
let os: any;
// let nodeFetch: any; // Commented out as it's not used directly

// Dynamic imports for different environments
if (typeof window !== 'undefined') {
  // Browser environment
  EventEmitter = class EventEmitter {
    private events: Map<string, Function[]> = new Map();

    on(event: string, listener: Function): this {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      this.events.get(event)!.push(listener);
      return this;
    }

    once(event: string, listener: Function): this {
      const onceWrapper = (...args: any[]) => {
        this.off(event, onceWrapper);
        listener.apply(this, args);
      };
      return this.on(event, onceWrapper);
    }

    off(event: string, listener: Function): this {
      const listeners = this.events.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
      return this;
    }

    emit(event: string, ...args: any[]): boolean {
      const listeners = this.events.get(event);
      if (listeners) {
        listeners.forEach(listener => listener.apply(this, args));
        return true;
      }
      return false;
    }

    removeAllListeners(event?: string): this {
      if (event) {
        this.events.delete(event);
      } else {
        this.events.clear();
      }
      return this;
    }
  };

  process = {
    platform: 'browser',
    version: 'browser',
    pid: Math.floor(Math.random() * 10000),
    env: {}
  };

  os = {
    hostname: () => window.location.hostname || 'browser',
    platform: () => navigator.platform || 'browser',
    cpuCount: () => navigator.hardwareConcurrency || 1
  };

  // Browser crypto using Web Crypto API
  crypto = {
    createHash: (_algorithm: string) => ({
      update: (data: string) => ({
        digest: async (_encoding: string) => {
          const encoder = new TextEncoder();
          const dataBuffer = encoder.encode(data);
          const buffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
          const array = Array.from(new Uint8Array(buffer));
          return array.map(b => b.toString(16).padStart(2, '0')).join('');
        }
      })
    }),
    createHmac: (_algorithm: string, secret: string) => ({
      update: (data: string) => ({
        digest: async (_encoding: string) => {
          const encoder = new TextEncoder();
          const keyBuffer = encoder.encode(secret);
          const dataBuffer = encoder.encode(data);
          
          const key = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          );
          
          const signature = await window.crypto.subtle.sign('HMAC', key, dataBuffer);
          const array = Array.from(new Uint8Array(signature));
          const base64 = btoa(String.fromCharCode.apply(null, array as any));
          return base64;
        }
      })
    })
  };
} else {
  // Node.js environment
  try {
    crypto = require('crypto');
    EventEmitter = require('events').EventEmitter;
    process = require('process');
    os = require('os');
  } catch (error) {
    console.warn('Failed to load Node.js modules:', error);
  }
}

// Global fetch
const globalFetch = (() => {
  if (typeof globalThis.fetch !== 'undefined') {
    return globalThis.fetch.bind(globalThis);
  } else if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch.bind(window);
  } else {
    // Node.js environment - try to use node-fetch if available
    try {
      const nodeFetch = require('node-fetch');
      return nodeFetch.default || nodeFetch;
    } catch {
      throw new Error(
        'Fetch not available. In Node.js environments, please install node-fetch: npm install node-fetch'
      );
    }
  }
})();

// Constants
export const SDK_VERSION = '1.0.0';
export const DEFAULT_API_BASE_URL = 'https://api.featureflagshq.com';
export const COMPANY_NAME = 'FeatureFlagsHQ';
export const USER_AGENT_PREFIX = `${COMPANY_NAME}-Node-SDK`;

const MAX_USER_ID_LENGTH = 255;
const MAX_FLAG_NAME_LENGTH = 255;
const POLLING_INTERVAL = 300000; // 5 minutes
const LOG_UPLOAD_INTERVAL = 120000; // 2 minutes
const MAX_UNIQUE_USERS_TRACKED = 10000;
const MAX_UNIQUE_FLAGS_TRACKED = 1000;
const ENABLE_LOGGING = false; // Added to match Python SDK

// Types
export interface FlagData {
  name: string;
  value: any;
  type: 'string' | 'bool' | 'int' | 'float' | 'json';
  is_active: boolean;
  rollout?: {
    percentage: number;
  };
  segments?: SegmentData[];
}

export interface SegmentData {
  name: string;
  value: any;
  type: 'string' | 'int' | 'integer' | 'float' | 'bool' | 'boolean';
  comparator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains';
  is_active?: boolean; // Added to match Python SDK
}

export interface EvaluationContext {
  flag_active: boolean;
  flag_found: boolean;
  default_value_used: boolean;
  segments_matched: string[];
  segments_evaluated: string[];
  rollout_qualified: boolean;
  reason: string;
  total_sdk_time_ms?: number;
}

export interface LogEntry {
  user_id: string;
  flag_name: string;
  flag_value: any;
  timestamp: string;
  session_id: string;
  evaluation_time_ms: number;
  evaluation_context: EvaluationContext;
  segments?: Record<string, any>;
  metadata: {
    sdk_version: string;
    environment: string;
  };
}

export interface SessionMetadata {
  session_id: string;
  environment: {
    name: string;
  };
  system_info: {
    platform: string;
    node_version: string;
    hostname: string;
    process_id: number;
    cpu_count?: number;
    memory_total?: number;
  };
  stats: {
    total_user_accesses: number;
    unique_users_count: number;
    unique_flags_count: number;
    segment_matches: number;
    rollout_evaluations: number;
    evaluation_times: {
      avg_ms: number;
      min_ms: number;
      max_ms: number;
      total_ms: number;
      count: number;
    };
  };
}

export interface SDKStats {
  total_user_accesses: number;
  unique_users_count: number;
  unique_flags_count: number;
  segment_matches: number;
  rollout_evaluations: number;
  last_sync: string | null;
  last_log_upload: string | null;
  api_calls: {
    successful: number;
    failed: number;
    total: number;
  };
  errors: {
    network_errors: number;
    auth_errors: number;
    other_errors: number;
  };
  session_id: string;
  cached_flags_count: number;
  pending_user_logs: number;
  circuit_breaker: {
    state: string;
    failure_count: number;
  };
  evaluation_times: {
    avg_ms: number;
    min_ms: number;
    max_ms: number;
    total_ms: number;
    count: number;
  };
  configuration: {
    polling_interval: number;
    log_upload_interval: number;
    offline_mode: boolean;
    enable_metrics: boolean;
    environment: string;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'error';
  sdk_version: string;
  api_base_url: string;
  cached_flags_count: number;
  session_id: string;
  environment: string;
  offline_mode: boolean;
  last_sync: string | null;
  circuit_breaker: {
    state: string;
    failure_count: number;
  };
  system_info: {
    platform: string;
    node_version: string;
    hostname: string;
  };
  initialization_complete: boolean;
  error?: string;
}

export interface SDKConfig {
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

// Security Filter for logging - Enhanced to match Python version
class SecurityFilter {
  private static readonly SENSITIVE_PATTERNS = [
    /secret["']?\s*[:=]\s*["']?([^"'\s]+)/gi,
    /signature["']?\s*[:=]\s*["']?([^"'\s]+)/gi,
  ];

  static filter(message: string): string {
    let filtered = message;
    for (const pattern of this.SENSITIVE_PATTERNS) {
      filtered = filtered.replace(pattern, (match, group) => 
        match.replace(group, '[REDACTED]')
      );
    }
    return filtered;
  }
}

// Logger with security filtering - Enhanced with ENABLE_LOGGING check
class Logger {
  private prefix = 'featureflagshq_sdk';

  info(message: string): void {
    if (ENABLE_LOGGING) {
      console.log(`[${this.prefix}] INFO: ${SecurityFilter.filter(message)}`);
    }
  }

  warn(message: string): void {
    if (ENABLE_LOGGING) {
      console.warn(`[${this.prefix}] WARN: ${SecurityFilter.filter(message)}`);
    }
  }

  error(message: string): void {
    if (ENABLE_LOGGING) {
      console.error(`[${this.prefix}] ERROR: ${SecurityFilter.filter(message)}`);
    }
  }

  debug(message: string): void {
    if (ENABLE_LOGGING && process.env.NODE_ENV === 'development') {
      console.debug(`[${this.prefix}] DEBUG: ${SecurityFilter.filter(message)}`);
    }
  }
}

const logger = new Logger();

export class FeatureFlagsHQSDK extends EventEmitter {
  private clientId: string;
  private clientSecret: string;
  private apiBaseUrl: string;
  private environment: string;
  private timeout: number;
  // private maxRetries: number; // Currently not used in implementation
  private offlineMode: boolean;
  private enableMetrics: boolean;
  private onFlagChange?: (flagName: string, oldValue: any, newValue: any) => void;

  // Internal state
  private flags: Map<string, FlagData> = new Map();
  private sessionId: string;
  private logsQueue: LogEntry[] = [];
  private initializationComplete = false;

  // Enhanced statistics for session metadata
  private stats = {
    total_user_accesses: 0,
    unique_users: new Set<string>(),
    unique_flags_accessed: new Set<string>(),
    last_sync: null as string | null,
    last_log_upload: null as string | null,
    api_calls: { successful: 0, failed: 0, total: 0 },
    errors: { network_errors: 0, auth_errors: 0, other_errors: 0 },
    segment_matches: 0,
    rollout_evaluations: 0,
    evaluation_times: {
      total_ms: 0,
      count: 0,
      min_ms: Infinity,
      max_ms: 0
    }
  };

  // Circuit breaker
  private circuitBreaker = {
    failure_count: 0,
    last_failure_time: null as number | null,
    state: 'closed' as 'closed' | 'open' | 'half-open',
    failure_threshold: 5,
    recovery_timeout: 60000
  };

  // Rate limiting
  private rateLimits: Map<string, [number, number]> = new Map();

  // Background intervals
  private pollingInterval?: NodeJS.Timeout;
  private logUploadInterval?: NodeJS.Timeout;

  // System info for session metadata
  private systemInfo: any;

  constructor(config: SDKConfig = {}) {
    super();

    // Get credentials from environment if not provided - Enhanced to match Python SDK
    const clientId = config.clientId || 
      process.env?.FEATUREFLAGSHQ_CLIENT_ID || 
      process.env?.FEATUREFLAGSHQ_CLIENT_KEY; // Added CLIENT_KEY support
    const clientSecret = config.clientSecret || 
      process.env?.FEATUREFLAGSHQ_CLIENT_SECRET;
    const environment = config.environment || 
      process.env?.FEATUREFLAGSHQ_ENVIRONMENT || 
      'production';

    // Validate inputs
    if (!clientId || !clientSecret) {
      throw new Error('clientId and clientSecret are required');
    }

    this.clientId = this.validateString(clientId, 'clientId');
    this.clientSecret = this.validateString(clientSecret, 'clientSecret');
    this.apiBaseUrl = this.validateUrl(config.apiBaseUrl || DEFAULT_API_BASE_URL);
    this.environment = this.validateString(environment, 'environment');
    this.timeout = config.timeout || 30000;
    // this.maxRetries = config.maxRetries || 3; // Currently not used in implementation
    this.offlineMode = config.offlineMode || false;
    this.enableMetrics = config.enableMetrics !== false;
    this.onFlagChange = config.onFlagChange;

    this.sessionId = this.generateUuid();
    this.systemInfo = this.getSystemInfo();

    // Initialize SDK
    this.initialize();
  }

  private getSystemInfo(): any {
    try {
      // Get memory info if available
      let memoryTotal: number | undefined;
      let cpuCount: number | undefined;

      if (typeof window !== 'undefined') {
        // Browser environment
        cpuCount = navigator.hardwareConcurrency;
        memoryTotal = (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 * 1024 * 1024 : undefined;
      } else {
        // Node.js environment
        try {
          cpuCount = os.cpus().length;
          memoryTotal = os.totalmem();
        } catch (error) {
          cpuCount = undefined;
          memoryTotal = undefined;
        }
      }

      return {
        platform: process?.platform || 'unknown',
        node_version: process?.version || (typeof window !== 'undefined' ? 'browser' : 'unknown'),
        hostname: os?.hostname ? os.hostname() : (typeof window !== 'undefined' ? window.location.hostname : 'unknown'),
        process_id: process?.pid || Math.floor(Math.random() * 10000),
        cpu_count: cpuCount,
        memory_total: memoryTotal
      };
    } catch (error) {
      return {
        platform: 'unknown',
        node_version: 'unknown',
        hostname: 'unknown',
        process_id: Math.floor(Math.random() * 10000)
      };
    }
  }

  private validateUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('API base URL must be a non-empty string');
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL scheme. Only http and https are allowed');
      }
      if (!parsed.hostname) {
        throw new Error('Invalid URL: missing hostname');
      }
      return url.replace(/\/$/, '');
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  private validateString(value: string, fieldName: string, maxLength = 255): string {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${fieldName} cannot be empty`);
    }

    if (trimmed.length > maxLength) {
      throw new Error(`${fieldName} too long (max ${maxLength} characters)`);
    }

    // Remove control characters and check for dangerous patterns
    const dangerousChars = ['\n', '\r', '\0', '\t', '\x1b'];
    for (const char of dangerousChars) {
      if (trimmed.includes(char)) {
        throw new Error(`${fieldName} contains invalid characters`);
      }
    }

    // Basic SQL injection prevention
    const sqlPatterns = ['--', ';', '/*', '*/', 'union', 'select', 'insert', 'delete', 'update', 'drop'];
    const valueLower = trimmed.toLowerCase();
    for (const pattern of sqlPatterns) {
      if (valueLower.includes(pattern)) {
        throw new Error(`${fieldName} contains potentially dangerous content`);
      }
    }

    return trimmed;
  }

  private validateUserId(userId: string): string {
    if (userId === null || userId === undefined) {
      throw new Error('userId cannot be null or undefined');
    }

    const validated = this.validateString(userId, 'userId', MAX_USER_ID_LENGTH);

    // Additional pattern validation for user IDs
    if (!/^[a-zA-Z0-9_@.\-+]+$/.test(validated)) {
      logger.warn(`Potentially unsafe userId pattern: ${validated.substring(0, 50)}...`);
    }

    return validated;
  }

  private validateFlagName(flagName: string): string {
    if (flagName === null || flagName === undefined) {
      throw new Error('flagName cannot be null or undefined');
    }

    const validated = this.validateString(flagName, 'flagName', MAX_FLAG_NAME_LENGTH);

    // Flag names should be alphanumeric + underscores/hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(validated)) {
      throw new Error('flagName contains invalid characters');
    }

    return validated;
  }

  private rateLimitCheck(userId: string): boolean {
    if (this.offlineMode) return true;

    const currentTime = Date.now();

    // Clean up old entries
    for (const [uid, [, lastTime]] of this.rateLimits.entries()) {
      if (currentTime - lastTime > 60000) {
        this.rateLimits.delete(uid);
      }
    }

    // Check current user's rate
    const userLimit = this.rateLimits.get(userId);
    if (userLimit) {
      const [count, lastTime] = userLimit;
      if (currentTime - lastTime < 60000) {
        if (count > 1000) { // Max 1000 requests per minute per user
          logger.warn(`Rate limit exceeded for user: ${userId}`);
          return false;
        }
        this.rateLimits.set(userId, [count + 1, currentTime]);
      } else {
        this.rateLimits.set(userId, [1, currentTime]);
      }
    } else {
      this.rateLimits.set(userId, [1, currentTime]);
    }

    return true;
  }

  private checkCircuitBreaker(): boolean {
    if (this.circuitBreaker.state === 'open') {
      if (this.circuitBreaker.last_failure_time &&
          (Date.now() - this.circuitBreaker.last_failure_time) > this.circuitBreaker.recovery_timeout) {
        this.circuitBreaker.state = 'half-open';
        logger.info('Circuit breaker moved to half-open state');
        return true;
      }
      return false;
    }
    return true;
  }

  private recordApiSuccess(): void {
    this.stats.api_calls.successful++;
    this.stats.api_calls.total++;

    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failure_count = 0;
      logger.info('Circuit breaker closed after successful call');
    }
  }

  private recordApiFailure(errorType: 'network_errors' | 'auth_errors' | 'other_errors' = 'other_errors'): void {
    this.stats.api_calls.failed++;
    this.stats.api_calls.total++;
    this.stats.errors[errorType]++;

    this.circuitBreaker.failure_count++;
    this.circuitBreaker.last_failure_time = Date.now();

    if (this.circuitBreaker.failure_count >= this.circuitBreaker.failure_threshold) {
      this.circuitBreaker.state = 'open';
      logger.warn('Circuit breaker opened due to repeated failures');
    }
  }

  private cleanupOldStats(): void {
    if (this.stats.unique_users.size > MAX_UNIQUE_USERS_TRACKED) {
      const users = Array.from(this.stats.unique_users);
      this.stats.unique_users = new Set(users.slice(-MAX_UNIQUE_USERS_TRACKED));
      logger.info(`Cleaned up old user stats, keeping ${MAX_UNIQUE_USERS_TRACKED} most recent`);
    }

    if (this.stats.unique_flags_accessed.size > MAX_UNIQUE_FLAGS_TRACKED) {
      const flags = Array.from(this.stats.unique_flags_accessed);
      this.stats.unique_flags_accessed = new Set(flags.slice(-MAX_UNIQUE_FLAGS_TRACKED));
      logger.info(`Cleaned up old flag stats, keeping ${MAX_UNIQUE_FLAGS_TRACKED} most recent`);
    }
  }

  private async generateSignature(payload: string, timestamp: string): Promise<string> {
    const message = `${this.clientId}:${timestamp}:${payload}`;
    
    if (typeof window !== 'undefined') {
      // Browser environment - async crypto
      const hmac = crypto.createHmac('sha256', this.clientSecret);
      const signature = await hmac.update(message).digest('base64');
      return signature;
    } else {
      // Node.js environment - sync crypto
      const signature = crypto
        .createHmac('sha256', this.clientSecret)
        .update(message)
        .digest('base64');
      return signature;
    }
  }

  private async getHeaders(payload = ''): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await this.generateSignature(payload, timestamp);

    return {
      'Content-Type': 'application/json',
      'X-SDK-Provider': COMPANY_NAME,
      'X-Client-ID': this.clientId,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Session-ID': this.sessionId,
      'X-SDK-Version': SDK_VERSION,
      'X-Environment': this.environment,
      'User-Agent': `${USER_AGENT_PREFIX}/${SDK_VERSION}`
    };
  }

  private async fetchFlags(): Promise<Record<string, FlagData>> {
    if (this.offlineMode || !this.checkCircuitBreaker()) {
      return {};
    }

    try {
      const url = `${this.apiBaseUrl}/v1/flags/`;
      const headers = await this.getHeaders('');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await globalFetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        this.recordApiFailure('auth_errors');
        logger.error('Authentication failed - check credentials');
        return {};
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.recordApiSuccess();

      const data = await response.json();
      const flags: Record<string, FlagData> = {};

      if (data.data && Array.isArray(data.data)) {
        for (const flagData of data.data) {
          if (typeof flagData === 'object' && flagData.name && typeof flagData.name === 'string') {
            flags[flagData.name] = flagData;
          }
        }
      }

      logger.info(`Fetched ${Object.keys(flags).length} flags from server`);
      return flags;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.recordApiFailure('network_errors');
        logger.warn('Request timeout during flag fetch');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        this.recordApiFailure('network_errors');
        logger.warn('Connection error during flag fetch');
      } else {
        this.recordApiFailure();
        logger.error(`Failed to fetch flags: ${error.message}`);
      }
      return {};
    }
  }

  private async evaluateFlag(flagData: FlagData, userId: string, segments?: Record<string, any>): Promise<[any, EvaluationContext]> {
    const startTime = Date.now();

    const evaluationContext: EvaluationContext = {
      flag_active: flagData.is_active || true,
      flag_found: true,
      default_value_used: false,
      segments_matched: [],
      segments_evaluated: [],
      rollout_qualified: false,
      reason: 'active_flag'
    };

    if (!flagData.is_active) {
      evaluationContext.default_value_used = true;
      evaluationContext.reason = 'flag_inactive';
      const value = this.getDefaultValue(flagData.type);
      const evaluationTime = Date.now() - startTime;
      evaluationContext.total_sdk_time_ms = evaluationTime;
      return [value, evaluationContext];
    }

    // Check segments if they exist on the flag - Enhanced to match Python SDK
    const flagSegments = flagData.segments;
    if (flagSegments) {
      // Filter out inactive segments - NEW: matches Python SDK
      const activeSegments = flagSegments.filter(seg => seg.is_active !== false);

      if (activeSegments.length > 0) {
        const segmentsMatched: string[] = [];
        const segmentsEvaluated: string[] = [];

        for (const segment of activeSegments) {
          const segmentName = segment.name || '';
          segmentsEvaluated.push(segmentName);

          if (this.checkSegmentMatch(segment, segments || {})) {
            segmentsMatched.push(segmentName);
          }
        }

        evaluationContext.segments_matched = segmentsMatched;
        evaluationContext.segments_evaluated = segmentsEvaluated;

        // Update stats
        this.stats.segment_matches += segmentsMatched.length;

        // If there are active segments but none matched, return default - Enhanced logic
        if (segmentsMatched.length === 0) {
          evaluationContext.default_value_used = true;
          evaluationContext.reason = 'segment_not_matched';
          const value = this.getDefaultValue(flagData.type);
          const evaluationTime = Date.now() - startTime;
          evaluationContext.total_sdk_time_ms = evaluationTime;
          return [value, evaluationContext];
        }
      }
    }

    // Check rollout percentage
    const rolloutPercentage = flagData.rollout?.percentage || 100;
    if (rolloutPercentage < 100) {
      this.stats.rollout_evaluations++;

      const userHash = await this.createHash(`${flagData.name}:${userId}`);
      const userPercentage = parseInt(userHash.substring(0, 8), 16) % 100;

      if (userPercentage < rolloutPercentage) {
        evaluationContext.rollout_qualified = true;
        evaluationContext.reason = 'rollout_qualified';
      } else {
        evaluationContext.default_value_used = true;
        evaluationContext.reason = 'rollout_not_qualified';
        const value = this.getDefaultValue(flagData.type);
        const evaluationTime = Date.now() - startTime;
        evaluationContext.total_sdk_time_ms = evaluationTime;
        return [value, evaluationContext];
      }
    }

    // Return flag value
    const value = this.convertValue(flagData.value, flagData.type);
    const evaluationTime = Date.now() - startTime;
    evaluationContext.total_sdk_time_ms = evaluationTime;

    // Update evaluation time stats
    const evalTimes = this.stats.evaluation_times;
    evalTimes.total_ms += evaluationTime;
    evalTimes.count += 1;
    evalTimes.min_ms = Math.min(evalTimes.min_ms, evaluationTime);
    evalTimes.max_ms = Math.max(evalTimes.max_ms, evaluationTime);

    return [value, evaluationContext];
  }

  private checkSegmentMatch(segment: SegmentData, segments: Record<string, any>): boolean {
    try {
      const segmentName = segment.name;
      if (!segmentName || !(segmentName in segments)) {
        return false;
      }

      const comparator = segment.comparator || '==';
      const segmentValue = segment.value;
      const segmentType = segment.type || 'string';
      const userValue = segments[segmentName];

      // Enhanced type conversion to match Python SDK
      let userVal: any, segVal: any;

      if (segmentType === 'int' || segmentType === 'integer') {
        userVal = parseInt(String(parseFloat(String(userValue))), 10);
        segVal = parseInt(String(parseFloat(String(segmentValue))), 10);
      } else if (segmentType === 'float') {
        userVal = parseFloat(String(userValue));
        segVal = parseFloat(String(segmentValue));
      } else if (segmentType === 'bool' || segmentType === 'boolean') {
        // Enhanced boolean conversion to match Python SDK
        if (typeof userValue === 'boolean') {
          userVal = userValue;
        } else {
          userVal = ['true', '1', 'yes'].includes(String(userValue).toLowerCase());
        }

        if (typeof segmentValue === 'boolean') {
          segVal = segmentValue;
        } else {
          segVal = ['true', '1', 'yes'].includes(String(segmentValue).toLowerCase());
        }
      } else {
        // str or string
        userVal = String(userValue);
        segVal = String(segmentValue);
      }

      // Apply comparator
      switch (comparator) {
        case '==': return userVal === segVal;
        case '!=': return userVal !== segVal;
        case '>': return userVal > segVal;
        case '<': return userVal < segVal;
        case '>=': return userVal >= segVal;
        case '<=': return userVal <= segVal;
        case 'contains': return String(userVal).includes(String(segVal));
        default: return false;
      }

    } catch (error) {
      return false;
    }
  }

  private convertValue(value: any, valueType: string): any {
    try {
      switch (valueType) {
        case 'bool':
          if (typeof value === 'boolean') return value;
          return ['true', '1', 'yes'].includes(String(value).toLowerCase());
        case 'int':
          const intVal = parseInt(String(parseFloat(String(value))), 10);
          return isNaN(intVal) ? this.getDefaultValue(valueType) : intVal;
        case 'float':
          const floatVal = parseFloat(String(value));
          return isNaN(floatVal) ? this.getDefaultValue(valueType) : floatVal;
        case 'json':
          if (typeof value === 'object') return value;
          return JSON.parse(String(value));
        default:
          return String(value);
      }
    } catch (error) {
      return this.getDefaultValue(valueType);
    }
  }

  private getDefaultValue(valueType: string): any {
    const defaults: Record<string, any> = {
      bool: false,
      int: 0,
      float: 0.0,
      json: {},
      string: ''
    };
    return defaults[valueType] || '';
  }

  private async createHash(data: string): Promise<string> {
    if (typeof window !== 'undefined') {
      // Browser environment
      const hash = crypto.createHash('sha256');
      return await hash.update(data).digest('hex');
    } else {
      // Node.js environment
      return crypto.createHash('sha256').update(data).digest('hex');
    }
  }

  private logAccess(userId: string, flagName: string, flagValue: any, evaluationContext: EvaluationContext, 
                   evaluationTimeMs: number, segments?: Record<string, any>): void {
    if (!this.enableMetrics) return;

    const logEntry: LogEntry = {
      user_id: userId,
      flag_name: flagName,
      flag_value: flagValue,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      evaluation_time_ms: evaluationTimeMs,
      evaluation_context: evaluationContext,
      segments: segments || {},
      metadata: {
        sdk_version: SDK_VERSION,
        environment: this.environment
      }
    };

    if (this.logsQueue.length < 1000) { // Prevent memory bloat
      this.logsQueue.push(logEntry);
    }

    // Update statistics
    this.stats.total_user_accesses++;
    this.stats.unique_users.add(userId);
    this.stats.unique_flags_accessed.add(flagName);

    // Cleanup stats periodically
    if (this.stats.total_user_accesses % 1000 === 0) {
      this.cleanupOldStats();
    }
  }

  private getSessionMetadata(): SessionMetadata {
    const evalTimes = this.stats.evaluation_times;
    const avgMs = evalTimes.count > 0 ? evalTimes.total_ms / evalTimes.count : 0;

    return {
      session_id: this.sessionId,
      environment: {
        name: this.environment
      },
      system_info: this.systemInfo,
      stats: {
        total_user_accesses: this.stats.total_user_accesses,
        unique_users_count: this.stats.unique_users.size,
        unique_flags_count: this.stats.unique_flags_accessed.size,
        segment_matches: this.stats.segment_matches,
        rollout_evaluations: this.stats.rollout_evaluations,
        evaluation_times: {
          avg_ms: avgMs,
          min_ms: evalTimes.min_ms === Infinity ? 0 : evalTimes.min_ms,
          max_ms: evalTimes.max_ms,
          total_ms: evalTimes.total_ms,
          count: evalTimes.count
        }
      }
    };
  }

  private async uploadLogs(): Promise<void> {
    if (this.offlineMode || this.logsQueue.length === 0 || !this.checkCircuitBreaker()) {
      return;
    }

    const logs = this.logsQueue.splice(0, 100); // Upload in batches of 100
    if (logs.length === 0) return;

    try {
      const url = `${this.apiBaseUrl}/v1/logs/batch/`;
      const payload = {
        logs,
        session_metadata: this.getSessionMetadata()
      };
      const payloadStr = JSON.stringify(payload);
      const headers = await this.getHeaders(payloadStr);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await globalFetch(url, {
        method: 'POST',
        headers,
        body: payloadStr,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.recordApiSuccess();
      this.stats.last_log_upload = new Date().toISOString();
      logger.debug(`Uploaded ${logs.length} log entries`);

    } catch (error: any) {
      this.recordApiFailure();
      logger.error(`Failed to upload logs: ${error.message}`);
      
      // Put logs back in queue for retry (limit to prevent memory bloat)
      if (logs.length <= 10) {
        this.logsQueue.unshift(...logs);
      }
    }
  }

  private async pollingWorker(): Promise<void> {
    try {
      const oldFlags = new Map(this.flags);
      const newFlags = await this.fetchFlags();

      if (Object.keys(newFlags).length > 0) {
        // Detect changes for callbacks
        if (this.onFlagChange) {
          for (const [flagName, newFlagData] of Object.entries(newFlags)) {
            const oldFlagData = oldFlags.get(flagName);
            const oldValue = oldFlagData?.value;
            const newValue = newFlagData.value;

            if (oldValue !== newValue) {
              try {
                this.onFlagChange(flagName, oldValue, newValue);
              } catch (error: any) {
                logger.error(`Error in flag change callback: ${error.message}`);
              }
            }
          }
        }

        // Update flags
        for (const [flagName, flagData] of Object.entries(newFlags)) {
          this.flags.set(flagName, flagData);
        }

        this.stats.last_sync = new Date().toISOString();
        logger.debug('Updated flags from polling');
      }
    } catch (error: any) {
      logger.error(`Error in polling worker: ${error.message}`);
    }
  }

  private async initialize(): Promise<void> {
    try {
      if (!this.offlineMode) {
        // Initial fetch
        const initialFlags = await this.fetchFlags();
        for (const [flagName, flagData] of Object.entries(initialFlags)) {
          this.flags.set(flagName, flagData);
        }

        // Start background polling
        this.pollingInterval = setInterval(() => {
          this.pollingWorker();
        }, POLLING_INTERVAL);

        // Start log upload if metrics enabled
        if (this.enableMetrics) {
          this.logUploadInterval = setInterval(() => {
            this.uploadLogs();
          }, LOG_UPLOAD_INTERVAL);
        }
      }

      this.initializationComplete = true;
      logger.info('SDK initialized successfully');
      this.emit('ready');
    } catch (error: any) {
      logger.warn(`SDK initialization failed: ${error.message}, continuing in degraded mode`);
      this.initializationComplete = true;
      this.emit('error', error);
    }
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private async waitForInitialization(timeout = 5000): Promise<void> {
    if (this.initializationComplete) return;

    return new Promise(resolve => {
      const timeoutId = setTimeout(resolve, timeout);
      this.once('ready', () => {
        clearTimeout(timeoutId);
        resolve();
      });
      this.once('error', () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  // Public methods

  async get(userId: string, flagName: string, defaultValue: any = null, segments?: Record<string, any>): Promise<any> {
    // Wait for initialization if still in progress
    await this.waitForInitialization();

    // Validate inputs
    try {
      userId = this.validateUserId(userId);
      flagName = this.validateFlagName(flagName);
    } catch (error: any) {
      logger.error(`Input validation failed: ${error.message}`);
      return defaultValue;
    }

    // Sanitize segments
    if (segments) {
      const cleanSegments: Record<string, any> = {};
      for (const [key, value] of Object.entries(segments)) {
        if (typeof key === 'string' && key.length <= 128) {
          try {
            const cleanKey = this.validateString(key, 'segment_key', 128);
            cleanSegments[cleanKey] = value;
          } catch {
            continue;
          }
        }
      }
      segments = cleanSegments;
    }

    // Rate limiting (skip in offline mode)
    if (!this.offlineMode && !this.rateLimitCheck(userId)) {
      logger.warn(`Request blocked due to rate limiting: ${userId}`);
      return defaultValue;
    }

    const flagData = this.flags.get(flagName);

    let result: any;
    let evaluationContext: EvaluationContext;
    let evaluationTimeMs: number;

    if (!flagData) {
      // Flag not found, return default
      result = defaultValue;
      evaluationContext = {
        flag_found: false,
        flag_active: false,
        default_value_used: true,
        reason: 'flag_not_found',
        segments_matched: [],
        segments_evaluated: [],
        rollout_qualified: false
      };
      evaluationTimeMs = 0;
    } else {
      // Evaluate flag
      const [flagResult, context] = await this.evaluateFlag(flagData, userId, segments);
      result = flagResult;
      evaluationContext = context;
      evaluationTimeMs = context.total_sdk_time_ms || 0;

      // Use custom default if evaluation returned default and custom default provided
      if (evaluationContext.default_value_used && defaultValue !== null) {
        result = defaultValue;
      }
    }

    // Log the access
    this.logAccess(userId, flagName, result, evaluationContext, evaluationTimeMs, segments);

    return result;
  }

  async getBool(userId: string, flagName: string, defaultValue = false, segments?: Record<string, any>): Promise<boolean> {
    const value = await this.get(userId, flagName, defaultValue, segments);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
    return value != null ? Boolean(value) : defaultValue;
  }

  async getString(userId: string, flagName: string, defaultValue = '', segments?: Record<string, any>): Promise<string> {
    const value = await this.get(userId, flagName, defaultValue, segments);
    return value != null ? String(value) : defaultValue;
  }

  async getInt(userId: string, flagName: string, defaultValue = 0, segments?: Record<string, any>): Promise<number> {
    const value = await this.get(userId, flagName, defaultValue, segments);
    try {
      if (value == null) return defaultValue;
      const parsed = parseInt(String(parseFloat(String(value))), 10);
      return isNaN(parsed) ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  }

  async getFloat(userId: string, flagName: string, defaultValue = 0.0, segments?: Record<string, any>): Promise<number> {
    const value = await this.get(userId, flagName, defaultValue, segments);
    try {
      if (value == null) return defaultValue;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  }

  async getJson(userId: string, flagName: string, defaultValue: any = {}, segments?: Record<string, any>): Promise<any> {
    const value = await this.get(userId, flagName, defaultValue, segments);

    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }

    return defaultValue;
  }

  async isFlagEnabledForUser(userId: string, flagName: string, segments?: Record<string, any>): Promise<boolean> {
    return this.getBool(userId, flagName, false, segments);
  }

  async getUserFlags(userId: string, segments?: Record<string, any>, flagKeys?: string[]): Promise<Record<string, any>> {
    try {
      userId = this.validateUserId(userId);
    } catch (error: any) {
      logger.error(`Invalid userId: ${error.message}`);
      return {};
    }

    const userFlags: Record<string, any> = {};

    try {
      let flagsToEvaluate = Array.from(this.flags.entries());
      
      if (flagKeys) {
        const validatedKeys: string[] = [];
        for (const key of flagKeys) {
          try {
            validatedKeys.push(this.validateFlagName(key));
          } catch {
            continue;
          }
        }
        flagsToEvaluate = flagsToEvaluate.filter(([key]) => validatedKeys.includes(key));
      }

      for (const [flagKey, flagData] of flagsToEvaluate) {
        try {
          const [flagValue, evaluationContext] = await this.evaluateFlag(flagData, userId, segments);
          userFlags[flagKey] = flagValue;

          // Log each flag access
          const evaluationTimeMs = evaluationContext.total_sdk_time_ms || 0;
          this.logAccess(userId, flagKey, flagValue, evaluationContext, evaluationTimeMs, segments);
        } catch (error: any) {
          logger.error(`Error evaluating flag ${flagKey} for user ${userId}: ${error.message}`);
          // Set default based on flag type
          userFlags[flagKey] = this.getDefaultValue(flagData.type);
        }
      }
    } catch (error: any) {
      logger.error(`Error accessing flags for user flags: ${error.message}`);
      return {};
    }

    return userFlags;
  }

  getAllFlags(): Record<string, FlagData> {
    const result: Record<string, FlagData> = {};
    for (const [name, data] of this.flags.entries()) {
      result[name] = { ...data };
    }
    return result;
  }

  async refreshFlags(): Promise<boolean> {
    if (this.offlineMode) {
      logger.warn('Cannot refresh flags in offline mode');
      return false;
    }

    try {
      const newFlags = await this.fetchFlags();
      if (Object.keys(newFlags).length > 0) {
        for (const [flagName, flagData] of Object.entries(newFlags)) {
          this.flags.set(flagName, flagData);
        }
        this.stats.last_sync = new Date().toISOString();
        logger.info('Flags manually refreshed');
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error(`Manual refresh failed: ${error.message}`);
      return false;
    }
  }

  async flushLogs(): Promise<boolean> {
    if (this.offlineMode || !this.enableMetrics) {
      logger.warn('Cannot flush logs in offline mode or with metrics disabled');
      return false;
    }

    try {
      await this.uploadLogs();
      logger.info('Logs manually flushed');
      return true;
    } catch (error: any) {
      logger.error(`Manual log flush failed: ${error.message}`);
      return false;
    }
  }

  getStats(): SDKStats {
    try {
      const evalTimes = this.stats.evaluation_times;
      const avgMs = evalTimes.count > 0 ? evalTimes.total_ms / evalTimes.count : 0;

      return {
        total_user_accesses: this.stats.total_user_accesses,
        unique_users_count: this.stats.unique_users.size,
        unique_flags_count: this.stats.unique_flags_accessed.size,
        segment_matches: this.stats.segment_matches,
        rollout_evaluations: this.stats.rollout_evaluations,
        last_sync: this.stats.last_sync,
        last_log_upload: this.stats.last_log_upload,
        api_calls: { ...this.stats.api_calls },
        errors: { ...this.stats.errors },
        session_id: this.sessionId,
        cached_flags_count: this.flags.size,
        pending_user_logs: this.logsQueue.length,
        circuit_breaker: {
          state: this.circuitBreaker.state,
          failure_count: this.circuitBreaker.failure_count
        },
        evaluation_times: {
          avg_ms: avgMs,
          min_ms: evalTimes.min_ms === Infinity ? 0 : evalTimes.min_ms,
          max_ms: evalTimes.max_ms,
          total_ms: evalTimes.total_ms,
          count: evalTimes.count
        },
        configuration: {
          polling_interval: POLLING_INTERVAL,
          log_upload_interval: LOG_UPLOAD_INTERVAL,
          offline_mode: this.offlineMode,
          enable_metrics: this.enableMetrics,
          environment: this.environment
        }
      };
    } catch (error: any) {
      logger.error(`Error getting stats: ${error.message}`);
      return {
        error: error.message
      } as any;
    }
  }

  getHealthCheck(): HealthCheck {
    try {
      return {
        status: this.circuitBreaker.state !== 'open' ? 'healthy' : 'degraded',
        sdk_version: SDK_VERSION,
        api_base_url: this.apiBaseUrl,
        cached_flags_count: this.flags.size,
        session_id: this.sessionId,
        environment: this.environment,
        offline_mode: this.offlineMode,
        last_sync: this.stats.last_sync,
        circuit_breaker: {
          state: this.circuitBreaker.state,
          failure_count: this.circuitBreaker.failure_count
        },
        system_info: {
          platform: this.systemInfo.platform,
          node_version: this.systemInfo.node_version,
          hostname: this.systemInfo.hostname
        },
        initialization_complete: this.initializationComplete
      };
    } catch (error: any) {
      logger.error(`Error getting health check: ${error.message}`);
      return {
        status: 'error',
        error: error.message
      } as any;
    }
  }

  shutdown(): void {
    logger.info('Shutting down SDK...');

    // Clear intervals
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    if (this.logUploadInterval) {
      clearInterval(this.logUploadInterval);
      this.logUploadInterval = undefined;
    }

    // Upload remaining logs
    if (this.enableMetrics && !this.offlineMode) {
      this.uploadLogs().catch(error => {
        logger.warn(`Error during final log upload: ${error.message}`);
      });
    }

    logger.info('SDK shutdown complete');
    this.emit('shutdown');
  }
}

// Utility functions for production deployment

export function validateProductionConfig(config: SDKConfig): string[] {
  const warnings: string[] = [];

  if (config.apiBaseUrl?.startsWith('http://')) {
    warnings.push('Using HTTP instead of HTTPS - security risk');
  }

  if ((config.timeout || 30000) < 5000) {
    warnings.push('Timeout too low - may cause instability');
  }

  if (!config.clientSecret) {
    warnings.push('Missing client secret');
  }

  const clientSecret = config.clientSecret || '';
  if (clientSecret.length < 32) {
    warnings.push('Client secret appears to be weak');
  }

  return warnings;
}

export function createProductionClient(clientId: string, clientSecret: string, environment: string, config: Partial<SDKConfig> = {}): FeatureFlagsHQSDK {
  const secureConfig: SDKConfig = {
    timeout: 30000,
    maxRetries: 3,
    offlineMode: false,
    enableMetrics: true,
    ...config,
    clientId,
    clientSecret,
    environment
  };

  // Validate configuration
  const warnings = validateProductionConfig(secureConfig);
  if (warnings.length > 0) {
    for (const warning of warnings) {
      logger.warn(`Configuration warning: ${warning}`);
    }
  }

  // Create SDK instance
  const sdk = new FeatureFlagsHQSDK(secureConfig);

  logger.info(`Secure ${COMPANY_NAME} SDK initialized with production configuration`);
  return sdk;
}