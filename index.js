// hb-deconz-tools/index.js
//
// Homebridge deCONZ Tools.
// Copyright © 2022-2024 Erik Baauw. All rights reserved.

/** Homebridge deCONZ Tools.
  *
  * @module hbDeconzTools
  */

/** Client for deCONZ gateway REST API.
  * <br>See {@link ApiClient}.
  * @name ApiClient
  * @type {Class}
  * @memberof module:hbDeconzTools
  */
export { ApiClient } from './lib/ApiClient.js'

/** Wrapper for deCONZ gateway REST API error.
  * <br>See {@link ApiError}.
  * @name ApiError
  * @type {Class}
  * @memberof module:hbDeconzTools
  */
export { ApiError } from './lib/ApiError.js'

/** Wrapper for deCONZ gateway REST API response.
  * <br>See {@link ApiResponse}.
  * @name ApiResponse
  * @type {Class}
  * @memberof module:hbDeconzTools
  */
export { ApiResponse } from './lib/ApiResponse.js'

/** deCONZ gateway disovery.
  * <br>See {@link Discovery}.
  * @name Discovery
  * @type {Class}
  * @memberof module:hbDeconzTools
  */
export { Discovery } from './lib/Discovery.js'

/** Zigbee OTAU image.
  * <br>See {@link OtauImage}.
  * @name OtauImage
  * @type {Class}
  * @memberof module:hbDeconzTools    */
export { OtauImage } from './lib/OtauImage.js'

/** Client for deCONZ gateway web socket notifications.
  * <br>See {@link WsClient}.
  * @name WsClient
  * @type {Class}
  * @memberof module:hbDeconzTools
  */
export { WsClient } from './lib/WsClient.js'

// Command-line tools.
export { DeconzTool } from './lib/DeconzTool.js'
export { OtauTool } from './lib/OtauTool.js'
