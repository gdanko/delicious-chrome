YUI.add('helpers', function(Y) {
	function random() {
		return Math.floor((Math.random() * 1000000) + 1);
	}

	Y.helpers = {
		validateJson: function(text) {
			var output = new Object();

			try {
				var data = Y.JSON.parse(text);
				output = { status: 'success', data: data };
				return output;
			} catch(e) {
				output = { status: 'error'};
				return output;
			}
		},

		debugText: function(text) {
			Y.log('[Debug] ' + text);
			return;
		},

		buildDataTable: function(node, columns, data, orderBy) {
			node.empty();
			var table = new Y.DataTable({
				columns: columns,
				data: data,
				sortable: true
			});
			//if(orderBy != undefined) {
			//	table.sort(orderBy);
			//}
			table.render(node).sort(orderBy);
		},

		buildCalendar: function(node) {
			var calendar = new Y.PopupCalendar({
				input: node,
				autoFocusOnFieldFocus: false,
				autoTabIndexFormElements: false,
				width: '250px',
				showPrevMonth: true,
				showNextMonth: true,
				date: new Date(),
				centered: true
			});
			return calendar;
		},

		buildDialog: function(title, text) {
			var rand = random();
			var html = Y.Node.create(
				'<div id="dialog' + rand + '"><div class="yui3-widget-bd"><div class="message icon-'
				+ title.toLowerCase() + '">' + text + '</div></div>'
			);
			Y.one('#legolas-content').appendChild(html);

			var node = Y.one('#dialog' + rand);
			var dialog = new Y.Panel({
				srcNode: node,
				headerContent: title,
				width: '300px',
				centered: true,
				visible: false,
				render: true,
				draggable: true,
				zIndex: '106',
				modal: true,
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
						value: 'OK',
						action: function(e) {
							dialog.destroy();
							node.remove();
						},
						section: Y.WidgetStdMod.FOOTER
					}
				]
			});
			dialog.show();
		}

	}

	var container = Y.one('#legolas-content');
	//
	Y.on('mouseenter', function() {
		this.setStyle('cursor', 'pointer');
	}, '.mouse-change');

	Y.on('mouseleave', function() {
		this.setStyle('cursor', 'default');
	}, '.mouse-change');

	// Change cursor for dialog header
	Y.on('mouseenter', function() {
		this.setStyle('cursor', 'pointer');
	}, '#generic-dialog .yui3-widget-hd');

	Y.on('mouseleave', function() {
		this.setStyle('cursor', 'default');
	}, '#generic-dialog .yui3-widget-hd');

	// Delegate for buttons
	container.delegate('mouseenter', function() {
		this.setStyle('cursor', 'pointer');
	}, '.legolas-button');

	container.delegate('mouseleave', function() {
		this.setStyle('cursor', 'default');
	}, '.legolas-button');

	Y.log('module "helpers" loaded');
}, '0.0.1', {
	requires: [ 'gallery-popup-calendar', 'panel', 'json-parse' ]
});
