#!/usr/bin/env node

// hb-deconz-tools/cli/deconz.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { createRequire } from 'node:module'

import { DeconzTool } from 'hb-deconz-tools/DeconzTool'

const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

new DeconzTool(packageJson).main()
