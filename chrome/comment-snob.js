var COMMENT_SNOB = {
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
	
	get defaultPrefs() {
		return {
			"allcaps" : COMMENT_SNOB.prefs.getBoolPref("allcaps"),
			"nocaps" : COMMENT_SNOB.prefs.getBoolPref("nocaps"),
			"punctuation" : COMMENT_SNOB.prefs.getBoolPref("punctuation"),
			"startsWithCapital" : COMMENT_SNOB.prefs.getBoolPref("startsWithCapital"),
			"excessiveCapitals" : COMMENT_SNOB.prefs.getBoolPref("excessiveCapitals"),
			"profanity" : COMMENT_SNOB.prefs.getBoolPref("profanity"),
			"extreme" : COMMENT_SNOB.prefs.getBoolPref("extreme"),
			"mistakes" : COMMENT_SNOB.prefs.getIntPref("mistakes")
			
		};
	},
	
	prefs : {
		namespace : "extensions.youtube-comment-snob.",
		
		_observers : {},
		
		addObserver : function (observer) {
			var key = Math.random();
			
			this._observers[key] = observer;
		},
		
		removeObserver : function (key) {
			delete this._observers[key];
		},
		
		getPref : function (prefName) {
			var key = this.namespace + prefName;
			
			if (key in localStorage) {
				return localStorage[this.namespace + prefName];
			}
			else {
				return null;
			}
		},

		getBoolPref : function (prefName) {
			var rv = this.getPref(prefName);

			if (!rv || rv == "false" || rv == "null") {
				return false;
			}

			return true;
		},

		getCharPref : function (prefName) {
			var rv = this.getPref(prefName);
			
			if (typeof rv == 'undefined' || rv == "null") {
				rv = "";
			}

			return rv;
		},
		
		getIntPref : function (prefName) {
			var rv = this.getPref(prefName);
			
			if (typeof rv == 'undefined' || rv == "null") {
				rv = 0;
			}
			else {
				rv = parseInt(rv, 10);
			}

			return rv;
		},
		
		getJSONPref : function (prefName, defaultValue) {
			var rv = this.getCharPref(prefName);
			
			if (!rv) {
				return defaultValue;
			}
			else {
				return JSON.parse(rv);
			}
		},
		
		setPref : function (prefName, prefVal) {
			var existing = this.getPref(prefName);
			
			if (existing !== prefVal) {
				if (typeof prefVal == 'undefined' || prefVal === null) {
					prefVal = "";
				}
				
				localStorage[this.namespace + prefName] = prefVal;
				
				for (var i in this._observers) {
					this._observers[i].observe(null, "nsPref:changed", prefName);
				}
			}
		},

		setCharPref : function (prefName, prefVal) {
			this.setPref(prefName, prefVal);
		},
		
		setIntPref : function (prefName, prefVal) {
			this.setPref(prefName, prefVal.toString());
		},
		
		setJSONPref : function (prefName, prefVal) {
			var stringPrefVal = JSON.stringify(prefVal);
			
			this.setCharPref(prefName, stringPrefVal);
		},
		
		setBoolPref : function (prefName, prefVal) {
			this.setPref(prefName, !!prefVal);
		}
	},
	
	localize : function (page) {
		$(page).find("i18n").each(function () {
			var $this = $(this);

			var string = chrome.i18n.getMessage($this.attr("data-key"));

			if (string) {
				$this.replaceWith(string);
			}
		});

		$(page).find(".i18n").each(function () {
			var $this = $(this);

			var string = chrome.i18n.getMessage($this.attr("data-key"));

			if (string) {
				$this.text(string);
			}
		});
	},
	
	load : function () {
		function pref(name, val) {
			if (COMMENT_SNOB.prefs.getPref(name) === null) {
				COMMENT_SNOB.prefs.setPref(name, val);
			}
		}
		
		pref("firstrun", true);
		pref("allcaps", true);
		pref("nocaps", true);
		pref("punctuation", true);
		pref("startsWithCapital", true);
		pref("excessiveCapitals", true);
		pref("profanity", false);
		pref("extreme", false);
		pref("mistakes", 2);
		
		if (COMMENT_SNOB.prefs.getBoolPref("firstrun")) {
			// Add the YouTube rule.
			COMMENT_SNOB.addRule(COMMENT_SNOB.youtubeRule);
			COMMENT_SNOB.prefs.setBoolPref("firstrun", false);
		}
	},
	
	addRule : function (rule) {
		var rv = { "status" : true };
		
		var required_parameters = [ "id", "label", "url", "allCommentsSelector", "commentContainerSelector" ];
		
		for (var i = 0, _len = required_parameters.length; i < _len; i++) {
			if (!(required_parameters[i] in rule)) {
				rv.status = false;
				rv.msg = "Rule is missing '" + required_parameters[i] + "' attribute.";
				return rv;
			}
		}
		
		var rules = COMMENT_SNOB.prefs.getJSONPref("rules", {});
		rules[rule.id] = rule;
		
		COMMENT_SNOB.prefs.setJSONPref("rules", rules);
		
		return rv;
	},
	
	removeRule : function (ruleId) {
		var rules = COMMENT_SNOB.prefs.getJSONPref("rules", {});
		
		if (ruleId in rules) {
			delete rules[ruleId];
			COMMENT_SNOB.prefs.setJSONPref("rules", rules);
		}
		
		COMMENT_SNOB.removeRulePrefs(ruleId);
	},
	
	getAllRulePrefs : function () {
		return COMMENT_SNOB.prefs.getJSONPref("rulePrefs", {});
	},
	
	getRulePrefs : function (ruleId) {
		var prefs = COMMENT_SNOB.prefs.getJSONPref("rulePrefs", {});
		
		if (!(ruleId in prefs)) {
			return COMMENT_SNOB.defaultPrefs;
		}
		else {
			return prefs[ruleId];
		}
	},
	
	removeRulePrefs : function (ruleId) {
		var prefs = COMMENT_SNOB.prefs.getJSONPref("rulePrefs", {});
		
		if (ruleId in prefs) {
			delete prefs[ruleId];
			COMMENT_SNOB.prefs.setJSONPref("rulePrefs", prefs);
		}
	}
};