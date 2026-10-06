/**
 * Redirect target sanitizing
 *
 * Only same-origin absolute paths are allowed, so attacker-supplied values like
 * "https://evil.example", "//evil.example" or "/\evil.example" can't bounce a
 * freshly signed-in user to another site (open redirect).
 */
export function safeRedirectPath(
	target: string | null | undefined,
	fallback = '/dashboard'
): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
		return fallback;
	}

	// Reject control characters, which browsers strip before parsing the URL
	for (let i = 0; i < target.length; i++) {
		const code = target.charCodeAt(i);
		if (code <= 0x1f || code === 0x7f) {
			return fallback;
		}
	}

	return target;
}
