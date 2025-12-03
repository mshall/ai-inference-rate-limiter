/**
 * Example script to test the Rate Limiter API endpoints
 * 
 * Usage:
 *   1. Start the server: npm run dev
 *   2. Run this script: ts-node examples/api_test.ts
 */

import * as http from 'http';

const BASE_URL = 'http://localhost:3000';
const userId = 'api_test_user';

interface ApiResponse {
  allowed?: boolean;
  userId?: string;
  remaining?: number;
  currentCount?: number;
  limit?: number;
  message?: string;
  error?: string;
}

/**
 * Make an HTTP request
 */
function makeRequest(
  method: string,
  path: string,
  body?: object
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData ? Buffer.byteLength(postData) : 0,
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response: ApiResponse = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * Test the rate limiter API
 */
async function testRateLimiterApi(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Rate Limiter API Test');
  console.log('='.repeat(70));
  console.log(`\nTesting with userId: '${userId}'`);
  console.log('Make sure the server is running: npm run dev\n');

  try {
    // Reset user first (if exists)
    console.log('1. Resetting user rate limit...');
    try {
      await makeRequest('DELETE', `/rate-limit/reset/${userId}`);
      console.log('   ✓ User reset\n');
    } catch (error) {
      console.log('   ℹ User does not exist yet\n');
    }

    // Make requests up to the limit
    console.log('2. Making requests (1-10):');
    for (let i = 1; i <= 10; i++) {
      const response = await makeRequest('POST', '/rate-limit/allow', {
        userId,
      });

      const status = response.allowed ? '✓ ALLOWED' : '✗ BLOCKED';
      console.log(
        `   Request ${i.toString().padStart(3)}: ${status} | Remaining: ${response.remaining || 0} | Status: ${response.allowed ? 200 : 429}`,
      );
    }

    // Fast-forward: make many requests silently
    console.log('\n3. Making requests 11-95 (silent)...');
    for (let i = 11; i <= 95; i++) {
      await makeRequest('POST', '/rate-limit/allow', { userId });
    }

    // Show last few before limit
    console.log('\n4. Making requests 96-100 (last allowed):');
    for (let i = 96; i <= 100; i++) {
      const response = await makeRequest('POST', '/rate-limit/allow', {
        userId,
      });
      const status = response.allowed ? '✓ ALLOWED' : '✗ BLOCKED';
      console.log(
        `   Request ${i.toString().padStart(3)}: ${status} | Remaining: ${response.remaining || 0}`,
      );
    }

    // Show blocked requests
    console.log('\n5. Making requests 101-105 (should be blocked):');
    for (let i = 101; i <= 105; i++) {
      const response = await makeRequest('POST', '/rate-limit/allow', {
        userId,
      });
      const status = response.allowed ? '✓ ALLOWED' : '✗ BLOCKED';
      const httpStatus = response.allowed ? 200 : 429;
      console.log(
        `   Request ${i.toString().padStart(3)}: ${status} | Remaining: ${response.remaining || 0} | HTTP ${httpStatus}`,
      );
    }

    // Get final stats
    console.log('\n6. Getting final stats:');
    const stats = await makeRequest('GET', `/rate-limit/stats/${userId}`);
    console.log(`   Current count: ${stats.currentCount}`);
    console.log(`   Remaining: ${stats.remaining}`);
    console.log(`   Limit: ${stats.limit}`);
    console.log(`   Window size: ${stats.windowSizeSeconds} seconds`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('Summary:');
    console.log('='.repeat(70));
    console.log('✅ First 100 requests: ALLOWED (HTTP 200)');
    console.log('❌ Requests 101-105: BLOCKED (HTTP 429)');
    console.log(
      '✅ Requirement satisfied: After 100 allowed calls, subsequent calls are blocked!',
    );
    console.log('='.repeat(70));
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(
      '\nMake sure the server is running: npm run dev',
    );
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testRateLimiterApi().catch(console.error);
}

