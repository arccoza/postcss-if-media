var postcss = require('postcss');


module.exports = postcss.plugin('postcss-layout', function (opts) {
  opts = opts || {};
  
  return function (css, result) {
    css
      .walkRules(function(rule) {
        var queries = {};

        rule.each(function(node) {
          if(node.type == 'decl' && (node.value.indexOf('if ') + 1 || node.value.indexOf('? ') + 1)) {
            processIfValue(css, rule, node, queries);
            console.log('wha');
          }
        });

        // console.log(Object.keys(queries).length);
        if(Object.keys(queries).length)
          processAtRules(css, rule, queries);
      });
  };
});

function processIfValue(css, rule, decl, queries) {
  var query = null;
  var re = /(.*)\s+!?(?:if|\?)\s+media\s+(.*)/;
  var re2 = /\s/g;
  var hash = null;

  var match = decl.value.match(re);
  
  if(match && match[1] && match[2]) {
    decl.value = match[1];
    hash = match[2].replace(re2, '');

    if(!queries[hash]) {
      queries[hash] = {
        arg: match[2],
        sel: rule.selector,
        props: []
      }
    }
    queries[hash].props.push({name: decl.prop, value: match[1], query: match[2], hash: hash, decl: decl});

    // return {prop: decl.prop, value: match[1], query: match[2], hash: hash, decl: decl};
  }
  else
    throw decl.error('Invalid inline query. ' + decl.prop + ': ' + decl.value, { plugin: 'postcss-if-media' });
}

function processAtRules(css, rule, queries) {
  var parent = rule.parent;

  for(var k in queries) {
    var q = queries[k];
    var at = postcss.atRule({name: 'media', params: q.arg, source: rule.source});
    var qr = postcss.rule ({selector: q.sel, source: rule.source});
    
    at.append(qr);
    parent.insertAfter(rule, at);
    
    for (var i = 0; i < q.props.length; i++) {
      var prop = q.props[i];
      prop.decl.moveTo(qr);
    };
  }

}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

function murmur3(key, seed) {
  var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
  
  remainder = key.length & 3; // key.length % 4
  bytes = key.length - remainder;
  h1 = seed;
  c1 = 0xcc9e2d51;
  c2 = 0x1b873593;
  i = 0;
  
  while (i < bytes) {
      k1 = 
        ((key.charCodeAt(i) & 0xff)) |
        ((key.charCodeAt(++i) & 0xff) << 8) |
        ((key.charCodeAt(++i) & 0xff) << 16) |
        ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;
    
    k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

    h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
    h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
    h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
  }
  
  k1 = 0;
  
  switch (remainder) {
    case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1: k1 ^= (key.charCodeAt(i) & 0xff);
    
    k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= k1;
  }
  
  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 13;
  h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}