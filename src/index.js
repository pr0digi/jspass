/**
 * JSPass root module.
 * @requires password
 */

"use strict";

import Password from "password";

/**
 * Password store inspired by standard UNIX password manager pass.
 * Generated git repositories and archives can be reused with bash utitlity pass.
 * Generated password files extensions are automatically set to .gpg when store is saved.
 * @constructs JSPass
 */
export default class JSPass {
	/**
	 * @param {Boolean} [storeKeys=true] - Store keys in the LocalStore.
	 * @param {String|Number} [privateKeyCacheTime=600] - Time for which decrypted private keys should be cahed. Defaults to 10 minutes.
	 * @param {String} [prefix=jspass-] - Prefix for saving in the LocalStore.
	 */
	constructor(storeKeys = true, privateKeyCacheTime = 600, prefix = "jspass-") {}


	/**
	 * Import ASCII armored or binary key to the keyring. Key can be either public or private.
	 * @method JSPass#importKey
	 * @param {String|UInt8Array} key - Key to be imported into keyring.
	 * @returns {null|Array<Error>} Null if key was imported, error otherwise.
	 */
	importKey(key) {}


	/**
	 * Decrypt private keys for given user id with password.
	 * By default, key will stay decrypted for 10 minutes. Every time the key is used, timer is reset.
	 * @method JSPass#decryptKey
	 * @throws {InvalidIdException} If user id isn't in keyring.
	 * @param {String} id - User id in the form "User name <email>" or full email address or key id of the key to be decrypted.
	 * @param {String} password - Password for the private key to be decrypted.
	 * @returns {Boolean} True if key was decrypted, false otherwise.
	 */
	decryptKey(id, password) {}


	/**
	 * Get user id's for root directory. By default, id's are in the form of fingerprint.
	 * Id's are in the form "User name <email address>".
	 * @method JSPass#getIds
	 * @param {String} [form=fingerprint] Form of ids, possible values are "userids", "longids" and "fingerprint".
	 * @return {Array<String>} Id's of directory.
	 */
	getIds(form = "fingerprint") {}


	/**
	 * Set id's for root directory. All passwords will be reencrypted using new ids.
	 * @method JSPass#seIds
	 * @param {String|Array<String>} Ids User ids in the form "User name <email address>", fingerprint or long key id.
	 * @return {Promise<Directory>} Promise of directory with reencrypted passwords.
	 * @throws {InvalidIdException} If user id isn't in keyring.
   * @throws {NoPrivateKeyException} If no private key for containing password exists in keyring.
	 * @throws {PrivateKeyEncryptedException} If no private key for containing password is decrypted in cache.
	 * @return {Promise<Boolean>} True if all passwords were succesfully reencrypted.
	 */
	setIds(Ids) {}


	/**
	 * Insert password in the password store. If path doesn't exist, it is created.
	 * @method JSPass#insertPassword
	 * @throws {NoInitException} If store path wasn't previously initialized.
	 * @throws {InvalidEntryException} If path doesn't exist.
	 * @param {String} path - Path of insertion.
	 * @param {String} name - Name of the password.
	 * @param {String} content - Content of the password.
	 * @returns {Promise<Password>} - Password if store was previously initialized.
	 */
	insertPassword(path, name, content) {}


	/**
	 * Get password object from the store.
	 * @method JSPass#getPassword
	 * @throws {InvalidEntryException} If password doesn't exist.
	 * @param {String} path - Path of the password.
	 * @returns {Password} Password if it exists.
	 */
	getPassword(path) {}


	/**
	 * Creates new folder recursively in given path. If directory already exists, no error is thrown.
	 * @method JSPass#mkdir
	 * @param {String} path - Path of the new folder.
	 * @returns {Directory} Newly created directory.
	 */
	createFolder(path, recursive = false) {}


	/**
	 * Removes directory or password.
	 * If path ends with /, path is always treated as directory.
	 * If directory and file has same name and path doesn't end with /, remove file.
	 * @method JSPass#remove
	 * @throws {InvalidEntryException} If path doesn't exist.
	 * @param {String} path - Path of the file or folder.
	 */
	remove(path) {}


	/**
	 * Move/rename file or directory. Paths are treated similarly to core-utils mv.
	 * @method JSPass#move
	 * @throws {EntryExistsException} If destination already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If source doesn't exist.
	 * @param {String} source - Source directory or file.
	 * If source ends with /, it is treated as directory.
	 * If directory and file in source has same name and path doesn't end with /, move file.
	 * @param {String} destination - Destination directory or file.
	 * If destination exists, or ends with /, move source there. Otherwise, rename directory or file to the base name name of destination.
	 * If destination directory doesn't exist, it is created.
	 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
	 * @returns {Directory|Password} Reference to the moved directory or password.
	 */
	move(source, destination, force = false) {}


	/**
	 * Copy file or directory. Paths are treated similarly to core-utils cp.
	 * @method JSPass#copy
	 * @throws {EntryExistsException} If destination already exist, unless force is set to true.
	 * @throws {InvalidEntryException} If source doesn't exist.
	 * @param {String} source - Source directory or file.
	 * If source ends with /, it is treated as directory.
	 * If directory and file in source has same name and path doesn't end with /, move file.
	 * @param {String} destination - Destination directory or file.
	 * If destination exists, or ends with /, move source there. Otherwise, rename directory or file to the directory name of destination.
	 * If destination directory doesn't exist, it is created.
	 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
	 * @returns {Directory|Password} Reference to the copied firectory or password.
	 */
	copy(source, destination, force = false, createParent = false) {}
}