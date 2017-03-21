"use strict"

/**
 * Password module.
 */

/**
 * Class representing password. Password content is encrypted using OpenPGP.js library.
 * Password is automatically encrypted for user ids of containing directory.
 * @constructs Password
 */
export default class Password {
	/**
	 * Create new password.
	 * @param {Directory} parent - Reference to containing directory.
	 * @param {String} content - Content of the password.
	 */
	constructor(parent, content) {}


	/**
	 * Copy password to destination directory.
	 * @method Password#copy
	 * @param  {String} destination - Destination directory where password should be copied.
	 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Boolean} True if password has been copied.
	 * @throws {EntryExistException} If password with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	copy(destination, force = false, createDestination = false) {}


	/**
	 * Move password to destination directory.
	 * @method Password#move
	 * @param  {String} destination - Destination directory where password should be moved.
	 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Boolean} True if password has been moved.
	 * @throws {EntryExistException} If password with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	move(destination, force = false, createDestination = false) {}


	/**
	 * Rename password.
	 * @method Password#rename
	 * @param  {String} name - New name of the password.
	 * @return {Boolean} True if password has been renamed.
	 * @throws {EntryExistException} If password with same name already exist in directory.
	 */
	rename(name) {}


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
}