var currentRules = null;
var dictionaryObject = null;

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	currentRules = null;
	
	// Re-get the rules for this tab.
	chrome.tabs.sendRequest(tabId, { subject : "rules" });
	
	// Check if this page matches any of the rules.
	var rules = COMMENT_SNOB.prefs.getJSONPref("rules", {});
	
	for (var i in rules) {
		var regex = new RegExp(rules[i].url, "i");
		
		if (tab.url.match(regex)) {
			var prefs = COMMENT_SNOB.getRulePrefs(i);
			
			var response = {
				subject : "filter",
				rule : rules[i],
				prefs : prefs
			};
			
			if (prefs.mistakes) {
				if (!dictionaryObject) {
					dictionaryObject = JSON.parse(JSON.stringify(new Typo("en_US")));
				}
				
				response.dictionaryObject = dictionaryObject;
			}
			
			chrome.tabs.sendRequest(tabId, response);
			
			break;
		}
	}
});

chrome.extension.onRequest.addListener(function (request, sender, sendResponse) {
	if (request.subject === "install_rule") {
		if ("rule" in request.rule) {
			var rv = COMMENT_SNOB.addRule(request.rule.rule);
			sendResponse(rv);
		}
		else if ("href" in request.rule) {
			function handleText(text) {
				try {
					var json = JSON.parse(text);
				} catch (e) {
					sendResponse({ status : false, msg : "Invalid JSON: " + e });
					return;
				}
				
				var rv = COMMENT_SNOB.addRule(json);
				sendResponse(rv);
			}
			
			if (request.rule.href.indexOf("data:") === 0) {
				var parts = request.rule.href.split(";");
				
				if (parts[1].indexOf("base64,") === 0) {
					var text = atob(parts[1].replace("base64,", ""));
				}
				else {
					var text = decodeURIComponent(parts[1].replace(/\+/g, " "));
				}
				
				handleText(text);
			}
			else {
				var req = new XMLHttpRequest();
				req.open("GET", request.rule.href, true);
			
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
});

COMMENT_SNOB.load();