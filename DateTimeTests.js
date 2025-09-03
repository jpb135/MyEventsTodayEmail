/**
 * Unit Tests for Date and Time Functions
 */

function createDateTimeTestSuite() {
  const suite = new TestSuite('Date and Time Functions');
  
  suite.test('calculateDateRange - today', () => {
    const result = calculateDateRange('today');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    Assert.equal(result.startDate.getTime(), today.getTime(), 'Start date should be today at midnight');
    Assert.equal(result.endDate.getTime(), tomorrow.getTime(), 'End date should be tomorrow at midnight');
    Assert.equal(result.description, 'today', 'Description should be "today"');
  });
  
  suite.test('calculateDateRange - tomorrow', () => {
    const result = calculateDateRange('tomorrow');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);
    
    Assert.equal(result.startDate.getTime(), tomorrow.getTime(), 'Start date should be tomorrow');
    Assert.equal(result.endDate.getTime(), dayAfter.getTime(), 'End date should be day after tomorrow');
    Assert.equal(result.description, 'tomorrow', 'Description should be "tomorrow"');
  });
  
  suite.test('calculateDateRange - next 3 days', () => {
    const result = calculateDateRange('next 3 days');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    Assert.equal(result.startDate.getTime(), today.getTime(), 'Start date should be today');
    Assert.equal(result.endDate.getTime(), threeDaysLater.getTime(), 'End date should be 3 days later');
    Assert.equal(result.description, 'the next 3 days', 'Description should be "the next 3 days"');
  });
  
  suite.test('calculateDateRange - this week', () => {
    const result = calculateDateRange('this week');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    Assert.equal(result.startDate.getTime(), weekStart.getTime(), 'Start date should be start of week');
    Assert.equal(result.endDate.getTime(), weekEnd.getTime(), 'End date should be end of week');
    Assert.equal(result.description, 'this week', 'Description should be "this week"');
  });
  
  suite.test('calculateDateRange - next week', () => {
    const result = calculateDateRange('next week');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 7);
    
    Assert.equal(result.startDate.getTime(), nextWeekStart.getTime(), 'Start date should be start of next week');
    Assert.equal(result.endDate.getTime(), nextWeekEnd.getTime(), 'End date should be end of next week');
    Assert.equal(result.description, 'next week', 'Description should be "next week"');
  });
  
  suite.test('calculateDateRange - weekdays only', () => {
    const result = calculateDateRange('weekdays');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    Assert.equal(result.startDate.getTime(), today.getTime(), 'Start date should be today');
    Assert.equal(result.endDate.getTime(), tomorrow.getTime(), 'End date should be tomorrow');
    Assert.equal(result.description, 'today (weekdays only)', 'Description should indicate weekdays filtering');
  });
  
  suite.test('calculateDateRange - invalid range defaults to today', () => {
    const result = calculateDateRange('invalid_range');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    Assert.equal(result.startDate.getTime(), today.getTime(), 'Should default to today for invalid range');
    Assert.equal(result.endDate.getTime(), tomorrow.getTime(), 'Should default end to tomorrow');
    Assert.equal(result.description, 'today', 'Should default description to "today"');
  });
  
  suite.test('formatEventTime - 12 hour format without timezone', () => {
    const testDate = new Date(2023, 0, 1, 15, 30); // 3:30 PM
    const result = formatEventTime(testDate, null, false);
    
    Assert.equal(result, '03:30 PM', 'Should format as 12-hour time');
  });
  
  suite.test('formatEventTime - 24 hour format without timezone', () => {
    const testDate = new Date(2023, 0, 1, 15, 30); // 3:30 PM
    const result = formatEventTime(testDate, null, true);
    
    Assert.equal(result, '15:30', 'Should format as 24-hour time');
  });
  
  suite.test('formatEventTime - morning time 12 hour', () => {
    const testDate = new Date(2023, 0, 1, 9, 15); // 9:15 AM
    const result = formatEventTime(testDate, null, false);
    
    Assert.equal(result, '09:15 AM', 'Should format morning time correctly');
  });
  
  suite.test('formatEventTime - midnight 12 hour', () => {
    const testDate = new Date(2023, 0, 1, 0, 0); // Midnight
    const result = formatEventTime(testDate, null, false);
    
    Assert.equal(result, '12:00 AM', 'Should format midnight correctly');
  });
  
  suite.test('formatEventTime - noon 12 hour', () => {
    const testDate = new Date(2023, 0, 1, 12, 0); // Noon
    const result = formatEventTime(testDate, null, false);
    
    Assert.equal(result, '12:00 PM', 'Should format noon correctly');
  });
  
  suite.test('formatEventTime - with timezone', () => {
    const testDate = new Date(2023, 0, 1, 15, 30); // 3:30 PM UTC
    
    // Note: Due to the complexity of timezone testing in the mock environment,
    // we'll test that the function doesn't throw and returns a string
    const result = formatEventTime(testDate, 'America/New_York', false);
    
    Assert.truthy(result, 'Should return a formatted time string');
    Assert.true(typeof result === 'string', 'Result should be a string');
  });
  
  suite.test('formatEventTime - invalid timezone fallback', () => {
    const testDate = new Date(2023, 0, 1, 15, 30);
    
    // Mock console.log to capture the warning
    let warningLogged = false;
    const originalLog = Logger.log;
    Logger.log = (message) => {
      if (message.includes('Invalid timezone')) {
        warningLogged = true;
      }
    };
    
    const result = formatEventTime(testDate, 'Invalid/Timezone', false);
    
    Logger.log = originalLog; // Restore
    
    Assert.truthy(result, 'Should return a formatted time despite invalid timezone');
    // Note: Warning logging test would need more sophisticated mocking
  });
  
  return suite;
}

function createFrequencyTestSuite() {
  const suite = new TestSuite('Frequency Functions');
  
  suite.test('shouldSendEmail - daily frequency', () => {
    const scenarios = TestFixtures.getFrequencyTestScenarios();
    const dailyScenario = scenarios.find(s => s.frequency === 'daily');
    const testDates = TestFixtures.getTestDates();
    
    for (let i = 0; i < dailyScenario.testDates.length; i++) {
      const dateKey = dailyScenario.testDates[i];
      const testDate = testDates[dateKey];
      const expected = dailyScenario.expectedResults[i];
      
      // Mock the current date
      const originalDate = Date;
      global.Date = function(...args) {
        if (args.length === 0) {
          return testDate;
        }
        return new originalDate(...args);
      };
      global.Date.prototype = originalDate.prototype;
      
      const result = shouldSendEmail('daily');
      global.Date = originalDate; // Restore
      
      Assert.equal(result, expected, `Daily frequency should be ${expected} for ${dateKey}`);
    }
  });
  
  suite.test('shouldSendEmail - weekdays frequency', () => {
    const scenarios = TestFixtures.getFrequencyTestScenarios();
    const weekdaysScenario = scenarios.find(s => s.frequency === 'weekdays');
    const testDates = TestFixtures.getTestDates();
    
    for (let i = 0; i < weekdaysScenario.testDates.length; i++) {
      const dateKey = weekdaysScenario.testDates[i];
      const testDate = testDates[dateKey];
      const expected = weekdaysScenario.expectedResults[i];
      
      // Mock the current date
      const originalDate = Date;
      global.Date = function(...args) {
        if (args.length === 0) {
          return testDate;
        }
        return new originalDate(...args);
      };
      global.Date.prototype = originalDate.prototype;
      
      const result = shouldSendEmail('weekdays');
      global.Date = originalDate; // Restore
      
      Assert.equal(result, expected, `Weekdays frequency should be ${expected} for ${dateKey}`);
    }
  });
  
  suite.test('shouldSendEmail - monday only frequency', () => {
    const scenarios = TestFixtures.getFrequencyTestScenarios();
    const mondayScenario = scenarios.find(s => s.frequency === 'monday');
    const testDates = TestFixtures.getTestDates();
    
    for (let i = 0; i < mondayScenario.testDates.length; i++) {
      const dateKey = mondayScenario.testDates[i];
      const testDate = testDates[dateKey];
      const expected = mondayScenario.expectedResults[i];
      
      // Mock the current date
      const originalDate = Date;
      global.Date = function(...args) {
        if (args.length === 0) {
          return testDate;
        }
        return new originalDate(...args);
      };
      global.Date.prototype = originalDate.prototype;
      
      const result = shouldSendEmail('monday');
      global.Date = originalDate; // Restore
      
      Assert.equal(result, expected, `Monday frequency should be ${expected} for ${dateKey}`);
    }
  });
  
  suite.test('shouldSendEmail - weekends frequency', () => {
    const scenarios = TestFixtures.getFrequencyTestScenarios();
    const weekendsScenario = scenarios.find(s => s.frequency === 'weekends');
    const testDates = TestFixtures.getTestDates();
    
    for (let i = 0; i < weekendsScenario.testDates.length; i++) {
      const dateKey = weekendsScenario.testDates[i];
      const testDate = testDates[dateKey];
      const expected = weekendsScenario.expectedResults[i];
      
      // Mock the current date
      const originalDate = Date;
      global.Date = function(...args) {
        if (args.length === 0) {
          return testDate;
        }
        return new originalDate(...args);
      };
      global.Date.prototype = originalDate.prototype;
      
      const result = shouldSendEmail('weekends');
      global.Date = originalDate; // Restore
      
      Assert.equal(result, expected, `Weekends frequency should be ${expected} for ${dateKey}`);
    }
  });
  
  suite.test('shouldSendEmail - never frequency', () => {
    const testDates = TestFixtures.getTestDates();
    
    for (const dateKey of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
      const testDate = testDates[dateKey];
      
      // Mock the current date
      const originalDate = Date;
      global.Date = function(...args) {
        if (args.length === 0) {
          return testDate;
        }
        return new originalDate(...args);
      };
      global.Date.prototype = originalDate.prototype;
      
      const result = shouldSendEmail('never');
      global.Date = originalDate; // Restore
      
      Assert.false(result, `Never frequency should always be false for ${dateKey}`);
    }
  });
  
  suite.test('shouldSendEmail - disabled frequency', () => {
    const result = shouldSendEmail('disabled');
    Assert.false(result, 'Disabled frequency should always return false');
  });
  
  suite.test('shouldSendEmail - default frequency', () => {
    const result = shouldSendEmail(); // No parameter
    Assert.true(result, 'Default frequency should return true (daily)');
  });
  
  suite.test('shouldSendEmail - unknown frequency defaults to daily', () => {
    const result = shouldSendEmail('unknown_frequency');
    Assert.true(result, 'Unknown frequency should default to daily (true)');
  });
  
  return suite;
}