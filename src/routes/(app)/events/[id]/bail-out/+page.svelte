<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	export let data: PageData;
	export let form: ActionData;

	let loading = false;
	let reason = '';
</script>

<BaseLayout>
	<div class="max-w-2xl mx-auto">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h1 class="text-2xl font-bold text-gray-900 mb-4">Can't Make It?</h1>

			{#if form?.error}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-red-800">{form.error}</p>
				</div>
			{/if}

			<p class="text-gray-700 mb-6">
				No worries! Things come up. Letting the host know helps them plan better, and if there's a
				waitlist, you'll free up a spot for someone else.
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

				<div class="mb-6">
					<label for="reason" class="block text-sm font-medium text-gray-900 mb-2">
						Want to let us know why? (Optional)
					</label>
					<textarea
						id="reason"
						name="reason"
						bind:value={reason}
						rows="3"
						maxlength="500"
						placeholder="Something came up, not feeling well, schedule conflict, etc."
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
					></textarea>
					<p class="text-xs text-gray-500 mt-1">{reason.length} / 500 characters</p>
				</div>

				<div class="flex flex-col sm:flex-row gap-3">
					<button
						type="submit"
						disabled={loading}
						class="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition min-h-[44px] {loading
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
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						Confirm: I Can't Make It
					</button>

					<a
						href="/events/{data.eventId}/confirm?rsvp={data.rsvpId}"
						class="flex items-center justify-center gap-2 px-6 py-3 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition min-h-[44px]"
					>
						Wait, I Can Still Come!
					</a>
				</div>
			</form>

			<div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
				<p class="text-sm text-blue-800">
					<strong>Hope to see you at the next one!</strong> We understand life happens. Your honesty helps
					everyone.
				</p>
			</div>

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
