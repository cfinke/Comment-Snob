function populateRuleList() {
	$( "#navbar-container label.user-rule" ).remove();
	
	var rules = EXTENSION.prefs.getJSONPref("rules", {});
	
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
	var prefs = EXTENSION.prefs.getJSONPref("rulePrefs", {});
	
	var customPrefs = false;
	
	if (ruleId in prefs) {
		var rulePrefs = prefs[ruleId];
		customPrefs = true;
	}
	else {
		var rulePrefs = EXTENSION.defaultPrefs;
	}
	
	$(".preference-bool").each(function () {
		this.checked = rulePrefs[$(this).attr("preference")];
	});
	
	$(".preference-int").each(function () {
		$(this).val(parseInt(rulePrefs[$(this).attr("preference")], 10));
	});

	$(".preference-text").each(function () {
		$(this).val(rulePrefs[$(this).attr("preference")]);
	});
	
	$("#custom-preferences").css("visibility", "visible");
	
	setDisabled();
	
	if (ruleId) {
		$("#rule-management").show();
		$("#default-preferences").show();
		$("#remove").attr("ruleid", ruleId);
		
		if (!customPrefs) {
			$("#use-default").each(function () { this.checked = true; });
		}
		else {
			$("#use-default").each(function () { this.checked = false; });
		}
	}
	else {
		$("#rule-management").hide();
		$("#default-preferences").hide();
	}
	
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
	var ruleId = $(".navbar-item-selected:first").attr("ruleid");
	
	if (!ruleId) {
		$(".preference-bool").each(function () {
			EXTENSION.prefs.setBoolPref($(this).attr("preference"), $(this).is(":checked"));
		});
		
		$(".preference-int").each(function () {
			EXTENSION.prefs.setIntPref($(this).attr("preference"), $(this).val());
		});

		$(".preference-text").each(function () {
			EXTENSION.prefs.setCharPref($(this).attr("preference"), $(this).val());
		});
	}
	else {
		var prefObject = {};

		$(".preference-bool").each(function () {
			prefObject[$(this).attr("preference")] = $(this).is(":checked");
		});

		$(".preference-int").each(function () {
			prefObject[$(this).attr("preference")] = $(this).val();
		});

		$(".preference-text").each(function () {
			prefObject[$(this).attr("preference")] = $(this).val();
		});

		var prefs = EXTENSION.prefs.getJSONPref("rulePrefs", {});
		prefs[ruleId] = prefObject;

		EXTENSION.prefs.setJSONPref("rulePrefs", prefs);
	}
}

function useDefaultChange() {
	var useDefaultCheckbox = $('#use-default');
	
	var ruleId = $(".navbar-item-selected:first").attr("ruleid");
	
	if (ruleId && useDefaultCheckbox.is(':checked')) {
		$("#custom-preferences").css("visibility", "hidden");
		EXTENSION.removeRulePrefs(ruleId);
	}
	else {
		$("#custom-preferences").css("visibility", "visible");
	
		if (ruleId) {
			save();
		}
	}
}

addEventListener( "load", function () {
	removeEventListener( "load", arguments.callee, false );
	
	// Localize the document.
	prepareStrings(function () {
		EXTENSION.localize(document);
		document.title = __("options_page_title");
	});
	
	// Instant-apply any preference changes.
	$(".preference").on( "click change", function () {
		save();
	});

	$("#extreme").click(setDisabled);

	$("#remove").click(function () {
		if (confirm("Are you sure?")) {
			EXTENSION.removeRule($(this).attr("ruleid"));
			populateRuleList();
		}
	});
	
	$("#add-finish").click(function () {
		$("#rule-error").hide();
		
		var rule = $("#add-rule").val();
		
		rule = minify(rule);
		
		try {
			var jsonRule = JSON.parse(rule);
		} catch (e) {
			$("#rule-error").text("Invalid JSON: " + e).show();
			return;
		}
		
		var rv = EXTENSION.addRule(jsonRule);
		
		if (!rv.status) {
			$("#rule-error").text(rv.msg).show();
		}
		else {
			populateRuleList();
			$("#navbar-container label[ruleid='" + jsonRule.id + "']").click();
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
		
		EXTENSION.addRule(EXTENSION.youtubeRule);
		populateRuleList();
		$(".user-rule[ruleid='youtube@chrisfinke.com']").click();
	});
	
	$("#use-default").click(function () {
		useDefaultChange();
	});
	
	populateRuleList();
	
	showRuleSettings();
}, false);