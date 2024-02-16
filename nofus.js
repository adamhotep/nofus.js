/* nofus.js (NOminal Functions for UserScripts), a very small JS library.
 * THIS IS NOT jQUERY. It will always be under 1k lines / 50kB non-minified.
 * Functions ending in a dollar sign (`$`) mean the first arg is a CSS selector.
 * Functions starting with a dollar sign create DOM objects but don't take CSS.
 *
 * Nofus is copyright 2017+ by Adam Katz. Apache License 2.0
 * https://github.com/adamhotep/nofus.js
 */

'use strict';

// All items live in this object, though some are cloned outside it.
const nf = { GM: {}, addon: {} };

nf.version = '0.2.20240215.0';


// Version comparison. Works for pretty most dotted strings, Semver compatible.
// Usage: nf.compareVersions(string versionA, string versionB, string cmp) -> boolean	{{{
// True when versionA matches cmp with versionB. cmp defaults to > (newer).
// Expected version format:
//     MAJOR[.MINOR[.PATCH[.MORE...]]][-PRERELEASE[.MORE...]][+BUILD]
// We support an arbitrary number of dotted things,
// then an optional prerelease (with an arbitrary number of dotted things)
// then an optional build number (which we ignore)
// See also Semantic Versioning 2.0.0, https://semver.org
// Unlike semver, we support ANY string, comparing string length then lexically.
// Pre-releases are OLDER than (non-pre-)releases at the same version.
nf.compareVersions = (versionA, versionB, cmp = ">") => {
  const t = true, f = false;
  if (cmp.startsWith("<")) { t = f; f = true }
  else if (cmp == "==") { t = f }
  else if (cmp == "!=") { f = t }
  // chuck the build and split into an array
  const va = versionA.toString().replace(/\+.*/, "").split(".");
  const vb = versionB.toString().replace(/\+.*/, "").split(".");
  const len = va.length > vb.length ? va.length : vb.length;
  for (let i = 0; i < len; i++) {
    const a = va[i]?.split("-") || [ 0 ]; 	// [version, pre-release]
    const b = vb[i]?.split("-") || [ 0 ]; 	// [version, pre-release]
    if (b[0].length > a[0].length) { return f }
    if (a[0].length > b[0].length || a[0] > b[0]) { return t }
    // pre-releases are *older* than same-number (non-pre-)releases
    if (a[0] < b[0] || a.length > b.length) { return f }
    if (a.length < b.length) { return t }
    // both have pre-releases. compare them.
    if (b[1]?.length > a[1]?.length) { return f }
    if (a[1]?.length > b[1]?.length || a[1] > b[1]) { return t }
  }
  return cmp.endsWith("=") && cmp != '!=';
}	// end nf.compareVersions()	}}}


// Log if logLevel is sufficient. Includes type, time, logo, string substitution
// Usage: nf._log(string type, string message[, * substitution...])	{{{
//
// Type is one of debug, assert, log (default), info, warn, error. See also
// https://developer.mozilla.org/en-US/docs/Web/API/console#using_string_substitutions
// Logs are suppressed if below nf.logLevel (see nf.logLevels below)
//
// The logo is defined by custom CSS in the `nf.logLogo` variable, such as
//     nf.logLogo = `background:0/1em url("...") no-repeat; padding-left:3ex`;
nf._log = (type, ...args) => {
  if (nf.logLevel < nf.logLevels[type]) { return; }
  if (typeof args[0] == "object") { args.unshift("%o"); }
  args.splice(0, 1, "%c%s\n%c" + args[0], 'font-family:sans-serif', Date(),
    typeof nf.logLogo == "string" ? log_logo : "");

  // NOTE: the console log will cite THIS call's line number,
  // so you might still want console.log() and friends for debugging :-(
  console[type](...args);
}	// end nf._log()	}}}
nf.logLevel = 'info';
nf.logLevels = { debug: 0, assert: 1, log: 2, info: 3, warn: 4, error: 5 };
// Usage: nf.debug(string message[, * substitution...])
// Usage: nf.assert(string message[, * substitution...])
// Usage: nf.log(string message[, * substitution...])
// Usage: nf.info(string message[, * substitution...])
// Usage: nf.warn(string message[, * substitution...])
// Usage: nf.error(string message[, * substitution...])
Object.keys(nf.logLevels).forEach(type => {
  nf[type] = (...args) => { return nf._log(type, ...args); }
});


// Get UserScript metadata for given key (as an array)
// Usage: nf.GM.getMetas(string key) -> string[] | null 	{{{
nf.GM.getMetas = key => {
  // Don't forget you need `@grant GM.info` and/or `@grant GM_info`
  // Also note that GM.info/GM_info supports direct querying on some items,
  // see https://wiki.greasespot.net/GM.info
  // and https://www.tampermonkey.net/documentation.php#api:GM_info
  let scriptMetaStr = "";
  if (typeof GM == "object" && GM?.info?.scriptMetaStr) {
    scriptMetaStr = GM.info.scriptMetaStr;
  } else if (typeof GM_info == "object" && GM_info?.scriptMetaStr) {
    scriptMetaStr = GM_info.scriptMetaStr;
  } else { return null }
  const s = '[\\x20\\t]', S = '[^\\x20\\t]';	// like \s but doesn't match \n
  return scriptMetaStr
    .match(RegExp(`(?<=^\\s*//+${s}*@${key}${s}+)${S}.*?(?=\\s*$)`, 'gm'));
};	// end nf.GM.getMetas() }}}

// Get UserScript metadata for given key (first match only)
// Usage: nf.GM.getMeta(string key) -> string | undefined	{{{
nf.GM.getMeta = key => {
  const value = nf.GM.getMetas(key);
  if (value) { return value[0]; }
  return undefined;
};	// end nf.GM.getMeta() }}}


// Returns object(s) matched as queried via CSS selector
// Usage: nf.query$(string css[, HTMLElement scope][, boolean list]) -> HTMLElement | HTMLElement[]	{{{
// q$(css)           ->  document.querySelector(css)
// q$(css, elem)     ->  elem.querySelector(css)
// q$(css, true)     ->  document.querySelectorAll(css)
// q$(css, elem, 1)  ->  elem.querySelectorAll(css)
// q$(css, 1, elem)  ->  elem.querySelectorAll(css)
nf.query$ = function(css, scope = document, list) {
  if (arguments.length == 2 && typeof scope?.querySelector != 'function') {
    list = scope; scope = document;		// run as q$(css, list)
  } else if (typeof list?.querySelector == 'function' && !!scope == scope) {
    const tmp = scope; scope = list; list = tmp; // run as q$(css, list, scope)
  }
  if (list) { return scope.querySelectorAll(css) }
  else     { return scope.querySelector(css) }
}	// end nf.query$()	}}}
const q$ = nf.query$;	// alias


// Wait for HTML elements matching css, run given function on them upon loading
// Usage: nf.wait$(string css, function action[, HTMLElement scope][, object options]) -> MutationObserver	{{{
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
  const die = (obj, msg) => { throw new TypeError(`nf.wait$: '${obj}' ${msg}`) }
  try { nf.query$(css, nf.$html("p")) }
  catch(e) { die(css, "is not a valid selector") }
  if (typeof action != "function") { die(action, "is not a function") }
  if (! scope?.querySelector) {	// invalid scope
    // if scope is actually the options
    if (typeof scope == "object" && (nf.objKeys(scope) == 0 || scope.childList
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

  // Been-there mark. Anonymous functions work fine: ( function(){} ).name == ""
  const actionMarker = action.name + "%" + nf.hash_hex(css + action.toString());

  const run = () => {
    nf.query$(css, scope, true).forEach(elem => {
      // TODO: move actionMarker back to a spaced attribute to avoid with CSS?
      // That means modifying the CSS (risky!). Justify performance need first.
      if (elem.nf_found && elem.nf_found[actionMarker]) { return } // been-there
      if (!elem.nf_found) { elem.nf_found = {} }
      elem.nf_found[actionMarker] = true;	// prevent loops even on errors
      try { action(elem) }
      catch (error) {
        const name = action.name ? `"${action.name}"` : "action";
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
const w$ = nf.wait$;	// alias


// Add to or else make and install a new CSS <style> element
// Usage: nf.style$(string css[, HTMLDocument|HTMLStyleElement where]) -> HTMLElement	{{{
nf.style$ = (css, where = document) => {
  if (where instanceof HTMLStyleElement) {
    where.textContent += css;
    return where;
  }
  return where.head.appendChild(
    $html("style", { type: "text/css", textContent: css })
  );
}	// end nf.style$()	}}}


// Make an HTML node. Optional subsequent node+attr pairs become its children.
// Usage: nf.$html(string nodeName[, object attributes] ...) -> HTMLElement	{{{
// TODO: is this a safe way to deep-clone an element? That wasn't the intent...
// NOTE: attributes are JavaScript, not HTML:
// * nodeName is actually optional if attributes.nodeName exists
// * The `textContent` attribute will populate text inside the node
// * As you can see below, we convert `class` to JS `className`
nf.$html = (...pairs) => {
  const name = typeof pairs[0] == "string" ? pairs.shift() : pairs[0]?.nodeName;
  if (name == undefined) { throw new TypeError("No node name given"); }
  let elem = document.createElement(name);

  if (typeof pairs[0] == "object") {	// populate attributes
    const attributes = pairs.shift();
    Object.keys(attributes).forEach(key => {
      if (key == "class") { elem["className"] = attributes[key] } // JS mapping
      else { elem[key] = attributes[key] }
    });
  }
  if (elem.id != "" && document.getElementById(elem.id)) {
    nf.warn('nf.$html() element has non-unique id "%s":\n%o', elem.id, elem);
  }

  for (let p = 0; p < pairs.length; p++) {	// create optional children
    if (typeof pairs[p] == "string") {
      elem.appendChild(nf.$html(pairs[p],
        typeof pairs[p+1] == "object" ? pairs[++p] : {}));  // obj: increment p
    } else { elem.appendChild(nf.$html(pairs[p])); }
  }

  return elem;
}	// end nf.$html()	}}}
const $html = nf.$html;	// alias


// Make a text fragment
// Usage: nf.$text(string text) -> Text 	{{{
nf.$text = text => {
  return document.createTextNode(text);
}	// end nf.$text()	}}}
const $txt = nf.$text;	// alias


// Insert given element after reference element, like ref.insertBefore(...)
// Usage: nf.insertAfter(HTMLElement add, HTMLElement ref) -> add	{{{
nf.insertAfter = (add, ref) => {
  return ref.parentElement.insertBefore(add, ref.nextSibling);
}	// end nf.insertAfter()	}}}

// Install as Node.prototype.insertAfter() when invoked
// Usage: nf.installInsertAfter() -> undefined	{{{
nf.installInsertAfter = () => {
  // push that right into the Node prototype
  if (typeof Node.prototype.insertAfter == 'undefined') {
    Node.prototype.insertAfter = add => {
      return nf.insertAfter(add, this);
    }
  }
}	// end nf.installInsertAfter()	}}}


// RegExp() wrapper that accepts perl's `x` flag (purge white space & #comments)
// Usage: nf.regex(string pattern[, string flags]) -> RegExp	{{{
// REMEMBER THAT PATTERN IS A STRING! Double-escapes needed!
nf.regex = nf.regExp = (pattern, flags = "") => {
  if (flags.includes("x")) {
    flags = flags.replace(/x/g, "");
    // This monster negative lookbehind prevents matching escaped `#` characters
    pattern = pattern.replace(/(?<!(?<!\\)(?:\\\\)*\\)#.*$|\s+/mg, "");
  }
  return RegExp(pattern, flags);
}	// end nf.regex()	}}}


// A nearly-complete C-style sprintf implementation
// Usage: nf.sprintf(string template[, * substitutions...]) -> string	{{{
// I've built this mostly from perl's sprintf man page,
// https://perldoc.perl.org/functions/sprintf
// Unsupported:
//   * %p, %n, %a, and %A conversions
//   * `$` format parameter index (mess with positional argument order)
//   * sizes modifiers (hh, h, j, l, q, L, ll, t, z) -- numbers are numbers
//   * vector flags (modifiers) like %vd
nf.sprintf = (template, ...substitutions) => {
  return template
    .replace(/\u0000/g, "")	// no null characters, we use those as escapes
    .replace(/%%/g, "\u0000")	// escaped escapes are temporarily nulls

    .replace(/%([# 0+-]*)([0-9]*|\*)(\.(?:[0-9]*|\*))?([bBcsduoxXeEfFgGi])/g,
      (all, flags, minWidth, prec, type) => {
        if (minWidth == "*") {
          minWidth  = substitutions.shift();
          if (minWidth < 0) { flags += "-"; minWidth *= -1; }
        }
        if (prec == ".") { prec = ""; }
        else if (prec == ".*") { prec = substitutions.shift(); }
        else if (prec != undefined) { prec = prec.substring(1); }
        // Yes, prec is `undefined` when missing and that we use that here
        if (prec < 0) { prec = undefined; }  // negative = no precision at all

        let out = substitutions.shift() + "";
        const ltype = type.toLowerCase();

        if (ltype.match(/[boxdiu]/)) {	// integer (bin, oct, hex, or decimal)
          if (prec != undefined) {	// ignore 0 flag there's a precision
            flags = flags.replace(/0+/g, "");
          }
          let prefix = "0" + type;
          let base = 10;					// decimal
          if      (ltype == "b") { base = 2; }			// binary
          else if (ltype == "o") { base = 8; prefix = ""; }	// octal
          else if (ltype == "x") { base = 16; }			// hexadecimal

          out = parseInt(out).toString(base).padStart(prec, "0");

          if (flags.includes("#") && base != 10) {
            if (ltype == "o" && out.substring(0, 1) != "0") { prefix = "0"; }
            out = prefix + out;
          }
        }

        else if (type == "c") { 	// character from numeric code
          out = String.fromCharCode(out);
        }

        else if (ltype == "e") {	// exponential/scientific notation
          out = parseFloat(out).toExponential(prec).replace(/e/, type);
        } else if (ltype == "f") {	// fixed float
          out = parseFloat(out).toFixed(prec);
        } else if (ltype == "g") {	// fixed or scientific by significance
          out = parseFloat(out).toPrecision(prec)
            .replace(/e/, type == "G" ? "E" : "e");
        }

        else if (type == "s") {
          out = out.substring(0, prec);
        }


        // pad non-negative numbers when told to do so
        if (type != "c" && type != "s" && out.substring(0, 1) != "-") {
          if (flags.includes("+")) { out = "+" + out; }	// plus trumps space
          else if (flags.includes(" ")) { out = " " + out; }
        }


        if (minWidth > 0) {	// ("" > 0) is false
          if (flags.includes("-")) {	// left-justify, ignore `0` flag
            out = out.padEnd(minWidth, " ");
          } else {
            out = out.padStart(minWidth, flags.includes("0") ? "0" : " ");
          }
        }

        return out;
      })

    .replace(/\u0000/g, "%");	// swap temporary null escape back, MUST BE LAST
}	// end nf.sprintf()	}}}


// Round a number to a given precision (default is 0, an integer)
// Usage: nf.round(number num[, integer decimals]) -> number	{{{
nf.round = (num, decimals = 0) => {
  decimals = 10 ** decimals;
  return parseInt(num * decimals + 0.5) / decimals;
}	// end nf.round()	}}}

// Round to units (English or metric or binary/bytes)
// Usage: nf.round_units(number num[, number precision][, string type]) -> String	{{{
// * English uses capital K for thousands and B for billions
// * Metric uses lowercase k for thousands and G for giga (billions)
// * Fractional is metric including fractional units (m for thousandths)
// * Bytes is Metric but in blocks of 1024 rather than 1000
nf.round_units = (num, precision = 3, type = 'english') => {
  if (num === 0) return '0';
  let sign = '';
  if (num < 0) { sign = '-'; num *= -1; }
  if (typeof precision == 'string') { // accept swapped order
    const tmp = typeof type == 'number' ? type : 3;
    type = precision;
    precision = tmp;
  }
  type = type.substr(0, 1).toLowerCase(); // just the first character
  let frac = 0;
  if (type == 'f') { frac = -8; type = 'b'; }
  const base = (type == 'b' ? 1024 : 1000);
  let sizes = 'y,z,a,f,p,n,\u03bc,m,,k,M,G,T,P,E,Z,Y'.split(','); // U+03bc = mu
  if (type == 'e') { sizes[9] = 'K'; sizes[11] = 'B'; }
  let power = Math.floor(Math.log(num) / Math.log(base));
  num /= base**power;
  if (frac <= power && power <= 8) {
    power += 8;
    return sign + num.toPrecision(precision) + sizes[power];
  }
  return sign + num.toExponential(precision);
}	// end nf.round_units()	}}}


// Convert seconds to colon-delimited time string (Y:D:HH:MM:SS.SSS, e.g. 4:20)
// Usage: nf.sec2time(number seconds[, boolean units]) -> string	{{{
// (See nf.sec2units below for what happens when `units` is defined)
nf.sec2time = (seconds = 0, units = undefined) => {
  const y = 31536000, d = 86400, h = 3600, m = 60;
  let years, days, hours, minutes;
  seconds -= y * ( years   = Math.floor(seconds / y) );
  seconds -= d * ( days    = Math.floor(seconds / d) );
  seconds -= h * ( hours   = Math.floor(seconds / h) );
  seconds -= m * ( minutes = Math.floor(seconds / m) );
  seconds = years + "y "
          + days + "d "
          + String(hours).padStart(2, "0") + "h "
          + String(minutes).padStart(2, "0") + "m "
          + String(seconds.toFixed(3)).padStart(6, "0");	// %06.3f
  // strip leading zeros & trailing zeros down to M:SS, 0:0:00:00:00.00 -> 0:00
  seconds = seconds.replace(/^[0ydh ]+|\.?0+$/g, "");
  if (units == undefined) { return seconds.replace(/[ydhm] /g, ":"); }
  return seconds.replace(/ 0(?=[0-9])/g, "") + "s";
}	// end nf.sec2time()	}}}

// Convert seconds to unit-based time string (Yy Dd Hh Mm S.SSSs, e.g. 3d 16m)
// Usage: nf.sec2units(number seconds) -> string	{{{
nf.sec2units = (seconds = 0) => {
  return nf.sec2time(seconds, 1);
}	// end nf.sec2units()	}}}

// Convert colon-delimited time string (Y:D:H:M:S) to seconds
// Usage: nf.time2sec(string time) -> number	{{{
nf.time2sec = time => {
  const parts = time.split(":").reverse();
  let seconds = 0;
  if (parts.length > 5) { return undefined; }	// too many parts!
  if (parts.length == 5) { seconds += y * parts[4]; }
  if (parts.length >= 4) { seconds += d * parts[3]; }
  if (parts.length >= 3) { seconds += h * parts[2]; }
  if (parts.length >= 2) { seconds += m * parts[1]; }
  return seconds + parts[0] * 1;
}	// end nf.time2sec()	}}}

// Convert unit-based time (Yy Dd Hh Mm S.SSSs, e.g. 3d 16m) to seconds
// Usage: nf.units2sec(string time) -> number	{{{
nf.units2sec = time => {
  const y = 31536000, mo = 2628000, d = 86400, h = 3600, m = 60;

  const num = `-? [0-9]+ (?: \\. [0-9]* )? (?: e [+-]?[0-9]+ )?`;
  const parts = time.match(nf.regex(	// spelled, like 1h 23m 45s
  ` ^
    (?: (?<years>   ${num} ) \\s* y (?: (?: ea )? r s? )?	,? \\s* )?
    (?: (?<months>  ${num} ) \\s* mo (?: nth )? s?		,? \\s* )?
    (?: (?<weeks>   ${num} ) \\s* w (?: (?: ee )? k s? )?	,? \\s* )?
    (?: (?<days>    ${num} ) \\s* d (?: ays? )? 		,? \\s* )?
    (?: (?<hours>   ${num} ) \\s* h (?: (?: ou )? rs? )?	,? \\s* )?
    (?: (?<minutes> ${num} ) \\s* m (?: in (?: ute )? s? )?	,? \\s* )?
    (?: (?<seconds> ${num} ) \\s* (?: s (?: ec (?: ond )? s? )? \\b | $ ) )?
    \\s* $
  `, "xi"));
  if (parts == null) { return undefined; }

  return (parts.groups.years	?? 0) * 31536000	// 1y = 365.00d
       + (parts.groups.months	?? 0) * 2628000 	// 1mo = y/12 = 30.417d
       + (parts.groups.weeks	?? 0) * 604800  	// 1w = 7*d
       + (parts.groups.days 	?? 0) * 86400		// 1d = 24*h
       + (parts.groups.hours	?? 0) * 3600
       + (parts.groups.minutes	?? 0) * 60
       + (parts.groups.seconds	?? 0) * 1;
}	// end nf.units2sec()	}}}

// Convert various time formats to either seconds or colon-delimited time string
// Usage: nf.timecalc(string|number time) -> number | string	{{{
nf.timecalc = time => {

  // number -> colon-delimited, e.g. 12345 -> "20:34"
  if (!isNaN(time) && !isNaN(parseFloat(time))) { return nf.sec2time(time); }

  // colon-delimited -> number, e.g. "20:34" -> 12345
  if (time.match(/^[0-9.]*:[0-9.:]*$/)) { return nf.time2sec(time); }

  // unit-marked -> number, e.g. "20m 34s" -> 12345
  return nf.units2sec(time);

};	// end nf.timecalc()	}}}


// Fast non-cryptographic checksum hasher (Fowler-Noll-Vo)
// Usage: nf.hash(string str) -> number 	{{{
// Fowler-Noll-Vo (FNV-1a) is a FAST simple non-cryptographic hashing function.
// https://en.wikipedia.org/wiki/Fowler-Noll-Vo_hash_function
// See https://stackoverflow.com/a/22429679/519360 and especially its comments.
// DO NOT USE FOR SECURE COLLISION-RESISTANT CODE (e.g. password hashing).
nf.hash = (str, seed = 0x811c9dc5) => {
  if (typeof str != "string") {
    if (typeof str.toString == "function") { str = str.toString(); }
    else throw new TypeError("Could not convert input to a string");
  }
  for (let i = 0, len = str.length; i < len; i++) {
    seed ^= str.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193);
  }
  return seed >>> 0;
}	// end nf.hash()	}}}

// Fast non-cryptographic checksum hasher (Fowler-Noll-Vo) as hex string
// Usage: nf.hash_hex(string str) -> string 	{{{
nf.hash_hex = (str, seed) => {
  return nf.hash(str, seed).toString(16);
}	// end nf.hash_hex()	}}}


// Count the direct ("own") keys of an object or else return undefined
// Usage: nf.objKeys(object obj) -> number|undefined	{{{
// via https://stackoverflow.com/a/32108184/519360, adapted to count
nf.objKeys = obj => {
  if (obj == null || typeof obj != "object") return undefined;
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype) return undefined;
  let n = 0;
  for (const o in obj) { if (Object.hasOwn(obj, o)) n++ }
  return n
}	// end nf.objKeys()	}}}
// Determine if something is an empty object  (obj == {}) does NOT work)
// Usage: nf.objEmpty(object obj) -> boolean	{{{
nf.objEmpty = obj => { return nf.objKeys(obj) == 0 }
// end of nf.objEmpty() }}}

// Simple sleep function, either async or else wrapping a function
// Usage: nf.sleep(number ms[, function action[, * args...]]) -> Promise | undefined	{{{
// invoked as either:   await nf.sleep(time);  // only in async functions
//                or:   function foo() {...}; nf.sleep(time, foo);
nf.sleep = (ms, action, ...args) => {
  if (typeof action == 'function') { return setTimeout(action, ms, ...arg); }
  return new Promise(what => setTimeout(what, ms));
}	// end nf.sleep()	}}}
