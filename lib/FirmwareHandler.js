// hb-deconz-tools/lib/FirmwareHandler.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { HttpClient } from 'hb-lib-tools/HttpClient'

/** Abstract base class for firmware handler.
  * @abstract
  * @extends HttpClient
  */
class FirmwareHandler extends HttpClient {
  constructor (options = {}) {
    super(options)
    this.imageMap = {
      nImages: 0,
      nDevices: 0
    }
    this.urlPrefix = `https://${options.host}${options.path}`
  }

  get mapName () {
    return path.join(process.env.HOME, 'otau', `_images_${this.handlerName}.json`)
  }

  async init () {
  }

  async check (otau) {
    return false
  }

  async readMap () {
    try {
      const data = await readFile(this.mapName)
      this.imageMap = JSON.parse(data)
      this.debug(
        '%s: %d firmware images for %d devices',
        this.mapName, this.imageMap.nImages, this.imageMap.nDevices
      )
    } catch (error) { this.warn(error) }
  }

  async writeMap () {
    const { JsonFormatter } = await import('hb-lib-tools/JsonFormatter')
    const jsonFormatter = new JsonFormatter({ sortKeys: true })
    try {
      await writeFile(this.mapName, jsonFormatter.stringify(this.imageMap))
      this.log(
        '%s: saved %d firmware images for %d devices',
        this.mapName, this.imageMap.nImages, this.imageMap.nDevices
      )
    } catch (error) { this.warn(error) }
  }
}

export { FirmwareHandler }
