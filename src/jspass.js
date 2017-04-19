/**
 * JSPass root module.
 * @requires password
 */

"use strict";

const openpgp = require("openpgp");
const Directory = require("./directory");
const CachedKeyring = require("./cached-keyring")

/**
 * Password store inspired by standard UNIX password manager pass.
 * Generated git repositories and archives can be reused with bash utitlity pass.
 * Generated password files extensions are automatically set to .gpg when store is saved.
 * @constructs JSPass
 */
module.exports = class JSPass {
	/**
	 * @param {Boolean} [storeKeys=true] - Store keys in the LocalStore.
	 * @param {String|Number} [privateKeyCacheTime=600] - Time for which decrypted private keys should be cahed. Defaults to 10 minutes.
	 * @param {String} [prefix=jspass-] - Prefix for saving in the LocalStore.
	 */
	constructor(privateKeyCacheTime = 600, storeKeys = true, prefix = "jspass-") {
		this.keyring = new openpgp.Keyring();
		this.root = new Directory("root", this);
		this.cache = new CachedKeyring(privateKeyCacheTime);
	}


	/**
	 * Import ASCII armored key to the keyring. Key can be either public or private.
	 * @method JSPass#importKey
	 * @param {String|UInt8Array} armoredKey - Key to be imported into keyring.
	 * @returns {null|Array<Error>} Null if key was imported, error otherwise.
	 */
	importKey(armoredKey) {
		let key = openpgp.key.readArmored(armoredKey);
		if (key.err) return key.err;

		if (key.keys[0].isPublic()) {
			for (let keyItem of key.keys) this.keyring.publicKeys.push(keyItem);
		}
		else for (let keyItem of key.keys) this.keyring.privateKeys.push(keyItem);

		return null;
	}


	/**
	 * Decrypt private keys for given user id with password.
	 * By default, key will stay decrypted for 10 minutes. Every time the key is used, timer is reset.
	 * @method JSPass#decryptKey
	 * @throws {Error} If id isn't in keyring.
	 * @param {String} id - Fingerprint or long key id of the key to be decrypted.
	 * @param {String} password - Password for the private key to be decrypted.
	 * @returns {Boolean} True if key was decrypted, false otherwise.
	 */
	decryptKey(id, password) {
		let key = this.keyring.privateKeys.getForId(id);
		if (key == null) throw new Error("ID isn't in keyring.");
		let armored = key.armor();

		let keyCopy = openpgp.key.readArmored(armored).keys[0];
		if (keyCopy.decrypt(password)) {
			this.cache.privateKeys.push(keyCopy);
			return true;
		}
		else return false;
	}


	/**
	 * Get id's for root directory.
	 * @method JSPass#getIds
	 * @return {Array<String>} Id's of directory.
	 */
	getKeyIds() { return this.root.getKeyIds(); }


	/**
	 * Set id's for root directory. All passwords will be reencrypted using new ids.
	 * @method JSPass#setIds
	 * @param {String|Array<String>} ids Fingerprint or long key id.
	 * @return {Promise<Directory>} Promise of password store with reencrypted passwords.
	 * @throws {InvalidIdException} If some id isn't in keyring.
   * @throws {NoPrivateKeyException} If no private key for containing password exists in keyring.
	 * @throws {PrivateKeyEncryptedException} If no private key for containing password is decrypted in cache.
	 * @return {Promise<Directory>} Promise of directory with all passwords reencrypted to new ids.
	 */
	setKeyIds(keyIds) {
		return this.root.setKeyIds(keyIds);
	}


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
	 * Add password to store. Password is automatically encrypted to the corresponding keys of directory.
	 * @method Directory#addPassword
	 * @param {String} name - Name of the password.
	 * @param {String} content - Content of the password.
	 * @throws {EntryExistsException} If password with same name already exists in direcotry.
	 * @return {Promise<Password>} Promise of new password.
	 */
	addPassword(name, content) {
		return this.root.addPassword(name, content);
	}


	/**
	 * Get password object from the store.
	 * @method JSPass#getPassword
	 * @throws {InvalidEntryException} If password doesn't exist.
	 * @param {String} path - Path of the password.
	 * @returns {Password} Password if it exists.
	 */
	getPassword(path) {}


	/**
	 * Add new directory to the root.
	 * @method Directory#addDirectory
	 * @param {String} name Name of the enw directory.
	 * @return {Directory} Newly created directory.
	 */
	addDirectory(name) { return this.root.addDirectory(name); }


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