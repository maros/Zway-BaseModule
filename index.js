/*** BaseModule Z-Way HA module *******************************************

Version: 1.00
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    This module provides many helpful functions for zway automation module
    developers.

******************************************************************************/

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
    var self = this;
    self.langFile = self.controller.loadModuleLang(self.getName());
};

BaseModule.prototype.stop = function () {
    var self = this;
    BaseModule.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BaseModule.prototype.log = function(message) {
    if (undefined === message) return;
    console.log('['+this.getName()+'-'+this.id+'] '+message);
};

BaseModule.prototype.error = function(message) {
    if (undefined === message) message = 'An unknown error occured';
    if (null !== log.caller) {
        console.error('['+this.getName()+'_'+self.id+'] '+message+' at '+log.caller.name);
    } else {
        console.error('['+this.getName()+'_'+self.id+'] '+message);
    }
};

BaseModule.prototype.getPresenceBoolean = function() {
    var self = this;
    
    var value = self.getDeviceValue([
        ['probeType','=','Presence']
    ]);
    
    if (typeof(value) === 'string' && value === 'on') {
        return true;
    }
    return false;
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
                vDev.performCommand(command,args);
            }
            if (typeof(auto) === 'boolean') {
                vDev.set('metrics:auto',auto);
            }
        }
    });
    return devices;
};
