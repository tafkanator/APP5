define(
['jquery', 'Debug', 'ResourceManager', 'Util', 'moment', 'underscore'],
function($, dbg, resourceManager, util, moment, _) {
	'use strict';

	/**
	 * Default renderer for the debugging information.
	 *
	 * @class DebugRenderer
	 * @constructor
	 * @module Core
	 */
	var DebugRenderer = function() {
		this.ui = null;
	};

	/**
	 * Starts listening for the debug events.
	 *
	 * @method init
	 * @param {UI} ui The UI instance
	 * @return {DebugRenderer} Self
	 */
	DebugRenderer.prototype.init = function(ui) {
		var self = this;

		this.ui = ui;

		this._initCss(function() {
			self._initHtml();
			self._initEvents();
		});

		return this;
	};

	/**
	 * Displays error message on screen.
	 *
	 * @method showError
	 * @param {String} title Modal title
	 * @param {String} message Error message
	 * @param {String} [location] Where the error occured
	 * @param {Array} stack Stack trace
	 */
	DebugRenderer.prototype.showError = function(title, message, location, stack) {
		title = title || 'System Error Occured';
		message = message || 'A system error occured, sorry for the inconvenience.';
		location = location || '';

		message = '<p><strong>' + message.replace('<', '&lt;').replace('>', '&gt;') + '</strong></p>';

		var modal = $('#debug-renderer-error'),
			stackTrace = '',
			i;

		if (util.isArray(stack) && stack.length > 0) {
			for (i = 0; i < stack.length; i++) {
				if (i > 0) {
					stackTrace += '<br>';
				}

				stackTrace += '#' + (i + 1) + ' ' + stack[i].filename + ':' +
					stack[i].line + ' - ' + stack[i].method;
			}

			message += '<p>' + stackTrace + '</p>';
		}

		if (modal.length === 0) {
			$(document.body).append(
				'<div id="debug-renderer-error">' +
				'	<div class="debug-renderer-error-inner">' +
				'		<h1 class="debug-renderer-error-title"></h1>' +
				'		<div class="debug-renderer-error-location"></div>' +
				'		<div class="debug-renderer-error-close">&times;</div>' +
				'		<div class="debug-renderer-error-content"></div>' +
				'	</div>' +
				'</div>'
			);

			modal = $('#debug-renderer-error');
		}

		modal.find('.debug-renderer-error-title').html(title);
		modal.find('.debug-renderer-error-content').html(message);
		modal.find('.debug-renderer-error-location').html(location);
		modal.find('.debug-renderer-error-close').click(function() {
			modal.fadeOut(function() {
				$(this).remove();
			});
		});

		modal.fadeIn();
	};

	/**
	 * Loads renderer css.
	 *
	 * @method _initCss
	 * @private
	 */
	DebugRenderer.prototype._initCss = function(loadedCallback) {
		resourceManager.loadCss('style/debug-renderer.css', loadedCallback);
	};

	/**
	 * Generates required HTML.
	 *
	 * @method _initHtml
	 * @private
	 */
	DebugRenderer.prototype._initHtml = function() {
		$(document.body).append('<div id="debug-renderer"></div>');

		if (!$(document.body).hasClass('with-touch')) {
			return;
		}

		$('#debug-renderer')
			.hammer()
			/*.bind('drag', function(e) {
				if (e.direction !== 'left' && e.direction !== 'right') {
					return;
				}

				var clientWidth = parseInt($(window).width());

				$(this).removeClass('visible').width(clientWidth - e.touches[0].x);
			})*/
			.bind('swipe', function(e) {
				switch (e.direction) {
					case 'left':
						$(this).addClass('visible');

						return false;
					break;

					case 'right':
						$(this).removeClass('visible');

						return false;
					break;
				}
			})
			.bind('hold', function(e) {
				$(this).empty();
			});
	};

	/**
	 * Starts listening for the debug events.
	 *
	 * @method _initEvents
	 * @private
	 */
	DebugRenderer.prototype._initEvents = function() {
		var self = this;

		// not required at the top as this would create a dependency loop
		require(['Navi'], function(navi) {
			navi.bind(navi.Event.PRE_NAVIGATE, function(e) {
				dbg.log('! Navigating to ' + e.module + '::' + e.action, e.parameters);
			});

			/*navi.bind(navi.Event.POST_NAVIGATE, function(e) {
				dbg.log('+ Navigated to ' + e.module + '::' + e.action);
			});*/
		});

		resourceManager.bind(resourceManager.Event.MODULE_LOADED, function(e) {
			dbg.log('+ Loaded module ' + e.name);
		});

		resourceManager.bind(resourceManager.Event.VIEW_LOADED, function(e) {
			dbg.log('+ Loaded view ' + e.filename);
		});

		dbg.bind(dbg.Event.CONSOLE, function(e) {
			var time = util.date(),
				args = [moment(time).format('hh:mm:ss')],
				i;

			if (util.isObject(e.source)) {
				args.push(util.formatPath(e.source.filename) + ':' + e.source.line);
			}

			for (i = 0; i < e.args.length; i++) {
				args.push(e.args[i]);
			}

			if (util.isFunction(console.log.apply)) {
				console.log.apply(console, args);
			} else {
				console.log(args);
			}
		});

		dbg.bind(dbg.Event.LOG, function(e) {
			var type = 'info',
				message = e.args[0];

			if (!util.isString(message)) {
				if (util.isFunction(message.toString())) {
					message = message.toString();
				} else {
					return;
				}
			}

			var id = message.substr(0, 2),
				content = self._formatContent(e.args);

			if (id === '+ ') {
				type = 'success';
			} else if (id === '- ') {
				type = 'error';
			}

			self._appendMessage(type, content, e.source);
		});

		dbg.bind(dbg.Event.ALERT, function(e) {
			var content = self._formatContent(e.args);

			self._appendMessage('alert', content, e.source);
		});

		dbg.bind(dbg.Event.ERROR, function(e) {
			function formatError(arg) {
				if (arg instanceof Error) {
					if (arg.stack) {
						arg = (arg.message && arg.stack.indexOf(arg.message) === -1)
							? 'Error: ' + arg.message + '\n' + arg.stack
							: arg.stack;
					} else if (arg.sourceURL) {
						arg = arg.message + '\n' + arg.sourceURL + ':' + arg.line;
					}
				}
				return arg;
			}

			var args = [];

			_.each(e.args, function(arg) {
				args.push(formatError(arg));
			});

			if (util.isFunction(console.error.apply)) {
				console.error.apply(console, args);
			} else {
				console.error(args);
			}

			var message = 'Unknown error',
				stack = [],
				filename = 'unknown',
				line = '?';

			if (e.args.length === 3 && util.isNumber(e.args[2])) {
				message = e.args[0];
				filename = e.args[1];
				line = e.args[2];
			} else if (e.args.length === 1 && util.isError(e.args[0])) {
				message = e.args[0].message;

				if (util.isArray(e.args) && e.args.length > 0 && util.isString(e.args[0].stack)) {
					stack = _.filter(_.map(e.args[0].stack.split('\n'), function(line) {
						return util.parseStackLine(line);
					}), function(item) {
						return item !== null;
					});

					filename = stack[0].filename;
					line = stack[0].line;
				}
			} else if (e.args.length === 1 && util.isString(e.args[0])) {
				message = e.args[0];
				filename = e.source.filename;
				line = e.source.line;
			}

			self.showError('System Error Occured', message, filename + ':' + line, stack);

			var stackTrace = '',
				i;

			if (stack.length > 0) {
				for (i = 0; i < stack.length; i++) {
					if (i > 0) {
						stackTrace += '<br>';
					}

					stackTrace += '#' + (i + 1) + ' ' + stack[i].filename + ':' +
						stack[i].line + ' - ' + stack[i].method;
				}
			}

			self._appendMessage(
				'error',
				message + (stackTrace.length > 0 ? '<br>' + stackTrace : ''),
				{
					filename: filename,
					line: line
				}
			);
		});
	};

	/**
	 * Appends a new log message.
	 *
	 * @method _appendMessage
	 * @param {String} type Type of the message
	 * @param {String} message Message content
	 * @param {Object} source Message source
	 * @private
	 */
	DebugRenderer.prototype._appendMessage = function(type, message, source) {
		var wrap = $('#debug-renderer'),
			sourceContent,
			lineLimit = 100,
			lines = wrap.find('div'),
			lineCount = lines.length;

		if (lineCount > lineLimit - 1) {
			$(lines.splice(0, lineCount - (lineLimit - 1))).remove();
		}

		if (util.isObject(source)) {
			sourceContent = util.formatPath(source.filename) + ':' + source.line;
		} else {
			sourceContent = '<em>unknown</em>';
		}

		wrap.append('<div class="' + type + '">' + message + '<span>' + sourceContent + '</span></div> ');

		wrap.prop(
			'scrollTop',
			wrap.prop('scrollHeight')
		);
	};

	/**
	 * Formats message content.
	 *
	 * @method _formatContent
	 * @param {Array} properties Properties to format
	 * @return {String}
	 * @private
	 */
	DebugRenderer.prototype._formatContent = function(properties) {
		var content = '',
			token;

		for (var i = 0; i < properties.length; i++) {
			token = properties[i];

			if (i === 0 && util.isString(token) && /[\-+!] /.test(token)) {
				token = token.substr(2);
			}

			if (content.length > 0) {
				content += ', ';
			}

			content += util.str(token);
		}

		return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	};

	return new DebugRenderer();
});