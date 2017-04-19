"use strict"

const JSPass = require("./jspass");
const openpgp = require("openpgp");
const assert = require("assert");
const co = require("co");

let publicKey =
'-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
'Version: OpenPGP.js v2.5.1\n' +
'Comment: http://openpgpjs.org\n' +
'\n' +
'xsBNBFj2B2QBB/90fHCxRpSvl6rqTIIur/7PPfTheSbIRtpA3jr+TMjmQtGf\n' +
'JlMOBgQoWKGrcUzHXroiJ/tDFLe7zLSae5wsfWlzP+/rx8ihpHE5RnIVMCKM\n' +
'24Fb9d0UBbc1q3Ah9U4K1Dlost7PXk8Yb89ps6lH0Y6zRT3Fkkq2TuNf8WkM\n' +
'Dim3g/BU5KpphLl6CL6yxMb6heOXgKDlapzghCvyr2fnROYT3g8znbif5TnH\n' +
'Ay/vKE8txZyUp+CobEcwmZklA0oGTUmA12+huFrxtj4U2RVwvolyKrOT468y\n' +
'OsBRM1Rl/PIqcARLdPFs1gkYO07O5aWLoFnO1IS394CYzYb429UNAT15ABEB\n' +
'AAHNH0V4YW1wbGUgdXNlciA8ZXhhbXBsZUB1c2VyLmNvbT7CwHUEEAEIACkF\n' +
'Alj2B3IGCwkHCAMCCRCf4qtjHfQTjQQVCAoCAxYCAQIZAQIbAwIeAQAAxfgH\n' +
'/RXmgdr1QSgqmI3McBOwM9ve08ckbKa3IzkBgdqjaYo9k7s60KF8HY8lyVsg\n' +
'WV60DKflbtX5Bw+6c+kM16wBGQ713p9t2HWT3hZj9rdMcm7XKYslXMM/4O6E\n' +
'7mZNJ25PB3O/7SbjYu2gpP3Vmq/kN0yyZwVRAYWnzealrQOj93+ls4k0zXKp\n' +
'qLvtqfwkQjWzpLQKECHEhVJ9rccDUdS0gjW/DU3zBxa3wXY3H7XHsnrBQOlj\n' +
'wHrFNGavW4AWel6xm3/wJrZ5qb3ABE5uUVjblaervLBig2eilLCfm/jReD59\n' +
'LAbsB84gOUZul1porXt1Z0gTIIWtYhRoEi+ma/kTjHnOwE0EWPYHagEH/1ml\n' +
'syZ01QjQLvfjjXndiMn1fZQlGxmjT4udPqWPO51mJrFBR8HF8snh9HASOZOA\n' +
'wdJVV3EL73O+Al3aSX/DUqI33XYI/WQ/dTeCiTzhq/am1IJS8QximgDShm02\n' +
'LeN0UTZnQlqlNUhkzXBYc0dnUvRad/Pvg84b1kvg4uX4C/2qh2+fOe0V+Ch0\n' +
'IawHhWscnN1TpxUnmSiTXwH3MSZztBnIjB2iToSH+4fCO/YBU6hNHRiSpDCb\n' +
'4kE2Be/ZCU0uFkFYQxDJBk8ALmFS+L/lrx3Xj40nIYYamZsr2ZPsVxs4OaOP\n' +
'dCLlqbL6L3krtK6t2y6aBeWsoDQED6wUvoGFtMkAEQEAAcLAXwQYAQgAEwUC\n' +
'WPYHcgkQn+KrYx30E40CGwwAAHDaB/oDWp8jCowtuBXrGP2tIqAnCqBnorsJ\n' +
'mGufScMUHNBA8JpvrVkYAxPQH6YItgC2ku2o+1N0CHZt7NwDa3x+RVG/KKWl\n' +
'Lj7BxXaZbE43B9GBd+quyqWn88MZfnRKiCdOlnNHs7bV1Z6WeeT+k+aEkjv/\n' +
'4E0Kj5njxaTEGN560z///0kY026XJpqf7CKCggY74H6BFTzRtnHrkepxR9hk\n' +
'WrPVz1Um6LiuJ0SQU9ZkPktMKK4hF+KdWEVr2STHZ/iX4nC51kQjW9Mm+Tl2\n' +
'YGCMfHxPL1rhoXokraY0mQDn4dYAU4qDr2RuecsqYFOT4na7m1kbe8QncD6+\n' +
'+tKGqiVaO5dS\n' +
'=eVny\n' +
'-----END PGP PUBLIC KEY BLOCK-----\n';

let privateKey =
'-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
'Version: OpenPGP.js v2.5.1\n' +
'Comment: http://openpgpjs.org\n' +
'\n' +
'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\n' +
'hqolWjuXUg==\n' +
'=wZHT\n' +
'-----END PGP PRIVATE KEY BLOCK-----\n';

let publicKey2 =
'-----BEGIN PGP PUBLIC KEY BLOCK-----\n' +
'Version: OpenPGP.js v2.5.1\n' +
'Comment: http://openpgpjs.org\n' +
'\n' +
'xo0EWPZPWwED/0ew5O9XQrsUGG5WTWYJ7EpCRG4aoSzi1JycCfEIm6mDo8BM\n' +
'paMeVFiU/Xyj6UbBVengMlFdChpeWzvpwgypKzjt2SfG+8XpkcaiA3RqB0x3\n' +
'bKYoQV2HKZ4dkcDmNMDQid8/eUWeRLNT+qI/nkVPm0GFiVTTIb6MPXk0v8Uu\n' +
'btXdABEBAAHNIkV4YW1wbGUgVXNlciAyIDxleGFtcGxlQHVzZXIyLmNvbT7C\n' +
'tQQQAQgAKQUCWPZPXQYLCQcIAwIJEAHimqO1WA2YBBUICgIDFgIBAhkBAhsD\n' +
'Ah4BAADrFgP+NDWReEaYqBRgF7UjIs/fWqU2K8AkAGiW9Gd+I/seWiqbJ/Dp\n' +
'Jw40Tju6d1gYIE2jWJA/wJBLrCIrBgctLnSFSmpA6ulb4wkF1DQfEYveNmaq\n' +
'OqJkS2srxWmd7skMyi+nLvI0+7/8art1C+MriABJprdOlNb27CTn4ovJoGfx\n' +
'T2fOjQRY9k9cAQQAtV+34vlPqC5YUTcHqvn65gE6TJwgUHDCC9o87MDxx6lF\n' +
'CgZwHFZYYo+EUJzaO66sNh2qHkUY1vjQnES5tm8RK3+a1+ba7Ain2MJba9Bk\n' +
'/RiZLiaZ/pxAUSNJWBt7prnVLlNuK4uMaLZvrJSk33qRmbvCH8U4f9IoEE7u\n' +
'BX5YLrcAEQEAAcKfBBgBCAATBQJY9k9dCRAB4pqjtVgNmAIbDAAASbED/iIC\n' +
'XD4q8TtYeGAINmwDidia8Pjf9YGIwUFVojoJwIrroeYH4iGT7o1LSpf4OVzF\n' +
'UeeTqcB6FRiiX25oqYHjPpGdc5ueJlUNXqAymxTtjlfejoqALs2wwNnPYnSb\n' +
'/Ijuf7DMOVuNHgpT3JUeDsCEKJULATlv1yCdxtU/fwizsg1n\n' +
'=W2IK\n' +
'-----END PGP PUBLIC KEY BLOCK-----';

let privateKey2 =
'-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
'Version: OpenPGP.js v2.5.1\n' +
'Comment: http://openpgpjs.org\n' +
'\n' +
'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\n' +
'HgpT3JUeDsCEKJULATlv1yCdxtU/fwizsg1n\n' +
'=dqVI\n' +
'-----END PGP PRIVATE KEY BLOCK-----';

let store = new JSPass(1);

store.importKey(privateKey);
store.importKey(publicKey);

store.importKey(privateKey2);
store.importKey(publicKey2);

//test if keys were succesfully imported
assert(store.keyring.privateKeys.keys.length == 2);
assert(store.keyring.publicKeys.keys.length == 2);

//test key decryption
assert(store.decryptKey("9fe2ab631df4138d", "password"));
assert(store.decryptKey("5784750dd428d5e0dc4297d001e29aa3b5580d98", "password"));

co(function* () {
	yield store.setKeyIds(["9fe2ab631df4138d", "5784750dd428d5e0dc4297d001e29aa3b5580d98"]);
	yield store.addPassword("example", "example");
	yield store.addPassword("example", "example");
	store.addDirectory("/abc/def");
})
