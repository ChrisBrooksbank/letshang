<script lang="ts">
	import {
		getCalendarDays,
		getWeekDays,
		getDayName,
		formatMonthYear,
		isInMonth,
		isToday,
		getPreviousMonth,
		getNextMonth,
		getPreviousWeek,
		getNextWeek
	} from '$lib/utils/calendar';
	import type { CalendarEvent } from '$lib/server/calendar';

	interface Props {
		events: CalendarEvent[];
		view?: 'month' | 'week';
		selectedDate?: Date;
		onDateChange?: (date: Date) => void;
		onViewChange?: (view: 'month' | 'week') => void;
	}

	let {
		events = [],
		view = $bindable('month'),
		selectedDate = $bindable(new Date()),
		onDateChange,
		onViewChange
	}: Props = $props();

	// Get calendar days based on view
	const calendarDays = $derived(
		view === 'month'
			? getCalendarDays(selectedDate.getFullYear(), selectedDate.getMonth())
			: getWeekDays(selectedDate)
	);

	// Group events by date
	const eventsByDate = $derived(
		events.reduce(
			(acc, event) => {
				const eventDate = new Date(event.start_time);
				const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
				if (!acc[dateKey]) {
					acc[dateKey] = [];
				}
				acc[dateKey].push(event);
				return acc;
			},
			{} as Record<string, CalendarEvent[]>
		)
	);

	// Get events for a specific date
	function getEventsForDate(date: Date): CalendarEvent[] {
		const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
		return eventsByDate[dateKey] || [];
	}

	// Navigation handlers
	function handlePrevious() {
		if (view === 'month') {
			selectedDate = getPreviousMonth(selectedDate);
		} else {
			selectedDate = getPreviousWeek(selectedDate);
		}
		onDateChange?.(selectedDate);
	}

	function handleNext() {
		if (view === 'month') {
			selectedDate = getNextMonth(selectedDate);
		} else {
			selectedDate = getNextWeek(selectedDate);
		}
		onDateChange?.(selectedDate);
	}

	function handleToday() {
		selectedDate = new Date();
		onDateChange?.(selectedDate);
	}

	function handleViewChange(newView: 'month' | 'week') {
		view = newView;
		onViewChange?.(newView);
	}

	// Format time for display
	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}

	// Get RSVP status color
	function getRsvpStatusColor(status: string): string {
		switch (status) {
			case 'going':
				return 'bg-green-100 text-green-800 border-green-300';
			case 'interested':
				return 'bg-blue-100 text-blue-800 border-blue-300';
			case 'waitlisted':
				return 'bg-yellow-100 text-yellow-800 border-yellow-300';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-300';
		}
	}
</script>

<div class="calendar bg-white rounded-lg shadow">
	<!-- Calendar Header -->
	<div class="calendar-header p-4 border-b flex items-center justify-between">
		<div class="flex items-center gap-2">
			<button
				onclick={handlePrevious}
				class="p-2 hover:bg-gray-100 rounded"
				aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
			>
				←
			</button>
			<button
				onclick={handleNext}
				class="p-2 hover:bg-gray-100 rounded"
				aria-label={view === 'month' ? 'Next month' : 'Next week'}
			>
				→
			</button>
			<button onclick={handleToday} class="px-3 py-1 hover:bg-gray-100 rounded text-sm">
				Today
			</button>
		</div>

		<h2 class="text-lg font-semibold">{formatMonthYear(selectedDate)}</h2>

		<div class="flex gap-1 bg-gray-100 rounded p-1">
			<button
				onclick={() => handleViewChange('month')}
				class="px-3 py-1 rounded text-sm {view === 'month'
					? 'bg-white shadow-sm'
					: 'hover:bg-gray-200'}"
			>
				Month
			</button>
			<button
				onclick={() => handleViewChange('week')}
				class="px-3 py-1 rounded text-sm {view === 'week'
					? 'bg-white shadow-sm'
					: 'hover:bg-gray-200'}"
			>
				Week
			</button>
		</div>
	</div>

	<!-- Calendar Grid -->
	<div class="calendar-grid p-4">
		<!-- Day headers -->
		<div
			class="grid {view === 'month'
				? 'grid-cols-7'
				: 'grid-cols-7'} gap-2 mb-2 text-center text-sm font-medium text-gray-600"
		>
			{#each Array(7) as _, i}
				<div>{getDayName(i, true)}</div>
			{/each}
		</div>

		<!-- Calendar days -->
		<div
			class="grid {view === 'month' ? 'grid-cols-7' : 'grid-cols-7'} gap-2"
			style="grid-auto-rows: minmax(100px, auto);"
		>
			{#each calendarDays as day}
				{@const dayEvents = getEventsForDate(day)}
				{@const isCurrentMonth = isInMonth(day, selectedDate.getMonth())}
				{@const isDayToday = isToday(day)}

				<div
					class="calendar-day border rounded p-2 {isDayToday
						? 'bg-blue-50 border-blue-300'
						: 'border-gray-200'} {!isCurrentMonth && view === 'month'
						? 'opacity-40'
						: ''} hover:bg-gray-50 cursor-pointer"
					role="button"
					tabindex="0"
				>
					<div class="text-sm font-medium mb-1 {isDayToday ? 'text-blue-600' : 'text-gray-700'}">
						{day.getDate()}
					</div>

					{#if dayEvents.length > 0}
						<div class="space-y-1">
							{#each dayEvents.slice(0, 3) as event}
								<a
									href="/events/{event.id}"
									class="block text-xs px-2 py-1 rounded border {getRsvpStatusColor(
										event.rsvp_status
									)} truncate hover:shadow-sm"
									title="{event.title} at {formatTime(event.start_time)}"
								>
									<div class="font-medium truncate">{formatTime(event.start_time)}</div>
									<div class="truncate">{event.title}</div>
								</a>
							{/each}

							{#if dayEvents.length > 3}
								<div class="text-xs text-gray-500 px-2">+{dayEvents.length - 3} more</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.calendar {
		min-width: 100%;
	}

	.calendar-day {
		min-height: 100px;
	}

	@media (max-width: 640px) {
		.calendar-day {
			min-height: 80px;
			font-size: 0.875rem;
		}
	}
</style>
