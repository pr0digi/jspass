"use strict"

/**
 * Password module.
 */


const openpgp = require("openpgp");
const Directory = require("./directory");


/**
 * Class representing password. Password content is encrypted using OpenPGP.js library.
 * Password is automatically encrypted for user ids of containing directory.
 * @constructs Password
 */
module.exports = class Password {
	/**
	 * @param  {Directory} parent Reference to containing directory.
	 * @param  {String} name      Name of the password.
	 * @param  {String} content   Content of the password.
	 * @return {Promise<Password>}         New password.
	 */
	constructor(parent, name, content) {
		this.parent = parent;
		this.name = name;
		return this.encrypt(content);
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
		this.decrypt().then( (content) => {
			return new Promise( (resolve, reject) => {
				this.encrypt(content, newKeys).then( () => {
					resolve(this);
				});
			});
		});
	}

	/**
	 * Copy password to destination directory.
	 * @method Password#copy
	 * @param  {String} destination - Destination directory where password should be copied.
	 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Password} Reference to the password in new destination.
	 * @throws {EntryExistsException} If password with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	copy(destination, force = false, createDestination = false) {}


	/**
	 * Move password to destination directory.
	 * @method Password#move
	 * @param  {String} destination - Destination directory where password should be moved.
	 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Password} Reference to the moved password.
	 * @throws {EntryExistsException} If password with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	move(destination, force = false, createDestination = false) {}


	/**
	 * Rename password.
	 * @method Password#rename
	 * @param  {String} name - New name of the password.
	 * @return {Password} Reference to the renamed password.
	 * @throws {EntryExistsException} If password with same name already exist in directory.
	 */
	rename(name) {
		this.parent.nameCheck(name);
		this.name = name;
		return this;
	}


	/**
	 * Remove password.
	 * @method  password#remove
	 */
	remove() {}


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
	isDecryptable() {}


	/**
	 * Returns key id of the password, if it exists in the keyring.
	 * @method  Password#getKeyIds
	 * @return {String} - Key id for the password.
	 */
	getKeyIds() {}


	/**
	 * Get directory containing password.
	 * @method  Password#getDirectory
	 * @return {Directory} Containing directory.
	 */
	getDirectory() { return this.parent; }
}