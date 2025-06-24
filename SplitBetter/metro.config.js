const { getDefaultConfig } = require('expo/metro-config');

// Get the default Expo config
const defaultConfig = getDefaultConfig(__dirname);

// Add your custom changes here
defaultConfig.resolver.sourceExts.push('cjs');  // Add 'cjs' to the list of supported extensions
defaultConfig.resolver.unstable_enablePackageExports = false;  // Disable unstable enablePackageExports

// Export the updated configuration
module.exports = defaultConfig;
