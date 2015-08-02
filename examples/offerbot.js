var fs = require('fs');
var crypto = require('crypto');

var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('../'); // change to 'steam-tradeoffers' if not running from the examples subdirectory

var admin = ''; // put your steamid here so the bot can send you trade offers

var logOnOptions = {
  account_name: '',
  password: ''
};

var authCode = ''; // code received by email

try {
  logOnOptions.sha_sentryfile = getSHA1(fs.readFileSync('sentry'));
} catch (e) {
  if (authCode !== '') {
    logOnOptions.auth_code = authCode;
  }
}

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
var offers = new SteamTradeOffers();

steamClient.connect();
steamClient.on('connected', function() {
  steamUser.logOn(logOnOptions);
});

function offerItems() {
  offers.loadMyInventory({
    appId: 440,
    contextId: 2
  }, function(err, items) {
    var item;
    // picking first tradable item
    for (var i = 0; i < items.length; i++) {
      if (items[i].tradable) {
        item = items[i];
        break;
      }
    }
    // if there is such an item, making an offer with it
    if (item) {
      offers.makeOffer ({
        partnerSteamId: admin,
        itemsFromMe: [
          {
            appid: 440,
            contextid: 2,
            amount: 1,
            assetid: item.id
          }
        ],
        itemsFromThem: [],
        message: 'This is test'
      }, function(err, response) {
        if (err) {
          throw err;
        }
        console.log(response);
      });
    }
  });
}

steamClient.on('logOnResponse', function(logonResp) {
  if (logonResp.eresult === Steam.EResult.OK) {
    console.log('Logged in!');
    steamFriends.setPersonaState(Steam.EPersonaState.Online);

    steamWebLogOn.webLogOn(function(sessionID, newCookie) {
      getSteamAPIKey({
        sessionID: sessionID,
        webCookie: newCookie
      }, function(err, APIKey) {
        offers.setup({
          sessionID: sessionID,
          webCookie: newCookie,
          APIKey: APIKey
        }, function() {
          offerItems();
        });
      });
    });
  }
});

steamClient.on('servers', function(servers) {
  fs.writeFile('servers', JSON.stringify(servers));
});

steamUser.on('updateMachineAuth', function(sentry, callback) {
  fs.writeFileSync('sentry', sentry.bytes);
  callback({ sha_file: getSHA1(sentry.bytes) });
});

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}
