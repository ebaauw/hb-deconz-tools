#!/usr/bin/env node

// hb-deconz-tools/cli/deconz.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2024 Erik Baauw. All rights reserved.

import { DeconzTool } from '../index.js'

new DeconzTool(import.meta.dirname).main()
