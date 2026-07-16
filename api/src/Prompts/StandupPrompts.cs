namespace DailyWork.Api.Prompts;

internal static class StandupPrompts
{
	internal static readonly string[] DoneOpeners =
	[
		"Hell yea!", "YESSIR!", "You know it!", "YES!", "Crushed it.",
		"Nailed it.", "Lock it in.", "Big day yesterday.", "Clean sweep.", "All green, baby.",
	];

	internal static readonly string[] NotDoneOpeners =
	[
		"NOPE.", "That's funny.", "Not even close.", "What was I thinking?", "Lol no.",
		"About that...", "Let's not talk about it.", "Swing and a miss.", "Bold of you to ask.", "Yeah... no.",
	];

	internal static readonly string[] PartialOpeners =
	[
		"Kinda.", "Sort of.", "Getting there.", "Halfway hero.", "Progress, not perfection.",
	];

	internal static string GetSystemPrompt(DayOfWeek day) => day switch
	{
		DayOfWeek.Monday => GetMondayPrompt(),
		DayOfWeek.Friday => GetFridayPrompt(),
		_ => GetMidWeekPrompt(),
	};

	internal static string? PickOpener(string? yesterdayStatus, string? previousStandupMarkdown)
	{
		var bucket = yesterdayStatus switch
		{
			"done" => DoneOpeners,
			"carried" => PartialOpeners,
			"skipped" or "notDone" => NotDoneOpeners,
			_ => null,
		};
		if (bucket is null)
			return null;

		var candidates = bucket;
		if (previousStandupMarkdown is not null)
		{
			var unused = bucket
				.Where(o => !previousStandupMarkdown.Contains(o, StringComparison.Ordinal))
				.ToArray();
			if (unused.Length > 0)
				candidates = unused;
		}

		return candidates[Random.Shared.Next(candidates.Length)];
	}

	internal static string BuildUserMessage(
		string today,
		string yesterday,
		string standupContextJson,
		string? opener,
		string? learningQueueJson = null)
	{
		var message = $"Today's date: {today}\nYesterday's date: {yesterday}\n\nStandup context:\n{standupContextJson}";
		if (opener is not null)
			message += $"\n\nOpen the first answer with exactly: \"{opener}\"";
		if (learningQueueJson is not null)
			message += $"\n\nLearning queue items consumed this week:\n{learningQueueJson}";
		return message;
	}

	internal static string BuildWeeklyUserMessage(string workItemsJson, string today, string yesterday) =>
		$"Today's date: {today}\nYesterday's date: {yesterday}\n\nWork items:\n{workItemsJson}";

	private static string GetMidWeekPrompt() => string.Join("\n\n",
		Intro(3),
		ContextFieldsBlock,
		OutputStructureLine,
		QuestionOneBlock,
		QuestionTwoBlock,
		PtoQuestionBlock,
		StyleRules(140));

	private static string GetFridayPrompt() => string.Join("\n\n",
		Intro(4),
		ContextFieldsBlock,
		LearningQueueFieldsBlock,
		OutputStructureLine,
		QuestionOneBlock,
		QuestionTwoBlock,
		PtoQuestionBlock,
		QuestionFourBlock,
		StyleRules(180));

	private static string GetMondayPrompt() => "Monday prompt — TODO";

	private static string Intro(int questionCount) =>
		$"You are a standup response writer. Answer exactly {questionCount} standup questions using the provided standup context.\n" +
		$"Do NOT add summaries, tables, counts, or extra sections beyond the {questionCount} answers.";

	private const string ContextFieldsBlock = """
        The user message contains a "Standup context" JSON payload. Every value in it is precomputed — do NOT re-derive dates, ordering, or statuses:
        - weeklyGoal: the weekly goal (BigThing) title; may be null
        - yesterday.oneThing: yesterday's "One Thing" (the big thing of the day) with its status; may be null
        - yesterday.others: yesterday's remaining tasks, each with a status
        - today.oneThing: today's "One Thing"
        - today.alsoOnDeck: today's remaining task titles
        - syncMeetings: names of sync meetings on today's calendar
        - upcomingPTO: out-of-office events with title, start, end
        Status meanings: "done" = completed, "skipped" = intentionally skipped, "carried" = not finished and moved to a later day, "notDone" = not completed.
        """;

	private const string OutputStructureLine =
		"Output exactly this structure (use ### for each question heading):";

	private const string QuestionOneBlock = """
        ### Did you complete your One Thing yesterday?
        <opener> — got **<yesterday one thing title>** across the line.

        Smaller stuff: knocked out **<done item title>**, carried **<carried item title>**.

        The first line addresses ONLY yesterday.oneThing. Open with exactly the opener line provided in the user message, verbatim, then finish the sentence to match yesterday.oneThing's status. If yesterday.oneThing is null (no opener provided), open with one short neutral line saying nothing was tracked yesterday.
        Then a BLANK LINE, then a "Smaller stuff:" line summarizing yesterday.others — describe "carried" items as carried. Omit the "Smaller stuff:" line entirely when yesterday.others is empty.
        """;

	private const string QuestionTwoBlock = """
        ### What's the One Thing you will complete today in service of the weekly goal?
        **<today one thing title>**, feeding the weekly goal of **<weeklyGoal>**.

        Also on deck: <alsoOnDeck titles>, plus syncs: <syncMeetings>.

        The first line is ONLY today.oneThing tied back to the weekly goal — use the exact weeklyGoal value from the context, never a goal from an example. If weeklyGoal is null, omit the weekly-goal clause entirely; do not invent one.
        Then a BLANK LINE, then "Also on deck:" listing today.alsoOnDeck.
        If syncMeetings is non-empty, fold them into the "Also on deck:" line as syncs (e.g. ", plus syncs: Ali / Jared"). Do not repeat a sync that already appears as a task, and do not invent syncs when syncMeetings is empty.
        """;

	private const string PtoQuestionBlock = """
        ### Do you have any upcoming PTO or unavailability the team should know about?
        OOO Jul 24 – Jul 30 (Family Time).

        If upcomingPTO has entries, answer from it: one fragment per entry formatted "OOO {Mon D} – {Mon D}" from the start/end dates, with the title (leading emoji stripped) in parentheses when it adds context; join multiple entries with "; ". If upcomingPTO is empty, answer exactly "No".
        """;

	private const string LearningQueueFieldsBlock = """
        Learning queue item fields (provided separately, may be empty):
        - title: name of the resource
        - url: link to the resource
        - type: "Experiment" = hands-on experiment, "Read"/"Watch"/"Learn" = consumed content
        - worthSharing: true if marked as worth sharing to the team
        - notes: the user's findings/takeaways
        """;

	private const string QuestionFourBlock = """
        ### What's one experiment, improvement, or lesson from this week that helped you (or could help the team)?
        This week I tried **<title>** — <revised notes as a concise value prop>. Worth checking out: <url>

        Bonus points for a Loom video showing it!

        For this 4th question, use the learning queue data provided:
        1. PRIORITY: "Experiment" type items always take precedence — these are hands-on experiments the user ran.
        2. FALLBACK: If no experiments, use items where worthSharing = true.
        3. If neither exists, simply return "Nothing noted this week."

        When using a learning queue item:
        - Bold the item title.
        - Revise the user's notes for clarity — tighten the language, highlight the value prop, make it useful for teammates who haven't seen the resource.
        - Include the URL as a link if available.
        - Keep it to 2-3 sentences max.
        """;

	private static string StyleRules(int maxWords) => $"""
        Style rules:
        - Write in first person. This gets pasted into Geekbot.
        - Bold task names and the weekly goal with **markdown bold**.
        - Keep answers short — lead with the key item, not a full sentence. Fragments are fine.
        - Do NOT repeat the questions word-for-word if you can keep it clear without them.
        - Under {maxWords} words total.
        """;
}
