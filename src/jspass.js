/**
 * JSPass module.
 */

"use strict";

var openpgp = require("openpgp");
var Directory = require("./directory");
var UnlockedKeyring = require("./unlocked-keyring");
var GithubAPI = require('./git/github-api');
var Password = require('./password');
var convertFiles = require("./util").convertFiles;

require('es6-promise/auto');

/**
 * Password store inspired by standard UNIX password manager pass.
 * Generated git repositories and archives can be reused with bash utitlity pass.
 * Generated password files extensions are automatically set to .gpg when store is saved.
 * @constructor
 * @class
 * @param {Boolean} [storeKeys=true] - Store keys in the LocalStore.
 * @param {String|Number} [unlockedKeyStoreTime=600] - Time for which decrypted private keys should be cahed. Defaults to 10 minutes.
 * @param {String} [name=jspass-] - Name for saving in the LocalStore and IndexedDB.
 * @return {JSPass} JSPass password store.
 */
function JSPass(unlockedKeyStoreTime = 600, storeKeys = true, name = "jspass-") {
  this.name = name;
  var localStore = new openpgp.Keyring.localstore(name);
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
 * @method  JSPass#setRepository
 * @param  {String} repoUrl   Repository URL.
 * @param  {String} userAgent User agent for calls to the github API.
 */
JSPass.prototype.setRepository = function(repoUrl, userAgent="jspass") {
  if (repoUrl.match("github.com")) this.git = new GithubAPI();
  else throw new Error("Unsupported git service.");

  this.git.setRepository(repoUrl, userAgent);
}


/**
 * Search for passwords with name containing regex pattern.
 * @method Directory#search
 * @param  {String} pattern - Pattern to search for.
 * @return {Array<Password>|null} Array with macthed password or null if no password has been found.
 */
JSPass.prototype.search = function(pattern, deep = true) {
  return this.root.search(pattern, deep);
}


/**
 * Set time, for which decrypted private keys should stay in memory.
 * @method  JSPass#setUnlockedTime
 * @param {Number} time Time, for which private keys should stay decrypted in memory.
 */
JSPass.prototype.setUnlockedTime = function(time) {
  this.unlockedKeyring.unlockedKeyStoreTime = time;
}


/**
 * Pull remote git repository and initialize store with contained passwords.
 * @method  JSPass#clone
 * @return {Promise} If succesfully resolved, password store is populated with passwords from repository.
 */
JSPass.prototype.clone = function() {
  return new Promise((resolve, reject) => {
    this.git.clone().then((files) => {
      files = convertFiles(files);
      var passwordPromises = new Array();
      for (let file of files) {
        if (file.path.endsWith(".gitattributes")) continue;

        file.path = file.path.split("/");
        var filename = file.path.pop();

        var directoryPath = file.path.join('/');
        if (directoryPath) directoryPath += "/";

        var parent;
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


/**
 * Commit and push changes in password store to git.
 * @method  JSPass#commit
 * @param  {String} message Commit message.
 * @return {Promise}        If succesfully resolved, changes were commited.
 */
JSPass.prototype.commit = function(message) { return this.git.commit(message); }


/**
 * Import ASCII armored key to the keyring. Key can be either public or private.
 * @method JSPass#importKey
 * @param {String|UInt8Array} armoredKey - Key to be imported into keyring.
 * @returns {null|Array<Error>} Null if key was imported, error otherwise.
 */
JSPass.prototype.importKey = function(armoredKey) {
  var key = openpgp.key.readArmored(armoredKey);
  if (key.err) return key.err;

  if (key.keys[0].isPublic()) {
    for (let keyItem of key.keys) this.keyring.publicKeys.push(keyItem);
  }
  else for (let keyItem of key.keys) this.keyring.privateKeys.push(keyItem);

  if (this.storeKeys) this.keyring.store();

  return null;
}

/**
 * Object with newly generated key.
 * @typedef {Object} Key
 * @property {String} privateKeyArmored Public key.
 * @property {String} publicKeyArmored Private key.
 */

/**
 * Generate new key pair
 * @method  JSPass#generateKey
 * @param  {Array<Id>} userIds    Array of ids for new key.
 * @param {String} Id.name Name
 * @param {String} Id.email E-mail.
 * @param  {String} passphrase Password for new key.
 * @param  {Number} numBits    Number of bits for the key.
 * @return {Promise<Key>}   Public and private key in armored ASCII form.
 */
JSPass.prototype.generateKey = function(userIds, passphrase, numBits) {
  var options = {
    userIds: userIds,
    numBits: numBits,
    passphrase: passphrase
  };

  return openpgp.generateKey(options);
}


/**
 * Decrypt private keys for given user id with password.
 * By default, key will stay decrypted for 10 minutes. Every time the key is used, timer is reset.
 * @method JSPass#decryptKey
 * @throws If id isn't in keyring.
 * @param {String} id - Fingerprint or long key id of the key to be decrypted.
 * @param {String} password - Password for the private key to be decrypted.
 * @returns {Boolean} True if key was decrypted, false otherwise.
 */
JSPass.prototype.decryptKey = function(id, password) {
  var key = this.keyring.privateKeys.getForId(id);
  if (key == null) throw new Error("ID isn't in keyring.");
  var armored = key.armor();

  var keyCopy = openpgp.key.readArmored(armored).keys[0];
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
JSPass.prototype.getKeyIds = function() { return this.root.getKeyIds(); }


/**
 * Set id's for root directory. All passwords will be reencrypted using new ids.
 * @method JSPass#setIds
 * @param {String|Array<String>} ids Fingerprint or long key id.
 * @throws If some id isn't in keyring.
 * @throws If no private key for containing password exists in keyring.
 * @throws If no private key for containing password is decrypted in unlocked keyring.
 * @return {Promise<Directory>} Promise of directory with all passwords reencrypted to new ids.
 */
JSPass.prototype.setKeyIds = function(keyIds) { return this.root.setKeyIds(keyIds); }


/**
 * Create IndexedDB with name set to password store name.
 * @method  JSPass#createDB
 * @return {Promise} If succesfully resolved, database was succesfuly opened or created.
 */
JSPass.prototype.createDB = function() {
  if (typeof window == "undefined") throw new Error("Databse is supported only in browser.");
  var dbPromise = new Promise((resolve, reject) => {
    var request = window.indexedDB.open(this.name, 1);

    request.onerror = function(event) {
      reject(new Error("Creating databse failed, error code: " + request.errorCode));
    }

    request.onupgradeneeded = function(event) {
      var db = event.target.result;

      var directories = db.createObjectStore("directories", {autoIncrement: true});
      directories.createIndex("parentPath", "parentPath", { unique: false });
      directories.createIndex("name", "name", { unique: false });
      directories.createIndex("ids", "ids", { unique: false });

      var passwords = db.createObjectStore("passwords", {autoIncrement: true});
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


/**
 * Store all passwords to IndexedDB. Method createDB must be called prior to this.
 * @method  JSPass#storeToDB
 * @return {Promise} If resolved, password store was succesfully saved to IndexedDB.
 */
JSPass.prototype.storeToDB = function() {
  return new Promise((resolve, reject) => {
    var transaction = this.database.transaction(["directories", "passwords"], "readwrite");

    transaction.oncomplete = function(event) {
      resolve();
    }

    transaction.onerror = function(event) {
      reject(new Error("Error while saving passwords to the to database."));
    }

    var directories = transaction.objectStore("directories");
    var passwords = transaction.objectStore("passwords");
    this.root.storeToDB(directories, passwords).then(() => resolve()).catch((err) => reject(err));
  });
}


/**
 * Load passwords from IndexedDB. CreateDB must be called prior to this.
 * @method  JSPass#loadFromDB
 * @return {Promise} If resolved, passwords were succesfully loaded into store.
 */
JSPass.prototype.loadFromDB = function() {
  return new Promise((resolve, reject) => {
    var transaction = this.database.transaction(["directories", "passwords"]);

    var directories = new Array();
    var directoriesStore = transaction.objectStore("directories");
    directoriesStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        directories.push(cursor.value);
        cursor.continue();
      }
    }

    var passwords = new Array();
    var passwordsStore = transaction.objectStore("passwords");
    passwordsStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        passwords.push(cursor.value);
        cursor.continue();
      }
    }

    var rootDir = this.root;
    transaction.oncomplete = function(event) {
      rootDir.loadFromDB(directories, passwords).then(() => resolve()).catch((err) => reject(err));
    }

    transaction.onerror = function(event) {
      reject(new Error("Cannot load directories and passwords from database."));
    }
  });
}


/**
 * Delete IndexedDB.
 * @method  JSPass#deleteDB
 * @return {Promise} If resolved, IndexedDB was removed.
 */
JSPass.prototype.deleteDB = function() {
  return new Promise((resolve, reject) => {
    var request = window.indexedDB.deleteDatabase(this.name);

    request.onsuccess = function(event) { resolve() }

    request.onerror = function(event) { reject(new Error("Cannot delete database.")) }
  });
}


/**
 * Insert password in the password store. If path doesn't exist, it is created.
 * @method JSPass#insertPassword
 * @throws If store path wasn't previously initialized.
 * @throws If path doesn't exist.
 * @param {String} path - Path of insertion.
 * @param {String} name - Name of the password.
 * @param {String} content - Content of the password.
 * @returns {Promise<Password>} - Password if store was previously initialized.
 */
JSPass.prototype.insertPasswordByPath = function(destination, name, content) {
  var destinationDir = this.root.addDirectoryRecursive(destination.substring(1));
  return destinationDir.addPassword(name, content);
}


/**
 * Get password object from the store.
 * @method JSPass#getPasswordByPath
 * @throws If password doesn't exist.
 * @param {String} path - Path of the password starting with "/" and ending with password name.
 * @returns {Password} Password if it exists.
 */
JSPass.prototype.getPasswordByPath = function(path) {
  path = path.split("/").slice(1);
  var currentDir = this.root;

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
JSPass.prototype.getDirectoryByPath = function(path) {
  path = path.split("/").slice(1);
  if (path[path.length - 1] == '') path.pop();

  var currentDir = this.root;
  while (path.length) currentDir = currentDir.getDirectory(path.shift());

  return currentDir;
}


/**
 * Get password or directory with specified path.
 * @method  JSPass#getItemByPath
 * @param  {String} path Path of directory or password. If path ends with "/", it's always treated as directory.
 * @throws If neither password nor directory with path exists.
 * @return {Directory|Password} Password or directory with specified path.
 */
JSPass.prototype.getItemByPath = function(path) {
  var item;
  if (!path.endsWith("/")) {
    try { item = this.getPasswordByPath(path); }
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
 * @method JSPass#removeItemByPath
 * @throws If path doesn't exist.
 * @param {String} path - Path of the file or folder.
 */
JSPass.prototype.removeItemByPath = function(path) {
  var item = this.getItemByPath(path);
  item.remove();
}


/**
 * Add password to store. Password is automatically encrypted to the corresponding keys of directory.
 * @method Directory#addPassword
 * @param {String} name - Name of the password.
 * @param {String} content - Content of the password.
 * @throws If password with same name already exists in direcotry.
 * @return {Promise<Password>} Promise of new password.
 */
JSPass.prototype.addPassword = function(name, content) { return this.root.addPassword(name, content); }


/**
 * Get password from root directory.
 * @method JSPass#getPassword
 * @param {String} name Name of the password.
 * @return {Password} Password with specified name.
 * @throws If password with specified name doesnt exist.
 */
JSPass.prototype.getPassword = function(name) { return this.root.getPassword(name); }


/**
 * Add new directory to the root.
 * @method Directory#addDirectory
 * @param {String} name Name of the enw directory.
 * @return {Directory} Newly created directory.
 */
JSPass.prototype.addDirectory = function(name) { return this.root.addDirectory(name); }


/**
 * Adds new directory recursively.
 * @method  JSPass#addDirectoryRecursive
 * @param {String} path Relative path of the new directory.
 * @return {Directory} Newly created directory.
 */
JSPass.prototype.addDirectoryRecursive = function(path) { return this.root.addDirectoryRecursive(path); }


/**
 * Get directory with specified name from root directory.
 * @method Directory#getDirectory
 * @param  {String} name Name of the directory to return.
 * @return {Directory} Directory with specified name.
 * @throws If directory with specified name doesn't exist.
 */
JSPass.prototype.getDirectory = function(name) { return this.root.getDirectory(name); }


/**
 * Get root directory of the store.
 * @method  JSPass#getRoot
 * @return {Directory} Root directory.
 */
JSPass.prototype.getRoot = function() { return this.root; }


/**
 * Move/rename file or directory. Paths are treated similarly to core-utils mv.
 * @method JSPass#move
 * @throws If destination already exists, unless force is set to true.
 * @throws If source doesn't exist.
 * @param {String} source - Source directory or file.
 * If source ends with /, it is treated as directory.
 * If directory and file in source has same name and path doesn't end with /, move file.
 * @param {String} destination - Destination directory.
 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
 * @returns {Promise<Directory|Password>} Promise of moved directory or password reencrypted to the corresponding keys of new location.
 */
JSPass.prototype.move = function(source, destination, force = false) {
  var sourceItem = this.getItemByPath(source);
  var destinationDir = this.root.addDirectoryRecursive(destination.substring(1));

  return new Promise((resolve, reject) => {
    sourceItem.move(destinationDir, force).then( (item) => {
      resolve(item);
    });
  });
}


/**
 * Copy file or directory. Paths are treated similarly to core-utils cp.
 * @method JSPass#copy
 * @throws If destination already exist, unless force is set to true.
 * @throws If source doesn't exist.
 * @param {String} source - Source directory or file.
 * If source ends with /, it is treated as directory.
 * If directory and file in source has same name and path doesn't end with /, move file.
 * @param {String} destination - Destination directory.
 * @param {Boolean} [force=false] - Overwrite destination if it already exists.
 * @returns {Directory|Password} Reference to the copied firectory or password.
 */
JSPass.prototype.copy = function(source, destination, force = false) {
  var sourceItem = this.getItemByPath(source);
  var destinationDir = this.root.addDirectoryRecursive(destination.substring(1));

  return new Promise((resolve, reject) => {
    sourceItem.copy(destinationDir, force).then( (item) => {
      resolve(item);
    });
  });
}

module.exports = JSPass;