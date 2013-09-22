module.exports = SteamTradeOffers;

var request = require('request');
var cheerio = require('cheerio');
var Long = require('long');

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
      self.getAPIKey();
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
            self.getAPIKey();
        }.bind(self));
      }
    }
  }.bind(self));
}

function setCookie(self, cookie) {
  self._j.add(request.cookie(cookie));
}

SteamTradeOffers.prototype.loadMyInventory = function(appid, contextid, callback) {
  var self = this;

  this._request.get({
    uri: 'http://steamcommunity.com/my/inventory/json/' + appid + '/' + contextid,
    json: true
  }, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'loading my inventory: ' + (error || response.statusCode));
      this.loadMyInventory(appid, contextid, callback);
    } else if (typeof body != 'object') {
      // no session
      if(typeof callback == 'function'){
       callback(new Error('No session'));
      }
    } else {
      if(typeof callback == 'function'){
        callback(null, mergeWithDescriptions(body.rgInventory, body.rgDescriptions, contextid)
        .concat(mergeWithDescriptions(body.rgCurrency, body.rgDescriptions, contextid)));
      }
    }
  }.bind(this));
};

SteamTradeOffers.prototype.loadPartnerInventory = function(partner, appid, contextid, callback) {
  var self = this;

  this._request.post({
    uri: 'http://steamcommunity.com/tradeoffer/new/partnerinventory/',
    json: true,
    headers: {
      referer: 'http://steamcommunity.com/tradeoffer/new/?partner=' + toAccountId(partner)
    },
    form: {
      sessionid: this.sessionID,
      partner: partner,
      appid: appid,
      contextid: contextid
    }
  }, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'loading partner inventory: ' + (error || response.statusCode));
      this.loadPartnerInventory(partner, appid, contextid, callback);
    } else if (typeof body != 'object') {
      // no session
      if(typeof callback == 'function'){
       callback(new Error('No session'));
      }
    } else {
      if(typeof callback == 'function'){
        callback(null, mergeWithDescriptions(body.rgInventory, body.rgDescriptions, contextid)
        .concat(mergeWithDescriptions(body.rgCurrency, body.rgDescriptions, contextid)));
      }
    }
  }.bind(this));
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
    uri: 'http://api.steampowered.com/IEconService/' + options.method + '/?key=' + self.APIKey + ((options.post) ? '' : '&' + buildQuery(options.params)),
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

function buildQuery(params) {
  var query = [];
  for(var x in params){
    if (params.hasOwnProperty(x)) {
      query.push(encodeURI(x) + '=' + encodeURI(params[x]));
    }
  }
  return query.join('&');
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

SteamTradeOffers.prototype.declineOffer = function(options, callback) {
  doAPICall(this, {method: 'DeclineTradeOffer/v1', params: options, post: true, callback: callback});
};

SteamTradeOffers.prototype.cancelOffer = function(options, callback) {
  doAPICall(this, {method: 'CancelTradeOffer/v1', params: options, post: true, callback: callback});
};

SteamTradeOffers.prototype.acceptOffer = function(options, callback) {
  if (typeof options == 'undefined') {
    if(typeof callback == 'function'){
      callback(new Error('No options'));
    }
  } else {
    this._request.post({
      uri: 'http://steamcommunity.com/tradeoffer/' + options.tradeofferid + '/accept',
      headers: {
        referer: 'http://steamcommunity.com/tradeoffer/' + options.tradeofferid + '/'
      },
      form: {
        sessionid: this.sessionID,
        tradeofferid: options.tradeofferid
      }
    }, function(error, response, body) {
      if (error || response.statusCode != 200) {
        if(typeof callback == 'function'){
          callback(error);
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

SteamTradeOffers.prototype.makeOffer = function(partner, message, itemsFromMe, itemsFromThem, callback) {
  var self = this;

  var tradeoffer = {
    "newversion":true,
    "version":2,
    "me":{"assets": itemsFromMe,"currency":[],"ready":false},
    "them":{"assets": itemsFromThem,"currency":[],"ready":false}
  };

  this._request.post({
    uri: 'http://steamcommunity.com/tradeoffer/new/send',
    headers: {
      referer: 'http://steamcommunity.com/tradeoffer/new/?partner=' + toAccountId(partner)
    },
    form: {
      sessionid: this.sessionID,
      partner: partner,
      tradeoffermessage: message,
      json_tradeoffer: JSON.stringify(tradeoffer)
    }
  }, function(error, response, body) {
    if (error || response.statusCode != 200) {
      self.emit('debug', 'loading offers: ' + (error || response.statusCode));
      if(typeof callback == 'function'){
        callback(error);
      }
    } else {
      if(typeof callback == 'function'){
        callback();
      }
    }
  });
};
