/*** BaseModule Z-Way HA module *******************************************

Version: 1.02
(c) Maroš Kollár, 2015
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
    this.callbackBase   = undefined;
}

inherits(BaseModule, AutomationModule);

_module = BaseModule;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BaseModule.prototype.init = function (config) {
    BaseModule.super_.prototype.init.call(this, config);
    var self = this;
    
    self.langFile = self.controller.loadModuleLang(self.constructor.name);
    
    if (self.constructor.name === 'BaseModule') {
        self.log('Init callbacks');
        self.callbackBase = _.bind(self.handleLevelChange,self);
        self.controller.devices.on('change:metrics:level',self.callbackBase);
    }
};

BaseModule.prototype.stop = function () {
    var self = this;
    
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

BaseModule.prototype.handleLevelChange = function(vDev) {
    var self = this;
    
    var lastLevel   = vDev.get('metrics:lastLevel');
    var newLevel    = vDev.get('metrics:level');
    var changeTime  = Math.floor(new Date().getTime() / 1000);
    
    // No lastlevel
    if (typeof(lastLevel) === 'undefined') {
        vDev.set('metrics:changeTime',changeTime,true);
        vDev.set('metrics:lastLevel',newLevel,{ silent: true });
        return;
    }
    
    // Not changed
    if (lastLevel == newLevel) return;
    
    setTimeout(function() {
        // Set changeTime
        self.log('Set lastLevel to '+newLevel+' for '+vDev.id+' (was '+lastLevel+')');
        vDev.set('metrics:changeTime',changeTime,true);
        vDev.set('metrics:lastLevel',newLevel,true,{ silent: true });
    },1);
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
        ['probeType','=','Presence']
    ]);
    
    if (typeof(value) === 'string' && value === 'on') {
        return true;
    } else if (typeof(value) === 'undefined') {
        self.error('Could not find presence device');
    }
    return false;
};

BaseModule.prototype.getPresenceMode = function() {
    var self = this;
    
    var value = self.getDeviceValue([
        ['probeType','=','Presence']
    ],'metrics:mode');
    
    if (typeof(value) === 'undefined') {
        self.error('Could not find presence device');
    }
    
    return value;
};

/* Device helper functions */

BaseModule.prototype.processDeviceList = function(devices,callback) {
    var self = this;
    if (! _.isArray(devices) && _.isFunction(callback)) {
        self.error('Invalid arguments for processDeviceList');
        return;
    }
    
    _.each(devices,function(deviceId) {
        var deviceObject = self.controller.devices.get(deviceId);
        if (deviceObject === null) {
            self.error('Device not found: '+deviceId);
        } else {
            callback(deviceObject);
        }
    });
};

BaseModule.prototype.compareDevice = function(vDev,criterias) {
    var self = this;

    var match;
    _.each(criterias,function(criteria) {
        if (match !== false) {
            var matchKey        = criteria[0];
            var matchComparison = criteria[1];
            var matchValue      = criteria[2];
            var value;
            if (matchKey === 'zwaveId') {
                var result = vDev.id.match(/^ZWayVDev_zway_(\d+)-\d+-/m);
                if (result === null) {
                    match = false;
                    return;
                }
                value = parseInt(result[1],10);
            } else {
                value = vDev.get(matchKey);
            }
            var matchCriteria;
            if (typeof(value) === 'object') {
                matchCriteria = (value.indexOf(matchValue) === -1) ? false:true;
            } else if (typeof(value) !== 'undefined') {
                if (matchKey === 'metrics:level') {
                    if (vDev.get('deviceType') === 'switchBinary') {
                        if (typeof(matchValue) === 'number') {
                            matchValue = matchValue === 0 ? 'off':'on';
                        } else if (typeof(matchValue) === 'boolean') {
                            matchValue = matchValue ? 'on':'off';
                        }
                    } else if (vDev.get('deviceType') === 'switchMultilevel') {
                        if (typeof(matchValue) === 'string') {
                            matchComparison = matchValue === 'on' ? '!=':'=';
                            matchValue = 0;
                        } else if (typeof(matchValue) === 'boolean') {
                            matchComparison = matchValue ? '!=':'=';
                            matchValue = 0;
                        }
                    }
                }
                matchCriteria = (matchValue == value) ? true:false;
            }
            if (typeof(matchCriteria) === 'boolean') {
                switch (matchComparison) {
                    case('='):
                        match = matchCriteria;
                        break;
                    case('!='):
                        match = !matchCriteria;
                        break;
                }
            } else {
                match = false;
            }
        }
    });
    return match;
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
    self.controller.devices.each(function(vDev) {
        if (typeof(device) === 'undefined') {
            var match = self.compareDevice(vDev,criterias);
            if(match === true) {
                device = vDev;
            }
        }
    });
    return device;
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
    
    var match = timeString.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) {
        return;
    }
    var hour        = parseInt(match[1],10);
    var minute      = parseInt(match[2],10);
    var dateCalc    = new Date();
    dateCalc.setHours(hour, minute,0,0);
    
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
    
    // TODO timeTo+24h if timeTo < timeFrom
    if (timeFrom > timeTo) {
        if (timeTo < dateNow) {
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
        self.log('No match '+timeFrom+'-'+timeTo);
        return false;
    }
    
    self.log('Match '+timeFrom+'-'+timeTo);
    return true;
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
