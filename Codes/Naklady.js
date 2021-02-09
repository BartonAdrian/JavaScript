
//********************************************************************************************************
var ss_config = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1N0hgdpJyWzsgS0BxEJXbd5uPz13_53cFNmxP4cAZpPg/edit?usp=sharing');
var SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1g0c727hCN__ejnP1yeeQexlGBnM2q0DZ27Trpg9dqs0/edit?usp=sharing";
var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName("prehled");

/*********************************************************************************************************
Skript:                                          MCC Skript na kontrolu rozpočtů pro Google Ads, Sklik a Facebook
Verze:                                           Budget control 22.11.2020
Vytvořil:                                        Stanislav Jílek [standajilek.cz]
Navrhli a testovali:                             Karel Rujzl [rujzl.cz] a Petra Větrovská [vetrovka.cz]
Prvotní myšlenka na kontrolu rozpočtů:           Hana Kobzová [hanakobzova.cz]
/********************************************************************************************************/

function main() {
//Vymazat spreadsheet
    spreadsheet.getRange('A:L').clearContent();

//Mail settings ------------------------------------------------------------------------------------------ 
    var settings_sheet = ss_config.getSheetByName("budget_control");

//Date settings ------------------------------------------------------------------------------------------
var current_date = new Date();
current_date.setTime(current_date.getTime() + 1000 * 60 * 60 * 8);
current_date.setUTCDate(1);
current_date.setUTCMonth(current_date.getUTCMonth() + 1);
var month = current_date.getUTCMonth();
var year = current_date.getUTCFullYear();

//Day (month percent and budget plan)
var day = new Date();
day.setTime(day.getTime() + 1000 * 60 * 60 * 8);
day = day.getUTCDate() - 1;

//Yesterday
var yesterday = new Date();
yesterday.setTime(yesterday.getTime() + 1000 * 60 * 60 * 8);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);

//Last 2 months
var last_2_months_date = new Date(Date.UTC(year, month - 1, 0));
var last_2_months = last_2_months_date.getUTCMonth();
var last_2_months_day_end = last_2_months_date.getUTCDate();
var last_2_months_year = last_2_months_date.getUTCFullYear();
//--------------------------------------------------------------------------------------------------------    
//ADWORDS*************************************************************************************************
spreadsheet.appendRow(["Google-ADS","\n"]);
spreadsheet.appendRow(["Účet","Období","Náklady","\n"]);
    try {
//Adwords settings  
        //Last row
        var row = 6;
        while (settings_sheet.getRange("D" + row).getValue() != "")
        {
            row += 1;
        }
        row -= 1;

        var adwords_settings = row > 5 ? settings_sheet.getRange("D6:E" + row).getValues() : [];


        //Cycle for a number of accounts
        for (var i = 0; i < adwords_settings.length; i++)
        {
            try {
                //Mcc select 
                try
                {
                    MccApp.select(MccApp.accounts().withIds([adwords_settings[i][0]]).get().next());
                } catch (err)
                {
                }

                //Variable (account) 
                var account_name = AdsApp.currentAccount().getName();

                var datum_start = Utilities.formatDate(new Date(Date.UTC(last_2_months_year, last_2_months, 1)), "GTM - 1", 'yyyyMMdd');
                var datum_end = Utilities.formatDate(new Date(Date.UTC(last_2_months_year, last_2_months, last_2_months_day_end)), "GTM - 1", 'yyyyMMdd');

                var report = AdsApp.report("SELECT Cost, ConversionValue, Conversions FROM ACCOUNT_PERFORMANCE_REPORT DURING " + datum_start + "," + datum_end).rows().next();

                //Variable (report)            
                var cost = (parseFloat(report['Cost'].split(",").join(""))).toFixed(0);
                var conversions_value = (parseFloat(report['ConversionValue'].split(",").join(""))).toFixed(0);
                var conversions = (parseFloat(report['Conversions'].split(",").join(""))).toFixed(0);
                var pno = ((cost / conversions_value) * 100).toFixed(2);
                pno = null_control(pno, cost, conversions_value);
                var cpa = (cost / conversions).toFixed(0);
                cpa = null_control(cpa, cost, conversions);

                if ( day == 0)
                {
                    cost = 0, conversions_value = 0, conversions = 0, pno = 0, cpa = 0;
                }

                var budget = adwords_settings[i][1];
                var budget_percent = ((cost / budget) * 100).toFixed(2);
                budget_percent = null_control(budget_percent, cost, budget);

                pushDataToSpreadSheet(account_name,last_2_months_year + "/" + (last_2_months + 1),cost);
            } catch (err) {
                Logger.log("GOOGLE ADS: " + err);
            }
        }
    } catch (err) {
        Logger.log("GOOGLE ADS: " + err);
    }

//--------------------------------------------------------------------------------------------------------     
//SKLIK***************************************************************************************************  
spreadsheet.appendRow(["SKLIK","\n"]);  
spreadsheet.appendRow(["Účet","Období","Náklady","\n"]);
    try {
//Sklik settings    
        //Last row
        var row = 6;
        while (settings_sheet.getRange("A" + row).getValue() != "")
        {
            row += 1;
        }
        row -= 1;

        var sklik_settings = row > 5 ? settings_sheet.getRange("A6:B" + row).getValues() : [];

        //Login to Sklik 
        var token = settings_sheet.getRange("B4").getValue();

//--------------------------------------------------------------------------------------------------------       
//client.login      
        var client_login = sklik_api([token], 'client.loginByToken');

//--------------------------------------------------------------------------------------------------------       
//client.get
        var client_get = sklik_api([{'session': client_login.session}], 'client.get')

        var sklik_account = [];

        for (var i = 0; i < sklik_settings.length; i++) //Sklik account
        {
            for (var j = 0; j < client_get.foreignAccounts.length; j++)
            {
                if (sklik_settings[i][0].toLowerCase() == client_get.foreignAccounts[j].username.toLowerCase())
                {
                    sklik_account.push([client_get.foreignAccounts[j].userId, client_get.foreignAccounts[j].username, sklik_settings[i][1]]);
                }
            }
            if (sklik_settings[i][0].toLowerCase() == client_get.user.username.toLowerCase())
            {
                sklik_account.push([client_get.user.userId, client_get.user.username, sklik_settings[i][1]]);
            }
        }

        //Cycle for a number of accounts
        for (var i = 0; i < sklik_account.length; i++)
        {
//--------------------------------------------------------------------------------------------------------          
//client.stats
                var datum_start = Utilities.formatDate(new Date(Date.UTC(last_2_months_year, last_2_months, 1)), "GTM - 1", 'yyyy-MM-dd');
                var datum_end = Utilities.formatDate(new Date(Date.UTC(last_2_months_year, last_2_months, last_2_months_day_end)), "GTM - 1", 'yyyy-MM-dd');

                var client_stats = sklik_api([{'session': client_login.session, 'userId': sklik_account[i][0]},
                    {'dateFrom': datum_start, 'dateTo': datum_end, 'granularity': 'total'}
                ], 'client.stats')

                //Variable
                var account_name = sklik_account[i][1];
                var cost = (client_stats.report[0].price / 100).toFixed(0);
                var conversions_value = (client_stats.report[0].conversionValue / 100).toFixed(0);
                var conversions = (client_stats.report[0].conversions).toFixed(0);
                var pno = ((cost / conversions_value) * 100).toFixed(2);
                pno = null_control(pno, cost, conversions_value);
                var cpa = (cost / conversions).toFixed(0);
                cpa = null_control(cpa, cost, conversions);

                if (day == 0)
                {
                    cost = 0, conversions_value = 0, conversions = 0, pno = 0, cpa = 0;
                }

                var budget = sklik_account[i][2];
                var budget_percent = ((cost / budget) * 100).toFixed(2);
                budget_percent = null_control(budget_percent, cost, budget);

                pushDataToSpreadSheet(account_name,last_2_months_year + "/" + (last_2_months + 1),cost);

                Utilities.sleep(200);
        }
    } catch (err) {
        Logger.log("SKLIK:" + err);
    }
 
//FACEBOOK************************************************************************************************ 
spreadsheet.appendRow(["Facebook","\n"]);
spreadsheet.appendRow(["Účet","Období","Náklady","\n"]);   
    try
    {
        //Facebook settings  
        var row = 6;
        while (settings_sheet.getRange("G" + row).getValue() != "")
        {
            row += 1;
        }
        row -= 1;

        var facebook_settings = row > 5 ? settings_sheet.getRange("G6:I" + row).getValues() : [];
        
        //Cycle for a number of accounts
        for (var i = 0; i < facebook_settings.length; i++)
        {
            try {
                //Facebook API version
                var facebook_api_version = fb_api('/v1.0/act_' + facebook_settings[i][1] + '/insights?access_token=' + facebook_settings[i][0]).error.message;
                facebook_api_version = facebook_api_version.substring(facebook_api_version.indexOf('latest version: ') + 16, facebook_api_version.length - 1);
        
                    var account_name = "";
                    var currency = "";
                    var cost = 0;
                    var conversions_value = 0;
                    var conversions = 0;
                    var pno = 0;
                    var cpa = 0;

                    var datum_start = Utilities.formatDate(new Date(Date.UTC(last_2_months_year, last_2_months, 1)), "GTM - 1", 'yyyy-MM-dd');
                    var datum_end = Utilities.formatDate(new Date(Date.UTC(last_2_months_year, last_2_months, last_2_months_day_end)), "GTM - 1", 'yyyy-MM-dd');

                    try {
                        var url = "/" + facebook_api_version + "/act_" + facebook_settings[i][1] + "/insights?" +
                                "fields=account_name,account_currency,spend" +
                                "&level=account" +
                                "&time_range[since]=" + datum_start + "&time_range[until]=" + datum_end +
                                "&sort=date_start_ascending" +
                                "&time_increment=all_days" +
                                "&limit=1000000" +
                                "&access_token=" + facebook_settings[i][0];

                        var response = fb_api(url);

                        //Variable
                        account_name = response.data[0].account_name;
                        currency = response.data[0].account_currency;
                        cost = (parseFloat(response.data[0].spend)).toFixed(0);

                        if ( day == 0)
                        {
                            cost = 0;
                        }

                    } catch (err) {
                    }

                    var budget = facebook_settings[i][2];
                    var control = budget - cost;
                    var budget_percent = ((cost / budget) * 100).toFixed(2);
                    budget_percent = null_control(budget_percent, cost, budget);

                    pushDataToSpreadSheet(account_name,last_2_months_year + "/" + (last_2_months + 1),cost);

                    Utilities.sleep(200);
            } catch (err) {
                Logger.log("FACEBOOK: " + err);
            }
        }
    } catch (err)
    {
        Logger.log("FACEBOOK: " + err);
    }

}

//********************************************************************************************************
function number_format(number) {
    number = number.toString();
    number = number.split("").reverse().join("");
    number = number.substr(0, 3) + " " + number.substr(3, 3) + " " + number.substr(6, 3) + " " + number.substr(9, 3) + " " + number.substr(12, 3);
    number = number.split("").reverse().join("");
    number = number.trim();
    return(number)
}
//-------------------------------------------------------------------------------------------------------- 
function control_color(control) {
    if (control > 0)
    {
        control = "green";
    } else
    {
        control = "red";
    }
    return(control)
}
//-------------------------------------------------------------------------------------------------------- 
function cost_color(cost, j) {
    if (cost == 0 && j == 3)
    {
        cost = "red";
    } else
    {
        cost = "black";
    }
    return(cost)
}
//-------------------------------------------------------------------------------------------------------- 
function row_color(row) {
    if (row % 2 == 0)
    {
        row = "#ffffff";
    } else
    {
        row = "#d5d5d5";
    }
    return(row)
}
//--------------------------------------------------------------------------------------------------------
function null_control(number, a, b) {
    if (a == 0 || b == 0) {
        number = 0;
    }
    return (number);
}
//--------------------------------------------------------------------------------------------------------
function pushDataToSpreadSheet(ucet,obdobi,naklady){
   spreadsheet.appendRow([ucet,obdobi,naklady,"\n"])
}
//--------------------------------------------------------------------------------------------------------
function sklik_api(parameters, method) {
    var url = 'https://api.sklik.cz/drak/json/' + method;
    var options = {'method': 'post', 'contentType': 'application/json', 'muteHttpExceptions': true, 'payload': JSON.stringify(parameters)};

    try {
        return(JSON.parse(UrlFetchApp.fetch(url, options)));
    } catch (err)
    {
        Utilities.sleep(1000);
        try {
            return(JSON.parse(UrlFetchApp.fetch(url, options)));
        } catch (err)
        {
            Utilities.sleep(1000);
            return(JSON.parse(UrlFetchApp.fetch(url, options)));
        }
    }
}
//--------------------------------------------------------------------------------------------------------
function fb_api(settings_url) {
    var url = 'https://graph.facebook.com' + settings_url;
    var options = {'method': 'get', 'contentType': 'application/json', 'muteHttpExceptions': true};

    try {
        return(JSON.parse(UrlFetchApp.fetch(url, options)));
    } catch (err)
    {
        Utilities.sleep(1000);
        try {
            return(JSON.parse(UrlFetchApp.fetch(url, options)));
        } catch (err)
        {
            Utilities.sleep(1000);
            return(JSON.parse(UrlFetchApp.fetch(url, options)));
        }
    }
}
  