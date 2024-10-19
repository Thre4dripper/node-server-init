#!/usr/bin/env node

import { initPrompts } from './src/prompts/initPrompts';
import { installScript } from './src/scripts/installScript';
(async () => {
    const projectConfig = await initPrompts(false);

    if (!projectConfig) {
        return;
    }
    await installScript(projectConfig);
})();
