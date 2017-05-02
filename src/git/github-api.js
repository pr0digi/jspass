"use strict"

function GithubAPI(userAgent) {
	this.hostname = "api.github.com";
	this.userAgent = userAgent;
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
else {
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
GithubAPI.prototype.createAuthorizationToken = function(options, username, password) {
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


GithubAPI.prototype.setRepository = function(url) {
	let match = /(?:https:\/\/)?(?:www\.)?github.com\/([^\/]+)\/(.+)/.exec(url);
	if (!match) throw new Error("Invalid repository URL.");
	this.username = match[1];
	this.repoName = match[2];
}


GithubAPI.prototype.getLastCommitAndTree = function() {
	return new Promise((resolve, reject) => {
		let options = {
			path: '/repos/' + this.username + '/' + this.repoName + '/git/refs/heads/master',
			method: 'GET'
		}

		this.makeRequest(options).then((response) => {
			options.path = response.object.url;
			this.makeRequest(options).then((response) => {
				const lastCommit = response;
				options.path = response.tree.url + '?recursive=1';
				this.makeRequest(options).then((response) => {
					this.lastCommit = lastCommit;
					this.currentTree = response;
					if (response.truncated) reject(new Error("Tree is truncated."));
					resolve();
				}).catch((err) => reject(err));
			}).catch((err) => reject(err));
		}).catch((err) => reject(err));
	});
}


GithubAPI.prototype.getFileByPath = function(path) {
	for (let file of this.currentTree.tree) {
		if (file.path == path) return file;
	}
	throw new Error("File not found.");
}


GithubAPI.prototype.getFileIndex = function(path) {
	for (let index=0; index<this.currentTree.tree.length; index++) {
		if (this.currentTree.tree[index].path == path) { return index };
	}
}


GithubAPI.prototype.createFile = function(path, content) {
	try { this.getFileByPath(path); }
	catch (err) {}

	let file = {
		path: path,
		mode: '100644',
		type: 'blob'
	}

	if (path.endsWith(".gpg")) {
		if (typeof window == "undefined") content = Buffer(content).toString("base64");
		else content = btoa(String.fromCharCode.apply(null, content));
		file.encoding = "base64";
	}

	file.content = content;
	this.currentTree.tree.push(file);
}


GithubAPI.prototype.deleteFile = function(path) {
	let index = this.getFileIndex(path);

	if (typeof index == "undefined") throw new Error("File with specified path doesn't exist.");

	this.currentTree.tree.splice(index, 1);
}


GithubAPI.prototype.changeContent = function(path, content) {
	let file = this.getFileByPath(path);

	if ('sha' in file) delete file.sha;
	if (typeof window == "undefined") {
		if (path.endsWith(".gpg")) {
			file.content = Buffer(content).toString("base64");
			file.encoding = "base64";
		}
		else file.content = content;
	}
}



GithubAPI.prototype.renameFile = function(path, newName) {
	let file = this.getFileByPath(path);
	path = path.split('/');
	path[path.length-1] = newName;
	file.path = path.join('/');
}


GithubAPI.prototype.moveFile = function(oldPath, newPath) {
	let file = this.getFileByPath(oldPath);
	file.path = newPath;
}


GithubAPI.prototype.copyFile = function(filePath, copyPath) {
	let file = this.getFileByPath(filePath);
	this.currentTree.tree.push({
		path: copyPath,
		mode: file.mode,
		type: file.type,
		sha: file.sha
	});
}


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


GithubAPI.prototype.commit = function(message) {
	return new Promise((resolve, reject) => {
		if (!this.currentTree || !this.lastCommit) reject(new Error("Last tree or commit unavailable."));
		this.cleanTree();
		this.createTree().then( () => {
			let options = {
				path: '/repos/' + this.username + '/' + this.repoName + '/git/commits',
				method: 'POST'
			};

			let data = {
				message: message,
				tree: this.currentTree.sha,
				parents: [this.lastCommit.sha]
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
	});
}


GithubAPI.prototype.getAllFiles = function() {
	return new Promise((resolve, reject) => {
		if (!this.currentTree) reject(new Error('No tree available.'));
		this.cleanTree();
		let promises = [];

		for (let file of this.currentTree.tree) {
			promises.push(this.getFileContent(file.sha))
		}

		Promise.all(promises).then((response) => {
			let files = new Array();
			let content;
			for (let i=0; i<this.currentTree.tree.length; i++) {
				if (this.currentTree.tree[i].path == ".gitattributes") continue;
				if (this.currentTree.tree[i].path.endsWith('.gpg')) {
					if (typeof window == 'undefined') {
						let buffer = Buffer(response[i].content, 'base64');

						content = new Uint8Array(buffer);
					}
					else {
						let buffer = atob(response[i].content);
						content = new Uint8Array(buffer.length);
						for (let i=0; i<buffer.length; i++) {
							content[i] = buffer.charCodeAt(i);
						}
					}
				}
				else {
					if (typeof window == "undefined") {
						content = Buffer(response[i].content, 'base64').toString();
					}
					else {
						content = atob(response[i].content);
					}
				}


				files.push({
					path: this.currentTree.tree[i].path,
					content: content
				});
			}
			resolve(files);
		}).catch((err) => reject(err));
	});
}

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


GithubAPI.prototype.cleanTree = function() {
	for (let item of this.currentTree.tree) {
		if ('size' in item) delete item.size;
		delete item.url;
	}

	this.currentTree.tree = this.currentTree.tree.filter((item) => { return item.type != 'tree'; });
}

module.exports = GithubAPI;