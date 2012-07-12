function __(key, substitutions) {
	if ( 'undefined' != typeof substitutions ) {
		if ( 'object' != typeof substitutions ) {
			substitutions = [ substitutions ];
		}
	}
	
	if (key in EXTENSION.strings) {
		var bundle = EXTENSION.strings[key];

		var message = EXTENSION.strings[key].message;

		if ("placeholders" in bundle) {
			for (var i in bundle.placeholders) {
				var regex = new RegExp("\\$" + i + "\\$", "g");
				message = message.replace(regex, bundle.placeholders[i].content);
			}
		}

		if (typeof substitutions != 'undefined') {
			if (typeof substitutions != 'object') {
				substitutions = [ substitutions ];
			}
		}

		if (substitutions) {
			for (var i = 0, _len = substitutions.length; i < _len; i++) {
				var regex = new RegExp("\\$" + (i+1), "g");
				message = message.replace(regex, substitutions[i]);
			}
		}

		return message;
	}

	return "";
}

function xhr() {
	if ( typeof Components != 'undefined' && "classes" in Components && "@mozilla.org/xmlextras/xmlhttprequest;1" in Components.classes ) {
		return Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
	}
	else if ( typeof XMLHttpRequest != 'undefined' ) {
		return new XMLHttpRequest();
	}
	else {
		throw new Exception( "XHR is not available." );
	}
}

/**
 * Logging.
 */

function log( m ) {
	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

	for ( var i = 0; i < arguments.length; i++ )
		consoleService.logStringMessage( arguments[i] );
}

function prepareStrings(callback) {
	EXTENSION.strings = {};
	
	(function (extension_namespace, string_object, callback) {
		var localeOrder = ["en-US"];
		
		// Get the user's Firefox locale.
		var chromeRegService = Components.classes["@mozilla.org/chrome/chrome-registry;1"].getService();
		var xulChromeReg = chromeRegService.QueryInterface(Components.interfaces.nsIXULChromeRegistry);
		// The "official" locale, especially on Linux.
		var browserLocale = xulChromeReg.getSelectedLocale("global");
		
		if (browserLocale != localeOrder[0]) {
			localeOrder.push(browserLocale);
		}
		
		// The user-specified locale from prefs.
		var userLocale = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("general.useragent.").getCharPref("locale");
		
		if (userLocale != localeOrder[localeOrder.length - 1]) {
			localeOrder.push(userLocale);
		}
		
		var finalLocaleOrder = [];
		
		// Convert the locale codes to Chrome style.
		for (var i = 0, _len = localeOrder.length; i < _len; i++) {
			var localeParts = localeOrder[i].split("-");
			localeParts[0] = localeParts[0].toLowerCase();
			
			if (localeParts.length > 1) {
				localeParts[1] = localeParts[1].toUpperCase();
				
				// e.g., If the locale code is pt_BR, use pt as a backup.
				if (finalLocaleOrder.length == 0 || finalLocaleOrder[finalLocaleOrder.length - 1] != localeParts[0]) {
					finalLocaleOrder.push(localeParts[0]);
				}
			}
			
			var locale = localeParts.join("_");
			
			if (finalLocaleOrder.length == 0 || finalLocaleOrder[finalLocaleOrder.length - 1] != locale) {
				finalLocaleOrder.push(locale);
			}
		}
		
		function readNextLocale() {
			if (finalLocaleOrder.length > 0) {
				var locale = finalLocaleOrder.shift();
				
				var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
				
				try {
					req.open("GET", extension_namespace + "_locales/" + locale + "/messages.json", true);
				} catch (e) {
					// Most likely the file doesn't exist.
					readNextLocale();
				}
				
				req.overrideMimeType("text/plain;charset=UTF-8");
				
				req.onload = function () {
					var messagesText = req.responseText;
					
					try {
						var messages = JSON.parse(messagesText);
					} catch (e) {
						// Invalid JSON.
						var messages = {};
					}
					
					for (var i in messages) {
						string_object[i] = messages[i];
					}
					
					readNextLocale();
				};
				
				req.onerror = function () {
					readNextLocale();
				};
				
				try {
					req.send(null);
				} catch (e) {
					// Most likely the file doesn't exist.
					readNextLocale();
				}
			}
			else {
				// Because this process is asynchronous, you'll want to re-run
				// any localization scripts now that you run on document load, since the document may
				// have finished loading before this function ran, and if it did, all of your
				// locale strings would have been empty during the first call to your localizing
				// function.
				if (callback)
					callback();
			}
		}
		
		readNextLocale();
	})( EXTENSION.localesPath, EXTENSION.strings, callback );
}