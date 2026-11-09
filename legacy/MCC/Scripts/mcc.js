/// <reference path="jquery-1.10.2.intellisense"/>

(function ($) {
	//Unique separator
	var separator = "_multiColumn_";
	// Controls Prefixes 
	var divPrefix = "divMultiCol" + separator;
	var textBoxPrefix = "multiColumnCombo" + separator;
	var buttonPrefix = "multiColumnButton" + separator;

	var tableDivPrefix = "divTable" + separator;
	var tableIdPrefix = "dropDownTable" + separator;

	var oldColor = [];
	var oldBorderColor = [];
	var originalButtonBorderColor = "Grey";

	var fontName = "\"Arial\"";

	var currentlySelectedRow = {};

	$.prototype.beforeRowSelected = function (data, fn) {
		return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
	};

	var e;

	$.fn.mcc = function (options) {
		// Extend the default options
		var opts = $.extend({}, $.fn.mcc.defaultOptions, options);

		// DIVs to use
		var divs = $(this);
		// Style for button

		var buttonCssNormal = "style = 'padding-left: 2px; margin-left: -1px; vertical-align: middle; border-color: " + originalButtonBorderColor + "; border-width: 1px; border-style: solid;  height: 110%;" +
			" width: " + opts.ComboHeight + "px; font-family: " + fontName + ";'";

		// Main Working Body
		return this.each(function () {
			// Save current object
			var $this = $(this)[0];
			// Id of Current control (div)
			var controlId = $this.id;
			// Id of New Div for Text Box
			var divId = divPrefix + controlId;
			// Id of new text box
			var textBoxId = textBoxPrefix + controlId;
			// Id of the new button
			var buttonId = buttonPrefix + controlId;

			// Check if the current object is a text box. Throw error if not. Can work on text boxes only
			if ($this.nodeName !== "DIV") {
				throw new Error("Can work only on 'DIV' tags...");
			}

			// Variable to store the current status of the element in the status array. Used to handle multiple dropdowns in one page
			var isAlreadyPresent = null;
			try {
				// Check if the dropdown is present in the list
				isAlreadyPresent = isDropDownShown[controlId];
			}
			catch (ex) {
				// the array itself is not present, create it
				var isDropDownShown = {};
			}
			// Store presence of the element as false in the array if not present
			if (isAlreadyPresent === null || isAlreadyPresent === undefined || !isAlreadyPresent) {
				isDropDownShown[controlId] = false;
			}

			// This changed line tests to see if the Metadata Plug-in is installed,
			// And if it is, it extends our options object with the extracted metadata.
			opts = $.meta ? $.extend({}, opts, $this.data()) : opts;

			// Create the dropdown table
			var dropDown = createDropDownTable($this.id, opts.DataSource, opts.ColumnHeadersSource, opts.DataSourceColumns, opts.AddBlankRow, opts.ColumnsToHide, opts.NoOfItemsToShow);
			// Hide the dropdowns
			dropDown.hide();
			// Remove existing plug-in if already present
			try {
				document.getElementById(divId).parentNode.removeChild(document.getElementById(divId));
			}
			catch (err) {
				// Ignore any errors
			}

			// Create the Textbox and the button
			divs.prepend("<div id='" + divId + "' class='divStyle' style='width:" + opts.ComboWidth + "px; height:" + opts.ComboHeight + "px'><input type='text'  id='" + textBoxId + "' value='' " +
				"style='vertical-align: middle; width:" + (opts.ComboWidth - opts.ComboHeight - 4) + "px; height:" + (opts.ComboHeight - 2) + "px'/><input type='button'  id='" + buttonId + "' " + buttonCssNormal + "value='▼' /></div>");

			// Set tooltip of Div
			divs.attr("title", opts.ToolTip);
			// Set tooltip of text box
			$("#" + textBoxId).attr("title", opts.ToolTip);
			// Set tooltip of button
			$("#" + buttonId).attr("title", opts.ToolTip);

			// click of row
			divs.find('tr').click(function () {
				// Select the row
				return clickRow(this, controlId);
			});

			//// Set the row to be the active one when mouse is over it.
			//divs.find('tr').mouseenter(function () {
			//	// Select the row
			//	setActiveRow(this, 0, controlId);
			//});

			// Do Nothing if table header is clicked
			divs.find('th').click(function () {
				// Nothing to do on header click
				return false;
			});

			// on focus of divs
			divs.focus(function () {
				divs.find("input[type='text']").focus();
				divs.find("input[type='text']").select();
			});

			// Setup filter on Text box change
			setupFilter(textBoxId, dropDown.attr("id"));

			//#region Handle Keyboard

			$("#" + buttonId).keydown(function (eventData) {
				return keydownHandler(eventData);
			});
			$("#" + textBoxId).keydown(function (eventData) {
				return keydownHandler(eventData);
			});
			$("#" + controlId).keydown(function (eventData) {
				return keydownHandler(eventData);
			});
			$("#" + divId).keydown(function (eventData) {
				return keydownHandler(eventData);
			});

			function keydownHandler(eventData) {
				// Get the key Pressed
				var key = eventData.keyCode ? eventData.keyCode : eventData.charCode;
				// Get the id of the source element
				var sourceElementId = getControlId(eventData);

				//var isControlDown = e.ctrlKey;
				var isAltDown = eventData.altKey;
				//var isShiftDown = e.shiftKey;

				// Get the currently selected row
				var currentRow = getSelectedRow(sourceElementId);
				// Get the currently active row for the control
				currentRow = getActiveRow(sourceElementId);

				switch (key) {
					case keys.F4:
						// Handle F4 to toggle the drop down
						if (isDropDownShown[controlId]) { hideDropDown(); } else { showDropDown(); }
						return false;
					case keys.DOWN:
						// Handle ALT+DOWN to open the drop down
						if (isAltDown) { showDropDown(); return false; }
						// Else mark the next row as active
						setActiveRow(currentRow, 1, sourceElementId);
						return false;
					case keys.UP:
						// Handle ALT+UP to close the drop down
						if (isAltDown) { hideDropDown(); return false; }
						// Else mark the previous row as active
						setActiveRow(currentRow, -1, sourceElementId);
						//setSelectedRow(eventData, setActiveRow(currentRow, -1, sourceElementId));
						return false;
					case keys.ESC:
						setSelectedRow(eventData, getSelectedRow(sourceElementId));
						hideDropDown();
						return false;
					case keys.RETURN:
						clickRow(currentRow, controlId);
						hideDropDown();
						return false;
					default:
						return true;
				}
			}

			//#endregion

			//#region Show/Hide Dropdown

			// Text Box Click
			divs.find("input[type='text']").click(function () {
				$(this).select();
				showDropDown();
			});

			// Image Click
			divs.find("input[type='image']").click(function () {
				showDropDown();
			});

			// Button Click
			$("#" + buttonId).click(function () {
				if (divs.prop("disabled") !== true && !isDropDownShown[controlId]) {
					showDropDown();
				} else {
					hideDropDown();
				}
			});

			$("#" + buttonId).mouseleave(function () {
				mouseLeaveHandler("#" + buttonId);
				mouseLeaveHandler("#" + textBoxId);
			});
			$("#" + buttonId).mouseenter(function () {
				mouseEnterHandler("#" + buttonId);
				mouseEnterHandler("#" + textBoxId);
			});

			$("#" + textBoxId).mouseenter(function () {
				mouseEnterHandler("#" + textBoxId);
				mouseEnterHandler("#" + buttonId);
			});

			$("#" + textBoxId).mouseleave(function () {
				mouseLeaveHandler("#" + textBoxId);
				mouseLeaveHandler("#" + buttonId);
			});

			// Click of Document. Handles multiple dropdowns
			$(document).click(function (eventData) {
				var source;
				try {
					if (eventData.srcElement === undefined || eventData.srcElement === null) {
						source = eventData.target.id;
					} else {
						source = eventData.srcElement.id;
					}
				}
				catch (exceptionCaught) {
					source = null;
				}

				// Return if called from the button or text box
				if (source === buttonId || source === textBoxId) {
					return false;
				}

				if (source === null || source === undefined || isDropDownShown[controlId]) {
					// Hide the dropdown
					hideDropDown();
				} else if (source.split(separator)[1] === controlId && !isDropDownShown[controlId]) {
					// Show the div
					showDropDown();
				}
				return true;
			});

			// Show Dropdown
			function showDropDown() {
				// Show the div
				if (divs.prop("disabled") !== true) {
					dropDown.show();
					// Get the currently selected row
					var currentRow = getSelectedRow(controlId);
					// Do nothing if no row selected
					if (currentRow) {
						setActiveRow(currentRow, 0, controlId);
						scrollToShow(currentRow, controlId);
					}
					isDropDownShown[controlId] = true;
				}
			}
			// Hide Dropdown
			function hideDropDown() {
				// Hide the div
				dropDown.hide();
				isDropDownShown[controlId] = false;
			}

			//#endregion

		});

		//#region Event Triggers

		function beforeRowSelected(sender) {
			var parentControl = sender.parentNode.parentNode;
			e = {
				type: 'beforeRowSelected',
				currentRow: getSelectedRow(getControlId(parentControl)),
				rowToSelect: sender,
				currentValue: $(getSelectedRow(getControlId(parentControl))).find("td:eq(" + opts.ValueMember + ")").text(),
				newValue: $(sender).find("td:eq(" + opts.ValueMember + ")").text(),
				isCancelled: false
			};
			$(sender).trigger(e);

			return e.isCancelled;
		}

		function afterRowSelected(sender) {
			$(sender).trigger({
				type: 'afterRowSelected',
				currentRow: sender,
				currentValue: $(sender).find("td:eq(" + opts.ValueMember + ")").text()
			});
		}
		//#endregion

		//#region Mouse Event Handlers

		// Mouse Event handlers
		function mouseEnterHandler(control) {
			oldColor[control] = $(control).css("color");
			oldBorderColor[control] = $(control).css("border-color");

			$(control).css("border-color", "Orange");
			$(control).css("color", "Orange");
		}

		function mouseLeaveHandler(control) {
			$(control).css("border-color", oldBorderColor[control]);
			$(control).css("color", oldColor[control]);
		}

		//#endregion

		// Get Control Id
		function getControlId(eventData) {
			var controlIdToReturn;
			try {
				if (eventData.srcElement === undefined || eventData.srcElement === null) {
					controlIdToReturn = eventData.target.id;
				} else {
					controlIdToReturn = eventData.srcElement.id;
				}
			}
			catch (ex) {
				controlIdToReturn = null;
			}

			if (!controlIdToReturn) {
				controlIdToReturn = eventData.id;
			}
			var tempArray = controlIdToReturn.split("_");
			controlIdToReturn = tempArray[tempArray.length - 1];

			return controlIdToReturn;
		}

		//#region Row Selection Handlers

		// Get Selected Row from Control Id
		function getSelectedRow(sourceElementId) {
			// Row to be returned
			var rowToReturn;

			// Source Not Found
			if (sourceElementId === undefined || sourceElementId === null || sourceElementId === "") {
				return null;
			}
			// Get the row to return
			rowToReturn = currentlySelectedRow[sourceElementId];

			// return the row
			return rowToReturn;
		}

		// Set Selected Row for Control 
		function setSelectedRow(eventDataOrId, rowToSet) {
			var sourceElementId;
			// Check if an id has been provided
			if ($.type(eventDataOrId) === "string") {
				// Yes, assign the id directly
				sourceElementId = eventDataOrId;
			} else {
				// Get the id of the source element from the object
				sourceElementId = getControlId(eventDataOrId);
			}

			// Source Not Found
			if (sourceElementId === undefined || sourceElementId === null || sourceElementId === "") {
				return null;
			}
			// Set the row
			currentlySelectedRow[sourceElementId] = rowToSet;

			return rowToSet;
		}

		function getActiveRow(sourceElementId) {

			// Get the row with 'selected' class
			var activeRow = $("#" + tableIdPrefix + sourceElementId + " tbody tr").filter("*.selected")[0];

			if (!activeRow) { return null; }

			return activeRow;
		}

		function setActiveRow(currentRow, change, sourceElementId) {
			var rowToSelect = currentRow;

			if (change === undefined || change === null) {
				change = 0;
			}

			if (!rowToSelect) {
				// Get the first row of the table
				rowToSelect = $("#" + tableIdPrefix + sourceElementId + " tbody >  tr")[0];
				// Set the change to 0
				change = 0;
			}

			// variable for row traversal
			var i;
			// Go to next row(s)
			if (change > 0) {
				// Find the row to be selected
				for (i = 0; i < change; i++) {
					// Get the next first row that is visible
					var nextRow = $(rowToSelect).nextAll("tr:visible").first();

					// Do not go past the last visible row
					if (nextRow.length > 0) {
						rowToSelect = nextRow;
					}
				}
			} else if (change < 0) {
				// Find the row to be selected
				for (i = 0; i > change; i--) {
					// Get the previous first row that is visible
					var previousRow = $(rowToSelect).prevAll("tr:visible").first();
					// Do not go past the first visible row
					if (previousRow.length > 0) {
						rowToSelect = previousRow;
					}
				}
			}
			// If the row to select is not the actual row then get the actual row
			if (rowToSelect.length) { rowToSelect = rowToSelect[0]; }

			// Select the row
			$(rowToSelect).siblings().removeClass("selected");
			$(rowToSelect).addClass("selected");

			scrollToShow(rowToSelect, sourceElementId);

			// Return the selected row
			return $(rowToSelect)[0];
		}

		function clickRow(rowToClick, controlId) {
			// Select the row
			setActiveRow(rowToClick, 0, controlId);

			// Raise the before selected event
			if (beforeRowSelected(rowToClick)) {
				// If canceled then return
				return false;
			}

			// Set the display text
			divs.find("input[type='text']").val($(rowToClick).find("td:eq(" + opts.DisplayMember + ")").text());
			// Set the currently selected row
			setSelectedRow(controlId, rowToClick);

			// raise the afterRowSelected Event
			afterRowSelected(rowToClick);

			// Unhide all rows if hidden by text box input
			showAllRows(tableDivPrefix + controlId);
			return true;
		}

		//#endregion

		// Show All rows
		function showAllRows(dropdownTableId) {
			/// <summary>Makes all the rows of the specified table visible</summary>
			/// <param name="dropdownTableId">Id of the Table</param>
			$('#' + dropdownTableId + ' tbody tr').show();
			updateRows($('#' + dropdownTableId + ' tbody tr'), true);
			return true;
		}

		// Scroll the table to show the specified row 
		function scrollToShow(rowToShow, sourceElementId) {
			var scrollTo;
			// Make the row visible
			var container = $("#" + tableDivPrefix + sourceElementId);
			var containerHeight = container.height();

			var scrollToRow = $(rowToShow);
			var rowHeight = scrollToRow.height();

			// Total no of rows visible except the header row
			var visibleRowsCount = Math.ceil(containerHeight / rowHeight) - 1;

			var rowTop = Math.ceil(scrollToRow[0].offsetTop);

			scrollTo = rowTop + rowHeight - visibleRowsCount * rowHeight;

			// Set the top of container to make the row visible
			container[0].scrollTop = scrollTo;
		}

		// Filter on Text box type
		function setupFilter(textboxId, dropdownTableId) {
			$('#' + textboxId).bind("input", function (keyData) {
				var keyPressed = keyData.key;
				var text = $("#" + textboxId).val();
				// Blank Text Box, Show All rows
				if (text === "") {
					showAllRows(dropdownTableId);
				}
				// Ignore "Shift", "Control" and "Alt" keys
				if (keyPressed === "Shift" || keyPressed === "Control" || keyPressed === "Alt") {
					return true;
				}

				// Hide All rows
				$('#' + dropdownTableId + ' tbody tr').hide();

				var allRows = $('#' + dropdownTableId + ' tbody tr');

				var rowsToShow = allRows.filter("*:containsIgnoreCase('" + text + "')");

				rowsToShow.show();

				// Apply the Odd and Even Rows CSS
				updateRows(rowsToShow, true);

				return true;
			});
		}

		// Create drop down table
		function createDropDownTable(divName, data, displayColumns, actualColumns, addBlankRow, columnsToHide, noOfItemsToShow) {
			// Variables
			var tableId = tableIdPrefix + divName;
			var tableDivName = tableDivPrefix + divName;
			var divForTable = $("#" + divName);
			var html;

			// If data has less items than to show then adjust height
			if (data.length < noOfItemsToShow) {
				noOfItemsToShow = data.length + 2;
			}

			// HTML Mark up for headers
			var headerMarkup = getColumnHeaderMarkup(displayColumns);

			// Prepare the HTML for table
			// Prepare outer Div
			html = "<div id='" + tableDivName + "' style='overflow-x:hidden; overflow-y:auto;'>";
			// Append HTML for header table
			html += "<table id='" + tableId + "Header' width='100%' class='multiColumn'>";
			// Prepare the headers
			html += headerMarkup;
			// Finish table
			html += "</table>";
			// Start Main Table
			html += "<table id='" + tableId + "' width='100%' class='multiColumn'>";
			// Prepare the headers
			html += headerMarkup;
			// Start body
			html += "<tbody>";

			// Prepare Body
			// Check Data length
			if (data.length === 0) {
				// Add one blank row
				html += getBlankRow(actualColumns);
			} else {
				// Add a blank row to top if required
				if (addBlankRow) {
					html += getBlankRow(actualColumns);
				}
				// Add rows for Data
				for (var dataCount = 0; dataCount < data.length; dataCount++) {
					// New row
					html += "<tr>";
					// Cells for Data
					for (var columnCount = 0; columnCount < actualColumns.length; columnCount++) {
						var column = actualColumns[columnCount];
						var cellData = data[dataCount][column];
						// Check if Data is null or undefined
						if (cellData === null || cellData === undefined) {
							cellData = "#Invalid#";
						}
						// Check if data is a date
						if (cellData !== null && cellData !== undefined && $.type(cellData) !== "number" && cellData.indexOf('/Date') !== -1) {
							// If yes the convert to date string
							cellData = getDateFromJson(cellData);
						}
						// Add the Cell
						html += "<td>" + cellData + "</td>";
					}
					// Finish Row
					html += "</tr>";
				}
			}
			// Finish Table and Div
			html += "</tbody></table></div>";
			// Add html to the div
			$(html).appendTo('#' + divName + '');

			// Drop Down Item
			var dropDown = $("#" + tableDivName);

			var rowHeight = parseInt(divForTable.find("tr").css("height").replace("px", ""), 10);
			var headerHeight = parseInt(divForTable.find("th").css("height").replace("px", ""), 10);
			var headerWidths = [];
			// Height of div for table
			var divHeight = (noOfItemsToShow * rowHeight) + headerHeight;

			// Padding-Right/Height of div according to browser, default for MSIE
			var paddingRight;
			if (!isInternetExplorer()) {
				paddingRight = 18;
				divHeight = Math.ceil(divHeight) + 7;
			} else {
				paddingRight = 0;
				divHeight = Math.ceil(divHeight) + 4;
			}

			// Set the Dropdown height
			dropDown.css("height", divHeight);

			// Hide the columns specified
			dropDown.find("tr").each(function () {
				for (var j = 0; j < columnsToHide.length; j++) {
					$(this).find("td:eq(" + columnsToHide[j] + ")").css("display", "none");
					$(this).find("th:eq(" + columnsToHide[j] + ")").css("display", "none");
				}
			});

			dropDown.find("td").each(function () {
				$(this).css("padding-right", "10px");
				$(this).css("border", "1px solid black");
			});

			dropDown.find("th").each(function () {
				$(this).css("text-align", "left");
				$(this).css("padding-right", "10px");
				$(this).css("border", "1px solid black");
				$(this).css("font-weight", "bold");
				$(this).css("background", "#999");
				$(this).css("color", "#000");
			});

			dropDown.css("position", "absolute");
			dropDown.css("margin-left", opts.LeftMargin);
			dropDown.css("margin-top", opts.TopMargin);
			dropDown.css("z-index", "5000");
			dropDown.find("tbody tr");
			// Set the padding
			dropDown.css("padding-right", paddingRight + "px");

			// Fix the column headers of header table
			$("#" + tableId + "Header").find("thead").css("position", "fixed");

			// Get the array for width of columns
			$("#" + tableId).find("th").each(function () {
				headerWidths.push($(this).css("width").replace("px", ""));
			});
			// Set the width of columns in the header table
			for (var i = 0; i < $("#" + tableId + "Header").find("th").length; i++) {
				$("#" + tableId + "Header").find("th:eq(" + i + ")").css("width", headerWidths[i]);
				$("#" + tableId).find("th:eq(" + i + ")").css("width", headerWidths[i]);
			}

			// Hide the place holder text box if any
			$('#txt' + divName).hide();

			// Apply the Odd and Even Rows CSS
			updateRows(tableId);

			return dropDown;
		}

		// Update Row Color
		function updateRows(tableIdOrRowCollection, isCollection) {
			if (isCollection) {
				for (var i = 0; i < tableIdOrRowCollection.length; i++) {
					if (i % 2 === 0) {
						$(tableIdOrRowCollection[i]).css("background-color", opts.rowColor.even);
					} else {
						$(tableIdOrRowCollection[i]).css("background-color", opts.rowColor.odd);
					}
				}
			} else {
				$("#" + tableIdOrRowCollection + "  tbody tr:odd").css("background-color", opts.rowColor.odd);
				$("#" + tableIdOrRowCollection + "  tbody tr:even").css("background-color", opts.rowColor.even);
			}
		}

		// Get the column header mark up
		function getColumnHeaderMarkup(columnsToDisplay) {
			var markupToReturn = "<thead>";
			// Prepare the headers
			for (var i = 0; i < columnsToDisplay.length; i++) {
				markupToReturn += "<th>" + columnsToDisplay[i] + "</th>";
			}
			// Finish Headers 
			markupToReturn += "</thead>";

			// return the mark up
			return markupToReturn;
		}
		// Get a blank row HTML for specified columns
		function getBlankRow(columns) {
			var htmlToReturn = "<tr>";
			var columnCount = columns.length;
			// If no columns then change length to 1
			if (columnCount === 0) {
				columnCount = 1;
			}
			// Add one blank cell for each column
			for (var count = 0; count < columnCount; count++) {
				htmlToReturn += "<td>&nbsp;</td>";
			}
			htmlToReturn += "</tr>";

			return htmlToReturn;
		}

		// Get Date from a JSON string
		function getDateFromJson(dateString) {
			/// <summary>Gets the date from the specified JSON string</summary> 
			/// <param name="dateString">JSON string containing date in JSON format</param> 
			/// <returns type="">A date object</returns> 
			var language = "<%= Request.UserLanguages[0] %>";
			jQuery.preferCulture(language);

			if (dateString !== null && dateString !== undefined && dateString !== "") {
				var date = new Date(parseInt(dateString.substr(6), 10));
				date = jQuery.format(date);
				return date;
			} else {
				return "";
			}
		}

		// Check if Browser is IE Version < 11
		function isInternetExplorer() {
			return (/msie/.test(navigator.userAgent.toLowerCase()) || /rv/.test(navigator.userAgent.toLowerCase()));
		}
	};

	// Disable/Enable the combo
	$.fn.disable = function (value) {
		// Store the element to be disabled
		var controlId = $(this)[0].id;
		if (!value) {
			throw "No value specified";
		}

		$("#" + divPrefix + controlId).prop('disabled', value);
		$("#" + buttonPrefix + controlId).prop('disabled', value);
		$("#" + textBoxPrefix + controlId).prop('disabled', value);
		$("#" + controlId).prop('disabled', value);
	};

	// Set the value in Combo
	$.fn.mcc.setDropDownValue = function (value) {
		// Store the element to be converted to multi column combo
		var controlId = $(this)[0].id;
		$("#" + textBoxPrefix + controlId).val(value);
	};
	//Get the value from Combo
	$.fn.mcc.getDropDownValue = function () {
		// Store the element to be converted to multi column combo
		var controlId = $(this)[0].id;
		return $("#" + textBoxPrefix + controlId).val();
	};

	// Default Options
	$.fn.mcc.defaultOptions = {
		DataSource: [],              // Data list to bind
		ColumnHeadersSource: [],     // List of columns to display as headers
		DataSourceColumns: [],       // list of columns to be bind to the table
		ButtonImage: "",             // Image to be used for the button 
		DisplayMember: 0,            // The column to be used to display value for the textbox
		ValueMember: 0,              // The column to be used for the value of the drop down
		ColumnsToHide: [],           // List of columns to be hidden
		ComboWidth: 180,             // Width of the combo
		ComboHeight: 20,             // Height of the combo
		TopMargin: 3,                // Left Margin for Table
		LeftMargin: 0,               // Top Margin for Table
		ToolTip: "",                 // Tooltip for the combo
		AddBlankRow: false,          // Flag to add a Blank row on top
		NoOfItemsToShow: 8,           // No of items to show
		rowColor: {
			odd: "LightGrey",
			even: "white"
		}
	};

	// Styles for the control
	$.fn.mcc.CSS = {
		TextBox: {
			Normal: {},
			Hover: {}
		},
		button: {
			normal: {
				paddingLeft: "2px",
				marginLeft: "-1px",
				verticalAlign: "middle",
				borderColor: "Grey",
				borderWidth: "1px",
				borderStyle: "solid",
				fontFamily: fontName,
				height: "111%",
				width: "500px"
			},
			hover: {
				paddingLeft: "2px",
				marginLeft: "-1px",
				verticalAlign: "middle",
				borderColor: "Orange",
				borderWidth: "1px",
				borderStyle: "solid",
				fontFamily: fontName,
				height: "111%",
				width: "500px"
			}
		}
	};

	var keys = {
		UP: 38,
		DOWN: 40,
		DEL: 46,
		TAB: 9,
		RETURN: 13,
		ESC: 27,
		COMMA: 188,
		PAGEUP: 33,
		PAGEDOWN: 34,
		BACKSPACE: 8,
		CTRL: 17,
		F4: 115
	};

	// Case-insensitive search
	$.expr[':'].containsIgnoreCase = function (n, i, m) {
		return $(n).text().toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
	};
})(jQuery);