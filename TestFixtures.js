/**
 * Test Fixtures and Mock Data
 * 
 * This file contains all the test data, mock objects, and fixtures
 * used throughout the test suite.
 */

class TestFixtures {
  
  // Sample spreadsheet configurations for testing
  static getValidSpreadsheetData() {
    return {
      headers: [
        'Recipient Email', 
        'Calendar ID', 
        'Timezone', 
        'Time Format', 
        'Date Range', 
        'Frequency', 
        'Status', 
        'Filter Keywords'
      ],
      rows: [
        [
          'john@example.com',
          'john.calendar@gmail.com',
          'America/New_York',
          '12h',
          'today',
          'daily',
          'active',
          'meeting,standup'
        ],
        [
          'jane@example.com',
          'jane.calendar@gmail.com,shared@example.com',
          'Europe/London',
          '24h',
          'next 3 days',
          'weekdays',
          'active',
          'important,-personal'
        ],
        [
          'bob@example.com',
          'bob.calendar@gmail.com',
          '',
          '',
          '',
          '',
          'disabled',
          ''
        ],
        [
          'alice@example.com',
          'alice.calendar@gmail.com',
          'America/Los_Angeles',
          '24h',
          'this week',
          'friday',
          'active',
          '-cancelled,-optional'
        ]
      ]
    };
  }
  
  static getInvalidSpreadsheetData() {
    return {
      headers: ['Recipient Email', 'Calendar ID'],
      rows: [
        ['invalid-email', 'invalid-calendar-id'],
        ['', ''],
        ['good@example.com', ''], // Missing calendar ID
        ['', 'good@example.com'], // Missing email
        ['spaces in email@bad.com', 'spaces in calendar@bad.com']
      ]
    };
  }
  
  // Mock calendar events for testing
  static getMockEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return [
      // Morning meeting
      MockUtilities.createMockEvent(
        'Daily Standup',
        new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
        new Date(today.getTime() + 9.5 * 60 * 60 * 1000), // 9:30 AM
        'Conference Room A',
        'Daily team standup meeting'
      ),
      
      // Lunch meeting
      MockUtilities.createMockEvent(
        'Lunch with Client',
        new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00 PM
        new Date(today.getTime() + 13 * 60 * 60 * 1000), // 1:00 PM
        'Downtown Restaurant',
        'Important client meeting over lunch'
      ),
      
      // Afternoon meeting
      MockUtilities.createMockEvent(
        'Project Review',
        new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3:00 PM
        new Date(today.getTime() + 16 * 60 * 60 * 1000), // 4:00 PM
        'Meeting Room B',
        'Quarterly project review session'
      ),
      
      // Evening event (personal)
      MockUtilities.createMockEvent(
        'Personal Appointment',
        new Date(today.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM
        new Date(today.getTime() + 19 * 60 * 60 * 1000), // 7:00 PM
        'Medical Center',
        'Personal medical appointment'
      ),
      
      // All-day event
      MockUtilities.createMockEvent(
        'Company Holiday',
        new Date(today.getTime()),
        new Date(today.getTime() + 24 * 60 * 60 * 1000),
        '',
        'Company-wide holiday'
      ),
      
      // Event with no location
      MockUtilities.createMockEvent(
        'Phone Interview',
        new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM
        new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3:00 PM
        '',
        'Remote phone interview with candidate'
      ),
      
      // Event with no description
      MockUtilities.createMockEvent(
        'Quick Sync',
        new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM
        new Date(today.getTime() + 10.5 * 60 * 60 * 1000), // 10:30 AM
        'Office',
        ''
      ),
      
      // Cancelled event (for filtering tests)
      MockUtilities.createMockEvent(
        'Cancelled Meeting',
        new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00 AM
        new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00 PM
        'Cancelled Location',
        'This meeting has been cancelled'
      ),
      
      // Optional event (for filtering tests)
      MockUtilities.createMockEvent(
        'Optional Team Building',
        new Date(today.getTime() + 17 * 60 * 60 * 1000), // 5:00 PM
        new Date(today.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM
        'Break Room',
        'Optional team building activity'
      )
    ];
  }
  
  // Mock calendars for testing
  static getMockCalendars() {
    const events = TestFixtures.getMockEvents();
    
    return {
      'john.calendar@gmail.com': MockUtilities.createMockCalendar('John Work Calendar', events.slice(0, 3)),
      'jane.calendar@gmail.com': MockUtilities.createMockCalendar('Jane Personal Calendar', events.slice(2, 5)),
      'shared@example.com': MockUtilities.createMockCalendar('Shared Team Calendar', events.slice(0, 2)),
      'bob.calendar@gmail.com': MockUtilities.createMockCalendar('Bob Calendar', []),
      'alice.calendar@gmail.com': MockUtilities.createMockCalendar('Alice Calendar', events),
      'nonexistent@example.com': null // For testing calendar not found errors
    };
  }
  
  // Sample recipient configurations
  static getSampleRecipients() {
    return [
      {
        email: 'john@example.com',
        calendarId: 'john.calendar@gmail.com',
        preferences: {
          timezone: 'America/New_York',
          use24Hour: false,
          dateRange: 'today',
          frequency: 'daily'
        },
        isMultiCalendar: false,
        calendarIndex: 0,
        totalCalendars: 1
      },
      {
        email: 'jane@example.com',
        calendarId: 'jane.calendar@gmail.com',
        preferences: {
          timezone: 'Europe/London',
          use24Hour: true,
          dateRange: 'next 3 days',
          frequency: 'weekdays',
          filterKeywords: ['important', '-personal']
        },
        isMultiCalendar: true,
        calendarIndex: 0,
        totalCalendars: 2
      },
      {
        email: 'jane@example.com',
        calendarId: 'shared@example.com',
        preferences: {
          timezone: 'Europe/London',
          use24Hour: true,
          dateRange: 'next 3 days',
          frequency: 'weekdays',
          filterKeywords: ['important', '-personal']
        },
        isMultiCalendar: true,
        calendarIndex: 1,
        totalCalendars: 2
      }
    ];
  }
  
  // Date ranges for testing
  static getTestDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    return {
      today,
      tomorrow,
      nextWeek,
      thisWeekStart,
      // Specific test dates
      monday: new Date(2023, 0, 2), // January 2, 2023 (Monday)
      tuesday: new Date(2023, 0, 3),
      wednesday: new Date(2023, 0, 4),
      thursday: new Date(2023, 0, 5),
      friday: new Date(2023, 0, 6),
      saturday: new Date(2023, 0, 7),
      sunday: new Date(2023, 0, 8)
    };
  }
  
  // Sample email content for testing
  static getSampleEmailContent() {
    return {
      plainText: `Hello john,

Here are your events for today from "Test Calendar":

• 09:00 AM - Daily Standup
• 12:00 PM - Lunch with Client
• 03:00 PM - Project Review

Best regards,
Your Google Calendar`,
      
      htmlPreview: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Daily Calendar Summary</title>
</head>
<body>
  <h1>📅 Daily Calendar Summary</h1>
  <h2>Hello john! 👋</h2>
  <p>Here are your events for today from <strong>"Test Calendar"</strong>:</p>
  <!-- Events would be here -->
</body>
</html>`
    };
  }
  
  // Error scenarios for testing
  static getErrorScenarios() {
    return {
      invalidEmail: {
        email: 'not-an-email',
        calendarId: 'valid@example.com'
      },
      invalidCalendarId: {
        email: 'valid@example.com',
        calendarId: 'not-an-email'
      },
      missingEmail: {
        email: '',
        calendarId: 'valid@example.com'
      },
      missingCalendarId: {
        email: 'valid@example.com',
        calendarId: ''
      },
      calendarNotFound: {
        email: 'valid@example.com',
        calendarId: 'nonexistent@example.com'
      },
      malformedSpreadsheetData: {
        headers: ['Wrong', 'Headers'],
        rows: [['Some', 'Data']]
      }
    };
  }
  
  // Timezone test data
  static getTimezoneTestData() {
    return [
      {
        timezone: 'America/New_York',
        testDate: new Date(2023, 0, 1, 15, 30), // 3:30 PM UTC
        expected12h: '10:30 AM', // EST is UTC-5
        expected24h: '10:30'
      },
      {
        timezone: 'Europe/London',
        testDate: new Date(2023, 0, 1, 15, 30), // 3:30 PM UTC
        expected12h: '03:30 PM', // GMT is UTC+0
        expected24h: '15:30'
      },
      {
        timezone: 'Asia/Tokyo',
        testDate: new Date(2023, 0, 1, 15, 30), // 3:30 PM UTC
        expected12h: '12:30 AM', // JST is UTC+9 (next day)
        expected24h: '00:30'
      },
      {
        timezone: 'Australia/Sydney',
        testDate: new Date(2023, 0, 1, 15, 30), // 3:30 PM UTC
        expected12h: '02:30 AM', // AEDT is UTC+11 (next day)
        expected24h: '02:30'
      },
      {
        timezone: 'America/Los_Angeles',
        testDate: new Date(2023, 0, 1, 15, 30), // 3:30 PM UTC
        expected12h: '07:30 AM', // PST is UTC-8
        expected24h: '07:30'
      }
    ];
  }
  
  // Filter keyword test scenarios
  static getFilterKeywordScenarios() {
    return [
      {
        description: 'Include only meetings',
        keywords: ['meeting'],
        expectedEventTitles: ['Daily Standup', 'Lunch with Client', 'Project Review', 'Cancelled Meeting']
      },
      {
        description: 'Exclude personal events',
        keywords: ['-personal'],
        expectedEventTitles: ['Daily Standup', 'Lunch with Client', 'Project Review', 'Company Holiday', 'Phone Interview', 'Quick Sync', 'Cancelled Meeting']
      },
      {
        description: 'Include important, exclude cancelled',
        keywords: ['important', '-cancelled'],
        expectedEventTitles: ['Lunch with Client']
      },
      {
        description: 'Include standup or review',
        keywords: ['standup', 'review'],
        expectedEventTitles: ['Daily Standup', 'Project Review']
      },
      {
        description: 'Exclude optional events',
        keywords: ['-optional'],
        expectedEventTitles: ['Daily Standup', 'Lunch with Client', 'Project Review', 'Personal Appointment', 'Company Holiday', 'Phone Interview', 'Quick Sync', 'Cancelled Meeting']
      }
    ];
  }
  
  // Frequency test scenarios
  static getFrequencyTestScenarios() {
    return [
      {
        frequency: 'daily',
        testDates: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        expectedResults: [true, true, true, true, true, true, true]
      },
      {
        frequency: 'weekdays',
        testDates: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        expectedResults: [true, true, true, true, true, false, false]
      },
      {
        frequency: 'monday',
        testDates: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        expectedResults: [true, false, false, false, false, false, false]
      },
      {
        frequency: 'weekends',
        testDates: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        expectedResults: [false, false, false, false, false, true, true]
      },
      {
        frequency: 'never',
        testDates: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        expectedResults: [false, false, false, false, false, false, false]
      }
    ];
  }
}

// Extended mock utilities for complex scenarios
class ExtendedMockUtilities extends MockUtilities {
  
  static createFailingCalendarApp() {
    return {
      getCalendarById: (id) => {
        throw new Error(`Service temporarily unavailable for calendar: ${id}`);
      }
    };
  }
  
  static createPartiallyFailingCalendarApp() {
    const mockCalendars = TestFixtures.getMockCalendars();
    
    return {
      getCalendarById: (id) => {
        if (id === 'failing@example.com') {
          throw new Error('Temporary service failure');
        }
        return mockCalendars[id] || null;
      }
    };
  }
  
  static createFailingSpreadsheetApp() {
    return {
      openById: (id) => {
        throw new Error('Spreadsheet service temporarily unavailable');
      }
    };
  }
  
  static createFailingMailApp() {
    return {
      sendEmail: (options) => {
        throw new Error('Mail service temporarily unavailable');
      }
    };
  }
  
  static createSlowMailApp(delay = 100) {
    return {
      sendEmail: (options) => {
        // Simulate slow email service
        Logger.log(`Slow email send (${delay}ms delay) to: ${options.to}`);
        if (delay > 50) {
          throw new Error('Request timeout');
        }
        return true;
      }
    };
  }
}