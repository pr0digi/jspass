JSPass
==========

JavaScript implementation of password store using OpenPGP.js.
This library is inspired by standard UNIX password manager pass and compatible with it. It supports git versioning and encrypting password both in node.js and in browser. Library implements functionality similiar to gpg daemon, so it can store decrypted private keys for user specified time.

[Documentation](https://doclets.io/pr0digi/jspass/master)

### Getting started

#### Npm
    npm install --save jspass


Alternatively, you can downlaod a minified build under [dist](https://github.com/pr0digi/jspass/tree/master/dist).


### Examples

In the next examples I will be using *co* library, but you can also use *.then()* method of Promise. Library uses Promises for all asynchronous operations.

#### Basic operations

```js
var JSPass = require("jspass");
var co = require("co");

var publicKey = "-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----";
var privateKey = "-----BEGIN PGP PRIVATE KEY BLOCK ... END PGP PRIVATE KEY BLOCK-----";

//create new store with name example, which will hold decrypted private keys for 10 seconds and store keys in LocalStorage
//Name of password store will be also prefix for saving in localStorage
var store = new JSPass(10, true, "example");

store.importKey(publicKey);
store.importKey(privateKey);

co(function* () {
  //set key ids for root directory
  yield store.setKeyIds("fingerprint-or-long-key")
  //you can add password directly on JSPass object, which will add password to the root directory
  yield store.addPassword("example", "exampleContent");

  var exampleDir = store.addDirectory("exampleDirectory");
  //you can also add directories recursively
  var anotherDir = exampleDir.addDirectoryRecursive("subDir/anotherDir/");
});

#### Working with git

```js
var JSPass = require("jspass");
var co = require("co");

var publicKey = "-----BEGIN PGP PUBLIC KEY BLOCK ... END PGP PUBLIC KEY BLOCK-----";
var privateKey = "-----BEGIN PGP PRIVATE KEY BLOCK ... END PGP PRIVATE KEY BLOCK-----";

var store = new JSPass(10, true, "example");

store.importKey(publicKey);
store.importKey(privateKey);

co(function* () {
  store.initGit("https://github.com/exampleUser/password-store"); //initialize git, password store currently supports GitHub
  store.git.setToken("auth-token") //set OAuth token, you can create one using JSPass with method JSPass.git.createAuthToken, see documentation

  yield store.clone();

  //do changes

  yield store.commit("Changes");
});