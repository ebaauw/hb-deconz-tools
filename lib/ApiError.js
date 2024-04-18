// hb-deconz-tools/lib/ApiError.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2024 Erik Baauw. All rights reserved.

import { HttpClient } from 'hb-lib-tools'

// API errors that could still cause (part of) the PUT command to be executed.
const nonCriticalApiErrorTypes = [
  6, // parameter not available
  7, // invalid value for parameter
  8, // paramater not modifiable
  201 // paramater not modifiable, device is set to off
]

/** deCONZ API error.
  * @extends HttpClient.HttpError
  */
class ApiError extends HttpClient.HttpError {
  /** Create a new instance of a deCONZ API error.
    * @param {Object} e - The `"error"` API response.
    * @param {HttpClient.HttpResponse} response - The HTTP response.
    */
  constructor (e, response) {
    super(
      `${e.address}: api error ${e.type}: ${e.description}`,
      response.request, response.statusCode, response.statusMessage
    )

    /** @member {integer} - The API error type.
      */
    this.type = e.type

    /** @member {string} - The address causing the error.
      */
    this.address = e.address

    /** @member {string} - The API error description.
      */
    this.description = e.description

    /** @member {boolean} - Indication that the request might still succeed
      * for other attributes.
      */
    this.nonCritical = nonCriticalApiErrorTypes.includes(e.type)
  }
}

export { ApiError }
