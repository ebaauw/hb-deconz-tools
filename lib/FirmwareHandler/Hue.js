// hb-deconz-tools/lib/FirmwareHandler/Hue.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { toHexString } from 'hb-lib-tools'
import { OptionParser } from 'hb-lib-tools/OptionParser'
import { FirmwareHandler } from 'hb-deconz-tools/FirmwareHandler'

/** Handler for Hue firmware server.
  *
  * @extends FirmwareHandler
  */
class HueFirmwareHandler extends FirmwareHandler {
  /** Create a new instance of a HueFirmwareHandler.
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
      path: '',
      timeout: _options.timeout
    }
    super(options)
    this.handlerName = 'hue'
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

FirmwareHandler.Hue = HueFirmwareHandler
