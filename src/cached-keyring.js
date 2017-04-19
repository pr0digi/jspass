"use strict"

/**
 * CahedKeyring module.
 */

const openpgp = require("openpgp");

/**
 * Class implementing cache for private keys. Keys are automatically deleted after specified time.
 * @constructs privateKeyCache
 */
module.exports = class CachedKeyring extends openpgp.Keyring {
	/**
	 * @param  {String|Number} cacheTime - Time in seconds for which keys should be cached.
	 * @return {CachedKeyring} New CachedKeyring.
	 */
	constructor(cacheTime) {
		super();
		this.privateKeys.keys.cacheTime = cacheTime * 1000;
		this.privateKeys._keys = this.privateKeys.keys;

		this.privateKeys.keys = new Proxy(this.privateKeys._keys, {
			get: function(target, name) {
				if (!isNaN(name) && target[name] != undefined) {
					clearTimeout(target[name].timeoutId);
					let timeoutId = setTimeout(() => { delete target[name]; target.length -= 1; }, target.cacheTime);
					target[name].timeoutId = timeoutId;
				}
				return target[name];
			},

			set: function(target, name, value) {
				target[name] = value;
				if (!isNaN(name)) {
					let timeoutId = setTimeout(() => { delete target[name]; target.length -= 1; }, target.cacheTime);
					target[name].timeoutId = timeoutId;
				}
				return true;
			}
		});
	}
}