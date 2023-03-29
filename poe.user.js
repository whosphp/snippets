// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://poe.com/chatgpt
// @icon         https://www.google.com/s2/favicons?sz=64&domain=poe.com
// @grant        none
// @require https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    const customCSS = `
<style>
  div > div > section {
    width: 1024px !important;
    max-width: 1024px !important;
  }

  code {
    color: chocolate;
  }
</style>
`;
    $('head').append(customCSS);
})();
