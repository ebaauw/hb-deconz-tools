// hb-deconz-tools/lib/OtauTool.js
//
// Homebridge deCONZ Tools.
// Copyright © 2023-2025 Erik Baauw. All rights reserved.

import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import { toHexString } from 'hb-lib-tools'
import { CommandLineParser } from 'hb-lib-tools/CommandLineParser'
import { CommandLineTool } from 'hb-lib-tools/CommandLineTool'
import { HttpClient } from 'hb-lib-tools/HttpClient'
import { OptionParser } from 'hb-lib-tools/OptionParser'

import { OtauImage } from 'hb-deconz-tools/OtauImage'

const { b, u } = CommandLineTool

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
  constructor (pkgJson) {
    super()
    this.usage = usage
    this.options = {
      timeout: 5
    }
    this.pkgJson = pkgJson
  }

  parseArguments () {
    const parser = new CommandLineParser(this.pkgJson)
    parser
      .help('h', 'help', help)
      .version('V', 'version')
      .flag('D', 'debug', () => {
        if (this.debugEnabled) {
          this.setOptions({ vdebug: true })
        } else {
          this.setOptions({ debug: true, chalk: true })
        }
      })
      .option('t', 'timeout', (value) => {
        this.options.timeout = OptionParser.toInt(
          'timeout', value, 1, 60, true
        )
      })
      .remaining((list) => { this.fileList = list })
      .parse()
  }

  async main () {
    try {
      this.parseArguments()
      await this.list()
    } catch (error) {
      await this.fatal(error)
    }
  }

  createClient (params) {
    const options = {
      https: true,
      maxSockets: 10,
      timeout: this.options.timeout,
      validStatusCodes: [200, 302]
    }
    Object.assign(options, params)
    const client = new HttpClient(options)
    client
      .on('error', (error) => {
        this.log(
          '%s: request %d: %s %s', params.name, error.request.id,
          error.request.method, error.request.resource
        )
        this.debug(
          '%s: request %d: %s %s', params.name, error.request.id,
          error.request.method, error.request.url
        )
        this.warn(
          '%s: request %d: error: %s', params.name, error.request.id, error
        )
      })
      .on('request', (request) => {
        this.debug(
          '%s: request %d: %s %s', params.name, request.id,
          request.method, request.resource
        )
        this.vdebug(
          '%s: request %d: %s %s', params.name, request.id,
          request.method, request.url
        )
      })
      .on('response', (response) => {
        this.vdebug(
          '%s: request %d: response: %j', params.name, response.request.id,
          response.body
        )
        this.debug(
          '%s: request %d: %d %s', params.name, response.request.id,
          response.statusCode, response.statusMessage
        )
      })
    return client
  }

  validate (image) {
    const hash = createHash('sha512')
    hash.update(image.body)
    if (image.body.length !== image.fileSize) {
      this.warn('%s: size mismatch', image.fileName)
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
  }

  async getImage (image) {
    let body
    if (image.url.startsWith('https://github.com/Koenkk/zigbee-OTA/raw/master/images')) {
      if (this.client == null) {
        this.client = this.createClient({
          name: 'koenkk',
          host: 'raw.githubusercontent.com',
          path: '/Koenkk/zigbee-OTA/master'
        })
      }
      body = (await this.client.get(image.url.slice(47))).body
    } else if (image.url.startsWith('https://otau.meethue.com/storage')) {
      if (this.hueClient == null) {
        this.hueClient = this.createClient({
          name: 'meethue',
          host: 'otau.meethue.com',
          path: '/storage',
          selfSignedCertificate: true
        })
      }
      body = (await this.hueClient.get(image.url.slice(32))).body
    } else if (image.url.startsWith('https://tr-zha.s3.amazonaws.com/firmware')) {
      if (this.awsClient == null) {
        this.awsClient = this.createClient({
          name: 'aws',
          host: 'tr-zha.s3.amazonaws.com',
          path: '/firmware'
        })
      }
      body = (await this.awsClient.get(image.url.slice(40))).body
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
      body = response.body
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
      this.debug('%s: downloading...', image.fileName)
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
    image.manufacturerCodeHex = toHexString(image.manufacturerCode, 4)
    image.imageTypeHex = toHexString(image.imageType, 4)
    image.fileVersionHex = toHexString(image.fileVersion, 8)
    const fileNameElements = [
      image.manufacturerCodeHex, image.imageTypeHex, image.fileVersionHex
    ]
    if (image.duplicate) {
      this.warn(
        '%s-%s-%s: %j: duplicate image',
        image.manufacturerCodeHex, image.imageTypeHex, image.fileVersionHex, image.modelId
      )
      fileNameElements.push(image.modelId)
    }
    image.fileName = fileNameElements.join('-') + '.zigbee'
  }

  async list () {
    this.client = this.createClient({
      name: 'koenkk',
      host: 'raw.githubusercontent.com',
      path: '/Koenkk/zigbee-OTA/master'
    })
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
      return a.modelId - b.modelId
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
