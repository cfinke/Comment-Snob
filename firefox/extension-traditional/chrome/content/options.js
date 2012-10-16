Components.utils.import("resource://comment-snob-modules/comment-snob-minify.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-util.js");
Components.utils.import("resource://comment-snob-modules/comment-snob-updater.js");

var COMMENT_SNOB_OPTIONS = {
	/**
	 * The ID of the rule currently being managed.
	 */
	currentRuleID : null,
	
	/**
	 * Reset and populate the list of rules in the sidebar.
	 */
	populateRuleList : function () {
		$( "#navbar-container label.user-rule" ).remove();
	
		var rules = COMMENT_SNOB_UTIL.prefs.getJSONPref("rules", {});
	
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

	/**
	 * Show the filtering preferences for a given rule.
	 *
	 * @param string ruleId
	 */
	showRuleSettings : function ( ruleId ) {
		var prefs = COMMENT_SNOB_UTIL.prefs.getJSONPref("rulePrefs", {});
	
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
			$( "#rule-management, #default-preferences, #edit-rule" ).show();
		
			if (!customPrefs) {
				$("#use-default").each(function () { this.checked = true; });
			}
			else {
				$("#use-default").each(function () { this.checked = false; });
			}
			
			var rules = COMMENT_SNOB_UTIL.prefs.getJSONPref( "rules", {} );
			var rule = rules[ ruleId ];
			
			if ( "updateURL" in rule )
				$( '#update' ).show();
			else
				$( '#update' ).hide();
		}
		else {
			// Show the default filtering rules.
			COMMENT_SNOB_OPTIONS.currentRuleID = null;
			$( "#rule-management, #default-preferences, #edit-rule" ).hide();
		}
	
		$( '#update-progress' ).text( '' );
	
		COMMENT_SNOB_OPTIONS.useDefaultChange();
	},

	/**
	 * Disable the fine-grained filtering preferences if the "Hide all comments" option
	 * is checked.
	 */
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

	/**
	 * Save the current state of all of the preference options.
	 */
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

			var prefs = COMMENT_SNOB_UTIL.prefs.getJSONPref("rulePrefs", {});
			prefs[COMMENT_SNOB_OPTIONS.currentRuleID] = prefObject;

			COMMENT_SNOB_UTIL.prefs.setJSONPref("rulePrefs", prefs);
		}
	},

	/**
	 * Update the UI after a click to the "Use default filtering preferences" checkbox.
	 */
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