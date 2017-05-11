"use strict"

/**
 * CahedKeyring module.
 */

const openpgp = require("openpgp");

/**
 * Prototype implementing store for unlocked private keys. Keys are automatically deleted after specified time.
 * @constructs UnlockedKeyring
 * @param  {String|Number} storeTime - Time in seconds for which keys should be stored.
 * @return {UnlockedKeyring} New UnlockedKeyring.
 */
function UnlockedKeyring(storeTime) {
	openpgp.Keyring.call(this);
	this.privateKeys.keys.storeTime = storeTime * 1000;
	this.privateKeys._keys = this.privateKeys.keys;

	this.privateKeys.keys = new Proxy(this.privateKeys._keys, {
		get: function(target, name) {
			if (!isNaN(name) && target[name] != undefined) {
				clearTimeout(target[name].timeoutId);
				let timeoutId = setTimeout(() => { delete target[name]; target.length -= 1; }, target.storeTime);
				target[name].timeoutId = timeoutId;
			}
			return target[name];
		},

		set: function(target, name, value) {
			target[name] = value;
			if (!isNaN(name)) {
				let timeoutId = setTimeout(() => { delete target[name]; target.length -= 1; }, target.storeTime);
				target[name].timeoutId = timeoutId;
			}
			return true;
		}
	});
}

UnlockedKeyring.prototype = Object.create(openpgp.Keyring.prototype);
UnlockedKeyring.prototype.constructor = UnlockedKeyring;

module.exports = UnlockedKeyring;