#!/usr/bin/env node

// hb-deconz-tools/bin/otau.js
//
// Homebridge deCONZ Tools.
// Copyright © 2023-2024 Erik Baauw. All rights reserved.

'use strict'

const { OtauTool } = require('../index')
const pkgJson = require('../package.json')

new OtauTool(pkgJson).main()
