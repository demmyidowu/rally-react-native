const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to add use_modular_headers! to the Podfile.
 * Fixes: "The Swift pod `FirebaseCoreInternal` depends upon `GoogleUtilities`,
 * which does not define modules."
 */
const withModularHeaders = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

            let podfileContents = fs.readFileSync(podfilePath, 'utf-8');

            // Add use_modular_headers! after the platform line if not already present
            if (!podfileContents.includes('use_modular_headers!')) {
                podfileContents = podfileContents.replace(
                    /platform :ios.*/,
                    (match) => `${match}\nuse_modular_headers!`
                );
                fs.writeFileSync(podfilePath, podfileContents);
            }

            return config;
        },
    ]);
};

module.exports = withModularHeaders;
