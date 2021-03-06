define(
[
	'Bindable',
	'Deferred',
	'App',
	'Debug',
	'Util',
	'UI',
	'ResourceManager',
	'Keyboard',
	'Mouse',
	'config/main',
	'angular'
],
function(Bindable, Deferred, app, dbg, util, ui, resourceManager, keyboard, mouse, config, angular) {
	'use strict';

	/**
	 * Provides functionality to navigate between module actions.
	 *
	 * Can fire the following events:
	 *
	 *	> PRE_NAVIGATE - fired before navigating to a new module action
	 *		module - module name
	 *		action - action name
	 *		parameters - action parameters
	 *	> POST_NAVIGATE - fired after navigating to a new module action
	 *		module - module name
	 *		action - action name
	 *		parameters - action parameters
	 *	> PRE_PARTIAL - fired before opening a partial view
	 *		containerSelector - selector for the partial container
	 *		module - module name
	 *		action - action name
	 *		parameters - action parameters
	 *	> POST_PARTIAL - fired after opening a partial view
	 *		containerSelector - selector for the partial container
	 *		module - module name
	 *		action - action name
	 *		parameters - action parameters
	 *	> STACK_CHANGED - fired when navigation stack changes
	 *		stack - updated navigation stack
	 *
	 * @class Navi
	 * @extends Bindable
	 * @constructor
	 * @module Core
	 */
	var Navi = function() {
		this._stack = [];
		this._naviCounter = 0;
		this._module = null;
	};

	Navi.prototype = new Bindable();

	/**
	 * Event types.
	 *
	 * @event
	 * @param {Object} Event
	 * @param {String} Event.PRE_NAVIGATE Triggered just before navigation
	 * @param {String} Event.POST_NAVIGATE Triggered just after navigation
	 * @param {String} Event.PRE_PARTIAL Triggered just before opening partial
	 * @param {String} Event.POST_PARTIAL Triggered just after opening partial
	 * @param {String} Event.STACK_CHANGED Called when navigation stack updates
	 * @param {String} Event.SLEEP Called on scope when action is put to sleep
	 * @param {String} Event.WAKEUP Called on scope when action is awaken
	 * @param {String} Event.EXIT Called on scope when action is killed
	 */
	Navi.prototype.Event = {
		PRE_NAVIGATE: 'pre-navigate',
		POST_NAVIGATE: 'post-navigate',
		PRE_PARTIAL: 'pre-partial',
		POST_PARTIAL: 'post-partial',
		STACK_CHANGED: 'stack-changed',
		SLEEP: 'sleep',
		WAKEUP: 'wakeup',
		EXIT: 'exit'
	};

	/**
	 * Initiates the component.
	 *
	 * @method init
	 * @return {Navi} Self
	 */
	Navi.prototype.init = function() {
		var self = this;

		keyboard.bind([keyboard.Event.KEYDOWN, keyboard.Event.KEYUP], function(e) {
			self._onKeyEvent(e.info);
		});

		mouse.bind([mouse.Event.MOUSEDOWN, mouse.Event.MOUSEUP, mouse.Event.MOUSEMOVE], function(e) {
			self._onMouseEvent(e.info);
		});

		return this;
	};

	/**
	 * Sets the angular app module to use.
	 *
	 * @method setModule
	 * @param {angular.Module} module Module to use
	 * @return {Navi} Self
	 */
	Navi.prototype.setModule = function(module) {
		this._module = module;

		return this;
	};

	/**
	 * Navigates to a module action.
	 *
	 * By default the action is opened in container defined by the configuration property viewSelector.
	 *
	 * @method open
	 * @param {String} module Module to open
	 * @param {String} [action=index] Action to navigate to
	 * @param {Object} [parameters] Action parameters
	 * @return {Navi} Self
	 */
	Navi.prototype.open = function(module, action, parameters) {
		action = action || 'index';
		parameters = parameters || [];

		var self = this,
			deferred = new Deferred(),
			className = util.convertEntityName(module) + 'Module',
			actionName = util.convertCallableName(action) + 'Action',
			moduleCssFilename = 'modules/' + module + '/style/' + module + '-module.css',
			viewFilename = 'modules/' + module + '/views/' + module + '-' + action + '.html',
			body = $(document.body),
			item = null;

		this.fire({
			type: this.Event.PRE_NAVIGATE,
			module: module,
			action: action,
			parameters: parameters
		});

		body.addClass('loading-view');

		util.when(
			resourceManager.loadModule(module),
			resourceManager.loadView(viewFilename),
			resourceManager.loadCss(moduleCssFilename)
		).done(function(moduleObj, viewContent) {
			item = self._showView(
				module,
				action,
				className,
				actionName,
				parameters,
				moduleObj,
				viewContent,
				function() {
					self.fire({
						type: self.Event.POST_NAVIGATE,
						module: module,
						action: action,
						parameters: parameters
					});

					body.removeClass('loading-view');

					deferred.resolve(item);

					app.validate();
				}
			);
		}).fail(function() {
			throw new Error('Loading module "' + module + '" resources failed');
		});

		return deferred.promise();
	};

	/**
	 * Opens a partial view.
	 *
	 * Partials can be used to load module actions in any container to display main menu etc.
	 *
	 * @method partial
	 * @param {String} containerSelector Container selector
	 * @param {String} module Module to open
	 * @param {String} [action=index] Action to navigate to
	 * @param {Object} [parameters] Action parameters
	 * @return {Navi} Self
	 */
	Navi.prototype.partial = function(containerSelector, module, action, parameters) {
		action = action || 'index';
		parameters = parameters || [];

		var self = this,
			deferred = new Deferred(),
			className = util.convertEntityName(module) + 'Module',
			actionName = util.convertCallableName(action) + 'Action',
			moduleCssFilename = 'modules/' + module + '/style/' + module + '-module.css',
			viewFilename = 'modules/' + module + '/views/' + module + '-' + action + '.html',
			body = $(document.body),
			item = null,
			container;

		this.fire({
			type: this.Event.PRE_PARTIAL,
			containerSelector: containerSelector,
			module: module,
			action: action,
			parameters: parameters
		});

		body.addClass('loading-partial');

		util.when(
			resourceManager.loadModule(module),
			resourceManager.loadView(viewFilename),
			resourceManager.loadCss(moduleCssFilename)
		).done(function(moduleObj, viewContent) {
			container = $(containerSelector);

			if (container.length === 0) {
				throw new Error('Partial container for "' + containerSelector + '" not found');
			}

			item = self._showPartial(
				module,
				action,
				className,
				actionName,
				parameters,
				moduleObj,
				viewContent,
				container
			);

			self.fire({
				type: self.Event.POST_PARTIAL,
				containerSelector: containerSelector,
				module: module,
				action: action,
				parameters: parameters
			});

			body.removeClass('loading-partial');

			deferred.resolve(item);
		}).fail(function() {
			throw new Error('Loading module "' + module + '" resources failed');
		});

		return deferred.promise();
	};

	/**
	 * Navigates back to previous action.
	 *
	 * @method back
	 */
	Navi.prototype.back = function() {
		var self = this,
			currentItem = this.getCurrent(),
			previousItem = this.getPrevious();

		if (currentItem === null || previousItem === null) {
			return;
		}

		if (
			previousItem === null
			&& (currentItem.module !== config.index.module || currentItem.action !== config.index.action)
		) {
			this.open(
				config.index.module,
				config.index.action,
				config.index.parameters
			);

			return;
		}

		this._stack.pop();

		this.fire({
			type: this.Event.STACK_CHANGED,
			stack: this._stack
		});

		previousItem.injector.get('$rootScope').$digest();

		previousItem.fire(this.Event.WAKEUP);

		this.fire({
			type: this.Event.PRE_NAVIGATE,
			module: previousItem.module,
			action: previousItem.action,
			parameters: previousItem.parameters
		});

		var currentWrap = $('#content-' + currentItem.id),
			newWrap = $('#content-' + previousItem.id);

		ui.transitionView(currentWrap, newWrap, true, function() {
			currentItem.fire(self.Event.EXIT);
			currentItem.injector.get('$rootScope').$emit('$destroy');

			if (currentWrap.length > 0) {
				currentWrap.remove();
			}

			self.fire({
				type: self.Event.POST_NAVIGATE,
				module: previousItem.module,
				action: previousItem.action,
				parameters: previousItem.parameters
			});

			app.validate();
		});
	};

	/**
	 * Returns currently active action info.
	 *
	 * @method getCurrent
	 * @return {Object|null}
	 */
	Navi.prototype.getCurrent = function() {
		if (this._stack.length === 0) {
			return null;
		}

		return this._stack[this._stack.length - 1];
	};

	/**
	 * Returns previously active action info.
	 *
	 * @method getPrevious
	 * @return {Object|null}
	 */
	Navi.prototype.getPrevious = function() {
		if (this._stack.length < 2) {
			return null;
		}

		return this._stack[this._stack.length - 2];
	};

	/**
	 * Returns whether there is any page to go back to.
	 *
	 * @method isBackPossible
	 * @return {Boolean}
	 */
	Navi.prototype.isBackPossible = function() {
		return this._stack.length >= 2;
	};

	/**
	 * Clears navigation history.
	 *
	 * @method clearHistory
	 */
	Navi.prototype.clearHistory = function() {
		this._stack = [];

		this.fire({
			type: this.Event.STACK_CHANGED,
			stack: this._stack
		});
	};


	/**
	 * Returns already open matching navi item if available.
	 *
	 * @method getExistingItem
	 * @param {String} module Module name
	 * @param {String} action Action name
	 * @return {Object|null} Navi info or null if not exists
	 */
	Navi.prototype.getExistingItem = function(module, action) {
		var i,
			item;

		for (i = 0; i < this._stack.length; i++) {
			item = this._stack[i];

			if (item.module === module && item.action === action) {
				return item;
			}
		}

		return null;
	};

	/**
	 * Renders module action view.
	 *
	 * @method _showView
	 * @param {String} module Name of the module
	 * @param {String} action Name of the action
	 * @param {String} className Class name of the module
	 * @param {String} actionName Method name of the action
	 * @param {Array} parameters Action parameters
	 * @param {Object} moduleObj Module object
	 * @param {String} viewContent View content to render
	 * @param {Function} doneCallback Callback to call when done
	 * @private
	 */
	Navi.prototype._showView = function(
		module,
		action,
		className,
		actionName,
		parameters,
		moduleObj,
		viewContent,
		doneCallback
	) {
		var self = this,
			currentItem = this.getCurrent(),
			existingItem = this.getExistingItem(module, action),
			back = false,
			stackItem;

		if (existingItem !== null) {
			while (this._stack.length > 0) {
				stackItem = this._stack.pop();

				if (stackItem === currentItem) {
					continue;
				}

				stackItem.fire(this.Event.EXIT);
				stackItem.injector.get('$rootScope').$emit('$destroy');
				stackItem.container.remove();

				if (stackItem.module === module && stackItem.action === action) {
					break;
				}
			}

			back = true;
		}

		var newItem = this._appendNavigation(module, action, parameters, moduleObj),
			prefix = config.cssPrefix,
			newWrapId = 'content-' + newItem.id,
			container = $(config.viewSelector),
			currentWrap = container.find('.' + prefix + 'page-active'),
			newWrap;

		container.append(
			'<div id="' + newWrapId + '" class="' + prefix + 'page ' + module + '-module ' + action + '-action"></div>'
		);

		newWrap = $('#' + newWrapId)
			.html(viewContent)
			.attr('ng-controller', className + '.' + actionName);

		ui.transitionView(currentWrap, newWrap, back, function() {
			if (back) {
				currentItem.fire(self.Event.EXIT);
				currentItem.container.remove();
			}

			if (util.isFunction(doneCallback)) {
				doneCallback();
			}
		});

		this._module.value('parameters', parameters);
		this._module.controller(className + '.' + actionName, moduleObj[actionName]);

		if (currentItem !== null && back !== true) {
			currentItem.fire(this.Event.SLEEP);
		}

		newItem.container = newWrap;
		newItem.injector = angular.bootstrap(newWrap, ['app']);
		newItem.fire = function(type, parameters) {
			this.injector.get('$rootScope').$broadcast(type, parameters);
		};

		return newItem;
	};

	/**
	 * Displays partial content.
	 *
	 * @method _showPartial
	 * @param {String} module Name of the module
	 * @param {String} action Name of the action
	 * @param {String} className Class name of the module
	 * @param {String} actionName Method name of the action
	 * @param {Array} parameters Action parameters
	 * @param {Object} moduleObj Module object
	 * @param {String} viewContent View content to render
	 * @param {jQuery} container Container to place the content into
	 * @private
	 */
	Navi.prototype._showPartial = function(
		module,
		action,
		className,
		actionName,
		parameters,
		moduleObj,
		viewContent,
		container
	) {
		container
			.html(viewContent)
			.attr('ng-controller', className + '.' + actionName);

		this._module.value('parameters', parameters);
		this._module.controller(className + '.' + actionName, moduleObj[actionName]);

		angular.bootstrap(container, ['app']);
	};

	/**
	 * Pops an item from the end of the navigation stack.
	 *
	 * @method popLastAction
	 * @param {Number} [steps=1] How many steps to jump back
	 * @return {Object} Last action info
	 * @private
	 */
	Navi.prototype._popLastAction = function(steps) {
		steps = steps || 1;

		if (this._stack.length >= 2) {
			for (var i = 0; i < steps; i++) {
				this._removeCurrentAction();
			}

			var last = this._stack.pop();

			this.fire({
				type: this.Event.STACK_CHANGED,
				stack: this._stack
			});

			return last;
		} else {
			return null;
		}
	};

	/**
	 * Removes current item from the end of the navigation stack.
	 *
	 * @method removeCurrentAction
	 * @private
	 */
	Navi.prototype._removeCurrentAction = function() {
		if (this._stack.length >= 1) {
			this._stack.pop();
		}

		this.fire({
			type: this.Event.STACK_CHANGED,
			stack: this._stack
		});
	};

	/**
	 * Append an item to the navigation stack.
	 *
	 * @method _appendNavigation
	 * @param {String} module Name of the module to use
	 * @param {String} action Module action to call, defaults to index
	 * @param {Object} parameters Map of parameters to pass to action
	 * @param {Object} instance Instance of the module
	 * @return {Object} New stack item
	 * @private
	 */
	Navi.prototype._appendNavigation = function(module, action, parameters, instance) {
		this._stack.push({
			id: this._naviCounter++,
			module: module,
			action: action,
			parameters: parameters,
			instance: instance,
			level: this._stack.length,
			container: null
		});

		this.fire({
			type: this.Event.STACK_CHANGED,
			stack: this._stack
		});

		return this._stack[this._stack.length - 1];
	};

	/**
	 * Triggered on key events.
	 *
	 * Passes the key event on to currently active module action controller.
	 *
	 * @method _onKeyEvent
	 * @param {Keyboard.KeyEvent} event Key event
	 * @private
	 */
	Navi.prototype._onKeyEvent = function(event) {
		var currentItem = this.getCurrent();

		if (currentItem === null) {
			return;
		}

		currentItem.fire(event.type, event);
	};

	/**
	 * Triggered on mouse events.
	 *
	 * Passes the key event on to currently active module action controller.
	 *
	 * @method _onMouseEvent
	 * @param {Mouse.MouseEvent} event Key event
	 * @private
	 */
	Navi.prototype._onMouseEvent = function(event) {
		var currentItem = this.getCurrent();

		if (currentItem === null) {
			return;
		}

		currentItem.fire(event.type, event);
	};

	return new Navi();
});