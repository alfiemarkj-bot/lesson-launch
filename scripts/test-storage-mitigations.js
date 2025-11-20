#!/usr/bin/env node

/**
 * Test script for storage mitigations
 * 
 * Usage:
 *   node scripts/test-storage-mitigations.js [test-name]
 * 
 * Tests:
 *   - health: Test storage health check endpoint
 *   - quota: Test storage quota monitoring
 *   - upload: Test upload with retry mechanism
 *   - cleanup: Test cleanup endpoints
 *   - all: Run all tests
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // Set this in .env for authenticated tests

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n📊 Testing Storage Health Check...', 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/health/storage`);
    
    if (response.status === 200) {
      log('✅ Health check endpoint accessible', 'green');
      
      if (response.data.healthy) {
        log('✅ Storage is healthy', 'green');
        log(`   Bucket exists: ${response.data.bucketExists}`, 'blue');
        
        if (response.data.quota) {
          log(`   Storage usage: ${response.data.quota.usagePercent.toFixed(1)}%`, 'blue');
          if (response.data.quota.warning) {
            log(`   ⚠️  ${response.data.quota.warning}`, 'yellow');
          }
        }
      } else {
        log('❌ Storage is unhealthy', 'red');
        log(`   Error: ${response.data.error}`, 'red');
      }
      
      return response.data.healthy;
    } else {
      log(`❌ Health check failed with status ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
    return false;
  }
}

async function testQuotaMonitoring() {
  log('\n📈 Testing Storage Quota Monitoring...', 'cyan');
  
  if (!TEST_TOKEN) {
    log('⚠️  Skipping quota test - TEST_TOKEN not set in .env', 'yellow');
    return false;
  }
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/storage/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      log('✅ Quota monitoring endpoint accessible', 'green');
      
      const { usage, quota } = response.data;
      log(`   Total files: ${usage.totalFiles}`, 'blue');
      log(`   Estimated size: ${usage.estimatedSizeMB.toFixed(2)} MB`, 'blue');
      log(`   Usage: ${quota.usagePercent.toFixed(1)}%`, 'blue');
      log(`   Healthy: ${quota.isHealthy ? 'Yes' : 'No'}`, quota.isHealthy ? 'green' : 'red');
      
      if (quota.warning) {
        log(`   ⚠️  ${quota.warning}`, 'yellow');
      }
      
      return true;
    } else {
      log(`❌ Quota monitoring failed with status ${response.status}`, 'red');
      if (response.data.error) {
        log(`   Error: ${response.data.error}`, 'red');
      }
      return false;
    }
  } catch (error) {
    log(`❌ Quota monitoring error: ${error.message}`, 'red');
    return false;
  }
}

async function testGeneralHealth() {
  log('\n🏥 Testing General Health Endpoint...', 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    
    if (response.status === 200) {
      log('✅ General health endpoint accessible', 'green');
      
      if (response.data.services && response.data.services.storage) {
        const storage = response.data.services.storage;
        log(`   Storage health: ${storage.healthy ? 'Healthy' : 'Unhealthy'}`, 
            storage.healthy ? 'green' : 'red');
        
        if (!storage.healthy && storage.error) {
          log(`   Error: ${storage.error}`, 'red');
        }
      }
      
      return true;
    } else {
      log(`❌ Health endpoint failed with status ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health endpoint error: ${error.message}`, 'red');
    return false;
  }
}

async function testCleanupEndpoint() {
  log('\n🧹 Testing Cleanup Endpoint...', 'cyan');
  
  if (!TEST_TOKEN) {
    log('⚠️  Skipping cleanup test - TEST_TOKEN not set in .env', 'yellow');
    return false;
  }
  
  try {
    // Test user cleanup endpoint (should work but may return 0 files)
    const response = await makeRequest(`${BASE_URL}/api/storage/cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: {
        daysOld: 90
      }
    });
    
    if (response.status === 200 && response.data.success) {
      log('✅ Cleanup endpoint accessible', 'green');
      log(`   Deleted: ${response.data.deleted} files`, 'blue');
      log(`   Errors: ${response.data.errors}`, response.data.errors === 0 ? 'green' : 'yellow');
      return true;
    } else {
      log(`❌ Cleanup endpoint failed with status ${response.status}`, 'red');
      if (response.data.error) {
        log(`   Error: ${response.data.error}`, 'red');
      }
      return false;
    }
  } catch (error) {
    log(`❌ Cleanup endpoint error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Running All Storage Mitigation Tests\n', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const results = {
    health: await testGeneralHealth(),
    storageHealth: await testHealthCheck(),
    quota: await testQuotaMonitoring(),
    cleanup: await testCleanupEndpoint()
  };
  
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📋 Test Results Summary:', 'cyan');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const color = result ? 'green' : 'red';
    log(`   ${icon} ${test}: ${result ? 'PASSED' : 'FAILED'}`, color);
  });
  
  log(`\n   Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }
  
  return passed === total;
}

// Main execution
const testName = process.argv[2] || 'all';

(async () => {
  try {
    let result = false;
    
    switch (testName) {
      case 'health':
        result = await testHealthCheck();
        break;
      case 'quota':
        result = await testQuotaMonitoring();
        break;
      case 'cleanup':
        result = await testCleanupEndpoint();
        break;
      case 'general':
        result = await testGeneralHealth();
        break;
      case 'all':
        result = await runAllTests();
        break;
      default:
        log(`❌ Unknown test: ${testName}`, 'red');
        log('Available tests: health, quota, cleanup, general, all', 'yellow');
        process.exit(1);
    }
    
    process.exit(result ? 0 : 1);
  } catch (error) {
    log(`\n❌ Test execution error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();

