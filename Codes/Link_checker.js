
// Copyright 2015, Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @name MCC Link Checker
 *
 * @overview The MCC Link Checker script iterates through all the ads, keywords
 *     and sitelinks in advertiser accounts under an MCC account, and makes sure
 *     their URLs do not produce "Page not found" or other types of error
 *     responses. See https://developers.google.com/adwords/scripts/docs/solutions/mccapp-link-checker
 *     for more details.
 *
 * @author AdWords Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.3
 *
 * @changelog
 * - version 1.3
 *   - Enhanced to include ad group sitelinks.
 *   - Updated to track completion across runs and send at most one email
 *     per day.
 * - version 1.2
 *   - Remove label flushing code from the script.
 * - version 1.1
 *   - Remove some debug code.
 * - version 1.0
 *   - Released initial version.
 */

/**
 * The URL of the tracking spreadsheet.
 * This should be a copy of https://goo.gl/gr2UaG
 */
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1zLCbWmLCY6TPdO8W9cp4IWJfITZee0P5_1ixTOn5b-Y/edit';

/**
 * The starting row on the spreadsheet Dashboard tab for the summary.
 */
var SUMMARY_START = 17;

/**
 * The status of the script as of the last run. The status is
 * complete once all urls in all accounts are processed.
 */
var status = {
  NONE: '',
  PENDING: 'Pending',
  COMPLETE: 'Completed'
};

function main() {
  Logger.log('Using spreadsheet - %s.', SPREADSHEET_URL);
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);

  var settings = readSettings(spreadsheet);
  var lastRun = getLastRunDate(spreadsheet);
  var lastStatus = getLastStatus(spreadsheet);
  var today = new Date();

  var resumingPreviousRun =
      (today.getYear() == lastRun.getYear() &&
      today.getMonth() == lastRun.getMonth() &&
      today.getDate() == lastRun.getDate());

  if (!resumingPreviousRun && lastStatus == status.PENDING) {
    Logger.log('Not all urls were processed yesterday.');
    sendWarningEmails(settings);
  }

  if (resumingPreviousRun && lastStatus == status.COMPLETE) {
    Logger.log('All urls have already been processed today.');
    return;
  }

  var accountIterator = getAccountSelector(settings).get();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();
    ensureSheetExistsForAccount(account, spreadsheet);

    var lastStatus = getLastStatus(spreadsheet);

    if (!resumingPreviousRun) {
      Logger.log('Fresh run...');
      clearAccountSheet(account, spreadsheet);
    }
  }

  saveLastRunDate(today, spreadsheet);
  setStatus(spreadsheet, status.PENDING);

  accountSelector = getAccountSelector(settings);
  accountSelector.executeInParallel('processAccountInParallel',
      'afterProcessCallback');
}

/**
 * Read the link checker script settings from the dashboard.
 *
 * @param {Object} spreadsheet The link checker spreadsheet object.
 * @return {Object} A dictionary with setting name and setting value as key
 *     value pairs.
 */
function readSettings(spreadsheet) {
  var sheetName = 'Dashboard';
  var dashboardSheet = spreadsheet.getSheetByName(sheetName);
  var settings = {
    /* Settings to control what entities should be checked. */
    'checkKeywords': dashboardSheet.getRange(4, 3).getValue() == 'Yes',
    'checkAds': dashboardSheet.getRange(5, 3).getValue() == 'Yes',
    'checkSitelinks': dashboardSheet.getRange(6, 3).getValue() == 'Yes',

    /* Email settings. */
    'emailToAddresses': dashboardSheet.getRange(12, 3).getValue(),
    'emailCCAddresses': dashboardSheet.getRange(13, 3).getValue(),

    /* Accounts should be checked. */
    'accountsToCheck': dashboardSheet.getRange(16, 3).getValue()
  };
  var accountsToCheck = settings.accountsToCheck.split(',');
  settings.accountsToCheck = [];

  for (var i = 0; i < accountsToCheck.length; i++) {
    var accountToCheck = accountsToCheck[i].trim();
    if (accountToCheck.length > 0) {
      settings.accountsToCheck.push(accountToCheck);
    }
  }
  return settings;
}

/**
 * Get the last date on which this script was run.
 *
 * @param {Object} spreadsheet The link checker spreadsheet object.
 * @return {Date} The date on which this script ran last, or today's date
 *     if the date isn't available in the spreadsheet.
 */
function getLastRunDate(spreadsheet) {
  var summarySheet = getSummarySheet(spreadsheet);
  var lastRun = summarySheet.getRange(1, 2).getValue();
  if (!lastRun) {
    lastRun = new Date(0, 0, 0);
  }
  return lastRun;
}

/**
 * Get the overall status when the script last finished running.
 * @param {Object} spreadsheet The link checker spreadsheet object.
 * @return {string} The status when the script last finished running.
 */
function getLastStatus(spreadsheet) {
  var summarySheet = getSummarySheet(spreadsheet);
  var lastStatus = summarySheet.getRange(1, 3).getValue();
  if (!lastStatus) {
    lastStatus = status.NONE;
  }
  return lastStatus;
}

/**
 * Set the overall status that the script is in.
 * @param {Object} spreadsheet The link checker spreadsheet object.
 * @param {string} status The status
 */
function setStatus(spreadsheet, status) {
  var summarySheet = getSummarySheet(spreadsheet);
  summarySheet.getRange(1, 3).setValue(status);
}

/**
 * Gets an AccountSelector object for enumerating accounts.
 * @param {Object} settings The settings read from the link checker spreadsheet.
 * @return {Object} An AccountSelector object built using the ids of accounts
 *     from the settings. If no accounts were specified in settings, then an
 *     empty selector is returned, that enumerates all child accounts under
 *     the MCC account.
 */
function getAccountSelector(settings) {
  var accountSelector = MccApp.accounts();
  if (settings.accountsToCheck.length > 0) {
    accountSelector = accountSelector.withIds(settings.accountsToCheck);
  }
  return accountSelector;
}

/**
 * Ensure that a tracking sheet exists on the link checker spreadsheet for an
 * account being checked.
 *
 * @param {Object} account The account for which a tracking sheet should exist.
 * @param {Object} spreadsheet The link checker spreadsheet object.
 */
function ensureSheetExistsForAccount(account, spreadsheet) {
  var accountSheet = getSheetForAccount(account, spreadsheet);
  if (accountSheet == null) {
    var templateSheet = spreadsheet.getSheetByName('Report template');
    accountSheet = templateSheet.copyTo(spreadsheet);
    accountSheet.setName(account.getName());
    spreadsheet.setActiveSheet(accountSheet);
    spreadsheet.moveActiveSheet(spreadsheet.getSheets().length);
  }
  accountSheet.getRange(2, 5).setValue(account.getCustomerId());
}

/**
 * Remove labels applied by link checker script from a previous run.
 *
 * @param {Object} account The account from which the labels should be removed.
 * @param {Object} settings The settings read from the link checker spreadsheet.
 */
function removeLinkCheckerLabels(account, settings) {
  var mccAccount = AdWordsApp.currentAccount();
  MccApp.select(account);

  MccApp.select(mccAccount);
}

/**
 * Create labels for a fresh run of link checker script.
 *
 * @param {Object} account The account to which the labels should be added.
 * @param {Object} settings The settings read from the link checker spreadsheet.
 */
function createLinkCheckerLabels(account, settings) {
  var mccAccount = AdWordsApp.currentAccount();
  MccApp.select(account);
  
  MccApp.select(mccAccount);
}

/**
 * Clears the tracking sheet for an account in the link checker spreadsheet.
 * @param {Object} account The account for which tracking sheet should be
 *     cleared.
 * @param {Object} spreadsheet The link checker spreadsheet object.
 */
function clearAccountSheet(account, spreadsheet) {
  var accountSheet = getSheetForAccount(account, spreadsheet);
  now = new Date();
   accountSheet.getRange(2, 2).setValue('Link checker report from: ' + Utilities.formatDate(now, AdWordsApp.currentAccount().getTimeZone(), "yyyy-MM-dd' 'HH:mm:ss")); // skutecny lokalni cas, nesedi s casem na listu Dashboard
  
  // Delete all the rows > 4.
  if (accountSheet.getMaxRows() > 4) {
    Logger.log('Deleting %s rows from 4', accountSheet.getMaxRows() - 4);
    accountSheet.deleteRows(4, accountSheet.getMaxRows() - 4);
  }
  // Clear row 4.
  if (accountSheet.getMaxRows() > 3) {
    accountSheet.getRange(4, 1, 1, 8).setValue('');
  }
}

/**
 * Gets the summary sheet.
 *
 * @param {Object} spreadsheet The link checker spreadsheet object.
 * @return {Object} The summary sheet object from the link checker spreadsheet.
 */
function getSummarySheet(spreadsheet) {
  return spreadsheet.getSheetByName('Dashboard');
}

/**
 * Save the last run date of the link checker script on the summary sheet of the
 * link checker spreadsheet.
 *
 * @param {Date} lastRun The last run date.
 * @param {Object} spreadsheet The link checker spreadsheet object.
 */
function saveLastRunDate(lastRun, spreadsheet) {
  var summarySheet = getSummarySheet(spreadsheet);
  summarySheet.getRange(1, 2).setValue(lastRun);
}

/**
 * The entry point for the link checker script when processing accounts in
 * parallel. This method is called by the executeInParallel method for each
 * account in the account selector, and in parallel.
 */
function processAccountInParallel() {
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var settings = readSettings(spreadsheet);
  var account = AdWordsApp.currentAccount();
  var accountSheet = getSheetForAccount(account, spreadsheet);
  checkFinalUrls(accountSheet, settings);
}

/**
 * Gets the tracking sheet in the link checker spreadsheet for an account.
 *
 * @param {Object} account The account for which links are being checked.
 * @param {Object} spreadsheet The link checker spreadsheet object.
 * @return {Object} The tracking sheet object for the account.
 */
function getSheetForAccount(account, spreadsheet) {
  return spreadsheet.getSheetByName(account.getName().toString());
}

/**
 * Checks the final URLs of the currently selected account.
 *
 * @param {Object} accountSheet The tracking sheet for the current account in
 *     the link checker spreadsheet.
 * @param {Object} settings The settings read from the link checker spreadsheet.
 */
function checkFinalUrls(accountSheet, settings) {
  var urlMap = {};

  if (settings.checkKeywords) {
    var keywords = AdWordsApp.keywords()
        .withCondition("FinalUrls STARTS_WITH_IGNORE_CASE 'h'")
        .withCondition("Status = ENABLED")
        .withCondition("CampaignStatus  = ENABLED")
        .withCondition("AdGroupStatus = ENABLED")
        .get();
    Logger.log('Checking %s keywords.', keywords.totalNumEntities());
    while (keywords.hasNext()) {
      var keyword = keywords.next();
      var urls = [keyword.urls().getFinalUrl(),
          keyword.urls().getMobileFinalUrl()];
      for (var i = 0; i < urls.length; i++) {
        if (urls[i]) {
          var lastUrl = urls[i];
          if (lastUrl in urlMap) {
            continue;
          }
          urlMap[lastUrl] = true;

          var status = getUrlStatus(lastUrl);
          if (status != 200)
            accountSheet.appendRow(['', lastUrl,
                                  status, keyword.getCampaign().getName(),
                                  keyword.getAdGroup().getName(),
                                  keyword.getText(), '', '']);
        }
      }
    }
  }

  if (settings.checkAds) {
    var ads = AdWordsApp.ads()
        .withCondition("CreativeFinalUrls STARTS_WITH_IGNORE_CASE 'h'")
        .withCondition("Status = ENABLED")
        .withCondition("CampaignStatus  = ENABLED")
        .withCondition("AdGroupStatus = ENABLED")
        .get();
    Logger.log('Checking %s ads.', ads.totalNumEntities());
    while (ads.hasNext()) {
      var ad = ads.next();
      var urls = [ad.urls().getFinalUrl(), ad.urls().getMobileFinalUrl()];

      for (var i = 0; i < urls.length; i++) {
        if (urls[i]) {
          var lastUrl = urls[i];
          if (lastUrl in urlMap) {
            continue;
          }
          urlMap[lastUrl] = true;

          var status = getUrlStatus(lastUrl);
          if (status != 200)
            accountSheet.appendRow(['', lastUrl,
                                  status, ad.getCampaign().getName(),
                                  ad.getAdGroup().getName(),
                                  '', ad.getHeadline(), '']);
        }
      }
    }
  }

  if (settings.checkSitelinks) {
    var campaigns = AdWordsApp.campaigns()
        .withCondition("Status = ENABLED")
        .get();
    while (campaigns.hasNext()) {
      var campaign = campaigns.next();
      var sitelinks = campaign.extensions().sitelinks().get();

      while (sitelinks.hasNext()) {
        var sitelink = sitelinks.next();

        var urls = [sitelink.urls().getFinalUrl(),
            sitelink.urls().getMobileFinalUrl()];

        for (var i = 0; i < urls.length; i++) {
          if (urls[i]) {
            var lastUrl = urls[i];
            if (lastUrl in urlMap) {
              continue;
            }
            urlMap[lastUrl] = true;

            var status = getUrlStatus(lastUrl);
            if (status != 200)
              accountSheet.appendRow(['', lastUrl,
                                    status, campaign.getName(),
                                    '', '', '', sitelink.getLinkText()]);
          }
        }
      }
    }

    var adGroups = AdWordsApp.adGroups()
        .withCondition("Status = ENABLED")
        .withCondition("CampaignStatus  = ENABLED")
        .withCondition("AdGroupStatus = ENABLED")
        .get();
    while (adGroups.hasNext()) {
      var adGroup = adGroups.next();
      var sitelinks = adGroup.extensions().sitelinks().get();

      Logger.log('Checking %s sitelinks in ad group %s.',
                 sitelinks.totalNumEntities(), adGroup.getName());
      while (sitelinks.hasNext()) {
        var sitelink = sitelinks.next();

        var urls = [sitelink.urls().getFinalUrl(),
            sitelink.urls().getMobileFinalUrl()];

        for (var i = 0; i < urls.length; i++) {
          if (urls[i]) {
            var lastUrl = urls[i];
            if (lastUrl in urlMap) {
              continue;
            }
            urlMap[lastUrl] = true;

            var status = getUrlStatus(lastUrl);
            if (status != 200)
               accountSheet.appendRow(['', lastUrl,
                                    status, adGroup.getCampaign().getName(),
                                    adGroup.getName(), '', '',
                                    sitelink.getLinkText()]);
          }
        }
      }
    }
  }
}

/**
 * Gets the status of a url.
 *
 * @param {string} url The url to check.
 * @return {Integer} The status code for the url.
 */
function getUrlStatus(url) {
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true});
  return response.getResponseCode();
}

/**
 * The callback method for link checker script after processing all the
 * accounts. This method is called by the executeInParallel method after all the
 * parallel methods return either due to completion, or timeouts.
 *
 * @param {Array.<ExecutionResult>} results The results of the parallel
 *     execution.
 */
function afterProcessCallback(results) {
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var settings = readSettings(spreadsheet);

  var hasError = false;

  for (var i = 0; i < results.length; i++) {
    if (results[i].getError()) {
      hasError = true;
      break;
    }
  }

  clearSummarySheet(spreadsheet);
  updateCheckedUrlSummary(spreadsheet);

  if (!hasError) {
    sendEmails(settings);
    setStatus(spreadsheet, status.COMPLETE);
  }
}

/**
 * Send emails about completed link checks.
 *
 * @param {Object} settings The settings read from the link checker spreadsheet.
 */
function sendEmails(settings) {
  if (settings.emailToAddresses) {
    var options = {};
    if (settings.emailCCAddresses) {
      options['cc'] = settings.emailCCAddresses;
    }
    MailApp.sendEmail(settings.emailToAddresses, 'MCC Link Checker Script',
                      'MCC Link Checker Script ran successfully. See ' +
                      SPREADSHEET_URL + ' for details of checked urls.',
                      options);
  }
}

/**
 * Send emails that not all urls were processed in a single day.
 *
 * @param {Object} settings The settings read from the link checker spreadsheet.
 */
function sendWarningEmails(settings) {
  if (settings.emailToAddresses) {
    var options = {};
    if (settings.emailCCAddresses) {
      options['cc'] = settings.emailCCAddresses;
    }
    MailApp.sendEmail(settings.emailToAddresses,
                      'MCC Link Checker Script - Warning',
                      'Warning: MCC Link Checker Script did NOT finish ' +
                      'processing all urls yesterday. See ' +
                      SPREADSHEET_URL + ' for details of checked urls.',
                      options);
  }
}

/**
 * Clears the summary sheet in the link checker spreadsheet.
 *
 * @param {Object} spreadsheet The link checker spreadsheet object.
 */
function clearSummarySheet(spreadsheet) {
  var summarySheet = getSummarySheet(spreadsheet);
  // Delete all the rows >= SUMMARY_START.
  if (summarySheet.getMaxRows() >= SUMMARY_START) {
    Logger.log('Deleting %s rows from ' + SUMMARY_START,
               summarySheet.getMaxRows() - SUMMARY_START + 1);
    summarySheet.deleteRows(SUMMARY_START,
                            summarySheet.getMaxRows() - SUMMARY_START + 1);
  }
  // Clear row SUMMARY_START.
  if (summarySheet.getMaxRows() >= SUMMARY_START) {
    summarySheet.getRange(SUMMARY_START, 1, 1, 3).setValue('');
  }
}

/**
 * Updates the summary sheet in the link checker spreadsheet.
 *
 * @param {Object} spreadsheet The link checker spreadsheet object.
 */
function updateCheckedUrlSummary(spreadsheet) {
  var settings = readSettings(spreadsheet);
  var accountSelector = getAccountSelector(settings).get();
  var totalAccounts = accountSelector.totalNumEntities();
  var summarySheet = getSummarySheet(spreadsheet);

  while (accountSelector.hasNext()) {
    var account = accountSelector.next();
    var sheet = getSheetForAccount(account, spreadsheet);
    var urlRange = sheet.getRange(4, 3, sheet.getMaxRows() - 3, 1).getValues();

    var goodUrls = 0;
    var badUrls = 0;

    for (var i = 0; i < urlRange.length; i++) {
      for (var j = 0; j < urlRange[i].length; j++) {
        if (!urlRange[i][j]) {
          continue;
        }

        if (parseInt(urlRange[i][j]) < 300) {
          goodUrls++;
        } else {
          badUrls++;
        }
      }
    }
    summarySheet.appendRow(['', account.getCustomerId(), goodUrls, badUrls]);
    Logger.log('Account: %s, good urls: %s, bad urls: %s',
        account.getCustomerId(), goodUrls, badUrls);
  }
}