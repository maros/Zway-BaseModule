/*** BaseModule Z-Way HA module *******************************************

Version: 1.10
(c) Maroš Kollár, 2015-2017
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    This module provides many helpful functions for zway automation module
    developers.

******************************************************************************/

/*jshint -W058 */

function BaseModule (id, controller) {
    // Call superconstructor first (AutomationModule)
    BaseModule.super_.call(this, id, controller);

    this.langFile       = undefined;
}

inherits(BaseModule, AutomationModule);

_module = BaseModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BaseModule.prototype.init = function (config) {
    BaseModule.super_.prototype.init.call(this, config);
    var self = this;

    self.langFile   = self.controller.loadModuleLang(self.constructor.name);
    self.imagePath  = '/ZAutomation/api/v1/load/modulemedia/'+self.constructor.name;

    // Only for BaseModule instance
    if (self.constructor.name === 'BaseModule') {
        self.log('Init callbacks');
        self.callbackBase = _.bind(self.handleLevelModification,self);
        self.controller.devices.on('change:metrics:level',self.callbackBase);
    }
};

BaseModule.prototype.stop = function () {
    var self = this;

    // Only for BaseModule instance
    if (self.constructor.name === 'BaseModule') {
        self.controller.devices.off('change:metrics:level',self.callbackBase);
        self.callbackBase = undefined;
    }

    BaseModule.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BaseModule.prototype.presenceModes = ['home','night','away','vacation'];

BaseModule.prototype.handleLevelModification = function(vDev) {
    var self = this;

    var lastLevel           = vDev.get('metrics:lastLevel');
    var newLevel            = vDev.get('metrics:level');
    var deviceType          = vDev.get('deviceType');
    var lastUpdate          = vDev.get('updateTime');
    var modificationTime    = Math.floor(new Date().getTime() / 1000);

    // No lastlevel - set it for the first time
    if (typeof(lastLevel) === 'undefined') {
        vDev.set('metrics:modificationTime',modificationTime,{ silent: true });
        vDev.set('metrics:lastLevel',newLevel,{ silent: true });
        return;
    }

    // Not changed
    if (lastLevel == newLevel) return;

    // Warn on big level changes - TODO maybe deny too big changes
    if (deviceType === 'sensorMultilevel') {
        var diff = Math.abs(lastLevel-newLevel);
        var probeType = vDev.get('metrics:probeType');
        // Ignore diff for changes of more than 4 hours
        if (modificationTime-lastUpdate > (4*60*60)) {
            diff = 0;
        }
        if (
                (probeType == 'luminosity' && (diff > 250 || newLevel > 1000 || newLevel < 0)) ||
                (probeType == 'temperature' && (diff > 10 || newLevel > 50 || newLevel < -30)) ||
                (probeType == 'humidity' && (diff > 20 || newLevel > 100 || newLevel < 5)) ||
                (probeType == 'ultraviolet' && (diff > 4 || newLevel > 15 || newLevel < -1))
            ) {
            self.error('Unlikely '+probeType+' level change from '+lastLevel+' to '+newLevel+' for '+vDev.id);
        }
    }

    // Run delayed, in order not to delay current processing
    setTimeout(function() {
        // Set modificationTime
        self.log('Set lastLevel to '+newLevel+' for '+vDev.id+' (was '+lastLevel+')');
        vDev.set('metrics:modificationTime',modificationTime,{ silent: true });
        vDev.set('metrics:lastLevel',newLevel,{ silent: true });
    },1);

    // Bind to modify:metrics:level to get real changes
    self.controller.devices.emit('modify:metrics:level',vDev,'metrics:level');
    vDev.emit('modify:metrics:level',vDev,'metrics:level');
};

/* Log helper functions */

BaseModule.prototype.log = function(message) {
    if (undefined === message) return;
    console.log('['+this.constructor.name+'-'+this.id+'] '+message);
};

BaseModule.prototype.error = function(message) {
    if (undefined === message) message = 'An unknown error occured';
    var error = new Error(message);
    console.error('['+this.constructor.name+'_'+this.id+'] '+error.stack);
};

/* Presence helper functions */

BaseModule.prototype.getPresenceBoolean = function() {
    var self = this;

    var value = self.getDeviceValue([
        ['probeType','=','presence']
    ]);

    if (typeof(value) === 'string' && value === 'on') {
        return true;
    } else if (typeof(value) === 'undefined') {
        self.error('Could not find presence device');
        return true; // Fallback
    }
    return false;
};

BaseModule.prototype.getPresenceMode = function() {
    var self = this;

    var value = self.getDeviceValue([
        ['probeType','=','presence']
    ],'metrics:mode');

    if (typeof(value) === 'undefined') {
        self.error('Could not find presence device');
        return 'home'; // Fallback
    }

    return value;
};

/* Device helper functions */

BaseModule.prototype.processDeviceList = function(devices,callback) {
    var self = this;
    if (! _.isFunction(callback)) {
        self.error('Invalid callback for processDeviceList');
        return;
    }

    if (_.isUndefined(devices) === 'undefined') {
        return;
    } else if (! _.isArray(devices)) {
        devices = [ devices ];
    }

    _.each(devices,function(device) {
        var vDev;
        if (_.isString(device)) {
            vDev = self.controller.devices.get(device);

        } else if (_.isObject(device)) {
            vDev = device;
        }
        if (_.isNull(vDev) || _.isUndefined(vDev)) {
            self.error('Device not found '+device);
            return;
        }
        callback(vDev);
    });
};

BaseModule.prototype.compareDevice = function(vDev,criterias) {
    var self = this;

    var match;
    _.each(criterias,function(criteria) {
        // Matched false - skip the rest
        if (match === false) {
            return;
        // Device ID
        } else if (_.isString(criteria)) {
            if (criteria !== vDev.id) {
                match = false;
            }
        // Comparison array
        } else  if (_.isArray(criteria)) {
            // eg. ['metrics:level','=','on']
            var matchKey        = criteria[0];
            var matchComparison = criteria[1];
            var matchList       = criteria[2];
            var compareValue;
            // Get value
            if (matchKey === 'zwaveId') {
                var result = vDev.id.match(/^ZWayVDev_zway_(\d+)-\d+-/m);
                if (result === null) {
                    match = false;
                    return;
                }
                compareValue = parseInt(result[1],10);
            } else {
                compareValue = vDev.get(matchKey);
            }

            if (!_.isArray(matchList)) {
                matchList = [ matchList ];
            }

            var matchFirst = _.find(matchList,function(matchValue) {
                // Comparison is array
                if (_.isArray(compareValue)) {
                    var hasMatch = (compareValue.indexOf(matchValue) === -1) ? false:true;
                    return ((matchComparison === '!=' && !hasMatch) || (matchComparison === '=' && hasMatch)) ? true:false;
                // Comparison is scalar
                } else if (typeof(compareValue) !== 'undefined') {
                    if (matchKey === 'metrics:level') {
                        if (vDev.get('deviceType') === 'switchBinary') {
                            if (typeof(matchValue) === 'number') {
                                compareValue = (compareValue === 'on' ? 255:0);
                            } else if (typeof(matchValue) === 'boolean') {
                                compareValue = (compareValue === 'on' ? true:false);
                            }
                        } else if (vDev.get('deviceType') === 'switchMultilevel') {
                            if (typeof(matchValue) === 'string') {
                                compareValue = (compareValue > 0 ? 'on':'off');
                            } else if (typeof(matchValue) === 'boolean') {
                                compareValue = (compareValue > 0 ? true:false);
                            }
                        }
                    }
                    return self.compare(compareValue,matchComparison,matchValue);
                } else {
                    return false;
                }
            });

            match = ! _.isUndefined(matchFirst);
        } else {
            self.error('Invalid device comparison');
        }
    });
    if (typeof(match) === 'boolean') {
        return match;
    }
    return false;
};

BaseModule.prototype.processDevices = function(criterias,callback) {
    var self = this;

    if (! _.isFunction(callback)) {
        self.error('Invalid callback for processDevices');
        return;
    }

    self.controller.devices.each(function(vDev) {
        var match = self.compareDevice(vDev,criterias);
        if(match === true) {
            callback(vDev);
        }
    });
};

BaseModule.prototype.getDevices = function(criterias) {
    var self = this;

    var devices = [];
    self.controller.devices.each(function(vDev) {
        var match = self.compareDevice(vDev,criterias);
        if(match === true) {
            devices.push(vDev);
        }
    });
    return devices;
};

BaseModule.prototype.getDevice = function(criterias) {
    var self = this;

    var device;
    if (typeof(criterias) === 'string') {
        device = self.controller.devices.get(criterias);
    } else if (_.isArray(criterias)) {
        self.controller.devices.each(function(vDev) {
            if (typeof(device) === 'undefined') {
                var match = self.compareDevice(vDev,criterias);
                if(match === true) {
                    device = vDev;
                }
            }
        });
    }
    if (device === null) {
        return undefined;
    } else {
        return device;
    }
};

BaseModule.prototype.getDeviceValue = function(criterias,key) {
    var self = this;
    key = key || 'metrics:level';
    var device = self.getDevice(criterias);
    if (typeof(device) === 'undefined') {
        self.error('Could not find device');
    } else {
        return device.get(key);
    }
};

BaseModule.prototype.performCommandDevices = function(criterias,command,args,auto) {
    var self = this;
    args = args || {};

    var devices = [];
    self.controller.devices.each(function(vDev) {
        var match = self.compareDevice(vDev,criterias);

        if(match === true) {
            devices.push(vDev);
            if (typeof(command) !== 'undefined') {
                setTimeout(function() {
                    vDev.performCommand(command,args);
                },1);
            }
            if (typeof(auto) === 'boolean') {
                vDev.set('metrics:auto',auto);
            }
        }
    });
    return devices;
};

/* Time helper functions */

BaseModule.prototype.parseTime = function(timeString) {
    if (typeof(timeString) === 'undefined') {
        return;
    }

    var match = timeString.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
    if (!match) {
        return;
    }
    var hour        = parseInt(match[1],10);
    var minute      = parseInt(match[2],10);
    var second      = parseInt(match[3] || 0,10);
    var ampm        = match[4];
    if (ampm === 'pm' && hour < 12) {
        hour = hour + 12;
    }
    var dateCalc    = new Date();
    dateCalc.setHours(hour, minute,second,0);

    return dateCalc;
};

BaseModule.prototype.checkPeriod = function(timeFrom,timeTo) {
    var self = this;

    var dateNow = new Date();

    // Check from/to time
    if (typeof(timeFrom) === 'string') {
        timeFrom = self.parseTime(timeFrom);
    }
    if (typeof(timeTo) === 'string') {
        timeTo = self.parseTime(timeTo);
    }

    if (typeof(timeFrom) === 'undefined'
        || typeof(timeTo) === 'undefined') {
        return true;
    }

    // Period over midnight
    if (timeFrom >= timeTo) {
        if (timeTo <= dateNow) {
            var toHour   = timeTo.getHours();
            var toMinute = timeTo.getMinutes();
            timeTo.setHours(toHour + 24);
            // Now fix time jump on DST
            timeTo.setHours(toHour,toMinute);
        } else {
            var fromHour     = timeFrom.getHours();
            var fromMinute   = timeFrom.getMinutes();
            timeFrom.setHours(fromHour - 24);
            // Now fix time jump on DST
            timeFrom.setHours(fromHour,fromMinute);
        }
    }

    if (timeFrom > dateNow || dateNow > timeTo) {
        return false;
    }

    self.log('Match '+timeFrom+'-'+timeTo);
    return true;
};

BaseModule.prototype.compare = function (val1, op, val2) {
    // match = self.compare(compareValue,matchComparison,matchValue);
    if (op === "=") {
        if (_.isRegExp(val2) && _.isString(val1)) {
            return val1.match(val2) !== null;
        } else {
            return val1 === val2;
        }
    } else if (op === "!=") {
        if (_.isRegExp(val2) && _.isString(val1)) {
            return val1.match(val2) === null;
        } else {
            return val2 !== val1;
        }
    } else if (op === ">") {
        return val1 > val2;
    } else if (op === "<") {
        return val1 < val2;
    } else if (op === ">=") {
        return val1 >= val2;
    } else if (op === "<=") {
        return val1 <= val2;
    } else {
        console.error('Invalid comparison operator '+op);
    }

    return null; // error!!
};

//----------------------------------------------------------------------------
//--- Timeout manager
//----------------------------------------------------------------------------

function TimeoutManager(scope) {
    var self        = this;
    self.scope      = scope;
    self.timeouts   = {};
}
TimeoutManager.prototype.timeouts = {};
TimeoutManager.prototype.running  = function(id) {
    var self   = this;
    if (typeof(self.timeouts[id]) === "undefined") {
        return false;
    }
    return self.timeouts[id].cleared ? false:true;
};
TimeoutManager.prototype.add      = function(id,fn,interval) {
    var self   = this;

    // Do not overwrite existing timer
    if (typeof(self.timeouts[id]) !== "undefined"
        && self.timeouts[id].cleared === false) {
        throw('Timeout "'+id+'" is already active');
    }

    // Build args
    var args   = new Array(arguments.length - 1);
    for(var i = 0; i < args.length; ++i) {
        args[i] = arguments[i+1];
    }
    args.unshift(self.scope,self.scope);
    self.timeouts[id] = new(Function.prototype.bind.apply(Timeout,args));
    return self.timeouts[id];
};
TimeoutManager.prototype.replace  = function(id,fn,interval) {
    var self   = this;

    // Clear existing timer
    if (typeof(self.timeouts[id]) !== "undefined") {
        self.timeouts[id].clear();
    }

    // Build args
    var args   = new Array(arguments.length - 1);
    for(var i = 0; i < args.length; ++i) {
        args[i] = arguments[i+1];
    }
    args.unshift(self.scope,self.scope);
    self.timeouts[id] = new(Function.prototype.bind.apply(Timeout,args));
    return self.timeouts[id];
};
TimeoutManager.prototype.get    = function(id) {
    return this.timeouts[id];
};
TimeoutManager.prototype.clear    = function(id) {
    var self   = this;
    if (typeof(self.timeouts[id]) !== "undefined") {
        self.timeouts[id].clear();
        delete self.timeouts[id];
        return true;
    }
    return false;
};
TimeoutManager.prototype.clearAll = function() {
    var self   = this;
    for (var id in self.timeouts) {
        if (self.timeouts.hasOwnProperty(id)
            && typeof(self.timeouts[id]) !== "undefined") {
            self.timeouts[id].clear();
        }
    }
    self.timeouts = {};
};

//----------------------------------------------------------------------------
//--- Timeout class
//----------------------------------------------------------------------------

function Timeout(scope,fn,interval) {
    var self   = this;
    var args   = new Array(arguments.length-3);
    for(var i = 0; i < args.length; ++i) {
        args[i] = arguments[i+3];
    }
    args.unshift(scope);
    fn          = fn || function() {};

    self.fn     = Function.prototype.bind.apply(fn,args);
    self.id     = setTimeout(self.run.bind(self),interval);
    self.cleared= false;
    //Register timeout by name?
}

Timeout.prototype.id       = undefined;
Timeout.prototype.cleared  = false;
Timeout.prototype.fn       = undefined;
Timeout.prototype.run      = function() {
    this.clear();
    this.fn();
};
Timeout.prototype.clear    = function() {
    var self   = this;
    if (typeof(self.id) !== 'undefined' && self.cleared === false) {
        clearTimeout(self.id);
    }
    self.cleared = true;
    self.id = undefined;
};
