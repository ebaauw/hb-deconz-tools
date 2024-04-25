#!/usr/bin/env node

// hb-deconz-tools/bin/otau.js
//
// Homebridge deCONZ Tools.
// Copyright © 2023-2024 Erik Baauw. All rights reserved.

import { OtauTool } from 'hb-deconz-tools/OtauTool'

new OtauTool(import.meta.dirname).main()
