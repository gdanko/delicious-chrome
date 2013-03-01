YUI().use(
	'dd-constrain',
	'dd-plugin',
	'event',
	'get',
	'io',
	'json',
	'node',
	'panel',
function(Y) {
	Y.on('domready', function () {
		// Variables
		var brooklyn_status = "/bcp-util/rotation-status.txt";
		var cgi = '/cgi-bin/bcp-util.cgi';
		var colos;
		var hgps;
		var property;

		var colo;
		var hgp;
		var action;

		// Initial population of table/create an interval for auto update
		populate();
		var t = setInterval(populate, 180000); 
		// Populate the status table
		function populate() {
			Y.one('#brooklyn-status').empty();
			fetch_brooklyn_status(function(brooklyn_status) {
				if(brooklyn_status.status === 'error') {
					Y.one('#bcp-errors').empty();
					var all_messages = brooklyn_status.messages;
					var messages = all_messages.split('; ');
					for(var x = 0; x < messages.length; x++) {
						Y.one('#bcp-errors').append('<div class="error">' + messages[x] + '</div>');
					}
					Y.one('#bcp-error-container').removeClass('hidden');
					return false;
				}
	
				Y.one('#brooklyn-status-timestamp').setContent('<i>Last updated ' + brooklyn_status.timestamp + '</i>');
				var data = brooklyn_status.data;
	
				colos = brooklyn_status.lists.colos;
				hgps = brooklyn_status.lists.hgps;
				property = brooklyn_status.property;
	
				Y.all('.property-name').setContent(property);
				Y.one('#brooklyn-status').append('<tr id="brooklyn-status-header"></tr>');
				Y.one('#brooklyn-status-header').append('<th width="80px"></th>');
	
				for(var x = 0; x < hgps.length; x++) {
					var hgp = hgps[x];
					Y.one('#brooklyn-status-header').append('<th width="80px">' + hgp.toUpperCase() + '</th>');
				}
	
				for(var x = 0; x < colos.length; x++) {
					var colo = colos[x];
					Y.one('#select-bcp-colo').append('<option value="' + colo + '">' + colo.toUpperCase() + '</option>');
	
					Y.one('#brooklyn-status').append('<tr id="tr-' + colo + '" class="tr-colo"></tr>');
					Y.one('#tr-' + colo).append('<td><b>' + colo.toUpperCase() + '</b></td>');
					for(var y = 0; y < hgps.length; y++) {
						var hgp = hgps[y];
						state = data[colo][hgp];
						var trClass = 'tr-state tr-state-' + state.toLowerCase();
						if(state === 'OK') {
							var title = 'Fail hostgroup ' + hgp + ' out of ' + colo;
							trClass += ' tr-state-changeable';
						} else if(state === 'DOWN') {
							var title = 'Put hostgroup ' + hgp + ' back into ' + colo;
							trClass += ' tr-state-changeable';
						} else {
							var title = '';
							trClass += ' tr-state-unchangeable';
						}
						Y.one('#tr-' + colo).append('<td title="' + title + '" id="' + colo + '-' + hgp + '-' + state.toLowerCase() + '" class="' + trClass + '"><center>' + state + '</center></td>');
					}
				}
	
				Y.one('#bd').removeClass('hidden');
			});
		}

		var confirm = new Y.Panel({
			srcNode: '#confirm-dialog-content',
			width: '300px',
			centered: true,
			visible: false,
			render: true,
			draggable :true,
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
					value: "No",
					action: function(e) {
					confirm.hide();
				},
					section: Y.WidgetStdMod.FOOTER
				},
				{
					value: "Yes",
					action: function(e) {
						if(action === 'out') {
							var ttl = Y.one('#oor-ttl').get('value');
							var msg = Y.one('#oor-msg').get('value');
							var ticket = Y.one('#oor-ticket').get('value');
							if(ttl === '') {
								show_generic_dialog('Error', 'The TTL field is required.');
								return false;
							} else if(msg === '') {
								show_generic_dialog('Error', 'The Message field is required.');
							} else if(ticket === '') {
								show_generic_dialog('Error', 'The Ticket field is required.');
							} else {
								confirm.hide();
								do_bcp(colo, hgp, action);
							}
						} else if(action === 'in') {
							confirm.hide();
							do_bcp(colo, hgp, action);
						}
					},
					section: Y.WidgetStdMod.FOOTER
				}
			]
		});

		function confirm_dialog(colo, hgp, action) {
			var from;
			var msg;
			var title;

			Y.one('#oor-ttl').set('value', '');
			Y.one('#oor-msg').set('value', '');
			Y.one('#oor-ticket').set('value', '');
			Y.one('#oor-ttl').focus();

			// Set some variables based on action
			if(action === 'in') {
				Y.one('#confirm-dialog-form').addClass('hidden');
				from = 'from';
			} else if(action === 'out') {
				Y.one('#confirm-dialog-form').removeClass('hidden');
				from = 'of';
			}

			if(hgp === 'all' && action === "out") {
				msg = 'You are opting to fail all hostgroups out of ' + colo + '. Are you ABSOLUTELY SURE you want to do this?';
				title = 'Dragons Ahead!';
			} else if(hgp === 'all' && action === 'in') {
				msg = 'Are you sure you want to fail all hostgroups in to ' + colo + '?';
				title = 'Confirm BCP Action';
			} else {
				msg = 'Are you sure want to fail "' + hgp + '" ' + action + ' ' + from + ' ' + colo + '?';
				title = 'Confirm BCP Action';
			}

			confirm.set('headerContent', title);
			Y.one('#confirm-dialog-form-msg').setContent('<div class="confirm-dialog-title">' + msg + '</div>');
			confirm.show();
		}

		var generic = new Y.Panel( {
			srcNode: '#generic-dialog-content',
			width: '330px',
			centered: true,
			visible: false,
			render: true,
			draggable: true,
			zIndex: '10',
			plugins: {
				cfg: {
					plugins: {
						cfg: {
							node: 'body',
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
						generic.hide();
					},
					section: Y.WidgetStdMod.FOOTER
				}
			]
		});

		function fetch_brooklyn_status(callback) {
			var time = Math.round((new Date()).getTime() / 1000);
			var qs = 'timestamp=' + time;
			var cfg = {
				method: 'GET',
				data: qs,
				on: {
					success: function(id, o) {
						var json_string = o.responseText;

						try {
							url_data = Y.JSON.parse(json_string);
						} catch(e) {
							show_generic_dialog('Error', 'An invalid response was received from the server.');
							return false;
						}
						callback(url_data);
					}
				}
			};
			Y.io(brooklyn_status, cfg);
		}

		function submit_bcp(colo, hgp, action, callback) {
			var cfg = {
				method: 'POST',
				data: 'action=' + action + '&colo=' + colo + '&hgp=' + hgp,
				on: {
					success: function(id, o) {
						var json_string = o.responseText;

						try {
							url_data = Y.JSON.parse(json_string);
						} catch(e) {
							show_generic_dialog('Error', 'An invalid response was received from the server.');
							return false;
						}
						callback(url_data);
					}
				}
			};
			Y.io(cgi, cfg);
		}

		function do_bcp(colo, hgp, action) {
			submit_bcp(colo, hgp, action,function(output) {
				show_generic_dialog('Success', output.messages);
			});
		}

		function show_generic_dialog(title, text) {
			generic.set('headerContent', title);
			Y.one('#generic-dialog-msg').setContent('<div class="generic-dialog-title">' + text + '</div>');
			generic.show();
		}

		// Event Handlers
		Y.on('change', function(e) {
			Y.one('#generic-dialog-msg').empty();
			generic.hide();
			confirm.hide();
		}, '.toggle-colo-menu');


		Y.one('#bcp-submit-button').on('click', function(e) {
			e.preventDefault();
			var error_text;

			Y.one('#bcp-output').empty();

			colo = Y.one('#select-bcp-colo').get('value');
			hgp = 'all';
			action = Y.one('#select-bcp-action').get('value');

			if(action === "in") {
				Y.one('#confirm-dialog-form').addClass('hidden');
			} else if(action === "out") {
				Y.one('#confirm-dialog-form').removeClass('hidden');
			}

			if(colo === 'null') {
				show_generic_dialog('Info', 'Please select a colo from the pull-down.');
			} else if(action === 'null') {
				show_generic_dialog('Info', 'Please select an action from the pull-down.');
			} else {
				confirm_dialog(colo, hgp, action);
			}
		});

		Y.on('click', function(e) {
			// Reset the toggle colo menus
			Y.one('#select-bcp-colo').set('value', 'null');
			Y.one('#select-bcp-action').set('value', 'null');

			var id = this.get('id');
			var parts = id.split('-');
			colo = parts[0];
			hgp = parts[1];
			var state = parts[2];

			if(state == 'ok') {
				action = 'out';
			} else if(state == 'down') { 
				action = 'in';
			} else {
				return false;
			}
			confirm_dialog(colo, hgp, action);
		}, '.tr-state');

		Y.on('mouseenter', function(e) {
			var id = this.get('id');
			Y.one('#' + id).setStyle('cursor', 'pointer');
		}, '.tr-state-changeable');

		Y.on('mouseenter', function(e) {
			var id = this.get('id');
			Y.one('#' + id).setStyle('cursor', 'default');
		}, '.tr-state-unchangeable');
	});
});
