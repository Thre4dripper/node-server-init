#!/usr/bin/env node

import { initPrompts } from './src/prompts'
import { install } from './src/installScript'

;(async () => {
    const projectConfig = await initPrompts(false)

    if (!projectConfig) {
        return
    }
    await install(projectConfig)
})()