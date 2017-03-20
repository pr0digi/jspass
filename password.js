"use strict"

/**
 * Password module.
 * @module password
 */

/**
 * @class
 * Class representing password. Password content is encrypted using OpenPGP.js library.
 * Password is automatically encrypted for user ids of containing directory.
 * @constructs Password
 */
export default class Password {
	/**
	 * Create new password.
	 * @param {Directory} parent - Reference to containing directory.
	 * @param {String} content - Content of the password.
	 */
	constructor(parent, content) {}
}