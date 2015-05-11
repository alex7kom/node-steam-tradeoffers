# Steam Trade Offers for Node.js and io.js

`steam-tradeoffers` is a library for Node.js and io.js written in JavaScript. It allows you to automate Steam trading using trade offers. It was designed with [node-steam](https://github.com/seishun/node-steam) in mind, but does not depend on it, so you can use it separately if you can supply it with session information. Some of the methods of the library are wrappers for Steam Web API.

__Note__: By using this library you automatically agree to [Steam API Terms of Use](https://steamcommunity.com/dev/apiterms)

__Read the [FAQ](https://github.com/Alex7Kom/node-steam-tradeoffers/wiki/FAQ)__ if you have any questions and [How to contribute](#how-to-contribute) section before creating any pull request.

If your question is not answered here, __please [open an issue](https://github.com/Alex7Kom/node-steam-tradeoffers/issues)__.

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

...then setup session:

```js
offers.setup({ sessionID: sessionID, webCookie: cookies });
```

This setup will automatically register and retrieve Steam API key for you.

# Examples

You'll need to install [node-steam](https://github.com/seishun/node-steam) in order to run the examples.

The `storehouse.js` file contains an example of handling incoming trade offers. 

The `offerbot.js` is an example of making a trade offer.

On first launch both of the examples will 'crash' with error code `63`. Check your email for Steam Guard code and edit an example file to add it, the run it again.

Please read the [FAQ](https://github.com/Alex7Kom/node-steam-tradeoffers/wiki/FAQ) before creating an issue about examples.

# Methods

The first param for all methods is an object. The second param is callback. All callbacks supplied with `Error` as the first argument or `null` if no errors occured.

## setup(options[, callback])

As noted above, this method is used to setup a web session. It also tries to retrieve Web API key. If you want to operate with trade offers right after startup, do it in callback of this method.

Options:

* `sessionID` is a valid web session ID. In node-steam, you can use the `webSessionID` event to get it.
* `webCookie` is an array of cookies. In node-steam, you can use the `webLogOn` method to get it.
* `PIN` is a Family View PIN, required if account uses Family View.

If failed to retrieve Web API key due to [limited account](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663), `setup` will return `Access Denied` error in callback, or (if no callback provided) will throw the error.

## loadMyInventory(options, callback)

Loads your inventory for the given app and context. For example, use 440 and 2 for TF2 and 570 and 2 for Dota 2. The second argument to `callback` will be an array of item objects in case of success.

Options:

* `appId` is the Steam AppID
* `contextId` is the inventory context Id
* `language` (optional) is the language for item descriptions
* `tradableOnly` (optional) is a boolean flag that defaults to `true` to return tradable items only

## loadPartnerInventory(options, callback)

Loads your partner inventory for the given app and context.

Options:

* `partnerSteamId` is the SteamID of the trade partner
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

## declineOffer(options[, callback])
## acceptOffer(options[, callback])
## cancelOffer(options[, callback])

`declineOffer` or `acceptOffer` that was sent to you. `cancelOffer` that you sent.

Options:

* `tradeOfferId` is a trade offer Id

The second argument to `callback` will be an object with response from Steam, but don't expect anything meaningful in it.

## getOfferToken(callback)

The second argument to `callback` will be the offer token of the bot, extracted from its trade offer URL.

## getItems(options, callback)

Options:

* `tradeId` is the ID of the completed trade you want to get items for, available as a `tradeid` property on offers from `getOffers` or `getOffer`

The second argument to `callback` will be an array of items acquired in a completed trade.

# How to contribute

I appreciate your time and efforts you put in your pull requests, but please follow next simple rules so your efforts wouldn't be in vain.

  1. Please consider creating an issue before doing any code. I'll do my best to implement a new feature (if it fits the library) or fix the library.

  2. If you did some research, that is great! However, please do not put the results in the code right away, create an issue.

  3. If after all you decided that you really need to push your code, please follow the existing code formatting, do not change any interfaces without need, use common sense when adding features so they won't break the existing functionality, test your code prior to submission and update README accordingly. __Always__ do only one pull request per bug/feature. 

I reserve the right to close any pull request and/or rewrite your feature or fix myself. Please note that reviewing and testing your code also takes time so your changes won't be merged immediately after submission.

Thank you.

# License

The MIT License (MIT)

Copyright (c) 2013-2014 Alexey Komarov <alex7kom@gmail.com>

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