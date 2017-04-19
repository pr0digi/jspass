"use strict"

/**
 * Directory module
 */

const Password = require("./password");

/**
 * Class representing directory.
 * All password added to the directory are automatically encrypted to it's corresponding user ids.
 * @constructs Directory
 */
module.exports = class Directory {
	/**
	 * @param  {String} name - Name of the directory
	 * @param  {String} [parent] - Reference to parent directory.
	 * If parent isn't specified, parent directory is set to this, meaning it is root directry.
	 * @return {Directory} New directory.
	 */
	constructor(name, parent) {
		if (typeof name !== "string") throw new TypeError("Parameter name must be string.");

		//If directory is root directory
		if (parent.constructor.name === "JSPass") this.ids = new Array();

		this.name = name;
		this.parent = parent;
		this.directories = new Array();
		this.passwords = new Array();
	}


	/**
	 * Checks if directory is root directory.
	 * @return {Boolean} True if directory is root directory.
	 */
	isRoot() { return this.parent.constructor.name == "JSPass" }


	/**
	 * Get store keyring.
	 * @return {Keyring} OpenPGP.js keyring.
	 */
	getKeyring() {
		if (this.isRoot()) return this.parent.keyring;
		else return parent.getKeyring();
	}


	/**
	 * Get private key cache.
	 * @return {Keyring} OpenPGP.js keyring.
	 */
	getCache() {
		if (this.isRoot()) return this.parent.cache;
		else return parent.getCache();
	}


	/**
	 * Check if password with name already exists in directory.
	 * This method throws if directory exists.
	 * @param  {String} name Name of the password.
	 * @return {undefined}
	 */
	passwordNameCheck(name) {
		for (let password of this.passwords) {
			if (password.name == name) throw new Error("Password with this name already exist in directory.");
		}
	}


	/**
	 * Check if directory with specified name already exists in directory.
	 * This method throws if directory exists.
	 * @param  {String} name Name of the password.
	 * @return {undefined}
	 */
	directoryNameCheck(name) {
		for (let directory of this.directories) {
			if (directory.name == name) throw new Error("Directory with this name already exist in directory.");
		}
	}


	/**
	 * Add password to directory. Password is automatically encrypted to the corresponding keys of directory.
	 * @method Directory#addPassword
	 * @param {String} name - Name of the password.
	 * @param {String} content - Content of the password.
	 * @throws {EntryExistsException} If password with same name already exists in direcotry.
	 * @return {Promise<Directory>} Promise of directory with new password.
	 */
	addPassword(name, content) {
		this.passwordNameCheck(name);
		return new Promise( (resolve, reject) => {
			new Password(this, name, content).then( (password) => {
				this.passwords.push(password);
				resolve(this);
			});
		});
	}


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
	getPassword(name) {
		for (let password of this.passwords) {
			if (password.name == name) return password;
		}
		throw new Error("Password with specified name not found.");
	}


	/**
	 * Get all password in directory.
	 * @method Directory#getAllPasswords
	 * @return {Array<Password>} All passwords in directory.
	 */
	getAllPasswords() { return this.passwords; }


	/**
	 * Add new directory.
	 * @method Directory#addDirectory
	 * @param {String} name Name of the enw directory.
	 * @return {Directory} Newly created directory.
	 */
	addDirectory(name) {
		this.directoryNameCheck(name);
		let dir = new Directory(name, this);
		this.directories.push(dir);
		return dir;
	}


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
	 * Get public or private keys for specified key id's.
	 * @param {String} type Type of key, can be "public" or "private".
	 * @param {Array<String>} keyIds Id's to get key for. If id's aren't specified, get current keys for directory.
	 * @return {Array<Key>} Private or public keys for specified id's or for current directory id's.
	 */
	getKeysFor(type, keyIds) {
		let keyArray;
		if (type == "public") keyArray = this.getKeyring().publicKeys;
		else keyArray = this.getKeyring().privateKeys;
		if (!keyIds) keyIds = this.getKeyIds();

		let keys = new Array();

		for (let id of keyIds) {
			let key = keyArray.getForId(id);
			if (key == null) throw new Error("Key not found.");
			keys.push(key);
		}
		return keys;
	}


	getUnlockedPrivateKey() {
		let keyIds = this.getKeyIds();
		let cache = this.getCache();

		for (let id of keyIds) {
			let key = cache.privateKeys.getForId(id);
			return key;
		}
		throw new Error("No unlocked private key found.");
	}


	/**
	 * Get key id's for directory.
	 * @method Directory#getKeyIds
	 * @return {Array<String>} Id's of directory.
	 */
	getKeyIds() {
		return this.ids ? this.ids : this.parent.getKeyIds(form);
	}


	reencryptTo(newKeys) {
		if (this.ids) return; //return if diffrent id's are set for subdirectory

		for (let directory of this.directories) directory.reencryptTo(newKeys);

		for (let password of this.passwords) password.reencryptTo(newKeys);
	}


	/**
	 * Set id's for directory. All passwords will be reencrypted using new ids.
	 * @method Directory#setKeyIds
	 * @param {Array<String>} Fingerprint or long key id.
	 * @return {Promise<Directory>} Promise of directory with reencrypted passwords.
	 * @throws {InvalidIdException} If id isn't in keyring.
   * @throws {NoPrivateKeyException} If no private key for containing password exists in keyring.
	 * @throws {PrivateKeyEncryptedException} If no private key for containing password is decrypted in cache.
	 */
	setKeyIds(ids) {
		let newKeys = this.getKeysFor("public", ids);
		let promises = new Array();
		for (let directory of this.directories) promises.push(reencryptTo(newKeys));
		for (let password of this.passwords) promises.push(password.reencryptTo(newKeys));

		return new Promise( (resolve, reject) => {
			Promise.all(promises).then( () => {
				this.ids = ids;
				resolve(this);
			});
		});
	}
}