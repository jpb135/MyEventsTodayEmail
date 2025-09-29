/**
 * Simple Testing Framework for Google Apps Script
 * 
 * This framework provides basic testing capabilities for Google Apps Script projects
 * where traditional testing frameworks are not available.
 */

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachFn = null;
    this.afterEachFn = null;
    this.beforeAllFn = null;
    this.afterAllFn = null;
  }
  
  beforeAll(fn) {
    this.beforeAllFn = fn;
  }
  
  beforeEach(fn) {
    this.beforeEachFn = fn;
  }
  
  afterEach(fn) {
    this.afterEachFn = fn;
  }
  
  afterAll(fn) {
    this.afterAllFn = fn;
  }
  
  test(description, testFn) {
    this.tests.push({ description, testFn });
  }
  
  async run() {
    const results = {
      suiteName: this.name,
      passed: 0,
      failed: 0,
      errors: [],
      startTime: new Date(),
      endTime: null
    };
    
    Logger.log(`\n🧪 Running test suite: ${this.name}`);
    Logger.log('=' .repeat(50));
    
    // Run beforeAll
    if (this.beforeAllFn) {
      try {
        await this.beforeAllFn();
      } catch (error) {
        Logger.log(`❌ beforeAll failed: ${error.message}`);
        results.errors.push(`beforeAll: ${error.message}`);
      }
    }
    
    // Run each test
    for (const test of this.tests) {
      try {
        // Run beforeEach
        if (this.beforeEachFn) {
          await this.beforeEachFn();
        }
        
        // Run the test
        await test.testFn();
        
        Logger.log(`✅ ${test.description}`);
        results.passed++;
        
        // Run afterEach
        if (this.afterEachFn) {
          await this.afterEachFn();
        }
        
      } catch (error) {
        Logger.log(`❌ ${test.description}`);
        Logger.log(`   Error: ${error.message}`);
        results.failed++;
        results.errors.push(`${test.description}: ${error.message}`);
      }
    }
    
    // Run afterAll
    if (this.afterAllFn) {
      try {
        await this.afterAllFn();
      } catch (error) {
        Logger.log(`❌ afterAll failed: ${error.message}`);
        results.errors.push(`afterAll: ${error.message}`);
      }
    }
    
    results.endTime = new Date();
    const duration = results.endTime - results.startTime;
    
    Logger.log('\n📊 Test Results:');
    Logger.log(`   Passed: ${results.passed}`);
    Logger.log(`   Failed: ${results.failed}`);
    Logger.log(`   Duration: ${duration}ms`);
    Logger.log('=' .repeat(50));
    
    return results;
  }
}

class TestRunner {
  constructor() {
    this.suites = [];
  }
  
  addSuite(suite) {
    this.suites.push(suite);
  }
  
  async runAll() {
    const overallResults = {
      totalSuites: this.suites.length,
      totalPassed: 0,
      totalFailed: 0,
      suiteResults: [],
      startTime: new Date(),
      endTime: null
    };
    
    Logger.log('\n🚀 Starting Test Runner');
    Logger.log('='.repeat(60));
    
    for (const suite of this.suites) {
      const result = await suite.run();
      overallResults.suiteResults.push(result);
      overallResults.totalPassed += result.passed;
      overallResults.totalFailed += result.failed;
    }
    
    overallResults.endTime = new Date();
    const totalDuration = overallResults.endTime - overallResults.startTime;
    
    Logger.log('\n🏁 FINAL RESULTS:');
    Logger.log('='.repeat(60));
    Logger.log(`Total Suites: ${overallResults.totalSuites}`);
    Logger.log(`Total Tests Passed: ${overallResults.totalPassed}`);
    Logger.log(`Total Tests Failed: ${overallResults.totalFailed}`);
    Logger.log(`Total Duration: ${totalDuration}ms`);
    
    // Summary by suite
    for (const suiteResult of overallResults.suiteResults) {
      const status = suiteResult.failed === 0 ? '✅' : '❌';
      Logger.log(`${status} ${suiteResult.suiteName}: ${suiteResult.passed} passed, ${suiteResult.failed} failed`);
    }
    
    if (overallResults.totalFailed === 0) {
      Logger.log('\n🎉 All tests passed!');
    } else {
      Logger.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }
    
    return overallResults;
  }
}

// Assertion utilities
class Assert {
  static equal(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
    }
  }
  
  static notEqual(actual, expected, message = '') {
    if (actual === expected) {
      throw new Error(`${message} Expected values to be different, but both were: ${actual}`);
    }
  }
  
  static strictEqual(actual, expected, message = '') {
    if (actual !== expected || typeof actual !== typeof expected) {
      throw new Error(`${message} Expected: ${expected} (${typeof expected}), Actual: ${actual} (${typeof actual})`);
    }
  }
  
  static true(actual, message = '') {
    if (actual !== true) {
      throw new Error(`${message} Expected: true, Actual: ${actual}`);
    }
  }
  
  static false(actual, message = '') {
    if (actual !== false) {
      throw new Error(`${message} Expected: false, Actual: ${actual}`);
    }
  }
  
  static truthy(actual, message = '') {
    if (!actual) {
      throw new Error(`${message} Expected truthy value, Actual: ${actual}`);
    }
  }
  
  static falsy(actual, message = '') {
    if (actual) {
      throw new Error(`${message} Expected falsy value, Actual: ${actual}`);
    }
  }
  
  static throws(fn, expectedError, message = '') {
    let thrown = false;
    let actualError = null;
    
    try {
      fn();
    } catch (error) {
      thrown = true;
      actualError = error;
    }
    
    if (!thrown) {
      throw new Error(`${message} Expected function to throw an error, but it didn't`);
    }
    
    if (expectedError && !actualError.message.includes(expectedError)) {
      throw new Error(`${message} Expected error to contain: ${expectedError}, Actual: ${actualError.message}`);
    }
  }
  
  static doesNotThrow(fn, message = '') {
    try {
      fn();
    } catch (error) {
      throw new Error(`${message} Expected function not to throw, but it threw: ${error.message}`);
    }
  }
  
  static arrayEqual(actual, expected, message = '') {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      throw new Error(`${message} Both values must be arrays`);
    }
    
    if (actual.length !== expected.length) {
      throw new Error(`${message} Array lengths differ. Expected: ${expected.length}, Actual: ${actual.length}`);
    }
    
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) {
        throw new Error(`${message} Arrays differ at index ${i}. Expected: ${expected[i]}, Actual: ${actual[i]}`);
      }
    }
  }
  
  static contains(haystack, needle, message = '') {
    if (typeof haystack === 'string') {
      if (!haystack.includes(needle)) {
        throw new Error(`${message} Expected string to contain: ${needle}, Actual: ${haystack}`);
      }
    } else if (Array.isArray(haystack)) {
      if (!haystack.includes(needle)) {
        throw new Error(`${message} Expected array to contain: ${needle}, Actual: ${JSON.stringify(haystack)}`);
      }
    } else {
      throw new Error(`${message} Unsupported type for contains assertion`);
    }
  }
  
  static notContains(haystack, needle, message = '') {
    if (typeof haystack === 'string') {
      if (haystack.includes(needle)) {
        throw new Error(`${message} Expected string not to contain: ${needle}, Actual: ${haystack}`);
      }
    } else if (Array.isArray(haystack)) {
      if (haystack.includes(needle)) {
        throw new Error(`${message} Expected array not to contain: ${needle}, Actual: ${JSON.stringify(haystack)}`);
      }
    } else {
      throw new Error(`${message} Unsupported type for notContains assertion`);
    }
  }
  
  static objectEqual(actual, expected, message = '') {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);
    
    if (actualStr !== expectedStr) {
      throw new Error(`${message} Objects are not equal.\nExpected: ${expectedStr}\nActual: ${actualStr}`);
    }
  }
}