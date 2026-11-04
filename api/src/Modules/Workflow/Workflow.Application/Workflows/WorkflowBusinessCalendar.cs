using System.Globalization;
using SaaSApp.Workflow.Application.Workflows.Commands.CreateWorkflow;

namespace SaaSApp.Workflow.Application.Workflows;

/// <summary>
/// Working calendar for SLA deadlines, from the workflow's Business Hours
/// (<c>settings.general.slaSettings</c>: work days, start / closing time, IANA time zone).
/// Times are stored in UTC; each working day's window is built in the work time zone and
/// converted to UTC, so a deadline across a daylight-saving change counts real elapsed time.
/// With no working days configured the SLA runs on calendar time (<see cref="TryCreate"/> returns null).
/// </summary>
public sealed class WorkflowBusinessCalendar
{
    // Ten years of days: a guard against a schedule that can never reach the deadline.
    private const int MaxDays = 3660;

    private static readonly string[] TimeFormats = ["HH:mm", "H:mm", "HH:mm:ss", "h:mm tt", "hh:mm tt", "h:mmtt", "hh:mmtt"];

    private readonly HashSet<DayOfWeek> _workDays;
    private readonly TimeSpan _start;
    private readonly TimeSpan _end;

    private WorkflowBusinessCalendar(HashSet<DayOfWeek> workDays, TimeSpan start, TimeSpan end, TimeZoneInfo timeZone)
    {
        _workDays = workDays;
        _start = start;
        _end = end;
        TimeZone = timeZone;
    }

    public TimeZoneInfo TimeZone { get; }

    /// <summary>Working time in one working day (closing − start).</summary>
    public TimeSpan WorkingDayLength => _end - _start;

    /// <summary>True when business hours are switched on (at least one working day is selected).</summary>
    public static bool IsConfigured(WorkflowSlaSettingsDto? settings) =>
        settings?.WorkDays?.Any(d => !string.IsNullOrWhiteSpace(d)) == true;

    /// <summary>
    /// Problems with configured business hours (empty when off or valid): unknown day, missing or
    /// unreadable times, closing not after start, unknown time zone.
    /// </summary>
    public static List<string> Validate(WorkflowSlaSettingsDto? settings)
    {
        var errors = new List<string>();
        if (!IsConfigured(settings))
            return errors;

        foreach (var day in settings!.WorkDays!.Where(d => !string.IsNullOrWhiteSpace(d)))
        {
            if (!TryParseDay(day, out _))
                errors.Add($"Business hours: '{day}' is not a day of the week.");
        }

        var hasStart = TryParseTime(settings.WorkHours?.From, out var start);
        var hasEnd = TryParseTime(settings.WorkHours?.To, out var end);
        if (!hasStart)
            errors.Add("Business hours: enter a valid start time.");
        if (!hasEnd)
            errors.Add("Business hours: enter a valid closing time.");
        if (hasStart && hasEnd)
        {
            if (end == start)
                errors.Add("Business hours: the closing time must be different from the start time.");
            else if (end < start)
                errors.Add("Business hours: the closing time must be later than the start time.");
        }

        if (string.IsNullOrWhiteSpace(settings.TimeZone))
            errors.Add("Business hours: select the work time zone.");
        else if (!TryFindTimeZone(settings.TimeZone, out _))
            errors.Add($"Business hours: time zone '{settings.TimeZone}' is not known.");

        return errors;
    }

    /// <summary>
    /// The calendar for valid business hours; null when business hours are off. Throws
    /// <see cref="InvalidOperationException"/> for business hours that are on but invalid.
    /// </summary>
    public static WorkflowBusinessCalendar? TryCreate(WorkflowSlaSettingsDto? settings)
    {
        if (!IsConfigured(settings))
            return null;

        var errors = Validate(settings);
        if (errors.Count > 0)
            throw new InvalidOperationException(string.Join(" ", errors));

        var days = settings!.WorkDays!
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Select(d => TryParseDay(d, out var day) ? day : (DayOfWeek?)null)
            .OfType<DayOfWeek>()
            .ToHashSet();
        TryParseTime(settings.WorkHours!.From, out var start);
        TryParseTime(settings.WorkHours!.To, out var end);
        TryFindTimeZone(settings.TimeZone!, out var zone);
        return new WorkflowBusinessCalendar(days, start, end, zone!);
    }

    /// <summary>
    /// Deadline after <paramref name="workingTime"/> of working time from <paramref name="startUtc"/>.
    /// Time outside the working hours and on non-working days is not counted; a start outside working
    /// hours counts from the next opening.
    /// </summary>
    public DateTime AddWorkingTime(DateTime startUtc, TimeSpan workingTime)
    {
        var cursor = DateTime.SpecifyKind(startUtc, DateTimeKind.Utc);
        if (workingTime <= TimeSpan.Zero)
            return cursor;

        var remaining = workingTime;
        // Start from the local day before, so a window that began earlier in UTC is not missed.
        var day = TimeZoneInfo.ConvertTimeFromUtc(cursor, TimeZone).Date.AddDays(-1);
        for (var i = 0; i < MaxDays; i++, day = day.AddDays(1))
        {
            if (!_workDays.Contains(day.DayOfWeek))
                continue;

            var open = ToUtc(day + _start);
            var close = ToUtc(day + _end);
            if (close <= cursor)
                continue;
            if (open > cursor)
                cursor = open;

            var available = close - cursor;
            if (remaining <= available)
                return cursor + remaining;

            remaining -= available;
            cursor = close;
        }

        throw new InvalidOperationException("Business hours: the SLA deadline is too far ahead to calculate.");
    }

    /// <summary>
    /// SLA days on business hours: each day is one working day of time (e.g. 9:00–18:00 → 9 hours),
    /// so 1 day from Tuesday 16:00 is Wednesday 16:00.
    /// </summary>
    public DateTime AddWorkingDays(DateTime startUtc, decimal days) =>
        AddWorkingTime(startUtc, TimeSpan.FromTicks((long)(WorkingDayLength.Ticks * days)));

    /// <summary>
    /// The moment <paramref name="workingTime"/> of working time before <paramref name="deadlineUtc"/>
    /// (for "30 working minutes before the deadline" reminders). Never earlier than <paramref name="notBeforeUtc"/>.
    /// </summary>
    public DateTime SubtractWorkingTime(DateTime deadlineUtc, TimeSpan workingTime, DateTime notBeforeUtc)
    {
        var cursor = DateTime.SpecifyKind(deadlineUtc, DateTimeKind.Utc);
        var floor = DateTime.SpecifyKind(notBeforeUtc, DateTimeKind.Utc);
        if (workingTime <= TimeSpan.Zero)
            return cursor;

        var remaining = workingTime;
        var day = TimeZoneInfo.ConvertTimeFromUtc(cursor, TimeZone).Date.AddDays(1);
        for (var i = 0; i < MaxDays; i++, day = day.AddDays(-1))
        {
            if (!_workDays.Contains(day.DayOfWeek))
                continue;

            var open = ToUtc(day + _start);
            var close = ToUtc(day + _end);
            if (open >= cursor)
                continue;
            if (close < cursor)
                cursor = close;

            var available = cursor - open;
            if (remaining <= available)
                return Max(cursor - remaining, floor);

            remaining -= available;
            cursor = open;
            if (cursor <= floor)
                return floor;
        }

        return floor;
    }

    public static DateTime? DueAt(DateTime startedAtUtc, decimal duration, string? unit, WorkflowBusinessCalendar? calendar)
    {
        if (duration <= 0)
            return null;

        var start = DateTime.SpecifyKind(startedAtUtc, DateTimeKind.Utc);
        var value = (double)duration;
        var normalized = NormalizeUnit(unit);
        if (calendar == null)
        {
            return normalized switch
            {
                "minutes" => start + TimeSpan.FromMinutes(value),
                "hours" => start + TimeSpan.FromHours(value),
                "days" => start + TimeSpan.FromDays(value),
                _ => null
            };
        }

        return normalized switch
        {
            "minutes" => calendar.AddWorkingTime(start, TimeSpan.FromMinutes(value)),
            "hours" => calendar.AddWorkingTime(start, TimeSpan.FromHours(value)),
            "days" => calendar.AddWorkingDays(start, duration),
            _ => null
        };
    }

    /// <summary>
    /// minutes / hours / days from the designer or from a master form's unit field ("Hour", "Days", "hrs"…).
    /// Null when unknown.
    /// </summary>
    public static string? NormalizeUnit(string? unit) =>
        unit?.Trim().ToLowerInvariant() switch
        {
            "minutes" or "minute" or "mins" or "min" or "m" => "minutes",
            "hours" or "hour" or "hrs" or "hr" or "h" => "hours",
            "days" or "day" or "d" => "days",
            _ => null
        };

    private static DateTime Max(DateTime a, DateTime b) => a > b ? a : b;

    /// <summary>
    /// Local wall time to UTC. A time skipped by a spring-forward change moves to after the gap; an
    /// ambiguous fall-back time uses its first (daylight) occurrence.
    /// </summary>
    private DateTime ToUtc(DateTime local)
    {
        var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        if (TimeZone.IsInvalidTime(unspecified))
        {
            var gap = TimeZone.GetAdjustmentRules()
                .Where(r => r.DateStart <= unspecified && r.DateEnd >= unspecified)
                .Select(r => r.DaylightDelta)
                .FirstOrDefault(d => d > TimeSpan.Zero);
            unspecified = unspecified + (gap > TimeSpan.Zero ? gap : TimeSpan.FromHours(1));
        }

        if (TimeZone.IsAmbiguousTime(unspecified))
        {
            var offset = TimeZone.GetAmbiguousTimeOffsets(unspecified).Max();
            return DateTime.SpecifyKind(unspecified - offset, DateTimeKind.Utc);
        }

        return TimeZoneInfo.ConvertTimeToUtc(unspecified, TimeZone);
    }

    internal static bool TryParseDay(string? value, out DayOfWeek day)
    {
        day = default;
        var text = value?.Trim();
        if (string.IsNullOrEmpty(text))
            return false;

        if (int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number) && number is >= 0 and <= 6)
        {
            day = (DayOfWeek)number;
            return true;
        }

        foreach (var candidate in Enum.GetValues<DayOfWeek>())
        {
            var name = candidate.ToString();
            if (string.Equals(text, name, StringComparison.OrdinalIgnoreCase)
                || (text.Length >= 3 && name.StartsWith(text, StringComparison.OrdinalIgnoreCase)))
            {
                day = candidate;
                return true;
            }
        }

        return false;
    }

    internal static bool TryParseTime(string? value, out TimeSpan time)
    {
        time = default;
        var text = value?.Trim();
        if (string.IsNullOrEmpty(text))
            return false;

        if (DateTime.TryParseExact(text, TimeFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            time = parsed.TimeOfDay;
            return true;
        }

        return false;
    }

    // Browsers still report these old names, but newer Linux time zone data can leave them out.
    private static readonly Dictionary<string, string> CurrentTimeZoneNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Asia/Calcutta"] = "Asia/Kolkata",
        ["Asia/Katmandu"] = "Asia/Kathmandu",
        ["Asia/Rangoon"] = "Asia/Yangon",
        ["Asia/Saigon"] = "Asia/Ho_Chi_Minh",
        ["Europe/Kiev"] = "Europe/Kyiv",
    };

    public static string CurrentTimeZoneName(string id) =>
        CurrentTimeZoneNames.TryGetValue(id.Trim(), out var current) ? current : id.Trim();

    internal static bool TryFindTimeZone(string id, out TimeZoneInfo? zone) =>
        TryFindExactTimeZone(id, out zone) || TryFindExactTimeZone(CurrentTimeZoneName(id), out zone);

    private static bool TryFindExactTimeZone(string id, out TimeZoneInfo? zone)
    {
        zone = null;
        try
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById(id.Trim());
            return true;
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            // Windows without ICU only knows Windows ids; try the IANA → Windows mapping.
            if (TimeZoneInfo.TryConvertIanaIdToWindowsId(id.Trim(), out var windowsId))
            {
                try
                {
                    zone = TimeZoneInfo.FindSystemTimeZoneById(windowsId);
                    return true;
                }
                catch (Exception inner) when (inner is TimeZoneNotFoundException or InvalidTimeZoneException)
                {
                }
            }

            return false;
        }
    }
}
