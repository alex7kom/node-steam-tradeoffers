var admin = ''; // put your steamid here so the bot can accept your offers

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
    });
  });
});

steam.on('sentry', function(data) {
  require('fs').writeFileSync('sentry', data);
});

steam.on('tradeOffers', function(number) {
  if (number > 0) {
    offers.getOffers({
      get_received_offers: 1,
      active_only: 1,
      time_historical_cutoff: Math.round(Date.now() / 1000)
    }, function(error, body) {
      if(body.response.trade_offers_received){
        body.response.trade_offers_received.forEach(function(offer) {
          if (offer.trade_offer_state == 2){
            if(offer.steamid_other == admin) {
              offers.acceptOffer({tradeOfferId: offer.tradeofferid});
            } else {
              offers.declineOffer({tradeOfferId: offer.tradeofferid});
            }
          }
        });
      }
    });
  }
});
