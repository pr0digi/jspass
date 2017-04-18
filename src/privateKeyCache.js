"use strict"

/**
 * PrivateKeyCache module.
 */

const openpgp = require("openpgp");

/**
 * Class implementing cache for private keys. Keys are automatically deleted after specified time.
 * @constructs privateKeyCache
 */
class PrivateKeyCache {
	/**
	 * @param  {String|Number} cacheTime - Time in seconds for which keys should be cached.
	 * @return {PrivateKeyCache} New PrivateKeyCache.
	 */
	constructor(cacheTime) {
		this.cacheTime = cacheTime;
		console.log(openpgp.Keyring)
		this.keyring = new openpgp.Keyring();

		return new Proxy(this, {
			set: function(target, name, val) {
				if (name in target.content) { clearTimeout(target.content[name].timeoutId); }
				let timeoutId = setTimeout(() => { delete target.content[name] }, target.cacheTime);
				target.content[name] = {value: val, timeoutId: timeoutId};
				return true;
			},
			get: function(target, name) {
				if (name in target.content) {
					clearTimeout(target.content[name].timeoutId);
					let timeoutId = setTimeout(() => { delete target.content[name] }, target.cacheTime);
					target.content[name].timeoutId = timeoutId;
					return target.content[name].value;
				}
				else return undefined;
			}
		});
	}
}

let cache = new PrivateKeyCache(10000);