// hb-deconz-tools/lib/FirmwareClient.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { FirmwareHandler } from 'hb-deconz-tools/FirmwareHandler'

class FirmwareClient {
  constructor (params = {}) {
    this.logger = params.logger
    for (const f of ['warn', 'log', 'debug', 'vdebug', 'vvdebug']) {
      this[f] = this.logger?.[f]?.bind(this.logger) ?? (() => {})
    }
    this._handlers = {}
  }

  async #createHandler (manufacturerCode, className) {
    if (this._handlers[manufacturerCode] == null) {
      this.debug('loading %s firmware handler...', className)
      await import('hb-deconz-tools/FirmwareHandler/' + className)
      this._handlers[manufacturerCode] = new FirmwareHandler[className]({ logger: this.logger })
      await this._handlers[manufacturerCode].init()
      await this._handlers[manufacturerCode].writeMap()
    }
    return this._handlers[manufacturerCode]
  }

  async #handler (manufacturerCode) {
    switch (manufacturerCode) {
      case 0x100B: return this.#createHandler(manufacturerCode, 'Hue')
      case 0x117C: return this.#createHandler(manufacturerCode, 'Ikea')
      default: return this.#createHandler(0, 'ZigbeeOta')
    }
  }

  async check (otau, useDefaultHandler = false) {
    const handler = await this.#handler(useDefaultHandler ? 0 : otau.manufacturerCode)
    this.debug('%s: %s: checking...', handler.name, otau.fileNamePrefix)
    const status = await handler.check(otau)
    if (status) {
      this.debug('%s: %s: image found: %j', handler.name, otau.fileNamePrefix, otau)
      return true
    }
    this.debug('%s: %s: no image found', handler.name, otau.fileNamePrefix)

    const defaultHandler = await this.#handler(0)
    if (defaultHandler !== handler) {
      return await this.check(otau, true)
    }
    return false
  }
}

export { FirmwareClient }
