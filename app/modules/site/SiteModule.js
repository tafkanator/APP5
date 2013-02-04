define(
['models/MainMenu'],
function(menus) {
	'use strict';

	/**
	 * Site module.
	 *
	 * @class SiteModule
	 * @constructor
	 * @module Modules
	 */
	return {

		/**
		 * Displays main menu.
		 *
		 * @method mainMenuAction
		 * @param {Scope} $scope Angular scope
		 * @param {Location} $location Angular location service
		 * @param {Debug} dbg Debugger
		 * @param {Navi} navi Navigation
		 */
		mainMenuAction: function($scope, $location, dbg, navi) {
			$scope.menus = menus;
			$scope.backPossible = false;

			$scope.open = function(index) {
				var current = navi.getCurrent();

				if (menus[index].module === current.module && menus[index].action === current.action) {
					return;
				}

				navi.open(
					menus[index].module,
					menus[index].action || 'index',
					menus[index].parameters || []
				);
			};

			navi.bind(navi.Event.STACK_CHANGED, function() {
				var page = navi.getCurrent();

				menus.markActive(page.module, page.action);

				$scope.backPossible = navi.isBackPossible();

				if ($scope.$$phase === null) {
					$scope.$digest();
				}
			});

			$scope.$watch(function () {
				return $location.absUrl();
			}, function() {
				var parameters = $location.search(),
					current = navi.getCurrent();

				if (
					current !== null
					&& (parameters.module !== current.module || parameters.action !== current.action)
				) {
					navi.open(
						parameters.module,
						parameters.action
					);
				}
			});
		}
	};
});