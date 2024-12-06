/* nofus-dialog.js (NOminal Functions for UserScripts: Dialogs).
 *
 * This is a supplemental file that requires nofus.js to be loaded first.
 *
 * Create a simple dialog pop-up
 *
 * Nofus Dialog is copyright 2024+ by Adam Katz. Apache License 2.0
 * https://github.com/adamhotep/nofus.js
 */

'use strict';

// Sanity check: Ensure nofus.js is already loaded {{{
{
  const minimumVersion = '0.5';	// minimum nofus.js version
  if (typeof nf != 'object' || typeof nf.compareVersions != 'function'
  || !nf.compareVersions(nf.version, minimumVersion, '>='))
    throw new ReferenceError(`Load nofus.js version ${minimumVersion}+ first!`);
  if (nf.addon.dialog) throw new Error("Nofus Dialog is already loaded!");
}
// done with sanity check }}}

nf.addon.dialog = { version:'0.1.20241205.0',
  origin:document.currentScript?.src ?? 'nofus-dialog.js' }


// Create, embed, and optionally display a dialog
// new nf.dialog([string title], [object attributes]) -> nf.dialog	{{{
nf.dialog = class {
// Supported attributes:
// * backdropClose (boolean): Click outside the dialog to close (default = true)
// * id (string): The `id` of the this.root dialog element
// * open (boolean): Open the dialog once it is created (default = true)
// * recenter (boolean): Center the dialog each time it opens (default = true)
// * resetCSS (boolean): Reset all CSS for within the dialog (default = true)
  constructor(title, attributes = {}) {
    let root = this.root;
    this.setColors('#000', '#eee', '#bbb');

    if (typeof attributes?.id == 'string') root.id = attributes.id;
    if (attributes.recenter != undefined) this.#recenter = attributes.recenter;
    if (attributes.resetCSS ?? true) this.root.classList.add('resetCSS');

    // close the dialog when a user clicks on the backdrop (anywhere outside)
    if (attributes.backdropClose ?? true) {
      root.addEventListener('mousedown', evt => {
        if (evt.target == root) root.close();
      });
    }

    // Everything goes in here so we have proper borders
    let content = root.appendChild($html('div', { class:'nfDialogContent' }));
    let closeout = content.appendChild($html('button', { text:'×',
      autofocus:true, type:'button', class:'nfDialogClose' }));
    closeout.addEventListener('click', () => { root.close(); });
    content.append(this.#head, this.#tabBar);
    this.title(title);
    nf.movable(root, this.#head);
    let body = content.appendChild(this.body);

    let onload = () => {
      document.body.insertBefore(root, document.body.firstChild);
      if (attributes.open ?? true) this.open(true);
    };

    if (document.body) onload();
    else nf.wait$('body', b => { onload() });	// add to body once it loads
    return this;
  }

  // Return the dialog's title. Set it first if given an argument.
  // .title([string|HTMLElement title]) -> string
  title(title) {
    if (title == undefined) return this.#title;
    if (typeof title == 'string') title = $html('span', { text:title });
    if (title instanceof HTMLElement) {
      this.#head.replaceChild(title, this.#head.childNodes[0]);
      return this.#title = title.innerText;
    }
    else throw new TyepError("If given, title must be a string or HTMLElement");
  }

  #recenter = true;

  // Set the dialog's primary foreground and background colors
  // Background2 defaults to being a little darker/lighter than background.
  // .setColors(string foreground, string background, [string background2])
  setColors(foreground, background, background2) {
    background2 ??= `oklch(from ${background} rem(l + .8, 1) c h / alpha)`;
    this.root.style.setProperty('--fg', foreground);
    this.root.style.setProperty('--bg', background);
    this.root.style.setProperty('--bg2', background2);
  }

  // Get one of the dialog's colors
  // .getColor([string which]) -> string
  getColor(which = 'foreground') {
    if      (which.match(/^(?:foreground|fg)$/))	which = '--fg';
    else if (which.match(/^(?:background|bg)$/))	which = '--bg';
    else if (which.match(/^(?:background2|bg2)$/))	which = '--bg2';
    else throw new TypeError(
      "You must specify `foreground`, `background`, or `background2`");
    return this.root.style.getPropertyValue(which);
  }

  root = $html('dialog', { class:'nfDialog' });
  #head = $html('h2', { class:'nfDialogHead' }, 'span');
  #title = location.host || location.href;
  #tabBar = $html('div', { class:'nfDialogTabBar' });
  body = $html('div', { class:'nfDialogBody' });

  // Close the dialog
  // .close()
  close() { return this.root.close(); }

  // Open the dialog, optionally repositioning it in the center of the screen
  // .open([boolean recenter])
  open(recenter = this.#recenter) {
    this.root.showModal();
    if (recenter) {
      // slide in from the top if given literal `true`
      if (recenter === true) { this.root.style.top = '-50vh'; }
      nf.sleep(10, () => { this.#center() });
    }
  }

  // Center the dialog
  // .#center()
  #center() {
    let width = nf.getStyleNum(this.root, "width");
    this.root.style.left = (window.innerWidth - width) / 2 + 'px';

    this.#grow(1);
  }

  // Grow the dialog vertically if the new tab is too tall
  // .#grow([boolean always])
  #grow(always) {
    let height = nf.getStyleNum(this.root, "height");
    let top = nf.getStyleNum(this.root, "top");
    if (always || top + height > window.innerHeight) {
      this.root.style.top = (window.innerHeight - height) / 2 + 'px';
    }
  }

  tabs = [];

  // Add a tab with given name and zero or more children
  // .tab([string title], [string|HTMLElement] ...) -> HTMLDivElement	{{{
  tab(title = `Tab ${this.tabs.length + 1}`, ...items) {
    let tabs = this.tabs;
    let id = `nfDialogTab-${tabs.length}-${nf.hash(this.title() + title, 36)}`;
    let radio = this.appendChild($html('input',
      { type:'radio', name:'nfDialogTab', id:id }));
    let body = this.appendChild($html('div', { class:'nfDialogTabBody' }));
    body.tab = this.#tabBar.appendChild($html('label',
      { text:title, class:'nfDialogTab', for:id }));
    body.focus = () => {
      radio.checked = true;
      tabs.forEach(t => t != body && t.tab.classList.remove('active'));
      body.tab.classList.add('active');
      this.#grow();
    };
    if (tabs.push(body) == 1) body.focus();
    radio.addEventListener('change', body.focus);
    if (items) body.append(...items);
    return body;
  }

  #style = nf.style$(`    /* nf.dialog stylesheet */

    .nfDialog.resetCSS * { all:revert; } /* specificity 0-2-0 */
    .nfDialog, .nfDialog.resetCSS {
      font:1rem sans-serif; color:var(--fg);
      text-shadow: 0 0 .5ex rgb(from var(--fg)
        calc(255 - r) calc(255 - g) calc(255 - b) / alpha);
      background-image:linear-gradient(to right, var(--bg), var(--bg2));
      border:none; border-radius:.5rem; margin:0; padding:0;
      position:fixed; transition:left .1s ease-out, top .1s ease-out;
      left:29vw; width:max(42vw, 50rem);
    }
    .nfDialog .nfDialogContent { padding:0 1rem 1rem; }
    .nfDialog .nfDialogHead {
      margin:0 0 0 -1rem; width:100%; padding:1ex 1rem;
      -webkit-user-select:none; user-select:none; font-size:1.3rem;
    }
    .nfDialog .nfDialogClose {
      float:right; margin-top:.33rem; font:3ex monospace;
    }
    .nfDialog[open]::backdrop {
      background-color:rgb(from var(--fg) r g b / calc(alpha - 1/3));
      backdrop-filter: blur(1.7px); cursor:initial;
    }
    .nfDialog .nfDialogBody { max-height:77vh; overflow:auto; }
    .nfDialogBody input[name="nfDialogTab"]:not(:checked) + div,
    .nfDialogBody input[name="nfDialogTab"] { display:none; }
    .nfDialog .nfDialogTabBar:has(> label) {
      padding:0 0 calc(.5ex - 1px); margin-top:.5ex;
      border-bottom:1px solid var(--bg2);
    }
    .nfDialog .nfDialogTab {
      padding:.5ex; margin:.5ex; border-radius:.5ex .5ex 0 0;
      border:1px solid var(--bg); background:var(--bg2);
      border-bottom-color:transparent;
    }
    .nfDialog .nfDialogTab:is(.active, :hover)  {
      border-color:var(--bg2) var(--bg2) transparent var(--bg2);
      background:rgb(from var(--bg) r g b / calc(alpha - 0.3));
    }
    .nfDialog .nfDialogTab.active { -webkit-text-stroke-width:0.07ex; }

  `);	//` end #style

  // Append one or more elements or text to the dialog body
  // .append([Node|string item...]) -> undefined
  append(...item) { this.body.append(...item) }

  // Append one element to the dialog body and return the appended element
  // .appendChild([Node item]) -> Node
  appendChild(item) { return this.body.appendChild(item) }

  // utility functions
  toString() { return this.root.innerText.slice(2); }
  isOpen() { return this.root.open; }

  static origin = nf.addon.dialog.origin;

}	// end of nf.dialog() }}}

// The numeric portion of the given element's computed value for the given style
// nf.getStyleNum(HTMLElement elem, string style) -> number	{{{
nf.getStyleNum = (elem, style) => {
  return parseFloat(getComputedStyle(elem)[style]);
}
nf.getStyleNum.origin = nf.addon.dialog.origin;
// end of nf.getStyleNum() }}}


// Make the given element movable by either itself or else a child element
// nf.movable(HTMLElement elem, [HTMLElement handle]) -> undefined	{{{
nf.movable = (elem, handle = elem) => {
  // via https://stackoverflow.com/a/73371486/519360 with lots of tweaks
  let position = getComputedStyle(elem)?.position;
  if (getComputedStyle(elem)?.position == 'static') {
    elem.style.position = 'relative';
  }
  if (handle) handle.style.cursor = 'move';
  ['mousedown', 'touchstart'].forEach(eventType => {
    handle.addEventListener(eventType, e => {
      e.preventDefault();
      let offsetX = e.clientX - nf.getStyleNum(elem, 'left');
      let offsetY = e.clientY - nf.getStyleNum(elem, 'top');
      // This is outside the function for speed.
      // We can get away with this because the popup is not resizable.
      // We'd otherwise need to update this on each resize.
      let width = 24 - nf.getStyleNum(elem, 'width');

      // bound the object to always have at least 24px visible from edges
      function mouseMoveHandler(e) {
        elem.style.top =
          Math.max(0, Math.min(window.innerHeight - 24, e.clientY - offsetY))
          + 'px';
        elem.style.left =
          Math.max(width,
            Math.min(window.innerWidth - 24, e.clientX - offsetX)) + 'px';
      }

      function reset() {
        removeEventListener('mousemove', mouseMoveHandler);
        removeEventListener('mouseup', reset);
      }

      addEventListener('mousemove', mouseMoveHandler);
      addEventListener('mouseup', reset);
    });
  })
}
nf.movable.origin = nf.addon.dialog.origin;
// end of nf.movable() }}}

