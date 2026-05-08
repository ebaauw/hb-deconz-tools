// hb-deconz-tools/lib/FirmwareHandler/ZigbeeOta.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { toHexString } from 'hb-lib-tools'
import { OptionParser } from 'hb-lib-tools/OptionParser'
import { FirmwareHandler } from 'hb-deconz-tools/FirmwareHandler'

/** Handler for zigbee-OTA firmware server,
  * see {@link https://github.com/Koenkk/zigbee-OTA}.
  *
  * @extends FirmwareHandler
  */
class ZigbeeOtaFirmwareHandler extends FirmwareHandler {
  /** Create a new instance of a ZigbeeOtaFirmwareHandler.
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
    this.handlerName = 'zigbee-ota'
  }

  async init () {
    this.imageMap = {}
    let nDevices = 0
    let nImages = 0
    const { body } = await this.get('/index.json')
    const images = JSON.parse(body)
    for (const image of images) {
      const key = [
        toHexString(image.manufacturerCode, 4),
        toHexString(image.imageType, 4)
      ].join('-')
      if (this.imageMap[key] == null) {
        nDevices++
        this.imageMap[key] = {
          manufacturerCode: image.manufacturerCode,
          imageType: image.imageType
        }
      }
      const device = this.imageMap[key]
      let versions
      if (image.modelId != null) {
        if (device.models == null) {
          device.models = {}
        }
        device.models[image.modelId] = { versions: {} }
        versions = device.models[image.modelId].versions
      } else if (image.hardwareVersionMin != null || image.hardwareVersionMax != null) {
        if (device.hardwareVersions == null) {
          device.hardwareVersions = {}
        }
        const key = [image.hardwareVersionMin, image.hardwareVersionMax].join('-')
        device.hardwareVersions[key] = { versions: {} }
        versions = device.hardwareVersions[key].versions
      } else {
        if (device.versions == null) {
          device.versions = {}
        }
        versions = device.versions
      }
      image.fileNamePrefix = [key, toHexString(image.fileVersion, 8)].join('-')
      if (versions[image.fileNamePrefix] != null) {
        versions[image.fileNamePrefix].duplicate = true
        this.warn('%s: duplicate image', image.fileNamePrefix)
        continue
      }
      nImages++
      versions[image.fileNamePrefix] = image
    }
    this.debug(
      '%s: found %d firmware images for %d devices', this.name,
      nImages, nDevices
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

FirmwareHandler.ZigbeeOta = ZigbeeOtaFirmwareHandler
