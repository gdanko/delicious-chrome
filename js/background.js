var loadStatus = {status: 'error', message: 'Bookmarks not loaded. Click the refresh button to request a reload.'};
var bookmarks;
var allUrls = new Object;
var allTags = new Array;
var opts;

chrome.storage.local.get(null, function(settings) {
	if (!settings.hasOwnProperty('openInNewTab')) chrome.storage.local.set({'openInNewTab': 1});
	//if (!settings.hasOwnProperty('tagUntagged')) chrome.storage.local.set({'tagUntagged': 0});
	//if (!settings.hasOwnProperty('untaggedTag')) chrome.storage.local.set({'untaggedTag': 'Unsorted'});
	if (!settings.hasOwnProperty('sortBy')) chrome.storage.local.set({'sortBy': 'Title'});
	if (!settings.hasOwnProperty('sortDirection')) chrome.storage.local.set({'sortDirection': 'Ascending'});
	if (!settings.hasOwnProperty('showTooltips')) chrome.storage.local.set({'showTooltips': 0});
	if (!settings.hasOwnProperty('showNameInTooltips')) chrome.storage.local.set({'showNameInTooltips': 0});
	if (!settings.hasOwnProperty('showUrlInTooltips')) chrome.storage.local.set({'showUrlInTooltips': 0});
	if (!settings.hasOwnProperty('showTagsInTooltips')) chrome.storage.local.set({'showTagsInTooltips': 0});
	if (!settings.hasOwnProperty('showCommentsInTooltips')) chrome.storage.local.set({'showCommentsInTooltips': 0});
	if (!settings.hasOwnProperty('showTimestampsInTooltips')) chrome.storage.local.set({'showTimestampsInTooltips': 0});
	if (!settings.hasOwnProperty('expandOnMouseOver')) chrome.storage.local.set({'expandOnMouseOver': 0});
	if (!settings.hasOwnProperty('bookmarkData')) chrome.storage.local.set({'bookmarkData': null});
	if (!settings.hasOwnProperty('debug')) chrome.storage.local.set({'debug': 0});
});

// Populate opts with the current settings
chrome.storage.local.get(null, function(settings) {
	opts = settings;
});

YUI().use('node', 'panel', 'io', 'json', function (Y) {
	function pad(number) {
		if (number < 10) {
			return '0' + number;
		} else {
			return number;
		}
	}

	function getSetting(settingName) {
		chrome.storage.local.get(null, function(settings) {
			if (settings.hasOwnProperty(settingName)) {
				console.log('yes');
				return settings[settingName];
			} else {
				return null;
			}
		});
	}

	function timeToString(time) {
		// 2013-02-01T16:21:35Z
		var dateObj = new Date(time * 1000);
		var year = dateObj.getUTCFullYear();
		var month = pad(dateObj.getUTCMonth() + 1);
		var date = pad(dateObj.getUTCDate());
		var hour = pad(dateObj.getUTCHours());
		var min = pad(dateObj.getUTCMinutes());
		var sec = pad(dateObj.getUTCSeconds());
		return year + '-' + month + '-' + date + 'T' + hour + ':' + min + ':' + sec + 'Z';
	}

	function sortByTitle(a,b) {
		var nullChar = String.fromCharCode(0),
		compA = a.label.toLowerCase().replace(/_/i, nullChar),
		compB = b.label.toLowerCase().replace(/_/i, nullChar);

		if (opts.sortDirection === 'Ascending') {
			return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
		} else {
			return (compA > compB) ? -1 : (compA < compB) ? 1 : 0;
		}
	}

	function sortByTimestamp(a,b) {
		compA = a.data.unix_time;
		compB = b.data.unix_time;

		if (opts.sortDirection === 'Ascending') {
			return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
		} else {
			return (compA > compB) ? -1 : (compA < compB) ? 1 : 0;
		}
	}

	function sortTags(a,b) {
		return (a < b) ? -1 : (a > b) ? 1 : 0;
	}

	function buildBookmarksObj(bookmarks,callback) {
		chrome.storage.local.get(null, function(settings) {
			var tempObj = new Object;
			
			for (var i = 0; i < bookmarks.posts.length; i++) {
				var item = bookmarks.posts[i].post;
				var tags = item.tag.split(',');
				for (var x = 0; x < tags.length; x++) {
					var tagName = tags[x];
					if (tagName !== '') {
						if (!tempObj.hasOwnProperty(tagName)) {
							tempObj[tagName] = new Array;
							allTags.push(tagName);
						}
						tempObj[tagName].push({
							'label': item.description,
							'data': {
								'title': item.description,
								'url': item.href,
								'tags': tags,
								'comments': item.extended,
								'hash': item.hash,
								'private': item.private,
								'shared': item.shared,
								'time': item.time,
								'unix_time': Date.parse(item.time) / 1000
							}
						});
					}
				}
				allUrls[item.href] = item;
			}
			var tagList = new Array;
			for (var tagName in tempObj) {
				if (settings.sortBy === 'Title') {
					tempObj[tagName].sort(sortByTitle);
				} else if (settings.sortBy === 'Timestamp') {
					tempObj[tagName].sort(sortByTimestamp);
				}

				var temp = { 'label': tagName, 'children': tempObj[tagName] };
				tagList.push(temp);
			}
			if (settings.sortBy === 'Title') {
				tagList.sort(sortByTitle);
			}
			allTags.sort(sortTags);
			callback(tagList);
		});
	}

	function fetchBookmarks(callback) {
		var status, message;
		var treeData = new Array;
		chrome.storage.local.get(null, function(settings) {
			if (settings.hasOwnProperty('deliciousUsername') && settings.hasOwnProperty('deliciousPassword')) {
				var url = 'https://' + settings.deliciousUsername + ':' + settings.deliciousPassword + '@api.del.icio.us/v1/json/posts/all?tag_separator=comma';
				if (opts.debug === 1) {
					Y.log('[Debug] ' + url);
				}
				var cfg = {
					method: 'GET',
					on: {
						success: function(id, o) {
							if (o.status === 200) {
								try {
									var bookmarksObj = Y.JSON.parse(o.responseText);
								} catch(e) {
									chrome.storage.local.get(null, function(settings) {
										if (settings.bookmarkData.length > 0) {
											loadStatus = {status: 'warning', message: 'Invalid JSON returned from Delicious. Using cached copy.'};
											callback(settings.bookmarkData);
										} else {
											loadStatus = {status: 'error', message: 'Invalid JSON returned from Delicious.'};
											callback(treeData);
										}
									});
								}
								buildBookmarksObj(bookmarksObj, function(treeData) {
									loadStatus = {status: 'success', message: 'Bookmarks successfully fetched.'};
									chrome.storage.local.set({'bookmarkData': treeData});
									callback(treeData);
								});
							} else {
								chrome.storage.local.get(null, function(settings) {
									if (settings.bookmarkData.length > 0) {
										loadStatus = {status: 'warning', message: 'Non-200 status code received from Delicious. Using cached copy.'};
										callback(settings.bookmarkData);
									} else {
										loadStatus = {status: 'warning', message: 'Non-200 status code received from Delicious. Please try again later.'};
										callback(treeData);
									}
								})
							}
						},
						failure: function(id, o) {
							chrome.storage.local.get(null, function(settings) {
								if (settings.bookmarkData.length > 0) {
									loadStatus = {status: 'warning', message: 'Could not load bookmarks from Delicious. Server returned status code ' + o.status + ' and the message "' + o.statusText + '". Using cached copy.'};
									callback(settings.bookmarkData);
								} else {
									loadStatus = {status: 'warning', message: 'Could not load bookmarks from Delicious. Server returned status code ' + o.status + ' and the message "' + o.statusText + '"'};
									callback(treeData);
								}
							});
						}
					}
				};
				Y.io(url, cfg);
			} else {
				loadStatus = {status: 'error', message: 'Delicious login credentials not configured. Please configure these in the options page.'};
			}
		});
	}

	function addBookmark(dataObj,callback) {
		var dummy = new Object;
		chrome.storage.local.get(null, function(settings) {
			if (settings.hasOwnProperty('deliciousUsername') && settings.hasOwnProperty('deliciousPassword')) {
				var qsArray = new Array;
				var url = 'https://' + settings.deliciousUsername + ':' + settings.deliciousPassword + '@api.del.icio.us/v1/json/posts/add';
				qsArray.push('description=' + encodeURIComponent(dataObj.title));
				qsArray.push('url=' + dataObj.url);
				qsArray.push('dt=' + timeToString(Math.round((new Date()).getTime() / 1000)));
				if (dataObj.hasOwnProperty('tags') && dataObj.tags.length > 0) {
					qsArray.push('tags=' + dataObj.tags);
				}

				if (dataObj.hasOwnProperty('comments') && dataObj.comments.length > 0) {
					qsArray.push('extended=' + dataObj.comments);
				}

				if (dataObj.method === 'editBookmark') {
					qsArray.push('replace=yes');
				}
				var cfg = {
					method: 'GET',
					data: qsArray.join('&'),
					on: {
						success: function(id, o) {
							if (o.status === 200) {
								try {
									var addBookmarkObj = Y.JSON.parse(o.responseText);
									loadStatus = {status: 'success', message: 'Bookmark successfully added to Delicious.'};
									callback(o.response);
								} catch(e) {
									loadStatus = {status: 'error', message: 'Invalid JSON returned from Delicious.'};
									callback(dummy);
								}
							} else {
								loadStatus = {status: 'warning', message: 'Non-200 status code received from Delicious. Please try again later.'};
								callback(dummy);
							}
						},
					}
				};
				Y.io(url, cfg);
			}
		});
	}

	function deleteBookmark(dataObj,callback) {
		chrome.storage.local.get(null, function(settings) {
			if (settings.hasOwnProperty('deliciousUsername') && settings.hasOwnProperty('deliciousPassword')) {
				var qsArray = new Array;
				var url = 'https://' + settings.deliciousUsername + ':' + settings.deliciousPassword + '@api.del.icio.us/v1/json/posts/delete';
				qsArray.push('url=' + dataObj.url);
				var cfg = {
					method: 'GET',
					data: qsArray.join('&'),
					on: {
						success: function(id, o) {
							if (o.status === 200) {
								try {
									var addBookmarkObj = Y.JSON.parse(o.responseText);
									loadStatus = {status: 'success', message: 'Bookmark successfully deleted from Delicious.'};
									callback(o.response);
								} catch(e) {
									loadStatus = {status: 'error', message: 'Invalid JSON returned from Delicious.'};
									callback(dummy);
								}
							} else {
								loadStatus = {status: 'warning', message: 'Non-200 status code received from Delicious. Please try again later.'};
								callback(dummy);
							}
						}
					}
				};
				Y.io(url, cfg);
			}
		});
	}

	chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
		if (request.method === 'refreshBookmarks') {
			fetchBookmarks(function(treeData) {
				bookmarks = treeData;
				sendResponse({answer: loadStatus.status});
			});

		} else if (request.method === 'addBookmark') {
			addBookmark(request, function(addStatus) {
				var data = JSON.parse(addStatus);
				sendResponse(data);
			});

		} else if (request.method === 'editBookmark') {
			addBookmark(request, function(editStatus) {
				var data = JSON.parse(editStatus);
				sendResponse(data);
			});

		} else if (request.method === 'deleteBookmark') {
			deleteBookmark(request, function(deleteStatus) {
				var data = JSON.parse(deleteStatus);
				sendResponse(data);
			});


		} else if (request.method === 'getLoadStatus') {
			chrome.storage.local.get(null, function(settings) {
				sendResponse({loadStatus: loadStatus});
			});
		}
			
	});

	Y.on('domready', function() {
		chrome.storage.onChanged.addListener(function(changes, namespace) {
			chrome.storage.local.get(null, function(settings) {
				for (key in changes) {
					opts[key] = changes[key].newValue;
					fetchBookmarks(function(treeData) {
						loadStatus = {status: 'success', message: 'Bookmarks successfully fetched.'};
						bookmarks = treeData;
					});
				}
			});
		});

		fetchBookmarks(function(treeData) {
			bookmarks = treeData;
		});
	});
});
