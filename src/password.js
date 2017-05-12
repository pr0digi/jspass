"use strict"

/**
 * Password module.
 */


var openpgp = require("openpgp");
var Directory = require("./directory");
var util = require("./util");


/**
 * Prototype representing password. Password content is encrypted using OpenPGP.js library.
 * Password is automatically encrypted for user ids of containing directory.
 * @constructor
 * @class
 * @param  {Directory} parent            Reference to containing directory.
 * @param  {String} name                 Name of the password.
 * @param  {String|Uint8Array} content   Content of the password, if content is string, it is automatically encrypted.
 * @return {Promise<Password>}           New password.
 */
function Password(parent, name, content) {
	this.parent = parent;
	this.name = name;
	if (typeof content === "string") return this.encrypt(content);
	else {
		this.content = Uint8Array.from(content);
		return new Promise((resolve, reject) => { resolve(this) });
	}
}


/**
 * Save password to IndexedDB.
 * @method Password#storeToDB
 * @param  {ObjectStore} passwordsObjectStore ObjectStore where password should be saved.
 * @return {Promise}                          If resolved, password was succesfully saved.
 */
Password.prototype.storeToDB = function(passwordsObjectStore) {
	return new Promise((resolve, reject) => {
		const pass = {
			parentPath: this.parent.getPath(),
			name: this.name,
			content: this.content
		}

		let request = passwordsObjectStore.add(pass);

		request.onsucess = function (event) { resolve() }

		request.onerror = function(event) {
			reject(new Error("Error while addng password to the database, erro code: " + event.target.error));
		}
	});
}


/**
 * Encrypt content and add it to the password.
 * @method  Password#encrypt
 * @param  {String} content Content to be encrypted.
 * @param {Array<Key>} keys OpenPGP.js keys.
 * @return {Promise<Password>} Promise of password with encrypted content.
 */
Password.prototype.encrypt = function(content, keys) {
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
		}).catch((err) => reject(err));
	});
}


/*
 * Decrypt content of the password.
 * @method Password#decrypt
 * @return {Promise<String>} Promise of password content.
 */
Password.prototype.decrypt = function() {
	return new Promise( (resolve, reject) => {
		let options = {
			message: openpgp.message.read(this.content),
			privateKey: this.parent.getUnlockedPrivateKey(this.getKeyIds())
		};
		openpgp.decrypt(options).then( (cleartext) => {
			resolve(cleartext.data);
		}).catch((err) => reject(err));
	});
}

/**
 * @typedef {Object} KeyInfo
 * @property {Array<String>} users Id's of users.
 * @property {String} fingerprint Primary key fingerprint.
 */


/**
 * Get users and fingerprints of available decryption keys.
 * @method  Password#getAvailableKeysInfo
 * @return {Array<KeyInfo>} Users and fingerprints of all available decryption keys.
 */
Password.prototype.getAvailableKeysInfo = function() {
	let result = new Array();
	for (let key of this.parent.getKeysFor("private", this.getKeyIds())) {
		let users = new Array();
		for (let user of key.users) users.push(user.userId.userid);
		result.push({
			users: users,
			fingerprint: key.primaryKey.fingerprint
		});
	}

	return result;
}


/**
 * Returns 16-character key id's of the password.
 * @method  Password#getKeyIds
 * @return {String} - 16-character key id's for the password.
 */
Password.prototype.getKeyIds = function() {
	let keyIds = new Array();
	for (let id of openpgp.message.read(this.content).getEncryptionKeyIds()) {
		keyIds.push(id.toHex());
	}
	return keyIds;
}


/**
 * Reencrypt content of the password to the current id's.
 * @method  Password#reencryptTo
 * @param {Array<String>} ids Id's to reencrypt password to.
 * @return {Promise} If resolved, password was succesfully reencrypted to new keys.
 */
Password.prototype.reencryptTo = function(newKeys) {
	return new Promise((resolve, reject) => {
		this.decrypt().then( (content) => {
			this.encrypt(content, newKeys).then( () => {
				try {
					let git = this.getGit();
					let path = this.getPath().substr(1) + ".gpg";
					git.changeContent(path, this.content);
				}
				catch (err) { reject(err); }
				resolve(this);
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	});
}


/**
 * Copy password to destination directory.
 * @method Password#copy
 * @param  {Directory} destination - Destination directory where password should be copied.
 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
 * @param  {Boolean} [createDestination=false] - If destination directory doesn't exist, create it.
 * @return {Promise<Password>} Reference to the password in new destination.
 * @throws If password with same name in destination directory already exists, unless force is set to true.
 * @throws If destination directory doesn't exist, unless createDestination is set to true.
 */
Password.prototype.copy = function(destination, force = false) {
	return new Promise((resolve, reject) => {
		if (!force) destination.passwordNameCheck(this.name);

		try {
			let password = destination.getPassword(this.name);
			password.remove();
		}
		catch (err) {}

		let oldKeysIds = this.parent.getKeyIds();
		let newKeysIds = destination.getKeyIds();

		new Password(destination, this.name, this.content).then((passwordCopy) => {
			destination.passwords.push(passwordCopy);
			let path = passwordCopy.getPath().substr(1) + ".gpg";

			if (util.keysEqual(oldKeysIds, newKeysIds)) {
				try {
					let git = this.getGit();
					git.createFile(path, passwordCopy.content);
				}
				catch (err) { }
				resolve(this);
			}

			let newKeys = this.parent.getKeysFor("public", newKeysIds);

			passwordCopy.reencryptTo(newKeys).then((pass) => {
				try {
					let git = this.getGit();
					git.createFile(path, pass.content);
				}
				catch (err) { }
				resolve(pass);
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	})
}


/**
 * Move password to destination directory.
 * @method Password#move
 * @param  {Directory} destination - Destination directory where password should be moved.
 * @param  {Boolean} [force=false] - Overwrite password in destination if it already exists.
 * @return {Promise<Password>} Promise of password reencrypted to the corresponding keys of new directory.
 * @throws If password with same name in destination directory already exists, unless force is set to true.
 */
Password.prototype.move = function(destination, force = false) {
	return new Promise((resolve, reject) => {
		if (!force) destination.passwordNameCheck(this.name);

		try {
			let password = destination.getPassword(this.name);
			password.remove();
		}
		catch (err) {}

		let oldKeysIds = this.parent.getKeyIds();
		let newKeysIds = destination.getKeyIds();

		let oldPath = this.getPath().substr(1) + ".gpg";

		this.parent.removePassword(this.name);
		destination.passwords.push(this);
		this.parent = destination;

		if (util.keysEqual(oldKeysIds, newKeysIds)) {
			try {
				let git = this.getGit();
				let newPath = this.getPath().substr(1) + ".gpg";
				git.moveFile(oldPath, newPath);
			}
			catch (err) { }
			resolve(this);
		}

		let newKeys = this.parent.getKeysFor("public", newKeysIds);

		this.reencryptTo(newKeys).then( (pass) => {
			try {
				let git = this.getGit();
				let newPath = this.getPath().substr(1) + ".gpg";
				git.moveFile(oldPath, newPath);
			}
			catch (err) { }
			resolve(pass);
		}).catch((err) => reject(err));
	});
}


/**
 * Rename password.
 * @method Password#rename
 * @param  {String} name - New name of the password.
 * @return {Password} Reference to the renamed password.
 * @throws If password with same name already exist in directory.
 */
Password.prototype.rename = function(name) {
	try {
		let git = this.getGit();
		let path = this.getPath().substr(1) + ".gpg";
		git.renameFile(path, name + ".gpg");
	}
	catch (err) { }

	this.parent.passwordNameCheck(name);
	this.name = name;
	return this;
}


/**
 * Remove password.
 * @method  Password#remove
 */
Password.prototype.remove = function() {
	try {
		let git = this.getGit();
		let path = this.getPath().substr(1) + ".gpg";
		git.deleteFile(path);
	}
	catch (err) { }

	this.parent.removePassword(this.name);
	delete this;
}


/**
 * Get decrypted content of the password.
 * @method Password#getContent
 * @return {Promise<String>} Promise of the decrypted content of password.
 * @throws If no private key for this password exists in keyring.
 * @throws If no private key for this password is decrypted in UnlockedKeyring.
 */
Password.prototype.getContent = function() { return this.decrypt(); }


/**
 * Set content of the password. Content is automatically encrypted to the corresponding public keys of directory.
 * @method Password#setContent
 * @param {String} content - New content of the password.
 * @return {Promise<Password>} Promise of password with encrypted content.
 */
Password.prototype.setContent = function(content) {
	return new Promise((resolve, reject) => {
		let keys = this.parent.getKeysFor("public", this.getKeyIds());
		this.encrypt(content, keys).then( (pass) => {
			try {
				let git = this.getGit();
				let path = this.getPath().substring(1) + ".gpg";
				git.changeContent(path, pass.content);
			}
			catch (err) { }
			resolve(pass);
		})
	});
}


/**
 * Get path of the password.
 * @method Password#getPath
 * @return {String}   Path of the password.
 */
Password.prototype.getPath = function() {	return this.parent.getPath() + this.name; }


/**
 * Check whether private key for password is decrypted.
 * @method  Password#isDecryptable
 * @returns {Boolean} True if private key for password is decrypted in UnlockedKeyring.
 */
Password.prototype.isDecryptable = function() {
	try {
		this.parent.getUnlockedPrivateKey();
		return true;
	}
	catch (err) {
		return false;
	}
}


/**
 * Get git instance.
 * @method Password#getGit
 * @return {Interface<git>}   Object that implements git interface.
 */
Password.prototype.getGit = function() { return this.parent.getGit(); }


/**
 * Get directory containing password.
 * @method  Password#getDirectory
 * @return {Directory} Containing directory.
 */
Password.prototype.getDirectory = function() { return this.parent; }

module.exports = Password;