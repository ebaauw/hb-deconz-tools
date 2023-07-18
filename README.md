<span align="center">

# Homebridge deCONZ Tools
[![Downloads](https://img.shields.io/npm/dt/hb-deconz-tools)](https://www.npmjs.com/package/hb-deconz-tools)
[![Version](https://img.shields.io/npm/v/hb-deconz-tools)](https://www.npmjs.com/package/hb-deconz-tools)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen)](https://standardjs.com)

</span>

## Homebridge deCONZ Tools
Copyright© 2022-2023 Erik Baauw. All rights reserved.

This repository provides a standalone installation of the command-line utilities from [Homebridge deCONZ](https://github.com/ebaauw/homebridge-deconz):

- `deconz`, to discover, monitor, and interact with deCONZ gateways.  
See the [`deconz` Command-Line Utility](https://github.com/ebaauw/homebridge-deconz/wiki/deconz-Command%E2%80%90Line-Utility) in the Wiki for more info.
- `otau`, to download and analyse over-the-air-upgrade firmware files for Zigbee devices.  
The firmware files are downloaded into the current directory from the
[zigbee-OTA](https://github.com/Koenkk/zigbee-OTA) repository,
using the files names as expected by the
[deCONZ OTAU plugin](https://github.com/dresden-elektronik/deconz-ota-plugin).

Each command-line tool takes a `-h` or `--help` argument to provide a brief overview of its functionality and command-line arguments.

### Prerequisites
You need a deCONZ gateway to connect the Homebridge deCONZ Tools to your ZigBee devices (lights, plugs, sensors, switches, ...).
For Zigbee communication, the deCONZ gateway requires a [ConBee II](https://phoscon.de/en/conbee2) or [Conbee](https://phoscon.de/en/conbee) USB stick, or a [RaspBee II](https://phoscon.de/en/raspbee2) or [RaspBee](https://phoscon.de/en/raspbee) Raspberry Pi shield.  
I recommend to run deCONZ with its GUI enabled, even on a headless system.
When needed, you can access the deCONZ GUI over screen sharing.

The Homebridge deCONZ tools communicate with the deCONZ gateway using the local
[REST API](https://dresden-elektronik.github.io/deconz-rest-doc/),
provided by its
[REST API plugin](https://github.com/dresden-elektronik/deconz-rest-plugin).
These tools run independently from the Phoscon web app, see
[deCONZ for Dummies](https://github.com/dresden-elektronik/deconz-rest-plugin/wiki/deCONZ-for-Dummies).
