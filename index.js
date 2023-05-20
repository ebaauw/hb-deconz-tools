// hb-deconz-tools/index.js
//
// Homebridge deCONZ Tools.
// Copyright © 202-2023 Erik Baauw. All rights reserved.

'use strict'

/** Homebridge deCONZ Tools.
  *
  * @module hbDeconzTools
  */
class hbDeconzTools {
  /** Client for deCONZ gateway REST API.
    * <br>See {@link ApiClient}.
    * @type {Class}
    * @memberof module:hbDeconzTools
    */
  static get ApiClient () { return require('./lib/ApiClient') }

  /** Wrapper for for deCONZ gateway REST API error.
    * <br>See {@link ApiError}.
    * @type {Class}
    * @memberof module:hbDeconzTools
    */
  static get ApiError () { return require('./lib/ApiError') }

  /** Wrapper for deCONZ gateway REST API response.
    * <br>See {@link ApiResponse}.
    * @type {Class}
    * @memberof module:hbDeconzTools
    */
  static get ApiResponse () { return require('./lib/ApiResponse') }

  /** deCONZ gateway disovery.
    * <br>See {@link Discovery}.
    * @type {Class}
    * @memberof module:hbDeconzTools
    */
  static get Discovery () { return require('./lib/Discovery') }

  /** Client for deCONZ gateway web socket notifications.
    * <br>See {@link WsClient}.
    * @type {Class}
    * @memberof module:hbDeconzTools
    */
  static get WsClient () { return require('./lib/WsClient') }

  /** Command-line tool.
    * <br>See {@link DeconzTool}.
    * @type {Class}
    * @memberof module:hbDeconzTools
    */
  static get DeconzTool () { return require('./lib/DeconzTool') }

  // Command-line tools.
  static get NbTool () { return require('./lib/NbTool') }
}

module.exports = hbDeconzTools
