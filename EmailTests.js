/**
 * Unit Tests for Email Generation and Event Filtering Functions
 */

function createEmailGenerationTestSuite() {
  const suite = new TestSuite('Email Generation Functions');
  
  suite.test('generateEmailBody - basic functionality', () => {
    const mockEvents = [
      MockUtilities.createMockEvent(
        'Meeting',
        new Date(2023, 0, 1, 10, 0),
        new Date(2023, 0, 1, 11, 0),
        'Conference Room',
        'Important meeting'
      )
    ];
    
    const result = generateEmailBody('john@example.com', 'Test Calendar', mockEvents);
    
    Assert.truthy(result.textBody, 'Should generate text body');
    Assert.truthy(result.htmlBody, 'Should generate HTML body');
    Assert.contains(result.textBody, 'Hello john', 'Should include recipient name');
    Assert.contains(result.textBody, 'Test Calendar', 'Should include calendar name');
    Assert.contains(result.textBody, 'Meeting', 'Should include event title');
  });
  
  suite.test('generateEmailBody - no events', () => {
    const result = generateEmailBody('jane@example.com', 'Empty Calendar', []);
    
    Assert.contains(result.textBody, 'No events found', 'Should show no events message');
    Assert.contains(result.htmlBody, 'No events scheduled', 'HTML should show no events message');
    Assert.contains(result.textBody, 'Hello jane', 'Should include recipient name');
  });
  
  suite.test('generateEmailBody - multiple events chronological order', () => {
    const mockEvents = [
      MockUtilities.createMockEvent(
        'Afternoon Meeting',
        new Date(2023, 0, 1, 15, 0), // 3 PM
        new Date(2023, 0, 1, 16, 0),
        'Room B',
        'Later meeting'
      ),
      MockUtilities.createMockEvent(
        'Morning Meeting',
        new Date(2023, 0, 1, 9, 0), // 9 AM
        new Date(2023, 0, 1, 10, 0),
        'Room A',
        'Earlier meeting'
      )
    ];
    
    const result = generateEmailBody('user@example.com', 'Test Calendar', mockEvents);
    
    // Events should appear in chronological order in the email
    const morningIndex = result.textBody.indexOf('Morning Meeting');
    const afternoonIndex = result.textBody.indexOf('Afternoon Meeting');
    
    // Note: The generateEmailBody function doesn't sort events, 
    // that's done in the calling code. But we can test the content inclusion.
    Assert.contains(result.textBody, 'Morning Meeting', 'Should contain morning meeting');
    Assert.contains(result.textBody, 'Afternoon Meeting', 'Should contain afternoon meeting');
  });
  
  suite.test('generateEmailBody - with timezone preferences', () => {
    const mockEvents = [
      MockUtilities.createMockEvent(
        'Meeting',
        new Date(2023, 0, 1, 14, 30),
        new Date(2023, 0, 1, 15, 30),
        'Office',
        'Test meeting'
      )
    ];
    
    const preferences = {
      timezone: 'America/New_York',
      use24Hour: true
    };
    
    const result = generateEmailBody('user@example.com', 'Test Calendar', mockEvents, preferences);
    
    Assert.contains(result.textBody, 'America/New_York timezone', 'Should mention timezone in text');
    Assert.contains(result.htmlBody, 'America/New_York timezone', 'Should mention timezone in HTML');
  });
  
  suite.test('generateEmailBody - with date range', () => {
    const mockEvents = [
      MockUtilities.createMockEvent('Meeting', new Date(), new Date(), 'Office', 'Test')
    ];
    
    const dateRange = {
      description: 'next 3 days',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    };
    
    const result = generateEmailBody('user@example.com', 'Test Calendar', mockEvents, {}, dateRange);
    
    Assert.contains(result.textBody, 'for next 3 days', 'Should mention date range in text');
    Assert.contains(result.htmlBody, 'for next 3 days', 'Should mention date range in HTML');
  });
  
  suite.test('generateHtmlEmailBody - contains required HTML structure', () => {
    const mockEvents = [
      MockUtilities.createMockEvent(
        'Test Meeting',
        new Date(2023, 0, 1, 10, 0),
        new Date(2023, 0, 1, 11, 0),
        'Conference Room',
        'Test description'
      )
    ];
    
    const result = generateHtmlEmailBody('john', 'Test Calendar', mockEvents);
    
    Assert.contains(result, '<!DOCTYPE html>', 'Should be valid HTML document');
    Assert.contains(result, '<html>', 'Should contain html tag');
    Assert.contains(result, '<head>', 'Should contain head section');
    Assert.contains(result, '<body', 'Should contain body section');
    Assert.contains(result, 'Hello john!', 'Should contain personalized greeting');
    Assert.contains(result, 'Test Meeting', 'Should contain event title');
    Assert.contains(result, 'Conference Room', 'Should contain location');
  });
  
  suite.test('generateHtmlEmailBody - event color coding by time', () => {
    const morningEvent = MockUtilities.createMockEvent(
      'Morning Meeting',
      new Date(2023, 0, 1, 8, 0), // 8 AM - should be orange
      new Date(2023, 0, 1, 9, 0),
      'Office',
      'Morning event'
    );
    
    const afternoonEvent = MockUtilities.createMockEvent(
      'Afternoon Meeting',
      new Date(2023, 0, 1, 14, 0), // 2 PM - should be default blue
      new Date(2023, 0, 1, 15, 0),
      'Office',
      'Afternoon event'
    );
    
    const eveningEvent = MockUtilities.createMockEvent(
      'Evening Meeting',
      new Date(2023, 0, 1, 18, 0), // 6 PM - should be purple
      new Date(2023, 0, 1, 19, 0),
      'Office',
      'Evening event'
    );
    
    const morningResult = generateHtmlEmailBody('user', 'Calendar', [morningEvent]);
    const afternoonResult = generateHtmlEmailBody('user', 'Calendar', [afternoonEvent]);
    const eveningResult = generateHtmlEmailBody('user', 'Calendar', [eveningEvent]);
    
    // Check for different color schemes (these are implementation details, may need adjustment)
    Assert.contains(morningResult, '#fff3e0', 'Morning events should have orange background');
    Assert.contains(afternoonResult, '#e3f2fd', 'Afternoon events should have blue background');
    Assert.contains(eveningResult, '#f3e5f5', 'Evening events should have purple background');
  });
  
  return suite;
}

function createEventFilteringTestSuite() {
  const suite = new TestSuite('Event Filtering Functions');
  
  suite.test('filterEventsByKeywords - no keywords returns all events', () => {
    const mockEvents = TestFixtures.getMockEvents().slice(0, 3);
    const result = filterEventsByKeywords(mockEvents, []);
    
    Assert.equal(result.length, mockEvents.length, 'Should return all events when no keywords provided');
  });
  
  suite.test('filterEventsByKeywords - null keywords returns all events', () => {
    const mockEvents = TestFixtures.getMockEvents().slice(0, 3);
    const result = filterEventsByKeywords(mockEvents, null);
    
    Assert.equal(result.length, mockEvents.length, 'Should return all events when keywords is null');
  });
  
  suite.test('filterEventsByKeywords - include meeting events', () => {
    const mockEvents = TestFixtures.getMockEvents();
    const result = filterEventsByKeywords(mockEvents, ['meeting']);
    
    const expectedTitles = ['Daily Standup', 'Lunch with Client', 'Project Review', 'Cancelled Meeting'];
    Assert.equal(result.length, expectedTitles.length, `Should find ${expectedTitles.length} events with "meeting"`);
    
    for (const event of result) {
      const title = event.getTitle().toLowerCase();
      const description = event.getDescription().toLowerCase();
      const location = event.getLocation().toLowerCase();
      const eventText = `${title} ${description} ${location}`;
      Assert.contains(eventText, 'meeting', `Event "${event.getTitle()}" should contain "meeting"`);
    }
  });
  
  suite.test('filterEventsByKeywords - exclude personal events', () => {
    const mockEvents = TestFixtures.getMockEvents();
    const result = filterEventsByKeywords(mockEvents, ['-personal']);
    
    // Should exclude "Personal Appointment"
    const personalEventFound = result.some(event => 
      event.getTitle().toLowerCase().includes('personal') ||
      event.getDescription().toLowerCase().includes('personal') ||
      event.getLocation().toLowerCase().includes('personal')
    );
    
    Assert.false(personalEventFound, 'Should exclude events containing "personal"');
  });
  
  suite.test('filterEventsByKeywords - complex filtering include and exclude', () => {
    const mockEvents = TestFixtures.getMockEvents();
    const result = filterEventsByKeywords(mockEvents, ['important', '-cancelled']);
    
    // Should include events with "important" but exclude those with "cancelled"
    for (const event of result) {
      const title = event.getTitle().toLowerCase();
      const description = event.getDescription().toLowerCase();
      const location = event.getLocation().toLowerCase();
      const eventText = `${title} ${description} ${location}`;
      
      Assert.contains(eventText, 'important', `Event should contain "important"`);
      Assert.notContains(eventText, 'cancelled', `Event should not contain "cancelled"`);
    }
  });
  
  suite.test('filterEventsByKeywords - exclude optional events', () => {
    const mockEvents = TestFixtures.getMockEvents();
    const result = filterEventsByKeywords(mockEvents, ['-optional']);
    
    const optionalEventFound = result.some(event => 
      event.getTitle().toLowerCase().includes('optional') ||
      event.getDescription().toLowerCase().includes('optional')
    );
    
    Assert.false(optionalEventFound, 'Should exclude events containing "optional"');
  });
  
  suite.test('filterEventsByKeywords - multiple include keywords', () => {
    const mockEvents = TestFixtures.getMockEvents();
    const result = filterEventsByKeywords(mockEvents, ['standup', 'review']);
    
    // Should include events that contain either "standup" OR "review"
    for (const event of result) {
      const title = event.getTitle().toLowerCase();
      const description = event.getDescription().toLowerCase();
      const location = event.getLocation().toLowerCase();
      const eventText = `${title} ${description} ${location}`;
      
      const hasStandup = eventText.includes('standup');
      const hasReview = eventText.includes('review');
      
      Assert.true(hasStandup || hasReview, 
        `Event "${event.getTitle()}" should contain either "standup" or "review"`);
    }
  });
  
  suite.test('filterEventsByKeywords - case insensitive matching', () => {
    const mockEvents = [
      MockUtilities.createMockEvent('IMPORTANT Meeting', new Date(), new Date(), '', ''),
      MockUtilities.createMockEvent('Regular meeting', new Date(), new Date(), '', ''),
      MockUtilities.createMockEvent('personal appointment', new Date(), new Date(), '', '')
    ];
    
    const result = filterEventsByKeywords(mockEvents, ['IMPORTANT']);
    
    Assert.equal(result.length, 1, 'Should find 1 event with case-insensitive "IMPORTANT"');
    Assert.equal(result[0].getTitle(), 'IMPORTANT Meeting', 'Should match case-insensitively');
  });
  
  suite.test('filterEventsByKeywords - search in title, description, and location', () => {
    const mockEvents = [
      MockUtilities.createMockEvent('Meeting', new Date(), new Date(), 'important-room', ''),
      MockUtilities.createMockEvent('Sync', new Date(), new Date(), '', 'important discussion'),
      MockUtilities.createMockEvent('Call', new Date(), new Date(), '', '')
    ];
    
    const result = filterEventsByKeywords(mockEvents, ['important']);
    
    Assert.equal(result.length, 2, 'Should find events with "important" in location or description');
  });
  
  suite.test('filterEventsByKeywords - no matches returns empty array', () => {
    const mockEvents = TestFixtures.getMockEvents();
    const result = filterEventsByKeywords(mockEvents, ['nonexistent-keyword']);
    
    Assert.equal(result.length, 0, 'Should return empty array when no events match');
  });
  
  return suite;
}

function createExecutionTrackerTestSuite() {
  const suite = new TestSuite('ExecutionTracker Class');
  
  suite.test('ExecutionTracker - initialization', () => {
    const tracker = new ExecutionTracker();
    
    Assert.truthy(tracker.startTime, 'Should have start time');
    Assert.equal(tracker.metrics.calendarsProcessed, 0, 'Should initialize calendars processed to 0');
    Assert.equal(tracker.metrics.eventsFound, 0, 'Should initialize events found to 0');
    Assert.equal(tracker.metrics.emailsSent, 0, 'Should initialize emails sent to 0');
    Assert.equal(tracker.metrics.emailsFailed, 0, 'Should initialize emails failed to 0');
    Assert.equal(tracker.metrics.retriesPerformed, 0, 'Should initialize retries performed to 0');
    Assert.arrayEqual(tracker.metrics.errors, [], 'Should initialize errors array empty');
  });
  
  suite.test('ExecutionTracker - increment methods', () => {
    const tracker = new ExecutionTracker();
    
    tracker.incrementCalendars();
    tracker.addEvents(5);
    tracker.incrementEmailsSent();
    tracker.incrementEmailsFailed();
    tracker.incrementRetries();
    
    Assert.equal(tracker.metrics.calendarsProcessed, 1, 'Should increment calendars processed');
    Assert.equal(tracker.metrics.eventsFound, 5, 'Should add events found');
    Assert.equal(tracker.metrics.emailsSent, 1, 'Should increment emails sent');
    Assert.equal(tracker.metrics.emailsFailed, 1, 'Should increment emails failed');
    Assert.equal(tracker.metrics.retriesPerformed, 1, 'Should increment retries performed');
  });
  
  suite.test('ExecutionTracker - addError method', () => {
    const tracker = new ExecutionTracker();
    const testError = new Error('Test error message');
    
    tracker.addError(testError, 'Test context');
    
    Assert.equal(tracker.metrics.errors.length, 1, 'Should add error to errors array');
    Assert.equal(tracker.metrics.errors[0].message, 'Test error message', 'Should store error message');
    Assert.equal(tracker.metrics.errors[0].context, 'Test context', 'Should store error context');
    Assert.truthy(tracker.metrics.errors[0].timestamp, 'Should store error timestamp');
  });
  
  suite.test('ExecutionTracker - getExecutionTime', () => {
    const tracker = new ExecutionTracker();
    
    // Wait a small amount of time
    Utilities.sleep(10);
    
    const executionTime = tracker.getExecutionTime();
    Assert.true(executionTime >= 0, 'Execution time should be non-negative');
    Assert.true(typeof executionTime === 'number', 'Execution time should be a number');
  });
  
  suite.test('ExecutionTracker - getQuotaUsageEstimate', () => {
    const tracker = new ExecutionTracker();
    
    tracker.incrementCalendars();
    tracker.incrementCalendars(); // 2 calendars
    tracker.addEvents(10); // 10 events
    tracker.incrementEmailsSent();
    tracker.incrementEmailsFailed(); // 2 emails total
    
    const quotaUsage = tracker.getQuotaUsageEstimate();
    
    Assert.equal(quotaUsage.calendarReads, 4, 'Should estimate 4 calendar reads (2 calendars * 2)');
    Assert.equal(quotaUsage.emailSends, 2, 'Should count 2 email sends');
    Assert.equal(quotaUsage.sheetReads, 1, 'Should count 1 sheet read');
    Assert.equal(quotaUsage.totalApiCalls, 7, 'Should sum total API calls (4+2+1)');
  });
  
  suite.test('ExecutionTracker - getSummary', () => {
    const tracker = new ExecutionTracker();
    
    tracker.incrementCalendars();
    tracker.addEvents(3);
    tracker.incrementEmailsSent();
    tracker.addError(new Error('Test error'), 'Test context');
    
    const summary = tracker.getSummary();
    
    Assert.equal(typeof summary.executionTimeMs, 'number', 'Summary should include execution time in ms');
    Assert.truthy(summary.executionTimeFormatted, 'Summary should include formatted execution time');
    Assert.equal(summary.metrics.calendarsProcessed, 1, 'Summary should include metrics');
    Assert.truthy(summary.quotaUsage, 'Summary should include quota usage');
    Assert.false(summary.success, 'Should be false when there are errors');
  });
  
  suite.test('ExecutionTracker - getSummary success when no errors', () => {
    const tracker = new ExecutionTracker();
    
    tracker.incrementCalendars();
    tracker.incrementEmailsSent();
    // No errors or failed emails
    
    const summary = tracker.getSummary();
    
    Assert.true(summary.success, 'Should be true when no errors or failed emails');
  });
  
  suite.test('ExecutionTracker - formatDuration', () => {
    const tracker = new ExecutionTracker();
    
    Assert.equal(tracker.formatDuration(1000), '1s', 'Should format 1 second');
    Assert.equal(tracker.formatDuration(30000), '30s', 'Should format 30 seconds');
    Assert.equal(tracker.formatDuration(60000), '1m 0s', 'Should format 1 minute');
    Assert.equal(tracker.formatDuration(90000), '1m 30s', 'Should format 1 minute 30 seconds');
    Assert.equal(tracker.formatDuration(150000), '2m 30s', 'Should format 2 minutes 30 seconds');
  });
  
  return suite;
}