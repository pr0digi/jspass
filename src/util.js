"use strict"

/**
 * Util module
 */

exports.keysEqual = function (keys1, keys2) {
	if (keys1.length != keys2.length) return false;

	for (let i=0; i<keys1.length; i++) {
		if (keys1[i] != keys2[i]) return false;
	}

	return true;
}