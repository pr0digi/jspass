"use strict"

/**
 * GithubAPI module
 */


var mergeTrees = require("../util").mergeTrees;


/**
 * Prototype representing API to save and retrieve files from github.
 * @constructor
 * @class
 * @return {GithubAPI} New GithubAPI.
 */
function GithubAPI() {
	this.hostname = "api.github.com";
}

if (typeof window == 'undefined') {
	const https = require("https");
	GithubAPI.prototype.makeRequest = function(options, data) {
		return new Promise((resolve, reject) => {
			options.hostname = this.hostname;
			options.headers = { 'User-Agent': this.userAgent };

			if (this.authToken) options.headers.Authorization = 'token ' + this.authToken;

			const request = https.request(options, (response) => {
				let body = "";
				response.on("data", (chunk) => body += chunk);
				response.on("end", () => {
					if (response.statusCode < 200 || response.statusCode > 299) {
						reject(new Error('Failed to load page, status code: ' + response.statusCode + ' ' + response.statusMessage + "\n" + body));
					}
					resolve(JSON.parse(body));
				});
			});

			request.on("error", (err) => reject(err));

			if (data) request.write(JSON.stringify(data));
			request.end();
		});
	}
}
else if (typeof window != "undefined") {
	GithubAPI.prototype.makeRequest = function(options, data) {
		return new Promise((resolve, reject) => {
			const request = new XMLHttpRequest();
			if (!options.path.startsWith("https://")) options.path = "https://" + this.hostname + options.path;
			request.open(options.method, options.path, true);
			if (options.auth) request.setRequestHeader("Authorization", "Basic " + btoa(options.auth));
			if (this.authToken) request.setRequestHeader("Authorization", "token " + this.authToken);

			request.onload = function() {
				if (request.readyState === 4) {
					if (request.status < 200 || request.status > 299) {
						reject(new Error('Failed to load page, status code: ' + request.status + ' ' + request.statusText + "\n" + request.response));
					}
					resolve(JSON.parse(request.response));
				}
			}

			request.onerror = function() {
				reject(new Error("Error while connecting to GitHub API."));
			}

			if (data) request.send(JSON.stringify(data));
			else request.send();
		});
	}
}
else { throw new Error("Unsupported platform."); }


/**
 * Create new authorization token.
 * @method GithubAPI#createAuthorizationToken
 * @param {Array<String>} options.scopes A list of scopes that this authorization is in.
 * @param {String} options.note A note to remind you what the OAuth token is for.
 * @param {String} [options.note_url] A URL to remind you what app the OAuth token is for.
 * @param {String} options.client_id The 20 character OAuth app client key for which to create the token.
 * @param {String} options.client_secret The 40 character OAuth app client secret for which to create the token.
 * @param {String} [options.fingerprint] A unique string to distinguish an authorization from others created for the same client ID and user.
 * @param {String} username Github username.
 * @param {String} password Github password.
 * @return {Promise<String>} New github auhtorization token.
 */
GithubAPI.prototype.createAuthToken = function(options, username, password) {
	const requestOptions = {
		path: '/authorizations',
		method: 'POST',
		auth: username + ':' + password
	}
	return new Promise((resolve, reject) => {
		this.makeRequest(requestOptions, options).then((body) => {
			resolve(body.token);
		}).catch((err) => reject(err));
	});
}


/**
 * Set github authorization token.
 * @method  GithubAPI#setToken
 * @param {String} token Github authorization token.
 */
GithubAPI.prototype.setToken = function(token) { this.authToken = token; }


/**
 * Set repository url and user agent.
 * @param {String} url       URL of the repository.
 * @param {String} userAgent User agent to use for request.
 */
GithubAPI.prototype.setRepository = function(url, userAgent) {
	let match = /(?:https:\/\/)?(?:www\.)?github.com\/([^\/]+)\/(.+)/.exec(url);
	if (!match) throw new Error("Invalid repository URL.");
	this.username = match[1];
	this.repoName = match[2];

	this.userAgent = userAgent;
}


/**
 * Download last commit and tree
 * @method  GithubAPI#getLastCommitAndTree
 * @return {Promise} If resolved, last commit and tree were succesfully downloaded.
 */
GithubAPI.prototype.getLastCommitAndTree = function() {
	return new Promise((resolve, reject) => {
		let options = {
			path: '/repos/' + this.username + '/' + this.repoName + '/git/refs/heads/master',
			method: 'GET'
		}

		this.makeRequest(options).then((response) => {
			options.path = response.object.url;
			this.makeRequest(options).then((response) => {
				var lastCommit = response;
				options.path = response.tree.url + '?recursive=1';
				this.makeRequest(options).then((response) => {
					//this.lastCommit = lastCommit;
					//this.currentTree = response;
					if (response.truncated) reject(new Error("Tree is truncated."));
					resolve({commit: lastCommit, tree: response});
				}).catch((err) => reject(err));
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	});
}


/**
 * Get file from local tree by its path.
 * @method  GithubAPI#getFileByPath
 * @param  {String} path Path of the file.
 * @return {Object}      File requested.
 */
GithubAPI.prototype.getFileByPath = function(path) {
	for (let file of this.currentTree.tree) {
		if (file.path == path) return file;
	}
	throw new Error("File not found.");
}


/**
 * Get file from local tree by its index.
 * @method  GithubAPI#getFileByIndex
 * @param  {String} path Path of the file.
 * @return {Number}      Index of the file.
 */
GithubAPI.prototype.getFileIndex = function(path) {
	for (let index=0; index<this.currentTree.tree.length; index++) {
		if (this.currentTree.tree[index].path == path) { return index };
	}
}


/**
 * Create file in local tree.
 * @method  GithubAPI#createFile
 * @param  {String} path    Path of the file.
 * @param  {String} content Content of the file.
 */
GithubAPI.prototype.createFile = function(path, content) {
	try { this.getFileByPath(path); }
	catch (err) {}

	let file = {
		path: path,
		mode: '100644',
		type: 'blob',
		modified: true,
		action: "create"
	}

	if (path.endsWith(".gpg")) {
		if (typeof window == "undefined") content = Buffer(content).toString("base64");
		else content = btoa(String.fromCharCode.apply(null, content));
		file.encoding = "base64";
	}

	file.content = content;
	this.currentTree.tree.push(file);
}


/**
 * Delete file from local tree.
 * @method  GithubAPI#deleteFile
 * @param  {String} path Path of the file.
 */
GithubAPI.prototype.deleteFile = function(path) {
	let file = this.getFileByPath(path);

	file.modified = true;
	file.action = "delete";
}


/**
 * Change content of a file in local tree.
 * @method  GithubAPI#changeContent
 * @param  {String} path    Path of the file.
 * @param  {String} content New content of the file.
 */
GithubAPI.prototype.changeContent = function(path, content) {
	let file = this.getFileByPath(path);

	if ('sha' in file) delete file.sha;
	if (path.endsWith(".gpg")) {
		if (typeof window == "undefined") file.content = Buffer(content).toString("base64");
		else file.content = btoa(String.fromCharCode.apply(null, content));
		file.encoding = "base64";
	}
	else file.content = content;

	file.modified = true;
	file.action = "changeContent";
}


/**
 * Rename file in the local tree.
 * @method  GithubAPI#renameFile
 * @param  {String} path    Path of the file.
 * @param  {String} newName New name of the file.
 */
GithubAPI.prototype.renameFile = function(path, newName) {
	let file = this.getFileByPath(path);
	path = path.split('/');
	path[path.length-1] = newName;
	file.newPath = path.join('/');

	file.modified = true;
	file.action = "move";
}


/**
 * Move file in the local tree.
 * @method  GithubAPI#moveFile
 * @param  {String} currentPath Current path of the file.
 * @param  {String} newPath New path of the file.
 */
GithubAPI.prototype.moveFile = function(currentPath, newPath) {
	let file = this.getFileByPath(currentPath);
	file.newPath = newPath;

	file.modified = true;
	file.action = "move";
}


/**
 * Copy file in local tree.
 * @method  GithubAPI#copyFile
 * @param  {String} filePath Path of the file.
 * @param  {String} copyPath Path where file should be copied.
 */
GithubAPI.prototype.copyFile = function(filePath, copyPath) {
	let file = this.getFileByPath(filePath);
	this.currentTree.tree.push({
		path: copyPath,
		mode: file.mode,
		type: file.type,
		sha: file.sha,
		modified: true,
		action: "create"
	});
}


/**
 * Create BLOBs from edited files in remote repository.
 * Update local file with their new sha.
 * @method  GithubAPI#createBlobs
 * @return {Promise} If resolved, blobs were created succesfully for all files.
 */
GithubAPI.prototype.createBlobs = function() {
	return new Promise((resolve, reject) => {
		let changedFiles = new Array();
		let promises = new Array();

		for (let file of this.currentTree.tree) {
			if (typeof file.encoding != "undefined" && file.encoding == 'base64') {
				changedFiles.push(file);
				let options = {
					method: "POST",
					path: "/repos/" + this.username + "/" + this.repoName + "/git/blobs"
				};

				let data = {
					content: file.content,
					encoding: "base64"
				};

				promises.push(this.makeRequest(options, data));
			}
		}

		Promise.all(promises).then((hashes) => {
			for (let i=0; i<changedFiles.length; i++) {
				delete changedFiles[i].content;
				delete changedFiles[i].encoding;
				changedFiles[i].sha = hashes[i].sha;
			}
			resolve();
		}).catch((err) => reject());
	});
}


/**
 * Create new tree in remote repository with contents of local tree.
 * Update local tree with its new sha.
 * @method  GithubAPI#createTree
 * @return {Promise} If resolved, tree was succesfully created.
 */
GithubAPI.prototype.createTree = function() {
	return new Promise((resolve, reject) => {
		this.createBlobs().then(() => {
			if (!this.currentTree) reject();

			const options = {
				path: "/repos/" + this.username + "/" + this.repoName + "/git/trees",
				method: "POST"
			};

			const data = {
				tree: this.currentTree.tree
			}

			this.makeRequest(options, data).then((response) => {
				this.currentTree.sha = response.sha;
				resolve();
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	});
}


/**
 * Create new commit in remote repository and set it as master.
 * @method  GithubAPI#commit
 * @param  {String} message Commit message.
 * @return {Promise}        If resolved, commit was succesfully pushed into remote repository
 *                          and reference to the master branch was updated.
 */
GithubAPI.prototype.commit = function(message) {
	return new Promise((resolve, reject) => {
		if (!this.currentTree || !this.lastCommit) reject(new Error("Last tree or commit unavailable."));

		this.getLastCommitAndTree().then((response) => {

			mergeTrees(response.tree, this.currentTree);

			this.cleanTree();
			this.createTree().then( () => {
				let options = {
					path: '/repos/' + this.username + '/' + this.repoName + '/git/commits',
					method: 'POST'
				};

				let data = {
					message: message,
					tree: this.currentTree.sha,
					parents: [response.commit.sha]
				}

				this.makeRequest(options, data).then((response) => {
					let lastCommit = response;

					options = {
						path: '/repos/' + this.username + '/' + this.repoName + '/git/refs/heads/master',
						method: "PATCH"
					}

					data = { sha: lastCommit.sha }

					this.makeRequest(options, data).then((response) => {
						this.lastCommit = lastCommit;
						resolve();
					}).catch((err) => reject(err));
				}).catch((err) => reject(err));
			}).catch((err) => reject(err));
		})
	});
}

/**
 * Get all files from github repository and create local tree from them.
 * @method  GithubAPI#clone
 * @return {Promise<Array<Object>>} Returns promise of array with all files from repository.
 *                                  This object needs to have two properties, path and content.
 */
GithubAPI.prototype.clone = function() {
	return new Promise((resolve, reject) => {
		this.getLastCommitAndTree().then((response) => {
			this.lastCommit = response.commit;
			this.currentTree = response.tree;
			if (!this.currentTree) reject(new Error('No tree available.'));
			this.cleanTree();
			let promises = [];

			for (let file of this.currentTree.tree) {
				promises.push(this.getFileContent(file.sha))
			}

			Promise.all(promises).then((response) => {
				let files = new Array();
				for (let i=0; i<this.currentTree.tree.length; i++) {
					files.push({
						path: this.currentTree.tree[i].path,
						content: response[i].content
					});
				}
				resolve(files);
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	});
}


/**
 * Get contents of the file from remote repository by its sha.
 * @method  GithubAPI#getFileContent
 * @param  {String} sha SHA of the file requested.
 * @return {Promise<Object>}     Object with file contents.
 */
GithubAPI.prototype.getFileContent = function(sha) {
	return new Promise((resolve, reject) => {
		const options = {
			path: '/repos/' + this.username + '/' + this.repoName + '/git/blobs/' + sha,
			method: 'GET'
		};

		this.makeRequest(options).then((response) => {
			resolve(response);
		}).catch((err) => reject(err));
	});
}


/**
 * Delete size and url properties from local tree objects.
 * Also remove subtrees, this is due to the fact
 * that subdirectory doesn't update while there's old tree reference.
 * @method  GithubAPI#cleanTree
 */
GithubAPI.prototype.cleanTree = function() {
  this.currentTree.tree = this.currentTree.tree.filter((item) => { return item.action != "delete" });

	for (let item of this.currentTree.tree) {
    if (item.modified) {
      if (item.action == "create") {
        delete item.modified;
        delete item.action;
      }
      else if (item.action == "move") {
        item.path = item.newpath;
        delete item.newPath;
        delete item.modified;
        delete item.action;
      }
    }
		if ('size' in item) delete item.size;
		delete item.url;
	}

	this.currentTree.tree = this.currentTree.tree.filter((item) => { return item.type != 'tree'; });
}

module.exports = GithubAPI;