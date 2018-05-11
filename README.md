# vuejs-browser-extensions

What to keep in mind if you want to use Vue.js for a WebExtension


# What is a browser extension?

Like a regular web application:

* 4 applications in 1:
  * Popup page - the main application
  * Options page - a config page
  * Background page - an invisible tab that runs as long as your browser is open
  * Inject script(s) - scripts that can be optionally or automatically run within the context of any website you visit.

But with some restrictions:

* Content Security Policy defaults to `script-src 'self'; object-src 'self'`
* `eval` (and friends) won't work (ooh... ahh...)
* All inline JavaScript will not be executed.

More details at https://developer.chrome.com/extensions/contentSecurityPolicy

...and some superpowers:

* they can inject code and assets into any page you visit.
* they can interact with some system hardware, like USB devices.
* they can add new tabs and functions to the debug console.

MANY more details at https://developer.chrome.com/extensions/api_index


# Can we get around these restrictions?

The answer, in my opinion, is *Yes, but never do it*.

The three laws of a secure WebExtension:

* Use the default CSP or a stricter one.
* Minimize third party library use and do not distribute any un-used code
* Simplify your development experience, as long as this simplicity does not conflict with the first and second laws.

# How can we build a Three Laws safe extension in Vue?

We have to pick a "stack".  Here's mine:

* Webpack + Yarn
* Vue.js & vue-loader
* SASS & sass-loader
* mocha + should.js for tests (we won't cover this much)

# `vue-cli init webpack new-extension`

If you approach extension dev like a normal web app, the first issue you're going to run into is `http://localhost:8080`.

For extensions, the browser itself must serve the files.

**You cannot use a normal development server like webpack-dev-server**

So hot-reload must be out then right?

# Problem 0 - Hot Reloading

[Webpack Chrome Extension Loader](https://github.com/rubenspgcavalcante/webpack-chrome-extension-reloader) is a brilliant middleware that translates WebSocket reload notifications to `chrome.runtime` events that your extension can listen to.

Runtime is the browser's pub-sub interface that allows the different parts of an extension to talk to eachother. 

An example of this can be found in `example1_reload`

# Problem 1 - Unsafe Eval

Use the un-minified development version of `Vue.js` from https://github.com/vuejs/vue/releases

The browser immediately tells us what's wrong:

```
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

```
"with(this){
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
}"
```

# Some solutions to the eval problem:

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
  	'h1', 						// the element to creat,
  	{},						    // A data object corresponding to the attributess
  	[ this.blogTitle ] 			// the list of children to populate this new element
  )
}
```

You'll notice this is exactly the same as the `code` argument from above.  The template compiler turned our template into a render function, and passed it into `createFunction`.

## Use Single File Components (SFCs)

> When you use vue-loader to process your .vue file, one of the things it does is use vue-template-compiler to turn your component’s template into a render function.



# Problem - Expensive(ish) source maps

As with before, we cannot use `eval` in our source maps.

According to https://webpack.js.org/configuration/devtool/ `cheap-source-map` is the best we can do.  

It's rated as "medium" for rebuilds, over the "super fast" and "pretty fast" options where eval is allowed.
