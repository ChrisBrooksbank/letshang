<script lang="ts">
	import type { CommentWithUser } from '$lib/server/comments';

	export let eventId: string;
	export let comments: CommentWithUser[];
	export let hasRsvped: boolean;
	export let userId: string | null;

	let newComment = '';
	let replyingTo: string | null = null;
	let editingCommentId: string | null = null;
	let editContent = '';
	let submitting = false;

	// Group comments by parent
	$: topLevelComments = comments.filter((c) => !c.parent_comment_id);
	$: getReplies = (parentId: string) => comments.filter((c) => c.parent_comment_id === parentId);

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 7) {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			});
		} else if (days > 0) {
			return `${days}d ago`;
		} else if (hours > 0) {
			return `${hours}h ago`;
		} else if (minutes > 0) {
			return `${minutes}m ago`;
		} else {
			return 'Just now';
		}
	}

	function startReply(commentId: string) {
		replyingTo = commentId;
		newComment = '';
	}

	function cancelReply() {
		replyingTo = null;
		newComment = '';
	}

	function startEdit(comment: CommentWithUser) {
		editingCommentId = comment.id;
		editContent = comment.content;
	}

	function cancelEdit() {
		editingCommentId = null;
		editContent = '';
	}

	function handleDelete(e: Event, message: string) {
		if (!confirm(message)) {
			e.preventDefault();
		}
	}
</script>

<!-- Comments Section -->
<div class="border-t border-gray-200 pt-8 mt-8">
	<h2 class="text-2xl font-bold text-gray-900 mb-6">Discussion</h2>

	{#if !hasRsvped}
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
			<p class="text-gray-600">RSVP to this event to join the discussion</p>
		</div>
	{:else}
		<!-- New Comment Form -->
		<form method="POST" action="?/postComment" class="mb-8">
			<input type="hidden" name="eventId" value={eventId} />
			<input type="hidden" name="parentCommentId" value={replyingTo || ''} />

			<div class="mb-3">
				<label for="new-comment" class="block text-sm font-medium text-gray-700 mb-2">
					{replyingTo ? 'Write a reply' : 'Add a comment'}
				</label>
				<textarea
					id="new-comment"
					name="content"
					bind:value={newComment}
					rows="3"
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					placeholder="Share your thoughts..."
					maxlength="5000"
					disabled={submitting}
				></textarea>
				<div class="text-sm text-gray-500 mt-1">
					{newComment.length}/5000 characters
				</div>
			</div>

			<div class="flex gap-2">
				<button
					type="submit"
					disabled={submitting || newComment.trim().length === 0}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[44px]"
				>
					{submitting ? 'Posting...' : replyingTo ? 'Post Reply' : 'Post Comment'}
				</button>
				{#if replyingTo}
					<button
						type="button"
						onclick={cancelReply}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors min-h-[44px]"
					>
						Cancel Reply
					</button>
				{/if}
			</div>
		</form>

		<!-- Comments List -->
		{#if topLevelComments.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>No comments yet. Be the first to start the discussion!</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each topLevelComments as comment (comment.id)}
					<div class="bg-white border border-gray-200 rounded-lg p-4">
						<!-- Comment Header -->
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-center gap-3">
								{#if comment.user.avatar_url}
									<img
										src={comment.user.avatar_url}
										alt={comment.user.display_name || 'User'}
										class="w-10 h-10 rounded-full"
									/>
								{:else}
									<div
										class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold"
									>
										{(comment.user.display_name || 'U')[0].toUpperCase()}
									</div>
								{/if}
								<div>
									<div class="font-semibold text-gray-900">
										{comment.user.display_name || 'Anonymous'}
									</div>
									<div class="text-sm text-gray-500">
										{formatDate(comment.created_at)}
										{#if comment.updated_at !== comment.created_at}
											<span class="text-gray-400">(edited)</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Comment Actions -->
							{#if userId === comment.user_id}
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => startEdit(comment)}
										class="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-2"
									>
										Edit
									</button>
									<form method="POST" action="?/deleteComment" class="inline">
										<input type="hidden" name="commentId" value={comment.id} />
										<button
											type="submit"
											class="text-sm text-red-600 hover:text-red-800 min-h-[44px] px-2"
											onclick={(e) => handleDelete(e, 'Delete this comment?')}
										>
											Delete
										</button>
									</form>
								</div>
							{/if}
						</div>

						<!-- Comment Content -->
						{#if editingCommentId === comment.id}
							<form method="POST" action="?/editComment" class="mb-3">
								<input type="hidden" name="commentId" value={comment.id} />
								<textarea
									name="content"
									bind:value={editContent}
									rows="3"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
									maxlength="5000"
								></textarea>
								<div class="flex gap-2">
									<button
										type="submit"
										class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 min-h-[44px]"
									>
										Save
									</button>
									<button
										type="button"
										onclick={cancelEdit}
										class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 min-h-[44px]"
									>
										Cancel
									</button>
								</div>
							</form>
						{:else}
							<p class="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>

							<!-- Reply Button -->
							<button
								type="button"
								onclick={() => startReply(comment.id)}
								class="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-2"
							>
								Reply
							</button>
						{/if}

						<!-- Replies -->
						{#each getReplies(comment.id) as reply (reply.id)}
							<div class="ml-8 mt-4 border-l-2 border-gray-200 pl-4">
								<div class="flex items-start justify-between mb-2">
									<div class="flex items-center gap-2">
										{#if reply.user.avatar_url}
											<img
												src={reply.user.avatar_url}
												alt={reply.user.display_name || 'User'}
												class="w-8 h-8 rounded-full"
											/>
										{:else}
											<div
												class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm"
											>
												{(reply.user.display_name || 'U')[0].toUpperCase()}
											</div>
										{/if}
										<div>
											<div class="font-semibold text-gray-900 text-sm">
												{reply.user.display_name || 'Anonymous'}
											</div>
											<div class="text-xs text-gray-500">
												{formatDate(reply.created_at)}
												{#if reply.updated_at !== reply.created_at}
													<span class="text-gray-400">(edited)</span>
												{/if}
											</div>
										</div>
									</div>

									{#if userId === reply.user_id}
										<div class="flex gap-2">
											<button
												type="button"
												onclick={() => startEdit(reply)}
												class="text-xs text-blue-600 hover:text-blue-800 min-h-[44px] px-2"
											>
												Edit
											</button>
											<form method="POST" action="?/deleteComment" class="inline">
												<input type="hidden" name="commentId" value={reply.id} />
												<button
													type="submit"
													class="text-xs text-red-600 hover:text-red-800 min-h-[44px] px-2"
													onclick={(e) => handleDelete(e, 'Delete this reply?')}
												>
													Delete
												</button>
											</form>
										</div>
									{/if}
								</div>

								{#if editingCommentId === reply.id}
									<form method="POST" action="?/editComment" class="mb-2">
										<input type="hidden" name="commentId" value={reply.id} />
										<textarea
											name="content"
											bind:value={editContent}
											rows="2"
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2 text-sm"
											maxlength="5000"
										></textarea>
										<div class="flex gap-2">
											<button
												type="submit"
												class="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 min-h-[44px]"
											>
												Save
											</button>
											<button
												type="button"
												onclick={cancelEdit}
												class="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 min-h-[44px]"
											>
												Cancel
											</button>
										</div>
									</form>
								{:else}
									<p class="text-gray-800 text-sm whitespace-pre-wrap">{reply.content}</p>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
