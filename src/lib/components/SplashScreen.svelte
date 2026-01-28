<script lang="ts">
	import { onMount } from 'svelte';
	import { hideSplashScreen } from '$lib/utils/splash-screen';

	/**
	 * SplashScreen — dismisses the static splash screen once the app has hydrated.
	 *
	 * The actual splash HTML lives in app.html and renders before JS loads.
	 * This component simply calls hideSplashScreen() on mount to fade it out.
	 *
	 * Usage: Place in a layout component (e.g. BaseLayout) so it runs
	 * as soon as the app is interactive.
	 */
	onMount(() => {
		hideSplashScreen();
	});
</script>
