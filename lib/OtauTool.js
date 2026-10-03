// hb-deconz-tools/lib/OtauTool.js
//
// Homebridge deCONZ Tools.
// Copyright © 2023-2026 Erik Baauw. All rights reserved.

import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import { toHexString } from 'hb-lib-tools'
import { CommandLineTool, CommandLineParser, b, u } from 'hb-lib-tools/CommandLineTool'
import { HttpClient } from 'hb-lib-tools/HttpClient'
import { toInt } from 'hb-lib-tools/OptionParser'

import { OtauImage } from 'hb-deconz-tools/OtauImage'

import defaultPackageJson from '../package.json' with { type: 'json' }

const usage = `${b('otau')} [${b('-hVD')}] [${b('-t')} ${u('timeout')}]`
// const usage = `${b('otau')} [${b('-hVD')}] [${b('-t')} ${u('timeout')}] [${u('command')}] [${u('parameter')}...]`
const help = `Handle Zigbee OTAU files.

Usage: ${usage}

Download OTAU files from the ${b('zigbee-OTA')} repository 
into the current directory, using the file names as expected by
the deCONZ OTAU plugin.

Parameters:
  ${b('-h')}, ${b('--help')}
  Print this help and exit.

  ${b('-V')}, ${b('--version')}
  Print version and exit.

  ${b('-D')}, ${b('--debug')}
  Print debug messages.
  
  ${b('-t')} ${u('timeout')}, ${b('--timeout=')}${u('timeout')}
  Set timeout to ${u('timeout')} seconds instead of default ${b(5)}.`

class OtauTool extends CommandLineTool {
  constructor (packageJson) {
    super(packageJson ?? defaultPackageJson)
    this.usage = usage
    this.options = {
      timeout: 5
    }
  }

  parseArguments () {
    const parser = new CommandLineParser(this)
    parser
      .helpFlag('h', 'help', help)
      .versionFlag('V', 'version')
      .debugFlag('D', 'debug')
      .option('t', 'timeout', (value) => {
        this.options.timeout = toInt(
          value, { key: 'timeout', min: 1, max: 60, userInput: true }
        )
      })
      .remaining((list) => { this.fileList = list })
      .parse()
  }

  async main () {
    try {
      this.parseArguments()
      await this.list()
    } catch (error) { this.fatal(error) }
  }

  createClient (params) {
    const options = {
      https: true,
      logger: this,
      maxSockets: 10,
      timeout: this.options.timeout,
      validStatusCodes: [200, 302]
    }
    Object.assign(options, params)
    const client = new HttpClient(options)
    return client
  }

  validate (image) {
    const hash = createHash('sha512')
    hash.update(image.body)
    if (image.body.length !== image.fileSize) {
      this.warn('%s: size mismatch (index: %d, actual: %d, diff: %d)', image.fileName, image.fileSize, image.body.length, image.body.length - image.fileSize)
    }
    if (hash.digest('hex') !== image.sha512) {
      this.warn('%s: checksum error', image.fileName)
    }
    try {
      image.image = new OtauImage(image.body)
    } catch (error) {
      this.warn('%s: %s', image.fileName, error)
      return
    }
    if (image.image.manufacturerCode !== image.manufacturerCode) {
      this.warn('%s: manufacturer code mismatch %j vs %j', image.fileName, image.image.manufacturerCode, image.manufacturerCode)
    }
    if (image.image.imageType !== image.imageType) {
      this.warn('%s: image type mismatch', image.fileName)
    }
    if (image.image.fileVersion !== image.fileVersion) {
      this.warn('%s: file version mismatch', image.fileName)
    }
    // if (image.image.imageSize !== image.body.length) {
    //   this.warn('%s: image size mismatch (header: %d, actual: %d, diff: %d)', image.fileName, image.image.imageSize, image.body.length, image.body.length - image.image.imageSize)
    // }
  }

  async getImage (image) {
    let body
    if (image.url.startsWith(this.client.url)) {
      if (this.client == null) {
        this.client = this.createClient({
          name: 'koenkk',
          host: 'raw.githubusercontent.com',
          path: '/Koenkk/zigbee-OTA/master'
        })
      }
      const response = await this.client.get(image.url.slice(this.client.url.length))
      body = response.rawBody
    } else {
      const url = new URL(image.url)
      const client = this.createClient({
        name: url.hostname,
        host: url.host
      })
      const response = await client.get(url.pathname + url.search)
      if (response.statusCode === 302) {
        image.url = response.headers.location
        return this.getImage(image)
      }
      body = response.rawBody
    }
    image.body = body
    this.validate(image)
    return body
  }

  async downloadImage (image) {
    if (this.files[image.fileName] != null && this.files[image.fileName] !== image.url) {
      this.warn('%s: duplicate filename', image.fileName, image.modelId)
      return
    }
    this.files[image.fileName] = image.url
    try {
      this.debug('%s: downloading from %s...', image.fileName, image.url)
      await this.getImage(image)
      await writeFile(image.fileName, image.body)
      this.debug('%s: download OK', image.fileName)
    } catch (error) {
      if (!(error instanceof HttpClient.HttpError)) {
        this.error(error)
      }
    }
  }

  enrich (image) {
    image.manufacturerCodeHex = toHexString(image.manufacturerCode, { length: 4 })
    image.imageTypeHex = toHexString(image.imageType, { length: 4 })
    image.fileVersionHex = toHexString(image.fileVersion, { length: 8 })
    const fileNameElements = [
      image.manufacturerCodeHex, image.imageTypeHex, image.fileVersionHex
    ]
    if (image.duplicate) {
      if (image.modelId != null) {
        fileNameElements.push(image.modelId)
      } else if (image.hardwareVersionMin != null) {
        fileNameElements.push(image.hardwareVersionMin)
        fileNameElements.push(image.hardwareVersionMax)
      } else {
        this.warn(
          '%s-%s-%s: duplicate image',
          image.manufacturerCodeHex, image.imageTypeHex, image.fileVersionHex
        )
      }
    }
    image.fileName = fileNameElements.join('-') + '.zigbee'
  }

  async list () {
    this.client = this.createClient({
      name: 'koenkk',
      host: 'raw.githubusercontent.com',
      path: '/Koenkk/zigbee-OTA/master'
    })
    this.client.setMaxListeners(Infinity)
    const { body } = await this.client.get('/index.json')
    await writeFile('index.json', body)
    const images = JSON.parse(body)
    const sortedImages = images.sort((a, b) => {
      if (a.manufacturerCode !== b.manufacturerCode) {
        return a.manufacturerCode - b.manufacturerCode
      }
      if (a.imageType !== b.imageType) {
        return a.imageType - b.imageType
      }
      if (a.fileVersion !== b.fileVersion) {
        return a.fileVersion - b.fileVersion
      }
      a.duplicate = true
      b.duplicate = true
      if (a.modelId !== b.modelId) {
        return a.modelId - b.modelId
      }
      if (a.hardwareVersionMin !== b.hardwareVersionMin) {
        return a.hardwareVersionMin - b.hardwareVersionMin
      }
      return 0
    })
    this.debug('koenkk: found %d images', images.length)
    this.files = []
    const jobs = []
    for (const image of sortedImages) {
      this.enrich(image)
      jobs.push(this.downloadImage(image))
    }
    for (const job of jobs) {
      await job
    }
  }
}

export { OtauTool }
