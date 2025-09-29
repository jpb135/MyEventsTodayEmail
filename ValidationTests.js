/**
 * Unit Tests for Validation Functions
 */

function createValidationTestSuite() {
  const suite = new TestSuite('Validation Functions');
  
  suite.test('validateRecipientData - valid email and calendar ID', () => {
    const result = validateRecipientData('user@example.com', 'calendar@gmail.com');
    Assert.true(result.isValid, 'Should be valid for correct email and calendar ID');
    Assert.equal(result.errors.length, 0, 'Should have no errors');
  });
  
  suite.test('validateRecipientData - invalid email format', () => {
    const result = validateRecipientData('not-an-email', 'calendar@gmail.com');
    Assert.false(result.isValid, 'Should be invalid for malformed email');
    Assert.true(result.errors.length > 0, 'Should have errors');
    Assert.contains(result.errors[0], 'Invalid email format', 'Should mention email format error');
  });
  
  suite.test('validateRecipientData - invalid calendar ID format', () => {
    const result = validateRecipientData('user@example.com', 'not-an-email');
    Assert.false(result.isValid, 'Should be invalid for malformed calendar ID');
    Assert.true(result.errors.length > 0, 'Should have errors');
    Assert.contains(result.errors[0], 'Invalid calendar ID format', 'Should mention calendar ID format error');
  });
  
  suite.test('validateRecipientData - empty email', () => {
    const result = validateRecipientData('', 'calendar@gmail.com');
    Assert.false(result.isValid, 'Should be invalid for empty email');
    Assert.contains(result.errors[0], 'Invalid email format', 'Should mention email format error');
  });
  
  suite.test('validateRecipientData - empty calendar ID', () => {
    const result = validateRecipientData('user@example.com', '');
    Assert.false(result.isValid, 'Should be invalid for empty calendar ID');
    Assert.contains(result.errors[0], 'Invalid calendar ID format', 'Should mention calendar ID format error');
  });
  
  suite.test('validateRecipientData - null values', () => {
    const result = validateRecipientData(null, null);
    Assert.false(result.isValid, 'Should be invalid for null values');
    Assert.equal(result.errors.length, 2, 'Should have two errors');
  });
  
  suite.test('validateRecipientData - undefined values', () => {
    const result = validateRecipientData(undefined, undefined);
    Assert.false(result.isValid, 'Should be invalid for undefined values');
    Assert.equal(result.errors.length, 2, 'Should have two errors');
  });
  
  suite.test('validateRecipientData - both invalid', () => {
    const result = validateRecipientData('bad-email', 'bad-calendar');
    Assert.false(result.isValid, 'Should be invalid for both bad values');
    Assert.equal(result.errors.length, 2, 'Should have two errors');
  });
  
  suite.test('validateRecipientData - complex email formats', () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user_name@example-domain.com',
      'user123@domain123.co.uk'
    ];
    
    for (const email of validEmails) {
      const result = validateRecipientData(email, 'calendar@gmail.com');
      Assert.true(result.isValid, `Should be valid for email: ${email}`);
    }
  });
  
  suite.test('validateRecipientData - invalid email edge cases', () => {
    const invalidEmails = [
      'user@',
      '@example.com',
      'user..double.dot@example.com',
      'user @example.com', // space
      'user@example',
      'user@.com',
      'user@example.',
      '.user@example.com'
    ];
    
    for (const email of invalidEmails) {
      const result = validateRecipientData(email, 'calendar@gmail.com');
      Assert.false(result.isValid, `Should be invalid for email: ${email}`);
    }
  });
  
  return suite;
}

function createConfigurationValidationTestSuite() {
  const suite = new TestSuite('Configuration Validation');
  
  let originalServices;
  
  suite.beforeAll(() => {
    // Mock the configuration system
    originalServices = MockUtilities.mockGoogleAppsScriptServices();
  });
  
  suite.afterAll(() => {
    // Restore original services
    MockUtilities.restoreGoogleAppsScriptServices(originalServices);
  });
  
  suite.test('Config.validateConfiguration - all required present', () => {
    // Setup mock PropertiesService
    this.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: (key) => {
          switch(key) {
            case 'SPREADSHEET_ID': return '1abc123def456ghi';
            case 'CONFIG_SHEET_NAME': return 'Config';
            default: return null;
          }
        }
      }),
      getUserProperties: () => ({
        getProperty: () => null
      })
    };
    
    const config = new ConfigurationManager();
    const result = config.validateConfiguration();
    
    Assert.true(result.valid, 'Should be valid when all required config present');
    Assert.equal(result.missing.length, 0, 'Should have no missing items');
    Assert.equal(result.available.length, 2, 'Should have both required items');
  });
  
  suite.test('Config.validateConfiguration - missing spreadsheet ID', () => {
    this.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: (key) => {
          switch(key) {
            case 'CONFIG_SHEET_NAME': return 'Config';
            default: return null; // Missing SPREADSHEET_ID
          }
        }
      }),
      getUserProperties: () => ({
        getProperty: () => null
      })
    };
    
    const config = new ConfigurationManager();
    const result = config.validateConfiguration();
    
    Assert.false(result.valid, 'Should be invalid when spreadsheet ID missing');
    Assert.contains(result.missing, 'SPREADSHEET_ID', 'Should list SPREADSHEET_ID as missing');
    Assert.contains(result.message, 'SPREADSHEET_ID', 'Error message should mention missing ID');
  });
  
  suite.test('Config.get - with cache', () => {
    const config = new ConfigurationManager();
    
    // Mock properties service
    this.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: (key) => key === 'TEST_KEY' ? 'test_value' : null
      }),
      getUserProperties: () => ({
        getProperty: () => null
      })
    };
    
    const value1 = config.get('TEST_KEY');
    const value2 = config.get('TEST_KEY'); // Should use cache
    
    Assert.equal(value1, 'test_value', 'Should get value from properties');
    Assert.equal(value2, 'test_value', 'Should get same value from cache');
  });
  
  suite.test('Config.get - fallback to default', () => {
    const config = new ConfigurationManager();
    
    // Mock empty properties service
    this.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: () => null
      }),
      getUserProperties: () => ({
        getProperty: () => null
      })
    };
    
    const value = config.get('NON_EXISTENT_KEY', 'default_value');
    Assert.equal(value, 'default_value', 'Should return default value when key not found');
  });
  
  suite.test('Config.set and get - script properties', () => {
    let storedValue = null;
    
    this.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: (key) => key === 'TEST_SET_KEY' ? storedValue : null,
        setProperty: (key, value) => {
          if (key === 'TEST_SET_KEY') storedValue = value;
        }
      }),
      getUserProperties: () => ({
        getProperty: () => null
      })
    };
    
    const config = new ConfigurationManager();
    config.set('TEST_SET_KEY', 'stored_value');
    const retrieved = config.get('TEST_SET_KEY');
    
    Assert.equal(retrieved, 'stored_value', 'Should store and retrieve value correctly');
  });
  
  return suite;
}