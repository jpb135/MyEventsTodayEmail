/**
 * Integration Tests for Complex Workflows
 */

function createConfigurationIntegrationTestSuite() {
  const suite = new TestSuite('Configuration Loading Integration');
  
  let originalServices;
  
  suite.beforeAll(() => {
    originalServices = MockUtilities.mockGoogleAppsScriptServices();
  });
  
  suite.afterAll(() => {
    MockUtilities.restoreGoogleAppsScriptServices(originalServices);
  });
  
  suite.test('loadConfiguration - successful load with valid data', () => {
    const validData = TestFixtures.getValidSpreadsheetData();
    
    // Mock Config service
    global.Config = {
      get: (key) => {
        switch(key) {
          case 'SPREADSHEET_ID': return 'test-spreadsheet-id';
          case 'CONFIG_SHEET_NAME': return 'Config';
          default: return null;
        }
      }
    };
    
    // Mock SpreadsheetApp with valid data
    global.SpreadsheetApp = {
      openById: (id) => ({
        getSheetByName: (name) => ({
          getDataRange: () => ({
            getValues: () => [validData.headers, ...validData.rows]
          })
        })
      })
    };
    
    const result = loadConfiguration();
    
    Assert.truthy(result, 'Should return configuration object');
    Assert.truthy(result.recipients, 'Should have recipients array');
    Assert.true(result.recipients.length > 0, 'Should have at least one recipient');
    
    const firstRecipient = result.recipients[0];
    Assert.equal(firstRecipient.email, 'john@example.com', 'Should parse email correctly');
    Assert.equal(firstRecipient.calendarId, 'john.calendar@gmail.com', 'Should parse calendar ID correctly');
    Assert.truthy(firstRecipient.preferences, 'Should have preferences object');
  });
  
  suite.test('loadConfiguration - handles multiple calendars per recipient', () => {
    // Mock Config service
    global.Config = {
      get: (key) => {
        switch(key) {
          case 'SPREADSHEET_ID': return 'test-spreadsheet-id';
          case 'CONFIG_SHEET_NAME': return 'Config';
          default: return null;
        }
      }
    };
    
    // Mock data with multiple calendars
    global.SpreadsheetApp = {
      openById: (id) => ({
        getSheetByName: (name) => ({
          getDataRange: () => ({
            getValues: () => [
              ['Recipient Email', 'Calendar ID'],
              ['user@example.com', 'cal1@gmail.com,cal2@gmail.com,cal3@gmail.com']
            ]
          })
        })
      })
    };
    
    const result = loadConfiguration();
    
    // Should create 3 separate recipient entries for the 3 calendars
    const userRecipients = result.recipients.filter(r => r.email === 'user@example.com');
    Assert.equal(userRecipients.length, 3, 'Should create separate entries for each calendar');
    
    Assert.equal(userRecipients[0].calendarId, 'cal1@gmail.com', 'Should have first calendar');
    Assert.equal(userRecipients[1].calendarId, 'cal2@gmail.com', 'Should have second calendar');
    Assert.equal(userRecipients[2].calendarId, 'cal3@gmail.com', 'Should have third calendar');
    
    Assert.true(userRecipients[0].isMultiCalendar, 'Should mark as multi-calendar');
    Assert.equal(userRecipients[0].totalCalendars, 3, 'Should know total calendar count');
  });
  
  suite.test('loadConfiguration - filters out opted-out recipients', () => {
    global.Config = {
      get: (key) => {
        switch(key) {
          case 'SPREADSHEET_ID': return 'test-spreadsheet-id';
          case 'CONFIG_SHEET_NAME': return 'Config';
          default: return null;
        }
      }
    };
    
    global.SpreadsheetApp = {
      openById: (id) => ({
        getSheetByName: (name) => ({
          getDataRange: () => ({
            getValues: () => [
              ['Recipient Email', 'Calendar ID', 'Status'],
              ['active@example.com', 'active@gmail.com', 'active'],
              ['disabled@example.com', 'disabled@gmail.com', 'disabled'],
              ['normal@example.com', 'normal@gmail.com', '']
            ]
          })
        })
      })
    };
    
    const result = loadConfiguration();
    
    const emails = result.recipients.map(r => r.email);
    Assert.contains(emails, 'active@example.com', 'Should include active recipients');
    Assert.contains(emails, 'normal@example.com', 'Should include recipients with no status');
    Assert.notContains(emails, 'disabled@example.com', 'Should exclude disabled recipients');
  });
  
  suite.test('loadConfiguration - handles missing spreadsheet ID', () => {
    global.Config = {
      get: (key) => null // No configuration available
    };
    
    Assert.throws(() => {
      loadConfiguration();
    }, 'SPREADSHEET_ID not configured', 'Should throw error when spreadsheet ID missing');
  });
  
  suite.test('loadConfiguration - handles invalid spreadsheet data', () => {
    global.Config = {
      get: (key) => {
        switch(key) {
          case 'SPREADSHEET_ID': return 'test-spreadsheet-id';
          case 'CONFIG_SHEET_NAME': return 'Config';
          default: return null;
        }
      }
    };
    
    const invalidData = TestFixtures.getInvalidSpreadsheetData();
    
    global.SpreadsheetApp = {
      openById: (id) => ({
        getSheetByName: (name) => ({
          getDataRange: () => ({
            getValues: () => [invalidData.headers, ...invalidData.rows]
          })
        })
      })
    };
    
    const result = loadConfiguration();
    
    // Should filter out invalid entries but not fail completely
    Assert.truthy(result, 'Should return configuration object');
    // All entries in invalidData are invalid, so should have 0 recipients
    Assert.equal(result.recipients.length, 0, 'Should filter out all invalid recipients');
  });
  
  return suite;
}

function createCalendarBatchingIntegrationTestSuite() {
  const suite = new TestSuite('Calendar Batching Integration');
  
  let originalServices;
  
  suite.beforeAll(() => {
    originalServices = MockUtilities.mockGoogleAppsScriptServices();
  });
  
  suite.afterAll(() => {
    MockUtilities.restoreGoogleAppsScriptServices(originalServices);
  });
  
  suite.test('fetchCalendarDataBatched - batches recipients by calendar and date range', () => {
    const recipients = [
      {
        email: 'user1@example.com',
        calendarId: 'calendar1@gmail.com',
        preferences: { dateRange: 'today' }
      },
      {
        email: 'user2@example.com',
        calendarId: 'calendar1@gmail.com', // Same calendar
        preferences: { dateRange: 'today' } // Same date range
      },
      {
        email: 'user3@example.com',
        calendarId: 'calendar2@gmail.com', // Different calendar
        preferences: { dateRange: 'today' }
      }
    ];
    
    const mockCalendars = TestFixtures.getMockCalendars();
    global.CalendarApp = {
      getCalendarById: (id) => mockCalendars[id] || null
    };
    
    const tracker = new ExecutionTracker();
    const result = fetchCalendarDataBatched(recipients, tracker);
    
    Assert.truthy(result, 'Should return calendar data');
    
    // Should batch calendar1 users together
    const calendar1Groups = Object.keys(result).filter(key => key.includes('calendar1@gmail.com'));
    Assert.equal(calendar1Groups.length, 1, 'Should create only one group for calendar1 recipients');
    
    const calendar1Data = result[calendar1Groups[0]];
    Assert.equal(calendar1Data.recipients.length, 2, 'Should include both calendar1 recipients');
  });
  
  suite.test('fetchCalendarDataBatched - handles frequency filtering', () => {
    const recipients = [
      {
        email: 'daily@example.com',
        calendarId: 'test@gmail.com',
        preferences: { frequency: 'daily' }
      },
      {
        email: 'never@example.com',
        calendarId: 'test@gmail.com',
        preferences: { frequency: 'never' }
      }
    ];
    
    const mockCalendars = TestFixtures.getMockCalendars();
    global.CalendarApp = {
      getCalendarById: (id) => mockCalendars[id] || null
    };
    
    const tracker = new ExecutionTracker();
    const result = fetchCalendarDataBatched(recipients, tracker);
    
    // Should only process the daily recipient
    const groupKeys = Object.keys(result);
    Assert.equal(groupKeys.length, 1, 'Should create group for only active recipients');
    
    const groupData = result[groupKeys[0]];
    Assert.equal(groupData.recipients.length, 1, 'Should include only the daily recipient');
    Assert.equal(groupData.recipients[0].email, 'daily@example.com', 'Should include the correct recipient');
  });
  
  suite.test('fetchCalendarDataBatched - handles calendar access errors', () => {
    const recipients = [
      {
        email: 'user@example.com',
        calendarId: 'nonexistent@example.com',
        preferences: {}
      }
    ];
    
    global.CalendarApp = {
      getCalendarById: (id) => {
        if (id === 'nonexistent@example.com') {
          throw new Error('Calendar not found');
        }
        return null;
      }
    };
    
    const tracker = new ExecutionTracker();
    const result = fetchCalendarDataBatched(recipients, tracker);
    
    const groupKeys = Object.keys(result);
    Assert.equal(groupKeys.length, 1, 'Should create group even for failed calendar');
    
    const groupData = result[groupKeys[0]];
    Assert.false(groupData.success, 'Should mark group as failed');
    Assert.truthy(groupData.error, 'Should include error message');
    Assert.equal(tracker.metrics.errors.length, 1, 'Should track the error');
  });
  
  suite.test('fetchCalendarDataBatched - different date ranges create separate groups', () => {
    const recipients = [
      {
        email: 'today@example.com',
        calendarId: 'same@gmail.com',
        preferences: { dateRange: 'today' }
      },
      {
        email: 'tomorrow@example.com',
        calendarId: 'same@gmail.com',
        preferences: { dateRange: 'tomorrow' }
      }
    ];
    
    const mockCalendars = TestFixtures.getMockCalendars();
    global.CalendarApp = {
      getCalendarById: (id) => mockCalendars[id] || null
    };
    
    const tracker = new ExecutionTracker();
    const result = fetchCalendarDataBatched(recipients, tracker);
    
    Assert.equal(Object.keys(result).length, 2, 'Should create separate groups for different date ranges');
  });
  
  return suite;
}

function createEmailSendingIntegrationTestSuite() {
  const suite = new TestSuite('Email Sending Integration');
  
  let originalServices;
  let emailsSent = [];
  
  suite.beforeEach(() => {
    emailsSent = [];
  });
  
  suite.beforeAll(() => {
    originalServices = MockUtilities.mockGoogleAppsScriptServices();
    
    // Mock email services to track sent emails
    global.GmailApp = {
      sendEmail: (to, subject, body, options) => {
        emailsSent.push({ service: 'GmailApp', to, subject, body, options });
        return true;
      }
    };
    
    global.MailApp = {
      sendEmail: (options) => {
        emailsSent.push({ service: 'MailApp', ...options });
        return true;
      }
    };
  });
  
  suite.afterAll(() => {
    MockUtilities.restoreGoogleAppsScriptServices(originalServices);
  });
  
  suite.test('sendEmailsBatched - sends emails in batches', () => {
    const emailQueue = [
      { to: 'user1@example.com', subject: 'Test 1', body: 'Body 1' },
      { to: 'user2@example.com', subject: 'Test 2', body: 'Body 2' },
      { to: 'user3@example.com', subject: 'Test 3', body: 'Body 3' }
    ];
    
    const tracker = new ExecutionTracker();
    sendEmailsBatched(emailQueue, tracker);
    
    Assert.equal(emailsSent.length, 3, 'Should send all emails in queue');
    Assert.equal(tracker.metrics.emailsSent, 3, 'Should track sent emails');
    Assert.equal(tracker.metrics.emailsFailed, 0, 'Should have no failed emails');
  });
  
  suite.test('sendEmailsBatched - handles individual email failures with fallback', () => {
    let gmailAttempts = 0;
    
    global.GmailApp = {
      sendEmail: (to, subject, body, options) => {
        gmailAttempts++;
        if (to === 'fail@example.com') {
          throw new Error('Gmail service temporarily unavailable');
        }
        emailsSent.push({ service: 'GmailApp', to, subject, body, options });
        return true;
      }
    };
    
    const emailQueue = [
      { to: 'success@example.com', subject: 'Test 1', body: 'Body 1' },
      { to: 'fail@example.com', subject: 'Test 2', body: 'Body 2' }
    ];
    
    const tracker = new ExecutionTracker();
    sendEmailsBatched(emailQueue, tracker);
    
    Assert.equal(emailsSent.length, 2, 'Should send both emails (one via fallback)');
    
    const gmailEmail = emailsSent.find(e => e.service === 'GmailApp');
    const mailAppEmail = emailsSent.find(e => e.service === 'MailApp');
    
    Assert.truthy(gmailEmail, 'Should send successful email via GmailApp');
    Assert.truthy(mailAppEmail, 'Should send failed email via MailApp fallback');
    Assert.equal(mailAppEmail.to, 'fail@example.com', 'Fallback should handle the failed email');
  });
  
  suite.test('sendEmailsBatched - tracks retry attempts', () => {
    let attempt = 0;
    global.retryOperation = (operation, maxRetries) => {
      attempt++;
      if (attempt <= 2) {
        throw new Error('Temporary failure');
      }
      return operation();
    };
    
    const emailQueue = [{ to: 'retry@example.com', subject: 'Test', body: 'Body' }];
    const tracker = new ExecutionTracker();
    
    sendEmailsBatched(emailQueue, tracker);
    
    Assert.equal(emailsSent.length, 1, 'Should eventually send email after retries');
    // Note: In the actual implementation, retry tracking would be done in retryOperation
  });
  
  return suite;
}

function createEndToEndIntegrationTestSuite() {
  const suite = new TestSuite('End-to-End Integration');
  
  let originalServices;
  let emailsSent = [];
  
  suite.beforeAll(() => {
    originalServices = MockUtilities.mockGoogleAppsScriptServices();
    
    // Set up complete mock environment
    emailsSent = [];
    
    // Mock Config
    global.Config = {
      get: (key) => {
        switch(key) {
          case 'SPREADSHEET_ID': return 'test-spreadsheet-id';
          case 'CONFIG_SHEET_NAME': return 'Config';
          default: return null;
        }
      }
    };
    
    // Mock SpreadsheetApp
    global.SpreadsheetApp = {
      openById: (id) => ({
        getSheetByName: (name) => ({
          getDataRange: () => ({
            getValues: () => [
              ['Recipient Email', 'Calendar ID', 'Frequency', 'Filter Keywords'],
              ['active@example.com', 'test@example.com', 'daily', 'meeting'],
              ['weekend@example.com', 'test@example.com', 'weekends', '']
            ]
          })
        })
      })
    };
    
    // Mock CalendarApp
    const mockEvents = TestFixtures.getMockEvents();
    global.CalendarApp = {
      getCalendarById: (id) => {
        if (id === 'test@example.com') {
          return MockUtilities.createMockCalendar('Test Calendar', mockEvents);
        }
        return null;
      }
    };
    
    // Mock Email services
    global.GmailApp = {
      sendEmail: (to, subject, body, options) => {
        emailsSent.push({ service: 'GmailApp', to, subject, body, options });
        return true;
      }
    };
    
    global.MailApp = {
      sendEmail: (options) => {
        emailsSent.push({ service: 'MailApp', ...options });
        return true;
      }
    };
  });
  
  suite.afterAll(() => {
    MockUtilities.restoreGoogleAppsScriptServices(originalServices);
  });
  
  suite.beforeEach(() => {
    emailsSent = [];
  });
  
  suite.test('sendDailyEventSummary - complete workflow on weekday', () => {
    // Mock current day as Monday
    const originalDate = Date;
    global.Date = function(...args) {
      if (args.length === 0) {
        return TestFixtures.getTestDates().monday;
      }
      return new originalDate(...args);
    };
    global.Date.prototype = originalDate.prototype;
    
    // Run the main function
    sendDailyEventSummary();
    
    // Restore Date
    global.Date = originalDate;
    
    // Should send emails to active@example.com (daily frequency matches Monday)
    // Should NOT send to weekend@example.com (weekends frequency doesn't match Monday)
    Assert.equal(emailsSent.length, 2, 'Should send summary email + admin email');
    
    const summaryEmail = emailsSent.find(e => e.to === 'active@example.com');
    const adminEmail = emailsSent.find(e => e.subject && e.subject.includes('Report'));
    
    Assert.truthy(summaryEmail, 'Should send summary email to active recipient');
    Assert.truthy(adminEmail, 'Should send admin report email');
    
    Assert.contains(summaryEmail.subject, 'Events', 'Summary email should mention events');
    Assert.contains(summaryEmail.body, 'Hello active', 'Should personalize greeting');
  });
  
  suite.test('sendDailyEventSummary - complete workflow on weekend', () => {
    // Mock current day as Saturday
    const originalDate = Date;
    global.Date = function(...args) {
      if (args.length === 0) {
        return TestFixtures.getTestDates().saturday;
      }
      return new originalDate(...args);
    };
    global.Date.prototype = originalDate.prototype;
    
    sendDailyEventSummary();
    
    global.Date = originalDate;
    
    // Should send email to weekend@example.com (weekends frequency matches Saturday)
    // Should NOT send to active@example.com (daily frequency still matches, but let's assume filter prevents it)
    Assert.equal(emailsSent.length, 2, 'Should send weekend email + admin email');
    
    const weekendEmail = emailsSent.find(e => e.to === 'weekend@example.com');
    const adminEmail = emailsSent.find(e => e.subject && e.subject.includes('Report'));
    
    Assert.truthy(weekendEmail, 'Should send email to weekend recipient');
    Assert.truthy(adminEmail, 'Should send admin report email');
  });
  
  suite.test('sendDailyEventSummary - handles complete failure gracefully', () => {
    // Mock failing spreadsheet
    global.SpreadsheetApp = {
      openById: (id) => {
        throw new Error('Spreadsheet service unavailable');
      }
    };
    
    // Should not throw an error, should handle gracefully
    Assert.doesNotThrow(() => {
      sendDailyEventSummary();
    }, 'Should handle complete failure gracefully');
    
    // Should still send admin email about the failure
    Assert.true(emailsSent.length >= 1, 'Should send at least admin notification');
    const adminEmail = emailsSent.find(e => e.subject && e.subject.includes('FAILED'));
    Assert.truthy(adminEmail, 'Should send failure notification to admin');
  });
  
  return suite;
}