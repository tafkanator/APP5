require.config({
	baseUrl: 'src',
	paths: {
		lib: '../lib',
		modules: '../modules',
		config: '../config',
		underscore: '../lib/underscore/underscore',
		jquery: 'empty:'
	},
	shim: {
		underscore: {
			exports: '_'
		}
	}
});

require(
	['Bootstrapper'],
	function(bootstrapper) {
		"use strict";
		bootstrapper.bootstrap();
	}
);