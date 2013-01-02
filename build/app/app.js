define("BaseEvent",[],function(){var e=function(){this.listeners={}};return e.prototype.bind=function(e,t){typeof e=="string"&&(e=[e]);for(var n=0;n<e.length;n++){typeof this.listeners[e[n]]=="undefined"&&(this.listeners[e[n]]=[]);for(var r=0;r<this.listeners[e[n]].length;r++)if(this.listeners[e[n]][r]===t)return t;this.listeners[e[n]].push(t)}return t},e.prototype.unbind=function(e,t){if(typeof this.listeners[e]=="undefined")return!1;for(var n=0;n<this.listeners[e].length;n++)if(this.listeners[e][n]===t)return this.listeners[e].splice(n,1),!0;return!1},e.prototype.fire=function(e){typeof e=="string"&&(e={type:e}),typeof e.target=="undefined"&&(e.target=this);if(typeof e.type=="undefined")throw'Event "type" attribute is missing';var t=!0;if(typeof this.listeners[e.type]=="object")for(var n=0;n<this.listeners[e.type].length;n++)this.listeners[e.type][n].call(this,e)===!1&&(t=!1);return t},e.prototype.numEventListeners=function(e){return typeof this.listeners[e]=="undefined"?0:this.listeners[e].length},e.prototype.clearListeners=function(e){typeof e=="undefined"?this.listeners={}:this.listeners[e]=[]},e.prototype.getListeners=function(e){return typeof e=="string"?typeof this.listeners[e]!="undefined"?this.listeners[e]:null:this.listeners},e}),define("Util",[],function(){return{getDate:function(){return new Date},microtime:function(){return this.getDate().getTime()/1e3}}}),define("Debug",["BaseEvent","Util"],function(e,t){var n=function(){this.messages=[],this.boxes={},this.boxCount=0,this.boxLifetime=1,this.queue={error:[],screen:[],console:[],alert:[]},this.loggedErrors=[];var e=this,t=window.alert;window.alert=function(n){e.alert(n)!==!1&&t(n)}};return n.prototype=new e,n.prototype.Event={ERROR:"error",CONSOLE:"console",SCREEN:"screen",ALERT:"alert"},n.prototype.init=function(){},n.prototype.error=function(e){this.queue.error.push(e);if(this.numEventListeners(this.Event.ERROR)===0)return;while(this.queue.error.length>0)this.fire({type:this.Event.ERROR,message:this.queue.error.shift()})},n.prototype.screen=function(){this.queue.screen.push(arguments);if(this.numEventListeners(this.Event.SCREEN)===0)return;while(this.queue.screen.length>0)this.fire({type:this.Event.SCREEN,args:this.queue.screen.shift()})},n.prototype.alert=function(e){this.queue.alert.push(e);if(this.numEventListeners(this.Event.ALERT)===0)return;var t=!0,n;while(this.queue.alert.length>0)n=this.fire({type:this.Event.ALERT,message:this.queue.alert.shift()}),n===!1&&(t=!1);return t},n.prototype.console=function(){this.queue.console.push(arguments);if(this.numEventListeners(this.Event.CONSOLE)===0)return;while(this.queue.console.length>0)this.fire({type:this.Event.CONSOLE,args:this.queue.console.shift()})},new n}),define("ResourceManager",["BaseEvent"],function(e){var t=function(){};return t.prototype=new e,t.prototype.Event={},t.prototype.init=function(){},new t}),define("Navi",["BaseEvent","Debug","Util"],function(e,t,n){var r=null,i=function(){};return i.prototype=new e,i.prototype.init=function(){},i.prototype.open=function(e){r=e},i.prototype.getActiveModule=function(){return r},new i}),define("UI",["jquery","BaseEvent","Debug","Navi"],function(e,t,n,r){var i=function(){};return i.prototype=new t,i.prototype.init=function(){var t=this;this.initDebugListeners(),e(document).ready(function(){t.onDocumentReady()})},i.prototype.initDebugListeners=function(){n.bind(n.Event.CONSOLE,function(e){console.log("CONSOLE",e)})},i.prototype.onDocumentReady=function(){e(document.body).css("background-color","#F00")},new i}),define("Bootstrapper",["Debug","ResourceManager","UI","Navi"],function(e,t,n,r){var i=function(){};return i.prototype.bootstrap=function(){e.init(),t.init(),n.init(),r.init()},new i}),require.config({baseUrl:"app/src",paths:{lib:"../../lib",modules:"../modules",config:"../config",underscore:"../../lib/underscore/underscore",jquery:"empty:"},shim:{underscore:{exports:"_"}}}),require(["Bootstrapper"],function(e){e.bootstrap()}),define("../app",[],function(){});