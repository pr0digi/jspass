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

	for (var i=0; i<keys1.length; i++) {
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
  for (var file of files) {
    if (file.path.endsWith('.gpg')) {
      if (typeof window == 'undefined') {
        var buffer = Buffer(file.content, 'base64');

        file.content = new Uint8Array(buffer);
      }
      else {
        var buffer = atob(file.content);
        file.content = new Uint8Array(buffer.length);
        for (var i=0; i<buffer.length; i++) {
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

function mergeTrees(currentTree, newTree) {
  if (currentTree.sha == newTree.sha) return;
  for (var file of newTree.tree) {
    let index = currentTree.tree.findIndex((item) => { return file.path == item.path });
    if (file.modified) {
      if (index) currentTree.tree.splice(index, 1);
    }
    else if (index == -1) {
      file.modified = true;
      file.action = "delete";
    }
    else file.sha = currentTree.tree[index].sha;
  }
}

module.exports = {keysEqual, convertFiles, mergeTrees};