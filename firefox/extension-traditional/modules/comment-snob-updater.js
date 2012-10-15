Components.utils.import("resource://comment-snob-modules/comment-snob-minify.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-util.js");

var COMMENT_SNOB_UPDATER = {
	loadStack : 0,
	updateTimer : null,
	
	load : function () {
		COMMENT_SNOB_UPDATER.loadStack++;
		
		if (COMMENT_SNOB_UPDATER.loadStack == 1) {
			if (COMMENT_SNOB_UTIL.prefs.getCharPref("lastRuleUpdate") < (new Date().getTime() - (1000 * 60 * 60 * 24 * 3))) {
				COMMENT_SNOB_UTIL.prefs.setCharPref("lastRuleUpdate", (new Date().getTime()));
				COMMENT_SNOB_UPDATER.updateTimer = COMMENT_SNOB_UPDATER.setTimeout(COMMENT_SNOB_UPDATER.updateRules, 3000);
			}
			else {
				COMMENT_SNOB_UPDATER.updateTimer = COMMENT_SNOB_UPDATER.setTimeout(COMMENT_SNOB_UPDATER.updateRules, 1000 * 60 * 60 * 24 * 3);
			}
		}
	},

	unload : function () {
		COMMENT_SNOB_UPDATER.loadStack--;
		
		if (COMMENT_SNOB_UPDATER.loadStack == 0) {
			COMMENT_SNOB_UPDATER.clearTimeout(COMMENT_SNOB_UPDATER.updateTimer);
		}
	},
	
	setTimeout : function (callback, timeout, arg1, arg2, arg3, arg4) {
		var cb = {
			notify : function (timer) {
				callback(arg1, arg2, arg3, arg4);
			}
		};
		
		var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		timer.initWithCallback(cb, timeout, timer.TYPE_ONE_SHOT);
		return timer;
	},
	
	clearTimeout : function (timer) {
		if (timer) {
			timer.cancel();
		}
	},
	
	updateRules : function () {
		COMMENT_SNOB_UPDATER.clearTimeout( COMMENT_SNOB_UPDATER.updateTimer );
		COMMENT_SNOB_UPDATER.updateTimer = COMMENT_SNOB_UPDATER.setTimeout(COMMENT_SNOB_UPDATER.updateRules, 1000 * 60 * 60 * 24 * 3);
		
		var rules = COMMENT_SNOB_UTIL.prefs.getJSONPref("rules", {});
		
		for ( var ruleId in rules ) {
			if ( "updateURL" in rules[ruleId] ) {
				COMMENT_SNOB_UPDATER.updateRule( rules[ruleId] );
			}
		}
	},
	
	updateRule : function ( rule, callback ) {
		var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
		req.open( "GET", rule.updateURL, true );
		
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				var text = req.responseText;

				if ( ! text ) {
					if ( callback ) {
						callback( { status : false } );
					}
					
					return;
				}

				text = COMMENT_SNOB_MINIFY( text );
				
				try {
					var json = JSON.parse( text );
				} catch ( ex ) {
					if ( callback ) {
						callback( { status : false, msg : 'invalid_rule', msgDebug : [ text ] } );
					}
					
					return;
				}
				
				if ( ! json ) {
					if ( callback ) {
						callback ( { status : false } );
					}
					
					return;
				}
				
				if ( json.id == rule.id ) {
					COMMENT_SNOB_UTIL.addRule( json );
					
					if ( callback ) {
						callback( { status : true, rule : json } );
					}
				}
				else if ( callback ) {
					callback ( { status : false, msg : 'invalid_rule_id' } );
				}
			}
		};
		
		req.send( null );
	}
};
	
var EXPORTED_SYMBOLS = [ "COMMENT_SNOB_UPDATER" ];