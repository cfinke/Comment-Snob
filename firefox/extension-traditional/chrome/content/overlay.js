var COMMENT_SNOB = {
	strings : {
		_backup : null,
		_main : null,
		
		initStrings : function () {
			if (!this._backup) { this._backup = document.getElementById("comment-snob-backup-string-bundle"); }
			if (!this._main) { this._main = document.getElementById("comment-snob-string-bundle"); }
		},
		
		getString : function (key) {
			this.initStrings();
			
			var rv = "";
			
			try {
				rv = this._main.getString(key);
			} catch (e) {
			}
			
			if (!rv) {
				try {
					rv = this._backup.getString(key);
				} catch (e) {
				}
			}
			
			return rv;
		},
		
		getFormattedString : function (key, args) {
			this.initStrings();
			
			var rv = "";
			
			try {
				rv = this._main.getFormattedString(key, args);
			} catch (e) {
			}
			
			if (!rv) {
				try {
					rv = this._backup.getFormattedString(key, args);
				} catch (e) {
				}
			}
			
			return rv;
		}
	},
	
	load : function () {
		if (COMMENT_SNOB_UTIL.prefs.getBoolPref("firstrun")) {
			// Add the YouTube rule.
			COMMENT_SNOB_UTIL.addRule(COMMENT_SNOB_UTIL.youtubeRule);
			COMMENT_SNOB_UTIL.prefs.setBoolPref("firstrun", false);
		}
		
		COMMENT_SNOB.loadDictionary();
		
		gBrowser.tabContainer.addEventListener( "TabSelect", COMMENT_SNOB.contentChange, false );

		var firefoxBrowser = document.getElementById("appcontent");

		if (firefoxBrowser) {
			firefoxBrowser.addEventListener("DOMContentLoaded", COMMENT_SNOB.contentChange, false);
			
			firefoxBrowser.addEventListener("click", COMMENT_SNOB.contentClick, false);
		}
		
		Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader).loadSubScript('chrome://comment-snob/content/jquery-1.7.2.min.js');
		COMMENT_SNOB.$ = window.$.noConflict( true );
	},
	
	unload : function () {
		COMMENT_SNOB.$ = null;
		
		var firefoxBrowser = document.getElementById("appcontent");

		if (firefoxBrowser) {
			firefoxBrowser.removeEventListener("click", COMMENT_SNOB.contentClick, false);
			
			firefoxBrowser.removeEventListener("DOMContentLoaded", COMMENT_SNOB.contentChange, false);
		}

		gBrowser.tabContainer.removeEventListener( "TabSelect", COMMENT_SNOB.contentChange, false );
	},
	
	/**
	 * When the user clicks on a filtering rule link, prompt them to install it.
	 */
	contentClick : function (e) {
		if ( e.button == 0 && ! e.metaKey && ! e.shiftKey && e.originalTarget.getAttribute("href") ) {
			var href = e.originalTarget.getAttribute('href');
			
			if ( href.indexOf("data:text/snob+json") === 0 || href.match(/\.snob(\?.*)?$/i) ) {
				e.preventDefault();
			
				COMMENT_SNOB.showInstallBar(
					{ href : e.originalTarget.getAttribute('href') }
				);
			}
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
			spellchecker.dictionary = COMMENT_SNOB_UTIL.prefs.getCharPref("dictionary");
			this.dictionary = spellchecker;
		} catch (e) {
			// Dictionary not available.
			this.dictionary = null;
		}
	},
	
	contentChange : function () {
		var page = content.document;

		COMMENT_SNOB.hideInstallBar();

		// Check if this page is a comment snob rule.
		if (page.location.href.match(/\.snob(\?.*)?$/i)) {
			var rule = COMMENT_SNOB_MINIFY( page.body.textContent );

			try {
				var jsonRule = JSON.parse(rule);
			} catch (e) { 
				return;
			}

			COMMENT_SNOB.showInstallBar(
				{ rule : jsonRule }
			);
		}

		// Filter any comments.
		var rules = COMMENT_SNOB_UTIL.prefs.getJSONPref("rules", {});

		for (var i in rules) {
			var theRule = rules[i];
			
			var regex = new RegExp(rules[i].url, "i");

			if (page.location.href.match(regex)) {
				page.commentSnobRule = theRule;
				
				if ("dynamic" in theRule && theRule["dynamic"]) {
					COMMENT_SNOB.filterComments(page);
					
					COMMENT_SNOB.$(theRule.allCommentsSelector, page).each(function (idx, el) {
						el.snobserver = new window.MutationObserver(function(mutations) {
							mutations.forEach(function(mutation) {
								// only care about domnoderemoved and domnodeinserted
								COMMENT_SNOB.filterDynamicComments( { target : el } );
							});
						});
						
						var config = { childList : true, subtree : true };
						el.snobserver.observe( el, config );
					});
					
					page.addEventListener( "unload", function () {
						page.removeEventListener( "unload", arguments.callee, false );
						
						COMMENT_SNOB.$(theRule.allCommentsSelector, page).each(function (idx, el) {
							el.snobserver.disconnect();
							delete el.snobserver;
						});
					}, false);
				}
				else {
					COMMENT_SNOB.filterComments(page);
				}
				
				break;
			}
		}
	},
	
	filterComments : function (page, isRefilter) {
		page.inCommentFilter = true;
		
		var theRule = page.commentSnobRule;
		
		var prefs = COMMENT_SNOB_UTIL.getRulePrefs(theRule.id);

		var allComments = COMMENT_SNOB.$(theRule.allCommentsSelector, page);

		if (prefs.extreme) {
			allComments.remove();
		}
		else {
			var parsedKeywords = null;
			
			prefs.mistakes = parseInt(prefs.mistakes, 0);
			
			allComments.find(theRule.commentContainerSelector).each(function (idx) {
				var reason = false;
				var $this = COMMENT_SNOB.$(this);

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
				originalText = COMMENT_SNOB.$.trim(originalText);
				originalText = originalText.replace(/@[^\s]+/ig, ""); // Get rid of username references.
				originalText = originalText.replace(/^[^A-Z0-9]+/ig, "");
				originalText = COMMENT_SNOB.$.trim(originalText);

				if (prefs.allcaps && !originalText.match(/[a-z]/m)){
					reason = COMMENT_SNOB.strings.getString("reason_only_capital");
				}
				else if (prefs.nocaps && !originalText.match(/[A-Z]/m)){
					reason = COMMENT_SNOB.strings.getString("reason_no_capital");
				}
				else if (prefs.startsWithCapital && originalText.match(/^[a-z]/)){
					reason = COMMENT_SNOB.strings.getString("reason_start_lower");
				}
				else if (prefs.punctuation && originalText.match(/(!{2,})|(\?{3,})/m)){
					reason = COMMENT_SNOB.strings.getString("reason_too_much_punctuation");
				}
				else if (prefs.excessiveCapitals && originalText.match(/[A-Z]{5,}/m)){
					reason = COMMENT_SNOB.strings.getString("reason_too_much_capitalization");
				}
				else if (prefs.profanity && originalText.match(/\b(ass(hole)?\b|bitch|cunt|damn|(mother)?fuc[kc]|(bull)?shits?\b|fag|nigger|nigga)/i)) {
					reason = COMMENT_SNOB.strings.getString("reason_too_much_profanity");
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
								reason = COMMENT_SNOB.strings.getString("reason_keywords");
								break;
							}
						}
					}

					if (!reason && prefs.mistakes && COMMENT_SNOB.dictionary) {
						var mistakes = 0;
						var text = originalText;

						text = text.replace(/\s/mg, " ");
						text = text.replace(/\s+|[^a-z0-9\-']/img, " "); //'
						text = COMMENT_SNOB.$.trim(text);

						var words = text.split(" ");

						for (var j = 0, _jlen = words.length; j < _jlen; j++){
							var word = words[j];

							if (!word.match(/[a-z]/i)) {
								// Not a single alphabetic character.
								continue;
							}

							if (!COMMENT_SNOB.dictionary.check(word)){
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
							reason = COMMENT_SNOB.strings.getString("reason_spelling");
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

					toggleContainer[inserter](COMMENT_SNOB.createPlaceholder(id, reason, page));
				}
			});
		}

		page.inCommentFilter = false;

		if (!isRefilter) {
			if ("ajaxInitiatorSelector" in theRule) {
				COMMENT_SNOB.$(page).on( 'click.commentSnob', theRule.ajaxInitiatorSelector, function (e) {
					allComments.each(function (idx, el) {
						el.snobserver2 = new window.MutationObserver(function(mutations) {
							mutations.forEach(function(mutation) {
								// only care about domnoderemoved and domnodeinserted
								COMMENT_SNOB.refilterComments( { target : el } );
							});
						});

						var config = { childList : true, subtree : true };
						el.snobserver2.observe( el, config );
					});
				});
				
				page.addEventListener( "unload", function () {
					page.removeEventListener( "unload", arguments.callee, false );
					
					COMMENT_SNOB.$(page).unbind( "click.commentSnob" );
					
					allComments.each(function (idx, el) {
						el.snobserver2.disconnect();
						delete el.snobserver2;
					});
				}, false);
			}
		}
	},
	
	refilterTimeout : null,
	
	refilterComments : function ( evt ) {
		var page = evt.target.ownerDocument;
		
		clearTimeout(COMMENT_SNOB.refilterTimeout);

		if (!page.inCommentFilter) {
			COMMENT_SNOB.refilterTimeout = setTimeout(function () { COMMENT_SNOB.doRefilterComments(page); }, 250);
		}
	},
	
	doRefilterComments : function (page) {
		clearTimeout(COMMENT_SNOB.refilterTimeout);
		
		var theRule = page.commentSnobRule;

		COMMENT_SNOB.$(theRule.allCommentsSelector, page).each(function (idx, el) {
			if ( "snobserver2" in el ) {
				el.snobserver2.disconnect();
				delete el.snobserver2;
			}
		});

		COMMENT_SNOB.filterComments(page, true);
	},
	
	dynamicFilterTimeout : null,
	
	filterDynamicComments : function ( evt ) {
		clearTimeout(COMMENT_SNOB.dynamicFilterTimeout);

		var page = evt.target.ownerDocument;

		if (!page.inCommentFilter) {
			COMMENT_SNOB.dynamicFilterTimeout = setTimeout(function () { COMMENT_SNOB.doFilterDynamicComments(page); }, 250);
		}
	},
	
	doFilterDynamicComments : function (page) {
		clearTimeout(COMMENT_SNOB.dynamicFilterTimeout);
		
		var theRule = page.commentSnobRule;
		
		COMMENT_SNOB.$(theRule.allCommentsSelector, page).each(function (idx, el) {
			el.snobserver.disconnect();
			delete el.snobserver;
		});

		COMMENT_SNOB.filterComments(page);
	},
	
	createPlaceholder : function (id, reason, page) {
		var theRule = page.commentSnobRule;
		
		if ("statusElementTag" in theRule) {
			var el = COMMENT_SNOB.$("<" + theRule.statusElementTag+"/>", page);
		}
		else {
			var ele = COMMENT_SNOB.$("<span/>", page);
		}

		for (var attr in theRule.statusElementAttributes) {
			el.attr(attr, theRule.statusElementAttributes[attr]);
		}

		var toggler = COMMENT_SNOB.$( '<a/>', page )
			.attr( 'href', '#' )
			.text( COMMENT_SNOB.strings.getString( 'label_show' ) )
			.on( 'click', function ( e ) {
				e.preventDefault();
				
				var elements = COMMENT_SNOB.$( "." + id, page );
				
				if ( COMMENT_SNOB.$( elements.get(0) ).is(":visible")) {
					elements.hide();
					
					COMMENT_SNOB.$(this).text( COMMENT_SNOB.strings.getString( 'label_show' ) );
				}
				else {
					elements.show();

					COMMENT_SNOB.$(this).text( COMMENT_SNOB.strings.getString( 'label_hide' ) );
				}
			});
		
		el.append( page.createTextNode( COMMENT_SNOB.strings.getFormattedString("label_hidden_reason", [ reason ] ) + " " ) );
		el.append( toggler );

		return el;
	},
	
	showInstallBar : function (rule) {
		var page = document;
		
		var notificationBox = gBrowser.getNotificationBox();
		
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
									COMMENT_SNOB_UTIL.addRule( rule.rule );
								}
								else {
									if (rule.href.indexOf("data:") === 0) {
										var parts = rule.href.split(";");

										if (parts[1].indexOf("base64,") === 0) {
											var text = atob(parts[1].replace("base64,", ""));
										}
										else {
											var text = decodeURIComponent(parts[1].replace(/\+/g, " "));
										}
										
										COMMENT_SNOB_UTIL.addRule(text);
									}
									else {
										var req = new XMLHttpRequest();
										req.open("GET", rule.href, true);

										req.onreadystatechange = function () {
											if (req.readyState == 4) {
												COMMENT_SNOB_UTIL.addRule( req.responseText );
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
		var notificationBox = gBrowser.getNotificationBox();
		
		try {
			notificationBox.getNotificationWithValue('comment-snob-rule-install' ).close();
		} catch ( e ) { }
	}
};