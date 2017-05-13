"use strict"

/**
 * Util module
 * @module  util
 */


/**
 * Check if arrays of key ids match.
 * @param  {Array<String>} keys1 Array of key ids.
 * @param  {Array<String>} keys2 Array of key ids.
 * @return {Boolean}      True if keys match.
 */
function keysEqual(keys1, keys2) {
	if (keys1.length != keys2.length) return false;

	for (let i=0; i<keys1.length; i++) {
		if (keys1[i] != keys2[i]) return false;
	}

	return true;
}


/**
 * Convert files returned from git in Base64 to UInt8Array or String.
 * @param  {Array<Object>} files Array of files returned from git.
 * @return {Array<Object>} Array of converted files.
 */
function convertFiles(files) {
  for (let file of files) {
    if (file.path.endsWith('.gpg')) {
      if (typeof window == 'undefined') {
        let buffer = Buffer(file.content, 'base64');

        file.content = new Uint8Array(buffer);
      }
      else {
        let buffer = atob(file.content);
        file.content = new Uint8Array(buffer.length);
        for (let i=0; i<buffer.length; i++) {
          file.content[i] = buffer.charCodeAt(i);
        }
      }
    }
    else {
      if (typeof window == "undefined") {
        file.content = Buffer(file.content, 'base64').toString();
      }
      else {
        file.content = atob(file.content);
      }
    }
  }
  return files;
}

module.exports = {keysEqual, convertFiles};