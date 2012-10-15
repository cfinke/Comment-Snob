Components.utils.import("resource://comment-snob-modules/comment-snob-minify.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-util.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-updater.js");

var currentRuleID = null;

function populateRuleList() {
	$( "#navbar-container label.user-rule" ).remove();
	
	var rules = COMMENT_SNOB_UTIL.getJSONPref("rules", {});
	
	for (var i in rules) {
		var option = $( '<label/>' );
		option.addClass("navbar-item user-rule");
		option.attr("ruleid", i);
		option.text(rules[i].label);
		option.attr("pagename", "rule");
		option.val(i);
		
		$( '#default-rule' ).after( option );
	}
	
	if (!("youtube@chrisfinke.com" in rules)) {
		$("#reinstall-youtube").show();
	}
	else {
		$("#reinstall-youtube").hide();
	}
	
	$( "#default-rule" ).click();
}

function showRuleSettings(ruleId) {
	var prefs = COMMENT_SNOB_UTIL.getJSONPref("rulePrefs", {});
	
	var customPrefs = false;
	
	if (ruleId in prefs) {
		var rulePrefs = prefs[ruleId];
		customPrefs = true;
	}
	else {
		var rulePrefs = COMMENT_SNOB_UTIL.defaultPrefs;
	}
	
	$(".preference-bool").each(function () {
		this.checked = rulePrefs[$(this).attr("pref")];
	});
	
	$(".preference-int").each(function () {
		$(this).val(parseInt(rulePrefs[$(this).attr("pref")], 10));
	});

	$(".preference-text").each(function () {
		$(this).val(rulePrefs[$(this).attr("pref")]);
	});
	
	$("#custom-preferences").css("visibility", "visible");
	
	setDisabled();
	
	if (ruleId) {
		currentRuleID = ruleId;
		$("#rule-management").show();
		$("#default-preferences").show();
		
		if (!customPrefs) {
			$("#use-default").each(function () { this.checked = true; });
		}
		else {
			$("#use-default").each(function () { this.checked = false; });
		}
	}
	else {
		currentRuleID = null;
		$("#rule-management").hide();
		$("#default-preferences").hide();
	}
	
	$( '#update-progress' ).text( '' );
	
	useDefaultChange();
}

function setDisabled() {
	var disabled = $("#extreme").is(":checked");

	$(".preference").each(function () {
		if ($(this).attr("id") != "extreme") {
			if ( disabled ) {
				$(this).attr("disabled", true);
			}
			else {
				$(this).removeAttr("disabled");
			}
		}
	});
}

function save() {
	if (!currentRuleID) {
		$(".preference-bool").each(function () {
			COMMENT_SNOB_UTIL.prefs.setBoolPref($(this).attr("pref"), $(this).is(":checked"));
		});
		
		$(".preference-int").each(function () {
			COMMENT_SNOB_UTIL.prefs.setIntPref($(this).attr("pref"), $(this).val());
		});

		$(".preference-text").each(function () {
			COMMENT_SNOB_UTIL.prefs.setCharPref($(this).attr("pref"), $(this).val());
		});
	}
	else {
		var prefObject = {};

		$(".preference-bool").each(function () {
			prefObject[$(this).attr("pref")] = $(this).is(":checked");
		});

		$(".preference-int").each(function () {
			prefObject[$(this).attr("pref")] = $(this).val();
		});

		$(".preference-text").each(function () {
			prefObject[$(this).attr("pref")] = $(this).val();
		});

		var prefs = COMMENT_SNOB_UTIL.getJSONPref("rulePrefs", {});
		prefs[currentRuleID] = prefObject;

		COMMENT_SNOB_UTIL.setJSONPref("rulePrefs", prefs);
	}
}

function useDefaultChange() {
	var useDefaultCheckbox = $('#use-default');
	
	if (currentRuleID && useDefaultCheckbox.is(':checked')) {
		$("#custom-preferences").css("visibility", "hidden");
		COMMENT_SNOB_UTIL.removeRulePrefs(currentRuleID);
	}
	else {
		$("#custom-preferences").css("visibility", "visible");
	
		if (currentRuleID) {
			save();
		}
	}
}

addEventListener( "load", function () {
	removeEventListener( "load", arguments.callee, false );
	
	// Instant-apply any preference changes.
	$(".preference").on( "click change blur keyup", function () {
		save();
	});

	$("#extreme").click(setDisabled);

	$("#remove").click(function () {
		if (confirm("Are you sure?")) {
			COMMENT_SNOB_UTIL.removeRule( currentRuleID );
			populateRuleList();
		}
	});
	
	$("#update").click( function () {
		var progressContainer = $( '#update-progress' );
		progressContainer.text( '' );
		
		progressContainer.append(
			$( '<description/>' ).text( COMMENT_SNOB.strings.getString( 'label_updating' ) )
		).show();
		
		var rules = COMMENT_SNOB_UTIL.getJSONPref( "rules", {} );
		
		if ( currentRuleID in rules ) {
			var currentRule = rules[ currentRuleID ];
			
			COMMENT_SNOB_UPDATER.updateRule( currentRule, function ( rv ) {
				if ( rv.status ) {
					if ( JSON.stringify( rv.rule ) == JSON.stringify( currentRule ) ) {
						progressContainer.append(
							$( '<description/>' ).text( COMMENT_SNOB.strings.getString( 'label_up_to_date' ) )
						);
					}
					else {
						progressContainer.append(
							$( '<description/>' ).text( COMMENT_SNOB.strings.getString( 'label_updated' ) )
						);
					}
				}
				else if ( rv.msg ) {
					if ( 'msgArgs' in rv ) {
						progressContainer.append(
							$( '<description/>' ).text( COMMENT_SNOB.strings.getFormattedString( rv.msg, rv.msgArgs ) )
						);
					}
					else {
						progressContainer.append(
							$( '<description/>' ).text( COMMENT_SNOB.strings.getString( rv.msg ) )
						);
					}
					
					if ( "msgDebug" in rv ) {
						var debug = $( '<textbox/>' );
						debug.attr( 'multiline', 'true' );
						debug.attr( 'rows', '8' );
						debug.attr( 'cols', '80' );
						debug.attr( 'value', rv.msgDebug );
						progressContainer.append( debug );
					}
				}
				else {
					progressContainer.append(
						$( '<description/>' ).text( COMMENT_SNOB.strings.getString( 'label_update_error' ) )
					);
				}
			} );
		}
		else {
			progressContainer.append(
				$( '<description/>' ).text( COMMENT_SNOB.strings.getString( 'label_update_error' ) )
			);
		}
	});
	
	$("#add-finish").click(function () {
		$("#rule-error").hide();
		
		var rule = $("#add-rule").val();
		
		var rv = COMMENT_SNOB_UTIL.addRule( rule );
		
		if (!rv.status) {
			$("#rule-error").text(rv.msg).show();
		}
		else {
			populateRuleList();
			$("#navbar-container label[ruleid='" + rv.rule.id + "']").click();
			$("#add-rule").val("");
		}
	});
	
	$( "#navbar-container" ).on( "click", ".navbar-item", function () {
		$(".navbar-item-selected").removeClass("navbar-item-selected");
		$(this).addClass("navbar-item-selected");
		$(".page").hide();
		$("#" + $(this).attr("pagename") + "Page").show();
	});
	
	$( "#navbar-container" ).on( "click", "#default-rule, .user-rule", function () {
		showRuleSettings($(this).attr("ruleid"));

		if ($(this).attr("ruleid")) {
			$("#remove").removeAttr("disabled");
		}
		else {
			$("#remove").attr("disabled", true);
		}
	});
	
	$("#install-youtube").on( "click", function (e) {
		e.preventDefault();
		
		COMMENT_SNOB_UTIL.addRule(COMMENT_SNOB_UTIL.youtubeRule);
		populateRuleList();
		$(".user-rule[ruleid='youtube@chrisfinke.com']").click();
	});
	
	$("#use-default").click(function () {
		useDefaultChange();
	});
	
	populateRuleList();
	
	showRuleSettings();
}, false);