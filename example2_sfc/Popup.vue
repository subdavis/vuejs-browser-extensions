<template>
	<div class="foo">
      {{message}}
	</div>
</template>

<script>
	export default {
		data() {
            return {
                message: "Hello, I'm a browser extension!"
            }	
		}
	}
</script>

<style lang="scss">
.foo {
    color: red;
}
</style>