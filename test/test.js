var test = require('tape');
var tapSpec = require('tap-spec');
var tapDiff = require('tap-diff');
var tapNotify = require('tap-notify');
var postcss = require("postcss");
var plugin = require("..");


test.createStream()
  // .pipe(tapSpec())
  // .pipe(tapNotify())
  .pipe(tapDiff())
  .pipe(process.stdout);

var opts = {};
var processor = postcss([plugin(opts)]);
var query = 'tv and (min-width: 700px) and (orientation: landscape)';
var query2 = '(min-width: 700px) and (orientation: landscape)';

var tests = {
  "inline": [ 
    {
      "msg": "Move a property with an inline ?if media query into its own rule under an @media query.",
      "chk": "equal",
      "in": ".test { position: relative; background: red ?if media " + query + "; }",
      "out": "".concat(".test { position: relative; }\n",
        "@media " + query + " {\n",
        ".test { background: red; }\n",
        "}")
    },
    {
      "msg": "Move multiple properties with the same inline ?if media query into their own rule under an @media query.",
      "chk": "equal",
      "in": ".test { position: relative; background: red ?if media " + query + "; margin: 10px ?if media " + query + "; }",
      "out": "".concat(".test { position: relative; }\n",
        "@media " + query + " {\n",
        ".test { background: red;\n",
        "margin: 10px; }\n",
        "}")
    },
    {
      "msg": "Move multiple properties with different inline ?if media queries into their own rules under @media queries.",
      "chk": "equal",
      "in": ".test { position: relative; background: red ?if media " + query + "; margin: 10px ?if media " + query2 + "; }",
      "out": "".concat(".test { position: relative; }\n",
        "@media " + query + " {\n",
        ".test { background: red; }\n",
        "}\n",
        "@media " + query2 + " {\n",
        ".test { margin: 10px; }\n",
        "}")
    },
    {
      "msg": "Throw error on malformed inline query.",
      "chk": "throws",
      "in": ".test { position: relative; background: red ?if media; }",
      "out": postcss.CssSyntaxError
    },
    {
      "msg": "Throw error on malformed inline query.",
      "chk": "throws",
      "in": ".test { position: relative; background: red ?if }",
      "out": postcss.CssSyntaxError
    }
  ],
  // color: green; is appended to these test because PostCSS keeps stripping the last ';'
  // from the result because of the nested block (which doesn't have a closing ';').
  //  Related: https://github.com/postcss/postcss-nested/issues/9
  "block": [ 
    {
      "msg": "Move a property in a block ?if media query into its own rule under an @media query.",
      "chk": "equal",
      "in": ".test { position: relative; ?if media " + query + " { background: red; } color: green; }",
      "out": "".concat(".test { position: relative; color: green; }\n",
        "@media " + query + " {\n",
        ".test { background: red; }\n",
        "}")
    },
    {
      "msg": "Move multiple properties in a block ?if media query into their own rule under an @media query.",
      "chk": "equal",
      "in": ".test { position: relative; ?if media " + query + " { background: red; margin: 10px; } color: green; }",
      "out": "".concat(".test { position: relative; color: green; }\n",
        "@media " + query + " {\n",
        ".test { background: red;\n",
        "margin: 10px; }\n",
        "}")
    },
    {
      "msg": "Move multiple properties in different block ?if media queries into their own rules under @media queries.",
      "chk": "equal",
      "in": ".test { position: relative; ?if media " + query + " { background: red; } ?if media " + query2 + " { margin: 10px; } color: green; }",
      "out": "".concat(".test { position: relative; color: green; }\n",
        "@media " + query + " {\n",
        ".test { background: red; }\n",
        "}\n",
        "@media " + query2 + " {\n",
        ".test { margin: 10px; }\n",
        "}")
    },
    {
      "msg": "Throw error on malformed inline query.",
      "chk": "throws",
      "in": ".test { position: relative; ?if media { background: red; } }",
      "out": postcss.CssSyntaxError
    },
    {
      "msg": "Throw error on malformed inline query.",
      "chk": "throws",
      "in": ".test { position: relative; ?if { background: red; } }",
      "out": postcss.CssSyntaxError
    }
  ]
}

test('Inline ?if media queries.', function(t) {
  t.plan(tests['inline'].length);
  var lazy = null;
  var css = null;
  var fix = null;

  for (var i = 0; i < tests['inline'].length; i++) {
    fix = tests['inline'][i];
    lazy = processor.process(fix.in);
    
    if(fix.chk == 'throws')
      t.throws(function() { css = lazy.css; }, fix.out);
    else
      t[fix.chk](ws(lazy.css), ws(fix.out));
  };
});

test('Block ?if media queries.', function(t) {
  t.plan(tests['block'].length);
  var lazy = null;
  var css = null;
  var fix = null;

  for (var i = 0; i < tests['block'].length; i++) {
    fix = tests['block'][i];
    lazy = processor.process(fix.in);
    
    if(fix.chk == 'throws')
      t.throws(function() { css = lazy.css; }, fix.out);
    else
      t[fix.chk](ws(lazy.css), ws(fix.out));
  };
});

// Normalize whitespace.
function ws(text) {
  return text.replace(/\s+/g, ' ');
}
