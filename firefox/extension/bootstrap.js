Components.utils.import("resource://gre/modules/Services.jsm");

let unloaders = [];

function install() { }
function uninstall() { }

function startup( aData, aReason ) {
	if ( Services.vc.compare( Services.appinfo.platformVersion, "10.0" ) < 0 ) {
		Components.manager.addBootstrappedManifestLocation( aData.installPath );
		
		unloaders.push(function () {
			Components.manager.removeBootstrappedManifestLocation( aData.installPath );
		});
	}

	// Set up resource:// URLs
	if ( "resourcePath" in EXTENSION ) {
		let resource = Services.io.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler);
		let alias = Services.io.newFileURI(aData.installPath);
	
		if (!aData.installPath.isDirectory()) {
			alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
		}
	
		resource.setSubstitution( EXTENSION.resourcePath, alias );
		
		unloaders.push(function () { resource.setSubstitution( EXTENSION.resourcePath, null ); });
	}
	
	if ( "prefBranch" in EXTENSION ) {
		EXTENSION.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService( Components.interfaces.nsIPrefService ).getBranch( EXTENSION.prefBranch );
		
		if ( "observe" in EXTENSION ) {
			EXTENSION.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
			EXTENSION.prefs.addObserver("", EXTENSION, false);
		}
		
		unloaders.push(function () {
			EXTENSION.prefs.removeObserver("", EXTENSION);
			delete EXTENSION.prefs;
		});
	}
	
	// Parse any JSON locale files.
	if ( "localesPath" in EXTENSION ) {
		prepareStrings();
		unloaders.push(function () {
			delete EXTENSION.strings;
		});
	}
	
	// Apply stylesheets to the browser.
	if ( "css" in EXTENSION ) {
		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
		                    .getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
		                    .getService(Components.interfaces.nsIIOService);
		
		for ( var i = 0, _len = EXTENSION.css.length; i < _len; i++ ) {
			var uri = ios.newURI( EXTENSION.css[i].uri, null, null);
			
			var sheetType = sss.USER_SHEET;
			
			if ( "type" in EXTENSION.css[i] ) {
				sheetType = EXTENSION.css[i].type;
			}
			
			sss.loadAndRegisterSheet( uri, sheetType );
		}
		
		unloaders.push(function () {
			for ( var i = EXTENSION.css.length - 1; i >= 0; i-- ) {
				var uri = ios.newURI( EXTENSION.css[i].uri, null, null);
				
				var sheetType = sss.USER_SHEET;
				
				if ( "type" in EXTENSION.css[i] ) {
					sheetType = EXTENSION.css[i].type;
				}
				
				if ( sss.sheetRegistered( uri, sheetType ) ) {
					try {
						sss.unregisterSheet( uri, sheetType );
					} catch ( ex ) {
						log( ex );
					}
				}
			}
		});
	}
	
	let browserWindows = Services.wm.getEnumerator("navigator:browser");
	
	while (browserWindows.hasMoreElements()) {
		addHooks(browserWindows.getNext());
	}
	
	Services.ww.registerNotification(windowWatcher);
	
	if ( "startup" in EXTENSION ) {
		EXTENSION.startup( aData, aReason );
	}
}

function isNativeUI() {
	let appInfo = Components.classes['@mozilla.org/xre/app-info;1'].getService( Components.interfaces.nsIXULAppInfo );
	return ( appInfo.ID == '{aa3c5121-dab2-40e2-81ca-7ea25febc110}' );
}

function windowWatcher(subject, topic) {
	if (topic == 'domwindowopened') {
		subject.addEventListener("load", function () {
			subject.removeEventListener("load", arguments.callee, false);
		
			let doc = subject.document.documentElement;
	
			if (doc.getAttribute("windowtype") == "navigator:browser") {
				addHooks(subject);
			}
		}, false);
	}
	else if (topic == 'domwindowclosed') {
		let doc = subject.document.documentElement;

		if (doc.getAttribute("windowtype") == "navigator:browser") {
			removeHooks(subject);
		}
	}
}

function shutdown( aData, aReason ) {
	Services.ww.unregisterNotification(windowWatcher);
	
	for ( var i in timers ) {
		clearTimeout( i );
	}
	
	if ( "shutdown" in EXTENSION ) {
		EXTENSION.shutdown( aData, aReason );
	}

	// Call unloaders in reverse order. Last in, first out.
	for ( var i = unloaders.length - 1; i >= 0; i-- ) {
		unloaders[i]();
	}
	
	let browserWindows = Services.wm.getEnumerator("navigator:browser");
	
	while (browserWindows.hasMoreElements()) {
		removeHooks(browserWindows.getNext());
	}
}

function addHooks( win ) {
	if ( "frameScripts" in EXTENSION ) {
		for ( var i = 0, _len = EXTENSION.frameScripts.length; i < _len; i++ ) {
			win.messageManager.loadFrameScript( EXTENSION.frameScripts[i], true );
		}
	}
	
	if ( "messageNamespace" in EXTENSION ) {
		win.messageManager.addMessageListener( EXTENSION.messageNamespace, EXTENSION );
	}
	
	if ( "pageActions" in EXTENSION ) {
		for ( var i = 0, _len = EXTENSION.pageActions.length; i < _len; i++ ) {
			var actionProperties = EXTENSION.pageActions[i];
			
			if ( isNativeUI() ) {
			}
			else {
				var action = win.document.createElement( "image" );
			
				for ( var key in actionProperties.attribtues ) {
					action.setAttribute( key, actionProperties.attributes[key] );
				}
			
				action.id = actionProperties.attributes.id;
			
				if ( "events" in actionProperties ) {
					for ( eventName in actionProperties.events ) {
						action.addEventListener( eventName, actionProperties.events[eventName], false );
					}
				}
			
				win.document.getElementById( "urlbar-icons" ).appendChild( action );
			}
		}
	}
	
	if ( "toolbarButtons" in EXTENSION ) {
		for ( var i = 0, _len = EXTENSION.toolbarButtons.length; i < _len; i++ ) {
			var buttonProperties = EXTENSION.toolbarButtons[i];
			
			if ( isNativeUI() ) {
				EXTENSION.toolbarButtons[i].menuId = win.NativeWindow.menu.add( EXTENSION.toolbarButtons[i].attributes.label, 'chrome://wordpressdotcom/content/skin/wordpress-icon-19.png', function() { } );
			}
			else {
				var button = win.document.createElement( "toolbarbutton" );
			
				for ( var key in buttonProperties.attributes ) {
					button.setAttribute( key, buttonProperties.attributes[key] );
				}
			
				button.setAttribute( "class", "toolbarbutton-1 chromeclass-toolbar-additional" );
			
				if ( "popup" in buttonProperties ) {
					button.setAttribute( "type", "menu-button" );
					button.bootstrapPopupID = buttonProperties.popup.id;
					button.setAttribute( "oncommand", "document.getElementById( this.bootstrapPopupID ).showPopup();" );

					var popup = win.document.createElement( "menupopup" );
					popup.setAttribute( "id", buttonProperties.popup.id );
				
					if ( "events" in buttonProperties.popup ) {
						for ( eventName in buttonProperties.popup.events ) {
							popup.addEventListener( eventName, buttonProperties.popup.events[eventName], false );
						}
					}
				
					button.appendChild( popup );
				}
			
				var toolbox = win.document.getElementById( 'navigator-toolbox' )
				toolbox.palette.appendChild( button );
			
				var preferredToolbar = win.document.getElementById( 'nav-bar' );
			
				var addedOnce = false;
			
				try {
					addedOnce = EXTENSION.prefs.getBoolPref( "buttons." + buttonProperties.attributes.id + ".added" );
				} catch ( ex ) {
				}
			
				var currentSetItems = preferredToolbar.getAttribute( "currentset" ).split( ',' );
			
				if ( ! addedOnce ) {
					EXTENSION.prefs.setBoolPref( "buttons." + buttonProperties.attributes.id + ".added", true );
				
					if ( currentSetItems.indexOf( buttonProperties.attributes.id ) == -1 ) {
						currentSetItems.push( buttonProperties.attributes.id );
					}
				}
			
				var buttonLocation = currentSetItems.indexOf( buttonProperties.attributes.id );
			
				if ( buttonLocation != -1 ) {
					var beforeElement = null || ( ( buttonLocation < currentSetItems.length - 1 ) && win.document.getElementById( currentSetItems[buttonLocation + 1] ) );
				
					preferredToolbar.insertItem( buttonProperties.attributes.id, beforeElement );
				}
			
				preferredToolbar.currentSet = currentSetItems.join( ',' );
			
				preferredToolbar.setAttribute( 'currentset', preferredToolbar.currentSet );
			
				preferredToolbar.ownerDocument.persist( preferredToolbar.id, "currentset" );
			
				try {
					win.BrowserToolboxCustomizeDone( true );
				} catch ( ex ) {
					log( ex );
				}
			}
		}
	}
	
	if ( "load" in EXTENSION ) {
		EXTENSION.load( win );
	}
}

function removeHooks( win, windowUnload ) {
	if ( "unload" in EXTENSION ) {
		EXTENSION.unload( win );
	}
	
	if ( "toolbarButtons" in EXTENSION ) {
		for ( var i = EXTENSION.toolbarButtons.length - 1; i >= 0; i-- ) {
			var buttonProperties = EXTENSION.toolbarButtons[i];
			
			if ( isNativeUI() ) {
				win.NativeWindow.menu.remove( EXTENSION.toolbarButtons[i].menuId );
			}
			else {
				var button = win.document.getElementById( buttonProperties.attributes.id );
			
				if ( button ) {
					if ( "popup" in buttonProperties ) {
						var popup = win.document.getElementById( buttonProperties.popup.id );
				
						if ( "events" in buttonProperties.popup ) {
							for ( eventName in buttonProperties.popup.events ) {
								popup.removeEventListener( eventName, buttonProperties.popup.events[eventName], false );
							}
						}
					
						if ( ! windowUnload ) {
							popup.parentNode.removeChild( popup );
						}
					}
				
					if ( ! windowUnload ) {
						button.parentNode.removeChild( button );
					
						var toolbox = win.document.getElementById( 'navigator-toolbox' )
					
						try {
							toolbox.palette.removeChild( button );
						} catch ( ex ) {
							// Not sure if the button is still around after being removed from the toolbar.
							log( ex );
						}
					}
				}
			}
		}
	}
	
	if ( "pageActions" in EXTENSION ) {
		for ( var i = EXTENSION.pageActions.length - 1; i >= 0; i-- ) {
			var actionProperties = EXTENSION.pageActions[i];
			
			if ( isNativeUI() ) {
			}
			else {
				var action = win.document.getElementById( actionProperties.attributes.id );
			
				if ( action ) {
					if ( "events" in actionProperties ) {
						for ( eventName in actionProperties.events ) {
							action.removeEventListener( eventName, actionProperties.events[eventName], false );
						}
					}
				
					action.parentNode.removeChild( action );
				}
			}
		}
	}
	
	if ( "messageNamespace" in EXTENSION ) {
		win.messageManager.removeMessageListener( EXTENSION.messageNamespace, EXTENSION );
	}
	
	if ( "frameScripts" in EXTENSION ) {
		for ( var i = EXTENSION.frameScripts.length - 1; i >= 0; i-- ) {
			win.messageManager.removeDelayedFrameScript( EXTENSION.frameScripts[i] );
		}
	}
}

/**
 * Timing functions.
 */

var timers = {};

function setTimeout(callback, timeout, arg1, arg2, arg3, arg4) {
	var cb = {
		notify : function () {
			callback(arg1, arg2, arg3, arg4);
			clearTimeout(callback.name);
		}
	};
	
	var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	timer.initWithCallback(cb, timeout, timer.TYPE_ONE_SHOT);
	timers[callback.name] = timer;
	
	return callback.name;
}

function setInterval(callback, timeout, arg1, arg2, arg3, arg4) {
	var cb = {
		notify : function (timer) {
			callback(arg1, arg2, arg3, arg4);
		}
	};
	
	var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	timer.initWithCallback(cb, timeout, timer.TYPE_REPEATING_SLACK);
	timers[callback.name] = timer;
	
	return callback.name;
}

function clearTimeout (timerKey) {
	if ( timerKey in timers ) {
		timers[timerKey].cancel();
		delete timers[timerKey];
	}
}

function clearInterval( timerKey ) {
	return clearTimeout( timerKey );
}

function alert( m ) {
	Services.wm.getMostRecentWindow( "navigator:browser" ).alert( m );
}

function btoa( m ) {
	return Services.wm.getMostRecentWindow( "navigator:browser" ).btoa( m );
}

function atob( m ) {
	return Services.wm.getMostRecentWindow( "navigator:browser" ).atob( m );
}

var JSON = {
	parse : function (a) {
		return Services.wm.getMostRecentWindow( "navigator:browser" ).JSON.parse(a);
	},
	stringify : function (a) {
		return Services.wm.getMostRecentWindow( "navigator:browser" ).JSON.stringify(a);
	}
};


