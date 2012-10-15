Components.utils.import("resource://comment-snob-modules/comment-snob-minify.js");

var COMMENT_SNOB_UTIL = {
	youtubeRule : {
		"id": "youtube@chrisfinke.com",
		"label": "YouTube",
		"url": "^http://www\\.youtube\\.com/.*$",
		"allCommentsSelector": "#comments-view",
		"commentContainerSelector": "li.comment",
		"commentTextSelector": "div.comment-text",
		"commentHideSelector": "> div",
		"statusElementTag": "div",
		"statusElementAttributes": {
			"class": "content",
			"style": "color: #666;"
		},
		"ajaxInitiatorSelector": ".comments-pagination button, .comments-pagination a, .comments-pagination button > span",
		"updateURL": "http://www.chrisfinke.com/comment-snob/rules/youtube.snob"
	},
	
	prefs : Components.classes["@mozilla.org/preferences-service;1"].getService( Components.interfaces.nsIPrefService ).getBranch( "extensions.youtube-comment-snob." ),

	get defaultPrefs() {
		return {
			"allcaps" : COMMENT_SNOB_UTIL.prefs.getBoolPref("allcaps"),
			"nocaps" : COMMENT_SNOB_UTIL.prefs.getBoolPref("nocaps"),
			"punctuation" : COMMENT_SNOB_UTIL.prefs.getBoolPref("punctuation"),
			"startsWithCapital" : COMMENT_SNOB_UTIL.prefs.getBoolPref("startsWithCapital"),
			"excessiveCapitals" : COMMENT_SNOB_UTIL.prefs.getBoolPref("excessiveCapitals"),
			"profanity" : COMMENT_SNOB_UTIL.prefs.getBoolPref("profanity"),
			"extreme" : COMMENT_SNOB_UTIL.prefs.getBoolPref("extreme"),
			"mistakes" : COMMENT_SNOB_UTIL.prefs.getIntPref("mistakes"),
			"keywords" : COMMENT_SNOB_UTIL.prefs.getCharPref("keywords"),
			"dictionary" : COMMENT_SNOB_UTIL.prefs.getCharPref("dictionary")
		};
	},
	
	getJSONPref : function (prefName, defaultValue) {
		var rv = COMMENT_SNOB_UTIL.prefs.getCharPref(prefName);

		if (!rv) {
			return defaultValue;
		}
		else {
			return JSON.parse(rv);
		}
	},
	
	setJSONPref : function (prefName, prefVal) {
		var stringPrefVal = JSON.stringify(prefVal);

		COMMENT_SNOB_UTIL.prefs.setCharPref(prefName, stringPrefVal);
	},
	
	addRule : function (rule) {
		var rv = { "status" : false };

		if ( typeof rule == 'object' )
			rule = JSON.stringify( rule );

		rule = COMMENT_SNOB_MINIFY( rule );
		
		if ( ! rule ) {
			rv.msg = 'empty_rule';
			return rv;
		}
		
		try {
			rule = JSON.parse( rule );
		} catch ( ex ) {
			rv.msg = 'invalid_rule';
			rv.msgDebug = [ rule ];
			return rv;
		}
		
		var required_parameters = [ "id", "label", "url", "allCommentsSelector", "commentContainerSelector" ];
		
		for (var i = 0, _len = required_parameters.length; i < _len; i++) {
			if (!(required_parameters[i] in rule)) {
				rv.status = false;
				rv.msg = 'missing_attribute';
				rv.msgArgs = [ required_parameters[i] ];
				return rv;
			}
		}
		
		var rules = COMMENT_SNOB_UTIL.getJSONPref("rules", {});
		rules[rule.id] = rule;
		
		COMMENT_SNOB_UTIL.setJSONPref("rules", rules);
		
		rv.status = true;
		rv.rule = rule;
		return rv;
	},
	
	removeRule : function (ruleId) {
		var rules = COMMENT_SNOB_UTIL.getJSONPref("rules", {});
		
		if (ruleId in rules) {
			delete rules[ruleId];
			COMMENT_SNOB_UTIL.setJSONPref("rules", rules);
		}
		
		COMMENT_SNOB_UTIL.removeRulePrefs(ruleId);
	},
	
	getRulePrefs : function (ruleId) {
		var prefs = COMMENT_SNOB_UTIL.getJSONPref("rulePrefs", {});
		
		if (!(ruleId in prefs)) {
			return COMMENT_SNOB_UTIL.defaultPrefs;
		}
		else {
			return prefs[ruleId];
		}
	},
	
	removeRulePrefs : function (ruleId) {
		var prefs = COMMENT_SNOB_UTIL.getJSONPref("rulePrefs", {});
		
		if (ruleId in prefs) {
			delete prefs[ruleId];
			COMMENT_SNOB_UTIL.setJSONPref("rulePrefs", prefs);
		}
	},
	
	log : function (m) {
		var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		consoleService.logStringMessage("Comment Snob: " + m);
	}
};

var EXPORTED_SYMBOLS = [ "COMMENT_SNOB_UTIL" ];
