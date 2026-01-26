<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	export let data: PageData;
	export let form: ActionData;

	let loading = false;
</script>

<BaseLayout>
	<div class="max-w-2xl mx-auto">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h1 class="text-2xl font-bold text-gray-900 mb-4">Confirm Your Attendance</h1>

			{#if form?.error}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-red-800">{form.error}</p>
				</div>
			{/if}

			<p class="text-gray-700 mb-6">
				Thanks for letting us know you're still coming! This helps the host plan better and ensures
				everyone has a great experience.
			</p>

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				<input type="hidden" name="rsvpId" value={data.rsvpId} />

				<div class="flex flex-col sm:flex-row gap-3">
					<button
						type="submit"
						disabled={loading}
						class="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition min-h-[44px] {loading
							? 'opacity-50 cursor-not-allowed'
							: ''}"
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Yes, I'm Still Coming!
					</button>

					<a
						href="/events/{data.eventId}/bail-out?rsvp={data.rsvpId}"
						class="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition min-h-[44px]"
					>
						Actually, I Can't Make It
					</a>
				</div>
			</form>

			<div class="mt-6">
				<a
					href="/events/{data.eventId}"
					class="text-blue-600 hover:text-blue-800 flex items-center gap-1 min-h-[44px]"
				>
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back to Event
				</a>
			</div>
		</div>
	</div>
</BaseLayout>
