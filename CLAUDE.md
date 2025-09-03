# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an enterprise-ready Google Apps Script project that sends personalized email summaries of calendar events to team members. The script features advanced configuration options, beautiful HTML email templates, robust error handling, and comprehensive monitoring capabilities.

## Key Files

- `Code.js`: Main script with modular function architecture (991 lines)
- `Config.js`: Configuration management system using external sources (never hardcoded secrets)
- `TestFramework.js`: Custom testing framework for Google Apps Script (403 lines)
- `TestFixtures.js`: Test data, mocks, and fixtures (471 lines)
- `ValidationTests.js`: Unit tests for validation functions
- `DateTimeTests.js`: Unit tests for date/time and frequency functions
- `EmailTests.js`: Unit tests for email generation and filtering functions
- `IntegrationTests.js`: Integration tests for complex workflows
- `TestRunner.js`: Main test runner with comprehensive reporting
- `appsscript.json`: Google Apps Script configuration with timezone and runtime settings

## Architecture Overview

### **Modular Function Design**
- `loadConfiguration()`: Loads and validates spreadsheet configuration
- `validateRecipientData()`: Input validation for email and calendar ID formats
- `generateEmailBody()`: Creates both HTML and plain text email content
- `generateHtmlEmailBody()`: Professional HTML email templates with responsive design
- `fetchCalendarDataBatched()`: Optimized calendar data fetching with batching and caching
- `sendEmailsBatched()`: Batch email sending with GmailApp/MailApp fallback
- `retryOperation()`: Retry logic with exponential backoff for transient failures
- `ExecutionTracker`: Comprehensive execution monitoring and quota tracking

### **Performance Optimizations**
- **Calendar Batching**: Groups recipients by calendar ID to minimize API calls
- **Event Caching**: Prevents redundant calendar lookups
- **Batch Email Sending**: Processes emails in batches with rate limiting
- **Retry Logic**: Handles transient failures with intelligent backoff

### **Error Handling & Monitoring**
- Comprehensive error handling with email notifications
- Execution time tracking and quota usage monitoring
- Admin summary emails with detailed statistics and error reports
- Circuit breaker pattern for cascade failure prevention

## Configuration Management

### **Required Columns**
- `Recipient Email`: Email address to send the summary to
- `Calendar ID`: Calendar ID(s) - supports multiple calendars (comma-separated)

### **Optional Preference Columns**
- `Timezone`: Custom timezone for time display (e.g., "America/New_York", "Europe/London")
- `Time Format`: "12h" (default) or "24h" 
- `Date Range`: "today" (default), "tomorrow", "next 3 days", "this week", "next week", "weekdays"
- `Frequency`: "daily" (default), "weekdays", "monday", "wednesday", "friday", "weekends", "never"
- `Status`: "active" (default) or "disabled" (opt-out mechanism)
- `Filter Keywords`: Comma-separated keywords for event filtering (e.g., "meeting,-personal" includes "meeting" events, excludes "personal" events)

### **Configuration Constants**
Update these constants in `Code.js`:
- `SPREADSHEET_ID`: The Google Sheet ID containing recipient configurations
- `CONFIG_SHEET_NAME`: The sheet tab name (default: "Sheet1")

### **Example Configuration Sheet**
```
| Recipient Email | Calendar ID | Timezone | Time Format | Date Range | Frequency | Status | Filter Keywords |
|----------------|-------------|----------|-------------|------------|-----------|--------|----------------|
| user@domain.com | cal1@gmail.com,cal2@gmail.com | America/New_York | 24h | next 3 days | weekdays | active | meeting,-personal |
```

## Email Features

### **HTML Email Templates**
- Professional responsive design with gradients and modern styling
- Event cards with time-based color coding (morning/afternoon/evening)
- Event details including time, title, location, and descriptions
- Timezone indicators when custom timezones are used
- Plain text fallback for accessibility

### **Smart Event Handling**
- Multiple calendar consolidation with chronological sorting
- Event filtering by keywords (include/exclude patterns)
- Location and description display (truncated for readability)
- Dynamic email subjects based on date range preferences

## Common Commands

Since this is a Google Apps Script project, use the `clasp` CLI for deployment and management:

```bash
# Deploy the script
clasp push

# Open the script in the online editor
clasp open

# View logs
clasp logs

# Create a new version/deployment
clasp deploy
```

## Monitoring & Analytics

### **Execution Tracking**
The script automatically tracks:
- Execution time and performance metrics
- Calendar API calls and quota usage estimates
- Email sending success/failure rates
- Retry attempts and error patterns

### **Admin Notifications**
Script owners receive detailed execution reports including:
- Success/failure status
- Processing statistics (calendars, events, emails)
- Quota usage estimates
- Complete error logs with context

## Development Notes

### **Testing**
- Test with small recipient groups first
- Monitor quota usage in Google Cloud Console
- Check email delivery in spam folders initially
- Use the execution tracker for performance insights

### **Quota Considerations**
- Calendar API: 1,000,000 calls/day
- Gmail API: 1,000,000,000 quota units/day  
- Script runtime: 6 minutes maximum execution time
- The script includes automatic batching and retry logic to optimize quota usage

### **Customization**
- Email templates can be customized in `generateHtmlEmailBody()`
- Date range options can be extended in `calculateDateRange()`
- Frequency options can be modified in `shouldSendEmail()`
- Event filtering logic can be enhanced in `filterEventsByKeywords()`

## Troubleshooting

### **Common Issues**
- **Calendar not found**: Verify Calendar IDs are correct email addresses
- **Permission errors**: Ensure script has Calendar and Gmail API access
- **Quota exceeded**: Check Google Cloud Console for API usage limits
- **Email not delivered**: Check spam folders, verify recipient email addresses

### **Debugging**
- Use `clasp logs` to view detailed execution logs
- Check admin summary emails for error details
- Monitor the ExecutionTracker metrics for performance insights
- Test with `Status: disabled` to skip problematic recipients during debugging

## Improvement Roadmap

### Code Structure & Maintainability
1. **Extract configuration loading** into a separate function to reduce the main function's complexity
2. **Split email generation** logic into a dedicated function for better testability
3. **Add input validation** for spreadsheet data (email format, calendar ID format)

### Performance Optimizations
4. **Batch calendar access** - group recipients by calendar ID to avoid redundant API calls
5. **Cache calendar objects** to prevent repeated lookups for the same calendar
6. **Use batch email sending** with `GmailApp.sendEmail()` for better quota management

### Error Handling & Monitoring
7. **Add retry logic** for transient failures (network issues, temporary API errors)
8. **Implement circuit breaker pattern** to prevent cascade failures
9. **Add execution time tracking** and quota usage monitoring
10. **Create admin summary email** with execution statistics and any failures

### User Experience
11. **Support timezone-specific formatting** for event times based on recipient preferences
12. **Add email templates** with HTML formatting for better readability
13. **Include event locations and descriptions** (configurable per recipient)
14. **Support date range preferences** (today only, next 3 days, etc.)

### Configuration Enhancements
15. **Add email frequency settings** (daily, weekdays only, custom schedule)
16. **Support multiple calendars per recipient**
17. **Add opt-out mechanism** for recipients
18. **Include event filtering options** (by title keywords, event types, etc.)