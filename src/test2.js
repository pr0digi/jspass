"use strict"

const openpgp = require("openpgp");

let publicKey =
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

let privateKey =
'-----BEGIN PGP PRIVATE KEY BLOCK-----\n' +
'Version: OpenPGP.js v2.5.1\n' +
'Comment: http://openpgpjs.org\n' +
'\n' +
'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\n' +
'HgpT3JUeDsCEKJULATlv1yCdxtU/fwizsg1n\n' +
'=dqVI\n' +
'-----END PGP PRIVATE KEY BLOCK-----';

let keyring = new openpgp.Keyring();
keyring.privateKeys.importKey(privateKey);

console.log(keyring.privateKeys.keys[0]);

keyring.privateKeys.keys[0].decrypt("password");

console.log(keyring.privateKeys.keys[0]);