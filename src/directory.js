"use strict"

/**
 * Directory module
 */

/**
 * Class representing directory.
 * All password added to the directory are automatically encrypted to it's corresponding user ids.
 * @constructs Directory
 */
export default class Directory {
	/**
	 * @param  {String} name - Name of the directory
	 * @param  {String} [parent] - Reference to parent directory.
	 * If parent isn't specified, parent directory is set to this, meaning it is root directry.
	 * @return {Directory} New directory.
	 */
	constructor(name, parent) {}


	/**
	 * Add password to directory. Password is automatically encrypted to the corresponding keys of directory.
	 * @method Directory#addPassword
	 * @param {String} name - Name of the password.
	 * @param {String} content - Content of the password.
	 * @throws {EntryExistsException} If password with same name already exists in direcotry.
	 * @return {Promise<Password>} Promise of new password.
	 */
	addPassword(name, content) {}


	/**
	 * Delete password from directory.
	 * @method Directory#deletePassword
	 * @param  {String} name - Name of the password.
	 * @throws {InvalidEntryException} If password with given name doesn't exist.
	 * @return {undefined}
	 */
	deletePassword(name) {}


	/**
	 * Get password from directory.
	 * @method Directory#getPassword
	 * @param {String} name Name of the password.
	 * @return {Password} Password with specified name.
	 * @throws {InvalidEntryException} If password with specified name doesnt exist.
	 */
	getPassword(name) {}


	/**
	 * Get all password in directory.
	 * @method Directory#getAllPasswords
	 * @return {Array<Password>} All passwords in directory.
	 */
	getAllPasswords() {}


	/**
	 * Add new directory. If directory with specified name already exists, return existing directory.
	 * @method Directory#addDirectory
	 * @param {String} name Name of the enw directory.
	 * @return {Directory} Newly created directory or existinf directory with specified name.
	 */
	addDirectory(name) {}


	/**
	 * Get directory with specified name.
	 * @method Directory#getDirectory
	 * @param  {String} name Name of the directory to return.
	 * @return {Directory} Directory with specified name.
	 * @throws {InvalidEntryException} If directory with specified name doesn't exist.
	 */
	getDirectory(name) {}


	/**
	 * Get all directories in directory.
	 * @method Directory#getAllDirectories
	 * @return {Array<Directory>} All directories in directory.
	 */
	getAllDirectories() {}


	/**
	 * Move directory to destination directory.
	 * @method Directory#move
	 * @param  {String} destination - Destination directory where directory should be moved.
	 * @param  {Boolean} [force=false] - Overwrite directory in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Diectory} Reference to the moved directory.
	 * @throws {EntryExistsException} If directory with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	move(destination, force = false, createDestination = false) {}


	/**
	 * Copy directory to destination directory.
	 * @method Directory#copy
	 * @param  {String} destination - Destination directory where directory should be copied.
	 * @param  {Boolean} [force=false] - Overwrite directory in destination if it already exists.
	 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
	 * @return {Diectory} Reference to the directory in new destination.
	 * @throws {EntryExistsException} If directory with same name in destination directory already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
	 */
	copy(destination, force = false, createDestination = false) {}


	/**
	 * Rename directory.
	 * @method Directory#rename
	 * @param  {String} name - New name of the directory.
	 * @return {Password} Reference to the renamed directory.
	 * @throws {EntryExistsException} If directory with same name already exist in parent directory.
	 */
	rename(name) {}


	/**
	 * Remove directory.
	 * @method  Directory#remove
	 */
	remove() {}


	/**
	 * Search for passwords with name containing pattern.
	 * @method Directory#search
	 * @param  {String} pattern - Pattern to search for.
	 * @return {Array<Password>|null} Array with macthed password or null if no password has been found.
	 */
	search(pattern) {}


	/**
	 * Get user id's for directory. By default, id's are in the form of fingerprint.
	 * Id's are in the form "User name <email address>".
	 * @method Directory#getIds
	 * @param {String} [form=fingerprint] Form of ids, possible values are "userids", "longids" and "fingerprint".
	 * @return {Array<String>} Id's of directory.
	 */
	getIds(form = "fingerprint") {}


	/**
	 * Set id's for directory. All passwords will be reencrypted using new ids.
	 * @method Directory#setIds
	 * @param {String|Array<String>} Ids User ids in the form "User name <email address>", fingerprint or long key id.
	 * @return {Promise<Directory>} Promise of directory with reencrypted passwords.
	 * @throws {InvalidIdException} If user id isn't in keyring.
   * @throws {NoPrivateKeyException} If no private key for containing password exists in keyring.
	 * @throws {PrivateKeyEncryptedException} If no private key for containing password is decrypted in cache.
	 * @return {Promise<Boolean>} True if all passwords were succesfully reencrypted.
	 */
	setIds(Ids) {}
}