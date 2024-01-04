#!/usr/bin/env node

// hb-deconz-tools/cli/deconz.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2024 Erik Baauw. All rights reserved.

'use strict'

const { DeconzTool } = require('../index')
const pkgJson = require('../package.json')

new DeconzTool(pkgJson).main()
