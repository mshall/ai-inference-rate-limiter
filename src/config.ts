/**
 * Configuration loader for reading properties from config.properties file
 */

import * as fs from 'fs';
import * as path from 'path';

interface RateLimitConfig {
  requestsPerHour: number;
  windowSeconds: number;
}

class ConfigLoader {
  private static config: RateLimitConfig | null = null;

  /**
   * Load configuration from properties file
   */
  static loadConfig(): RateLimitConfig {
    if (this.config) {
      return this.config;
    }

    const propertiesPath = path.join(__dirname, '..', 'config.properties');
    
    try {
      const propertiesContent = fs.readFileSync(propertiesPath, 'utf-8');
      const properties: Record<string, string> = {};

      // Parse properties file (simple key=value format)
      propertiesContent.split('\n').forEach((line) => {
        const trimmedLine = line.trim();
        // Skip empty lines and comments
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const equalIndex = trimmedLine.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            properties[key] = value;
          }
        }
      });

      // Extract rate limit configuration
      const requestsPerHour = parseInt(
        properties['rate.limit.requests.per.hour'] || '100',
        10
      );
      const windowSeconds = parseInt(
        properties['rate.limit.window.seconds'] || '3600',
        10
      );

      this.config = {
        requestsPerHour,
        windowSeconds,
      };

      return this.config;
    } catch (error) {
      console.warn(
        `Warning: Could not load config.properties file at ${propertiesPath}. Using default values.`,
        error
      );
      // Return default values if file cannot be read
      this.config = {
        requestsPerHour: 100,
        windowSeconds: 3600,
      };
      return this.config;
    }
  }

  /**
   * Get rate limit configuration
   */
  static getRateLimitConfig(): RateLimitConfig {
    return this.loadConfig();
  }
}

export { ConfigLoader, RateLimitConfig };

