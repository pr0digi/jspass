"use strict"

/**
 * CahedKeyring module.
 */

const openpgp = require("openpgp");
const inherits = require("inherits");

/**
 * Prototype implementing store for unlocked private keys. Keys are automatically deleted after specified time.
 * @constructs UnlockedKeyring
 * @param  {String|Number} storeTime - Time in seconds for which keys should be stored.
 * @return {UnlockedKeyring} New UnlockedKeyring.
 */
function UnlockedKeyring(storeTime) {
	openpgp.Keyring.call(this);
	this.privateKeys.keys.storeTime = storeTime * 1000;
	this.privateKeys._keys = new Array();

	this.privateKeys.keys = new Proxy(this.privateKeys._keys, {
		get: function(target, name) {
			if (typeof name == "number" && target[name] != undefined) {
				clearTimeout(target[name].timeoutId);
				let timeoutId = setTimeout(() => { delete target[name]; target.length -= 1; }, target.storeTime);
				target[name].timeoutId = timeoutId;
			}
			return target[name];
		},

		set: function(target, name, value) {
			target[name] = value;
			if (typeof name == "number") {
				let timeoutId = setTimeout(() => { delete target[name]; target.length -= 1; }, target.storeTime);
				target[name].timeoutId = timeoutId;
			}
			return true;
		}
	});

	return this;
}

UnlockedKeyring.prototype = Object.create(openpgp.Keyring.prototype);
UnlockedKeyring.prototype.constructor = UnlockedKeyring;

module.exports = UnlockedKeyring;