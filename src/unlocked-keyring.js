"use strict"

/**
 * CahedKeyring module.
 */

var openpgp = require("openpgp");

/**
 * OpenPGP.js Keyring.
 * @external Keyring
 * @see  https://openpgpjs.org/openpgpjs/doc/module-keyring_keyring-Keyring.html
 */

/**
 * Prototype implementing store for unlocked private keys. Keys are automatically deleted after specified time.
 * @constructs UnlockedKeyring
 * @extends {external:Keyring}
 * @param  {String|Number} storeTime - Time in seconds for which keys should be stored.
 * @return {UnlockedKeyring} New UnlockedKeyring.
 */
function UnlockedKeyring(storeTime) {
	openpgp.Keyring.call(this);
	this.privateKeys.storeTime = storeTime * 1000;


	/**
	 * Add key to KeyArray
	 * @param {module:key~Key} key The key that will be added to the keyring
	 * @return {Number} The new length of the KeyArray
	 */
	this.privateKeys.push = function(key) {
		key.timeoutId = setTimeout(() => { this.removeForId(key.primaryKey.keyid.toHex());	}, this.storeTime);
		return this.keys.push(key);
	}


	/**
	 * Searches all keys in the KeyArray matching the address or address part of the user ids
	 * @param {String} email email address to search for
	 * @return {Array<module:key~Key>} The public keys associated with provided email address.
	 */
	this.privateKeys.getForAddress = function(email) {
	  var results = [];
	  for (var i = 0; i < this.keys.length; i++) {
	    if (emailCheck(email, this.keys[i])) {
	    	this.refreshKeyTimeout(this.keys[i]);
	      results.push(this.keys[i], that.storeTime);
	    }
	  }
	  return results;
	};


	/**
	 * Searches the KeyArray for a key having the specified key id
	 * @param {String} keyId provided as string of lowercase hex number
	 * withouth 0x prefix (can be 16-character key ID or fingerprint)
	 * @param  {Boolean} deep if true search also in subkeys
	 * @return {module:key~Key|null} key found or null
	 */
	this.privateKeys.getForId = function (keyId, deep) {
	  for (var i = 0; i < this.keys.length; i++) {
	    if (keyIdCheck(keyId, this.keys[i].primaryKey)) {
	      return this.keys[i];
	    }
	    if (deep && this.keys[i].subKeys) {
	      for (var j = 0; j < this.keys[i].subKeys.length; j++) {
	        if (keyIdCheck(keyId, this.keys[i].subKeys[j].subKey)) {
	        	this.refreshKeyTimeout(this.keys[i]);
	          return this.keys[i];
	        }
	      }
	    }
	  }
	  return null;
	};


	/**
	 * Refresh key removal time.
   * @method  KeyArray#refreshKeyTimeout
	 * @param  {module:key~Key} key Key to be refreshed.
	 */
	this.privateKeys.refreshKeyTimeout = function(key) {
		clearTimeout(key.timeoutId);
		key.timeoutId = setTimeout(() => { this.removeForId(key.primaryKey.keyid.toHex());	}, this.storeTime);
	}

	return this;
}

UnlockedKeyring.prototype = Object.create(openpgp.Keyring.prototype);
UnlockedKeyring.prototype.constructor = UnlockedKeyring;


/**
 * Checks a key to see if it matches the specified email address
 * @private
 * @param {String} email email address to search for
 * @param {module:key~Key} key The key to be checked.
 * @return {Boolean} True if the email address is defined in the specified key
 */
function emailCheck(email, key) {
  email = email.toLowerCase();
  // escape email before using in regular expression
  var emailEsc = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var emailRegex = new RegExp('<' + emailEsc + '>');
  var userIds = key.getUserIds();
  for (var i = 0; i < userIds.length; i++) {
    var userId = userIds[i].toLowerCase();
    if (email === userId || emailRegex.test(userId)) {
      return true;
    }
  }
  return false;
}


/**
 * Checks a key to see if it matches the specified keyid
 * @private
 * @param {String} keyId provided as string of lowercase hex number
 * withouth 0x prefix (can be 16-character key ID or fingerprint)
 * @param {module:packet/secret_key|public_key|public_subkey|secret_subkey} keypacket The keypacket to be checked
 * @return {Boolean} True if keypacket has the specified keyid
 */
function keyIdCheck(keyId, keypacket) {
  if (keyId.length === 16) {
    return keyId === keypacket.getKeyId().toHex();
  } else {
    return keyId === keypacket.getFingerprint();
  }
}

module.exports = UnlockedKeyring;