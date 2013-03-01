YUI().use('button', 'event', 'node', 'tabview', 'json', 'json-stringify', function (Y) {
	var storage = chrome.storage.local;

	// Load the UI
	storage.get(null, function(settings) {
		// Authentication
		if (settings.hasOwnProperty('deliciousUsername')) {
			Y.one('#delicious-option-auth-username').set('value', settings.deliciousUsername);
		}

		if (settings.hasOwnProperty('deliciousPassword')) {
			Y.one('#delicious-option-auth-password').set('value', settings.deliciousPassword);
		}

		if (settings.hasOwnProperty('debug')) {
			if (settings.debug === 1) {
				Y.one('#delicious-option-debug').set('checked', true);
			} else {
				Y.one('#delicious-option-debug').set('checked', false);
			}
		}

		// Bookmarks Settings
		if (settings.hasOwnProperty('openInNewTab')) {
			if (settings.openInNewTab === 1) {
				Y.one('#delicious-option-bookmarks-open-new-tab').set('checked', true);
			} else {
				Y.one('#delicious-option-bookmarks-open-new-tab').set('checked', false);
			}
		}

		/*if (settings.hasOwnProperty('tagUntagged')) {
			if (settings.tagUntagged === 1) {
				Y.one('#delicious-option-bookmarks-tag-untagged').set('checked', true);
			} else {
				Y.one('#delicious-option-bookmarks-tag-untagged').set('checked', false);
			}
		}*/

		if (settings.hasOwnProperty('sortBy')) {
			Y.one('#delicious-option-bookmarks-sort-by').get('options').each(function() {
				var text = this.get('text');
				if (text === settings.sortBy) {
					this.set('selected', true);
				}
			});
		}

		if (settings.hasOwnProperty('sortDirection')) {
			Y.one('#delicious-option-bookmarks-sort-direction').get('options').each(function() {
				var text = this.get('text');
				if (text === settings.sortDirection) {
					this.set('selected', true);
				}
			});
		}

		// Tree UI Settings
		if (settings.hasOwnProperty('showTooltips')) {
			if (settings.showTooltips === 1) {
				Y.one('#delicious-option-treeui-show-tooltips').set('checked', true);
				Y.all('.tooltip-option').each(function() {
					this.set('disabled', false);
				});
			} else {
				Y.one('#delicious-option-treeui-show-tooltips').set('checked', false);
				Y.all('.tooltip-option').each(function() {
					this.set('disabled', true);
				});
			}
		}

		if (settings.hasOwnProperty('showNameInTooltips')) {
			if (settings.showNameInTooltips === 1) {
				Y.one('#delicious-option-treeui-show-name-in-tooltips').set('checked', true);
			} else {
				Y.one('#delicious-option-treeui-show-name-in-tooltips').set('checked', false);
			}
		}

		if (settings.hasOwnProperty('showUrlInTooltips')) {
			if (settings.showUrlInTooltips === 1) {
				Y.one('#delicious-option-treeui-show-url-in-tooltips').set('checked', true);
			} else {
				Y.one('#delicious-option-treeui-show-url-in-tooltips').set('checked', false);
			}
		}

		if (settings.hasOwnProperty('showTagsInTooltips')) {
			if (settings.showTagsInTooltips === 1) {
				Y.one('#delicious-option-treeui-show-tags-in-tooltips').set('checked', true);
			} else {
				Y.one('#delicious-option-treeui-show-tags-in-tooltips').set('checked', false);
			}
		}

		if (settings.hasOwnProperty('showCommentsInTooltips')) {
			if (settings.showCommentsInTooltips === 1) {
				Y.one('#delicious-option-treeui-show-comments-in-tooltips').set('checked', true);
			} else {
				Y.one('#delicious-option-treeui-show-comments-in-tooltips').set('checked', false);
			}
		}

		if (settings.hasOwnProperty('showTimestampInTooltips')) {
			if (settings.showTimestampInTooltips === 1) {
				Y.one('#delicious-option-treeui-show-timestamp-in-tooltips').set('checked', true);
			} else {
				Y.one('#delicious-option-treeui-show-timestamp-in-tooltips').set('checked', false);
			}
		}

		if (settings.hasOwnProperty('expandOnMouseOver')) {
			if (settings.expandOnMouseOver === 1) {
				Y.one('#delicious-option-treeui-expand-on-mouseover').set('checked', true);
			} else {
				Y.one('#delicious-option-treeui-expand-on-mouseover').set('checked', false);
			}
		}
	});

	// Set up the TabView
	var optionsTabview = new Y.TabView({
		srcNode: '#delicious-opts'
	});
	optionsTabview.render();

	// Buttons
	var optAuthSubmit = new Y.Button({
        srcNode: '#delicious-opt-account-submit'
    });

	var optBookmarksSubmit = new Y.Button({
        srcNode: '#delicious-opt-bookmarks-submit'
    });

	var optTreeUISubmit = new Y.Button({
        srcNode: '#delicious-opt-treeui-submit'
    });

	// Event handlers for options
	Y.one('#delicious-opt-account-submit').on('click', function(e) {
		e.preventDefault();
		storage.set({
			deliciousUsername: Y.one('#delicious-option-auth-username').get('value'),
			deliciousPassword: Y.one('#delicious-option-auth-password').get('value')
		});
	});

	Y.one('#delicious-opt-bookmarks-submit').on('click', function(e) {
		e.preventDefault();
		var openInNewTab = 0,
			tagUntagged = 0,
			untaggedTag = 'Unsorted',
			sortBy = 'Title',
			sortDirection = 'Ascending';

		if (Y.one('#delicious-option-bookmarks-open-new-tab').get('checked')) {
			openInNewTab = 1;
		}

		/*if (Y.one('#delicious-option-bookmarks-tag-untagged').get('checked')) {
			tagUntagged = 1;
		}

		if (Y.one('#delicious-option-bookmarks-untagged').get('value').length > 0) {
			untaggedTag = Y.one('#delicious-option-bookmarks-untagged').get('value');
		}*/

		Y.one('#delicious-option-bookmarks-sort-by').get('options').each(function() {
			var selected = this.get('selected');
			var text = this.get('text');
			if (selected) {
				sortBy = text;
			}
		});

		Y.one('#delicious-option-bookmarks-sort-direction').get('options').each(function() {
			var selected = this.get('selected');
			var text = this.get('text');
			if (selected) {
				sortDirection = text;
			}
		});

		storage.set({
			openInNewTab: openInNewTab,
			tagUntagged: tagUntagged,
			untaggedTag: untaggedTag,
			sortBy: sortBy,
			sortDirection: sortDirection
		});
	});

	Y.one('#delicious-opt-treeui-submit').on('click', function(e) {
		e.preventDefault();
		var showTooltips = 0,
			showNameInTooltips = 0,
			showUrlInTooltips = 0,
			showTagsInTooltips = 0,
			showCommentsInTooltips = 0,
			showTimestampInTooltips = 0,
			expandOnMouseOver = 0;

		if (Y.one('#delicious-option-treeui-show-tooltips').get('checked')) {
			showTooltips = 1;
		}

		if (Y.one('#delicious-option-treeui-show-name-in-tooltips').get('checked')) {
			showNameInTooltips = 1;
		}

		if (Y.one('#delicious-option-treeui-show-url-in-tooltips').get('checked')) {
			showUrlInTooltips = 1;
		}

		if (Y.one('#delicious-option-treeui-show-tags-in-tooltips').get('checked')) {
			showTagsInTooltips = 1;
		}

		if (Y.one('#delicious-option-treeui-show-comments-in-tooltips').get('checked')) {
			showCommentsInTooltips = 1;
		}

		if (Y.one('#delicious-option-treeui-show-timestamp-in-tooltips').get('checked')) {
			showTimestampInTooltips = 1;
		}

		if (Y.one('#delicious-option-treeui-expand-on-mouseover').get('checked')) {
			expandOnMouseOver = 1;
		}

		storage.set({
			showTooltips: showTooltips,
			showNameInTooltips: showNameInTooltips,
			showUrlInTooltips: showUrlInTooltips,
			showTagsInTooltips: showTagsInTooltips,
			showCommentsInTooltips: showCommentsInTooltips,
			showTimestampInTooltips: showTimestampInTooltips,
			expandOnMouseOver: expandOnMouseOver
		});
	});

	Y.on('domready', function() {
		Y.one('#delicious-option-treeui-show-tooltips').on('change', function() {
			if (Y.one('#delicious-option-treeui-show-tooltips').get('checked') === false) {
				Y.all('.tooltip-option').each(function() {
					this.set('disabled', true);
				});
			} else {
				Y.all('.tooltip-option').each(function() {
					this.set('disabled', false);
				});
			}
		});

		Y.one('#delicious-option-bookmarks-sort-by').on('change', function() {
			Y.one('#delicious-option-bookmarks-sort-by').get('options').each(function() {
				var selected = this.get('selected');
				var text = this.get('text');
				if (selected) {
					if (text === 'None') {
						Y.one('#delicious-option-bookmarks-sort-direction').set('disabled', true);
					} else {
						Y.one('#delicious-option-bookmarks-sort-direction').set('disabled', false);
					}
				}
			});
		});
	});
});