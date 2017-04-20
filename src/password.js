"use strict"

/**
 * Password module.
 */


const openpgp = require("openpgp");
const Directory = require("./directory");
const util = require("./util");


/**
 * Class representing password. Password content is encrypted using OpenPGP.js library.
 * Password is automatically encrypted for user ids of containing directory.
 * @constructs Password
 */
module.exports = class Password {
	/**
	 * @param  {Directory} parent Reference to containing directory.
	 * @param  {String} name      Name of the password.
	 * @param  {String|Uint8Array} content   Content of the password, if content is string, it is automatically encrypted.
	 * @return {Promise<Password>}         New password.
	 */
	constructor(parent, name, content) {
		this.parent = parent;
		this.name = name;
		if (typeof content === "string") return this.encrypt(content);
		else {
			this.content = Uint8Array.from(content);
			return new Promise((resolve, reject) => { resolve(this) });
		}
	}


	/**
	 * Encrypt content and add it to the password.
	 * @param  {String} content Content to be encrypted.
	 * @return {Promise<Password>} Promise of password with encrypted content.
	 */
	encrypt(content, keys) {
		if (!keys) keys = this.parent.getKeysFor("public");

		let options = {
			data: content,
			publicKeys: keys,
			armor: false
		}

		return new Promise( (resolve, reject) => {
			openpgp.encrypt(options).then( (ciphertext) => {
				this.content = ciphertext.message.packets.write();
				resolve(this);
			});
		});
	}


	/**
	 * Decrypt content of the password.
	 * @return {Promise<String>} Promise of password content.
	 */
	decrypt() {
		return new Promise( (resolve, reject) => {
			let options = {
				message: openpgp.message.read(this.content),
				privateKey: this.parent.getUnlockedPrivateKey()
			};
			openpgp.decrypt(options).then( (cleartext) => {
				resolve(cleartext.data);
			});
		});
	}


	/**
	 * Reencrypt content of the password to the current id's.
	 * @param {Array<String>} ids Id's to reencrypt password to.
	 * @return {[type]} [description]
	 */
	reencryptTo(newKeys) {
		return new Promise( (resolve, reject) => {
			this.decrypt().then( (content) => {
				this.encrypt(content, newKeys).then( () => {
					resolve(this);
				});
			});
		});
	}

	/**
	 * Copy password to destination directory.
	 * @method Password#copy
	 * @param  {Directory} destination - Destination directory where password should be copied.
	 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Promise<Password>} Reference to the password in new destination.
	 * @throws {EntryExistsException} If password with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	copy(destination, force = false) {
		return new Promise((resolve, reject) => {
			if (!force) destination.passwordNameCheck(this.name);

			try {
				let password = destination.getPassword(this.name);
				password.remove();
			}
			catch (err) {}

			let oldKeysIds = this.parent.getKeyIds();
			let newKeysIds = destination.getKeyIds();

			new Password(destination, this.name, this.content).then((passwordCopy) => {
				destination.passwords.push(passwordCopy);

				if (util.keysEqual(oldKeysIds, newKeysIds)) resolve(this);

				let newKeys = this.parent.getKeysFor("public", newKeysIds);

				passwordCopy.reencryptTo(newKeys).then( (pass) => { resolve(pass); })
			});
		})
	}


	/**
	 * Move password to destination directory.
	 * @method Password#move
	 * @param  {Directory} destination - Destination directory where password should be moved.
	 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
	 * @return {Promise<Password>} Promise of password reencrypted to the corresponding keys of new directory.
	 * @throws {EntryExistsException} If password with same name in destination directory already exists, unless force is set to true.
	 */
	move(destination, force = false) {
		return new Promise((resolve, reject) => {
			if (!force) destination.passwordNameCheck(this.name);

			try {
				let password = destination.getPassword(this.name);
				password.remove();
			}
			catch (err) {}

			let oldKeysIds = this.parent.getKeyIds();
			let newKeysIds = destination.getKeyIds();

			this.parent.removePassword(this.name);
			destination.passwords.push(this);
			this.parent = destination;

			if (util.keysEqual(oldKeysIds, newKeysIds)) resolve(this);

			let newKeys = this.parent.getKeysFor("public", newKeysIds);

			this.reencryptTo(newKeys).then( (pass) => { resolve(pass); })
		});
	}


	/**
	 * Rename password.
	 * @method Password#rename
	 * @param  {String} name - New name of the password.
	 * @return {Password} Reference to the renamed password.
	 * @throws {EntryExistsException} If password with same name already exist in directory.
	 */
	rename(name) {
		this.parent.passwordNameCheck(name);
		this.name = name;
		return this;
	}


	/**
	 * Remove password.
	 * @method  Password#remove
	 */
	remove() {
		this.parent.removePassword(this.name);
		delete this;
	}


	/**
	 * Get decrypted content of the password.
	 * @method Password#getContent
	 * @return {Promise<String>} Promise of the decrypted content of password.
	 * @throws {NoPrivateKeyException} If no private key for this password exists in keyring.
	 * @throws {PrivateKeyEncryptedException} If no private key for this password is decrypted in cache.
	 */
	getContent() { return this.decrypt(); }


	/**
	 * Set content of the password. Content is automatically encrypted to the corresponding public keys of directory.
	 * @method Password#setContent
	 * @param {String} content - New content of the password.
	 * @return {Promise<Password>} Promise of password with encrypted content.
	 */
	setContent(content) { return this.encrypt(content);	}


	/**
	 * Check whether private key for password is decrypted.
	 * @method  Password#isDecryptable
	 * @returns {Boolean} True if private key for password is decrypted in cache.
	 */
	isDecryptable() {
		try {
			this.parent.getUnlockedPrivateKey();
			return true;
		}
		catch (err) {
			return false;
		}
	}


	/**
	 * Returns 16-character key id's of the password.
	 * @method  Password#getKeyIds
	 * @return {String} - 16-character key id's for the password.
	 */
	getKeyIds() {
		let keyIds = new Array();
		for (let id of openpgp.message.read(this.content).getEncryptionKeyIds()) {
			keyIds.push(id.toHex());
		}
		return keyIds;
	}


	/**
	 * Get directory containing password.
	 * @method  Password#getDirectory
	 * @return {Directory} Containing directory.
	 */
	getDirectory() { return this.parent; }
}