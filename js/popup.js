YUI().use('autocomplete', 'autocomplete-filters', 'autocomplete-highlighters', 'event-mouseenter', 'node', 'node-style', 'panel', 'json', 'gallery-sm-treeview', function (Y) {
	Y.on('domready', function () {
		var bg = chrome.extension.getBackgroundPage();
		var errorText = '';
		var bookmarksTree;
		// <a href="#" id="treeNode-yui_3_8_1_1_1362004713532_433-label" class="tooltip yui3-treeview-label">ADHD in Marriage and Romantic Relationships<span class="classic">tooltip</span></a>
		// https://github.com/smugmug/yui-gallery/blob/master/src/sm-treeview/js/treeview-templates.js#L16-L24
		var treeviewTemplate = 
		'<li id="<%= data.node.id %>" class="<%= data.nodeClassNames.join(" ") %>" role="treeitem" aria-labelled-by="<%= data.node.id %>-label">' +
			'<div class="<%= data.classNames.row %>" data-node-id="<%= data.node.id %>">' +
				'<span class="<%= data.classNames.indicator %>"><s></s></span>' +
				'<span class="<%= data.classNames.icon %>"></span>' +
				'<a class="<%= data.classNames.label %> bookmark-tooltip" href="#"><%== data.node.label %><span id="<%= data.node.id %>-label" class="tooltip-classic"></span></a>' +
			'</div>' +
		'</li>';

		// Set up autocomplete for tags
		var ac1 = new Y.AutoComplete({
			inputNode: '#add-bookmark-tags',
			source: bg.allTags,
			maxResults: 10,
			resultHighlighter: 'phraseMatch',
			resultFilters: 'phraseMatch',
			queryDelimiter: ',',
			render: true
		});

		var ac2 = new Y.AutoComplete({
			inputNode: '#edit-bookmark-tags',
			source: bg.allTags,
			maxResults: 10,
			resultHighlighter: 'phraseMatch',
			resultFilters: 'phraseMatch',
			queryDelimiter: ',',
			render: true
		});

		// Set up icons and cursors
		Y.one('#bookmark-refresh').setStyle('cursor', 'pointer');
		Y.one('#bookmark-delicious').setStyle('cursor', 'pointer');
		Y.one('#bookmark-options').setStyle('cursor', 'pointer');
		chrome.tabs.getSelected(null,function(tab) {
			var currentUrl = tab.url;
			if (bookmarkExists(currentUrl)) {
				Y.one('#bookmark-add').set('src', 'images/add-inactive.png');
				Y.one('#bookmark-add').setStyle('cursor', 'default');
				Y.one('#bookmark-edit').setStyle('cursor', 'pointer');
				Y.one('#bookmark-delete').setStyle('cursor', 'pointer');
			} else {
				Y.one('#bookmark-edit').set('src', 'images/edit-inactive.png');
				Y.one('#bookmark-edit').setStyle('cursor', 'default');
				Y.one('#bookmark-delete').set('src', 'images/delete-inactive.png');
				Y.one('#bookmark-delete').setStyle('cursor', 'default');
				Y.one('#bookmark-add').setStyle('cursor', 'pointer');
			}
		});

		Y.one('#bookmarks').empty();

		function logIt(text) {
			bg.console.log(text);
		}

		function renderTree() {
			if (bg.loadStatus.status === 'success') {
				Y.one('#bookmarks').empty().removeClass('error');
				bookmarksTree = new Y.TreeView({
					container: '#bookmarks',
				});

				bookmarksTree.get('container').delegate('click', function (e) {
					var url;
					var node = bookmarksTree.getNodeById( e.target.ancestor('li').get('id') );
					if (node.hasOwnProperty('data') && node.data.hasOwnProperty('url')) {
						url = node.data.url;
						if (bg.opts.openInNewTab === 1) {
							chrome.tabs.create({ url: url });
						} else {
							chrome.tabs.getSelected(null, function(tab) {
								chrome.tabs.update(tab.id, { url: url});
							});
						}
						window.close();
					}
				}, 'li .yui3-treeview-node');

				if (bg.opts.expandOnMouseOver === 1) {
					bookmarksTree.get('container').delegate('mouseenter', function (e) {
						var node = bookmarksTree.getNodeById( e.target.ancestor('li').get('id') );
						node.open();
					}, 'li .yui3-treeview-icon, .yui3-treeview-label');

					bookmarksTree.get('container').delegate('mouseleave', function (e) {
						var node = bookmarksTree.getNodeById( e.target.ancestor('li').get('id') );
						node.close();
					}, 'li .yui3-treeview-icon, .yui3-treeview-label');
				}

				Y.TreeView.Templates.node = Y.Template.Micro.compile(treeviewTemplate);
				bookmarksTree.rootNode.append(bg.bookmarks);
				bookmarksTree.render();

				// Hide all folder tooltips
				Y.all('.yui3-treeview-node, .yui3-treeview-can-have-children').each(function() {
					this.all('.tooltip-classic').addClass('tooltip-hidden');
				});

				// Hide tooltips if they're disabled
				if (bg.opts.showTooltips === 0) {
					Y.all('.tooltip-classic').addClass('tooltip-hidden');
					bookmarksTree.after('open', function(e) {
						Y.all('.tooltip-classic').addClass('tooltip-hidden');
					});
				} else if (bg.opts.showTooltips === 1) {
					bookmarksTree.after('open', function(e) {
						Y.all('li .yui3-treeview-node').each(function() {
							var titleArray = new Array;
							var node = bookmarksTree.getNodeById(this.get('id'));
							var html = bookmarksTree.getHTMLNode(node);
							chrome.storage.local.get(null, function(settings) {
								if (settings.showTooltips === 1) {
									if (settings.showNameInTooltips === 1) {
										titleArray.push('<b>Title:</b> ' + node.data.title);
									}

									if (settings.showUrlInTooltips === 1) {
										titleArray.push('<b>URL:</b> ' + node.data.url);
									}

									if (settings.showTagsInTooltips === 1) {
										titleArray.push('<b>Tags:</b> ' + node.data.tags.join(', '));
									}

									if (settings.showCommentsInTooltips === 1) {
										var comments = 'None';
										if (node.data.comments.length > 0) {
											comments = node.data.comments;
										}
										titleArray.push('<b>Comments:</b> ' + comments);
									}

									if (settings.showTimestampInTooltips === 1) {
										titleArray.push('<b>Timestamp:</b> ' + node.data.time);
									}
									html.one('span.tooltip-classic').set('innerHTML', titleArray.join('\n\n'));i
								}
							});
						});
					});
				}

			} else {
				Y.one('#bookmarks').set('innerHTML', '[Error] ' + bg.loadStatus.message).addClass('error');
			}
		}

		var addBookmarkDialog = new Y.Panel({
			srcNode: '#add-bookmark-dialog',
			width: '400px',
			headerContent: 'Add Bookmark',
			modal: true,
			centered: true,
			visible: false,
			render: true,
			draggable: false,
			zIndex: '5',
			plugins: {
				cfg: {
					plugins: {
						cfg: {
							node: 'body'
						},
						fn: Y.Plugin.DDConstrained
					}
				},
				fn: Y.Plugin.Drag
			},
			buttons: [
				{
					value: 'Cancel',
					action: function(e) {
						addBookmarkDialog.hide();
						window.close();
						Y.one('#add-bookmark-dialog').setStyle('display', 'none');
					},
					section: Y.WidgetStdMod.FOOTER
				},
				{
					value: 'Add',
					action: function(e) {
						addBookmarkDialog.hide();
						//window.close();
						Y.one('#add-bookmark-dialog').setStyle('display', 'none');
						var data = {
							method: 'addBookmark',
							title: Y.one('#add-bookmark-title').get('value'),
							url: Y.one('#add-bookmark-url').get('value'),
							comments: Y.one('#add-bookmark-comments').get('value'),
							tags: Y.one('#add-bookmark-tags').get('value')
						};
						chrome.extension.sendRequest(data, function(response) {
							if (response.result.code === 'done') {
								refreshBookmarks();
							}
						});
					},
					section: Y.WidgetStdMod.FOOTER
				}
			]
		});

		var editBookmarkDialog = new Y.Panel({
			srcNode: '#edit-bookmark-dialog',
			width: '400px',
			headerContent: 'Edit Bookmark',
			modal: true,
			centered: true,
			visible: false,
			render: true,
			draggable: false,
			zIndex: '5',
			plugins: {
				cfg: {
					plugins: {
						cfg: {
							node: 'body'
						},
						fn: Y.Plugin.DDConstrained
					}
				},
				fn: Y.Plugin.Drag
			},
			buttons: [
				{
					value: 'Cancel',
					action: function(e) {
						editBookmarkDialog.hide();
						window.close();
						Y.one('#edit-bookmark-dialog').setStyle('display', 'none');
					},
					section: Y.WidgetStdMod.FOOTER
				},
				{
					value: 'Save',
					action: function(e) {
						editBookmarkDialog.hide();
						//window.close();
						Y.one('#edit-bookmark-dialog').setStyle('display', 'none');
						var data = {
							method: 'editBookmark',
							title: Y.one('#edit-bookmark-title').get('value'),
							url: Y.one('#edit-bookmark-url').get('value'),
							comments: Y.one('#edit-bookmark-comments').get('value'),
							tags: Y.one('#edit-bookmark-tags').get('value')
						};
						chrome.extension.sendRequest(data, function(response) {
							if (response.result.code === 'done') {
								refreshBookmarks();
							}
						});
					},
					section: Y.WidgetStdMod.FOOTER
				}
			]
		});

		var deleteBookmarkDialog = new Y.Panel({
			srcNode: '#delete-bookmark-dialog',
			width: '400px',
			headerContent: 'Delete Bookmark',
			modal: true,
			centered: true,
			visible: false,
			render: true,
			draggable: false,
			zIndex: '5',
			plugins: {
				cfg: {
					plugins: {
						cfg: {
							node: 'body'
						},
						fn: Y.Plugin.DDConstrained
					}
				},
				fn: Y.Plugin.Drag
			},
			buttons: [
				{
					value: 'Cancel',
					action: function(e) {
						deleteBookmarkDialog.hide();
						window.close();
						Y.one('#delete-bookmark-dialog').setStyle('display', 'none');
					},
					section: Y.WidgetStdMod.FOOTER
				},
				{
					value: 'OK',
					action: function(e) {
						deleteBookmarkDialog.hide();
						//window.close();
						Y.one('#delete-bookmark-dialog').setStyle('display', 'none');
						var data = {
							method: 'deleteBookmark',
							url: Y.one('#delete-bookmark-url').get('value'),
						};
						chrome.extension.sendRequest(data, function(response) {
							if (response.result.code === 'done') {
								refreshBookmarks();
							}
						});
					},
					section: Y.WidgetStdMod.FOOTER
				}
			]
		});

		function bookmarkExists(url) {
			if (bg.allUrls.hasOwnProperty(url)) {
				return true;
			} else {
				return false;
			}
		}

		function addBookmark(tab) {
			var title = tab[0].title;
			var url = tab[0].url;
			var comments = tab[0].comments;
			if (!bookmarkExists(url)) {
				Y.one('#add-bookmark-title').set('value', title);
				Y.one('#add-bookmark-url').set('value', url);
				Y.one('#add-bookmark-dialog').setStyle('display', '');
				addBookmarkDialog.show();
			}
		}

		function editBookmark(tab) {
			var title = tab[0].title;
			var url = tab[0].url;
			var comments = tab[0].comments;
			if (bookmarkExists(url)) {
				Y.one('#edit-bookmark-title').set('value', bg.allUrls[url].description);
				Y.one('#edit-bookmark-url').set('value', url);
				if (comments) {
					Y.one('#edit-bookmark-comments').set('value', bg.allUrls[url].extended);
				}
				Y.one('#edit-bookmark-tags').set('value', bg.allUrls[url].tag);
				Y.one('#edit-bookmark-dialog').setStyle('display', '');
				editBookmarkDialog.show();
			}
		}

		function deleteBookmark(tab) {
			var title = tab[0].title;
			var url = tab[0].url;
			if (bookmarkExists(url)) {
				Y.one('#delete-bookmark-dialog-msg').set('innerHTML', 'Are you sure you want to delete the bookmark "<b>' + title + '</b>"?');
				Y.one('#delete-bookmark-url').set('value', url);
				Y.one('#delete-bookmark-dialog').setStyle('display', '');
				deleteBookmarkDialog.show();
			}
		}

		function refreshBookmarks() {
			Y.one('#bookmarks').empty().removeClass('error').set('innerHTML', 'Loading...');
			chrome.tabs.getSelected(null, function(tab) {
				chrome.extension.sendRequest({method: "refreshBookmarks"}, function(response) {
					if (response.answer === 'success') {
						bookmarksTree.clear();
						bookmarksTree.rootNode.append(bg.bookmarks);
						// Hide all folder tooltips
						Y.all('.yui3-treeview-node, .yui3-treeview-can-have-children').each(function() {
							this.all('.tooltip-classic').addClass('tooltip-hidden');
						});
					} else if (response.answer === 'error') {
						Y.one('#bookmarks').set('innerHTML', '[Error] ' + bg.loadStatus.message).addClass('error');
					}
				});
			});
		}

		Y.on('click', function() {
			chrome.tabs.query({active : true, currentWindow: true}, function (tab) {
				addBookmark(tab);
			});
		}, '#bookmark-add');

		Y.on('click', function() {
			chrome.tabs.query({active : true, currentWindow: true}, function (tab) {
				editBookmark(tab);
			});
		}, '#bookmark-edit');

		Y.on('click', function() {
			chrome.tabs.query({active : true, currentWindow: true}, function (tab) {
				deleteBookmark(tab);
			});
		}, '#bookmark-delete');

		Y.on('click', function() {
			chrome.tabs.query({active : true, currentWindow: true}, function (tab) {
				refreshBookmarks();
			});
		}, '#bookmark-refresh');

		Y.on('click', function() {
			chrome.tabs.create({ url: 'http://www.delicious.com/' });
		}, '#bookmark-delicious');

		Y.on('click', function() {
			var optionsUrl = chrome.extension.getURL('options.html');
			chrome.tabs.create({ url: optionsUrl });
		}, '#bookmark-options');

		Y.on('domready', function() {
			if (bg.loadStatus.status === 'error') {
				Y.one('#bookmarks').set('innerHTML', '[Error] ' + bg.loadStatus.message).addClass('error');
			} else {
				renderTree();
			}
		});
	});
});
