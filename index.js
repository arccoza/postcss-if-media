var postcss = require('postcss');


module.exports = postcss.plugin('postcss-layout', function (opts) {
  opts = opts || {};
  
  return function (css, result) {
    css
      .walkRules(function(rule) {
        var queries = {};

        rule.each(function(node) {
          // Here we check for block inline queries; nested rules in the parent rule with a query for a selector,
          // which contains a group of properties for that inline query(selector).
          // We don't process the properties in these query blocks directly, we simply add the query(selector) onto
          // their value and unwrap them from their container rule block, they will then be processed as regular
          // properties of the parent rule with inline queries later. 
          // This process is simpler and easier to maintain.
          if(node.type == 'rule' && (node.selector.indexOf('?if ') == 0 || node.selector.indexOf('? ') == 0)) {
            var qblock = node;
            var prev = qblock;

            node.each(function(node) {
              if(node.type == 'decl') {
                node.value += ' ' + qblock.selector;
                // We keep track of the previous insert/move so that the next insert/move is after the 'prev',
                // maintaining the original order of the properties and hence CSS specificity.
                // The first value of 'prev' is obviously the query block.
                node.moveAfter(prev);
                prev = node;
                console.log(node);
              }
              else {
                throw node.error('You can only have properties inside a block inline query. ' + node.selector, { plugin: 'postcss-if-media' });
              }
            });

            // Remove the query block when we're done so that it is not processed again later by walkRules.
            qblock.remove();
          }

          // Here the properties with an inline query are identified and sent off for processing.
          if(node.type == 'decl' && (node.value.indexOf('?if ') + 1 || node.value.indexOf('? ') + 1)) {
            processIfValues(css, rule, node, queries);
          }
        });

        if(Object.keys(queries).length)
          processAtRules(css, rule, queries);
      });
  };
});

// Extract the values and add them to the list of queries.
// Props are grouped by their queries, so that they appear in the same @media block later.
function processIfValues(css, rule, decl, queries) {
  var query = null;
  var re = /(.*)\s+(?:\?if|\?)\s+media\s+(.*)/;
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
  }
  else
    throw decl.error('Invalid inline query. ' + decl.prop + ': ' + decl.value, { plugin: 'postcss-if-media' });
}

// The previously extracted inline queries and their associated properties are used
// to create @media rules below(to maintain CSS specificity) the parent rule.
function processAtRules(css, rule, queries) {
  var parent = rule.parent;
  var prev = rule;

  for(var k in queries) {
    var q = queries[k];
    var at = postcss.atRule({name: 'media', params: q.arg, source: rule.source});
    var qr = postcss.rule ({selector: q.sel, source: rule.source});
    
    at.append(qr);
    // Again we keep track of the previous insert and insert after it, to maintain the original order
    // and CSS specificity.
    parent.insertAfter(prev, at);
    prev = at;
    
    for (var i = 0; i < q.props.length; i++) {
      var prop = q.props[i];
      prop.decl.moveTo(qr);
    };
  }

}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
