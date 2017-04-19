"use strict"

const fs = require("fs");
const openpgp = require("openpgp");


let options = {
	userIds: [{name: 'Example User 2', email: "example@user2.com"}],
	numBits: 1024,
	passphrase: 'password'
};

openpgp.generateKey(options).then( (key) => {
	fs.writeFileSync("public.txt", key.publicKeyArmored);
	fs.writeFileSync("private.txt", key.privateKeyArmored);
});