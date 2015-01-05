var admin = ''; // put your steamid here so the bot can send you trade offers

var logOnOptions = {
  accountName: '',
  password: ''
};

var authCode = ''; // code received by email

if (require('fs').existsSync('sentry')) {
  logOnOptions['shaSentryfile'] = require('fs').readFileSync('sentry');
} else if (authCode != '') {
  logOnOptions['authCode'] = authCode;
}

var Steam = require('steam');
var SteamTradeOffers = require('../'); // change to 'steam-tradeoffers' if not running from the examples subdirectory

var steam = new Steam.SteamClient();
var offers = new SteamTradeOffers();

steam.logOn(logOnOptions);

steam.on('debug', console.log);

steam.on('loggedOn', function(result) {
  console.log('Logged in!');
  steam.setPersonaState(Steam.EPersonaState.Online);
});

steam.on('webSessionID', function(sessionID) {
  steam.webLogOn(function(newCookie){
    offers.setup({
      sessionID: sessionID,
      webCookie: newCookie
    }, function(err) {
      if (err) {
        throw err;
      }
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
          }, function(err, response){
            if (err) {
              throw err;
            }
            console.log(response);
          });
        }
      });
    });
  });
});

steam.on('sentry', function(data) {
  require('fs').writeFileSync('sentry', data);
});