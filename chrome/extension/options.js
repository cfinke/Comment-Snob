function populateRuleList() {
	var ruleList = $("#sites");
	
	ruleList.find("li").each(function () {
		if ($(this).attr("ruleid")) {
			$(this).remove();
		}
	});
	
	ruleList.find("li").click();
	
	var rules = COMMENT_SNOB.prefs.getJSONPref("rules", {});
	
	for (var i in rules) {
		var option = $("<li/>");
		option.addClass("navbar-item");
		option.attr("ruleid", i);
		option.text(rules[i].label);
		option.attr("pagename", "rule");
		option.val(i);
		
		ruleList.append(option);
	}
	
	if (!("youtube@chrisfinke.com" in rules)) {
		$("#reinstall-youtube").show();
	}
	else {
		$("#reinstall-youtube").hide();
	}
}

function showRuleSettings(ruleId) {
	var prefs = COMMENT_SNOB.prefs.getJSONPref("rulePrefs", {});
	var customPrefs = false;
	
	if (ruleId in prefs) {
		var rulePrefs = prefs[ruleId];
		customPrefs = true;
	}
	else {
		var rulePrefs = COMMENT_SNOB.defaultPrefs;
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
	
	$("#custom-preferences").show();
	
	setDisabled();
	
	if (ruleId) {
		$("#rule-management").show();
		$("#default-preferences").show();
		$("#remove").attr("ruleid", ruleId);
		
		if (!customPrefs) {
			$("#use-default").each(function () { this.checked = true; });
		}
		else {
			$("#use-default").removeAttr("checked");
		}
	}
	else {
		$("#rule-management").hide();
		$("#default-preferences").hide();
	}
	
	$("#use-default").change();
}

function setDisabled() {
	var disabled = $("#extreme").is(":checked");

	$(".preference").each(function () {
		if ($(this).attr("id") != "extreme") {
			$(this).attr("disabled", disabled);
		}
	});
}

function save() {
	var ruleId = $("#sites li.navbar-item-selected:first").attr("ruleid");
	
	if (!ruleId) {
		$(".preference-bool").each(function () {
			COMMENT_SNOB.prefs.setBoolPref($(this).attr("preference"), $(this).is(":checked"));
		});
		
		$(".preference-int").each(function () {
			COMMENT_SNOB.prefs.setIntPref($(this).attr("preference"), $(this).val());
		});

		$(".preference-text").each(function () {
			COMMENT_SNOB.prefs.setCharPref($(this).attr("preference"), $(this).val());
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

		var prefs = COMMENT_SNOB.prefs.getJSONPref("rulePrefs", {});
		prefs[ruleId] = prefObject;

		COMMENT_SNOB.prefs.setJSONPref("rulePrefs", prefs);
	}
}

$(document).ready(function () {
	COMMENT_SNOB.localize(document);
	
	document.title = chrome.i18n.getMessage("options_page_title");

	$(".preference").change(function () {
		save();
	});

	$("#extreme").click(setDisabled);

	$("#remove").click(function () {
		if (confirm("Are you sure?")) {
			COMMENT_SNOB.removeRule($(this).attr("ruleid"));
			populateRuleList();
		}
	});
	
	$(".navbar-item").live("click", function () {
		$(".navbar-item-selected").removeClass("navbar-item-selected");
		$(this).addClass("navbar-item-selected");
		
		$(".page").hide();
		$("#" + $(this).attr("pagename") + "Page").show();
	});
	
	$("#add-finish").click(function () {
		$("#rule-error").hide();
		
		var rule = $("#add-rule").val();
		
		try {
			var jsonRule = JSON.parse(rule);
		} catch (e) {
			$("#rule-error").text("Invalid JSON: " + e).show();
			return;
		}
		
		var rv = COMMENT_SNOB.addRule(jsonRule);
		
		if (!rv.status) {
			$("#rule-error").text(rv.msg).show();
		}
		else {
			populateRuleList();
			$("#sites li[ruleId='" + jsonRule.id + "']").click();
			$("#add-rule").val("");
		}
	});
	
	$("#sites li").live("click", function () {
		showRuleSettings($(this).attr("ruleid"));
		
		if ($(this).attr("ruleid")) {
			$("#remove").attr("disabled", false);
		}
		else {
			$("#remove").attr("disabled", true);
		}
	});
	
	$("#install-youtube").click(function (e) {
		e.preventDefault();
		
		COMMENT_SNOB.addRule(COMMENT_SNOB.youtubeRule);
		populateRuleList();
		$("#sites li[ruleId='youtube@chrisfinke.com']").click();
	});
	
	$("#use-default").change(function () {
		var ruleId = $("#sites li.navbar-item-selected:first").attr("ruleid");
		
		if (ruleId && $(this).is(":checked")) {
			$("#custom-preferences").hide();
			COMMENT_SNOB.removeRulePrefs(ruleId);
		}
		else {
			$("#custom-preferences").show();
			
			if (ruleId) {
				save();
			}
		}
	});
	
	populateRuleList();
	
	showRuleSettings();
});
