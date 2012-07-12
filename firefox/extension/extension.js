var EXTENSION = {
	localesPath : "chrome://comment-snob/content/",

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
			"allcaps" : EXTENSION.prefs.getBoolPref("allcaps"),
			"nocaps" : EXTENSION.prefs.getBoolPref("nocaps"),
			"punctuation" : EXTENSION.prefs.getBoolPref("punctuation"),
			"startsWithCapital" : EXTENSION.prefs.getBoolPref("startsWithCapital"),
			"excessiveCapitals" : EXTENSION.prefs.getBoolPref("excessiveCapitals"),
			"profanity" : EXTENSION.prefs.getBoolPref("profanity"),
			"extreme" : EXTENSION.prefs.getBoolPref("extreme"),
			"mistakes" : EXTENSION.prefs.getIntPref("mistakes"),
			"keywords" : EXTENSION.prefs.getCharPref("keywords")
		};
	},
	
	prefs : {
		namespace : "extensions.comment-snob.",

		_observers : {},

		addObserver : function (observer) {
			var key = Math.random();

			this._observers[key] = observer;
		},

		removeObserver : function (key) {
			delete this._observers[key];
		},

		getPref : function (prefName, defaultVal) {
			var key = this.namespace + prefName;

			if (typeof Components != 'undefined') {
				var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(this.namespace);

				try {
					return prefs.getComplexValue(prefName, Components.interfaces.nsISupportsString).data;
				} catch (e) {
					if (defaultVal)
						return defaultVal;
					
					return null;
				}
			}
			else {
				if (key in localStorage) {
					return localStorage[this.namespace + prefName];
				}
				else {
					if (defaultVal)
						return defaultVal;
					
					return null;
				}
			}
		},

		getBoolPref : function (prefName) {
			var rv = this.getPref(prefName);

			if (!rv || rv == "false" || rv == "null") {
				return false;
			}

			return true;
		},

		getCharPref : function (prefName, defaultVal) {
			var rv = this.getPref(prefName, defaultVal);

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

				if (typeof Components != 'undefined') {
					var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(this.namespace);

					var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
					str.data = prefVal;

					try {
						prefs.setComplexValue(prefName, Components.interfaces.nsISupportsString, str);
					} catch (e) {
					}
				}
				else {
					localStorage[this.namespace + prefName] = prefVal;
				}

				if ( "observe" in EXTENSION )
					EXTENSION.observe(null, "nsPref:changed", prefName);

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
		$(page).find("*[data-key]").each(function () {
			var $this = $(this);

			var string = __($this.attr("data-key"));

			if (string) {
				$this.text(string);
			}
		});

		$(page).find("*[data-key-label]").each(function () {
			var $this = $(this);

			var string = __($this.attr("data-key-label"));

			if (string) {
				$this.attr('label', string);
			}
		});
	},
	
	startup : function () {
		function pref(name, val) {
			if (EXTENSION.prefs.getPref(name) === null) {
				EXTENSION.prefs.setPref(name, val);
			}
		}
		
		pref("firstrun", true);
		
		if (EXTENSION.prefs.getBoolPref("firstrun")) {
			/* Transfer any settings from YouTube Comment Snob */
			var ytCommentSnobPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.youtube-comment-snob.");
			
			try { pref("allcaps", ytCommentSnobPrefs.getBoolPref("allcaps")); } catch ( notDefined ) { log(notDefined);  }
			try { pref("nocaps", ytCommentSnobPrefs.getBoolPref("nocaps")); } catch ( notDefined ) { log(notDefined);  }
			try { pref("punctuation", ytCommentSnobPrefs.getBoolPref("punctuation")); } catch ( notDefined ) { log(notDefined);  }
			try { pref("startsWithCapital", ytCommentSnobPrefs.getBoolPref("startsWithCapital")); } catch ( notDefined ) { log(notDefined);  }
			try { pref("excessiveCapitals", ytCommentSnobPrefs.getBoolPref("excessiveCapitals")); } catch ( notDefined ) { log(notDefined);  }
			try { pref("profanity", ytCommentSnobPrefs.getBoolPref("profanity")); } catch ( notDefined ) {  log(notDefined); }
			try { pref("extreme", ytCommentSnobPrefs.getBoolPref("extreme")); } catch ( notDefined ) { log(notDefined);  }
			try { pref("mistakes", ytCommentSnobPrefs.getIntPref("mistakes")); } catch ( notDefined ) {  log(notDefined); }
			try { pref("dictionary", ytCommentSnobPrefs.getCharPref("dictionary")); } catch ( notDefined ) { log(notDefined);  }
		}
		
		pref("allcaps", true);
		pref("nocaps", true);
		pref("punctuation", true);
		pref("startsWithCapital", true);
		pref("excessiveCapitals", true);
		pref("profanity", false);
		pref("extreme", false);
		pref("mistakes", 2);
		
		if (EXTENSION.prefs.getBoolPref("firstrun")) {
			// Add the YouTube rule.
			EXTENSION.addRule(EXTENSION.youtubeRule);
			EXTENSION.prefs.setBoolPref("firstrun", false);
		}
		
		EXTENSION.loadDictionary();
	},
	
	shutdown : function () {
		EXTENSION.dictionary = null;
		
		clearTimeout( EXTENSION.refilterTimeout );
		clearTimeout( EXTENSION.dynamicFilterTimeout );
	},
	
	load : function ( win ) {
		if ( isNativeUI() ) {
		}
		else {
			win.gBrowser.tabContainer.addEventListener( "TabSelect", EXTENSION.contentChange, false );

			var firefoxBrowser = win.document.getElementById("appcontent");

			if (firefoxBrowser) {
				firefoxBrowser.addEventListener("DOMContentLoaded", EXTENSION.contentChange, false);
				
				firefoxBrowser.addEventListener("click", EXTENSION.contentClick, false);
			}
			
			Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript('chrome://comment-snob/content/jquery-1.7.2.min.js', win);
			win.snobQuery = win.$.noConflict();
		}
	},

	unload : function ( win ) {
		if ( isNativeUI() ) {
		}
		else {
			delete win.snobQuery;
			
			var firefoxBrowser = win.document.getElementById("appcontent");

			if (firefoxBrowser) {
				firefoxBrowser.removeEventListener("click", EXTENSION.contentClick, false);
				
				firefoxBrowser.removeEventListener("DOMContentLoaded", EXTENSION.contentChange, false);
			}

			win.gBrowser.tabContainer.removeEventListener( "TabSelect", EXTENSION.contentChange, false );
		}
	},

	contentClick : function (e) {
		if (e.originalTarget.getAttribute("href") && e.originalTarget.getAttribute('href').match(/\.snob(\?.*)?$/i)) {
			e.preventDefault();
			
			EXTENSION.showInstallBar(
				{ href : e.originalTarget.getAttribute('href') }
			);
		}
	},

	loadDictionary : function () {
		var spellclass = "@mozilla.org/spellchecker/myspell;1";
		
		if ("@mozilla.org/spellchecker/hunspell;1" in Components.classes) {
			spellclass = "@mozilla.org/spellchecker/hunspell;1";
		}
		
		if ("@mozilla.org/spellchecker/engine;1" in Components.classes) {
			spellclass = "@mozilla.org/spellchecker/engine;1";
		}
		
		var spellchecker = Components.classes[spellclass].createInstance(Components.interfaces.mozISpellCheckingEngine);
		
		try {
			spellchecker.dictionary = this.prefs.getCharPref("dictionary", "en-US");
			this.dictionary = spellchecker;
		} catch (e) {
			// Dictionary not available.
			this.dictionary = null;
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
		
		var rules = EXTENSION.prefs.getJSONPref("rules", {});
		rules[rule.id] = rule;
		
		EXTENSION.prefs.setJSONPref("rules", rules);
		
		return rv;
	},
	
	removeRule : function (ruleId) {
		var rules = EXTENSION.prefs.getJSONPref("rules", {});
		
		if (ruleId in rules) {
			delete rules[ruleId];
			EXTENSION.prefs.setJSONPref("rules", rules);
		}
		
		EXTENSION.removeRulePrefs(ruleId);
	},
	
	getAllRulePrefs : function () {
		return EXTENSION.prefs.getJSONPref("rulePrefs", {});
	},
	
	getRulePrefs : function (ruleId) {
		var prefs = EXTENSION.prefs.getJSONPref("rulePrefs", {});
		
		if (!(ruleId in prefs)) {
			return EXTENSION.defaultPrefs;
		}
		else {
			return prefs[ruleId];
		}
	},
	
	removeRulePrefs : function (ruleId) {
		var prefs = EXTENSION.prefs.getJSONPref("rulePrefs", {});
		
		if (ruleId in prefs) {
			delete prefs[ruleId];
			EXTENSION.prefs.setJSONPref("rulePrefs", prefs);
		}
	},
	
	contentChange : function () {
		var browserWin = Services.wm.getMostRecentWindow( "navigator:browser" );
		var page = browserWin.content.document;

		// Check for any rules.
		if (page.location.href.match(/\.snob(\?.*)?$/i)) {
			var rule = minify( page.body.textContent );

			try {
				var jsonRule = JSON.parse(rule);
			} catch (e) { 
				return;
			}

			EXTENSION.showInstallBar(
				{ rule : jsonRule }
			);
		}

		// Filter any comments.
		var rules = EXTENSION.prefs.getJSONPref("rules", {});

		for (var i in rules) {
			var theRule = rules[i];
			
			var regex = new RegExp(rules[i].url, "i");

			if (page.location.href.match(regex)) {
				page.commentSnobRule = theRule;
				
				if ("dynamic" in theRule && theRule["dynamic"]) {
					EXTENSION.filterComments(page);

					browserWin.snobQuery(theRule.allCommentsSelector, page).each(function (idx, el) {
						el.addEventListener("DOMNodeRemoved", EXTENSION.filterDynamicComments, false);
						el.addEventListener("DOMNodeInserted", EXTENSION.filterDynamicComments, false);
					});
					
					page.addEventListener( "unload", function () {
						page.removeEventListener( "unload", arguments.callee, false );
						
						browserWin.snobQuery(theRule.allCommentsSelector, page).each(function (idx, el) {
							el.removeEventListener("DOMNodeRemoved", EXTENSION.filterDynamicComments, false);
							el.removeEventListener("DOMNodeInserted", EXTENSION.filterDynamicComments, false);
						});
					}, false);
				}
				else {
					EXTENSION.filterComments(page);
				}
				
				break;
			}
		}
	},
	
	filterComments : function (page, isRefilter) {
		var browserWindow = Services.wm.getMostRecentWindow( "navigator:browser" );
		var $ = browserWindow.snobQuery;
		
		page.inCommentFilter = true;
		
		var theRule = page.commentSnobRule;
		
		var prefs = EXTENSION.getRulePrefs(theRule.id);

		var allComments = $(theRule.allCommentsSelector, page);

		if (prefs.extreme) {
			allComments.remove();
		}
		else {
			var parsedKeywords = null;
			
			prefs.mistakes = parseInt(prefs.mistakes, 0);
			
			allComments.find(theRule.commentContainerSelector).each(function (idx) {
				var reason = false;
				var $this = $(this);

				if ($this.attr("comment-snob-processed")) {
					return;
				}

				$this.attr("comment-snob-processed", "true");

				if ("commentTextSelector" in theRule) {
					var textContainer = $this.find(theRule.commentTextSelector);
				}
				else {
					var textContainer = $this;
				}

				if (textContainer.length == 0) {
					return;
				}

				var originalText = textContainer.text();
				originalText = originalText.replace(/https?:\/\/[^\s]+\s/g, "");
				originalText = $.trim(originalText);
				originalText = originalText.replace(/@[^\s]+/ig, ""); // Get rid of username references.
				originalText = originalText.replace(/^[^A-Z0-9]+/ig, "");
				originalText = $.trim(originalText);

				if (prefs.allcaps && !originalText.match(/[a-z]/m)){
					reason = __("reason_only_capital");
				}
				else if (prefs.nocaps && !originalText.match(/[A-Z]/m)){
					reason = __("reason_no_capital");
				}
				else if (prefs.startsWithCapital && originalText.match(/^[a-z]/)){
					reason = __("reason_start_lower");
				}
				else if (prefs.punctuation && originalText.match(/(!{2,})|(\?{3,})/m)){
					reason = __("reason_too_much_punctuation");
				}
				else if (prefs.excessiveCapitals && originalText.match(/[A-Z]{5,}/m)){
					reason = __("reason_too_much_capitalization");
				}
				else if (prefs.profanity && originalText.match(/\b(ass(hole)?\b|bitch|cunt|damn|(mother)?fuc[kc]|(bull)?shits?\b|fag|nigger|nigga)/i)) {
					reason = __("reason_too_much_profanity");
				}
				else {
					if (prefs.keywords) {
						if (!parsedKeywords) {
							var filter = prefs.keywords;

							var filterString = filter.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
							var filterParts = [];

							// We now have a space delimited filter string, but it may included quoted phrases
							var currentFilter = "";
							var inQuotes = 0;

							for (var i = 0; i < filterString.length; i++) {
								var theChar = filterString.charAt(i);

								if (theChar == "'" || theChar == '"') {
									if (inQuotes == theChar) {
										inQuotes = false;
									}
									else if (currentFilter.length == 0) {
										inQuotes = theChar;
									}
									else {
										currentFilter += theChar;
									}
								}
								else {
									if (theChar == " "){ 
										if (!inQuotes) {
											filterParts.push(currentFilter);
											currentFilter = "";
											continue;
										}
									}

									currentFilter += filterString.charAt(i);
								}
							}

							if (currentFilter != "") filterParts.push(currentFilter);

							var parsedKeywords = [];

							for (var i = 0; i < filterParts.length; i++) {
								if (filterParts[i]) {
									parsedKeywords.push(new RegExp(filterParts[i], "i"));
								}
							}
						}

						for (var i = 0, _len = parsedKeywords.length; i < _len; i++) {
							if (originalText.match(parsedKeywords[i])) {
								reason = __("reason_keywords");
								break;
							}
						}
					}

					if (!reason && prefs.mistakes && EXTENSION.dictionary) {
						var mistakes = 0;
						var text = originalText;

						text = text.replace(/\s/mg, " ");
						text = text.replace(/\s+|[^a-z0-9\-']/img, " "); //'
						text = $.trim(text);

						words = text.split(" ");

						for (var j = 0, _jlen = words.length; j < _jlen; j++){
							var word = words[j];

							if (!word.match(/[a-z]/i)) {
								// Not a single alphabetic character.
								continue;
							}

							if (!EXTENSION.dictionary.check(word)){
								if (
									(word[0] === word[0].toUpperCase()) &&
									(word.substring(1) === word.substring(1).toLowerCase())
								) {
									// Probably a name. We'll let it slide.
								}
								else {
									mistakes++;

									if (mistakes >= prefs.mistakes) {
										break;
									}
								}
							}
						}

						if (mistakes >= prefs.mistakes || mistakes == words.length) {
							reason = __("reason_spelling");
						}
					}
				}

				if (reason) {
					var id = "comment-snob-" + idx;

					if ("commentHideSelector" in theRule) {
						var commentHide = $this.find(theRule.commentHideSelector);
					}
					else {
						if ("commentTextSelector" in theRule) {
							var commentHide = $this.find(theRule.commentTextSelector);
						}
						else {
							var commentHide = $this;
						}
					}

					commentHide.addClass(id);
					commentHide.hide();

					if ("statusContainerSelector" in theRule) {
						var toggleContainer = $this.find(theRule.statusContainerSelector);
					}
					else {
						var toggleContainer = $this;
					}

					var inserter = "prepend";

					if ("statusPlacement" in theRule) {
						switch (theRule.statusPlacement) {
							case "prepend":
							case "append":
							case "before":
							case "after":
								inserter = theRule.statusPlacement;
							break;
						}
					}

					toggleContainer[inserter](EXTENSION.createPlaceholder(id, reason, page));
				}
			});
		}

		page.inCommentFilter = false;

		if (!isRefilter) {
			if ("ajaxInitiatorSelector" in theRule) {
				$(page).on( 'click.commentSnob', theRule.ajaxInitiatorSelector, function (e) {
					allComments.each(function (idx, el) {
						el.addEventListener("DOMNodeRemoved", EXTENSION.refilterComments, false);
						el.addEventListener("DOMNodeInserted", EXTENSION.refilterComments, false);
					});
				});
				
				page.addEventListener( "unload", function () {
					page.removeEventListener( "unload", arguments.callee, false );
					
					$(page).unbind( "click.commentSnob" );
					
					allComments.each(function (idx, el) {
						el.removeEventListener("DOMNodeRemoved", EXTENSION.refilterComments, false);
						el.removeEventListener("DOMNodeInserted", EXTENSION.refilterComments, false);
					});
				}, false);
			}
		}
	},
	
	refilterTimeout : null,
	
	refilterComments : function ( evt ) {
		var page = evt.target.ownerDocument;
		
		clearTimeout(EXTENSION.refilterTimeout);

		if (!page.inCommentFilter) {
			EXTENSION.refilterTimeout = setTimeout(function () { EXTENSION.doRefilterComments(page); }, 250);
		}
	},
	
	doRefilterComments : function (page) {
		clearTimeout(EXTENSION.refilterTimeout);
		
		var browserWindow = Services.wm.getMostRecentWindow( "navigator:browser" );
		var $ = browserWindow.snobQuery;

		var theRule = page.commentSnobRule;

		$(theRule.allCommentsSelector, page).each(function (idx, el) {
			el.removeEventListener("DOMNodeRemoved", EXTENSION.refilterComments, false);
			el.removeEventListener("DOMNodeInserted", EXTENSION.refilterComments, false);
		});

		EXTENSION.filterComments(page, true);
	},
	
	dynamicFilterTimeout : null,
	
	filterDynamicComments : function ( evt ) {
		clearTimeout(EXTENSION.dynamicFilterTimeout);

		var page = evt.target.ownerDocument;

		if (!page.inCommentFilter) {
			EXTENSION.dynamicFilterTimeout = setTimeout(function () { EXTENSION.doFilterDynamicComments(page); }, 250);
		}
	},
	
	doFilterDynamicComments : function (page) {
		clearTimeout(EXTENSION.dynamicFilterTimeout);
		
		var browserWindow = Services.wm.getMostRecentWindow( "navigator:browser" );
		var $ = browserWindow.snobQuery;
		
		var theRule = page.commentSnobRule;
		
		$(theRule.allCommentsSelector, page).each(function (idx, el) {
			el.removeEventListener("DOMNodeRemoved", EXTENSION.filterDynamicComments, false);
			el.removeEventListener("DOMNodeInserted", EXTENSION.filterDynamicComments, false);
		});

		EXTENSION.filterComments(page);
	},
	
	createPlaceholder : function (id, reason, page) {
		var theRule = page.commentSnobRule;
		var browserWindow = Services.wm.getMostRecentWindow( "navigator:browser" );
		var $ = browserWindow.snobQuery;
		
		if ("statusElementTag" in theRule) {
			var el = $("<" + theRule.statusElementTag+"/>", page);
		}
		else {
			var ele = $("<span/>", page);
		}

		for (var attr in theRule.statusElementAttributes) {
			el.attr(attr, theRule.statusElementAttributes[attr]);
		}

		el.html(
			__("label_hidden_reason", [ reason ]) + 
				' <a href="javascript:void(0);" ' +
				' onclick="var elements = document.getElementsByClassName(\''+id+'\'); ' + 
					" if (elements.item(0).style.display == '') { " +
						' for (var i = 0, _len = elements.length; i < _len; i++) { ' +
							" elements.item(i).style.display = 'none'; " +
						' } ' +
						" this.innerHTML = '"+__("label_show")+"'; " +
					' } else { ' +
						' for (var i = 0, _len = elements.length; i < _len; i++) { ' +
							" elements.item(i).style.display = ''; " +
						' } ' + 
						" this.innerHTML = '"+__("label_hide")+"';" +
					' }">' + __("label_show") + '</a>'
		);

		return el;
	},
	
	showInstallBar : function (rule) {
		var win = Services.wm.getMostRecentWindow( "navigator:browser" );
		var page = win.document;
		
		var notificationBox = win.gBrowser.getNotificationBox();
		
		if ( ! notificationBox.getNotificationWithValue('comment-snob-rule-install' ) ){
			notificationBox.appendNotification(
					"Do you want to install this Comment Snob rule?",
					'comment-snob-rule-install',
					"",
					notificationBox.PRIORITY_WARNING_MEDIUM,
					[
						{
							label : 'No',
							callback : function () {
								notificationBox.getNotificationWithValue('comment-snob-rule-install' );
							}
						},
						{
							label : 'Yes',
							callback : function () {
								if ("rule" in rule) {
									var rules = EXTENSION.prefs.getJSONPref("rules", {});
									rules[rule.rule.id] = rule.rule;
									EXTENSION.prefs.setJSONPref("rules", rules);
								}
								else {
									function handleText(text) {
										var text = minify(text);

										try {
											var json = JSON.parse(text);
										} catch (e) {
											return;
										}

										var rules = EXTENSION.prefs.getJSONPref("rules", {});
										rules[json.id] = json;
										EXTENSION.prefs.setJSONPref("rules", rules);

										EXTENSION.addRule(json);
									}

									if (rule.href.indexOf("data:") === 0) {
										var parts = rule.href.split(";");

										if (parts[1].indexOf("base64,") === 0) {
											var text = atob(parts[1].replace("base64,", ""));
										}
										else {
											var text = decodeURIComponent(parts[1].replace(/\+/g, " "));
										}

										handleText(text);
									}
									else {
										var req = xhr();
										req.open("GET", rule.href, true);

										req.onreadystatechange = function () {
											if (req.readyState == 4) {
												var text = req.responseText;
												handleText(text);
											}
										};

										req.send(null);
									}
								}
							}
						}
					]
				);
		}
	},
	
	hideInstallBar : function () {
		try {
			notificationBox.getNotificationWithValue('comment-snob-rule-install' ).close();
		} catch ( e ) { }
	}
};