// hb-deconz-tools/lib/ApiResponse.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2026 Erik Baauw. All rights reserved.

import { ApiError } from 'hb-deconz-tools/ApiError'

/** Wrapper for deCONZ gateway REST API response.
  * <br>See {@link ApiResponse}.
  * @name ApiResponse
  * @type {Class}
  * @memberof module:hb-deconz-tools
  */

/** Deconz API response.
  * @extends HttpClient.HttpResponse
  */
class ApiResponse {
  /** Create a new instance of ApiResponse.
    * @param {HttpClient.HttpResponse} response - The HTTP response.
    */
  constructor (response) {
    this.request = response.request
    this.body = response.jsonBody

    /** @member {object} - An object with the `"success"` API responses.
      */
    this.success = {}

    /** @member {ApiError[]} - A list of `"error"` API responses.
      */
    this.errors = []

    if (Array.isArray(this.body)) {
      for (const id in this.body) {
        const e = this.body[id].error
        if (e != null && typeof e === 'object') {
          this.errors.push(new ApiError(e, response))
        }
        const s = this.body[id].success
        if (s != null && typeof s === 'object') {
          for (const path of Object.keys(s)) {
            const keys = path.split('/')
            let obj = this.success
            for (let i = 1; i < keys.length - 1; i++) {
              if (obj[keys[i]] == null) {
                obj[keys[i]] = {}
              }
              obj = obj[keys[i]]
            }
            obj[keys[keys.length - 1]] = s[path]
          }
        }
      }
    }
  }
}

export { ApiResponse }
