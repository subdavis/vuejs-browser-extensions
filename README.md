# vuejs-browser-extensions

What to keep in mind if you want to use Vue.js for a WebExtension

## Anatomy of a browser extension

Browser extensions consist of 4 parts, which are mostly just regular web apps.

* Popup page - the main application (restricted)
* Options page - a config page (restricted)
* Background page - an invisible tab that runs as long as your browser is open (restricted, no frontend)
* Inject script(s) - scripts that can be optionally or automatically run within the context of any website you visit. (unrestricted)

The first three parts have some restrictions:

* Content Security Policy defaults to `script-src 'self'; object-src 'self'`
* `eval` (and friends) won't work (ooh... ahh...)
* All inline JavaScript will not be executed.

More details at https://developer.chrome.com/extensions/contentSecurityPolicy

...and some superpowers.  For example:

* they can inject code and assets into any page you visit.
* they can interact with some system hardware, like USB devices.
* they can add new tabs and functions to the debug console.

MANY more details at https://developer.chrome.com/extensions/api_index

## Can we get around these restrictions?

The answer is *Yes, but don't*.

Asimov's three laws of a secure WebExtension:

* Use the default CSP or a stricter one.
* Minimize third party library use and do not distribute unused code.
* Simplify the development experience, as long as this simplicity does not conflict with the first and second laws.

# Building a three-laws-safe WebExtension

We have to pick a "stack".  Here's mine:

* Webpack + Yarn
* Vue.js & vue-loader
* SASS & sass-loader
* mocha + should.js for tests (we won't cover this)

# `vue-cli init webpack new-extension`

If you approach extension dev like a normal web app, the first issue you're going to run into is `http://localhost:8080`.

Per the CSP, the browser itself must serve the files - `http://localhost:8080` is a remote origin.

**You cannot use a normal development flow like webpack-dev-server**

# Problem 1 - Unsafe Eval

Use the un-minified development version of `Vue.js` from https://github.com/vuejs/vue/releases

The browser immediately tells us what's wrong:

```html
Error compiling template:

<div id="elm">
   	<h1>{{ msg }}</h1>
</div>

- invalid expression: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src 'self' blob: filesystem: chrome-extension-resource:".
 in

    _s(msg)

  Raw expression: {{ msg }}

(found in <Root>)
```

The offending lines reveal themselves to be:

```JavaScript
function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err: err, code: code });
    return noop
  }
}
```

Setting a breakpoint reveals the `code` arg (broken into lines for readability):

```JavaScript
with(this){
	return _c(
		'div',{
		attrs:{
				"id":"elm"
			}
		},
		[
			_c('h1',[_v(_s(msg))])
		]
	)
}
```

# Some solutions to the eval problem

Here I'll borrow from [a great article on the subject](https://vuejsdevelopers.com/2017/05/08/vue-js-chrome-extension/)

## Don't compile templates!

`vue-template-compiler` is actually separable from the rest of the vue runtime.  It is invoked at runtime when

1. you use a template string
2. you mount to a template using `el` (as in example 1)

You can avoid invoking the template compiler by writing your own render functions a la https://vuejs.org/v2/guide/render-function.html but **This won't scale**.

> Vue recommends using templates to build your HTML in the vast majority of cases. There are situations however, where you really need the full programmatic power of JavaScript. That’s where you can use the render function, a closer-to-the-compiler alternative to templates.

Render functions are impractical for writing your entire application.

```JavaScript
// An example render function
// No need to eval when this function explicitly creates my new element.

render: function (createElement) {
  return createElement(
    s'h1', 			            // the element to creat,
    {},						          // A data object corresponding to the attributess
    [ this.blogTitle ] 			// the list of children to populate this new element
  )
}
```

You'll notice this is exactly the same as the `code` argument from above.  The template compiler turned our template into a render function, and passed it into `createFunction`.

## Use Single File Components (SFCs)

> When you use vue-loader to process your .vue file, one of the things it does is use vue-template-compiler to turn your component’s template into a render function.

For this we need.... Webpack!  (and babel and vue-loader)

After some more involved setup (see Example 2) we have:

```plaintext
.
├── build
│  └── index.build.js
├── index.html
├── index.js
├── manifest.json
├── package.json
├── Popup.vue
├── vue.js
├── webpack.config.js
├── yarn-error.log
└── yarn.lock
```

The important parts are:

```JavaScript
// index.html:

<div id="app">
    <popup></popup>
</div>
<script src="build/index.build.js"></script>

// index.js:

import Popup from './Popup.vue'
import Vue from 'vue';

new Vue({
    el: "#app",
    components: {
        Popup
    }
})

// Popup.vue is boundary of wierdness, where all your current Vue code will work normally.
```

Loading `/path/to/index.html` as a static file produces a blank page.  In console, you can see:

```
[Vue warn]: You are using the runtime-only build of Vue where the template compiler is not available. Either pre-compile the templates into render functions, or use the compiler-included build.
```

While there are no templates to explicitly cause `new Function(stringn)` to be executed, vue wants to run `<div id="app"></div>` from `index.html` through the template loader and cannot find it.

We have 2 options:

1. Provide `vue-template-loader` in the webpack bundle (not ideal, since this is superfluous code that won't ever execute)
2. Use a render function for the top-level template so `vue-template-loader` is never needed (better!)

`index.js` becomes:

```JavaScript
import Popup from './Popup.vue'
import Vue from 'vue'
new Vue({
    el: "#app",
    render: createElement => createElement(Popup)
})
```

## Other problems

1. Expensive(ish) source maps.  As with before, we cannot use `eval` in our source maps.  According to https://webpack.js.org/configuration/devtool/ `cheap-source-map` is the best we can do.
2. Long initial build times.  Avoid building static assets, and try `DLLPlugin` for webpack.
3. Hot Reload is tricky but not impossible.  [Webpack Chrome Extension Loader](https://github.com/rubenspgcavalcante/webpack-chrome-extension-reloader) is brilliant middleware that translates WebSocket reload notifications to `chrome.runtime` events that your extension can listen to.

## A real example

`example2_sfc` is great for understanding the basic setup.

[My browser extension, Tusk](https://github.com/subdavis/Tusk) will provide guidance for the gritty details, such as handling static resources and using `DLLPlugin`.  It's also a decent example of how to organize a large browser extension project with Vue.js