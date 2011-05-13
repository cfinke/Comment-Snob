var pageRules = null;

var theRule = null;
var thePrefs = null;

var dictionary = null;

var refilterTimeout = null;
var dynamicFilterTimeout = null;

var inCommentFilter = false;

chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
	if (request.subject === "filter") {
		theRule = request.rule;
		thePrefs = request.prefs;
		
		dictionary = new Typo().load(request.dictionaryObject);
		
		if ("dynamic" in theRule && theRule["dynamic"]) {
			filterComments();
			
			$(theRule.allCommentsSelector).each(function (idx, el) {
				el.addEventListener("DOMNodeRemoved", filterDynamicComments, false);
			});
		}
		else {
			filterComments();
		}
	}
	else if (request.subject === "rules") {
		if (pageRules !== null) {
			checkForRules();
		}
	}
});

function filterDynamicComments() {
	clearTimeout(dynamicFilterTimeout);
	
	if (!inCommentFilter) {
		dynamicFilterTimeout = setTimeout(doFilterDynamicComments, 250);
	}
}

function doFilterDynamicComments() {
	$(theRule.allCommentsSelector).each(function (idx, el) {
		el.removeEventListener("DOMNodeRemoved", filterDynamicComments, false);
	});
	
	filterComments();
}

function filterComments(isRefilter) {
	inCommentFilter = true;

	var prefs = thePrefs;
	
	var allComments = $(theRule.allCommentsSelector);

	if (prefs.extreme) {
		allComments.remove();
	}
	else {
		var parsedKeywords = null;
		
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
			originalText = originalText.replace(/^[^A-Z0-9]+/ig, "");
			originalText = $.trim(originalText);
			
			if (prefs.allcaps && !originalText.match(/[a-z]/m)){
				reason = chrome.i18n.getMessage("reason_only_capital");
			}
			else if (prefs.nocaps && !originalText.match(/[A-Z]/m)){
				reason = chrome.i18n.getMessage("reason_no_capital");
			}
			else if (prefs.startsWithCapital && originalText.match(/^[a-z]/)){
				reason = chrome.i18n.getMessage("reason_start_lower");
			}
			else if (prefs.punctuation && originalText.match(/(!{2,})|(\?{3,})/m)){
				reason = chrome.i18n.getMessage("reason_too_much_punctuation");
			}
			else if (prefs.excessiveCapitals && originalText.match(/[A-Z]{5,}/m)){
				reason = chrome.i18n.getMessage("reason_too_much_capitalization");
			}
			else if (prefs.profanity && originalText.match(/\b(ass(hole)?\b|bitch|cunt|damn|(mother)?fuc[kc]|(bull)?shits?\b|fag|nigger|nigga)/i)) {
				reason = chrome.i18n.getMessage("reason_too_much_profanity");
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
							reason = chrome.i18n.getMessage("reason_keywords");
							break;
						}
					}
				}
				
				if (!reason && prefs.mistakes) {
					var now = new Date();
				
					var mistakes = 0;
					var text = originalText;
				
					text = text.replace(/\s/mg, " ");
					text = text.replace(/\s+|[^a-z0-9\-']/img, " "); //'
					text = $.trim(text);
				
					words = text.split(" ");
				
					for (var j = 0, _jlen = words.length; j < _jlen; j++){
						var word = words[j];
					
						if (!dictionary.check(word)){
							if (
								(word[0] === word[0].toUpperCase()) &&
								(word.substring(1) === word.substring(1).toLowerCase())
							) {
								// Probably a name. We'll let it slide.
							}
							else {
								mistakes++;
							
								if (mistakes >= prefs.mistakes) break;
							}
						}
					}
				
					if (mistakes >= prefs.mistakes || mistakes == words.length) {
						reason = chrome.i18n.getMessage("reason_spelling");
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
			
				toggleContainer[inserter](createPlaceholder(id, reason));
			
			}
		});
	}

	inCommentFilter = false;

	if (!isRefilter) {
		if ("ajaxInitiatorSelector" in theRule) {
			$(theRule.ajaxInitiatorSelector).live("click", function (e) {
				allComments.each(function (idx, el) {
					el.addEventListener("DOMNodeRemoved", refilterComments, false);
				});
			});
		}
	}
}

function refilterComments() {
	clearTimeout(refilterTimeout);
	
	if (!inCommentFilter) {
		refilterTimeout = setTimeout(doRefilterComments, 250);
	}
}

function doRefilterComments() {
	$(theRule.allCommentsSelector).each(function (idx, el) {
		el.removeEventListener("DOMNodeRemoved", refilterComments, false);
	});
	
	filterComments(true);
}

function createPlaceholder(id, reason) {
	if ("statusElementTag" in theRule) {
		var el = $("<" + theRule.statusElementTag+"/>");
	}
	else {
		var ele = $("<span/>");
	}
	
	for (var attr in theRule.statusElementAttributes) {
		el.attr(attr, theRule.statusElementAttributes[attr]);
	}
	
	el.html(
		chrome.i18n.getMessage("label_hidden_reason", 
			[ reason ]) + 
			' <a href="javascript:void(0);" ' +
			' onclick="var elements = document.getElementsByClassName(\''+id+'\'); ' + 
				" if (elements.item(0).style.display == '') { " +
					' for (var i = 0, _len = elements.length; i < _len; i++) { ' +
						" elements.item(i).style.display = 'none'; " +
					' } ' +
					" this.innerHTML = '"+chrome.i18n.getMessage("label_show")+"'; " +
				' } else { ' +
					' for (var i = 0, _len = elements.length; i < _len; i++) { ' +
						" elements.item(i).style.display = ''; " +
					' } ' + 
					" this.innerHTML = '"+chrome.i18n.getMessage("label_hide")+"';" +
				' }">' + chrome.i18n.getMessage("label_show") + '</a>'
	);
	
	return el;
}

function checkForRules() {
	if (document.location.href.match(/\.snob(\?.*)?$/i)) {
		var rule = JSON.minify($("body").text());
		
		try {
			var jsonRule = JSON.parse(rule);
		} catch (e) { 
			return;
		}
		
		showInstallBar({ rule : jsonRule }, function () { $("body").css("margin-top", ""); } );
		$("body").css("margin-top", "31px");
	}
	else {
		$("a.comment-snob-rule").click(function (e) {
			e.preventDefault();
			
			var $this = $(this);
			
			showInstallBar({ href : $this.attr("href") });
		});
	}
}

function showInstallBar(rule, hideCallback) {
	$("#comment-snob-infobar").remove();
	$("body").css("margin-top", "0");
	
	var infobar = $("<div/>");
	infobar.addClass("comment-snob-infobar");
	infobar.data("rule", rule);
	
	var button1 = $("<button/>");
	button1.text("Yes");
	button1.click(function () {
		infobar.find(".comment-snob-loading").css("visibility", "visible");
		
		chrome.extension.sendRequest({ subject : "install_rule", rule : infobar.data("rule") }, function callback(rv) {
			infobar.find(".comment-snob-loading").css("visibility", "hidden");
			
			if (rv.status) {
				infobar.addClass("comment-snob-success-bar");
				infobar.find("button").remove();
				infobar.find("td:first").text("Rule installed successfully.");
				setTimeout(function () {
					infobar.slideUp(300, hideCallback);
				}, 2000);
			}
			else {
				infobar.addClass("comment-snob-error-bar");
				infobar.find("button").remove();
				infobar.find("td:first").text("Error: " + rv.msg);
				setTimeout(function () {
					infobar.slideUp(300, hideCallback);
				}, 4000);
			}
		});
	});

	var button2 = $("<button/>");
	button2.text("No");
	button2.click(function () {
		infobar.slideUp(200);
		
		if (hideCallback) {
			hideCallback();
		}
	});
	
	var loadingIcon = $("<img/>");
	loadingIcon.attr("src", "data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==");
	loadingIcon.css("visibility", "hidden");
	loadingIcon.css("margin-right", "5px");
	loadingIcon.css("margin-left", "5px");
	loadingIcon.addClass("comment-snob-loading","true");
	
	infobar.append("<table><tr><td>Do you want to install this Comment Snob rule?</td><td></td></tr></table>");
	infobar.find("td:eq(1)").append(button1).append(button2).append(loadingIcon);
	infobar.hide();
	
	$("body").append(infobar);
	infobar.slideDown(300);
}

checkForRules();