// hb-deconz-tools/lib/ApiResponse.js
//
// Homebridge deCONZ Tools.
// Copyright © 2018-2024 Erik Baauw. All rights reserved.

'use strict'

const { HttpClient } = require('hb-lib-tools')
const { ApiError } = require('../index')

/** Deconz API response.
  * @extends HttpClient.HttpResponse
  */
class ApiResponse extends HttpClient.HttpResponse {
  /** Create a new instance of ApiResponse.
    * @param {HttpClient.HttpResponse} response - The HTTP response.
    */
  constructor (response) {
    super(
      response.request, response.statusCode, response.statusMessage,
      response.headers, response.body, response.parsedBody
    )

    /** @member {object} - An object with the `"success"` API responses.
      */
    this.success = {}

    /** @member {ApiError[]} - A list of `"error"` API responses.
      */
    this.errors = []

    if (Array.isArray(response.body)) {
      for (const id in response.body) {
        const e = response.body[id].error
        if (e != null && typeof e === 'object') {
          this.errors.push(new ApiError(e, response))
        }
        const s = response.body[id].success
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

module.exports = ApiResponse
