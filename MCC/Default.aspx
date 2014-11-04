<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Default.aspx.cs" Inherits="SamplePlugin1.Default" %>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
	<link type="text/css" rel="stylesheet" href="Styles/plugin1.css" />
	<script type="text/javascript" src="Scripts/jquery-1.10.2.js"></script>
	<script type="text/javascript" src="Scripts/Countries.js"></script>
	<script type="text/javascript" src="Scripts/mcc.js"></script>
	<script type="text/javascript">
		var countryDisplayColumns = [];
		countryDisplayColumns[0] = "Name";
		countryDisplayColumns[1] = "Code";
		countryDisplayColumns[2] = "Region Code";

		var countryDataColumns = [];
		countryDataColumns[0] = "name";
		countryDataColumns[1] = "alpha-2";
		countryDataColumns[2] = "region-code";

		$(document).ready(function () {
			$("#testPlugin").mcc({
				DataSource: countries,
				ColumnHeadersSource: countryDisplayColumns,
				DataSourceColumns: countryDataColumns,
				ToolTip: "Drop Down 1",
				AddBlankRow: true//,
				//rowColor: {
				//	odd: "#66ffff",
				//	even: "#ffffff"
				//}
			});

			$("#dd2").mcc({
				DataSource: countries,
				ColumnHeadersSource: countryDisplayColumns,
				DataSourceColumns: countryDataColumns,
				ToolTip: "Drop Down 2",
				AddBlankRow: true,
				rowColor: {
					odd: "#66ffff",
					even: "#ffffff"
				}
			});

			$("#dd2").bind("beforeRowSelected", function (e) {
				e.isCancelled = true;
				alert("Current Value : " + e.currentValue + "\n    New Value : " + e.newValue);
			});
			$("#dd2").bind("afterRowSelected", function (e) {
				alert("New Value : " + e.currentValue);
			});
		});

		function disableDd(control) {
			$(control).disable(!$(control).is('disabled'));
		}

	</script>
	<title>Sample PlugIn 1</title>
</head>
<body>
	<div>
		<table>
			<tr>
				<td>
					<div id="testPlugin">
					</div>
				</td>
				<td>
					<input type="button" id="d1" value="Toggle Disability" onclick="disableDd('#d1');" />
				</td>
			</tr>
			<tr>
				<td>
					<div id="dd2">
					</div>
				</td>
				<td>
					<input type="button" id="d2" value="Toggle Disability" onclick="disableDd('#d2');" />
				</td>
			</tr>
		</table>
	</div>
</body>
</html>
