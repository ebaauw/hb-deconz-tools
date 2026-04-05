// hb-deconz-tools/lib/FirmwareClient.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { toHexString } from 'hb-lib-tools'
import { HttpClient } from 'hb-lib-tools/HttpClient'
import { OptionParser } from 'hb-lib-tools/OptionParser'

class FirmwareClient {
  constructor (params = {}) {
    this.setLogger(params.logger)
    this._handlers = {}
  }

  /** Sets the logger for the HttpClient.
    * @param {?} logger - An instance of a class with logging methods.
    * Typically this would be subclass of `Delegate` from `homebridge-lib`
    * or of `CommandLineTool`.
    */
  setLogger (logger) {
    this.logger = logger
    for (const f of ['warn', 'log', 'debug', 'vdebug', 'vvdebug']) {
      this[f] = logger?.[f]?.bind(logger) ?? (() => {})
    }
  }

  async #createHandler (manufacturerCode, Class) {
    if (this._handlers[manufacturerCode] == null) {
      // TODO lazy loading of handler
      this.debug('loading %s', Class.name)
      this._handlers[manufacturerCode] = new Class({ logger: this.logger })
    }
    return this._handlers[manufacturerCode]
  }

  async #handler (manufacturerCode) {
    switch (manufacturerCode) {
      case 0x100B: return this.#createHandler(manufacturerCode, HueFirmwareClient)
      case 0x117C: return this.#createHandler(manufacturerCode, IkeaFirmwareClient)
      default: return this.#createHandler(0, ZigbeeOtaFirmwareClient)
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

/** Client for zigbee-OTA firmware server,
  * see {@link https://github.com/Koenkk/zigbee-OTA}.
  *
  * @extends HttpClient
  */
class ZigbeeOtaFirmwareClient extends HttpClient {
  /** Create a new instance of a FirmwareClient.
    *
    * @param {object} params - Parameters.
    * @param {integer} [params.maxSockets=10] - Throttle requests to maximum
    * number of parallel connections.
    * @param {integer} [params.timeout=5] - Request timeout (in seconds).
    */
  constructor (params = {}) {
    const _options = {
      maxSockets: 10,
      timeout: 5
    }
    const optionParser = new OptionParser(_options)
    optionParser
      .instanceKey('logger')
      .intKey('timeout', 1, 60)
      .parse(params)

    const options = {
      host: 'raw.githubusercontent.com',
      https: true,
      keepAlive: true,
      logger: _options.logger,
      maxSockets: _options.maxSockets,
      path: '/Koenkk/zigbee-OTA/master',
      timeout: _options.timeout
    }
    super(options)
  }

  async check (otau) {
    if (this.imageMap == null) {
      this.imageMap = {}
      const { body } = await this.get('/index.json')
      const images = JSON.parse(body)
      for (const image of images) {
        const fileNamePrefix = [
          toHexString(image.manufacturerCode, 4),
          toHexString(image.imageType, 4),
          toHexString(image.fileVersion, 8)
        ].join('-')
        if (this.imageMap[fileNamePrefix] != null) {
          this.imageMap[fileNamePrefix].duplicate = true
          continue
        }
        this.imageMap[fileNamePrefix] = {
          version: image.fileVersion,
          url: image.url,
          sha512: image.sha512
        }
      }
      this.debug(
        '%s: found %d firmware files', this.name,
        Object.keys(this.imageMap).length
      )
    }
    const image = this.imageMap[otau.fileNamePrefix]
    if (image == null || image.duplicate) {
      return false
    }
    otau.newVersion = image.version
    otau.url = image.url
    otau.sha512 = image.sha512
    return true
  }
}

/** Client for Hue firmware server.
  *
  * @extends HttpClient
  */
class HueFirmwareClient extends HttpClient {
  /** Create a new instance of a HueFirmwareClient.
    *
    * @param {object} params - Parameters.
    * @param {integer} [params.maxSockets=10] - Throttle requests to maximum
    * number of parallel connections.
    * @param {integer} [params.timeout=5] - Request timeout (in seconds).
    */
  constructor (params = {}) {
    const _options = {
      maxSockets: 10,
      timeout: 5
    }
    const optionParser = new OptionParser(_options)
    optionParser
      .instanceKey('logger')
      .intKey('timeout', 1, 60)
      .parse(params)

    const options = {
      host: 'firmware.meethue.com',
      https: true,
      keepAlive: true,
      logger: _options.logger,
      maxSockets: _options.maxSockets,
      timeout: _options.timeout
    }
    super(options)
    this.imageMap = {}
  }

  async check (otau) {
    otau.deviceTypeId = toHexString(otau.manufacturerCode, 4).toLowerCase() + '-' +
      toHexString(otau.imageType, 3).toLowerCase()
    const { body } = await this.get(
      '/v1/checkUpdate?deviceTypeId=' + otau.deviceTypeId + '&version=' + (otau.fileVersion - 1)
    )
    const image = body?.updates?.[0]
    if (image == null) {
      return false
    }
    otau.newVersion = image.version
    otau.url = image.binaryUrl
    otau.md5 = image.md5
    return true
  }
}

// https://fw.ota.homesmart.ikea.com/check/update/prod
// https://fw.ota.homesmart.ikea.com/files/tradfri-bulb-cws-zll_release_prod_v587753009_ec8b1193-0fa2-440e-b921-2412a8688b74.ota
/** Client for Ikea firmware server.
  *
  * @extends HttpClient
  */
class IkeaFirmwareClient extends HttpClient {
  /** Create a new instance of an IkeaFirmwareClient.
    *
    * @param {object} params - Parameters.
    * @param {integer} [params.maxSockets=10] - Throttle requests to maximum
    * number of parallel connections.
    * @param {integer} [params.timeout=5] - Request timeout (in seconds).
    */
  constructor (params = {}) {
    const _options = {
      maxSockets: 10,
      timeout: 5
    }
    const optionParser = new OptionParser(_options)
    optionParser
      .instanceKey('logger')
      .intKey('timeout', 1, 60)
      .parse(params)

    const options = {
      host: 'fw.ota.homesmart.ikea.com',
      https: true,
      keepAlive: true,
      logger: _options.logger,
      maxSockets: _options.maxSockets,
      selfSignedCertificate: true,
      timeout: _options.timeout
    }
    super(options)
  }

  async check (otau) {
    if (this.imageMap == null) {
      this.imageMap = {}
      const { body } = await this.get('/check/update/prod')
      for (const image of body) {
        if (image.fw_type === 2 && image.fw_image_type != null) {
          // need to download the file to check version?!
          this.imageMap[image.fw_image_type] = {
            sha256: image.fw_sha3_256,
            url: image.fw_binary_url
          }
        }
      }
      this.debug(
        '%s: found %d firmware files', this.name,
        Object.keys(this.imageMap).length
      )
    }
    const image = this.imageMap[otau.imageType]
    if (image == null) {
      return false
    }
    otau.url = image.url
    otau.sha256 = image.sha256
    return true
  }
}

export { FirmwareClient }
