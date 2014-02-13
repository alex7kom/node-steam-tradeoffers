var username = '';
var password = '';
var steamGuard = require('fs').existsSync('sentry') ? require('fs').readFileSync('sentry')
    : ''; // code received by email
var admin = ''; // put your steamid here so the bot can accept your offers

var Steam = require('steam');
var SteamTradeOffers = require('./'); // change to 'steam-tradeoffers' if not running from the same directory

var steam = new Steam.SteamClient();
var offers = new SteamTradeOffers();

steam.logOn({
  accountName: username,
  password: password,
  shaSentryfile: steamGuard
});

steam.on('debug', console.log);

steam.on('loggedOn', function(result) {
  console.log('Logged in!');
  steam.setPersonaState(Steam.EPersonaState.Online);
});

steam.on('webSessionID', function(sessionID) {
  steam.webLogOn(function(newCookie){
    offers.setup(sessionID, newCookie);
  });
});

steam.on('tradeOffers', function(number) {
  if (number > 0) {
    offers.getOffers({get_received_offers: 1, active_only: 1}, function(error, body) {
      if(body.response.trade_offers_received){
        body.response.trade_offers_received.forEach(function(offer) {
          if (offer.trade_offer_state == 2){
            if(offer.steamid_other == admin) {
              offers.acceptOffer(offer.tradeofferid);
            } else {
              offers.declineOffer(offer.tradeofferid);
            }
          }
        });
      }
    });
  }
});
