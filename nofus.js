/* nofus.js (NOminal Functions for UserScripts), a very small JS library.
 * THIS IS NOT jQUERY. It will always be under 1k lines / 20kB non-minified.
 * Functions ending in a dollar sign (`$`) mean the first arg is a CSS selector.
 * Functions starting with a dollar sign create DOM objects but don't take CSS.
 *
 * nofus 0.1.20200509, Copyright 2020+ by Adam Katz. Apache License 2.0
 * https://github.com/adamhotep/nofus.js
 */

'use strict';

// All items live in this object, though some are cloned outside it.
nf = {};


// Log if logLevel is sufficient. Includes type, time, logo, string substitution
// Usage: nf.log([string type,] string message[, * substitution...])	{{{
//
// Type is one of debug, assert, log (default), info, warn, error. See also
// https://developer.mozilla.org/en-US/docs/Web/API/console#using_string_substitutions
// Logs are suppressed if below nf.logLevel (see `level` in the function)
//
// The logo is defined by custom CSS in the `nf.logLogo` variable, such as
//     nf.logLogo = `background:0/1em url("...") no-repeat; padding-left:3ex`;
nf.logLevel = 'info';
nf['log'] = function(...args) {
  let level = { debug: 0, assert: 1, log: 2, info: 3, warn: 4, error: 5 };
  let type = "log";  // default
  if (typeof args[0] == "string" && level[args[0]] >= 0) { type = args.shift() }
  if (nf.logLevel < level[type]) { return; }
  if (typeof args[0] == "object") { args.unshift("%o"); }
  args.splice(0, 1, "%c%s\n%c" + args[0], 'font-family:sans-serif', Date(),
    typeof nf.logLogo == "string" ? log_logo : "");

  // NOTE: the console log will cite THIS call's line number,
  // so you might still want console.log() and friends for debugging :-(
  console[type](...args);
}	// end nf.log()	}}}


// Get UserScript metadata for given key (as an array)
// Usage: nf.GM.getMetas(string key) -> string[] | null 	{{{
nf['GM'] = { getMetas: function(key) {
  // Don't forget you need `@grant GM.info` and/or `@grant GM_info`
  // Also note that GM.info/GM_info supports direct querying on some items,
  // see https://wiki.greasespot.net/GM.info
  // and https://www.tampermonkey.net/documentation.php#api:GM_info
  let scriptMetaStr = "";
  if (typeof GM == "object" && GM?.info?.scriptMetaStr) {
    scriptMetaStr = GM.info.scriptMetaStr;
  } else if (typeof GM_info == "object" && GM_info?.scriptMetaStr) {
    scriptMetaStr = GM_info.scriptMetaStr;
  }
  const sp = '[\\x20\\t]', SP = '[^\\x20\\t]';	// like \s but doesn't match \n
  return scriptMetaStr
    .match(RegExp(`(?<=^\\s*//+${sp}*@${key}${sp}+)${SP}.*?(?=\\s*$)`, 'gm'));
} };	// end nf.GM.getMetas() }}}

// Get UserScript metadata for given key (first match only)
// Usage: nf.GM.getMeta(string key) -> string | undefined	{{{
nf['GM'] = { getMeta: function(key) {
  let value = nf.GM.getMetas(key);
  if (value) { return value[0]; }
  return undefined;
}	// end nf.GM.getMeta() }}}


// Returns object(s) matched as queried via CSS
// Usage: nf.query$(string css[, HTMLElement parent][, boolean list]) -> HTMLElement | HTMLElement[]	{{{
// q$(css)           ->  document.querySelector(css)
// q$(css, elem)     ->  elem.querySelector(css)
// q$(css, true)     ->  document.querySelectorAll(css)
// q$(css, elem, 1)  ->  elem.querySelectorAll(css)
// q$(css, 1, elem)  ->  elem.querySelectorAll(css)
nf['query$'] = function(css, up = document, list = 0) {
  //css = css.replace(/\n\s*/g, " ");	// line breaks confuse querySelector
  if (list === 0 && typeof up != 'object') {
    list = up; up = document;            // invoked as q$(css, list)
  } else if (typeof list.querySelector == 'function' && !!up == up) {
    let tmp = up; up = list; list = tmp;  // invoked as q$(css, list, up)
  }
  if (list) { return up.querySelectorAll(css); }
  else     { return up.querySelector(css); }
}	// end nf.query$()	}}}
const q$ = nf.query$;	// alias


// Wait for HTML elements matching css, run given function on them upon loading
// Usage: nf.wait$(string css, function action)	{{{
// trigger action(element) for each match of css, even when dynamically loaded
nf['wait$'] = function(css, action) {
  if (typeof css != "string" || typeof action != "function") {
    throw new TypeError("Invalid inputs, expected a string and a function.");
  }
  //css = css.replace(/\n\s*/g, " ");	// line breaks confuse querySelector
  const actionMarker = action.name + "%" + nf.hash(css + action.toString());

  const observer = new MutationObserver(() => {
    nf.query$(css, true).forEach(elem => {
      if (elem.nf_found && elem.nf_found[actionMarker]) { return } // been there
      if (!elem.nf_found) { elem.nf_found = {}; }
      elem.nf_found[actionMarker] = true;
      try { action(elem); }
      catch (error) {
        let name = action.name;
        if (name) { name = `in function "${name}"`; }
        console.error(`nf.wait$: action function error ${name}:\n${error}`);
      }
    });
  });

  // TODO: Does this need special parsing for frames & iframes? wfke has it:
  // https://gist.github.com/adamhotep/7c9068f2196326ab79145ae308b68f9e

  observer.observe(document.body,
    { childList:true, subtree:true, attributes:true });

}	// end nf.wait$()	}}}
const w$ = nf.wait$;	// alias


// Add to or else make and install a new CSS <style> element
// Usage: nf.style$(string css[, HTMLDocument|HTMLStyleElement where]) -> HTMLElement	{{{
nf['style$'] = function(css, where = document) {
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
// NOTE: attributes are JavaScript, not HTML:
// * nodeName is actually optional if attributes.nodeName exists
// * The `textContent` attribute will populate text inside the node
nf['$html'] = function(...pairs) {
  let name = typeof pairs[0] == "string" ? pairs.shift() : pairs[0]?.name;
  let elem = document.createElement(name);

  if (typeof pairs[0] == "object") {	// populate attributes
    let attributes = pairs.shift();
    Object.keys(attributes).forEach(key => { elem[key] = attributes[key]; });
  }

  for (let p = 0; p < pairs.length; p++) {
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
nf['$text'](text) {
  return document.createTextNode(text);
}	// end nf.$text()	}}}
const $txt = nf.$text;	// alias


// Take markdown-like text and return a <div> with it rendered as HTML
// Usage: nf.$markdown(string text) -> HTMLElement	{{{
///////////////////////////////////////////////////////////////////////
// WARNING! This is unsafe for unvetted code: it accepts all HTML tags.
///////////////////////////////////////////////////////////////////////
nf['$markdown'] = function(text) {
  let p = "pseudo-markdown";
  if (nf['markdownCSS'] == undefined) {

    // Add stylesheet for our quick-and-dirty <li> nesting trick
    // Order matters here, do not consolidate `ul` and `ul li.in1`
    nf['markdownCSS'] = nf.style$(`
      .${p} ul	{ padding-left:2em; margin-left:0 }
      .${p} li			   { margin-left:2em }
      .${p} ul li		   { margin-left:0 }
      .${p} :is(li.in3, ul li.in4) { margin-left:8em }
      .${p} :is(li.in2, ul li.in3) { margin-left:6em }
      .${p} :is(li.in1, ul li.in2) { margin-left:4em }
      .${p} ul li.in1		   { margin-left:2em }
      .${p} code { border:1px dashed #8988; border-radius:.3ex;
        color:inherit; background-color:#aaa8; padding:0 .3ex; font-size:99% }
    `);
  }

  // Negative lookbehind that ensures we're not escaped.
  // (preceded by zero or AN EVEN NUMBER of backslashes)
  const unescaped = `(?<= (?<! \\\\ ) (?: \\\\{2} )* )`;

  let div = nf.$html("div", { class: p });

  // Remember HTML is lazy. <li> tags don't need endings.
  // The </p> from two newlines should terminate stray <li> tags.
  div.innerHTML = '<p>' + text
    .replace(/^#[\x20\t](.*)/mg,		'<h1>$1</h1>')
    .replace(/^##[\x20\t](.*)/mg,		'<h2>$1</h2>')
    .replace(/^###[\x20\t](.*)/mg,		'<h3>$1</h3>')
    .replace(/^####[\x20\t](.*)/mg,		'<h4>$1</h4>')
    .replace(/^ ?\*[\x20\t]/mg, 		'<li>')
    .replace(/^ ?(?:  |\t)\*[\x20\t]/mg,	'<li class="in1">')
    .replace(/^ ?(?:  |\t){2}\*[\x20\t]/mg,	'<li class="in2">')
    .replace(/^ ?(?:  |\t){3}\*[\x20\t]/mg,	'<li class="in3">')
    .replace(/^ ?(?:  |\t){4}\*[\x20\t]/mg,	'<li class="in4">')

    // bold, italics, code
    .replace(/(\x60+)([^\r\n]*)\1/g, '<code>$2</code>')
  /*	TODO: smarter handling of bold/italics. This is a work in progress: {{{
    .replace(nf.regex(`
      (?<! \\* )	# not preceded by another asterisk
      ${unescaped}	# not preceded by an odd number of backslashes
      ( \\*+ )		# any count of asterisks -- we'll save this
      (?=
        (?<=			# preceded by:
          (?: ^ | [ \\s \\x28 ] )	# start or space or open parens
          \\1				# the asterisks we just matched
        )
        [^*]				# then any non-asterisk
      |				# or else
        [ \\w \\x22 \\x28 ]		# word char, dquote, or open parens
      )
      (
        [^ * \\ ]*		# any chars except asterisk and backslash
        (?: \\ . [^ \\ ]* )*	# backslashed characters are escaped
      )
  }}} */
    .replace(/((?:\*\*)+\b|(?<=^|\s)(?:\*\*)+)([^*\r\n]+)(?:\b\1|\1(?!\S))/g,
      '<b>$2</b>')
    .replace(/(?:\*\b|(?<=^|\s)\*)([^*\r\n]+)(?:\b\*|\*(?!\S))/g, '<i>$1</i>')
    .replace(/(_+\B|(?<=\s)_+)([^_\r\n]+)(?:\B\1|\1(?!\S))/g, '<em>$2</em>')

    // links and images
    .replace(nf.regex(`
        ${unescaped}
        ( !? )			# image?
        \\[
          ( [^\\r\\n]+? )	# text
        \\]
        \\(
          ( [^\\s\\x22]+ )	# target
          (?: [\\x20\\t]+ \\x22
            ( [^\\r\\n\\x22]* )	# title
          \\x22 )? [\\x20\t]*
        \\)
      `, "xg"),
      function(all, img, text, target, title = "") {
        if (title) { title = ` title="${title}"`; }
        if (img) {
          return /* syn=html */ `<img src="${target}" alt="${
            text.replace(/(?<=[\s(])\x22|\x22\b/g, '\u201c')
                .replace(/\x22/g, '\u201d')
          )}"${title}>`;
        }
        return /* syn=html */ `<a href="${target}"${
          title}>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</a>`;
      })
    .replace(/(?<=[^>])\n\n/g, '</p><p>')	// Two linebreaks = paragraph

    // unescaped backslash ending a line -> <br>
    .replace(np.regex(`${unescaped} \\\\ $`, 'xm'), '<br>\n')
    .replace(/\\\\/g, "\\")	// backslash pairs -> singles (MUST BE LAST)
  + '</p>';

  return div;
}	// end of nf.$markdown()	}}}


// Insert given element after reference element, like ref.insertBefore(...)
// Usage: nf.insertAfter(HTMLElement add, HTMLElement ref) -> add	{{{
nf['insertAfter'] = function(add, ref) {
  return ref.parentElement.insertBefore(add, ref.nextSibling);
}	// end nf.insertAfter()	}}}

// Install as Node.prototype.insertAfter() when invoked
// Usage: nf.installInsertAfter() -> void	{{{
nf['installInsertAfter'] = function() {
  // push that right into the Node prototype
  if (typeof Node.prototype.insertAfter == 'undefined') {
    Node.prototype.insertAfter = function(add) {
      return nf.insertAfter(add, this);
    }
  }
}	// end nf.installInsertAfter()	}}}


// RegExp() wrapper that accepts perl's `x` flag (purge white space & #comments)
// Usage: nf.regex(string pattern[, string flags]) -> RegExp	{{{
// REMEMBER THAT PATTERN IS A STRING! Double-escapes needed!
nf['regex'] = nf['regExp'] = function(pattern, flags = "") {
  if (flags.includes("x")) {
    flags = flags.replace(/x/g, "");
    pattern = pattern.replace(/((?<!\\)(?:\\\\)*)#.*$|\s+/mg, "$1");
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
nf['sprintf'] = function(template, ...substitutions) {
  let output = template
    .replace(/%%/g, "%\u0018")	// swap escaped escapes (ASCII CAN = "cancel")

    .replace(/%([# 0+-]*)([0-9]*|\*)(?:\.([0-9]*|\*))?([bBcsduoxXeEfFgGi])/g,
      (all, flags, minWidth, prec, type) => {
        // Yes, prec is `undefined` when missing and that works

        if (minWidth == "*") { minWidth  = substitutions.shift(); }
        else if (prec == "*") { prec = substitutions.shift(); }
        if (prec < 0) { prec = 0; }	// negative numbers can be shifted in
        let out = substitutions.shift() + "";
        let ltype = type.toLowerCase();

        if (ltype.match(/[box]/)) { // binary, octal, or hex
          let base = 16;
          let prefix = "0" + type;
          if (ltype == "b") { base = 2 }
          else if (ltype == "o") { base = 8; prefix = ""; }
          out = parseInt(out).toString(base).padStart(prec, "0");
          if (flags.includes("#")) {
            if (ltype == "o" && out.substring(0, 1) != "0") {
             prefix = "0";
            }
            out = prefix + out;
          }
        }

        else if (type == "c") { 	// character from numeric code
          out = String.fromCharCode(out);
        }

        else if (type.match(/[diu]/)) {	// integer
          out = parseInt(out).toString().padStart(prec, "0");
        } else if (ltype == "e") {	// exponential/scientific notation
          out = parseFloat(out).toExponential(prec).replace(/e\+?/, type);
        } else if (ltype == "f") {	// fixed float
          out = parseFloat(out).toFixed(prec);
        } else if (ltype == "g") {	// fixed or scientific by significance
          out = parseFloat(out).toPrecision(prec)
            .replace(/e\+?/, type == "G" ? "E" : "e");
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

    .replace(/%\x18/g, "%");	// swap temporary CAN escape back, MUST BE LAST
}	// end nf.sprintf()	}}}


// Round a number to a given precision (default is 0, an integer)
// Usage: nf.round(number num[, integer decimals]) -> number	{{{
nf['round'] = function(num, decimals = 0) {
  decimals = 10 ** decimals;
  return parseInt(num * decimals + 0.5) / decimals;
}	// end nf.round()	}}}

// Round to units (English or metric or binary/bytes)
// Usage: nf.round_units(number num[, number precision][, string type]) -> String	{{{
// * English uses capital K for thousands and B for billions
// * Metric uses lowercase k for thousands and G for giga (billions)
// * Fractional is metric including fractional units (m for thousandths)
// * Bytes is Metric but in blocks of 1024 rather than 1000
nf['round_units'] = function(num, precision = 3, type = 'english') {
  if (num === 0) return '0';
  let sign = '';
  if (num < 0) { sign = '-'; num *= -1; }
  if (typeof precision == 'string') { // accept swapped order
    let tmp = type;
    type = precision;
    if (typeof tmp == 'number') { precision = tmp; } else { precision = 3; }
  }
  type = type.substr(0, 1).toLowerCase(); // just the first character
  let frac = 0;
  if (type == 'f') { frac = -8; type = 'b'; }
  let base = (type == 'b' ? 1024 : 1000);
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
nf['sec2time'] = function(seconds = 0, units = undefined) {
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
nf['sec2units'] = function(seconds = 0) {
  return nf.sec2time(seconds, 1);
}	// end nf.sec2units()	}}}

// Convert colon-delimited time string (Y:D:H:M:S) to seconds
// Usage: nf.time2sec(string time) -> number	{{{
nf['time2sec'] = function(time) {
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
nf['units2sec'] = function(time) {
  const y = 31536000, mo = 2628000, d = 86400, h = 3600, m = 60;

  const num = `-? [0-9]+ (?: \\. [0-9]* )? (?: e [+-]?[0-9]+ )?`;
  let parts = time.match(nf.regex(	// spelled, like 1h 23m 45s
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
nf['timecalc'] = function(time) {

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
nf['hash'] = function(str, seed = 0x811c9dc5) {
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
nf['hash_hex'] = function(str, seed) {
  return nf.hash(str, seed).toString(16);
}	// end nf.hash_hex()	}}}


// Simple sleep function, either async or else wrapping a function
// Usage: nf.sleep(number milliseconds[, function action[, * args...]]) -> void	{{{
// invoked as either:   await nf.sleep(time);  // only in async functions
//                or:   function foo() {...}; nf.sleep(time, foo);
nf['sleep'] = function(ms, action, ...args) {
  if (typeof action == 'function') { return setTimeout(action, ms, ...arg); }
  return new Promise(what => setTimeout(what, ms));
}	// end nf.sleep()	}}}
