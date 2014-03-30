module.exports = SteamTradeOffers;

var request = require('request');
var cheerio = require('cheerio');
var Long = require('long');
var querystring = require('querystring');

require('util').inherits(SteamTradeOffers, require('events').EventEmitter);

function SteamTradeOffers() {
  require('events').EventEmitter.call(this);

  this._j = request.jar();
  this._request = request.defaults({jar:this._j});
}

SteamTradeOffers.prototype.setup = function(sessionID, webCookie, callback){
  var self = this;

  this.sessionID = sessionID;

  webCookie.forEach(function(name){
    setCookie(self, name);
  });

  getAPIKey(this, callback);
};

function getAPIKey(self, callback) {
  self._request.get({
    uri: 'http://steamcommunity.com/dev/apikey'
  }, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'retrieving apikey: ' + (error || response.statusCode));
      getAPIKey(self, callback);
    } else {
      var $ = cheerio.load(body);
      if($('#bodyContents_ex h2').html() == 'Your Steam Web API Key'){
        var key = $('#bodyContents_ex p').html().split(' ')[1];
        self.APIKey = key;
        if(typeof callback == 'function'){
         callback();
        }
      } else {
        self._request.post({
          uri: 'http://steamcommunity.com/dev/registerkey',
          form: {
            domain: 'localhost',
            agreeToTerms: 1
          }
        }, function(error, response, body) {
            getAPIKey(self, callback);
        }.bind(self));
      }
    }
  }.bind(self));
}

function setCookie(self, cookie) {
  self._j.add(request.cookie(cookie));
}

SteamTradeOffers.prototype._loadInventory = function(inventory, uri, options, contextid, start, callback) {
  options.uri = uri;
  
  if (start) {
    options.uri = options.uri + '&' + querystring.stringify({ 'start': start });
  }

  this._request.get(options, function(error, response, body) {
    if (error || response.statusCode != 200 || JSON.stringify(body) == '{}') {
      this.emit('debug', 'loading my inventory: ' + (error || response.statusCode != 200 ? response.statusCode : '{}'));
      this._loadInventory(inventory, uri, options, contextid, start, callback);
    } else if (typeof body != 'object') {
      // no session
      if(typeof callback == 'function'){
       callback(new Error('No session'));
      }
    } else if (body.success == false) {
      // inventory not found
      if(typeof callback == 'function'){
       callback(new Error('Inventory not found'));
      }
    } else {
      inventory = inventory.concat(mergeWithDescriptions(body.rgInventory, body.rgDescriptions, contextid)
              .concat(mergeWithDescriptions(body.rgCurrency, body.rgDescriptions, contextid)));
      if (body.more) {
        this._loadInventory(inventory, uri, options, contextid, body.more_start, callback);
      } else {
        if(typeof callback == 'function'){
          callback(null, inventory);
        }
      }
    }
  }.bind(this));
};

SteamTradeOffers.prototype.loadMyInventory = function(appid, contextid, callback) {
  var self = this;

  var uri = 'http://steamcommunity.com/my/inventory/json/' + appid + '/' + contextid + '/?trading=1';

  this._loadInventory([], uri, { json: true }, contextid, null, callback);
};

SteamTradeOffers.prototype.loadPartnerInventory = function(partner, appid, contextid, callback) {
  var self = this;

  var form = {
    sessionid: this.sessionID,
    partner: partner,
    appid: appid,
    contextid: contextid
  };

  var uri = 'http://steamcommunity.com/tradeoffer/new/partnerinventory/?' + querystring.stringify(form);

  this._loadInventory([], uri, {
    json: true,
    headers: {
      referer: 'http://steamcommunity.com/tradeoffer/new/?partner=' + toAccountId(partner)
    }
  }, contextid, null, callback);
};

function mergeWithDescriptions(items, descriptions, contextid) {
  return Object.keys(items).map(function(id) {
    var item = items[id];
    var description = descriptions[item.classid + '_' + (item.instanceid || '0')];
    for (var key in description) {
        item[key] = description[key];
    }
    // add contextid because Steam is retarded
    item.contextid = contextid;
    return item;
  });
}

function doAPICall(self, options) {
  var request_params = {
    uri: 'http://api.steampowered.com/IEconService/' + options.method + '/?key=' + self.APIKey + ((options.post) ? '' : '&' + querystring.stringify(options.params)),
    json: true,
    method: options.post ? 'POST' : 'GET'
  };

  if (options.post) {
    request_params.form = options.params;
  }

  request(request_params, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'doing API call ' + options.method + ': ' + (error || response.statusCode));
      if(typeof options.callback == 'function'){
        options.callback(error || new Error(response.statusCode));
      }
    } else if (typeof body != 'object') {
      if(typeof options.callback == 'function'){
        options.callback(new Error('Invalid response'));
      }
    } else {
      if(typeof options.callback == 'function'){
        options.callback(null, body);
      }
    }
  });
}

SteamTradeOffers.prototype.getOffers = function(options, callback) {
  doAPICall(this, {
    method: 'GetTradeOffers/v1',
    params: options,
    callback: function(error, res) {
      if (error) {
        if(typeof callback == 'function'){
          callback(error);
        }
      } else {
        if (res.response.trade_offers_received !== undefined) {
          res.response.trade_offers_received = res.response.trade_offers_received.map(function(offer) {
            offer.steamid_other = toSteamId(offer.accountid_other);
            return offer;
          });
        }
        if (res.response.trade_offers_sent !== undefined) {
          res.response.trade_offers_sent = res.response.trade_offers_sent.map(function(offer) {
            offer.steamid_other = toSteamId(offer.accountid_other);
            return offer;
          });
        }
        if(typeof callback == 'function'){
          callback(null, res);
        }
      }
    }
  });
};

SteamTradeOffers.prototype.getOffer = function(options, callback) {
  doAPICall(this, {
    method: 'GetTradeOffer/v1',
    params: options,
    callback: function(error, res) {
      if (error) {
        if(typeof callback == 'function'){
          callback(error);
        }
      } else {
        res.response.offer.steamid_other = toSteamId(res.response.offer.accountid_other);
        if(typeof callback == 'function'){
          callback(null, res);
        }
      }
    }
  });
};

SteamTradeOffers.prototype.declineOffer = function(tradeofferid, callback) {
  doAPICall(this, {method: 'DeclineTradeOffer/v1', params: {tradeofferid: tradeofferid}, post: true, callback: callback});
};

SteamTradeOffers.prototype.cancelOffer = function(tradeofferid, callback) {
  doAPICall(this, {method: 'CancelTradeOffer/v1', params: {tradeofferid: tradeofferid}, post: true, callback: callback});
};

SteamTradeOffers.prototype.acceptOffer = function(tradeofferid, callback) {
  if (typeof tradeofferid == 'undefined') {
    if(typeof callback == 'function'){
      callback(new Error('No options'));
    }
  } else {
    this._request.post({
      uri: 'https://steamcommunity.com/tradeoffer/' + tradeofferid + '/accept',
      headers: {
        referer: 'http://steamcommunity.com/tradeoffer/' + tradeofferid + '/'
      },
      form: {
        sessionid: this.sessionID,
        tradeofferid: tradeofferid
      }
    }, function(error, response, body) {
      if (error || response.statusCode != 200) {
        if(typeof callback == 'function'){
          callback(error || new Error(response.statusCode));
        }
      } else {
        if(typeof callback == 'function'){
          callback(null, {response:{}});
        }
      }
    });
  }
};

function toSteamId(accountId) {
  return new Long(parseInt(accountId, 10), 0x1100001).toString();
}

function toAccountId(steamId) {
  return Long.fromString(steamId).toInt().toString();
}

SteamTradeOffers.prototype.makeOffer = function(options, callback) {
  var self = this;

  var tradeoffer = {
    "newversion":true,
    "version":2,
    "me":{"assets": options.itemsFromMe,"currency":[],"ready":false},
    "them":{"assets": options.itemsFromThem,"currency":[],"ready":false}
  };

  var formFields = {
    sessionid: this.sessionID,
    partner: options.partnerSteamId || toSteamId(options.partnerAccountId),
    tradeoffermessage: options.message || "",
    json_tradeoffer: JSON.stringify(tradeoffer)
  };

  var query = {
    partner: options.partnerAccountId || toAccountId(options.partnerSteamId)
  };

  if(typeof options.accessToken != 'undefined'){
    formFields.trade_offer_create_params = JSON.stringify({ trade_offer_access_token: options.accessToken });
    query.token = options.accessToken;
  };
  
  if (typeof options.counteredTradeOffer != 'undefined') {
    formFields.tradeofferid_countered = options.counteredTradeOffer;
    var referer = 'http://steamcommunity.com/tradeoffer/' + options.counteredTradeOffer + '/';
  }
  else {
    var referer = 'http://steamcommunity.com/tradeoffer/new/?' + querystring.stringify(query);
  }

  this._request.post({
    uri: 'https://steamcommunity.com/tradeoffer/new/send',
    headers: {
      referer: referer
    },
    form: formFields
  }, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'making an offer: ' + (error || response.statusCode));
      if(typeof callback == 'function'){
        callback(error || new Error(response.statusCode));
      }
    } else {
      if(typeof callback == 'function'){
        callback(null, JSON.parse(body));
      }
    }
  });
};
