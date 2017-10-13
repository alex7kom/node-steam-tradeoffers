# Steam Trade Offers for Node.js

[![NPM Version](https://img.shields.io/npm/v/steam-tradeoffers.svg)](https://www.npmjs.com/package/steam-tradeoffers "steam-tradeoffers on NPM")
[![NPM Downloads](https://img.shields.io/npm/dm/steam-tradeoffers.svg)](https://www.npmjs.com/package/steam-tradeoffers "steam-tradeoffers on NPM")
[![PayPal Donate Button](https://img.shields.io/badge/donate-paypal-orange.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=DDE8H72QKJHRJ&item_name=node%2dsteam%2dtradeoffers&currency_code=USD "Donate to this project via PayPal")
[![Steam Items Donate Button](https://img.shields.io/badge/donate-steam%20items-yellowgreen.svg)](https://steamcommunity.com/tradeoffer/new/?partner=89647317&token=vmYJwN-y "Donate Steam Items")

`steam-tradeoffers` is a library for Node.js written in JavaScript. It allows you to automate Steam trading using trade offers. It was designed with [node-steam](https://github.com/seishun/node-steam) in mind, but does not depend on it directly. Some of the methods of the library are wrappers for Steam Web API.

__Please read the [FAQ](https://github.com/Alex7Kom/node-steam-tradeoffers/wiki/FAQ)__ first if you have any questions.

If your question is not answered here, please ask it in [https://github.com/steam-forward/node-steam-forum](https://github.com/steam-forward/node-steam-forum), __please do not open an issue here__. Issues are only for bugs and feature requests.

# Installation

```
npm install steam-tradeoffers
```

# Usage
Instantiate a SteamTradeOffers object...

```js
var SteamTradeOffers = require('steam-tradeoffers');
var offers = new SteamTradeOffers();
```

...then setup session and WebAPI key:

```js
offers.setup({
  sessionID: sessionID,
  webCookie: cookies,
  APIKey: webAPIKey
});
```

You can obtain session information with [node-steam](https://github.com/seishun/node-steam) and its plugin [steam-weblogon](https://github.com/Alex7Kom/node-steam-weblogon).

# Demo

A [demo bot](https://steamcommunity.com/profiles/76561198049913045/) exists that also serves as a donation bot.

[Source code](https://gist.github.com/Alex7Kom/d764ef2925060c4e7c27) (based on the `storehouse.js` example).

# Examples

You'll need to install [node-steam](https://github.com/seishun/node-steam), [steam-weblogon](https://github.com/Alex7Kom/node-steam-weblogon), and [steam-web-api-key](https://github.com/Alex7Kom/node-steam-web-api-key) in order to run the examples.

The `storehouse.js` file contains an example of handling incoming trade offers.

The `offerbot.js` is an example of making a trade offer.

On first launch both of the examples will 'crash'. Check your email for Steam Guard code and edit an example file to add it, then run it again.

Please read the [FAQ](https://github.com/Alex7Kom/node-steam-tradeoffers/wiki/FAQ) before creating an issue about examples.

# Methods

`options` param of all methods is just an object. All callbacks supplied with `Error` as the first argument or `null` if no errors occured.

## setup(options)

As noted above, this method is used to setup a web session and other settings. If you want to operate with trade offers right after startup, do it after calling this method.

Options:

* `sessionID` is a valid web session ID.
* `webCookie` is an array of cookies.
* `APIKey` is a Web API key for the account you use to trade. API key of another account won't work.
* `requestOptions` (optional) is a request `options` object. You can use it to configure timeout, proxy, etc. All available options are listed in [request docs](https://github.com/request/request#requestoptions-callback). This library uses some defaults:
  * `timeout` is a number of milliseconds to wait for Steam servers to respond. Default is `30000`.
* **DEPRECATED** `timeout` (optional) is a number of milliseconds to wait for Steam servers to respond. Default is `30000`. More information about timeouts can be found in [request docs](https://github.com/request/request#timeouts).

`sessionID` and `webCookie` can be acquired using [node-steam](https://github.com/seishun/node-steam) with the [node-steam-weblogon plugin](https://github.com/Alex7Kom/node-steam-weblogon). `APIKey` can be obtained using [node-steam-web-api-key](https://github.com/Alex7Kom/node-steam-web-api-key).

## loadMyInventory(options, callback)

Loads your inventory for the given app and context. For example, use 440 and 2 for TF2 and 570 and 2 for Dota 2. If success the second argument to `callback` will be an array of item objects and the third argument will contain raw inventory objects, not merged with descriptions but still concatenated from multiple inventory pages.

Options:

* `appId` is the Steam AppID
* `contextId` is the inventory context Id
* `language` (optional) is the language for item descriptions
* `tradableOnly` (optional) is a boolean flag that defaults to `true` to return tradable items only

## loadPartnerInventory(options, callback)

Loads your partner inventory for the given app and context.

Options:

* `partnerSteamId` is the SteamID of the trade partner.  You need specify only `partnerAccountId` or `partnerSteamId`.
* `partnerAccountId` is the Steam Account ID of the trade partner. You need specify only `partnerAccountId` or `partnerSteamId`.
* `appId` is the Steam AppID
* `contextId` is the inventory context Id
* `tradeOfferId` (optional) is needed to load private inventory of the trade partner for received trade offer
* `language` (optional) is the language for item descriptions

## makeOffer(options[, callback])

Makes a trade offer to the partner.

Options:

* `partnerAccountId` or `partnerSteamId`, you need only one of those.
* `accessToken` (optional) is a token from the public Trade URL of the partner.
* `itemsFromMe` are the items you will lose in the trade.
* `itemsFromThem` are the items you will receive in the trade.
* `counteredTradeOffer` (optional) is the ID to a trade offer you are countering.
* `message` (optional) is a message to include in the offer.

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

The first method loads a list of trade offers, and the second loads just a single offer.

Options:

* See [Steam Web API/IEconService](https://developer.valvesoftware.com/wiki/Steam_Web_API/IEconService).

 The second argument to `callback` will be an object that Steam Web API returns. The only thing to note is that the wrapper adds a property `steamid_other` with the SteamID of the trade partner to each `CEcon_TradeOffer` object in received trades.

## acceptOffer(options[, callback])

`acceptOffer` that was sent to you.

Options:

* `tradeOfferId` is a trade offer Id
* `partnerSteamId` is the SteamID of the other person. This param is optional for backward compatibility. Accepting offers may not work for you without this param.

The second argument to `callback` will be an object with response from Steam, but don't expect anything meaningful in it.

## declineOffer(options[, callback])
## cancelOffer(options[, callback])

`declineOffer` that was sent to you. `cancelOffer` that you sent.

Options:

* `tradeOfferId` is a trade offer Id

The second argument to `callback` will be an object with response from Steam, but don't expect anything meaningful in it.

## getOfferUrl(callback)

The second argument to `callback` will be the trade offer URL.

## getOfferToken(callback)

The second argument to `callback` will be the offer token of the bot, extracted from its trade offer URL.

## validateOfferUrl(offerUrl, callback)

The second argument to `callback` will be a boolean.

## getItems(options, callback)

Options:

* `tradeId` is the ID of the completed trade you want to get items for, available as a `tradeid` property on offers from `getOffers` or `getOffer`

The second argument to `callback` will be an array of items acquired in a completed trade.

## getHoldDuration(options, callback)

Get escrow hold duration for yourself and your trade partner before trade.

Options:

* `partnerAccountId` or `partnerSteamId`, you need only one of those.
* `accessToken` is a token from the public Trade URL of the partner (required if they are not in your friend list).

The second argument to `callback` will be an object like:

```json
{
    "my": 0,
    "their": 0
}
```

## getTradeHoldDuration(options, callback)

Get escrow hold duration for the existing active trade offer.

Options:

* `tradeOfferId` is a trade offer Id

The output is the same as with `getHoldDuration`.

# License

The MIT License (MIT)

Copyright (c) 2013-2016 Alexey Komarov <alex7kom@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
