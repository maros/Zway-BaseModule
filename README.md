# Zway-BaseModule

Module which provides many useful functions for other automation modules.
Has no user facing functionality on its own.

As a user of this app you just have to instantiate it once via Apps >
Local Apps > Base Module > Add App. No configuration settings are required.

# Developers

The following documentation is only relevant to developers of Zway automation
modules.

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
Add App.

BaseModule helps module authors with these utilities:

* Logging with prefixes instead of console.log and error
* Timestamp and event for real change in every vDev (metrics:changeTime)
* Presence states (via the Presence module)
* Find devices based on various criterias
* Process devices from list of device IDs
* Parse time
* Compare time periods
* Secure timeout handling

# Methods

## log, error

Log messages and errors to console with module name and id prefix
instead of console.log and console.error

## presenceModes

List all available presence modes.

## getPresenceBoolean

Returns presence state as boolean value (true = at home, false = away) from the presence device

## getPresenceMode

Returns the current presence mode as string from the presence device

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

## processDevices

```javascript
self.processDevices([
    ['probeTitle','=','temperature'],
    ['location','=',3]
],function(vDev) { ... });
```

Find the selected devices and process a callback for each device.

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

Comparison can be either '=', '!=', '>', '>=', '<' or '<='.

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
```

## parseTime

Parses a string in the format HH:MM and returns a Date object fot the current day

## checkPeriod

Expects two time strings (HH:MM) marking a period, and calculates if the
period is currently matching.

# Configuration

No configuration required

# Virtual Devices

No virtual device is created

# Events

All virtual devices will emit a modify:metrics:level event if the
metrics:level value was modified. In contrast to change this event will only
be triggered if metrics:level was set with a different value.

# Installation

The prefered way of installing this module is via the "Zwave.me App Store"
available in 2.2.0 and higher. For stable module releases no access token is
required. If you want to test the latest pre-releases use 'k1_beta' as
app store access token.

For developers and users of older Zway versions installation via git is
recommended.

```shell
cd /opt/z-way-server/automation/userModules
git clone https://github.com/maros/Zway-BaseModule.git BaseModule --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/userModules/BaseModule
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

Even though this module has no user-facing functionality on its own it has
to be instantiated via Apps > Local Apps before it can be used by other modules.

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
