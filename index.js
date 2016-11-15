var postcss = require('postcss');


module.exports = postcss.plugin('postcss-if-media', function (opts) {
  opts = opts || {};
  opts._queries = [];
  
  return function (css, result) {
    css
      .walkRules(function(rule) {
        // Used to keep track of all the queries and associated properties for this rule.
        var queries = {};

        rule.each(function(node) {
          // Here we check for block inline queries; nested rules in the parent rule with a query for a selector,
          // which contains a group of properties for that inline query(selector).
          // We don't process the properties in these query blocks directly, we simply add the query(selector) onto
          // their value and unwrap them from their container rule block, they will then be processed as regular
          // properties of the parent rule with inline queries later. 
          // This process is simpler and easier to maintain.
          if(node.type == 'rule' && (node.selector.indexOf('?if media') == 0 || node.selector.indexOf('? media') == 0)) {
            var qblock = node;
            var prev = qblock;

            node.each(function(node) {
              if(node.type == 'decl' || node.type == 'comment') {
                if(node.value)
                  node.value += ' ' + qblock.selector;
                else
                  node.text += ' ' + qblock.selector;
                // We keep track of the previous insert/move so that the next insert/move is after the 'prev',
                // maintaining the original order of the properties and hence CSS specificity.
                // The first value of 'prev' is obviously the query block.
                node.moveAfter(prev);
                prev = node;
                // console.log(node);
              }
              // else if(node.type == 'comment') {

              // }
              else {
                throw node.error('You can only have properties/comments inside a block inline query. ' + node.parent.parent.selector, { plugin: 'postcss-if-media' });
              }
            });

            // Remove the query block when we're done so that it is not processed again later by walkRules.
            qblock.remove();
          }
          else if(node.type == 'rule' && (node.selector.indexOf('?') + 1)) {
            node.warn(result, 'Appears to be a malformed `?if media` query -> ' + node.selector)
          }

          // Here the properties with an inline query are identified and sent off for processing.
          // We process and move comments only because some plugins rely on them.
          if((node.type == 'decl' || node.type == 'comment') && ((node.value || node.text).indexOf(' ?if media ') + 1 || (node.value || node.text).indexOf(' ? media ') + 1)) {
            processIfValues(css, result, rule, node, queries);
          }
          else if((node.type == 'decl' || node.type == 'comment') && ((node.value || node.text).indexOf('?if') + 1 || (node.value || node.text).indexOf('? media') + 1)) {
            node.warn(result, 'Appears to be a malformed `?if media` query -> ' + node)
          }

        });

        // Take the gathered queries and associated properties and send them to be made into @media rules.
        if(Object.keys(queries).length) {
          createAtRules(css, rule, queries);

          // For tests and debugging.
          opts._queries.concat(queries);
        }
      });
  };
});

// Extract the values and add them to the list of queries.
// Props are grouped by their queries, so that they appear in the same @media block later.
function processIfValues(css, result, rule, decl, queries) {
  var query = null;
  var re = /(.*)\s+(?:\?if|\?)\s+media\s+(.*)/;
  var re2 = /\s/g;
  var hash = null;

  // Check if we're working with comments.
  var match = decl.value ? decl.value.match(re) : decl.text.match(re);
  // console.log(match)
  if(match && match[1] && match[2]) {
    if(decl.value)
      decl.value = match[1];
    else
      decl.text = match[1];
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
    decl.warn(result, 'Appears to be a malformed `?if media` query -> ' + decl);
}

// The previously extracted inline queries and their associated properties are used
// to create @media rules below(to maintain CSS specificity) the parent rule.
function createAtRules(css, rule, queries) {
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
