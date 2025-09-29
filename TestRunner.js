/**
 * Main Test Runner
 * 
 * This file contains the main test runner functions that execute all test suites
 * and provide comprehensive test reporting for the Calendar Summary project.
 */

/**
 * Runs all unit tests
 * Execute this function to run all unit tests for individual functions
 */
function runAllUnitTests() {
  const runner = new TestRunner();
  
  Logger.log('🧪 Starting Unit Test Suite');
  Logger.log('='.repeat(60));
  
  // Add all unit test suites
  runner.addSuite(createValidationTestSuite());
  runner.addSuite(createConfigurationValidationTestSuite());
  runner.addSuite(createDateTimeTestSuite());
  runner.addSuite(createFrequencyTestSuite());
  runner.addSuite(createEmailGenerationTestSuite());
  runner.addSuite(createEventFilteringTestSuite());
  runner.addSuite(createExecutionTrackerTestSuite());
  
  return runner.runAll();
}

/**
 * Runs all integration tests
 * Execute this function to run integration tests for complex workflows
 */
function runAllIntegrationTests() {
  const runner = new TestRunner();
  
  Logger.log('🔧 Starting Integration Test Suite');
  Logger.log('='.repeat(60));
  
  // Add all integration test suites
  runner.addSuite(createConfigurationIntegrationTestSuite());
  runner.addSuite(createCalendarBatchingIntegrationTestSuite());
  runner.addSuite(createEmailSendingIntegrationTestSuite());
  runner.addSuite(createEndToEndIntegrationTestSuite());
  
  return runner.runAll();
}

/**
 * Runs the complete test suite - both unit and integration tests
 * This is the main function to execute for comprehensive testing
 */
function runAllTests() {
  Logger.log('🚀 Starting Complete Test Suite');
  Logger.log('Calendar Summary Script - Comprehensive Testing');
  Logger.log('='.repeat(80));
  
  const startTime = new Date();
  const results = {
    unitTests: null,
    integrationTests: null,
    totalPassed: 0,
    totalFailed: 0,
    totalDuration: 0,
    success: false
  };
  
  try {
    // Run unit tests
    Logger.log('\n📋 PHASE 1: Unit Tests');
    Logger.log('-'.repeat(40));
    results.unitTests = runAllUnitTests();
    
    Logger.log('\n🔗 PHASE 2: Integration Tests');
    Logger.log('-'.repeat(40));
    results.integrationTests = runAllIntegrationTests();
    
    // Calculate totals
    results.totalPassed = (results.unitTests?.totalPassed || 0) + (results.integrationTests?.totalPassed || 0);
    results.totalFailed = (results.unitTests?.totalFailed || 0) + (results.integrationTests?.totalFailed || 0);
    results.totalDuration = new Date() - startTime;
    results.success = results.totalFailed === 0;
    
    // Final report
    Logger.log('\n' + '='.repeat(80));
    Logger.log('🏁 COMPREHENSIVE TEST RESULTS');
    Logger.log('='.repeat(80));
    
    Logger.log(`📊 SUMMARY:`);
    Logger.log(`   Total Test Suites: ${results.unitTests.totalSuites + results.integrationTests.totalSuites}`);
    Logger.log(`   Total Tests Passed: ${results.totalPassed}`);
    Logger.log(`   Total Tests Failed: ${results.totalFailed}`);
    Logger.log(`   Total Duration: ${Math.round(results.totalDuration)}ms`);
    Logger.log(`   Success Rate: ${Math.round((results.totalPassed / (results.totalPassed + results.totalFailed)) * 100)}%`);
    
    Logger.log(`\n📋 UNIT TESTS: ${results.unitTests?.totalPassed || 0} passed, ${results.unitTests?.totalFailed || 0} failed`);
    Logger.log(`🔗 INTEGRATION TESTS: ${results.integrationTests?.totalPassed || 0} passed, ${results.integrationTests?.totalFailed || 0} failed`);
    
    if (results.success) {
      Logger.log('\n🎉 ALL TESTS PASSED! 🎉');
      Logger.log('✅ The Calendar Summary Script is ready for production deployment.');
    } else {
      Logger.log('\n⚠️  SOME TESTS FAILED');
      Logger.log('❌ Please review the test failures above before deployment.');
      
      // List failed test suites
      const failedSuites = [
        ...(results.unitTests?.suiteResults?.filter(s => s.failed > 0) || []),
        ...(results.integrationTests?.suiteResults?.filter(s => s.failed > 0) || [])
      ];
      
      if (failedSuites.length > 0) {
        Logger.log('\n📝 Failed Test Suites:');
        failedSuites.forEach(suite => {
          Logger.log(`   ❌ ${suite.suiteName}: ${suite.failed} failures`);
        });
      }
    }
    
    Logger.log('='.repeat(80));
    
  } catch (error) {
    Logger.log(`\n💥 CRITICAL TEST FAILURE: ${error.message}`);
    Logger.log('Stack trace:');
    Logger.log(error.stack || 'No stack trace available');
    results.success = false;
  }
  
  return results;
}

/**
 * Runs a quick smoke test to verify basic functionality
 * Use this for rapid verification after code changes
 */
function runSmokeTests() {
  const runner = new TestRunner();
  
  Logger.log('💨 Running Smoke Tests (Quick Verification)');
  Logger.log('='.repeat(50));
  
  // Create a minimal test suite with critical tests
  const smokeTestSuite = new TestSuite('Smoke Tests');
  
  smokeTestSuite.test('Configuration can be loaded', () => {
    // Mock minimal config
    this.Config = {
      get: (key) => key === 'SPREADSHEET_ID' ? 'test-id' : 'Config'
    };
    
    this.SpreadsheetApp = {
      openById: () => ({
        getSheetByName: () => ({
          getDataRange: () => ({
            getValues: () => [
              ['Recipient Email', 'Calendar ID'],
              ['test@example.com', 'test@gmail.com']
            ]
          })
        })
      })
    };
    
    const result = loadConfiguration();
    Assert.truthy(result, 'Should load configuration');
    Assert.truthy(result.recipients, 'Should have recipients');
  });
  
  smokeTestSuite.test('Email validation works', () => {
    const valid = validateRecipientData('user@example.com', 'cal@gmail.com');
    Assert.true(valid.isValid, 'Should validate correct email');
    
    const invalid = validateRecipientData('bad-email', 'bad-calendar');
    Assert.false(invalid.isValid, 'Should reject invalid email');
  });
  
  smokeTestSuite.test('Date range calculation works', () => {
    const result = calculateDateRange('today');
    Assert.truthy(result.startDate, 'Should have start date');
    Assert.truthy(result.endDate, 'Should have end date');
    Assert.equal(result.description, 'today', 'Should have correct description');
  });
  
  smokeTestSuite.test('Event filtering works', () => {
    const events = [
      MockUtilities.createMockEvent('Meeting', new Date(), new Date(), '', 'important'),
      MockUtilities.createMockEvent('Personal', new Date(), new Date(), '', 'personal')
    ];
    
    const filtered = filterEventsByKeywords(events, ['important']);
    Assert.equal(filtered.length, 1, 'Should filter to 1 event');
  });
  
  smokeTestSuite.test('ExecutionTracker works', () => {
    const tracker = new ExecutionTracker();
    tracker.incrementCalendars();
    tracker.addEvents(5);
    
    Assert.equal(tracker.metrics.calendarsProcessed, 1, 'Should track calendars');
    Assert.equal(tracker.metrics.eventsFound, 5, 'Should track events');
  });
  
  runner.addSuite(smokeTestSuite);
  
  const results = runner.runAll();
  
  if (results.totalFailed === 0) {
    Logger.log('\n✅ SMOKE TESTS PASSED - Basic functionality verified');
  } else {
    Logger.log('\n❌ SMOKE TESTS FAILED - Basic functionality issues detected');
  }
  
  return results;
}

/**
 * Runs performance tests to verify the system can handle load
 */
function runPerformanceTests() {
  const suite = new TestSuite('Performance Tests');
  
  suite.test('Configuration loading with large dataset', () => {
    const startTime = Date.now();
    
    // Mock large dataset (100 recipients)
    const largeDataset = {
      headers: ['Recipient Email', 'Calendar ID'],
      rows: []
    };
    
    for (let i = 0; i < 100; i++) {
      largeDataset.rows.push([`user${i}@example.com`, `calendar${i}@gmail.com`]);
    }
    
    this.Config = {
      get: (key) => key === 'SPREADSHEET_ID' ? 'test-id' : 'Config'
    };
    
    this.SpreadsheetApp = {
      openById: () => ({
        getSheetByName: () => ({
          getDataRange: () => ({
            getValues: () => [largeDataset.headers, ...largeDataset.rows]
          })
        })
      })
    };
    
    const result = loadConfiguration();
    const duration = Date.now() - startTime;
    
    Assert.equal(result.recipients.length, 100, 'Should process all 100 recipients');
    Assert.true(duration < 5000, `Should complete within 5 seconds (took ${duration}ms)`);
    
    Logger.log(`Performance: Processed 100 recipients in ${duration}ms`);
  });
  
  suite.test('Event filtering with many events', () => {
    const startTime = Date.now();
    
    // Create 50 mock events
    const manyEvents = [];
    for (let i = 0; i < 50; i++) {
      manyEvents.push(
        MockUtilities.createMockEvent(
          `Event ${i}`,
          new Date(2023, 0, 1, 9 + (i % 8), 0),
          new Date(2023, 0, 1, 10 + (i % 8), 0),
          `Location ${i}`,
          i % 3 === 0 ? 'important meeting' : 'regular event'
        )
      );
    }
    
    const filtered = filterEventsByKeywords(manyEvents, ['important']);
    const duration = Date.now() - startTime;
    
    Assert.true(filtered.length > 0, 'Should find some important events');
    Assert.true(duration < 1000, `Should filter within 1 second (took ${duration}ms)`);
    
    Logger.log(`Performance: Filtered 50 events in ${duration}ms`);
  });
  
  const runner = new TestRunner();
  runner.addSuite(suite);
  
  Logger.log('⚡ Running Performance Tests');
  Logger.log('='.repeat(40));
  
  return runner.runAll();
}

/**
 * Utility function to run specific test suite by name
 * Useful for debugging specific functionality
 * 
 * @param {string} suiteName - Name of the test suite to run
 */
function runSpecificTestSuite(suiteName) {
  const runner = new TestRunner();
  
  const suiteMap = {
    'validation': createValidationTestSuite,
    'config-validation': createConfigurationValidationTestSuite,
    'datetime': createDateTimeTestSuite,
    'frequency': createFrequencyTestSuite,
    'email': createEmailGenerationTestSuite,
    'filtering': createEventFilteringTestSuite,
    'tracker': createExecutionTrackerTestSuite,
    'config-integration': createConfigurationIntegrationTestSuite,
    'calendar-batching': createCalendarBatchingIntegrationTestSuite,
    'email-integration': createEmailSendingIntegrationTestSuite,
    'end-to-end': createEndToEndIntegrationTestSuite
  };
  
  const suiteFactory = suiteMap[suiteName.toLowerCase()];
  if (!suiteFactory) {
    Logger.log(`❌ Unknown test suite: ${suiteName}`);
    Logger.log('Available test suites:');
    Object.keys(suiteMap).forEach(name => Logger.log(`  - ${name}`));
    return null;
  }
  
  Logger.log(`🎯 Running Specific Test Suite: ${suiteName}`);
  Logger.log('='.repeat(50));
  
  runner.addSuite(suiteFactory());
  return runner.runAll();
}

/**
 * Test configuration and setup verification
 * Run this to verify your test environment is set up correctly
 */
function verifyTestEnvironment() {
  Logger.log('🔍 Verifying Test Environment Setup');
  Logger.log('='.repeat(50));
  
  const checks = [];
  
  // Check if test framework is available
  try {
    const suite = new TestSuite('Test');
    checks.push({ name: 'TestSuite class', status: 'OK' });
  } catch (error) {
    checks.push({ name: 'TestSuite class', status: 'FAILED', error: error.message });
  }
  
  // Check if Assert utilities work
  try {
    Assert.equal(1, 1);
    checks.push({ name: 'Assert utilities', status: 'OK' });
  } catch (error) {
    checks.push({ name: 'Assert utilities', status: 'FAILED', error: error.message });
  }
  
  // Check if MockUtilities are available
  try {
    const mockEvent = MockUtilities.createMockEvent('Test', new Date(), new Date(), '', '');
    checks.push({ name: 'MockUtilities', status: 'OK' });
  } catch (error) {
    checks.push({ name: 'MockUtilities', status: 'FAILED', error: error.message });
  }
  
  // Check if TestFixtures are available
  try {
    const fixtures = TestFixtures.getValidSpreadsheetData();
    checks.push({ name: 'TestFixtures', status: 'OK' });
  } catch (error) {
    checks.push({ name: 'TestFixtures', status: 'FAILED', error: error.message });
  }
  
  // Check if main functions are available
  const functionsToCheck = [
    'validateRecipientData',
    'calculateDateRange',
    'shouldSendEmail',
    'formatEventTime',
    'generateEmailBody',
    'filterEventsByKeywords',
    'ExecutionTracker'
  ];
  
  for (const funcName of functionsToCheck) {
    try {
      const func = eval(funcName);
      if (typeof func === 'function' || typeof func === 'object') {
        checks.push({ name: `Function: ${funcName}`, status: 'OK' });
      } else {
        checks.push({ name: `Function: ${funcName}`, status: 'FAILED', error: 'Not a function' });
      }
    } catch (error) {
      checks.push({ name: `Function: ${funcName}`, status: 'FAILED', error: error.message });
    }
  }
  
  // Report results
  Logger.log('\n📊 Environment Check Results:');
  let allPassed = true;
  
  for (const check of checks) {
    if (check.status === 'OK') {
      Logger.log(`✅ ${check.name}`);
    } else {
      Logger.log(`❌ ${check.name}: ${check.error}`);
      allPassed = false;
    }
  }
  
  Logger.log('\n' + '='.repeat(50));
  if (allPassed) {
    Logger.log('🎉 Test environment is properly set up!');
    Logger.log('You can now run the full test suite with: runAllTests()');
  } else {
    Logger.log('⚠️  Test environment has issues. Please check the failed items above.');
  }
  
  return { passed: allPassed, checks };
}