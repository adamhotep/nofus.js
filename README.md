## NOminal Functions for UserScripts

Nofus is a very small JavaScript library providing utility functions designed to be used in UserScripts.

Its functions all reside inside the `nf` object, though a few have "aliases" that exist on their own for easy access. One can be "installed" into Node.prototype.

## Functions

### nf.compareVersions
Compare two version strings.

Usage: `nf.compareVersions(string versionA, string versionB, [string cmp])`

* versionA: The first version string to compare, e.g. `2.10.8`
* versionB: The first version string to compare, e.g. `2.8.10`
* cmp: The (optional) comparison operator
  * `>` is default
  * Also supports `>=`, `==`, `!=`, `<=`, and `<`
* Returns a boolean

### nf.\_log

Provide console output if its type exceeds `nf.logLevel`. Includes various types, a time stamp, an optional logo, and of course the log message and objects it may reference.

Usage: `nf._log(string type, string message, [* substitution…])`

* type: The type of log. One of `debug`, `assert`, `log`, `info`, `warn`, `error`
* message: A message to pass to `console[type]`
* substitution: Optional item(s) referred to by the message; see [Using string substitutions](https://developer.mozilla.org/en-US/docs/Web/API/console#using_string_substitutions)
* `nf.logLogo`: this value can be set to some CSS that includes your logo, such as:
```css
background:0/1em url("…") no-repeat; padding-left:3ex
```
* There are also convenience functions: `nf.debug()`, `nf.assert()`, `nf.log()`, `nf.info()`, `nf.warn()`, and `nf.error()` each have the same syntax as `console.log()` or as `nf._log()` without the first argument


### nf.GM.getMetas

Get UserScript metadata for a given key with an optional regex to filter the hits.

Usage: `nf.GM.getMetas(string key, [RegExp matcher])`

* key: The UserScript meta block key (without the `@`), e.g. `include`
* matcher: An optional regular expression values must match
* Returns either an array of strings or else null


### nf.GM.getMeta

Get the first matching UserScript metadata for a given key with an optional regex to filter the hits.

Usage: `nf.GM.getMeta(string key, [RegExp matcher])`

* key: The UserScript meta block key (without the `@`), e.g. `include`
* matcher: An optional regular expression values must match
  * Unlike `nf.GM.getMetas()`, match groups are returned
* Returns either a string or else `undefined`


### nf.query$
### q$

Get HTML element(s) matched by a given CSS selector.

Usage: `nf.query$(string css, [HTMLElement scope], [boolean list])`

* css: A CSS selector like `a` or even `article > a[href^="http://example.com/"]`
* scope: An optional HTML element (or document) to limit the search to (defaults to `document`)
* list: An optional boolean to denote this requests a list of all results rather than just the first (defaults to `false`)
* Returns either an HTMLElement or an array of HTMLElements depending on `list`

This wraps `document.querySelector`, `document.querySelectorAll`, `element.querySelector`, and `element.querySelectorAll`.


### nf.wait$
### w$

Wait for HTML elements matching given CSS selector, then run the given function on them.

Usage: `nf.wait$(string css, function action, [HTMLElement scope], [object options])`

* css: A CSS selector like `a` or even `article > a[href^="http://example.com/"]`
* action: A function to be run on matching elements as they appear
* scope: An optional HTML element (or document) to limit the search to (defaults to `document`)
* options: MutationObserver observe() function [options](https://developer.mozilla.org/docs/Web/API/MutationObserver/observe#options), plus one just for us.
  * `now`: Trigger upon setting this up (on by default)
  * `childList`: Trigger on changes to the scope's child element list (on by default)
  * `subtree`: Trigger on changes to the scope's subtree (on by default)
  * `attributes`: Trigger on changes to attributes within the scope (on by default)
* Returns the MutationObserver object so you can do `w = nf.wait$(…)` and then disable it later with `w.disconnect()`


### nf.style$

Add to or else make and insert a new CSS `<style>` element

Usage: `nf.style$(string css, [HTMLDocument|HTMLStyleElement where])`

* css: The stylesheet content to add
* where: Either an existing `<style>` element or else an HTML document (default = `document`)
* Returns the HTMLStyleElement


### nf.$html
### $html

Make an HTML node with attributes and children.

Usage: `nf.$html(string nodeName, [object attributes] …)`
Usage: `nf.$html(object attributes …)`

* nodeName: The tag name of the HTML element to create
* attributes: A quick way to define attributes as an object, e.g. `{href: "http://example.com", class: "external"}`
  * These are actually JavaScript object keys, not HTML elements
  * If these contain `nodeName` then you don't need to specify it elsewhere
  * Special case: we convert `class` to JavaScript's `className`
* Returns the HTMLElement node


### nf.$text
### $txt

Make a text fragment

Usage: `nf.$text(string text)`

* text: The content of the element to create
* Returns a Text node

This wraps `document.createTextNode`.


### nf.insertAfter

Insert given element after reference element, like ref.insertBefore(…)

Usage: `nf.insertAfter(HTMLElement add, HTMLElement ref)`

* add: The element to add
* ref: The element to add it after
* Returns the added element (`add`)


### nf.installInsertAfter

Install `nf.insertAfter` as `Node.prototype.insertAfter`.

Usage: `nf.installInsertAfter()`

* After running, you can use `elem.insertAfter()` just like you use `elem.insertBefore()`


### nf.regex

Create regular expressions more legibly. Supports Perl's `x` and `xx` modifiers, allowing white space and comments for legibility and documentation.

Usage: `nf.regex(string pattern, [string flags])`

* pattern: A string to convert to a regular expression — remember to escape all backslashes!
* flags: A string of regex flags, including two new flags `x` and `xx`
  When given the `x` flag, comments and spaces are removed:
  * An unescaped `#` and everything after it on the line is removed as a comment
  * Unescaped white space is removed as well
  * Things are a little different in bracketed character classes:
    * `#` is always literal
    * `\n` is always literal
    * The `x` flag retains other spaces while `xx` removes them
  * For now, you can put spaces in meta-patterns like `(? i:text)`, though this is hard to read and therefore not recommended, and this functionality may change to be more like Perl in the future
* Returns a RegExp object

This wraps the `RegExp` constructor.


### nf.sprintf

A nearly-complete C-style sprintf implementation.

Usage: `nf.sprintf(string template, [* substitution…])`

* template: A string with percent encodings to be substituted with subsequent arguments
* substitution: A value to be interpreted by the corresponding percent encoding in the template
* [Perl's sprintf documentation](https://perldoc.perl.org/functions/sprintf) is particularly good
* Returns a string


### nf.round

Round a number to a given precision (or else 0, round to an integer).

Usage: `nf.round(number num, [integer precision])`

* num: A number
* precision: An integer representing how many decimals to round to
* Returns a number


### nf.round\_units

Round to size units.

Usage: `nf.round_units(number num, [number precision], [string type])`

* num: A number
* precision: An integer representing how many decimals to round to
* type: The type of units to use. One of:
  * `English`: uses capital `K` for thousands and `B` for billions
  * `Metric`: uses lowercase `k` for thousands and `G` for giga (billions)
  * `Fractional`: metric including fractional units (`m` for thousandths)
  * `Bytes`: metric but in blocks of 1024 rather than 1000
* Returns a string


### nf.sec2time

Convert seconds to colon-delimited time string (Y:D:HH"MM"SS.SSS, e.g. 4:20).

Usage: `nf.sec2time(number seconds, [boolean units])`

* seconds: a number of seconds
* units: whether to display time with colons or with words (optional)
* Returns a string


### nf.sec2units

Convert seconds to unit-based tie string (Yy Dd Hh Mm S.SSSs, e.g. 3d 16m).

Usage: `nf.sec2units(number seconds)`

* seconds: A number of seconds
* Returns a string


### nf.time2sec

Convert colon-delimited time string (Y:D:H:M:S) to seconds.

Usage: `nf.time2sec(string time)`

* time: A colon-delimited string of numbers
* Returns a number


### nf.units2sec

Convert unit-based time (Yy Dd Hh Mm S.SSSs, e.g. 3d 16m) to seconds.

Usage: `nf.units2sec(string time)`

* time: A space-delimited string of numbers with units. Commas are also okay
* Units include `y`, `mo`, `w`, `d`, `h`, `m`, `s` and some longer forms, including full words
* This does not account for leap years (1y = 365.00d) since it doesn't know the relevant year
* Returns a number


### nf.timecalc

Convert various time formats to either seconds or a colon-delimited time string.

Usage: `nf.timecalc(string|number time)`

* time: A string representing units or colon-delimited numbers or else a number of seconds
* Returns either a number or a string


### nf.hash

Fast non-cryptographic checksum hasher using Fowler-Noll-Vo.

Usage: `nf.hash(string str)`

* str: A string (or object with a .toString() method) to hash
* seed: The seed to hash with (changing this from the default is not advised)
* **Do not use for secure collision-resistant code!**
* Returns a number


### nf.hash\_hex

Fast non-cryptographic checksum hasher using Fowler-Noll-Vo with hexadecimal output.

Usage: `nf.hash_hex(string str)`

* str: A string (or object with a .toString() method) to hash
* seed: The seed to hash with (changing this from the default is not advised)
* **Do not use for secure collision-resistant code!**
* Returns a string representing a hexadecimal number


### nf.objKeys

Count the direct ("own") keys of an object.

Usage: `nf.objKeys(object obj)`

* obj: The object whose direct keys we will count
* Returns an integer or else undefined


### nf.objEmpty

Determine if something is an empty object.

Usage: `nf.objEmpty(object obj)`

* obj: The object whose direct keys we will count
* Returns a boolean


### nf.sleep

Simple sleep function, either async or else wrapping a function.

Usage: `nf.sleep(number ms, [function action, [* args…]])`

* ms: A number of milliseconds to wait
* action: A function to run after the wait time (if missing, run asynchronously)
* args: The arguments to pass to the action function
* Returns either a Promise or else undefined


