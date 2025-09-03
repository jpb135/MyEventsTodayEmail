/**
 * Configuration Management
 * 
 * This module handles loading configuration from external sources like
 * Google Cloud Secret Manager, Properties Service, or environment variables.
 * 
 * NEVER hardcode sensitive information like spreadsheet IDs in source code.
 */

class ConfigurationManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }
  
  /**
   * Gets configuration value from various sources in priority order:
   * 1. Google Cloud Secret Manager (for production)
   * 2. Properties Service (for development/testing)
   * 3. Default values (fallback)
   * 
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    // Check cache first
    const cacheKey = `config_${key}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.value;
    }
    
    let value = null;
    
    try {
      // Try Google Cloud Secret Manager first (production environment)
      value = this.getFromSecretManager(key);
      if (value !== null) {
        Logger.log(`Config loaded from Secret Manager: ${key}`);
        this.cache.set(cacheKey, { value, timestamp: Date.now() });
        return value;
      }
    } catch (error) {
      Logger.log(`Secret Manager not available for ${key}: ${error.message}`);
    }
    
    try {
      // Try Properties Service (development/testing)
      value = this.getFromProperties(key);
      if (value !== null) {
        Logger.log(`Config loaded from Properties: ${key}`);
        this.cache.set(cacheKey, { value, timestamp: Date.now() });
        return value;
      }
    } catch (error) {
      Logger.log(`Properties Service not available for ${key}: ${error.message}`);
    }
    
    // Use default value
    Logger.log(`Using default value for ${key}: ${defaultValue}`);
    return defaultValue;
  }
  
  /**
   * Gets value from Google Cloud Secret Manager
   * @param {string} key - Secret key
   * @returns {string|null} Secret value or null if not found
   */
  getFromSecretManager(key) {
    try {
      // Note: This requires the Secret Manager API to be enabled
      // and proper service account permissions
      const projectId = this.getGoogleCloudProjectId();
      if (!projectId) {
        return null;
      }
      
      // Use Google Cloud Secret Manager API
      const secretName = `projects/${projectId}/secrets/${key}/versions/latest`;
      
      // This would require the Secret Manager API to be enabled
      // For now, we'll return null to fall back to Properties Service
      Logger.log(`Secret Manager API not yet implemented for: ${secretName}`);
      return null;
      
    } catch (error) {
      Logger.log(`Secret Manager error for ${key}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Gets value from Google Apps Script Properties Service
   * @param {string} key - Property key
   * @returns {string|null} Property value or null if not found
   */
  getFromProperties(key) {
    try {
      // Try Script Properties first (script-specific)
      let value = PropertiesService.getScriptProperties().getProperty(key);
      if (value) return value;
      
      // Try User Properties (user-specific)
      value = PropertiesService.getUserProperties().getProperty(key);
      if (value) return value;
      
      return null;
    } catch (error) {
      Logger.log(`Properties Service error for ${key}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Sets configuration value in Properties Service
   * @param {string} key - Property key
   * @param {string} value - Property value
   * @param {boolean} userSpecific - Whether to store in user properties
   */
  set(key, value, userSpecific = false) {
    try {
      if (userSpecific) {
        PropertiesService.getUserProperties().setProperty(key, value);
      } else {
        PropertiesService.getScriptProperties().setProperty(key, value);
      }
      
      // Clear cache
      this.cache.delete(`config_${key}`);
      Logger.log(`Configuration set: ${key}`);
    } catch (error) {
      Logger.log(`Error setting configuration ${key}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Gets the Google Cloud Project ID
   * @returns {string|null} Project ID or null if not available
   */
  getGoogleCloudProjectId() {
    try {
      // Try to get from various sources
      let projectId = this.getFromProperties('GOOGLE_CLOUD_PROJECT_ID');
      
      if (!projectId) {
        // Try to derive from service account or other sources
        // This would depend on your specific Google Cloud setup
        Logger.log('Google Cloud Project ID not configured');
        return null;
      }
      
      return projectId;
    } catch (error) {
      Logger.log(`Error getting Google Cloud Project ID: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Validates that all required configuration is available
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const required = [
      'SPREADSHEET_ID',
      'CONFIG_SHEET_NAME'
    ];
    
    const missing = [];
    const available = [];
    
    for (const key of required) {
      const value = this.get(key);
      if (!value) {
        missing.push(key);
      } else {
        available.push(key);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing,
      available,
      message: missing.length > 0 
        ? `Missing required configuration: ${missing.join(', ')}`
        : 'All required configuration is available'
    };
  }
  
  /**
   * Gets all configuration as an object (for debugging)
   * @returns {Object} Configuration object
   */
  getAllConfiguration() {
    const keys = [
      'SPREADSHEET_ID',
      'CONFIG_SHEET_NAME',
      'GOOGLE_CLOUD_PROJECT_ID',
      'ADMIN_EMAIL_OVERRIDE'
    ];
    
    const config = {};
    for (const key of keys) {
      const value = this.get(key);
      // Don't log sensitive values in full
      if (key.includes('ID') && value) {
        config[key] = `${value.substring(0, 8)}...`;
      } else {
        config[key] = value;
      }
    }
    
    return config;
  }
  
  /**
   * Clears the configuration cache
   */
  clearCache() {
    this.cache.clear();
    Logger.log('Configuration cache cleared');
  }
}

// Global configuration instance
const Config = new ConfigurationManager();

/**
 * Setup functions for initial configuration
 * These should be run once to set up the configuration
 */

/**
 * Sets up the spreadsheet ID in Properties Service
 * Run this once with your actual spreadsheet ID
 * @param {string} spreadsheetId - Your Google Sheet ID
 */
function setupSpreadsheetId(spreadsheetId) {
  if (!spreadsheetId || spreadsheetId.length < 20) {
    throw new Error('Invalid spreadsheet ID provided');
  }
  
  Config.set('SPREADSHEET_ID', spreadsheetId);
  Logger.log('✅ Spreadsheet ID configured successfully');
}

/**
 * Sets up the configuration sheet name
 * @param {string} sheetName - Sheet tab name (default: "Config")
 */
function setupConfigSheetName(sheetName = 'Config') {
  Config.set('CONFIG_SHEET_NAME', sheetName);
  Logger.log(`✅ Config sheet name set to: ${sheetName}`);
}

/**
 * Sets up Google Cloud Project ID (if using Secret Manager)
 * @param {string} projectId - Your Google Cloud Project ID
 */
function setupGoogleCloudProject(projectId) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  
  Config.set('GOOGLE_CLOUD_PROJECT_ID', projectId);
  Logger.log('✅ Google Cloud Project ID configured');
}

/**
 * One-time setup function - run this to configure the system
 */
function runInitialSetup() {
  Logger.log('🔧 Running initial configuration setup...');
  
  // You MUST update these values for your environment
  const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with actual ID
  const SHEET_NAME = 'Config'; // Or your preferred sheet name
  
  if (SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error(`
❌ CONFIGURATION REQUIRED:

You must update the SPREADSHEET_ID in the runInitialSetup() function.

1. Open your Google Sheet
2. Copy the ID from the URL (between '/d/' and '/edit')
3. Replace 'YOUR_SPREADSHEET_ID_HERE' with your actual ID
4. Run this function again

Example: https://docs.google.com/spreadsheets/d/1abc123def456ghi/edit
         The ID is: 1abc123def456ghi
`);
  }
  
  try {
    setupSpreadsheetId(SPREADSHEET_ID);
    setupConfigSheetName(SHEET_NAME);
    
    const validation = Config.validateConfiguration();
    if (validation.valid) {
      Logger.log('✅ Configuration setup completed successfully!');
      Logger.log(`📋 Configuration: ${JSON.stringify(Config.getAllConfiguration(), null, 2)}`);
    } else {
      Logger.log(`❌ Configuration incomplete: ${validation.message}`);
    }
    
  } catch (error) {
    Logger.log(`❌ Setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test function to verify configuration is working
 */
function testConfiguration() {
  Logger.log('🧪 Testing configuration...');
  
  const validation = Config.validateConfiguration();
  Logger.log(`Validation result: ${JSON.stringify(validation, null, 2)}`);
  
  if (validation.valid) {
    Logger.log('✅ Configuration test passed');
    
    // Test actual spreadsheet access
    try {
      const spreadsheetId = Config.get('SPREADSHEET_ID');
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      Logger.log(`✅ Successfully accessed spreadsheet: ${spreadsheet.getName()}`);
    } catch (error) {
      Logger.log(`❌ Failed to access spreadsheet: ${error.message}`);
    }
  } else {
    Logger.log('❌ Configuration test failed');
  }
}