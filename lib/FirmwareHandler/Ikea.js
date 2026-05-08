// hb-deconz-tools/lib/FirmwareHandler/Ikea.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { toHexString } from 'hb-lib-tools'
import { OptionParser } from 'hb-lib-tools/OptionParser'
import { FirmwareHandler } from 'hb-deconz-tools/FirmwareHandler'

// https://fw.ota.homesmart.ikea.com/check/update/prod
// https://fw.ota.homesmart.ikea.com/files/tradfri-bulb-cws-zll_release_prod_v587753009_ec8b1193-0fa2-440e-b921-2412a8688b74.ota
/** Handler for Ikea firmware server.
  *
  * @extends FirmwareHandler
  */
class IkeaFirmwareHandler extends FirmwareHandler {
  /** Create a new instance of an IkeaFirmwareHandler.
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
      path: '',
      selfSignedCertificate: true,
      timeout: _options.timeout
    }
    super(options)
    this.handlerName = 'ikea'
  }

  async init () {
    const { body } = await this.get('/check/update/prod')
    for (const elt of body) {
      if (elt.fw_type !== 2 || elt.fw_image_type == null) {
        continue
      }
      const a = /_v(\d+)_/.exec(elt.fw_binary_url)
      const fileVersion = parseInt(a?.[1])
      if (fileVersion == null || isNaN(fileVersion)) {
        continue
      }
      const image = {
        manufacturerCode: 0x117C,
        imageType: elt.fw_image_type,
        fileVersion,
        url: elt.fw_binary_url,
        sha256: elt.fw_sha3_256
      }
      const key = [
        toHexString(image.manufacturerCode, 4),
        toHexString(image.imageType, 4)
      ].join('-')
      if (this.imageMap[key] == null) {
        this.imageMap.nDevices++
        this.imageMap[key] = {
          manufacturerCode: image.manufacturerCode,
          imageType: image.imageType
        }
      }
      const device = this.imageMap[key]
      if (device.versions == null) {
        device.versions = {}
      }
      image.fileNamePrefix = [key, toHexString(image.fileVersion, 8)].join('-')
      this.imageMap.nImages++
      device.versions[image.fileNamePrefix] = image
    }
    this.debug(
      '%s: found %d firmware images for %d devices', this.name,
      this.imageMap.nImages, this.imageMap.nDevices
    )
  }

  async check (otau) {
    const key = [
      toHexString(otau.manufacturerCode, 4),
      toHexString(otau.imageType, 4)
    ].join('-')
    const device = this.imageMap[key]
    if (device == null) {
      otau.status = 'device not found'
      return false
    }
    otau.image = device
    otau.status = 'device found'
    return true
  }
}

FirmwareHandler.Ikea = IkeaFirmwareHandler
