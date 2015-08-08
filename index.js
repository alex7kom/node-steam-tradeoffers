module.exports = SteamTradeOffers;

var request = require('request');
var cheerio = require('cheerio');
var Long = require('long');
var url = require('url');
var vm = require('vm');
var querystring = require('querystring');

var communityURL = 'https://steamcommunity.com';

require('util').inherits(SteamTradeOffers, require('events').EventEmitter);

function SteamTradeOffers() {
  require('events').EventEmitter.call(this);

  this._j = request.jar();
  this._request = request.defaults({ jar: this._j });
}

SteamTradeOffers.prototype.setup = function(options, callback) {
  this.APIKey = options.APIKey;

  this.sessionID = options.sessionID;

  options.webCookie.forEach(function(name) {
    setCookie.bind(this)(name);
  }.bind(this));

  if (typeof callback === 'function') {
    callback();
  }
};

SteamTradeOffers.prototype.getOfferToken = function(callback) {
  this._request.get({
    uri: communityURL + '/my/tradeoffers/privacy'
  }, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      this.emit('debug', 'retrieving offer token: ' + (error || response.statusCode));
      return callback(error || new Error(response.statusCode));
    }
    if (!body) {
      this.emit('debug', 'retrieving offer token: invalid response');
      return callback(new Error('Invalid Response'));
    }

    var $ = cheerio.load(body);
    var offerUrl = $('input#trade_offer_access_url').val();
    var offerToken = url.parse(offerUrl, true).query.token;

    callback(null, offerToken);
  }.bind(this));
};

SteamTradeOffers.prototype.loadMyInventory = function(options, callback) {
  var query = {};

  if (options.language) {
    query.l = options.language;
  }

  if (options.tradableOnly !== false) {
    query.trading = 1;
  }

  var uri = communityURL + '/my/inventory/json/' + options.appId +
    '/' + options.contextId + '/?' + querystring.stringify(query);

  loadInventory.bind(this)({
    uri: uri,
    contextId: options.contextId
  }, callback);
};

SteamTradeOffers.prototype.loadPartnerInventory = function(options, callback) {
  var form = {
    sessionid: this.sessionID,
    partner: options.partnerSteamId || toSteamId(options.partnerAccountId),
    appid: options.appId,
    contextid: options.contextId
  };

  if (options.language) {
    form.l = options.language;
  }

  var offer = 'new';
  if (options.tradeOfferId) {
    offer = options.tradeOfferId;
  }

  var uri = communityURL + '/tradeoffer/' + offer +
    '/partnerinventory/?' + querystring.stringify(form);

  loadInventory.bind(this)({
    uri: uri,
    headers: {
      referer: communityURL + '/tradeoffer/' + offer +
        '/?partner=' + toAccountId(form.partner)
    },
    contextId: options.contextId
  }, callback);
};

SteamTradeOffers.prototype.getOffers = function(options, callback) {
  doAPICall.bind(this)({
    method: 'GetTradeOffers/v1',
    params: options,
    callback: function(error, res) {
      if (error) {
        return callback(error);
      }

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

      callback(null, res);
    }
  });
};

SteamTradeOffers.prototype.getOffer = function(options, callback) {
  doAPICall.bind(this)({
    method: 'GetTradeOffer/v1',
    params: options,
    callback: function(error, res) {
      if (error) {
        return callback(error);
      }

      if (res.response.offer !== undefined) {
        res.response.offer.steamid_other = toSteamId(res.response.offer.accountid_other);
      }

      callback(null, res);
    }
  });
};

SteamTradeOffers.prototype.getSummary = function(options, callback) {
  doAPICall.bind(this)({
    method: 'GetTradeOffersSummary/v1',
    params: options,
    callback: callback
  });
};

SteamTradeOffers.prototype.declineOffer = function(options, callback) {
  doAPICall.bind(this)({
    method: 'DeclineTradeOffer/v1',
    params: {
      tradeofferid: options.tradeOfferId
    },
    post: true,
    callback: callback
  });
};

SteamTradeOffers.prototype.cancelOffer = function(options, callback) {
  doAPICall.bind(this)({
    method: 'CancelTradeOffer/v1',
    params: {
      tradeofferid: options.tradeOfferId
    },
    post: true,
    callback: callback
  });
};

SteamTradeOffers.prototype.acceptOffer = function(options, callback) {
  this._request.post({
    uri: communityURL + '/tradeoffer/' + options.tradeOfferId + '/accept',
    headers: {
      referer: communityURL + '/tradeoffer/' + options.tradeOfferId + '/'
    },
    json: true,
    form: {
      sessionid: this.sessionID,
      serverid: 1,
      tradeofferid: options.tradeOfferId
    }
  }, function(error, response, body) {
    if (error) {
      this.emit('debug', 'accepting offer: ' + error);
      if (typeof callback === 'function') {
        callback(error);
      }
      return;
    }
    if (body && body.strError) {
      this.emit('debug', 'accepting offer: ' + body.strError);
      if (typeof callback === 'function') {
        callback(new Error(body.strError));
      }
      return;
    }
    if (response.statusCode !== 200) {
      this.emit('debug', 'accepting offer: ' + response.statusCode);
      if (typeof callback === 'function') {
        callback(new Error(response.statusCode));
      }
      return;
    }

    if (typeof callback === 'function') {
      callback(null, body);
    }
  }.bind(this));
};

SteamTradeOffers.prototype.makeOffer = function(options, callback) {
  var tradeoffer = {
    newversion: true,
    version: 2,
    me: { assets: options.itemsFromMe, currency: [], ready: false },
    them: { assets: options.itemsFromThem, currency: [], ready: false }
  };

  var formFields = {
    serverid: 1,
    sessionid: this.sessionID,
    partner: options.partnerSteamId || toSteamId(options.partnerAccountId),
    tradeoffermessage: options.message || '',
    json_tradeoffer: JSON.stringify(tradeoffer)
  };

  var query = {
    partner: options.partnerAccountId || toAccountId(options.partnerSteamId)
  };

  if (options.accessToken !== undefined) {
    formFields.trade_offer_create_params = JSON.stringify({
      trade_offer_access_token: options.accessToken
    });
    query.token = options.accessToken;
  }

  var referer;
  if (options.counteredTradeOffer !== undefined) {
    formFields.tradeofferid_countered = options.counteredTradeOffer;
    referer = communityURL + '/tradeoffer/' + options.counteredTradeOffer + '/';
  } else {
    referer = communityURL + '/tradeoffer/new/?' + querystring.stringify(query);
  }

  this._request.post({
    uri: communityURL + '/tradeoffer/new/send',
    headers: {
      referer: referer
    },
    json: true,
    form: formFields
  }, function(error, response, body) {
    if (error) {
      this.emit('debug', 'making an offer: ' + error);
      if (typeof callback === 'function') {
        callback(error);
      }
      return;
    }
    if (body && body.strError) {
      this.emit('debug', 'making an offer: ' + body.strError);
      if (typeof callback === 'function') {
        callback(new Error(body.strError));
      }
      return;
    }
    if (response.statusCode !== 200) {
      this.emit('debug', 'making an offer: ' + response.statusCode);
      if (typeof callback === 'function') {
        callback(new Error(response.statusCode));
      }
      return;
    }

    if (typeof callback === 'function') {
      callback(null, body);
    }
  }.bind(this));
};

SteamTradeOffers.prototype.getItems = function(options, callback) {
  // Derived from node-steam-trade
  // https://github.com/seishun/node-steam-trade/blob/master/index.js#L86-L119
  this._request.get({
    uri: communityURL + '/trade/' + options.tradeId + '/receipt/'
  }, function(err, response, body) {
    if (err || response.statusCode !== 200) {
      this.emit('debug', 'get items: ' + (err || response.statusCode));
      return callback(err || new Error(response.statusCode));
    }

    var script = body.match(/(var oItem;[\s\S]*)<\/script>/);
    if (!script) {
      this.emit('debug', 'get items: no session');
      return callback(new Error('No session'));
    }

    var sandbox = {
      items: []
    };

    // prepare to execute the script in new context
    var code = 'var UserYou;' +
      'function BuildHover(str, item) {' +
        'items.push(item);' +
      '}' +
      'function $() {' +
        'return {' +
          'show: function() {}' +
        '};' +
      '}' +
      script[1];

    vm.runInNewContext(code, sandbox);

    callback(null, sandbox.items);
  });
};

function setCookie(cookie) {
  this._j.setCookie(request.cookie(cookie), communityURL);
}

function toSteamId(accountId) {
  return new Long(parseInt(accountId, 10), 0x1100001).toString();
}

function toAccountId(steamId) {
  return Long.fromString(steamId).toInt().toString();
}

function mergeInventory(inventory, body, contextId) {
  return inventory.concat(
    mergeWithDescriptions(body.rgInventory, body.rgDescriptions, contextId)
      .concat(
        mergeWithDescriptions(body.rgCurrency, body.rgDescriptions, contextId)
      )
  );
}

function mergeWithDescriptions(items, descriptions, contextid) {
  return Object.keys(items).map(function(id) {
    var item = items[id];
    var description = descriptions[item.classid + '_' + (item.instanceid || '0')];
    for (var key in description) {
      if (description.hasOwnProperty(key)) {
        item[key] = description[key];
      }
    }
    // add contextid because Steam is retarded
    item.contextid = contextid;
    return item;
  });
}

function loadInventory(options, callback) {
  options.inventory = options.inventory || [];

  var requestParams = {
    uri: options.uri,
    json: true
  };

  if (options.start) {
    requestParams.uri += '&start=' + options.start;
  }

  if (options.headers) {
    requestParams.headers = options.headers;
  }

  this._request.get(requestParams, function(error, response, body) {
    if (error) {
      this.emit('debug', 'loading inventory: ' + error);
      return callback(error);
    }
    if (body && body.error) {
      this.emit('debug', 'loading inventory: error: ' + body.error);
      return callback(new Error(body.error));
    }
    if (response.statusCode !== 200) {
      this.emit('debug', 'loading inventory: ' + response.statusCode);
      return callback(new Error(response.statusCode));
    }
    if (!body || !body.rgInventory || !body.rgDescriptions || !body.rgCurrency) {
      this.emit('debug', 'loading inventory: invalid response');
      return callback(new Error('Invalid Response'));
    }

    options.inventory = mergeInventory(options.inventory, body, options.contextId);

    if (body.more) {
      options.start = body.more_start;
      loadInventory.bind(this)(options, callback);
    } else {
      callback(null, options.inventory);
    }
  }.bind(this));
}

function doAPICall(options) {
  var httpMethod = options.post ? 'post' : 'get';

  var params = {
    uri: 'https://api.steampowered.com/IEconService/' + options.method +
      '/?key=' + this.APIKey +
      ((options.post) ? '' : '&' + querystring.stringify(options.params)),
    json: true
  };

  if (options.post) {
    params.form = options.params;
  }

  request[httpMethod](params, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      this.emit('debug', 'doing API call ' + options.method + ': ' + (error || response.statusCode));
      if (typeof options.callback === 'function') {
        options.callback(error || new Error(response.statusCode));
      }
      return;
    }
    if (!body || typeof body !== 'object') {
      this.emit('debug', 'doing API call ' + options.method + ': invalid response');
      if (typeof options.callback === 'function') {
        options.callback(new Error('Invalid Response'));
      }
      return;
    }
    if (typeof options.callback === 'function') {
      options.callback(null, body);
    }
  }.bind(this));
}
