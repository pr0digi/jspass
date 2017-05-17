"use strict"

/**
 * Directory module
 */

/**
 * @ignore
 */
var Password = require("./password");
var util = require("./util");

/**
 * Prototype representing directory.
 * All password added to the directory are automatically encrypted to it's corresponding user ids.
 * @constructor
 * @param  {String} name - Name of the directory
 * @param  {String} [parent] - Reference to parent directory.
 * If parent isn't specified, parent directory is set to this, meaning it is root directory.
 * @return {Directory} New directory.
 */
function Directory(name, parent) {
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
Directory.prototype.isRoot = function() { return this.parent.constructor.name == "JSPass" }


Directory.prototype.getPath = function() {
	if (this.isRoot()) return '/';
	else return this.parent.getPath() + this.name + '/';
}


/**
 * Get store keyring.
 * @return {Keyring} OpenPGP.js keyring.
 */
Directory.prototype.getKeyring = function() {
	if (this.isRoot()) return this.parent.keyring;
	else return this.parent.getKeyring();
}


Directory.prototype.getGit = function() {
	if (this.isRoot()) {
		if (typeof this.parent.git == 'undefined') throw new Error("Git wasn't initialized");
		return this.parent.git;
	}
	else return this.parent.getGit();
}


/**
 * Get private key unlocked keyring.
 * @return {Keyring} OpenPGP.js keyring.
 */
Directory.prototype.getUnlockedKeyring = function() {
	if (this.isRoot()) return this.parent.unlockedKeyring;
	else return this.parent.getgetUnlockedKeyring();
}


/**
 * Store directory to IndexedDB.
 * @param  {ObjectStore} directoriesOS ObjectStore for directories.
 * @param  {ObjectStore} passwordsOS   ObjectStore for passwords.
 * @return {Promise<undefined>}        Promise, if resolved, directory was sucessfully saved to database.
 */
Directory.prototype.storeToDB = function(directoriesOS, passwordsOS) {
	return new Promise((resolve, reject) => {
		var content = this;
		const dir = {
			parentPath: this.isRoot() ? "password-store" : this.parent.getPath(),
			path: this.getPath(),
			name: this.name,
			ids: this.ids ? this.ids : null
		}
		var request = directoriesOS.add(dir);

		request.onsuccess = function(event) {
			var promises = new Array();
			for (let password of content.passwords) { promises.push(password.storeToDB(passwordsOS)) }
			for (let directory of content.directories) { promises.push(directory.storeToDB(directoriesOS, passwordsOS)) }

			Promise.all(promises).then(() => { resolve() }).catch((err) => { reject(err) });
		}

		request.onerror = function(event) { reject(new Error("Error saving directory to databse.")) }
	});
}


/**
 * Load directory from IndexedDB.
 * @param  {Array<Object>} allDirectories  All directories from IndexedDB.
 * @param  {Array<Object>} allPasswords    All passwords from IndexedDB.
 * @return {Promise<Directory>}            Promise of directory with content loaded from IndexedDB.
 */
Directory.prototype.loadFromDB = function(allDirectories, allPasswords) {
	return new Promise((resolve, reject) => {
		var currentPath = this.getPath();

		var dirInfo = allDirectories.find((dir) => { return dir.path == currentPath });
		if (dirInfo && dirInfo.ids) this.ids = dirInfo.ids;

		var contentPasswords = allPasswords.filter((password) => { return password.parentPath == currentPath });

		var passwordPromises = new Array();
		for (let password of contentPasswords) {
			var pass = new Password(this, password.name, password.content);
			passwordPromises.push(pass);
		}

		//save passwords after they're objects have been created
		Promise.all(passwordPromises).then((passwords) => {
			this.passwords = passwords;
			var directoryPromises = new Array();
			//find children directories of this directory and load their content
			var contentDirectories = allDirectories.filter((directory) => { return directory.parentPath == currentPath });
			for (let directory of contentDirectories) {
				var dir = new Directory(directory.name, this);
				directoryPromises.push(dir.loadFromDB(directories, allPasswords));
			}

			//save created directories as childrens after they're initialized with their passwords
			Promise.all(directoryPromises).then((directories) => {
				this.directories = directories;
				resolve(this);
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	});
}


/**
 * Check if password with name already exists in directory.
 * This method throws if directory exists.
 * @param  {String} name Name of the password.
 * @return {undefined}
 */
Directory.prototype.passwordNameCheck = function(name) {
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
Directory.prototype.directoryNameCheck = function(name) {
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
 * @return {Promise<Password>} Promise of new password.
 */
Directory.prototype.addPassword = function(name, content) {
	this.passwordNameCheck(name);
	return new Promise( (resolve, reject) => {
		new Password(this, name, content).then( (password) => {
			this.passwords.push(password);
			try {
				this.getGit().createFile(password.getPath().substr(1) + ".gpg", password.content);
			}
			catch (err) {}
			resolve(password);
		});
	});
}


/**
 * Get password from directory.
 * @method Directory#getPassword
 * @param {String} name Name of the password.
 * @return {Password} Password with specified name.
 * @throws {InvalidEntryException} If password with specified name doesnt exist.
 */
Directory.prototype.getPassword = function(name) {
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
Directory.prototype.getAllPasswords = function() { return this.passwords; }



Directory.prototype.removePassword = function(name) {
	for (var i=0; i<this.passwords.length; i++) {
		if (this.passwords[i].name == name) {
			this.passwords.splice(i, 1);
			return;
		}
	}
}


/**
 * Add new directory.
 * @method Directory#addDirectory
 * @param {String} name Name of the enw directory.
 * @return {Directory} Newly created directory.
 */
Directory.prototype.addDirectory = function(name) {
	this.directoryNameCheck(name);
	var dir = new Directory(name, this);
	this.directories.push(dir);
	return dir;
}


/**
 * Adds new directory recursively.
 * @param {String} path Relative path of the new directory.
 * @return {Directory} Newly created directory.
 */
Directory.prototype.addDirectoryRecursive = function(path) {
	if (path.startsWith("./")) path = path.substring(2);

	path = path.split("/");

	if (path[path.length - 1] == "") path.pop();

	var currentDir = this;

	for (let pathPart of path) {
		try {
			currentDir = currentDir.getDirectory(pathPart);
		}
		catch (err) {
			currentDir = currentDir.addDirectory(pathPart);
		}
	}

	return currentDir;
}


/**
 * Get directory with specified name.
 * @method Directory#getDirectory
 * @param  {String} name Name of the directory to return.
 * @return {Directory} Directory with specified name.
 * @throws {InvalidEntryException} If directory with specified name doesn't exist.
 */
Directory.prototype.getDirectory = function(name) {
	for (let directory of this.directories) {
		if (directory.name == name) return directory;
	}
	throw new Error("Directory with specified name doesn't exist.");
}


/**
 * Get all directories in directory.
 * @method Directory#getAllDirectories
 * @return {Array<Directory>} All directories in directory.
 */
Directory.prototype.getAllDirectories = function() { return this.directories; }


/**
 * Remove directory from array of directories.
 * @param  {String} name Name of directory to remove.
 */
Directory.prototype.removeDirectory = function(name) {
	for (var i=0; i<this.directories.length; i++) {
		if (this.directories[i].name == name) {
			this.directories.splice(i, 1);
			return;
		}
	}
}


/**
 * Move directory to destination directory.
 * @method Directory#move
 * @param  {String} destination - Destination directory where it should be moved.
 * @param  {Boolean} [force=false] - Overwrite directory in destination if it already exists.
 * @return {Promise<Directory>} Promise of directory reencrypted to the corresponding keys of new location.
 * @throws {EntryExistsException} If directory with same name in destination directory already exists, unless force is set to true.
 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
 */
Directory.prototype.move = function(destination, force = false) {
	if (!force) destination.directoryNameCheck(this.name);

	try {
		var dir = destination.getDirectory(this.name);
		dir.remove();
	}
	catch (err) {}

	var oldKeysIds = this.getKeyIds();
	var newKeysIds = destination.getKeyIds();

	this.parent.removeDirectory(this.name);
	destination.directories.push(this);

	return new Promise((resolve, reject) => {
		if (util.keysEqual(oldKeysIds, newKeysIds)) resolve(this);

		this.reencryptTo(newKeysIds).then(() => { resolve(this); });
	});
}


/**
 * Copy directory to destination directory.
 * @method Directory#copy
 * @param  {Directory} destination - Destination directory where directory should be copied.
 * @param  {Boolean} [force=false] - Overwrite directory in destination if it already exists.
 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
 * @return {Promise<Directory>} Promise of directory copied to the new location and reencrypted to it's keys.
 * @throws {EntryExistsException} If directory with same name in destination directory already exists, unless force is set to true.
 * @throws {InvalidEntryException} If destination directory doesn't exist, unless createDestination is set to true.
 */
Directory.prototype.copy = function(destination, force = false) {
	if (!force) destination.directoryNameCheck(this.name);

	try {
		var dir = destination.getDirectory(this.name);
		dir.remove();
	}
	catch (err) {}

	return new Promise((resolve, reject) => {
		var newDir = destination.addDirectory(this.name);

		var promises = new Array();
		for (let password of this.passwords) promises.push(password.copy(newDir));

		for (let directory of this.directories) promises.push(directory.copy(newDir));

		Promise.all(promises).then(() => { resolve(newDir); });
	});
}


/**
 * Rename directory.
 * @method Directory#rename
 * @param  {String} name - New name of the directory.
 * @return {Password} Reference to the renamed directory.
 * @throws {EntryExistsException} If directory with same name already exist in parent directory.
 */
Directory.prototype.rename = function(name) {
	this.directoryNameCheck(name);
	this.name = name;
}


/**
 * Remove directory.
 * @method  Directory#remove
 */
Directory.prototype.remove = function() {
	if (this.isRoot()) throw new Error("Cannot remove root directory.");
	for (let dir of this.directories) dir.remove();
	for (let pass of this.passwords) pass.remove();
	this.parent.removeDirectory(this.name);
	delete this;
}


/**
 * Search for passwords with name containing regex pattern.
 * @method Directory#search
 * @param  {String} pattern - Pattern to search for.
 * @return {Array<Password>|null} Array with macthed password or null if no password has been found.
 */
Directory.prototype.search = function(pattern, deep = true) {
	if (typeof pattern == "string") {
		pattern =  pattern.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		pattern = new RegExp(pattern);
	}
	else if (pattern.constructor.name != "RegExp") throw new Error("Invalid pattern");
	var matches = new Array();

	for (let password of this.passwords) {
		if (pattern.test(password.name)) matches.push(password.getPath());
	}

	if (deep) {
		for (let directory of this.directories) {
			matches.concat(directory.search(pattern, true));
		}
	}

	return matches;
}


/**
 * Get public or private keys for specified key id's.
 * @param {String} type Type of key, can be "public" or "private".
 * @param {Array<String>} keyIds Id's to get key for. If id's aren't specified, get current keys for directory.
 * @return {Array<Key>} Private or public keys for specified id's or for current directory id's.
 */
Directory.prototype.getKeysFor = function(type, keyIds) {
	var keyArray;
	if (type == "public") keyArray = this.getKeyring().publicKeys;
	else keyArray = this.getKeyring().privateKeys;

	if (!keyIds) keyIds = this.getKeyIds();

	var keys = new Array();

	for (let id of keyIds) {
		var key = keyArray.getForId(id, true);
		if (key == null) throw new Error("Key not found.");
		keys.push(key);
	}
	return keys;
}


Directory.prototype.getUnlockedPrivateKey = function(keyIds) {
	if (!keyIds) keyIds = this.getKeyIds();
	var keyring = this.getUnlockedKeyring();

	for (let id of keyIds) {
		var key = keyring.privateKeys.getForId(id, true);
		if (key) return key;
	}

	for (let id of keyIds) {
		var key = keyring.privateKeys.getForAddress(id);
		if (key.length != 0) return key;
	}
	throw new Error("No unlocked private key found.");
}


/**
 * Set id's for directory. All passwords will be reencrypted using new ids.
 * @method Directory#setKeyIds
 * @param {Array<String>} Fingerprint or long key id.
 * @return {Promise<Directory>} Promise of directory with reencrypted passwords.
 * @throws {InvalidIdException} If id isn't in keyring.
 * @throws {NoPrivateKeyException} If no private key for containing password exists in keyring.
 * @throws {PrivateKeyEncryptedException} If no private key for containing password is decrypted in unlocked keyring.
 */
Directory.prototype.setKeyIds = function(newIds) {
	return new Promise( (resolve, reject) => {
		var newKeys = this.getKeysFor("public", newIds);
		var promises = new Array();
		for (let directory of this.directories) promises.push(directory.reencryptTo(newKeys));
		for (let password of this.passwords) promises.push(password.reencryptTo(newKeys));

		Promise.all(promises).then(() => {
			try {
				var git = this.getGit();
				var path = this.getPath().substr(1) + ".gpg-id";
				git.changeContent(path, newIds.join(" "));
			}
			catch (err) {}
			this.ids = newIds;
			resolve(this);
		});
	});
}


/**
 * Get key id's for directory.
 * @method Directory#getKeyIds
 * @return {Array<String>} Id's of directory.
 */
Directory.prototype.getKeyIds = function() {
	return this.ids ? this.ids : this.parent.getKeyIds();
}


Directory.prototype.reencryptTo = function(newKeys) {
	return new Promise((resolve, reject) => {
		if (this.ids) resolve(); //return if diffrent id's are set for subdirectory

		var promises = new Array();
		for (let directory of this.directories) promises.push(directory.reencryptTo(newKeys));

		for (let password of this.passwords) promises.push(password.reencryptTo(newKeys));

		Promise.all(promises).then( () => {
			resolve();
		}).catch((err) => reject(err));
	});
}

module.exports = Directory;