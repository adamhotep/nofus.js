/* nofus.js (NOminal Functions for UserScripts), a very small JS library.
 * THIS IS NOT jQUERY. It will always be under 1k lines / 50kB non-minified.
 * Functions ending in a dollar sign (`$`) mean the first arg is a CSS selector.
 * Functions starting with a dollar sign create DOM objects but don't take CSS.
 *
 * A few utility functions have aliases that exist outside the `nf` object
 * for easy access. One function can be installed into Node.prototype.
 * These are stored in the nf.alias object (or search this file for `alias`) and
 * their installation can be suppressed by setting `nf_config = { alias:false }`
 * BEFORE loading this script.
 *
 * Nofus is copyright 2017+ by Adam Katz. Apache License 2.0
 * https://github.com/adamhotep/nofus.js
 */

'use strict';

// All items live in this object, though some are cloned outside it.
// These cloned items are listed in nf.aliases
const nf = { GM:{}, addon:{}, alias:{} }

nf.version = '0.7.20250117.1';


// Version comparison. Works for pretty most dotted strings, Semver compatible.
// nf.compareVersions(string versionA, string versionB, [string cmp]) -> boolean	{{{
// True when versions compare as specified; ('2.10.4', '2.8.5', '>') is true
// Expected version format:
//
//     MAJOR[.MINOR[.PATCH[.MORE...]]][-PRERELEASE[.MORE...]][+BUILD]
//
// We support an arbitrary number of dotted things,
// then an optional hyphen and prerelease (with its own dotted things),
// then an optional plus and build number (which we ignore).
// Pre-releases are OLDER than (non-pre-)releases at the same version.
// See also Semantic Versioning 2.0.0, https://semver.org
// Unlike semver, we support ANY string, comparing string length then lexically.
nf.compareVersions = (versionA, versionB, cmp = '>') => {
  let t = true, f = false;
  if (cmp[0] == '<') { t = f; f = true }
  else if (cmp == '==') { t = f }
  else if (cmp == '!=') { f = t }
  // chuck the build and split into an array
  const va = versionA.toString().replace(/\+.*/, '').split('.');
  const vb = versionB.toString().replace(/\+.*/, '').split('.');
  const len = va.length > vb.length ? va.length : vb.length;
  for (let i = 0; i < len; i++) {
    const a = va[i]?.split('-') || [ 0 ];	// [version, pre-release]
    const b = vb[i]?.split('-') || [ 0 ];	// [version, pre-release]
    if (b[0].length > a[0].length) { return f }
    if (a[0].length > b[0].length || a[0] > b[0]) { return t }
    // pre-releases are *older* than same-number (non-pre-)releases
    if (a[0] < b[0] || a.length > b.length) { return f }
    if (a.length < b.length) { return t }
    // both have pre-releases. compare them.
    if (b[1]?.length > a[1]?.length) { return f }
    if (a[1]?.length > b[1]?.length || a[1] > b[1]) { return t }
  }
  return cmp.endsWith('=') && cmp != '!=';
}	// end nf.compareVersions()	}}}


// Define the valid log levels
nf.logLevels = { trace:0, debug:1, log:2, info:3, warn:4, error:5 }

// Set the log level to the lowest given level. True if set (even if unchanged).
// nf.setLogLevel(string level ...) -> boolean	{{{
nf.setLogLevel = (...levels) => {
  let min = 9, level;
  levels.forEach(l => {
    let n = nf.logLevels[l];	// convert to a numeric level
    if (l === false || l === null) {
      false;
    } else if (typeof l != 'string') {
      console.debug("Ignoring non-string logLevel", l);
    } else if (isNaN(n)) throw new TypeError("Invalid logLevel: `" + l
      + "` is not one of `" + Object.keys(nf.logLevels).join("`,`")
      + "`\nFalling back to `info`");
    else if (n < min) {
      min = n;
      level = l;
    }
  });
  if (min < 9) nf.logLevel = level;
  return min < 9;
}	// end of nf.setLogLevel()	}}}

// You can set `nf_config.logLevel` before loading this, or on a per-site basis
// with e.g. `localStorage.setItem(nf_logLevel, 'debug')` (which you can even
// run from the Developer Tools console), or after loading this with the
// `nf.setLogLevel()` function defined directly above this comment.

nf.logLevel = 'info';	// default log level
// If present, use the lower of `nf_config.logLevel` and `localStorage.logLevel`
nf.setLogLevel(typeof nf_config == 'object' && nf_config.logLevel,
  localStorage?.getItem('nf_logLevel'));

// Log if logLevel is sufficient. Includes time, logo, string substitution
// nf.trace(string message, [* substitution...]) -> undefined	{{{
// nf.debug(string message, [* substitution...]) -> undefined
// nf.log(string message, [* substitution...]) -> undefined
// nf.info(string message, [* substitution...]) -> undefined
// nf.warn(string message, [* substitution...]) -> undefined
// nf.error(string message, [* substitution...]) -> undefined
//
// https://developer.mozilla.org/en-US/docs/Web/API/console#using_string_substitutions
//
// Logs are suppressed if below nf.logLevel (see nf.logLevels)
//
// The logo is defined by custom CSS in the `nf.logLogo` variable, such as
//     nf.logLogo = `background:0/1em url('...') no-repeat; padding-left:3ex`;
//
Object.keys(nf.logLevels).forEach(type => {
  nf[type] = (...args) => {
    if (nf.logLevels[type] < nf.logLevels[nf.logLevel]) return;
    let msg = '%o';
    if (args.length == 0) msg = "";
    else if (typeof args[0] == 'string') msg = args.shift();
    console[type].call(this, '%c%s\n%c' + msg, 'font-family:sans-serif',
      Date(), typeof nf.logLogo == 'string' ? nf.logLogo : '', ...args);
  }
});	// end of nf.trace, nf.debug, nf.log, nf.info, nf.warn, nf.error }}}


// Get UserScript metadata for given key with optional value regex (as an array)
// nf.GM.getMetas(string key, [RegExp matcher]) -> string[] | null	{{{
nf.GM.getMetas = (key, matcher) => {
  // Don't forget you need `@grant GM.info` and/or `@grant GM_info`
  // Also note that GM.info/GM_info supports direct querying on some items,
  // see https://wiki.greasespot.net/GM.info
  // and https://www.tampermonkey.net/documentation.php#api:GM_info
  let scriptMetaStr = '';
  if (typeof GM == 'object' && GM?.info?.scriptMetaStr) {
    scriptMetaStr = GM.info.scriptMetaStr;
  } else if (typeof GM_info == 'object' && GM_info?.scriptMetaStr) {
    scriptMetaStr = GM_info.scriptMetaStr;
  } else { return null }
  const s = '[\\x20\\t]', S = '[^\\x20\\t]';	// like \s but doesn't match \n
  const values = scriptMetaStr
    .match(RegExp(`(?<=^\\s*//+${s}*@${key}${s}+)${S}[^\\n]*?(?=\\s*$)`, 'gm'));
  if (! (matcher instanceof RegExp) || values == null) return values;
  let matches = [];
  values.forEach(v => { if (matcher.exec(v)) matches.push(v) });
  return matches.length ? matches : null;
}	// end nf.GM.getMetas() }}}

// Get UserScript metadata for given key with optional value regex (first match)
// nf.GM.getMeta(string key, [RegExp matcher]) -> string | string[] | undefined	{{{
nf.GM.getMeta = (key, matcher) => {
  const value = nf.GM.getMetas(key, matcher);
  if (value) {
    // re-run the regex in order to pick up the capture groups
    if (matcher instanceof RegExp) { return matcher.exec(value[0]) }
    return value[0];
  }
  return undefined;
}	// end nf.GM.getMeta() }}}


// Returns HTML element(s) matched as queried via CSS selector
// nf.query$(string css, [HTMLElement scope], [boolean all]) -> HTMLElement | HTMLElement[]	{{{
// nf.queryAll$(string css, [HTMLElement scope]) -> HTMLElement[]
// q$(css)           =  document.querySelector(css)
// q$(css, elem)     =  elem.querySelector(css)
// q$(css, true)     =  document.querySelectorAll(css)
// q$(css, elem, 1)  =  elem.querySelectorAll(css)
// q$(css, 1, elem)  =  elem.querySelectorAll(css)
nf.query$ = (css, scope = document, all) => {
  let q = 'querySelector';
  if (typeof scope[q] != 'function') {
    if (all && typeof all[q] == 'function') {	// q$(css, all, scope)
      const tmp = scope;
      scope = all; all = tmp;
    } else {					// q$(css, all)
      all = scope;
      scope = document;
    }
  }
  if (all) q += 'All';
  return scope[q](css);
}
nf.queryAll$ = (css, scope) => { return nf.query$(css, scope, 1) }
// end nf.query$()	}}}
nf.alias.q$ = nf.query$;
nf.alias.qa$ = nf.queryAll$;


// Wait for HTML elements matching CSS, run given function on them upon loading
// nf.wait$(string css, function action, [HTMLElement scope], [object options]) -> MutationObserver	{{{
// Trigger `action(element)` for each match of css even when dynamically loaded.
// This returns the observer so you can do `w = nf.wait$(...)`
// and you can run `w.disconnect()` to disable it later.
// This runs upon setting. If you don't want that, set options = {}.
// The options are also fed to the MutationObserver observe() function, see
// https://developer.mozilla.org/docs/Web/API/MutationObserver/observe#options
// TODO: Does this need special parsing for frames & iframes? wfke has it:
//       https://gist.github.com/adamhotep/7c9068f2196326ab79145ae308b68f9e
nf.wait$ = (css, action, scope = document, options = { now:1 }) => {
  // option vetting
  const die = (obj, msg) => {
    throw new TypeError("nf.wait$: `" + obj + "` " + msg);
  }
  try { nf.query$(css, nf.$html('p')) }
  catch(e) { die(css, "is not a valid selector") }
  if (typeof action != 'function') { die(action, "is not a function") }
  if (! scope?.querySelector) {	// invalid scope
    // if scope is actually the options
    if (typeof scope == 'object' && (nf.objKeys(scope) == 0 || scope.childList
    || scope.now != undefined || scope.attributes || scope.characterData)) {
      const tmp = options?.querySelector ? options : document;	// swap?
      options = scope;
      scope = tmp;
    } else { die(scope, "must be an HTMLDocument or HTMLElement") }
  }
  // default options if given empty or just 'now' (TypeErrors come later)
  const k = nf.objKeys(options);
  if (k == 0 || k == 1 && options.now != undefined) {
    options.childList = options.subtree = options.attributes = 1 // defaults
  }
  // end vetting

  // Been-there mark. Anonymous functions are blank, so we hash their code.
  const actionMarker = (action.name || nf.hash(action.toString(), 36))
    + `@${nf.hash(css, 36)}$${parseInt(Math.random() * 36**6).toString(36)}`;

  const run = () => {
    nf.query$(css, scope, true)?.forEach(elem => {
      // TODO: move actionMarker back to a spaced attribute to avoid with CSS?
      // That means modifying the CSS (risky!). Justify performance need first.
      if (elem.nf_found && elem.nf_found[actionMarker]) { return } // been-there
      if (!elem.nf_found) { elem.nf_found = {} }
      elem.nf_found[actionMarker] = true;	// prevent loops even on errors
      try { action(elem) }
      catch (error) {
        const name = action.name ? '`' + action.name + '`' : "action";
        // we're NOT using nf.error because its timestamps won't cluster well
        console.error(`nf.wait$: error in ${name} function:\n${error}`);
      }
    });
  }

  const observer = new MutationObserver(run);

  observer.observe(scope, options);  // our options are MutationObserver options

  if (options.now) { run() }

  return observer;

}	// end nf.wait$()	}}}
nf.alias.w$ = nf.wait$;


// Add to or else make and insert a new CSS <style> element
// nf.style$(string css, [HTMLDocument|HTMLStyleElement where]) -> HTMLStyleElement	{{{
nf.style$ = (css, where = document) => {
  if (where instanceof HTMLStyleElement) {
    where.textContent += css;
    return where;
  }
  return where.head.appendChild(
    nf.$html('style', { type:'text/css', text:css })
  );
}	// end nf.style$()	}}}


// Make an HTML node. Children are set with subsequent attr or node+attr pairs.
// nf.$html(string nodeName, [object attributes], [Node child] ...) -> HTMLElement	{{{
// NOTE: attributes are HTML, not JavaScript (they were JS in nofus.js < 0.5):
// * Accepts HTML elements as children
// * nodeName is actually optional if attributes.nodeName exists
// * The `attributes` object sets HTML attributes except as follows:
//   * `text` & `textContent` set content (with both, `text` is an attribute)
//   * `className` sets `class` (with both, both are attributes)
//   * `value` & `checked` set Javascript properties, not HTML attributes
//   * accepts `dataset.fooBar` as `data-foo-bar`
//   * `nodeName` sets the element name, not an attribute
nf.$html = (...pairs) => {
  const name = typeof pairs[0] == 'string' ? pairs.shift() : pairs[0]?.nodeName;
  if (name == undefined) {
    throw new TypeError(`No node name in nf.$html(${ JSON.stringify(pairs) })`);
  }
  let elem = document.createElement(name);

  if (! (pairs[0] instanceof Node) && typeof pairs[0] == 'object') { // attrs
    const attributes = pairs.shift();
    let isKey = (key, a, b) => {
      return key == a || attributes[a] == undefined && key == b;
    }
    Object.keys(attributes).forEach(key => {
      let value = attributes[key]?.toString();
      if (key == 'value' || key == 'checked') {
        elem[key] = value;
      } else if (isKey(key, 'textContent', 'text')) {
        elem.textContent = value;
      } else if (isKey(key, 'class', 'className')) {
        elem.setAttribute('class', value);
      } else if (key.startsWith('dataset.') && key.lastIndexOf('.') == 7) {
        elem.dataset[key.slice(8)] = value;
      } else if (key != 'nodeName') elem.setAttribute(key, value);
    });
  }
  if (elem.id != '' && document.getElementById(elem.id)) {
    nf.warn("nf.$html() element has non-unique id `%s`:\n%o", elem.id, elem);
  }

  for (let p = 0; p < pairs.length; p++) {	// create optional children
    if (typeof pairs[p] == 'string') {
      let name = pairs[p];
      let attributes = {}
      let next = pairs[p + 1];
      if (! (next instanceof Node) && typeof next == 'object') {
        attributes = next;
        p++;
      }
      elem.append(nf.$html(name, attributes));
    } else if (pairs[p] instanceof Node) {	// accept a node as-is
      elem.append(pairs[p]);
    } else { elem.append(nf.$html(pairs[p])); }
  }

  return elem;
}	// end nf.$html()	}}}
nf.alias.$html = nf.$html;


// Make a text fragment
// nf.$text(string text) -> Text	{{{
nf.$text = text => {
  return document.createTextNode(text);
}	// end nf.$text()	}}}
nf.alias.$txt = nf.$text;


// Insert given element after reference element, like ref.insertBefore(...)
// nf.insertAfter(HTMLElement add, HTMLElement ref) -> HTMLElement	{{{
nf.insertAfter = (add, ref) => {
  return ref.parentElement.insertBefore(add, ref.nextSibling);
}	// end nf.insertAfter()	}}}

// Install as Node.prototype.insertAfter() when invoked
// nf.installInsertAfter() -> undefined	{{{
nf.installInsertAfter = () => {
  // push that right into the Node prototype
  if (typeof Node.prototype.insertAfter == 'undefined') {
    Node.prototype.insertAfter = add => {
      return nf.insertAfter(add, this);
    }
  }
}	// end nf.installInsertAfter()	}}}


// RegExp() wrapper that accepts perl's `x` flag (purge white space & #comments)
// nf.regex(string pattern, [string flags]) -> RegExp	{{{
// REMEMBER THAT PATTERN IS A STRING! Double-escapes needed!
// Given the `x` or `xx` flag:
// * Perl-style comments are purged (from `#` through the next newline)
// * white space is purged unless in a bracketed character class (see below)
// * Within bracketed character classes like `[this #0-9]`:
//   * Unescaped newlines (`\n`) are converted to escaped newlines (`\\n`)
//   * Other spaces are preserved with `x` but purged with `xx` (`[this#0-9]`)
//   * `#` is always preserved--you cannot have comments in character classes
// Differences with Perl's implementation:
// * JS lacks `\Q...\E` blocks, which are immune to these flags
// * JS lacks `(?#comments)` but   ab(?#text)c   could be   `ab`/*text*/+`c`
// * For now, you can put spaces in meta-patterns like `(? i:text)`,
//   though this is hard to read and therefore not recommended,
//   and this functionality may change to be more like Perl in the future
nf.regex = nf.regExp = (pattern, flags = '') => {
  if (flags.includes('x')) {
    let x = 1 + (flags.lastIndexOf('x') > flags.indexOf('x'));	// x=1, xx=2
    flags = flags.replace(/x+/g, '');
    let classes = [];
    // The negative lookbehind ensures we don't key on an escaped character.
    // If we could define it with the `x` flag, it'd be easier to understand:
    //     / (?<! (?<! \\ ) (?: \\ \\ )* \\ ) /x
    // Not preceded by an odd number of escape characters (which must be ensured
    // by a negative lookbehind within a negative lookbehind).
    // Note: Unlike most regex engines, JS accepts variable-width lookbehinds
    pattern = pattern
      // set bracketed character classes aside (immunize against next replace)
      .replace(/(?<!(?<!\\)(?:\\\\)*\\)\[[^\]]*\]/g, all => {
        let brackets = all.replace(/\n/g, '\\n');	// escape newlines
        if (x == 2) {	// `xx` purges unescaped spaces in bracketed classes
          brackets = brackets.replace(/(?<!(?<!\\)(?:\\\\)*\\)\s+/g, '')
        }
        classes.push(brackets);
        return `(?\u0000${classes.length - 1})`;	// set aside
      })
      // remove comments and spaces
      .replace(/(?<!(?<!\\)(?:\\\\)*\\)(?:#.*$|\s+)/mg, '')
      // return bracketed character classes
      .replace(/\(\?\u0000([0-9]+)\)/g, (all, i) => {
        return classes[i] || all
      })
  }
  return RegExp(pattern, flags);
}	// end nf.regex()	}}}


// Split a string by its spacing (or another separator) into an array
// nf.split(str string, [RegExp|string sep], [number limit]) -> array	{{{
nf.split = (str, sep = /\s+/, limit) => {
  if (typeof sep == 'number' && limit == undefined) { // given only str & limit
    limit = sep;
    sep = /\s+/;
  }
  let a = nf.stringify(str).split(sep, limit);
  if (a[0] == '') a.shift();
  if (a[a.length - 1] == '') a.pop();
  return a;
}	/// end of nf.sq()	}}}
nf.alias.qw = nf.split;


// A nearly-complete C-style sprintf implementation
// nf.sprintf(string template, [* substitution...]) -> string	{{{
// I've built this mostly from perl's sprintf man page,
// https://perldoc.perl.org/functions/sprintf
// Unsupported:
//   * %p, %n, %a, and %A conversions
//   * `$` format parameter index (mess with positional argument order)
//   * sizes modifiers (hh, h, j, l, q, L, ll, t, z) -- numbers are numbers
//   * vector flags (modifiers) like %vd
nf.sprintf = (template, ...substitutions) => {
  return template
    .replace(/\u0000/g, '')	// no null characters, we use those as escapes
    .replace(/%%/g, '\u0000')	// escaped escapes are temporarily nulls

    .replace(/%([# 0+-]*)([0-9]*|\*)(\.(?:[0-9]*|\*))?([bBcsduoxXeEfFgGi])/g,
      (all, flags, minWidth, prec, type) => {
        if (minWidth == '*') {
          minWidth  = substitutions.shift();
          if (minWidth < 0) { flags += '-'; minWidth *= -1; }
        }
        if (prec == '.') { prec = ''; }
        else if (prec == '.*') { prec = substitutions.shift(); }
        else if (prec != undefined) { prec = prec.slice(1); }
        // Yes, prec is `undefined` when missing and that we use that here
        if (prec < 0) { prec = undefined; }  // negative = no precision at all

        let out = substitutions.shift() + '';
        const ltype = type.toLowerCase();

        if (ltype.match(/[boxdiu]/)) {	// integer (bin, oct, hex, or decimal)
          if (prec != undefined) {	// ignore 0 flag there's a precision
            flags = flags.replace(/0+/g, '');
          }
          let prefix = '0' + type;
          let radix = 10;					// decimal
          if      (ltype == 'b') { radix = 2; }			// binary
          else if (ltype == 'o') { radix = 8; prefix = ''; }	// octal
          else if (ltype == 'x') { radix = 16; }			// hexadecimal

          out = (+ out).toString(radix).padStart(prec, '0');

          if (flags.includes('#') && radix != 10) {
            if (ltype == 'o' && out.slice(0, 1) != '0') { prefix = '0'; }
            out = prefix + out;
          }
        }

        else if (type == 'c') { 	// character from numeric code
          out = String.fromCharCode(out);
        }

        else if (ltype == 'e') {	// exponential/scientific notation
          out = (+ out).toExponential(prec).replace(/e/, type);
        } else if (ltype == 'f') {	// fixed float
          out = (+ out).toFixed(prec);
        } else if (ltype == 'g') {	// fixed or scientific by significance
          out = (+ out).toPrecision(prec).replace(/e/, type == 'G' ? 'E' : 'e');
        }

        else if (type == 's') {
          out = out.slice(0, prec);
        }


        // pad non-negative numbers when told to do so
        if (type != 'c' && type != 's' && out.slice(0, 1) != '-') {
          if (flags.includes('+')) { out = '+' + out; }	// plus trumps space
          else if (flags.includes(' ')) { out = ' ' + out; }
        }


        if (minWidth > 0) {	// ('' > 0) is false
          if (flags.includes('-')) {	// left-justify, ignore `0` flag
            out = out.padEnd(minWidth, ' ');
          } else {
            out = out.padStart(minWidth, flags.includes('0') ? '0' : ' ');
          }
        }

        return out;
      })

    .replace(/\u0000/g, '%');	// swap temporary null escape back, MUST BE LAST
}	// end nf.sprintf()	}}}


// Round to human-readable units (English or metric or binary/bytes)
// nf.roundh(number num, [number width], [string type]) -> String	{{{
// Types are as follows:
// * 'English' uses capital K for thousands and B for billions
// * 'Metric' uses lowercase k for thousands and G for giga (billions)
// * 'Fractional' is metric including fractional units (m for thousandths)
// * 'Bytes' is Metric but in blocks of 1024 rather than 1000
nf.roundh = (num, width = 4, type = 'English') => {
  if (num === 0) return '0';
  let sign = '';
  if (num < 0) { sign = '-'; num *= -1; }
  if (typeof width == 'string') { // accept swapped order
    const tmp = typeof type == 'number' ? type : 4;
    type = width;
    width = tmp;
  }
  if (!(width >= 2)) throw new RangeError(`width ${width} must be 2+`);
  type = type.slice(0, 1).toUpperCase(); // just the first character
  let frac = 0;
  if (type == 'F') { frac = -8; type = 'B'; }
  else if (num < 1) return sign + num.toFixed(width - 2);
  const radix = (type == 'B' ? 1024 : 1000);
  let sizes = //.. 3   4   5   6 (mu)   7  8   9  10  11  12  13  14  15  16
    [ 'y','z','a','f','p','n','\u03bc','m','','k','M','G','T','P','E','Z','Y'];
  if (type == 'E') { sizes[9] = 'K'; sizes[11] = 'B'; }
  let power = Math.floor(Math.log(num) / Math.log(radix));
  num /= radix**power;
  if (frac <= power && power <= 8) {
    power += 8;
    return sign + (num / 1).toPrecision(width) + sizes[power];
  }
  return sign + num.toExponential(width);
}	// end nf.roundh()	}}}


// Convert seconds to colon-delimited time string (Y:D:HH:MM:SS.SSS, e.g. 4:20)
// nf.sec2time(number seconds, [boolean units]) -> string	{{{
// (See nf.sec2units below for what happens when `units` is defined)
nf.sec2time = (seconds = 0, units) => {
  const y = 31536000, d = 86400, h = 3600, m = 60;
  let years, days, hours, minutes;
  seconds -= y * ( years   = Math.floor(seconds / y) );
  seconds -= d * ( days    = Math.floor(seconds / d) );
  seconds -= h * ( hours   = Math.floor(seconds / h) );
  seconds -= m * ( minutes = Math.floor(seconds / m) );
  seconds = years + 'y '
          + days + 'd '
          + String(hours).padStart(2, '0') + 'h '
          + String(minutes).padStart(2, '0') + 'm '
          + String(seconds.toFixed(3)).padStart(6, '0');	// %06.3f
  // strip leading zeros & trailing zeros down to M:SS, 0:0:00:00:00.00 -> 0:00
  seconds = seconds.replace(/^[0ydh ]+|\.?0+$/g, '');
  if (!units) { return seconds.replace(/[ydhm] /g, ':'); }
  return seconds.replace(/ 0(?=[0-9])/g, '') + 's';
}	// end nf.sec2time()	}}}

// Convert seconds to unit-based time string (Yy Dd Hh Mm S.SSSs, e.g. 3d 16m)
// nf.sec2units(number seconds) -> string	{{{
nf.sec2units = (seconds = 0) => {
  return nf.sec2time(seconds, 1);
}	// end nf.sec2units()	}}}

// Convert colon-delimited time string (Y:D:H:M:S) to seconds
// nf.time2sec(string time) -> number	{{{
nf.time2sec = time => {
  const parts = time.toString().split(':').reverse();
  let seconds = 0;
  if (parts.length > 5) { throw new SyntaxError("Too many parts in time!"); }
  if (parts.length == 5) { seconds += y * parts[4]; }
  if (parts.length >= 4) { seconds += d * parts[3]; }
  if (parts.length >= 3) { seconds += h * parts[2]; }
  if (parts.length >= 2) { seconds += m * parts[1]; }
  return seconds + parts[0] * 1;
}	// end nf.time2sec()	}}}

// Convert unit-based time (Yy Dd Hh Mm S.SSSs, e.g. 3d 16m) to seconds
// nf.units2sec(string time) -> number	{{{
// This can't account for leap years since it doesn't know the relevant year.
nf.units2sec = time => {
  const y = 31536000, mo = 2628000, d = 86400, h = 3600, m = 60;

  const num = `-? [0-9]+ (?: \\. [0-9]* )? (?: e [+-]?[0-9]+ )?`;
  const parts = time.toString().match(nf.regex(	// spelled, like 1h 23m 45s
  ` ^
    (?: (?<years>   ${num} ) \\s* y (?: (?: ea )? r s? )?	,? \\s* )?
    (?: (?<months>  ${num} ) \\s* mo (?: nth )? s?		,? \\s* )?
    (?: (?<weeks>   ${num} ) \\s* w (?: (?: ee )? k s? )?	,? \\s* )?
    (?: (?<days>    ${num} ) \\s* d (?: ays? )? 		,? \\s* )?
    (?: (?<hours>   ${num} ) \\s* h (?: (?: ou )? rs? )?	,? \\s* )?
    (?: (?<minutes> ${num} ) \\s* m (?: in (?: ute )? s? )?	,? \\s* )?
    (?: (?<seconds> ${num} ) \\s* (?: s (?: ec (?: ond )? s? )? \\b | $ ) )?
    \\s* $
  `, 'xi'));
  if (parts == null) { throw new SyntaxError("Invalid time string"); }

  return (parts.groups.years	?? 0) * 31536000	// 1y = 365.00d
       + (parts.groups.months	?? 0) * 2628000 	// 1mo = y/12 = 30.417d
       + (parts.groups.weeks	?? 0) * 604800  	// 1w = 7*d
       + (parts.groups.days	?? 0) * 86400		// 1d = 24*h
       + (parts.groups.hours	?? 0) * 3600
       + (parts.groups.minutes	?? 0) * 60
       + (parts.groups.seconds	?? 0);
}	// end nf.units2sec()	}}}

// Convert various time formats to either seconds or colon-delimited time string
// nf.timecalc(string|number time) -> number | string	{{{
nf.timecalc = time => {

  // number -> colon-delimited, e.g. 1234 -> '20:34'
  if (!isNaN(time) && !isNaN(+ time)) { return nf.sec2time(+ time); }

  // colon-delimited -> number, e.g. '20:34' -> 1234
  if (time.match(/^[0-9.]*:[0-9.:]*$/)) { return nf.time2sec(time); }

  // unit-marked -> number, e.g. '20m 34s' -> 1234
  return nf.units2sec(time);

}	// end nf.timecalc()	}}}


// Convert pretty much anything into a string
// nf.stringify(* obj) -> string	{{{
nf.stringify = obj => {
  if (typeof obj != 'string') {
    obj = obj?.outerHTML ?? obj?.wholeText ?? JSON.stringify(obj)
      ?? obj?.toString();
    if (obj == undefined || obj == '{}') {
      throw new TypeError("nf.stringify: Could not convert input to a string");
    }
  }
  return obj;
}	// end of nf.stringify()	}}}


// Fast non-cryptographic checksum hasher (Fowler-Noll-Vo)
// nf.hash(string str, [number radix], [string seed]) -> number|string	{{{
// Fowler-Noll-Vo (FNV-1a) is a FAST simple non-cryptographic hashing function.
// https://en.wikipedia.org/wiki/Fowler-Noll-Vo_hash_function
// See https://stackoverflow.com/a/22429679/519360 and especially its comments.
// DO NOT USE FOR SECURE COLLISION-RESISTANT CODE (e.g. password hashing).
nf.hash = (str, radix = 10, seed = 0x811c9dc5) => {
  str = nf.stringify(str);
  for (let i = 0, len = str.length; i < len; i++) {
    seed ^= str.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193);
  }
  seed = seed >>> 0;
  if (radix != 10) return seed.toString(radix);
  return seed;
}	// end nf.hash()	}}}

// Fast non-cryptographic checksum hasher (Fowler-Noll-Vo) as hex string
// nf.hash_hex(string str) -> string	{{{
nf.hash_hex = (str, seed) => {
  return nf.hash(str, 16, seed);
}	// end nf.hash_hex()	}}}


// Convert any CSS-valid color to #RRGGBB[AA] or (red, green, blue, [alpha])
// WARNING: this uses the document body, which may not yet be loaded!
// nf.color2hex(string color, [string format]) -> string|array	{{{
// Formats are as follows:
// * 'rgb' outputs an array of red, green, blue (all 0-255), and alpha (0-1)
// * 'srgb' outputs as 'rgb' but all values use a 0-1 scale
// * 'hex' (default) outputs a string for #RRGGBB or #RRGGBBAA
nf.color2hex = (color, format = 'hex') => {
  let e = document.body.appendChild($html('span'));
  e.style.color = `rgb(from ${color} r g b / alpha)`;
  let t = "#%02x%02x%02x", computed = getComputedStyle(e)?.color;
  let c = computed?.match(/-?[0-9.]+(?:e[+-][0-9]+)?/g);
  document.body.removeChild(e);
  if (!e.style.color || !c) {
    throw new TypeError("nf.color2hex: invalid color `" + color + "`");
  }
  for (let i = 0; i < c.length; i++) {
    if (computed.includes('srgb') && i < 3) c[i] *= 255;	// srgb is 0-1
    if (c[i] < 0) c[i] = 0;
    // Opacity. Both FF & Chrome have a rounding error fixed by adding 0.002
    if (i == 3) { t += "%02x"; c[3] = Math.round((+ c[3] + 0.002) * 255); }
    else c[i] = Math.round(+ c[i]);
  }
  if (format == 'rgb') { if (c[3]) c[3] /= 255; return c; }
  if (format == 'srgb') return c.map(x => x/255);
  return nf.sprintf(t, ...c);
}	// end of color2hex()	}}}


// Count the direct ("own") keys of an object or else return undefined
// nf.objKeys(object obj) -> number | undefined	{{{
// via https://stackoverflow.com/a/32108184/519360, adapted to count
nf.objKeys = obj => {
  if (obj == null || typeof obj != 'object') return undefined;
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype) return undefined;
  let n = 0;
  for (const o in obj) { if (Object.hasOwn(obj, o)) n++ }
  return n
}	// end nf.objKeys()	}}}
// Determine if something is an empty object  (obj == {}) does NOT work)
// nf.objEmpty(object obj) -> boolean	{{{
nf.objEmpty = obj => { return nf.objKeys(obj) == 0 }
// end of nf.objEmpty() }}}

// Simple sleep function, either async or else wrapping a function
// nf.sleep(number ms, [function action, [* args...]]) -> Promise | undefined	{{{
// invoked as either:   await nf.sleep(time);  // only in async functions
//                or:   function foo() {...}; nf.sleep(time, foo);
nf.sleep = (ms, action, ...args) => {
  if (typeof action == 'function') { return setTimeout(action, ms, ...args); }
  return new Promise(what => setTimeout(what, ms));
}	// end nf.sleep()	}}}


// Install all aliases
// nf.installAliases() -> undefined	{{{
nf.installAliases = () => {
  Object.keys(nf.alias).forEach(alias => globalThis[alias] = nf.alias[alias]);
}	// end of nf.installAliases()	}}}

// Remove all aliases
// nf.uninstallAliases() -> undefined	{{{
nf.uninstallAliases = () => {
  Object.keys(nf.alias).forEach(alias => delete globalThis[alias]);
}	// end of nf.uninstallAliases()	}}}

// Install aliases unless `nf_config.alias` is defined and evaluates to false
if (typeof nf_config != 'object' || (nf_config.alias ?? 1)) {
  nf.installAliases();
} else {
  nf.debug("Nofus aliases suppressed because `nf_config.alias` =",
    nf_config.alias);
}
