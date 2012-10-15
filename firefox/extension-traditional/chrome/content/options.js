Components.utils.import("resource://comment-snob-modules/comment-snob-minify.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-util.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-updater.js");

var COMMENT_SNOB_OPTIONS = {
	currentRuleID : null,
	
	populateRuleList : function () {
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
	},

	showRuleSettings : function ( ruleId ) {
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
	
		COMMENT_SNOB_OPTIONS.setDisabled();
	
		if (ruleId) {
			COMMENT_SNOB_OPTIONS.currentRuleID = ruleId;
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
			COMMENT_SNOB_OPTIONS.currentRuleID = null;
			$("#rule-management").hide();
			$("#default-preferences").hide();
		}
	
		$( '#update-progress' ).text( '' );
	
		COMMENT_SNOB_OPTIONS.useDefaultChange();
	},

	setDisabled : function () {
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
	},

	save : function () {
		if (!COMMENT_SNOB_OPTIONS.currentRuleID) {
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
			prefs[COMMENT_SNOB_OPTIONS.currentRuleID] = prefObject;

			COMMENT_SNOB_UTIL.setJSONPref("rulePrefs", prefs);
		}
	},

	useDefaultChange : function () {
		var useDefaultCheckbox = $('#use-default');
	
		if (COMMENT_SNOB_OPTIONS.currentRuleID && useDefaultCheckbox.is(':checked')) {
			$("#custom-preferences").css("visibility", "hidden");
			COMMENT_SNOB_UTIL.removeRulePrefs(COMMENT_SNOB_OPTIONS.currentRuleID);
		}
		else {
			$("#custom-preferences").css("visibility", "visible");
	
			if (COMMENT_SNOB_OPTIONS.currentRuleID) {
				COMMENT_SNOB_OPTIONS.save();
			}
		}
	}
};

addEventListener( "load", function () {
	removeEventListener( "load", arguments.callee, false );

	// Instant-apply any preference changes.
	$(".preference").on( "click change blur keyup", function () {
		COMMENT_SNOB_OPTIONS.save();
	});

	$("#extreme").click( COMMENT_SNOB_OPTIONS.setDisabled );

	$("#remove").click(function () {
		if (confirm("Are you sure?")) {
			COMMENT_SNOB_UTIL.removeRule( COMMENT_SNOB_OPTIONS.currentRuleID );
			COMMENT_SNOB_OPTIONS.populateRuleList();
		}
	});

	$("#update").click( function () {
		var progressContainer = $( '#update-progress' );
		progressContainer.text( '' );
	
		progressContainer.append(
			$( '<description/>' ).text( COMMENT_SNOB.strings.getString( 'label_updating' ) )
		).show();
	
		var rules = COMMENT_SNOB_UTIL.getJSONPref( "rules", {} );
	
		if ( COMMENT_SNOB_OPTIONS.currentRuleID in rules ) {
			var currentRule = rules[ COMMENT_SNOB_OPTIONS.currentRuleID ];
		
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
			COMMENT_SNOB_OPTIONS.populateRuleList();
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
		COMMENT_SNOB_OPTIONS.showRuleSettings($(this).attr("ruleid"));

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
		COMMENT_SNOB_OPTIONS.populateRuleList();
		$(".user-rule[ruleid='youtube@chrisfinke.com']").click();
	});

	$("#use-default").click(function () {
		COMMENT_SNOB_OPTIONS.useDefaultChange();
	});

	COMMENT_SNOB_OPTIONS.populateRuleList();

	COMMENT_SNOB_OPTIONS.showRuleSettings();
}, false);