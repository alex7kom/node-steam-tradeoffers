# Steam Trade Offers for Node.js

Allows you to automate Steam trading using trade offers in Node.js. It was designed with [node-steam](https://github.com/seishun/node-steam) in mind, but does not depend on it, so you can use it separately if you can supply it with session information. Some of the methods of the library are wrappers for Steam Web API.

__Note__: By using this library you automatically agree to [Steam API Terms of Use](http://steamcommunity.com/dev/apiterms)

# Installation

```
npm install git://github.com/Alex7Kom/node-steam-tradeoffers.git
```

# Usage
Instantiate a SteamTradeOffers object...

```js
var SteamTradeOffers = require('steam-tradeoffers');
var offers = new SteamTradeOffers();
```

...then setup session:

```js
offers.setup(sessionID, cookies);
```

* `sessionID` is a valid web session ID. In node-steam, you can use the `webSessionID` event to get it.
* `cookies` is an array of cookies. In node-steam, you can use the `webLogOn` method to get it.

This setup will automatically register and retrieve Steam API key for you.

# Methods

All callbacks will be supplied with error as the first argument or null if no errors occured.

## loadMyInventory(appid, contextid, callback)

Loads your inventory for the given app and context. For example, use 440 and 2 for TF2 and 570 and 2 for Dota 2. The second argument to `callback` will be an array of item objects in case of success.

## loadPartnerInventory(partnerSteamId, appid, contextid, callback)

Loads your partner inventory for the given app and context.

## makeOffer(options[, callback])

Makes a trade offer to the partner. `options` is an object of the following input params:

* `partnerAccountId` or `partnerSteamId`, you need only one of those.
* `accessToken` is a token from the public Trade URL of the partner.
* `itemsFromMe` are the items you will lose in the trade.
* `itemsFromThem` are the items you will receive in the trade.

`itemsFromMe` and `itemsFromThem` both are arrays of item objects that look like this:

```json
{
    "appid": 440,
    "contextid": 2,
    "amount": 1,
    "assetid": "1627590398"
}
```

If success the second param to `callback` will be an object with `tradeofferid` of the newly created trade offer.

## getOffers(options, callback)
## getOffer(options, callback)

The first method loads a list of trade offers, and the second loads just a single offer. `options` is an object of input params listed on the page [Steam Web API/IEconService](https://developer.valvesoftware.com/wiki/Steam_Web_API/IEconService). The second argument to `callback` will be an object that Steam Web API returns. The only thing to note is that the wrapper adds a property `steamid_other` with the SteamID of the trade partner to each `CEcon_TradeOffer` object in received trades.

## declineOffer(tradeofferid[, callback])
## acceptOffer(tradeofferid[, callback])
## cancelOffer(tradeofferid[, callback])

`declineOffer` or `acceptOffer` that was sent to you. `cancelOffer` that you sent. The second argument to `callback` will be
