var test = require('tape');
var tapSpec = require('tap-spec');
var tapDiff = require('tap-diff');
var tapNotify = require('tap-notify');
var postcss = require("postcss");
var plugin = require("..");


// if(require.main === module) {
if(!module.parent) {
  test.createStream()
    // .pipe(tapSpec())
    // .pipe(tapNotify())
    .pipe(tapDiff())
    .pipe(process.stdout);
}

var opts = {};
var processor = postcss([plugin(opts)]);
var query = 'tv and (min-width: 700px) and (orientation: landscape)';
var query2 = '(min-width: 700px) and (orientation: landscape)';

var tests = {
  "inline": [
    {
      "msg": "PostCSS 6 Support #5",
      "chk": "equal",
      "in": `.test {
                margin: 0 1rem;
                margin: 0 3rem ?if media (min-width: 900px);
              }`,
      "out": `.test {
                margin: 0 1rem;
              }
              @media (min-width: 900px) {
                .test {
                   margin: 0 3rem;
                }
              }`
    },
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
      "msg": "Make sure question mark ? in query part of a url() is not mistaken for the start of an ?if query.",
      "chk": "equal",
      "in": ".test { position: relative; background: url(bg.dev?if=test.png&size=l) ?if media " + query + "; }",
      "out": "".concat(".test { position: relative; }\n",
        "@media " + query + " {\n",
        ".test { background: url(bg.dev?if=test.png&size=l); }\n",
        "}")
    },
    {
      "msg": "Make sure question mark ? in query part of a url() is not mistaken for the start of an ?if query.",
      "chk": "equal",
      "in": ".test { position: relative; background: url(bg.dev?if=test.png&size=l); }",
      "out": ".test { position: relative; background: url(bg.dev?if=test.png&size=l); }"
    },
    {
      "msg": "Warn on apparent malformed inline query.",
      "chk": "warns",
      "in": ".test { position: relative; background: red ?if media; }",
      "out": undefined
    },
    {
      "msg": "Warn on apparent malformed inline query.",
      "chk": "warns",
      "in": ".test { position: relative; background: red ?if }",
      "out": undefined
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
      "msg": "Warn on apparent malformed inline query.",
      "chk": "warns",
      "in": ".test { position: relative; ?if media { background: red; } }",
      "out": undefined
    },
    {
      "msg": "Warn on apparent malformed inline query.",
      "chk": "warns",
      "in": ".test { position: relative; ?if { background: red; } }",
      "out": undefined
    },
    {
      "msg": "Warn on apparent malformed inline query.",
      "chk": "warns",
      "in": ".test { position: relative; #an-id ? > .a-class { background: red; } }",
      "out": undefined
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

    // console.log('\n---\n', lazy.css, lazy.result.warnings(), '\n---\n')
    if(fix.chk == 'throws')
      t.throws(function() { css = lazy.css; }, fix.out);
    else if(fix.chk == 'warns')
      t.ok((lazy.css, lazy.result.warnings()).length > 0)
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
    else if(fix.chk == 'warns') {
      // console.log((lazy.css, lazy.result.warnings()))
      t.ok((lazy.css, lazy.result.warnings()).length > 0)
    }
    else
      t[fix.chk](ws(lazy.css), ws(fix.out));
  };
});

// Normalize whitespace.
function ws(text) {
  return text.replace(/\s+/g, ' ');
}
