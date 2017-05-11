/**
 * JSPass root module.
 */

"use strict";

const openpgp = require("openpgp");
const Directory = require("./directory");
const UnlockedKeyring = require("./unlocked-keyring");
const GithubAPI = require('./git/github-api');
const Password = require('./password');

/**
 * Password store inspired by standard UNIX password manager pass.
 * Generated git repositories and archives can be reused with bash utitlity pass.
 * Generated password files extensions are automatically set to .gpg when store is saved.
 * @constructs JSPass
 */
module.exports = class JSPass {
	/**
	 * @param {Boolean} [storeKeys=true] - Store keys in the LocalStore.
	 * @param {String|Number} [unlockedKeyStoreTime=600] - Time for which decrypted private keys should be cahed. Defaults to 10 minutes.
	 * @param {String} [name=jspass-] - Name for saving in the LocalStore and IndexedDB.
	 */
	constructor(unlockedKeyStoreTime = 600, storeKeys = true, name = "jspass-") {
		this.name = name;
		let localStore = new openpgp.Keyring.localstore(name);
		this.keyring = new openpgp.Keyring(localStore);

		this.root = new Directory("root", this);
		this.unlockedKeyring = new UnlockedKeyring(unlockedKeyStoreTime);
		this.storeKeys = storeKeys;

		//override OpenPGP.js methods for email check to also accept substring of user id
		function getForAddress(email) {
		  var results = [];
		  for (var i = 0; i < this.keys.length; i++) {
		    if (emailCheck(email, this.keys[i])) {
		      results.push(this.keys[i]);
		    }
		  }
		  return results;
		};

		function emailCheck(email, key) {
		  email = email.toLowerCase();
		  // escape email before using in regular expression
		  var emailEsc = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		  var emailRegex = new RegExp(emailEsc);
		  var userIds = key.getUserIds();
		  for (var i = 0; i < userIds.length; i++) {
		    var userId = userIds[i].toLowerCase();
		    if (email === userId || emailRegex.exec(userId)) {
		      return true;
		    }
		  }
		  return false;
		}

		this.keyring.publicKeys.getForAddress = getForAddress;
		this.keyring.privateKeys.getForAddress = getForAddress;
	}


	/**
	 * Initialize git. This method must be called first before other git operations.
	 * @param  {String} repoUrl   Repository URL.
	 * @param  {String} userAgent User agent for calls to the github API.
	 */
	initGit(repoUrl, userAgent="jspass") {
		if (repoUrl.match("github.com")) this.git = new GithubAPI(userAgent);
		else throw new Error("Unsupported git service.");

		this.git.setRepository(repoUrl);
	}


	/**
	 * Search for passwords with name containing regex pattern.
	 * @method Directory#search
	 * @param  {String} pattern - Pattern to search for.
	 * @return {Array<Password>|null} Array with macthed password or null if no password has been found.
	 */
	search(pattern, deep = true) {
		return this.root.search(pattern, deep);
	}


	setUnlockedTime(time) {
		this.unlockedKeyring.unlockedKeyStoreTime = time;
	}


	pullGit() {
		return new Promise((resolve, reject) => {
			this.git.getAllFiles().then((files) => {
				let passwordPromises = new Array();
				for (let file of files) {
					if (file.path.endsWith(".gitattributes")) continue;

					file.path = file.path.split("/");
					let filename = file.path.pop();

					let directoryPath = file.path.join('/');
					if (directoryPath) directoryPath += "/";

					let parent;
					if (directoryPath == "") parent = this.root;
					else parent = this.root.addDirectoryRecursive(directoryPath);

					if (filename.endsWith(".gpg")) {
						//remove .gpg extension
						filename = filename.substring(0, filename.length - 4);
						passwordPromises.push(new Password(parent, filename, file.content));
					}
					else if (filename.endsWith('.gpg-id')) {
						parent.ids = file.content.trim().split(" ");
					}
				}

				Promise.all(passwordPromises).then((passwords) => {
					for (let password of passwords) password.parent.passwords.push(password);
					resolve();
				});
			}).catch((err) => reject(err));
		});
	}

	commit(message) { return this.git.commit(message); }


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

		if (this.storeKeys) this.keyring.store();

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
			this.unlockedKeyring.privateKeys.push(keyCopy);
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
	 * @throws {PrivateKeyEncryptedException} If no private key for containing password is decrypted in unlocked keyring.
	 * @return {Promise<Directory>} Promise of directory with all passwords reencrypted to new ids.
	 */
	setKeyIds(keyIds) { return this.root.setKeyIds(keyIds);	}


	createDB() {
		if (typeof window == "undefined") throw new Error("Databse is supported only in browser.");
		let dbPromise = new Promise((resolve, reject) => {
			let request = window.indexedDB.open(this.name, 1);

			request.onerror = function(event) {
				reject(new Error("Creating databse failed, error code: " + request.errorCode));
			}

			request.onupgradeneeded = function(event) {
				let db = event.target.result;

				let directories = db.createObjectStore("directories", {autoIncrement: true});
				directories.createIndex("parentPath", "parentPath", { unique: false });
				directories.createIndex("name", "name", { unique: false });
				directories.createIndex("ids", "ids", { unique: false });

				let passwords = db.createObjectStore("passwords", {autoIncrement: true});
				passwords.createIndex("parentPath", "parentPath", { unique: false });
				passwords.createIndex("name", "name", { unique: false });
				passwords.createIndex("content", "content", { unique: false });
			}

			request.onsuccess = function(event) { resolve(event.target.result) }
		});

		return new Promise((resolve, reject) => {
			dbPromise.then((db) => {
				this.database = db;
				this.database.onerror = function(event) {
					throw new Error("Databse error, error code: " + event.target.errorCode);
				}
				resolve();
			}).catch((err) => reject(err));
		});
	}


	storeToDB() {
		return new Promise((resolve, reject) => {
			let transaction = this.database.transaction(["directories", "passwords"], "readwrite");

			transaction.oncomplete = function(event) {
				resolve();
			}

			transaction.onerror = function(event) {
				reject(new Error("Error while saving passwords to the to database."));
			}

			let directories = transaction.objectStore("directories");
			let passwords = transaction.objectStore("passwords");
			this.root.storeToDB(directories, passwords);
		});
	}


	loadFromDB() {
		return new Promise((resolve, reject) => {
			let transaction = this.database.transaction(["directories", "passwords"]);

			let directories = new Array();
			let directoriesStore = transaction.objectStore("directories");
			directoriesStore.openCursor().onsuccess = function(event) {
				let cursor = event.target.result;
				if (cursor) {
					directories.push(cursor.value);
					cursor.continue();
				}
			}

			let passwords = new Array();
			let passwordsStore = transaction.objectStore("passwords");
			passwordsStore.openCursor().onsuccess = function(event) {
				let cursor = event.target.result;
				if (cursor) {
					passwords.push(cursor.value);
					cursor.continue();
				}
			}

			let rootDir = this.root;
			transaction.oncomplete = function(event) {
				rootDir.loadFromDB(directories, passwords).then(() => resolve()).catch((err) => reject(err));
			}

			transaction.onerror = function(event) {
				reject(new Error("Cannot load directories and passwords from database."));
			}
		});
	}


	deleteDB() {
		return new Promise((resolve, reject) => {
			let request = window.indexedDB.deleteDatabase(this.name);

			request.onsuccess = function(event) { resolve() }

			request.onerror = function(event) { reject(new Error("Cannot delete database.")) }
		});
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
	insertPasswordByPath(destination, name, content) {
		let destinationDir = this.root.addDirectoryRecursive(destination.substring(1));
		return destinationDir.addPassword(name, content);
	}


	/**
	 * Get password object from the store.
	 * @method JSPass#getPasswordByPath
	 * @throws If password doesn't exist.
	 * @param {String} path - Path of the password starting with "/" and ending with password name.
	 * @returns {Password} Password if it exists.
	 */
	getPasswordByPath(path) {
		path = path.split("/").slice(1);
		let currentDir = this.root;

		while (path.length > 1) currentDir = currentDir.getDirectory(path.shift());

		return currentDir.getPassword(path.shift());
	}


	/**
	 * Get directory object from the store.
	 * @method  JSPass#getDirectoryByPath
	 * @param {String} path Path of the directory starting with "/" and ending with it's name, with optional "/" on the end.
	 * @throws If directory doesn't exist.
	 * @return {Directory} Directory if it exists.
	 */
	getDirectoryByPath(path) {
		path = path.split("/").slice(1);
		if (path[path.length - 1] == '') path.pop();

		let currentDir = this.root;
		while (path.length) currentDir = currentDir.getDirectory(path.shift());

		return currentDir;
	}


	/**
	 * Get password or directory with specified path.
	 * @param  {String} path Path of directory or password. If path ends with "/", it's always treated as directory.
	 * @throws If neither password nor directory with path exists.
	 * @return {Directory|Password} Password or directory with specified path.
	 */
	getItemByPath(path) {
		let item;
		if (!path.endsWith("/")) {
			try {	item = this.getPasswordByPath(path); }
			catch (err) {}
		}

		if (!item) {
			try { item = this.getDirectoryByPath(path) }
			catch(err) {}
		}

		if (!item) throw new Error("Item with specified path doesn't exist.");

		return item;
	}


	/**
	 * Removes directory or password.
	 * If path ends with /, path is always treated as directory.
	 * If directory and file has same name and path doesn't end with /, remove file.
	 * @method JSPass#removeByPath
	 * @throws If path doesn't exist.
	 * @param {String} path - Path of the file or folder.
	 */
	removeItemByPath(path) {
		let item = this.getItemByPath(path);
		item.remove();
	}


	/**
	 * Add password to store. Password is automatically encrypted to the corresponding keys of directory.
	 * @method Directory#addPassword
	 * @param {String} name - Name of the password.
	 * @param {String} content - Content of the password.
	 * @throws {EntryExistsException} If password with same name already exists in direcotry.
	 * @return {Promise<Password>} Promise of new password.
	 */
	addPassword(name, content) { return this.root.addPassword(name, content);	}


	/**
	 * Get password from root directory.
	 * @method JSPass#getPassword
	 * @param {String} name Name of the password.
	 * @return {Password} Password with specified name.
	 * @throws {InvalidEntryException} If password with specified name doesnt exist.
	 */
	getPassword(name) { return this.root.getPassword(name); }


	/**
	 * Add new directory to the root.
	 * @method Directory#addDirectory
	 * @param {String} name Name of the enw directory.
	 * @return {Directory} Newly created directory.
	 */
	addDirectory(name) { return this.root.addDirectory(name); }


	/**
	 * Get directory with specified name from root directory.
	 * @method Directory#getDirectory
	 * @param  {String} name Name of the directory to return.
	 * @return {Directory} Directory with specified name.
	 * @throws {InvalidEntryException} If directory with specified name doesn't exist.
	 */
	getDirectory(name) { return this.root.getDirectory(name); }


	/**
	 * Get root directory of the store.
	 * @return {Directory} Root directory.
	 */
	getRoot() { return this.root; }


	/**
	 * Move/rename file or directory. Paths are treated similarly to core-utils mv.
	 * @method JSPass#move
	 * @throws {EntryExistsException} If destination already exists, unless force is set to true.
	 * @throws {InvalidEntryException} If source doesn't exist.
	 * @param {String} source - Source directory or file.
	 * If source ends with /, it is treated as directory.
	 * If directory and file in source has same name and path doesn't end with /, move file.
	 * @param {String} destination - Destination directory.
	 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
	 * @returns {Promise<Directory|Password>} Promise of moved directory or password reencrypted to the corresponding keys of new location.
	 */
	move(source, destination, force = false) {
		let sourceItem = this.getItemByPath(source);
		let destinationDir = this.root.addDirectoryRecursive(destination.substring(1));

		return new Promise((resolve, reject) => {
			sourceItem.move(destinationDir, force).then( (item) => {
				resolve(item);
			});
		});
	}


	/**
	 * Copy file or directory. Paths are treated similarly to core-utils cp.
	 * @method JSPass#copy
	 * @throws {EntryExistsException} If destination already exist, unless force is set to true.
	 * @throws {InvalidEntryException} If source doesn't exist.
	 * @param {String} source - Source directory or file.
	 * If source ends with /, it is treated as directory.
	 * If directory and file in source has same name and path doesn't end with /, move file.
	 * @param {String} destination - Destination directory.
	 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
	 * @returns {Directory|Password} Reference to the copied firectory or password.
	 */
	copy(source, destination, force = false) {
		let sourceItem = this.getItemByPath(source);
		let destinationDir = this.root.addDirectoryRecursive(destination.substring(1));

		return new Promise((resolve, reject) => {
			sourceItem.copy(destinationDir, force).then( (item) => {
				resolve(item);
			});
		});
	}
}