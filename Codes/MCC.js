pushDataToSpreadSheet(account_name,datum[2],cost,conversions_value);
//Url config spreadsheet----------------------------------------------------------------------------------
//********************************************************************************************************
var ss_config = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1N0hgdpJyWzsgS0BxEJXbd5uPz13_53cFNmxP4cAZpPg/edit?usp=sharing');
var SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1g0c727hCN__ejnP1yeeQexlGBnM2q0DZ27Trpg9dqs0/edit?usp=sharing";
var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);


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
    spreadsheet.clearFormat();

//Mail settings ------------------------------------------------------------------------------------------ 
    var settings_sheet = ss_config.getSheetByName("budget_control");

    var mail = settings_sheet.getRange("B2").getValue();
    var subject = settings_sheet.getRange("B3").getValue();

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

    //Last 1 month
    var last_1_months_date = new Date(Date.UTC(year, month, 0));
    var last_1_months = last_1_months_date.getUTCMonth();
    var last_1_months_day_end = yesterday.getUTCDate();
    var last_1_months_year = last_1_months_date.getUTCFullYear();

    //Last 2 months
    var last_2_months_date = new Date(Date.UTC(year, month - 1, 0));
    var last_2_months = last_2_months_date.getUTCMonth();
    var last_2_months_day_end = last_2_months_date.getUTCDate();
    var last_2_months_year = last_2_months_date.getUTCFullYear();

    //Last 12 months
    var last_12_months_date = new Date(Date.UTC(year - 1, month, 0));
    var last_12_months = last_12_months_date.getUTCMonth();
    var last_12_months_day_end = last_12_months_date.getUTCDate();
    var last_12_months_year = last_12_months_date.getUTCFullYear();

    var datum = [
        [new Date(Date.UTC(last_1_months_year, last_1_months, 1)), new Date(Date.UTC(last_1_months_year, last_1_months, last_1_months_day_end)), last_1_months_year + "/" + (last_1_months + 1)],
        [new Date(Date.UTC(last_12_months_year, last_12_months, 1)), new Date(Date.UTC(last_12_months_year, last_12_months, last_12_months_day_end)), last_12_months_year + "/" + (last_12_months + 1)],
        [new Date(Date.UTC(last_2_months_year, last_2_months, 1)), new Date(Date.UTC(last_2_months_year, last_2_months, last_2_months_day_end)), last_2_months_year + "/" + (last_2_months + 1)],
        [yesterday, yesterday, "Včera"]
    ]

//Count of period
    var period = datum.length;

//--------------------------------------------------------------------------------------------------------  
//Table header  
    var table_header = "<tr bgcolor='#ffd75d'><th>Účet</th><th>Období</th><th>Náklady</th><th>Obrat</th><th>Konverze</th><th>CPA</th><th>PNO</th><th>Rozpočet</th><th>Kontrola</th><th>%<br>času<br>z měsíce</th><th>%<br>vyčerpaného<br>rozpočtu</th><th>Doporučený<br>denní<br>rozpočet</th></tr>"

//HTML body table
    var table = "<table border='1' style='border-collapse: collapse;' cellpadding='5'>";

//--------------------------------------------------------------------------------------------------------    
//ADWORDS*************************************************************************************************
spreadsheet.appendRow(["Google-ADS","\n"]);
spreadsheet.appendRow(["Účet","Období","Náklady","Obrat","Konverze"
                    ,"CPA","PNO","Rozpočet","Kontrola","% času z měsíce"
                    ,"% vyčerpaného rozpočtu","Doporučený denní rozpočet","\n"]);
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

        //Add html      
        if (settings_sheet.getRange("D6").getValue() != "") {
            table = table + "<tr><td colspan='12' bgcolor='#4fabe5'><strong>GOOGLE ADS</strong></td></tr>" + table_header;
        }

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
                var currency = AdsApp.currentAccount().getCurrencyCode();

                //Cycle for a number of periods
                for (var j = 0; j < period; j++)
                {
                    var datum_start = Utilities.formatDate(datum[j][0], "GTM - 1", 'yyyyMMdd');
                    var datum_end = Utilities.formatDate(datum[j][1], "GTM - 1", 'yyyyMMdd');

                    var report = AdsApp.report("SELECT Cost, ConversionValue, Conversions FROM ACCOUNT_PERFORMANCE_REPORT DURING " + datum_start + "," + datum_end).rows().next();

                    //Variable (report)            
                    var cost = (parseFloat(report['Cost'].split(",").join(""))).toFixed(0);
                    var conversions_value = (parseFloat(report['ConversionValue'].split(",").join(""))).toFixed(0);
                    var conversions = (parseFloat(report['Conversions'].split(",").join(""))).toFixed(0);
                    var pno = ((cost / conversions_value) * 100).toFixed(2);
                    pno = null_control(pno, cost, conversions_value);
                    var cpa = (cost / conversions).toFixed(0);
                    cpa = null_control(cpa, cost, conversions);

                    if (j == 0 && day == 0)
                    {
                        cost = 0, conversions_value = 0, conversions = 0, pno = 0, cpa = 0;
                    }

                    var budget = adwords_settings[i][1];
                    var control = budget - cost;
                    var month_percent = (100 / last_1_months_date.getUTCDate() * day).toFixed(2);
                    var budget_percent = ((cost / budget) * 100).toFixed(2);
                    budget_percent = null_control(budget_percent, cost, budget);
                    var budget_plan = (control / (last_1_months_date.getUTCDate() - day)).toFixed(0);
                    budget_plan = null_control(budget_plan, control, control);

                    //Add html
                    table = table + add_html(i, j, datum[j][2], account_name, currency, cost, conversions_value, conversions, cpa, pno, budget, control, month_percent, budget_percent, budget_plan);
                    pushDataToSpreadSheet(account_name,datum[j][2],cost,conversions_value,conversions,cpa,pno,budget,control,month_percent,budget_percent,budget_plan);
                   
                }
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
spreadsheet.appendRow(["Účet","Období","Náklady","Obrat","Konverze"
                    ,"CPA","PNO","Rozpočet","Kontrola","% času z měsíce"
                    ,"% vyčerpaného rozpočtu","Doporučený denní rozpočet","\n"]);
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

        //Add html
        if (settings_sheet.getRange("A6").getValue() != "") {
            var table = table + "<tr><td colspan='12' bgcolor='#ff4646'><strong>SKLIK</strong></td></tr>" + table_header;
        }

        //Cycle for a number of accounts
        for (var i = 0; i < sklik_account.length; i++)
        {
//--------------------------------------------------------------------------------------------------------          
//client.stats
            //Cycle for a number of periods
            for (var j = 0; j < period; j++)
            {
                var datum_start = Utilities.formatDate(datum[j][0], "GTM - 1", 'yyyy-MM-dd');
                var datum_end = Utilities.formatDate(datum[j][1], "GTM - 1", 'yyyy-MM-dd');

                var client_stats = sklik_api([{'session': client_login.session, 'userId': sklik_account[i][0]},
                    {'dateFrom': datum_start, 'dateTo': datum_end, 'granularity': 'total'}
                ], 'client.stats')

                //Variable
                var account_name = sklik_account[i][1];
                var currency = "CZK";
                var cost = (client_stats.report[0].price / 100).toFixed(0);
                var conversions_value = (client_stats.report[0].conversionValue / 100).toFixed(0);
                var conversions = (client_stats.report[0].conversions).toFixed(0);
                var pno = ((cost / conversions_value) * 100).toFixed(2);
                pno = null_control(pno, cost, conversions_value);
                var cpa = (cost / conversions).toFixed(0);
                cpa = null_control(cpa, cost, conversions);

                if (j == 0 && day == 0)
                {
                    cost = 0, conversions_value = 0, conversions = 0, pno = 0, cpa = 0;
                }

                var budget = sklik_account[i][2];
                var control = budget - cost;
                var month_percent = (100 / last_1_months_date.getUTCDate() * day).toFixed(2);
                var budget_percent = ((cost / budget) * 100).toFixed(2);
                budget_percent = null_control(budget_percent, cost, budget);
                var budget_plan = (control / (last_1_months_date.getUTCDate() - day)).toFixed(0);
                budget_plan = null_control(budget_plan, control, control);

                //Add html
                table = table + add_html(i, j, datum[j][2], account_name, currency, cost, conversions_value, conversions, cpa, pno, budget, control, month_percent, budget_percent, budget_plan);
                pushDataToSpreadSheet(account_name,datum[j][2],cost,conversions_value,conversions,cpa,pno,budget,control,month_percent,budget_percent,budget_plan);

                Utilities.sleep(200);
            }
        }
//--------------------------------------------------------------------------------------------------------     
//client.logout  
        var client_logout = sklik_api([{'session': client_login.session}], 'client.logout');
//--------------------------------------------------------------------------------------------------------  
    } catch (err) {
        Logger.log("SKLIK:" + err);
    }

//--------------------------------------------------------------------------------------------------------    
//FACEBOOK************************************************************************************************ 
spreadsheet.appendRow(["Facebook","\n"]);
spreadsheet.appendRow(["Účet","Období","Náklady","Obrat","Konverze"
                    ,"CPA","PNO","Rozpočet","Kontrola","% času z měsíce"
                    ,"% vyčerpaného rozpočtu","Doporučený denní rozpočet","\n"]);   
    try
    {
        //Facebook settings  
        //Last row
        var row = 6;
        while (settings_sheet.getRange("G" + row).getValue() != "")
        {
            row += 1;
        }
        row -= 1;

        var facebook_settings = row > 5 ? settings_sheet.getRange("G6:I" + row).getValues() : [];

        //Add html
        if (settings_sheet.getRange("G6").getValue() != "") {
            table = table + "<tr><td colspan='12' bgcolor='#3b5998'><strong>FACEBOOK</strong></td></tr>" + table_header;
        }
        
        //Cycle for a number of accounts
        for (var i = 0; i < facebook_settings.length; i++)
        {
            try {
                //Facebook API version
                var facebook_api_version = fb_api('/v1.0/act_' + facebook_settings[i][1] + '/insights?access_token=' + facebook_settings[i][0]).error.message;
                facebook_api_version = facebook_api_version.substring(facebook_api_version.indexOf('latest version: ') + 16, facebook_api_version.length - 1);
        
                //Cycle for a number of periods
                for (var j = 0; j < period; j++)
                {
                    var account_name = "";
                    var currency = "";
                    var cost = 0;
                    var conversions_value = 0;
                    var conversions = 0;
                    var pno = 0;
                    var cpa = 0;

                    var datum_start = Utilities.formatDate(datum[j][0], "GTM - 1", 'yyyy-MM-dd');
                    var datum_end = Utilities.formatDate(datum[j][1], "GTM - 1", 'yyyy-MM-dd');

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

                        if (j == 0 && day == 0)
                        {
                            cost = 0;
                        }

                    } catch (err) {
                    }

                    var budget = facebook_settings[i][2];
                    var control = budget - cost;
                    var month_percent = (100 / last_1_months_date.getUTCDate() * day).toFixed(2);
                    var budget_percent = ((cost / budget) * 100).toFixed(2);
                    budget_percent = null_control(budget_percent, cost, budget);
                    var budget_plan = (control / (last_1_months_date.getUTCDate() - day)).toFixed(0);
                    budget_plan = null_control(budget_plan, control, control);

                    //Add html
                    table = table + add_html(i, j, datum[j][2], account_name, currency, cost, conversions_value, conversions, cpa, pno, budget, control, month_percent, budget_percent, budget_plan);
                    pushDataToSpreadSheet(account_name,datum[j][2],cost,conversions_value,conversions,cpa,pno,budget,control,month_percent,budget_percent,budget_plan);

                    Utilities.sleep(200);
                }
            } catch (err) {
                Logger.log("FACEBOOK: " + err);
            }
        }
    } catch (err)
    {
        Logger.log("FACEBOOK: " + err);
    }

//Add html
    table = table + "</table>";

//Send mail  
    MailApp.sendEmail({to: mail, subject: subject, htmlBody: table});

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
function add_html(i, j, datum, account_name, currency, cost, conversions_value, conversions, cpa, pno, budget, control, month_percent, budget_percent, budget_plan) {
    var table = ""
    if (j == 0)
    {
        table = "<tr bgcolor='" + row_color(i) + "'><td nowrap rowspan='4'><strong>" + account_name + "</strong></td>" +
                "<td nowrap><strong>" + datum + "</strong></td>" +
                "<td nowrap align='right'><strong>" + number_format(cost) + " " + currency + "</strong></td>" +
                "<td nowrap align='right'><strong>" + number_format(conversions_value) + " " + currency + "</strong></td>" +
                "<td nowrap align='right'><strong>" + number_format(conversions) + "</strong></td>" +
                "<td nowrap align='right'><strong>" + number_format(cpa) + " " + currency + "</strong></td>" +
                "<td nowrap align='right'><strong>" + pno + " %</strong></td>" +
                "<td nowrap align='right'><strong>" + number_format(budget) + " " + currency + "</strong></td>" +
                "<td nowrap align='right'><strong><font color='" + control_color(control) + "'>" + number_format(control) + " " + currency + "</font></strong></td>" +
                "<td nowrap align='right'><strong>" + month_percent + " %</strong></td>" +
                "<td nowrap align='right'><strong>" + budget_percent + " %</strong></td>" +
                "<td nowrap align='right'><strong>" + number_format(budget_plan) + " " + currency + "</strong></td></tr>";
    } else
    {
        table = "<tr bgcolor='" + row_color(i) + "'>" +
                "<td nowrap>" + datum + "</td>" +
                "<td nowrap align='right'><font color='" + cost_color(cost, j) + "'>" + number_format(cost) + " " + currency + "</font></td>" +
                "<td nowrap align='right'>" + number_format(conversions_value) + " " + currency + "</td>" +
                "<td nowrap align='right'>" + number_format(conversions) + "</td>" +
                "<td nowrap align='right'>" + number_format(cpa) + " " + currency + "</td>" +
                "<td nowrap align='right'>" + pno + " %</td></tr>";
    }
    return(table)
}
//--------------------------------------------------------------------------------------------------------
function pushDataToSpreadSheet(ucet,obdobi,naklady,obrat,konverze,CPA,PNO,rozpocet,kontrola,casuZMesice,vycerpaneho,dopporucenyDenniRozpocet){
   spreadsheet.appendRow([ucet,
            obdobi,
            naklady,
            obrat,
            konverze,
            CPA,PNO,
            rozpocet,
            kontrola,
            casuZMesice,
            vycerpaneho,
            dopporucenyDenniRozpocet,
            "\n"])
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
  