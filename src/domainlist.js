"use strict";

var fs = require('fs');
var path = require('path');

// http://jsperf.com/string-reverse-methods-performance
// lame_reverse:
var reverse = function (s) {
    for (var i = s.length, o = ''; i--; o += s[i]);
    return o;
};

// For a sorted list, binary search:
// Find the index + 1 of the exact matching element
// or negative (index + 1) preceding element.
var binaryIndexNear = function(arr, searchElement) {
  var minIndex = 0;
  var maxIndex = arr.length - 1;
  var currentIndex = 0;
  var currentElement;

  while (minIndex <= maxIndex) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = arr[currentIndex];

    if (currentElement < searchElement) {
        minIndex = currentIndex + 1;
    }
    else if (currentElement > searchElement) {
        maxIndex = currentIndex - 1;
    }
    else {
        return (currentIndex + 1);
    }
  }
  return -(maxIndex <= 0 ? 1 : (maxIndex + 1));
};

var wildcardStartChar = '\0';
var wildcardEndChar = '\xFF';
var wildcardEndChars = [wildcardStartChar, wildcardEndChar];

var DomainList = module.exports = function(domainList) {
  domainList = domainList || [];
  this.matchDomains = [];
  this.domainExpiry = {};
  this.addMany(domainList);
};

DomainList.prototype = {
  constructor: DomainList,

  contains: function(domain) {
    var nearIdx, reversed, expireDomain, now, part, match;

    if (this.matchDomains.length === 0) {
      return false;
    }

    now = Date.now();
    // check wildcard domains by comparing the reverse of the string
    reversed = reverse(domain);
    expireDomain = domain[0] === '.' ? domain.slice(1) : domain;
    match = null;

    nearIdx = binaryIndexNear(this.matchDomains, reversed);
    if (nearIdx <= 0) {
      for (nearIdx = -(nearIdx+1); nearIdx >= 0; nearIdx -= 1) {
        part = this.matchDomains[nearIdx];
        if (wildcardEndChars.indexOf(part[part.length - 1]) < 0) {
          continue;
        }
        part = part.slice(0, -1);
        if (reversed.indexOf(part) !== 0) {
          continue;
        } else {
          match = part;
          break;
        }
      }
      if (!match) {
        return false;
      }
    }
    // non-expiring domain or not-yet expired domain
    if (!(expireDomain in this.domainExpiry) || this.domainExpiry[expireDomain] >= now) {
      return true;
    }
    // expired domain
    this.remove(expireDomain);
    return false;
  },

  clear: function() {
    this.matchDomains = [];
    this.domainExpiry = {};
  },

  addMany: function(domains, ttl) {
    domains = domains || [];
    ttl = ttl || 0;
    for (var ix = 0; ix < domains.length; ix++) {
      this.add(domains[ix], ttl, true);
    }
    this.matchDomains.sort();
  },

  add: function(domain, ttl, skipSort) {
    var expireDomain, rev, revExpire;
    domain = (domain || '').trim();
    if (!domain) {
      return;
    }
    rev = reverse(domain);

    if (domain[0] === '.') {
      expireDomain = domain.slice(1);
      revExpire = reverse(expireDomain);

      if (binaryIndexNear(this.matchDomains, revExpire) < 0) {
        this.matchDomains.push(revExpire);
      }
      if (binaryIndexNear(this.matchDomains, rev + wildcardStartChar) < 0) {
        this.matchDomains.push(rev + wildcardStartChar);
        this.matchDomains.push(rev + wildcardEndChar);
      }
    } else {
      expireDomain = domain;
      if (binaryIndexNear(this.matchDomains, rev) < 0) {
        this.matchDomains.push(rev);
      }
    }

    if (ttl > 0) {
      this.domainExpiry[expireDomain] = Date.now() + ttl;
    }

    if (!skipSort) {
      this.matchDomains.sort();
    }
  },

  remove: function(domain) {
    var fixed, wildcard;
    var toRemove = [];
    domain = (domain || '').trim();
    if (!domain) {
      return;
    }
    if (domain[0] === '.') {
      fixed = domain.slice(1);
      wildcard = domain;
    } else {
      fixed = domain;
      wildcard = '.' + domain;
    }
    toRemove.push(reverse(fixed));
    toRemove.push(reverse(wildcardStartChar + wildcard));
    toRemove.push(reverse(wildcardEndChar + wildcard));
    this.matchDomains = this.matchDomains.filter(function(existingDomain) {
      return toRemove.indexOf(existingDomain) < 0;
    });
    delete this.domainExpiry[fixed];
  },

  toArray: function() {
    var domains = [];
    this.matchDomains.forEach(function(domain) {
      if (domain[domain.length - 1] === wildcardStartChar) {
        domains.push(reverse(domain.slice(0,-1)));
      } else if (domain[domain.length - 1] !== wildcardEndChar) {
        domains.push(reverse(domain));
      }
    });
    return domains;
  }
};

/*
 *  DomainList.fromFile(domainFile[, domainList])
 *  @param domainFile: string file path, absolute or relative to cwd
 *  @param domainList: optional domainlist
 *  Create a new DomainList (or use passed domainList) and add all of the domain patterns
 *  contained in domainFile as non-expiring.
 */
DomainList.fromFile = function(domainFile, domainList) {
  domainList = domainList || new DomainList();
  var domainText = fs.readFileSync(path.resolve(process.cwd(), domainFile), 'utf8').trim();
  if (!domainText) {
    return null;
  }
  var domains = domainText.split('\n');
  domainList.addMany(domains);
  return domainList;
};
