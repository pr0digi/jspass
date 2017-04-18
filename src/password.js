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
	encrypt(content) {
		let keys = this.parent.getPublicKeys();

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
	rename(name) {}


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
	getContent() {}


	/**
	 * Set content of the password. Content is automatically encrypted to the corresponding public keys of directory.
	 * @method Password#setContent
	 * @param {String} content - Content of the password.
	 * @return {Promise<Boolean>} True if content was succesfully encrypted.
	 */
	setContent(content) {}


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
	getDirectory() {}
}