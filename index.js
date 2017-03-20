"use strict";

/*
 * Password store inspired by standard UNIX password manager pass.
 * Generated git repositories and archives can be reused with bash utitlity pass.
 * Generated password files extensions are automatically set to .gpg when store is saved.
 */
class JSPass {
	/*
	 * Creates new password store.
	 * @param {String} [prefix=jspass-] - Prefix for saving in the LocalStore.
	 */
	constructor(prefix = "jspass-") {}


	/*
	 * Import ASCII armored or binary key to the keyring.
	 * @param {String|UInt8Array} key - Key to be imported into keyring.
	 * @returns {null|Array<Error>} Null if key was imported, error otherwise.
	 */
	importKey(key) {}


	/*
	 * Initialize password store given path for GPG user ids.
	 * If path doesn't exist, it is created.
	 * Existing password passwords in the path will be reencrypted using new ids.
	 * Private keys for existing files in path needs to be imported and decrypted before initialization.
	 * @throws {InvalidIdException} User id must be in the keyring.
	 * @param {String|Array<String>} userids - User id/s of imported keys in the form "User name <email>" or full email address.
	 * @param {String} [path=/] - Path in the password store to be initialized.
	 * @returns {Boolean} True if the store was succesfully initialized.
	 */
	init(userids, path = "/") {}


	/*
	 * Insert password in the password store. If path doesn't exist, it is created.
	 * @throws {NoInitException} Password store must be initialized before insertion.
	 * @param {String} path - Path of insertion.
	 * @param {String} name - Name of the password.
	 * @param {String} content - Content of the password.
	 * @returns {Password} - Password if store was initialized.
	 */
	insertPassword(path, name, content) {}


	/*
	 * Get password object from the store.
	 * @throws {InvalidEntryException} Password in the path must exist.
	 * @param {String} path - Path of the password.
	 * @returns {Password} Password if it exists.
	 */
	getPassword(path) {}


	/*
	 * Decrypt private keys for given user id with password.
	 * By default, key will stay decrypted for 10 minutes. Every time the key is used, timer is reset.
	 * @throws {InvalidIdException} User id must be in the keyring.
	 * @param {String} userid - User id of the key to be decrypted in the form "User name <email>" or full email address.
	 * @param {String} password - Password for the private key to be decrypted.
	 * @returns {Boolean} True if key was decrypted, false otherwise.
	 */
	decryptKey(userid, password) {}


	/*
	 * Creates new directory in given path. If directory already exists, no error is thrown.
	 * @throws {InvalidEntryException} Parent directory must exist, unless recursive is set to true.
	 * @param {String} path - Path of the new folder.
	 * @param {Boolean} [recursive=false] - If some of the parent folders doesn't exist, create them.
	 */
	mkdir(path, recursive = false) {}


	/*
	 * Removes directory or file.
	 * If path ends with /, path is always treated as directory.
	 * If directory and file has same name and path doesn't end with /, remove file.
	 * @throws {DirNotEmptyException} Directory must be empty, unless recursive is set to true.
	 * @param {String} path - Path of the file or folder.
	 * @param {Boolean} [recursive=false] - Remove directory, even if it isn't empty.
	 */
	rm(path, recursive = false) {}


	/*
	 * Move/rename file or directory. Paths are treated similarly to core-utils mv.
	 * @throws {EntryExistException} Destination cannot exist, unless force is set to true.
	 * @throws {InvalidEntryException} Source must exist.
	 * Destination directory must exist, unless createParent is set to true.
	 * @param {String} source - Source directory or file.
	 * If source ends with /, it is treated as directory.
	 * If directory and file in source has same name and path doesn't end with /, move file.
	 * @param {String} destination - Destination directory or file.
	 * If destination exists, or ends with /, move source there. Otherwise, rename directory or file to the directory name of destination.
	 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
	 * @param {Boolean} [createParent=false] - If destination directory doesn't exist, create it.
	 */
	mv(source, destination, force = false, createParent = false) {}


	/*
	 * Copy file or directory. Paths are treated similarly to core-utils cp.
	 * @throws {EntryExistException} Destination cannot exist, unless force is set to true.
	 * @throws {InvalidEntryException} Source must exist.
	 * Destination directory must exist, unless createParent is set to true.
	 * @param {String} source - Source directory or file.
	 * If source ends with /, it is treated as directory.
	 * If directory and file in source has same name and path doesn't end with /, move file.
	 * @param {String} destination - Destination directory or file.
	 * If destination exists, or ends with /, move source there. Otherwise, rename directory or file to the directory name of destination.
	 * @param {Boolean} [createParent=false] - If destination directory doesn't exist, create it.
	 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
	 */
	cp(source, destination, force = false, createParent = false) {}
}