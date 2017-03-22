"use strict"

/**
 * module cache
 */

/**
 * Class implementing cache for private keys. Keys are automatically deleted after specified time.
 */
class privateKeyCache {
	constructor(cacheTime) {
		this.cacheTime = cacheTime;
		this.content = {};
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

let abc = new privateKeyCache(45);
let def = new privateKeyCache(90);

abc.a = 5;
def.a = 45;

console.log(abc.a)
console.log(def.a);
setTimeout(() => { console.log(abc.a) }, 35);
setTimeout(() => { console.log(abc.a) }, 100);