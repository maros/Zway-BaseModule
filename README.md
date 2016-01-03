# Zway-BaseModule

Module which provides many useful functions for other automation modules.
Has no user facing functionality on its own.

For basic usage just replace one line from the module initialisation

```javascript
inherits(MyModule, BaseModule); // instead of AutomationModule
```

Also add BaseModule as a dependency in module.json
```json
{
   "moduleName": "MyModule",
   "dependencies" : ["BaseModule"],
   ...
```

And finally instantiate the module via Apps > Local Apps > Base Module >
Add App

BaseModule helps module authors with these utilities:

* Logging with prefixes instead of console.log and error
* Timestamp of last real change in every vDev (metrics:changeTime)
* Presence (via the Presence module)
* Find devices based on criteria
* Process devices from list of device IDs
* Parse time
* Compare time periods
* Secure timeout handling

# Methods

## log, error

Log messages and errors to console with module name and id prefix
instead of console.log and console.error

## presenceModes

List of all available presence modes.

## getPresenceBoolean

Returns presence state as boolean from the presence device 

## getPresenceMode

Returns the current presence mode from the presence device

## getDevices

```javascript
var myBatteryDevices = self.getDevices([['probeTitle','=','Battery']]);
```

Returns a list of devices that match the given criteria. Criteria are 
evaluated using the compareDevice method.

## getDevice

Works like getDevices, but returns the first matching device.

## getDeviceValue

```javascript
var temperature = self.getDeviceValue([
        ['probeTitle','=','temperature'],
        ['location','=',3]
    ],'metrics:level');
```

Returns the selected value of the the first matching device. If no value is
given metrics:level will be returned. 
Criteria are evaluated using the compareDevice method

## performCommandDevices

Performs a given command on all devices matching the selected criteria.
Criteria are evaluated using the compareDevice method. Additionally the
device auto flag may be set.

The following example turns sets all dimmers in room 3 to 33%, and also sets
the metrics:auto flag to true.
```javascript
var temperature = self.performCommandDevices([
        ['deviceType','=','switchMultilevel'],
        ['location','=',3]
    ],'exact',{ 'level': 33 },true);
```

## compareDevice

This method is used by performCommandDevices, getDeviceValue, getDevice and
getDevices to check if a device matches given criteria or not.

Criteria must be supplied as an array of arrays where the nested array has 
three values.

```
[
    [ KEY, COMPARISON, VALUE ]
]
```

Key may be any key from the virtual device object (with colons when using 
nested keys) and additionally zwaveId.

Comparison can be either '=' or '!='.

Value can be a string, boolean or array value. If the value is an array, a
device matches if any of the array values matches.

To simplify handling of multilevel and binary switches, metrics:level can 
both be queried with the values 'on','off', true and false. (ie. 
['metrics:level','=','on'] would also find multilevel switches with level >= 1

## processDeviceList

Processes a callback for each device in the list of device 

```javascript
self.processDeviceList(self.config.devices,function(vDev) {
    // Do something
});
``

## parseTime

Parses a string in the format HH:MM and returns a Date object (current day)

## checkPeriod

Expects two time strings marking a period, and calculates if the period
is currently active.

# Configuration

No configuration required

# Virtual Devices

No virtual device is created

# Events

No events are emitted

# Installation

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/maros/Zway-BaseModule.git BaseModule --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/modules/BaseModule
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

Alternatively this module can be installed via the Z-Wave.me app store. Just
go to Management > App Store Access and add 'k1_beta' access token.

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
