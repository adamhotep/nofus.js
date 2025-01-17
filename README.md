## NOminal Functions for UserScripts

Nofus is a very small JavaScript library providing utility functions designed to be used in UserScripts.

Its functions all reside inside the `nf` object, though a few have "aliases" as noted [below](#Aliases).
Items outside the `nf` object can be "installed", including one that embeds within `Node.prototype` (which is not installed by default).


## Aliases

Convenience aliases (shorthand functions outside the `nf` object) are also loaded by default. Search this page for `alias` or see the key below.

### nf.alias

This is an object whose keys enumerate the Nofus aliases, such as `w$`, which maps to `nf.wait$`. This object is not meant to be manipulated.

### nf_config.alias

If this is set *before* loading `nofus.js` and its value evaluates to false, the aliases will not be loaded. See `nf.installAliases` below.


## Functions

### nf.compareVersions
Compare two version strings.

Usage: `nf.compareVersions(versionA, versionB, [cmp])`

* versionA (string): The first version string to compare, e.g. `2.10.8`
* versionB (string): The first version string to compare, e.g. `2.8.10`
* cmp (string): The (optional) comparison operator
  * `>` is default
  * Also supports `>=`, `==`, `!=`, `<=`, and `<`
* Returns a boolean


### nf.log

Convenience wrappers for `console.log` and friends gated by whether it exceeds `nf.logLevel`. Includes a time stamp, an optional logo, and of course the log message and objects it may reference.

Usage: `nf.log(message, [substitution…])`

* log (string): The type of log. One of `debug`, `assert`, `log`, `info`, `warn`, `error`
* message (string): A message to pass to `console[log]`
* substitution (any): Optional item(s) referred to by the message; see [Using string substitutions](https://developer.mozilla.org/en-US/docs/Web/API/console#using_string_substitutions)

#### nf.logLevel

The level at which logs appear in the console.

Usage: `nf_config.logLevel = level`	*// run before loading nofus.js*\
Usage: `localStorage.setItem('nf_logLevel', level)`	*// persists per domain*\
Usage: `nf.setLogLevel(level …)`	*// details below*

* level (string): One of `trace`, `debug`, `log`, `info`, `warn`, or `error`
* Levels before the specified level in the above list are suppressed
* For example, `nf.log("test")` will not show up given `nf.logLevel == "info"`
* If `nf_config.logLevel` or `localStorage.nf_logLevel` are set, the lower is used
* This otherwise defaults to `info`

#### nf.setLogLevel

Sets `nf.logLevel` to the lowest given valid level.

Usage: `nf.setLogLevel(level …)`

* level (string): One or more of `trace`, `debug`, `log`, `info`, `warn`, or `error`
* Returns a boolean representing whether the level was set (though it may not have changed)

#### nf.logLogo

Add CSS to all `nf.log` and related messages that can include your logo.

Usage: ``nf.logLogo = `background:0/1em url("${logo_url}") no-repeat; padding-left:3ex` ``

#### nf.trace
#### nf.debug
#### nf.info
#### nf.warn
#### nf.error

See [`nf.log`](#nf.log) above


### nf.GM.getMetas

Get UserScript metadata for a given key with an optional regex to filter the hits.

Usage: `nf.GM.getMetas(key, [matcher])`

* key (string): The UserScript meta block key (without the `@`), e.g. `include`
* matcher (RegExp): An optional regular expression values must match
* Requires `@grant GM.info` and/or `@grant GM_info` in your userscript metadata
* Returns either an array of strings or else null


### nf.GM.getMeta

Get the first matching UserScript metadata for a given key with an optional regex to filter the hits.

Usage: `nf.GM.getMeta(key, [matcher])`

* key (string): The UserScript meta block key (without the `@`), e.g. `include`
* matcher (RegExp): An optional regular expression values must match
  * Unlike `nf.GM.getMetas()`, match groups are returned
* Requires `@grant GM.info` and/or `@grant GM_info` in your userscript metadata
* Returns either a string or else `undefined`


### nf.query$

Get HTML element(s) matched by a given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors).

Usage: `nf.query$(css, [scope], [all])`

* css (string): A [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors) like `a` or even `article > a[href^="http://example.com/"]`
* scope (HTMLElement): An optional HTML element (or document) to limit the search to (defaults to `document`)
* all (boolean): An optional boolean to denote this requests a list of all results rather than just the first (defaults to `false`)
* Returns either an HTMLElement or an array of HTMLElements depending on `all`

This wraps `document.querySelector`, `document.querySelectorAll`, `element.querySelector`, and `element.querySelectorAll`.

#### nf.queryAll$

`nf.queryAll$` and `qa$` simply run with `all = true`.

#### q$
#### qa$

(aliases for the above)


### nf.wait$

Wait for HTML elements matching given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors), then run the given function on them.

Usage: `nf.wait$(css, action, [scope], [options])`

* css (string): A [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors) like `a` or even `article > a[href^="http://example.com/"]`
* action (function): A function to be run on matching elements as they appear
* scope (HTMLElement): An optional HTML element (or document) to limit the search to (defaults to `document`)
* options (object): MutationObserver observe() function [options](https://developer.mozilla.org/docs/Web/API/MutationObserver/observe#options), plus one just for us.
  * `now`: Trigger upon setting this up (on by default)
  * `childList`: Trigger on changes to the scope's child element list (on by default)
  * `subtree`: Trigger on changes to the scope's subtree (on by default)
  * `attributes`: Trigger on changes to attributes within the scope (on by default)
* Returns the MutationObserver object so you can do `w = nf.wait$(…)` and then optionally disable it later with `w.disconnect()`

#### w$

(alias for `nf.wait$`)

### nf.style$

Add to or else make and insert a new CSS `<style>` element

Usage: `nf.style$(css, [where])`

* css (string): The stylesheet content to add
* where (HTMLDocument|HTMLStyleElement): Either an HTML document or else an existing `<style>` element (default = `document`)
* Returns the HTMLStyleElement


### nf.$html

Make an HTML node with attributes and children.

Usage: `nf.$html(nodeName, [attributes], [child] …)`
Usage: `nf.$html(object attributes …)`

* nodeName (string): The tag name of the HTML element to create
* attributes (object): A quick way to define attributes as an object, e.g. `{href: "http://example.com", class: "external"}`. These are HTML attributes except:
  * `nodeName` sets the element name (and alleviates the need for the nodeName argument) and is not an attribute
  * `text` & `textContent` set content (with both, `text` is an attribute)
  * `className` sets `class` (with both, both are attributes)
  * `value` sets the Javascript value, not the HTML attribute
  * accepts `dataset.fooBar` as `data-foo-bar`
* child (Node): A DOM element (probably HTMLElement or Text) to append to the new HTML node
* Returns the HTMLElement node

#### $html

(alias for `nf.$html`)


### nf.$text

Make a text fragment

Usage: `nf.$text(text)`

* text (string): The content of the element to create
* Returns a Text node

This wraps `document.createTextNode`.

#### $txt

(alias for `nf.$txt`)


### nf.insertAfter

Insert given element after reference element, like ref.insertBefore(…)

Usage: `nf.insertAfter(add, ref)`

* add (HTMLElement): The element to add
* ref (HTMLElement): The element to add it after
* Returns the added element (`add`)


### nf.installInsertAfter

Install `nf.insertAfter` as `Node.prototype.insertAfter`.

Usage: `nf.installInsertAfter()`

* After running, you can use `elem.insertAfter()` just like you use `elem.insertBefore()`


### nf.regex

Create regular expressions more legibly. Supports Perl's `x` and `xx` modifiers, allowing white space and comments for legibility and documentation.

Usage: `nf.regex(pattern, [flags])`

* pattern (string): A string to convert to a regular expression — remember to escape all backslashes!
* flags (string): A string of regex flags, including two new flags `x` and `xx`
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

#### nf.regExp

(alias for `nf.regex`)


### nf.split

Split the given string into an array. By default, this defaults to using spacing as a separator. Leading/trailing separators will not create empty string members. Inspired by AWK's `split` and Perl's `qw`.

Usage: `nf.split(str, [sep], [limit])`

* str (string): A string to split into the array
* sep (RegEx|string): The separator pattern to split with (optional, defaults to matching space characters)
* limit (number): an optional maximum count of items in the array to create. If hit, remaining content is not split
* Returns an array

This is a wrapper for `Array.prototype.split()`.

#### qw

(alias for `nf.split` named after Perl's `qw` function)

### nf.sprintf

A nearly-complete C-style sprintf implementation.

Usage: `nf.sprintf(template, [substitution…])`

* template (string): A string with percent encodings to be substituted with subsequent arguments
* substitution (any): A value to be interpreted by the corresponding percent encoding in the template
* [Perl's sprintf documentation](https://perldoc.perl.org/functions/sprintf) is particularly good
* Returns a string


### nf.roundh

Round a number human-readable units (English or metric or binary/bytes)

Usage: `nf.round(num, [width], [type])`

* num (number): A number
* width (number): An integer representing how many decimals to round to (excluding the decimal point)
* type (string): One of:
  * `English`: Uses capital `K` for thousands and `B` for billions
  * `Metric`: Uses lowercase `k` for thousands and `G` for giga (billions)
  * `Fractional`: Metric including fractional units (`m` for thousandths)
  * `Bytes`: Metric but in blocks of 1024 rather than 1000
* Returns a string


### nf.sec2time

Convert seconds to colon-delimited time string (Y:D:HH"MM"SS.SSS, e.g. 4:20).

Usage: `nf.sec2time(seconds, [units])`

* seconds (number): A number of seconds
* units (boolean): Whether to display time with colons or with words (optional)
* Returns a string


### nf.sec2units

Convert seconds to unit-based time string (`Yy Dd Hh Mm S.SSSs`, e.g. `3d 14m`).

Usage: `nf.sec2units(seconds)`

* seconds (number): A number of seconds
* Returns a string


### nf.time2sec

Convert colon-delimited time string (Y:D:H:M:S) to seconds.

Usage: `nf.time2sec(time)`

* time (string): A colon-delimited string of numbers
* Returns a number


### nf.units2sec

Convert unit-based time (`Yy Dd Hh Mm S.SSSs`, e.g. `3d 14m`) to seconds.

Usage: `nf.units2sec(time)`

* time (string): A string of numbers with units delimited by spaces or commas
* Units include `y`, `mo`, `w`, `d`, `h`, `m`, `s` and some longer forms, including full words
* This does not account for leap years (1y = 365.00d) since it doesn't know the relevant year
* Returns a number


### nf.timecalc

Convert various time formats to either seconds or a colon-delimited time string.

Usage: `nf.timecalc(time)`

* time (string or number): A string representing units or colon-delimited numbers or else a number of seconds
* Returns either a number or a string


### nf.stringify

Convert pretty much anything to a string

Usage: `nf.stringify(obj)`

* obj (any): The item to convert into a string
* Returns a string


### nf.hash

Fast non-cryptographic checksum hasher using [Fowler-Noll-Vo](https://en.wikipedia.org/wiki/Fowler-Noll-Vo_hash_function).

Usage: `nf.hash(str, [radix], [seed])`

* str (string): A string (or anything `nf.stringify` can handle) to hash
* radix (number): An integer between 2 and 36 for the output format
* seed (number): The seed to hash with (changing this from the default is not advised)
* **Do not use for secure collision-resistant code!**
* Returns a number or a string representing a radix other than 10


#### nf.hash\_hex

Fast non-cryptographic checksum hasher using Fowler-Noll-Vo with hexadecimal output.

Usage: `nf.hash_hex(str, [seed])`

See `nf.hash` above. This simply sets the radix to 16.


### nf.color2hex

Convert a CSS color into a string for #RRGGBB[AA] or an array for (r, g, b, [a])

Usage: `nf.color2hex(color, [format])`

* color (string): A string representing a CSS [color value](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
* format (string): One of:
  * `hex`: Returns a string of the given color's hexadecimal code (default)
  * `rgb`: Returns an array of red, green, blue (all 0-255), and alpha (0-1)
  * `srgb`: Returns an array of red, green, blue, and alpha (all 0-1)
* Returns either a string or an array of numbers


### nf.objKeys

Count the direct ("own") keys of an object.

Usage: `nf.objKeys(obj)`

* obj (object): The object whose direct keys we will count
* Returns an integer or else undefined


### nf.objEmpty

Determine if something is an empty object.

Usage: `nf.objEmpty(obj)`

* obj (object): The object whose direct keys we will count
* Returns a boolean


### nf.sleep

Simple sleep function, either async or else wrapping a function.

Usage: `nf.sleep(ms, [action, [args…]])`

* ms (number): How many milliseconds to wait
* action (function): A function to run after the wait time (if missing, run asynchronously)
* args (any): The arguments to pass to the action function
* Returns either a Promise or else undefined


### nf.installAliases

Install all aliases.

Usage: `nf.installAliases()`


### nf.uninstallAliases

Remove all aliases.

Usage: `nf.uninstallAliases()`


## Functions from nf.dialog

As a plugin to Nofus, all functions have an `.origin` that states where they come from. For example, you can evaluate `nf.movable.origin` to see that it comes from `nf.dialog`.


### nf.dialog

The class for Nofus Dialog.


#### constructor

Create, embed, and optionally display a dialog.

Usage: `new nf.dialog([title], [attributes])`

* title (string): The title of the dialog window (defaults to the current host)
* attributes (object):
  * backdropClose (boolean): Whether clicking outside the dialog closes it (default = true)
  * id (string): The `id` of the root HTMLDialogElement
  * open (boolean): Open upon creation (default = true)
  * recenter (boolean): Center the dialog on each open (default = true)
  * resetCSS (boolean): Do not inherit CSS from outside the dialog (default = true)
* Returns an nf.dialog


#### .title

(Optionally set and) return the dialog title.

Usage: `.title([title])`

* title (string|HTMLElement): The title
* Returns the title


#### .setColors

Set the dialog's primary background and foreground colors.

Usage: `.setColors(string background, [string background2], [string foreground])`

* background (string): The background [color_value](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
* background2 (string): A background accent color_value (defaults to a darker or lighter version of background)
* foreground (string): The text color_value (defaults to white given a darker background or black given a lighter background)
* Returns undefined


#### .getColor

Get one of the dialog's colors.

Usage: `.getColor(which)`

* which (string): One of `foreground`, `background`, `background2`, or shorthand variants of those, `fg`, `bg`, or `bg2`
* Returns a string containing the value (see also `nf.color2hex` above)


#### .close

Close the dialog.

Usage: `.close()`


#### .open

Open the dialog, optionally repositioning it in the center of the screen

Usage: `.close([recenter])`

* recenter (boolean): Whether or not to reposition; defaults to the option set when creating the dialog


#### .tab

Add a tab to the dialog with given name and zero or more children.

Usage: `.tab([title], [content…])`

* title (string): The text to put on the tab itself
* content (string|HTMLElement|Text): Zero or more items to become children of the tab body
* Returns the created tab's body, which notably has some extra features:
  * `body.tab`: The HTMLLabelElement holding the tab itself
  * `body.focus()`: Switch to the tab


#### .append

Append one or more elements or text (as paragraphs) to the dialog body.

Usage: `.append([item…])`

* item (string|HTMLElement|Text): Zero or more items to append to the dialog body
* Returns the last item that was added


### nf.getStyleNum

The numeric portion of the given element's computed value for the given style.

Usage: `nf.getStyleNum(elem, style)`

* elem (HTMLElement): The element to examine
* style (string): The style to compute
* Returns a string representing the computed style value


### nf.movable

Make the given element movable either by itself or else a child element

Usage: `nf.movable(elem, [handle])`

* elem (HTMLElement): The element to make movable
* handle (HTMLElement): An optional child of the element to control movement (like a window's title bar)


