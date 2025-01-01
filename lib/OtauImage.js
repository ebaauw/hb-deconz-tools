// hb-deconz-tools/lib/OtauImage.js
//
// Homebridge deCONZ Tools.
// Copyright © 2020-2025 Erik Baauw. All rights reserved.

const HEADER_MAGIC_NUMBER = 0x0BEEF11E
const HEADER_VERSION = 0x0100
const HEADER_LENGTH = 56
const SEGMENT_LENGTH = 6

const mfCodes = {
  0x0000: 'unknown',
  0x100B: 'Philips',
  // 0x1037: '',
  0x10F2: 'ubisys',
  0x110C: 'OSRAM',
  0x1135: 'dresden elektronik',
  0x1144: 'Lutron',
  0x117C: 'IKEA',
  0x1189: 'Ledvance',
  0x1246: 'Danfoss'
}

const tags = {
  0x0000: 'Upgrade Image',
  0x0001: 'ECDSA Signature',
  0x0002: 'ECDSA Signing Certificate',
  0x0003: 'Image Integrity Code',
  0x0004: 'Picture Data',
  0xF000: 'Manufacturer Specific'
}

/** A segment in a Zigbee OTAU firmware image.
  * @hideconstructor
  * @memberof OtauImage
  */
class OtauSegment {
  /** The tag of the segment.
    * @type {integer}
    * @readonly
    */
  static get tag () {}

  /** The description corresponding to the tag of the segment.
    * @type {?string}
    * @readonly
    */
  static get description () {}

  /** The length (in bytes) of the segment.
    * @type {integer}
    * @readonly
    */
  static get length () {}
}

/** Zigbee OTAU image.
  * <br>See {@link OtauImage}.
  * @name OtauImage
  * @type {Class}
  * @memberof module:hb-deconz-tools    */

/** Class for analysing a Zigbee OTAU firmware image.
  */
class OtauImage {
  static get OtauSegment () { return OtauSegment }

  /** Create a new instance.
    * @param {Buffer} buffer - The firmware image.
    */
  constructor (buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('buffer: not a Buffer')
    }
    this._buffer = buffer

    // Search for header magic number
    let headerMagicNumber
    let headerVersion
    let offset = 0
    for (offset = 0; offset < this._buffer.length - HEADER_LENGTH; offset++) {
      headerMagicNumber = this._buffer.readUInt32LE(offset)
      headerVersion = this._buffer.readUInt16LE(offset + 4)
      if (headerMagicNumber === HEADER_MAGIC_NUMBER && headerVersion === HEADER_VERSION) {
        break
      }
    }
    if (headerMagicNumber !== HEADER_MAGIC_NUMBER) {
      throw new Error('not an OTAU image')
    }
    if (headerVersion !== HEADER_VERSION) {
      throw new Error('invalid OTAU image (wrong header version)')
    }

    // Read header attributes
    const headerLength = this._buffer.readUInt16LE(offset + 6)
    const headerControl = this._buffer.readUInt16LE(offset + 8)
    this._manufacturerCode = this._buffer.readUInt16LE(offset + 10)
    this._imageType = this._buffer.readUInt16LE(offset + 12)
    this._fileVersion = this._buffer.readUInt32LE(offset + 14)
    this._zigbeeVersion = this._buffer.readUInt16LE(offset + 18)
    this._headerString = this._buffer.toString('utf8', offset + 20, offset + 51)
    this._imageSize = this._buffer.readUInt32LE(offset + 52)

    // Check header length
    let length = HEADER_LENGTH
    if (headerControl & (1 << 0)) {
      length += 1
    }
    if (headerControl & (1 << 1)) {
      length += 8
    }
    if (headerControl & (1 << 2)) {
      length += 4
    }
    if (headerLength !== length) {
      throw new Error('invalid OTAU file (wrong header length)')
    }
    offset += HEADER_LENGTH

    // Read optional header attributes
    if (headerControl & (1 << 0)) {
      this._securityVersion = this._buffer.readUInt32LE(offset)
      offset += 1
    }
    if (headerControl & (1 << 1)) {
      this._ieeeAddress = this._buffer.readBigUInt64LE(offset)
      offset += 8
    }
    if (headerControl & (1 << 2)) {
      this._minHwVersion = this._buffer.readUInt16LE(offset)
      offset += 2
      this._maxHwVersion = this._buffer.readUInt16LE(offset)
      offset += 2
    }

    // Read segments
    this._segments = []
    while (offset < this._buffer.length - SEGMENT_LENGTH) {
      const tag = this._buffer.readUInt16LE(offset)
      let length = this._buffer.readUInt32LE(offset + 2)
      if (length >= this._buffer.length - offset) {
        length = this._buffer.length - offset
      } else {
        length += SEGMENT_LENGTH
      }
      this._segments.push({
        tag,
        description: tags[Math.min(tag, 0xF000)],
        // start: offset,
        // end: offset + length - 1
        length

      })
      offset += length
    }
  }

  /** The Manufacturer Code in the firmware image header.
    * @type {integer}
    * @readonly
    */
  get manufacturerCode () { return this._manufacturerCode }

  /** The Manufacturer Name corresponding to the Manufacturer Code in the firmware image header.
    * @type {?string}
    * @readonly
    */
  get manufacturerName () { return mfCodes[this._manufacturerCode] }

  /** The Image Type in the firmware image header.
    * @type {integer}
    * @readonly
    */
  get imageType () { return this._imageType }

  /** The File Version in the firmware image header.
    * @type {integer}
    * @readonly
    */
  get fileVersion () { return this._fileVersion }

  /** The Zigbee Version in the firmware image header.
    * @type {integer}
    * @readonly
    */
  get zigbeeVersion () { return this._zigbeeVersion }

  /** The String in the firmware image header.
    * @type {string}
    * @readonly
    */
  get headerString () { return this._headerString[0] === '\u0000' ? '' : this._headerString }

  /** The Size in the firmware image header.
    * @type {integer}
    * @readonly
    */
  get imageSize () { return this._imageSize }

  /** The optional Security Version in the firmware image header.
    * @type {?integer}
    * @readonly
    */
  get securityVersion () { return this._securityVersion }

  /** The optional IEEE Address in the firmware image header.
    * @type {?integer}
    * @readonly
    */
  get ieeeAddress () { return this._ieeeAddress }

  /** The optional Minimum Hardware Version in the firmware image header.
    * @type {?integer}
    * @readonly
    */
  get minHwVersion () { return this._minHwVersion }

  /** The optional Maximum Hardware Version in the firmware image header.
    * @type {?integer}
    * @readonly
    */
  get maxHwVersion () { return this._maxHwVersion }

  /** The segments in the firmware image.
    * @type {Array<OtauImage.OtauSegment>}
    * @readonly
    */
  get segments () { return this._segments }
}

export { OtauImage }
