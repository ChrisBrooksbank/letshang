/**
 * iCal (.ics) file generation utilities
 *
 * Generates RFC 5545 compliant iCalendar files for event export
 */

export interface ICalEvent {
	id: string;
	title: string;
	description: string | null;
	startTime: string; // ISO 8601 datetime
	endTime: string | null; // ISO 8601 datetime
	location?: string | null;
	url?: string;
	organizer?: {
		name: string;
		email?: string;
	};
}

/**
 * Format a date for iCal format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(isoString: string): string {
	const date = new Date(isoString);
	return date
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

/**
 * Escape special characters in iCal text fields
 * Per RFC 5545: backslash, semicolon, comma, newline must be escaped
 */
function escapeICalText(text: string): string {
	return text
		.replace(/\\/g, '\\\\') // Backslash
		.replace(/;/g, '\\;') // Semicolon
		.replace(/,/g, '\\,') // Comma
		.replace(/\n/g, '\\n'); // Newline
}

/**
 * Fold long lines to 75 characters per RFC 5545
 */
function foldLine(line: string): string {
	if (line.length <= 75) {
		return line;
	}

	const lines: string[] = [];
	let remaining = line;

	while (remaining.length > 75) {
		lines.push(remaining.slice(0, 75));
		remaining = ' ' + remaining.slice(75); // Continuation lines start with space
	}

	if (remaining.length > 0) {
		lines.push(remaining);
	}

	return lines.join('\r\n');
}

/**
 * Generate an iCal (.ics) file content for a single event
 */
export function generateICalEvent(event: ICalEvent): string {
	const now = formatICalDate(new Date().toISOString());
	const startDate = formatICalDate(event.startTime);
	const endDate = event.endTime ? formatICalDate(event.endTime) : startDate;

	// Build the iCal content
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//LetsHang//Event Calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${event.id}@letshang.app`,
		`DTSTAMP:${now}`,
		`DTSTART:${startDate}`,
		`DTEND:${endDate}`,
		`SUMMARY:${escapeICalText(event.title)}`,
		`CREATED:${now}`,
		`LAST-MODIFIED:${now}`,
		`SEQUENCE:0`,
		`STATUS:CONFIRMED`
	];

	// Add optional fields
	if (event.description) {
		lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
	}

	if (event.location) {
		lines.push(`LOCATION:${escapeICalText(event.location)}`);
	}

	if (event.url) {
		lines.push(`URL:${event.url}`);
	}

	if (event.organizer) {
		const organizerValue = event.organizer.email
			? `CN=${escapeICalText(event.organizer.name)}:mailto:${event.organizer.email}`
			: escapeICalText(event.organizer.name);
		lines.push(`ORGANIZER:${organizerValue}`);
	}

	lines.push('END:VEVENT', 'END:VCALENDAR');

	// Fold long lines and join with CRLF
	return lines.map(foldLine).join('\r\n');
}

/**
 * Generate a filename for the .ics file
 */
export function generateICalFilename(eventTitle: string): string {
	// Sanitize the title for use in a filename
	const sanitized = eventTitle
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);

	return `${sanitized || 'event'}.ics`;
}
