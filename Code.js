/**
 * Sends daily email summaries of events to multiple team members,
 * with configurations managed in a Google Sheet.
 *
 * This script reads recipient email addresses and their desired calendar IDs
 * from a specified Google Sheet. For each configured user, it scans their
 * respective calendar for today's events, gathers start time and title,
 * and then compiles this information into a personalized email.
 *
 * This approach allows for centralized management of recipients and calendars
 * without modifying the script code directly.
 */
/**
 * Loads and validates configuration from the Google Sheet
 * @returns {Object} Configuration object with recipients array and metadata
 */
function loadConfiguration() {
  // Load configuration from external sources (Properties Service or Secret Manager)
  const SPREADSHEET_ID = Config.get('SPREADSHEET_ID');
  const CONFIG_SHEET_NAME = Config.get('CONFIG_SHEET_NAME', 'Config');

  if (!SPREADSHEET_ID) {
    throw new Error(`
❌ SPREADSHEET_ID not configured!

Please run the setup process:
1. Execute runInitialSetup() function once
2. Or manually set the property: Config.set('SPREADSHEET_ID', 'your-sheet-id')

For security reasons, the spreadsheet ID should never be hardcoded in the source code.
`);
  }

  let configSheet;
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    configSheet = spreadsheet.getSheetByName(CONFIG_SHEET_NAME);

    if (!configSheet) {
      throw new Error(`Configuration sheet named "${CONFIG_SHEET_NAME}" not found in spreadsheet ID "${SPREADSHEET_ID}".`);
    }
  } catch (e) {
    Logger.log(`CRITICAL ERROR: Could not access configuration spreadsheet or sheet. Please check SPREADSHEET_ID and CONFIG_SHEET_NAME. Error: ${e.message}`);
    // Optionally, send an email to an admin if the config sheet cannot be accessed
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(), // Sends to the script owner
      subject: "CRITICAL: Calendar Summary Script Failure",
      body: `The daily calendar summary script failed to access its configuration sheet. Please check the SPREADSHEET_ID and CONFIG_SHEET_NAME in the script. Error: ${e.message}`
    });
    return null; // Return null to indicate failure
  }

  // Get all data from the configuration sheet, assuming first row is headers
  const configData = configSheet.getDataRange().getValues();

  // Ensure there's data beyond the header row
  if (configData.length < 2) {
    Logger.log("No user configurations found in the sheet. Please add recipient emails and calendar IDs.");
    return null;
  }

  // Assuming headers are in the first row
  const headers = configData[0];
  const emailColumnIndex = headers.indexOf("Recipient Email");
  // The column name in the sheet should still be "Calendar ID" for backward compatibility
  // but the value should now be the Calendar ID (email address)
  const calendarIdColumnIndex = headers.indexOf("Calendar ID");
  
  // Optional columns for preferences
  const timezoneColumnIndex = headers.indexOf("Timezone");
  const timeFormatColumnIndex = headers.indexOf("Time Format");
  const dateRangeColumnIndex = headers.indexOf("Date Range");
  const frequencyColumnIndex = headers.indexOf("Frequency");
  const statusColumnIndex = headers.indexOf("Status");
  const filterKeywordsColumnIndex = headers.indexOf("Filter Keywords");

  if (emailColumnIndex === -1 || calendarIdColumnIndex === -1) {
    Logger.log("ERROR: Missing 'Recipient Email' or 'Calendar ID' column in the configuration sheet. Please ensure these columns exist.");
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: "ERROR: Calendar Summary Script - Missing Columns",
      body: `The daily calendar summary script failed because the configuration sheet is missing required columns. Please ensure 'Recipient Email' and 'Calendar ID' columns exist in sheet "${CONFIG_SHEET_NAME}".`
    });
    return null;
  }

  // Parse recipients from configuration data
  const recipients = [];
  for (let i = 1; i < configData.length; i++) {
    const row = configData[i];
    const recipientEmail = row[emailColumnIndex];
    const calendarId = row[calendarIdColumnIndex];

    // Skip rows with empty email or calendar ID
    if (!recipientEmail || !calendarId) {
      Logger.log(`Skipping row ${i + 1} due to missing Recipient Email or Calendar ID.`);
      continue;
    }

    // Validate email and calendar ID format
    const validation = validateRecipientData(recipientEmail, calendarId);
    if (!validation.isValid) {
      Logger.log(`Skipping row ${i + 1} due to validation errors: ${validation.errors.join(', ')}`);
      continue;
    }

    // Parse optional preference columns
    const timezone = timezoneColumnIndex !== -1 ? row[timezoneColumnIndex] : null;
    const timeFormat = timeFormatColumnIndex !== -1 ? row[timeFormatColumnIndex] : null;
    const dateRange = dateRangeColumnIndex !== -1 ? row[dateRangeColumnIndex] : null;
    const frequency = frequencyColumnIndex !== -1 ? row[frequencyColumnIndex] : null;
    const status = statusColumnIndex !== -1 ? row[statusColumnIndex] : null;
    const filterKeywords = filterKeywordsColumnIndex !== -1 ? row[filterKeywordsColumnIndex] : null;
    
    // Check opt-out status
    if (status && status.trim().toLowerCase() === 'disabled') {
      Logger.log(`Skipping row ${i + 1} - recipient ${recipientEmail} has opted out (Status: disabled)`);
      continue;
    }
    
    const preferences = {};
    if (timezone && timezone.trim()) {
      preferences.timezone = timezone.trim();
    }
    if (timeFormat && timeFormat.trim().toLowerCase() === '24h') {
      preferences.use24Hour = true;
    }
    if (dateRange && dateRange.trim()) {
      preferences.dateRange = dateRange.trim().toLowerCase();
    }
    if (frequency && frequency.trim()) {
      preferences.frequency = frequency.trim().toLowerCase();
    }
    if (filterKeywords && filterKeywords.trim()) {
      // Parse comma-separated keywords for filtering
      preferences.filterKeywords = filterKeywords.split(',').map(keyword => keyword.trim().toLowerCase()).filter(keyword => keyword);
    }

    // Handle multiple calendar IDs (comma-separated)
    const calendarIds = calendarId.split(',').map(id => id.trim()).filter(id => id);
    
    // Create a recipient entry for each calendar ID
    calendarIds.forEach(singleCalendarId => {
      // Validate each calendar ID
      const singleValidation = validateRecipientData(recipientEmail, singleCalendarId);
      if (singleValidation.isValid) {
        recipients.push({
          email: recipientEmail,
          calendarId: singleCalendarId,
          preferences: preferences,
          isMultiCalendar: calendarIds.length > 1,
          calendarIndex: calendarIds.indexOf(singleCalendarId),
          totalCalendars: calendarIds.length
        });
      } else {
        Logger.log(`Skipping calendar ID "${singleCalendarId}" for ${recipientEmail}: ${singleValidation.errors.join(', ')}`);
      }
    });
  }

  return {
    recipients: recipients,
    spreadsheetId: SPREADSHEET_ID,
    sheetName: CONFIG_SHEET_NAME
  };
}

/**
 * Validates email format and calendar ID format
 * @param {string} email - Email address to validate
 * @param {string} calendarId - Calendar ID to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateRecipientData(email, calendarId) {
  const errors = [];
  
  // Email validation (allows + but rejects consecutive dots)
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  const hasConsecutiveDots = /\.\./.test(email);
  if (!email || typeof email !== 'string' || !emailRegex.test(email) || hasConsecutiveDots) {
    errors.push(`Invalid email format: "${email}"`);
  }
  
  // Calendar ID validation (should be an email format for Google Calendar)
  if (!calendarId || typeof calendarId !== 'string' || !emailRegex.test(calendarId)) {
    errors.push(`Invalid calendar ID format: "${calendarId}"`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Formats event time based on recipient preferences
 * @param {Date} startTime - Event start time
 * @param {string} timezone - Recipient's preferred timezone (optional)
 * @param {boolean} use24Hour - Whether to use 24-hour format (default: false)
 * @returns {string} Formatted time string
 */
function formatEventTime(startTime, timezone = null, use24Hour = false) {
  const formatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour
  };
  
  if (timezone) {
    formatOptions.timeZone = timezone;
  }
  
  try {
    return startTime.toLocaleTimeString('en-US', formatOptions);
  } catch (e) {
    // Fallback to default formatting if timezone is invalid
    Logger.log(`WARNING: Invalid timezone "${timezone}", using default formatting`);
    return startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour
    });
  }
}

/**
 * Generates HTML email template
 * @param {string} recipientName - The recipient's name
 * @param {string} calendarName - The name of the calendar
 * @param {CalendarEvent[]} events - Array of calendar events
 * @param {Object} preferences - Recipient preferences
 * @returns {string} HTML email content
 */
function generateHtmlEmailBody(recipientName, calendarName, events, preferences = {}, dateRange = null) {
  const today = new Date();
  const dateString = dateRange ? 
    `Events for ${dateRange.description}` :
    today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

  let eventsHtml = '';
  if (events.length === 0) {
    eventsHtml = `
      <div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center; color: #6c757d;">
        <p style="margin: 0; font-size: 16px;">🌟 No events scheduled for today!</p>
        <p style="margin: 8px 0 0 0; font-size: 14px;">Enjoy your free time!</p>
      </div>`;
  } else {
    eventsHtml = events.map(event => {
      const startTime = event.getStartTime();
      const endTime = event.getEndTime();
      const eventTitle = event.getTitle();
      const location = event.getLocation();
      const description = event.getDescription();

      const formattedStartTime = formatEventTime(
        startTime, 
        preferences.timezone, 
        preferences.use24Hour || false
      );
      
      const formattedEndTime = formatEventTime(
        endTime, 
        preferences.timezone, 
        preferences.use24Hour || false
      );

      // Determine event color based on time
      const hour = startTime.getHours();
      let eventColor = '#e3f2fd'; // default light blue
      if (hour < 9) eventColor = '#fff3e0'; // morning - orange
      else if (hour >= 17) eventColor = '#f3e5f5'; // evening - purple

      return `
        <div style="margin-bottom: 16px; padding: 16px; background-color: ${eventColor}; border-radius: 8px; border-left: 4px solid #1976d2;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 18px; font-weight: 600; color: #1976d2;">📅 ${eventTitle}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="font-size: 16px; color: #424242;">⏰ ${formattedStartTime} - ${formattedEndTime}</span>
          </div>
          ${location ? `<div style="margin-bottom: 8px;"><span style="font-size: 14px; color: #666;">📍 ${location}</span></div>` : ''}
          ${description && description.length < 100 ? `<div><span style="font-size: 14px; color: #666; font-style: italic;">${description}</span></div>` : ''}
        </div>`;
    }).join('');
  }

  const timezoneNote = preferences.timezone ? 
    `<p style="font-size: 12px; color: #999; text-align: center; margin: 16px 0 0 0;">Times shown in ${preferences.timezone} timezone</p>` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Daily Calendar Summary</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">📅 Daily Calendar Summary</h1>
          <p style="color: #e3f2fd; margin: 8px 0 0 0; font-size: 16px;">${dateString}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #333; margin: 0 0 24px 0; font-size: 22px; font-weight: 400;">Hello ${recipientName}! 👋</h2>
          
          <p style="color: #666; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
            Here are your events ${dateRange ? `for ${dateRange.description}` : 'for today'} from <strong>"${calendarName}"</strong>:
          </p>
          
          <!-- Events -->
          <div style="margin: 24px 0;">
            ${eventsHtml}
          </div>
          
          ${timezoneNote}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; margin: 0; font-size: 14px;">
            Best regards,<br>
            <strong>Your Google Calendar</strong> 🗓️
          </p>
          <p style="color: #adb5bd; margin: 16px 0 0 0; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>`;
}

/**
 * Generates email body content from calendar events
 * @param {string} recipientEmail - The recipient's email address
 * @param {string} calendarName - The name of the calendar
 * @param {CalendarEvent[]} events - Array of calendar events
 * @param {Object} preferences - Recipient preferences (timezone, time format, etc.)
 * @returns {Object} Email content with both HTML and plain text
 */
function generateEmailBody(recipientEmail, calendarName, events, preferences = {}, dateRange = null) {
  const recipientName = recipientEmail.split('@')[0];
  
  // Generate HTML version
  const htmlBody = generateHtmlEmailBody(recipientName, calendarName, events, preferences, dateRange);
  
  // Generate plain text version as fallback
  const dateText = dateRange ? `for ${dateRange.description}` : 'for today';
  let textBody = `Hello ${recipientName},\n\nHere are your events ${dateText} from "${calendarName}":\n\n`;

  if (events.length === 0) {
    textBody += "No events found for today.";
  } else {
    events.forEach(event => {
      const startTime = event.getStartTime();
      const eventTitle = event.getTitle();
      const location = event.getLocation();

      const formattedStartTime = formatEventTime(
        startTime, 
        preferences.timezone, 
        preferences.use24Hour || false
      );

      textBody += `• ${formattedStartTime} - ${eventTitle}`;
      if (location) {
        textBody += ` (${location})`;
      }
      textBody += `\n`;
    });
  }

  // Add timezone info if specified
  if (preferences.timezone) {
    textBody += `\n(Times shown in ${preferences.timezone} timezone)\n`;
  }

  textBody += "\n\nBest regards,\nYour Google Calendar";
  
  return {
    htmlBody: htmlBody,
    textBody: textBody
  };
}

/**
 * Filters events based on keyword preferences
 * @param {CalendarEvent[]} events - Array of events to filter
 * @param {string[]} filterKeywords - Array of keywords to include/exclude
 * @returns {CalendarEvent[]} Filtered events
 */
function filterEventsByKeywords(events, filterKeywords = []) {
  if (!filterKeywords || filterKeywords.length === 0) {
    return events;
  }
  
  return events.filter(event => {
    const title = event.getTitle().toLowerCase();
    const description = event.getDescription().toLowerCase();
    const location = event.getLocation().toLowerCase();
    const eventText = `${title} ${description} ${location}`;
    
    // Separate include and exclude keywords
    const includeKeywords = filterKeywords.filter(k => !k.startsWith('-')).map(k => k.toLowerCase());
    const excludeKeywords = filterKeywords.filter(k => k.startsWith('-')).map(k => k.substring(1).toLowerCase());
    
    // All include keywords must be found
    const includesMatch = includeKeywords.length === 0 || includeKeywords.every(keyword => eventText.includes(keyword));
    
    // No exclude keywords should be found
    const excludesMatch = excludeKeywords.every(keyword => !eventText.includes(keyword));
    
    return includesMatch && excludesMatch;
  });
}

/**
 * Checks if email should be sent based on frequency preference
 * @param {string} frequency - Frequency preference
 * @returns {boolean} Whether to send email today
 */
function shouldSendEmail(frequency = 'daily') {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (frequency) {
    case 'daily':
      return true;
      
    case 'weekdays only':
    case 'weekdays':
      // Monday = 1, Tuesday = 2, ..., Friday = 5
      return dayOfWeek >= 1 && dayOfWeek <= 5;
      
    case 'mondays only':
    case 'monday':
      return dayOfWeek === 1;
      
    case 'wednesdays only':
    case 'wednesday':
      return dayOfWeek === 3;
      
    case 'fridays only':
    case 'friday':
      return dayOfWeek === 5;
      
    case 'weekends only':
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      
    case 'never':
    case 'disabled':
      return false;
      
    default:
      return true; // Default to daily if unknown frequency
  }
}

/**
 * Calculates date range based on preference
 * @param {string} dateRange - Date range preference
 * @returns {Object} Start and end dates
 */
function calculateDateRange(dateRange = 'today') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let startDate = new Date(today);
  let endDate = new Date(today);
  let rangeDescription = 'today';
  
  switch (dateRange) {
    case 'today':
      endDate.setDate(startDate.getDate() + 1);
      rangeDescription = 'today';
      break;
      
    case 'tomorrow':
      startDate.setDate(today.getDate() + 1);
      endDate.setDate(today.getDate() + 2);
      rangeDescription = 'tomorrow';
      break;
      
    case 'next 3 days':
    case 'next3days':
      endDate.setDate(startDate.getDate() + 3);
      rangeDescription = 'the next 3 days';
      break;
      
    case 'this week':
    case 'thisweek':
      // Get the start of the week (Sunday)
      const dayOfWeek = today.getDay();
      startDate.setDate(today.getDate() - dayOfWeek);
      endDate.setDate(startDate.getDate() + 7);
      rangeDescription = 'this week';
      break;
      
    case 'next week':
    case 'nextweek':
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
      startDate = nextWeekStart;
      endDate = new Date(nextWeekStart);
      endDate.setDate(nextWeekStart.getDate() + 7);
      rangeDescription = 'next week';
      break;
      
    case 'weekdays only':
    case 'weekdays':
      // For weekdays, we'll still use today but filter in the email generation
      endDate.setDate(startDate.getDate() + 1);
      rangeDescription = 'today (weekdays only)';
      break;
      
    default:
      endDate.setDate(startDate.getDate() + 1);
      rangeDescription = 'today';
  }
  
  return {
    startDate: startDate,
    endDate: endDate,
    description: rangeDescription
  };
}

/**
 * Groups recipients by calendar ID and date range, fetches events in batches
 * @param {Object[]} recipients - Array of recipient objects
 * @param {ExecutionTracker} tracker - Execution tracker instance
 * @returns {Object} Calendar data grouped by calendar ID and date range
 */
function fetchCalendarDataBatched(recipients, tracker) {
  // Filter recipients based on frequency preferences first
  const activeRecipients = recipients.filter(recipient => {
    const shouldSend = shouldSendEmail(recipient.preferences.frequency || 'daily');
    if (!shouldSend) {
      Logger.log(`Skipping ${recipient.email} - frequency setting: ${recipient.preferences.frequency || 'daily'}`);
      return false;
    }
    return true;
  });

  Logger.log(`Processing ${activeRecipients.length} recipients after frequency filtering (${recipients.length - activeRecipients.length} skipped)`);

  // Group active recipients by calendar ID and date range combination
  const calendarGroups = {};
  
  activeRecipients.forEach(recipient => {
    const dateRange = calculateDateRange(recipient.preferences.dateRange || 'today');
    const groupKey = `${recipient.calendarId}|${dateRange.startDate.getTime()}|${dateRange.endDate.getTime()}`;
    
    if (!calendarGroups[groupKey]) {
      calendarGroups[groupKey] = {
        calendarId: recipient.calendarId,
        dateRange: dateRange,
        recipients: []
      };
    }
    calendarGroups[groupKey].recipients.push(recipient);
  });

  // Cache for calendar objects and events
  const calendarCache = {};

  Object.keys(calendarGroups).forEach(groupKey => {
    const group = calendarGroups[groupKey];
    const { calendarId, dateRange, recipients: recipientsForGroup } = group;
    
    try {
      // Fetch calendar object once per unique calendar ID with retry
      const targetCalendar = retryOperation(() => {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
          throw new Error(`Calendar with ID "${calendarId}" not found.`);
        }
        return calendar;
      });

      // Fetch events for the specific date range with retry
      const events = retryOperation(() => {
        return targetCalendar.getEvents(dateRange.startDate, dateRange.endDate);
      });
      
      tracker.incrementCalendars();
      tracker.addEvents(events.length);
      Logger.log(`Found ${events.length} events from calendar "${calendarId}" for ${dateRange.description}.`);

      // Cache the calendar data with the group key
      calendarCache[groupKey] = {
        calendar: targetCalendar,
        events: events,
        recipients: recipientsForGroup,
        dateRange: dateRange,
        success: true,
        error: null
      };

    } catch (e) {
      tracker.addError(e, `Accessing calendar ${calendarId}`);
      Logger.log(`ERROR: Could not access calendar with ID "${calendarId}". Error: ${e.message}`);
      
      // Mark as failed for all recipients using this calendar
      calendarCache[groupKey] = {
        calendar: null,
        events: [],
        recipients: recipientsForGroup,
        dateRange: dateRange,
        success: false,
        error: e.message
      };
    }
  });

  return calendarCache;
}

/**
 * Retry utility for handling transient failures
 * @param {Function} operation - Function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds between retries
 * @returns {*} Result of the operation
 */
function retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      
      // Check if this is a retryable error
      const isRetryable = isRetryableError(error);
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      Logger.log(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms. Error: ${error.message}`);
      
      Utilities.sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Determines if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is retryable
 */
function isRetryableError(error) {
  const retryablePatterns = [
    /service is currently unavailable/i,
    /temporary failure/i,
    /rate limit/i,
    /quota.*exceeded/i,
    /timeout/i,
    /network.*error/i,
    /internal.*error/i,
    /service.*error/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(error.message));
}

/**
 * Tracks execution metrics and quota usage
 */
class ExecutionTracker {
  constructor() {
    this.startTime = new Date();
    this.metrics = {
      calendarsProcessed: 0,
      eventsFound: 0,
      emailsSent: 0,
      emailsFailed: 0,
      retriesPerformed: 0,
      errors: []
    };
  }
  
  incrementCalendars() { this.metrics.calendarsProcessed++; }
  addEvents(count) { this.metrics.eventsFound += count; }
  incrementEmailsSent() { this.metrics.emailsSent++; }
  incrementEmailsFailed() { this.metrics.emailsFailed++; }
  incrementRetries() { this.metrics.retriesPerformed++; }
  addError(error, context = '') {
    this.metrics.errors.push({
      message: error.message,
      context: context,
      timestamp: new Date()
    });
  }
  
  getExecutionTime() {
    return new Date() - this.startTime;
  }
  
  getQuotaUsageEstimate() {
    // Estimate based on Google Apps Script quotas
    const calendarReads = this.metrics.calendarsProcessed * 2; // calendar + events
    const emailSends = this.metrics.emailsSent + this.metrics.emailsFailed;
    const sheetReads = 1; // configuration read
    
    return {
      calendarReads: calendarReads,
      emailSends: emailSends,
      sheetReads: sheetReads,
      totalApiCalls: calendarReads + emailSends + sheetReads
    };
  }
  
  getSummary() {
    const executionTime = this.getExecutionTime();
    const quotaUsage = this.getQuotaUsageEstimate();
    
    return {
      executionTimeMs: executionTime,
      executionTimeFormatted: this.formatDuration(executionTime),
      metrics: this.metrics,
      quotaUsage: quotaUsage,
      success: this.metrics.errors.length === 0 && this.metrics.emailsFailed === 0
    };
  }
  
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

/**
 * Sends emails in batches to optimize quota usage
 * @param {Object[]} emailQueue - Array of email objects to send
 * @param {ExecutionTracker} tracker - Execution tracker instance
 */
function sendEmailsBatched(emailQueue, tracker) {
  const BATCH_SIZE = 10; // Gmail API allows up to 100 recipients per call, we'll use smaller batches
  const DELAY_BETWEEN_BATCHES = 100; // milliseconds
  
  Logger.log(`Sending ${emailQueue.length} emails in batches of ${BATCH_SIZE}...`);
  
  for (let i = 0; i < emailQueue.length; i += BATCH_SIZE) {
    const batch = emailQueue.slice(i, i + BATCH_SIZE);
    
    batch.forEach(emailData => {
      try {
        retryOperation(() => {
          GmailApp.sendEmail(
            emailData.to,
            emailData.subject,
            emailData.body,
            emailData.options || {}
          );
        });
        tracker.incrementEmailsSent();
        Logger.log(`Email sent successfully to ${emailData.to}`);
      } catch (e) {
        tracker.addError(e, `Sending email to ${emailData.to}`);
        Logger.log(`ERROR: Failed to send email to ${emailData.to} after retries. Error: ${e.message}`);
        // Fall back to MailApp for individual failures
        try {
          retryOperation(() => {
            MailApp.sendEmail({
              to: emailData.to,
              subject: emailData.subject,
              body: emailData.body
            });
          });
          tracker.incrementEmailsSent();
          Logger.log(`Email sent successfully to ${emailData.to} via MailApp fallback`);
        } catch (fallbackError) {
          tracker.incrementEmailsFailed();
          tracker.addError(fallbackError, `Fallback email to ${emailData.to}`);
          Logger.log(`ERROR: Both GmailApp and MailApp failed for ${emailData.to} after retries. Error: ${fallbackError.message}`);
        }
      }
    });
    
    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < emailQueue.length) {
      Utilities.sleep(DELAY_BETWEEN_BATCHES);
    }
  }
}

/**
 * Generates admin summary email content
 * @param {Object} summary - Execution summary from tracker
 * @returns {string} Admin email body
 */
function generateAdminSummary(summary) {
  const { metrics, quotaUsage, executionTimeFormatted, success } = summary;
  
  let emailBody = `Daily Calendar Summary Script - Execution Report\n\n`;
  emailBody += `Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
  emailBody += `Execution Time: ${executionTimeFormatted}\n\n`;
  
  emailBody += `📊 METRICS:\n`;
  emailBody += `• Calendars Processed: ${metrics.calendarsProcessed}\n`;
  emailBody += `• Events Found: ${metrics.eventsFound}\n`;
  emailBody += `• Emails Sent: ${metrics.emailsSent}\n`;
  emailBody += `• Email Failures: ${metrics.emailsFailed}\n`;
  emailBody += `• Retries Performed: ${metrics.retriesPerformed}\n\n`;
  
  emailBody += `🔧 QUOTA USAGE ESTIMATE:\n`;
  emailBody += `• Calendar API Reads: ${quotaUsage.calendarReads}\n`;
  emailBody += `• Email Sends: ${quotaUsage.emailSends}\n`;
  emailBody += `• Sheet Reads: ${quotaUsage.sheetReads}\n`;
  emailBody += `• Total API Calls: ${quotaUsage.totalApiCalls}\n\n`;
  
  if (metrics.errors.length > 0) {
    emailBody += `🚨 ERRORS (${metrics.errors.length}):\n`;
    metrics.errors.forEach((error, index) => {
      emailBody += `${index + 1}. [${error.context}] ${error.message}\n`;
    });
    emailBody += `\n`;
  }
  
  emailBody += `\n🤖 Generated by Calendar Summary Script`;
  return emailBody;
}

function sendDailyEventSummary() {
  // Initialize execution tracker
  const tracker = new ExecutionTracker();
  
  Logger.log(`Script started at ${new Date().toLocaleString()}`);

  try {
    // Load configuration
    const config = loadConfiguration();
    if (!config) {
      tracker.addError(new Error("Failed to load configuration"), "Configuration loading");
      Logger.log("Failed to load configuration. Stopping execution.");
      return;
    }

    // Fetch calendar data in batches (now handles different date ranges per recipient)
    const calendarData = fetchCalendarDataBatched(config.recipients, tracker);

    // Build email queue for batch sending
    const emailQueue = [];

    // Group calendar data by recipient email to consolidate multiple calendars
    const recipientData = {};
    
    Object.keys(calendarData).forEach(groupKey => {
      const data = calendarData[groupKey];
      
      data.recipients.forEach(recipient => {
        if (!recipientData[recipient.email]) {
          recipientData[recipient.email] = {
            recipient: recipient,
            calendars: [],
            dateRange: data.dateRange,
            hasErrors: false,
            errors: []
          };
        }
        
        if (data.success) {
          recipientData[recipient.email].calendars.push({
            calendar: data.calendar,
            events: data.events,
            success: true
          });
        } else {
          recipientData[recipient.email].hasErrors = true;
          recipientData[recipient.email].errors.push({
            calendarId: data.calendar ? data.calendar.getName() : 'Unknown',
            error: data.error
          });
        }
      });
    });

    // Process consolidated recipient data
    Object.keys(recipientData).forEach(recipientEmail => {
      const data = recipientData[recipientEmail];
      
      if (data.hasErrors && data.calendars.length === 0) {
        // All calendars failed
        emailQueue.push({
          to: recipientEmail,
          subject: `Calendar Summary Error: Calendars Not Found`,
          body: `Hello ${recipientEmail.split('@')[0]},\n\nYour daily calendar summary could not be generated because calendars were not found or accessible. Please check the Calendar IDs in the configuration sheet.\n\nErrors: ${data.errors.map(e => e.error).join(', ')}`
        });
        Logger.log(`ERROR: Queued error notification for ${recipientEmail}`);
        return;
      }

      // Consolidate events from all successful calendars
      let allEvents = [];
      const calendarNames = [];
      
      data.calendars.forEach(calData => {
        allEvents.push(...calData.events);
        calendarNames.push(calData.calendar.getName());
      });
      
      // Apply event filtering if keywords are specified
      if (data.recipient.preferences.filterKeywords) {
        const originalCount = allEvents.length;
        allEvents = filterEventsByKeywords(allEvents, data.recipient.preferences.filterKeywords);
        Logger.log(`Applied keyword filtering for ${recipientEmail}: ${originalCount} -> ${allEvents.length} events`);
      }
      
      // Sort events by start time
      allEvents.sort((a, b) => a.getStartTime() - b.getStartTime());
      
      Logger.log(`Processing ${allEvents.length} events for ${recipientEmail} from ${calendarNames.length} calendars (${data.dateRange.description})...`);
      
      const calendarDisplayName = calendarNames.length > 1 ? 
        `${calendarNames.length} calendars` : 
        calendarNames[0];
      
      const emailContent = generateEmailBody(
        recipientEmail, 
        calendarDisplayName, 
        allEvents, 
        data.recipient.preferences || {},
        data.dateRange
      );

      // Create dynamic subject based on date range
      let subject = "Your Events for the Day";
      if (data.dateRange.description !== 'today') {
        subject = `Your Events ${data.dateRange.description.charAt(0).toUpperCase() + data.dateRange.description.slice(1)}`;
      }

      emailQueue.push({
        to: recipientEmail,
        subject: subject,
        body: emailContent.textBody,
        options: {
          htmlBody: emailContent.htmlBody
        }
      });
      
      // Log any partial errors
      if (data.hasErrors) {
        Logger.log(`WARNING: Some calendars failed for ${recipientEmail}: ${data.errors.map(e => `${e.calendarId} - ${e.error}`).join(', ')}`);
      }
    });

    // Send all emails in batches
    if (emailQueue.length > 0) {
      sendEmailsBatched(emailQueue, tracker);
    } else {
      Logger.log("No emails to send.");
    }

  } catch (error) {
    tracker.addError(error, "Main execution");
    Logger.log(`CRITICAL ERROR in main execution: ${error.message}`);
  }

  // Generate and send admin summary
  const summary = tracker.getSummary();
  const adminSummaryBody = generateAdminSummary(summary);
  
  try {
    MailApp.sendEmail({
      to: Session.getActiveUser().getEmail(),
      subject: `Calendar Summary Script Report - ${summary.success ? 'SUCCESS' : 'FAILED'}`,
      body: adminSummaryBody
    });
    Logger.log("Admin summary email sent successfully.");
  } catch (e) {
    Logger.log(`ERROR: Failed to send admin summary email. Error: ${e.message}`);
  }

  Logger.log(`Script finished execution in ${summary.executionTimeFormatted}. Processed ${summary.metrics.calendarsProcessed} calendars, sent ${summary.metrics.emailsSent} emails.`);
}
