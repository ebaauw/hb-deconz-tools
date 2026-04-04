// hb-deconz-tools/lib/Discovery.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { EventEmitter, once } from 'node:events'

import xml2js from 'xml2js'

import { HttpClient } from 'hb-lib-tools/HttpClient'
import { OptionParser } from 'hb-lib-tools/OptionParser'
import { UpnpClient } from 'hb-lib-tools/UpnpClient'

/** deCONZ gateway disovery.
  * <br>See {@link Discovery}.
  * @name Discovery
  * @type {Class}
  * @memberof module:hb-deconz-tools
  */

/** Class for discovery of deCONZ gateways.
  *
  * See the [deCONZ API](https://dresden-elektronik.github.io/deconz-rest-doc/)
  * documentation for a better understanding of the API.
  * @extends EventEmitter
  */
class Discovery extends EventEmitter {
  /** Create a new instance.
    * @param {object} params - Parameters.
    * @param {?*} params.logger - Logger to use for logging.  If null, no logging is done.
    * @param {integer} [params.timeout=5] - Timeout (in seconds) for requests.
    */
  constructor (params = {}) {
    super()
    this._options = {
      timeout: 5
    }
    const optionParser = new OptionParser(this._options)
    optionParser
      .intKey('timeout', 1, 60)
      .instanceKey('logger')
      .parse(params)
    this.setLogger(this._options.logger)
  }

  /** Sets the logger for the HttpClient.
    * @param {?} logger - An instance of a class with logging methods.
    * Typically this would be subclass of `Delegate` from `homebridge-lib`
    * or of `CommandLineTool`.
    */
  setLogger (logger) {
    for (const f of ['warn', 'log', 'debug', 'vdebug', 'vvdebug']) {
      this[f] = logger?.[f]?.bind(logger) ?? (() => {})
    }
  }

  /** Issue an unauthenticated GET request of `/api/config` to given host.
    *
    * @param {string} host - The IP address or hostname and port of the deCONZ gateway.
    * @param {boolean} [https=false] - Connect to the deCONZ gateway over HTTPS.
    * @return {object|null} response - The JSON response body converted to
    * JavaScript, or null when the response doesn't come from deCONZ.
    * @throws {HttpError} In case of error.
    */
  async config (host, https = false) {
    const options = {
      host,
      https,
      json: true,
      name: host + ' config',
      logger: this._options.logger,
      path: '/api',
      selfSignedCertificate: https,
      timeout: this._options.timeout
    }
    const client = new HttpClient(options)
    let retry = false
    client
      .on('error', (error) => {
        if (
          error.message === 'socket hang up' ||
          error.message === 'Client network socket disconnected before secure TLS connection was established'
        ) {
          retry = true
          return
        }
        /** Emitted when an error has occured.
          *
          * @event Discovery#error
          * @param {HttpError} error - The error.
          */
        this.emit('error', error)
      })
      .on('request', (request) => {
        /** Emitted when request has been sent.
          *
          * @event Discovery#request
          * @param {HttpRequest} request - The request.
          */
        this.emit('request', request)
      })
      .on('response', (response) => {
        /** Emitted when a valid response has been received.
          *
          * @event Discovery#response
          * @param {HttpResponse} response - The response.
          */
        this.emit('response', response)
      })
    try {
      const { body } = await client.get('/config')
      if (
        body != null && typeof body === 'object' &&
        typeof body.apiversion === 'string' &&
        /[0-9A-Fa-f]{16}/.test(body.bridgeid) &&
        typeof body.devicename === 'string' &&
        typeof body.name === 'string' &&
        typeof body.swversion === 'string'
      ) {
        if (body.bridgeid.startsWith('00212E')) {
          body.https = https
          return body
        }
        throw new Error(`${body.bridgeid}: not a RaspBee/ConBee mac address`)
      }
      throw new Error('not a deCONZ gateway')
    } catch (error) {
      if (retry) {
        return this.config(host, !https)
      }
      throw error
    }
  }

  /** Issue an unauthenticated GET request of `/description.xml` to given host.
    *
    * @param {string} host - The IP address or hostname and port of the deCONZ gateway.
    * @param {boolean} [https=false] - Connect to the deCONZ gateway over HTTPS.
    * @return {object} response - The description, converted to JavaScript.
    * @throws {Error} In case of error.
    */
  async description (host, https = false) {
    const parser = new xml2js.Parser({ explicitArray: false })
    const options = {
      host,
      https,
      logger: this._options.logger,
      name: host + ' description',
      selfSignedCertificate: https,
      timeout: this._options.timeout,
      xmlParser: async (xml) => { return parser.parseStringPromise(xml) }
    }
    const client = new HttpClient(options)
    const { body } = await client.get('/description.xml')
    return body
  }

  /** Discover deCONZ gateways.
    *
    * Queries the Phoscon portal for known gateways and does a local search
    * over UPnP.
    * Calls {@link Discovery#config config()} for each discovered gateway
    * for verification.
    * @param {boolean} [stealth=false] - Don't query discovery portals.
    * @return {object} response - Response object with a key/value pair per
    * found gateway.  The key is the host (IP address or hostname and port),
    * the value is the return value of {@link Discovery#config config()}.
    */
  async discover (stealth = false) {
    this.foundMap = {}
    this.gatewayMap = {}
    this.jobs = []
    this.jobs.push(this.#upnp())
    if (!stealth) {
      this.jobs.push(this.#nupnp({
        name: 'phoscon.de',
        https: true,
        host: 'phoscon.de',
        path: '/discover'
      }))
    }
    for (const job of this.jobs) {
      await job
    }
    return this.gatewayMap
  }

  #found (name, id, host) {
    this.debug('%s: found %s at %s', name, id, host)
    /** Emitted when a potential gateway has been found.
      * @event Discovery#found
      * @param {string} name - The name of the search method.
      * @param {string} bridgeid - The ID of the gateway.
      * @param {string} host - The IP address/hostname and port of the gateway
      * or gateway.
      */
    this.emit('found', name, id, host)
    if (this.foundMap[host] == null) {
      this.foundMap[host] = id
      this.jobs.push(
        this.config(host).then((config) => {
          this.description(host).then((description) => {
            if (description?.root?.device?.['deconz:info']?.httpsPort != null) {
              config.https = true
              host = host.split(':')[0] + ':' + description.root.device['deconz:info'].httpsPort
            }
            this.gatewayMap[host] = config
          }).catch((error) => {
            if (error.request == null) {
              this.emit('error', error)
            }
          })
        }).catch((error) => {
          delete this.foundMap[host]
          if (error.request == null) {
            this.emit('error', error)
          }
        })
      )
    }
  }

  async #upnp () {
    if (this.upnpClient == null) {
      this.upnpClient = new UpnpClient({
        filter: (message) => {
          return /^[0-9A-F]{16}$/.test(message['gwid.phoscon.de'])
        },
        timeout: this._options.timeout
      })
      this.upnpClient
        .on('error', (error) => { this.emit('error', error) })
        .on('searching', (host) => {
          this.debug('upnp: listening on %s', host)
          /** Emitted when search has started.
            *
            * @event Discovery#searching
            * @param {string} name - The name of the search method.
            * @param {string} host - The IP address and port from which the
            * search was started.
            */
          this.emit('searching', 'upnp', host)
        })
        .on('request', (request) => {
          this.upnpRequestId = request.id
          this.debug('upnp: request %d: %s', request.id, request.method)
          this.vdebug(
            'upnp: request %d: %s %s %s', request.id,
            request.method, request.host, request.resource
          )
          request.name = 'upnp'
          this.emit('request', request)
        })
        .on('deviceFound', (address, obj, message) => {
          let host
          const a = obj.location.split('/')
          if (a.length > 3 && a[2] != null) {
            host = a[2]
            const b = host.split(':')
            const port = parseInt(b[1])
            if (port === 80) {
              host = b[0]
            }
            this.vvdebug('upnp: request %d: found %j', this.upnpRequestId, message)
            this.vdebug('upnp: request %d: found %j', this.upnpRequestId, {
              location: obj.location, 'gwid.phoscon.de': obj['gwid.phoscon.de']
            })
            this.#found('upnp', obj['gwid.phoscon.de'], host)
          }
        })
    }
    this.upnpClient.search()
    await once(this.upnpClient, 'searchDone')
    this.debug('upnp: search done')
    /** Emitted when UPnP search has concluded.
      *
      * @event Discovery#searchDone
      */
    this.emit('searchDone', 'upnp')
  }

  async #nupnp (options) {
    options.json = true
    options.logger = this._options.logger
    options.timeout = this._options.timeout
    if (this.client == null) {
      this.client = new HttpClient(options)
    }
    try {
      const { body } = await this.client.get()
      if (Array.isArray(body)) {
        for (const gateway of body) {
          let host = gateway.internalipaddress
          if (gateway.internalport != null && gateway.internalport !== 80) {
            host += ':' + gateway.internalport
          }
          this.#found(options.name, gateway.id.toUpperCase(), host)
        }
      }
    } catch (error) {
      if (error instanceof HttpClient.HttpError) {
        return
      }
      this.emit('error', error)
    }
  }
}

export { Discovery }
