#!/usr/bin/env node

// hb-deconz-tools/bin/otau.js
//
// Homebridge deCONZ Tools.
// Copyright © 2023-2025 Erik Baauw. All rights reserved.

import { createRequire } from 'node:module'

import { OtauTool } from 'hb-deconz-tools/OtauTool'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

new OtauTool(packageJson).main()
