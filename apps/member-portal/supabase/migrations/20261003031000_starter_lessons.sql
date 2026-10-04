-- 20261003031000_starter_lessons.sql
--
-- Twelve DRAFT starter lessons for the learning catalog: three per track.
--
-- STATUS: DRAFT, UNPUBLISHED. Every row is inserted with is_published = false,
-- so no one outside staff can see any of it: learning_modules_anon_read
-- returns only published lessons, and learning_modules_authenticated_read
-- returns published lessons to members and every row to any staff role
-- (private.is_staff(), 20260921214522). Staff of every role, support included,
-- can therefore read the drafts; only editor and above can change them. Staff
-- review, edit and publish each lesson themselves; this migration publishes
-- nothing.
--
-- PROVENANCE: drafted by Claude Code (an AI assistant) on 2026-10-03 for staff
-- review. Not reviewed by any attorney, accountant, financial professional or
-- subject-matter expert. Treat every body as draft copy awaiting human review
-- (CURRENT_INTERNAL_MODEL), not as verified material.
--
-- CONTENT LIMITS the drafts were written to -- keep them when editing:
--   - General education only. No financial, legal, tax, investment or
--     insurance advice. Estate and trust questions are referred to a qualified
--     professional.
--   - No product, company, carrier, app or brand names.
--   - No income, return or outcome guarantees.
--   - No statistics and no citations (none could be verified while drafting).
--   - No claims about The Excellence District's own programs.
--   - Light Markdown only (## headings, paragraphs, "- " bullets, "1. " lists).
--     Bodies are rendered as React text by parseBody() in src/logic/text.ts:
--     no links, no HTML, no tables.
--
-- IDEMPOTENT AND NON-DESTRUCTIVE: ON CONFLICT (id) DO NOTHING. Re-running this
-- never overwrites a lesson staff have since edited and never publishes one.
--
-- Depends on: the learning_tracks seed (20260921214125) and the
-- learning_modules.body column (20261003030000).

insert into public.learning_modules
  (id, track_id, title, summary, content_type, content_url, body, sort_order, is_published)
values

-- ---------------------------------------------------------------------------
-- Money & Credit Systems
-- ---------------------------------------------------------------------------
(
  'mcs-01-money-map',
  'money-credit-systems',
  'Mapping Where Your Money Goes',
  'Learn a simple, judgement-free way to see where your money actually goes each month.',
  'lesson',
  null,
  $body$A money map is a plain picture of what comes in and what goes out. It is not a budget yet, and it is not a report card. The goal is to see clearly, so that any choices you make later are based on what really happens rather than on guesses.

## Why tracking comes first

Most of us have a rough sense of our spending, but memory is selective. Small purchases are easy to forget, and occasional bills can surprise us. Writing things down for a short period turns a vague feeling into information you can work with.

## How to build your map

1. Pick a time window, such as the next thirty days or the last full month.
2. List every source of money coming in, with the date it usually arrives.
3. List what goes out. Use whatever records you already have, such as statements, receipts or notes on your phone.
4. Group spending into a handful of broad categories, for example housing, food, transport, debt payments, family and personal.
5. Note which items are fixed (the same each month) and which change.

A few broad categories are easier to maintain than a long list you abandon after a week.

## Tracking, not judging

When you look at the map, you may feel pride, worry or something in between. All of that is normal. Try to describe what you see without labeling it good or bad. "Food was higher than I expected" is useful. "I am terrible with money" is not, and it tends to make people stop looking.

If a number surprises you, get curious. Was it a one-off, a season, or a habit you want to keep?

## Keeping it going

A map is most useful when it is current. Set a short, regular time each week to update it. Missing a week is fine; pick it back up the next.

## Try this

For the next seven days, write down every purchase on the day you make it, with the amount and one word for the category. At the end of the week, read the list once and write one sentence about what you noticed.

## Key takeaways

- A money map shows what is happening; decisions come later.
- Simple categories and a short weekly habit beat a perfect system you do not use.
- Describe what you see without judging yourself.$body$,
  10,
  false
),
(
  'mcs-02-credit-reports-scores',
  'money-credit-systems',
  'How Credit Reports and Scores Work',
  'A general overview of what a credit report contains, what credit scores try to measure, and how to check your own report for errors.',
  'lesson',
  null,
  $body$Credit reports and credit scores often come up when someone applies to borrow money or rent a home. This lesson explains the general ideas so you can read your own information with more confidence.

## Reports and scores are different things

A credit report is a record of how you have used credit. It usually lists your accounts, their balances and limits, your payment history, and recent applications for credit. It may also include personal details such as names and addresses you have used.

A credit score is a number calculated from the information in a report. Different scoring models exist, so you may have several scores at once, and they may not match.

## What scores generally look at

Exact formulas are generally not published, but models commonly consider factors like these:

- Whether payments have been made on time.
- How much of your available credit you are using.
- How long you have had credit.
- How many recent applications for new credit you have made.
- The types of credit you have.

Because models weigh things differently, no one can honestly promise you a particular score or change. Be cautious of anyone who does.

## Checking your own report

Reviewing your own report is a good habit. Look up the official way to request your report where you live; in many places there is a way to get it at no cost. When you read it, ask:

1. Are your name, addresses and other personal details correct?
2. Do you recognize every account listed?
3. Are balances and payment records accurate?
4. Are there applications for credit you did not make?

If something looks wrong, the organization that produced the report usually has a process for questioning it. Keep copies of what you send and receive. Accounts you do not recognize deserve prompt attention, since they can be a sign that someone else is using your details.

## Try this

Find out how to request your own credit report where you live, and write down the steps. If you choose to request it, read it once using the four questions above.

## Key takeaways

- A report is the record; a score is a number calculated from that record.
- Scoring models differ, so there is no single score and no guaranteed result.
- Checking your own report helps you spot errors and possible misuse early.$body$,
  20,
  false
),
(
  'mcs-03-buffer-and-spending-plan',
  'money-credit-systems',
  'Building an Emergency Buffer and a Spending Plan',
  'How to set aside a small cushion for surprises and give each month of income a simple plan.',
  'lesson',
  null,
  $body$Unexpected costs are part of life: a repair, a medical bill, a gap between paychecks. An emergency buffer is money set aside for those moments, so a surprise does not have to become a crisis. A spending plan is a simple decision, made ahead of time, about where the month's money will go. The two work together.

## Start with your money map

A plan works best when it is built on what actually happens. Use your tracked spending if you have it; otherwise start with your best estimate and adjust as you learn.

## A simple spending plan

1. Write down the income you expect this month.
2. List the fixed costs that must be paid, such as housing, utilities and minimum debt payments.
3. Set amounts for the costs that change, such as food and transport.
4. Choose an amount, even a small one, to put toward your buffer.
5. Whatever is left can go to goals or personal spending you value.

The plan is a starting point you will adjust, not a test. If a category runs over, that is information, not failure. Move money from another category or adjust next month.

## Building the buffer

- Pick a first target that feels reachable. A small, specific number is easier to commit to than a large, vague one.
- Keep the buffer separate from your everyday spending money, so it is less tempting to use for things that are not emergencies.
- Add to it regularly, even in small amounts. Consistency matters more than size at the start.
- Decide in advance what counts as an emergency for you.
- If you use the buffer, that is what it is for. Rebuild it when you can.

Everyone's situation is different. If you are unsure how to balance a buffer with debt payments or other goals, a qualified, independent professional can help you think through your own circumstances.

## Try this

Write a one-page spending plan for next month using the five steps above. Include a buffer line, even if the amount is small, and write down your first buffer target.

## Key takeaways

- A buffer gives you room to handle a surprise without starting from nothing.
- A spending plan is a decision made ahead of time, and it is meant to be adjusted.
- Small, regular steps are a realistic way to begin.$body$,
  30,
  false
),

-- ---------------------------------------------------------------------------
-- AI & Automation
-- ---------------------------------------------------------------------------
(
  'ai-01-what-ai-can-and-cannot-do',
  'ai-automation',
  'What AI Tools Can and Cannot Do',
  'A plain-language look at where AI tools help, where they make mistakes, and how to protect private information when you use them.',
  'lesson',
  null,
  $body$AI tools that write, summarize or answer questions can be genuinely useful. They also make mistakes that are easy to miss. Knowing both sides helps you use them well.

## What they tend to do well

- Drafting a first version of a message or summary for you to edit.
- Rewording text to be shorter, clearer or more formal.
- Brainstorming lists of ideas, questions or options.
- Explaining a general concept in simpler terms.
- Helping organize rough notes into a structure.

## Where they fall short

AI tools produce text that sounds confident whether or not it is correct. They can state wrong facts, invent sources or quotes, misread numbers, and miss context a person would catch. They also reflect patterns in the material they learned from, and that material can include bias.

This means an AI answer is a draft, not a fact. Treat it like a quick answer from a stranger: possibly helpful, always worth checking.

## Verify what matters

Before you rely on an AI output, ask:

1. Is anything here a fact, name, number or date I need to confirm?
2. Can I check it against a source I trust?
3. Does it actually answer my question, or does it only sound like it does?
4. Would I be comfortable putting my name on this?

The more important the decision, the more carefully you should check.

## Protect private information

Many AI tools send what you type to a service run by someone else. Unless you know exactly how a tool handles your data, and you are allowed to use it for that purpose, do not paste in sensitive information. That includes identification numbers, account details, passwords, health information, and any personal details about clients, customers, colleagues or family members. When in doubt, leave it out, or replace real details with made-up placeholders.

## Try this

Ask an AI tool to explain a topic you already know well, using no private details. Read the answer slowly and mark anything that is wrong, missing or overstated. Notice how confident the wrong parts sound.

## Key takeaways

- AI tools are useful for drafts and ideas, not as a final source of truth.
- Check facts, numbers and names before you rely on them.
- Never paste sensitive personal or client information into a tool unless you know it is permitted and safe.$body$,
  10,
  false
),
(
  'ai-02-automate-one-task',
  'ai-automation',
  'Automating One Repetitive Task',
  'A step-by-step way to pick one repetitive task, map it, and automate a small part of it while keeping a person in the loop.',
  'lesson',
  null,
  $body$Automation means letting a tool handle steps you would otherwise repeat by hand. Done well, it frees up time and reduces small errors. Done hastily, it can repeat a mistake many times before anyone notices. The safest way to begin is with one task and one small step.

## Choose the right first task

Good candidates are tasks that:

- Happen often, such as daily or weekly.
- Follow the same steps each time.
- Have a clear start and a clear finish.
- Would cause only minor problems if something went wrong.

Avoid starting with anything that moves money, involves legal documents, or sends messages to other people. Those deserve more experience and more checks.

## Map the steps before you automate

Write the task out as a numbered list, exactly as you do it today. Include where information comes from, what you do with it, and where it ends up. For example:

1. Collect the week's notes from one folder.
2. Rename each file using the same pattern.
3. Copy the key details into a tracking sheet.
4. Review the sheet for anything unusual.

Mapping often reveals steps that can be simplified or dropped entirely. Sometimes the best improvement is a clearer process, not a new tool.

## Start small

Pick one step from your map to automate, not the whole thing. Many everyday tools, such as spreadsheets, templates, filters and calendar reminders, already include simple automation features. Run the automated step alongside your manual process for a while so you can compare the results.

## Keep a human check

Decide where a person reviews the result before it matters. In the example above, step four stays human. Write down what you are checking for and what to do if something looks wrong. Also note how to turn the automation off.

## Try this

Pick one task you repeat every week. Write its steps as a numbered list, circle the single step that is most repetitive and least risky, and mark where a human check belongs.

## Key takeaways

- Map the task first; the map often improves the process on its own.
- Automate one small, low-risk step, and compare it with the manual way.
- Keep a person reviewing results, and know how to switch the automation off.$body$,
  20,
  false
),
(
  'ai-03-responsible-ai-at-work',
  'ai-automation',
  'Using AI Responsibly at Work',
  'Practical habits for using AI tools at work with honesty, accuracy, fairness and your own judgement in charge.',
  'lesson',
  null,
  $body$Many people now use AI tools at work, and many workplaces are still deciding what they expect. Responsible use protects you, the people you serve, and the trust others place in your work. A few habits go a long way.

## Know the rules and be open about your use

Start by finding out what your workplace allows. Some organizations have written policies; others have none yet. If you are unsure, ask. Where it matters, be honest that AI helped produce a piece of work. Presenting AI output as entirely your own, when others would expect to know, can damage trust once it comes to light.

## Own the accuracy

You are responsible for what you hand in, whether or not a tool drafted it. Check facts, figures, names and quotations. Read the full output, not just the first paragraph. If you cannot verify something, remove it or say clearly that it is unconfirmed.

## Watch for bias

AI tools learn from large amounts of existing text, and that text carries the unfairness of the world it came from. Outputs can reflect stereotypes about people based on race, gender, age, disability, background or other traits. Be especially careful when AI is involved in anything that affects people, such as hiring, evaluations, customer decisions or access to services. Ask whether the result would be fair to everyone it touches.

## Keep your own judgement in charge

AI can offer options, but it cannot weigh your values, your relationships or the full context of your situation. Use it to widen your thinking, then decide for yourself. If a suggestion feels wrong, take that feeling seriously and look closer.

## Protect what is not yours to share

Workplace information often belongs to your employer, your clients or your colleagues. Do not paste confidential, personal or client data into a tool unless your workplace has approved that tool for that purpose.

## Try this

Write a short personal checklist, no more than five lines, to run through before you use AI output at work. Include at least one line each for disclosure, accuracy and fairness.

## Key takeaways

- Learn your workplace's rules, and be open about AI use where it matters.
- You remain responsible for the accuracy and fairness of the final work.
- Use AI to support your judgement, never to replace it.$body$,
  30,
  false
),

-- ---------------------------------------------------------------------------
-- Business Systems
-- ---------------------------------------------------------------------------
(
  'bs-01-write-a-simple-process',
  'business-systems',
  'Writing a Simple Process',
  'How to turn a task you already do into a clear checklist or standard operating procedure that someone else could follow.',
  'lesson',
  null,
  $body$A written process, sometimes called a standard operating procedure or SOP, is simply a set of steps for doing a task the same way each time. It does not need to be long or formal. A good one-page checklist is often more useful than a thick manual nobody opens.

## Why write it down

- You do not have to remember every step, especially for tasks you do rarely.
- Someone else can help or take over without guessing.
- Mistakes become easier to spot, because you can see which step was missed.
- You have something concrete to improve over time.

## How to write one

1. Pick one task that matters and that you do repeatedly.
2. Do the task once while writing down each step as you go, in the order you do it.
3. Start each step with an action word, such as open, check, save or confirm.
4. Note anything a newcomer would need: where files live, who to ask, and what "done" looks like.
5. Mark the steps where mistakes are most likely or most costly, and add a quick check there.
6. Give it a title, a date, and the name of the person who keeps it current.

## Test it with someone else

The real test is whether another person can follow it. Ask someone to read it, or better, to try it. Every question they ask points to a gap. Fill the gaps, then try again.

## Keep it alive

Processes go out of date as tools and situations change. When a step changes, update the document and its date right away. Review it every few months, even if nothing seems different.

## Keep it simple

If a process is getting long, consider splitting it into smaller checklists. If a step says "use your judgement", say what to consider. Clear and short beats complete and unread.

## Try this

Choose one task you do at least weekly. Write it as a numbered checklist of no more than ten steps, then ask one person to read it and tell you where they would get stuck.

## Key takeaways

- A process is a set of steps written clearly enough for someone else to follow.
- Test it with another person and fix the gaps they find.
- Date it, name an owner, and update it as things change.$body$,
  10,
  false
),
(
  'bs-02-track-what-matters',
  'business-systems',
  'Tracking What Matters',
  'Choose a few honest measures for your work or business and review them in a short weekly routine.',
  'lesson',
  null,
  $body$It is easy to track too much, or to track what feels good rather than what is true. A few honest measures, reviewed regularly, can tell you more than a crowded dashboard.

## Start with the question

Before choosing a measure, write down the question you want answered. For example: Are customers coming back? Are we finishing work on time? Is the money coming in covering what goes out? A measure is only useful if it helps answer a real question.

## Choose a few honest measures

- Pick three to five measures to start. You can add more later if you truly need them.
- Prefer measures you can record reliably. A number that depends on guesswork is weak evidence.
- Include at least one measure that might bring bad news. If every measure always looks good, it is probably not telling you much.
- Write down exactly how each measure is counted, so it means the same thing every week.

## Record what actually happened

Write down the real number, even when it is disappointing. If a number is missing, record it as missing rather than filling in a guess or a zero. Gaps are information too: they tell you something about how your data is being collected.

## A simple weekly review

Set aside the same short time each week. Then:

1. Update each measure with this week's number.
2. Compare it with the last few weeks. Look for direction, not perfection.
3. Ask what might explain any change. Write down your best guess, and label it as a guess.
4. Choose one small action for the coming week, or decide that no change is needed.
5. Note the action, so next week you can see whether it helped.

Deciding that no change is needed is a legitimate outcome. Not every week calls for a new initiative.

## Try this

Write down one question about your work or business that you want answered. Choose up to three measures that would help answer it, define how each one is counted, and record this week's numbers.

## Key takeaways

- Start with a real question, then pick a few measures that answer it.
- Record actual results, including bad news and missing data.
- A short, regular review turns numbers into small, deliberate decisions.$body$,
  20,
  false
),
(
  'bs-03-respectful-follow-up',
  'business-systems',
  'Customer Follow-Up That Respects People',
  'Build a follow-up habit that keeps your promises to customers, starts with consent, and never turns into spam.',
  'lesson',
  null,
  $body$Following up is one of the most valuable things a business can do, and one of the easiest to get wrong. Done well, it shows people you remember them and keep your word. Done badly, it feels like pressure or noise. A good system makes the respectful choice the easy one.

## Begin with consent

Only contact people in the ways they have agreed to, and only about what they agreed to. If someone gave you their number for a delivery update, that is not permission to add them to a sales list. Ask clearly, record what each person agreed to and when, and make it simple for them to change their mind. Rules about contacting people differ by place and by method, so learn the ones that apply to you, and ask a qualified professional if you are unsure.

## Follow up on purpose

Each follow-up should have a reason that matters to the other person, such as:

- Confirming something you promised.
- Checking that a product or service worked as expected.
- Answering a question they raised.
- Sharing something they specifically asked to hear about.

If you cannot name the reason, it may be better not to reach out.

## A simple system

1. Keep one list of people you have promised to follow up with, what you promised, and by when.
2. Record each person's contact preferences and consent next to their name.
3. Review the list on a set day each week.
4. After each contact, note what happened and whether another follow-up is needed.
5. When someone asks you to stop, stop, and update your records the same day.

## What respectful looks like

- Short messages that get to the point.
- Reasonable spacing between contacts.
- An easy way to say no, or not now.
- No false urgency and no guilt.
- Personal details kept private and secure.

## Try this

Think of the last five people you meant to follow up with. For each one, write down what you promised, whether they agreed to be contacted that way, and the one useful reason you would contact them now.

## Key takeaways

- Consent comes first, and people can withdraw it at any time.
- Every follow-up should have a reason that helps the other person.
- A simple weekly list keeps promises from slipping without crossing into spam.$body$,
  30,
  false
),

-- ---------------------------------------------------------------------------
-- Leadership & Legacy
-- ---------------------------------------------------------------------------
(
  'll-01-leading-yourself-first',
  'leadership-legacy',
  'Leading Yourself First',
  'Why leadership starts with your own habits and commitments, and how to keep the promises you make to yourself.',
  'lesson',
  null,
  $body$Before we lead a team, a family or a community, we lead ourselves. People notice whether our actions match our words. Leading yourself is not about being perfect. It is about being honest with yourself, keeping your commitments, and recovering well when you fall short.

## Commitments are promises

Every time you say you will do something, you make a small promise. When you keep it, trust grows, including your trust in yourself. When you break promises often, even small ones, people learn to discount your word, and so do you.

A useful habit is to make fewer, clearer commitments. Before you say yes, ask: Do I have the time? Do I understand what is being asked? Am I willing to do it well?

## Build habits that support you

Habits are things you do without deciding each time. A few steady ones can carry you through hard weeks.

- Start very small. A habit you can keep on a hard day is better than an ambitious one you abandon.
- Attach a new habit to something you already do, such as your morning routine.
- Track it honestly. A day you missed is a day you missed; the record is only useful if it is true.
- Return quickly after a break. One missed day does not undo a habit, but a long gap makes it harder to restart.

## Plan your week on purpose

Once a week, look ahead. Write down your most important commitments, set aside time for them, and decide what you will say no to. At the end of the week, look back. What did you keep? What slipped, and why?

## When you fall short

You will sometimes miss a commitment. Own it plainly, tell anyone affected as early as you can, and decide what you will do differently. Skip long explanations and harsh self-talk; both get in the way of the next step.

## Try this

Choose one small daily habit that supports a goal you care about. Write it as a single sentence, decide when it will happen, and keep a simple yes or no record for the next seven days.

## Key takeaways

- Leading others starts with keeping the promises you make, including to yourself.
- Small, honest habits are easier to keep than big ones.
- When you fall short, own it, communicate early, and adjust.$body$,
  10,
  false
),
(
  'll-02-stewardship-family-money-values',
  'leadership-legacy',
  'Stewardship and Family Conversations About Money Values',
  'How to start calm, respectful family conversations about what money means to each of you and what you hope to pass on.',
  'lesson',
  null,
  $body$Stewardship means caring well for what has been placed in your hands, whether that is money, property, time, skills or relationships. Many families find money hard to talk about. Talking openly about shared values can help family members understand one another. This lesson is about values and conversation, not about legal or financial arrangements.

## Start with values, not numbers

A first conversation does not need figures, accounts or documents. Begin with questions such as:

- What did you learn about money growing up?
- What does being responsible with money mean to you?
- What would you like our family to be known for?
- What do we want to give, share or pass on, beyond money?

Listening matters more than agreeing. People's views come from real experiences, and those experiences deserve respect.

## Setting up a good conversation

1. Choose a calm time, not the middle of a disagreement or a crisis.
2. Explain the purpose at the start: understanding each other, not making decisions today.
3. Let everyone speak, including younger family members in ways suited to their age.
4. Take simple notes on the values people share, so you can return to them.
5. End by agreeing on when you might talk again.

## Keep it respectful

- Speak about your own views rather than judging other people's choices.
- Avoid reopening old conflicts unless everyone is ready.
- Respect privacy; not every detail needs to be shared with everyone.
- It is fine to pause and come back another day.

## When questions become technical

Conversations about values often lead to practical questions about wills, trusts, estates, taxes or how property is held. Those questions depend on your specific situation and on the law where you live. This lesson does not give legal, tax or financial advice. For estate or trust questions, consult a qualified professional, such as a licensed attorney, who can advise on your own circumstances.

## Try this

Write down your own answers to the four questions above. If it feels right, invite one family member to share their answers with you, and simply listen.

## Key takeaways

- Stewardship is about caring well for everything you have been given, not only money.
- Values conversations work best when they are calm, respectful and focused on listening.
- For estate, trust, tax or legal questions, consult a qualified professional.$body$,
  20,
  false
),
(
  'll-03-community-service-mentorship',
  'leadership-legacy',
  'Building Community Through Service and Mentorship',
  'How serving others and sharing what you know can strengthen a community, and how to start in a way that fits your life.',
  'lesson',
  null,
  $body$Communities grow stronger when people share their time, skills and experience. Service and mentorship are two of the most direct ways to do that. Neither requires a title or lots of free time. Both require attention, reliability and respect for the people you serve.

## Service starts with listening

The most helpful service meets a real need. Before offering help, ask what people actually need, and listen to the answer. What you assume is needed may differ from what people would choose for themselves. Serving well means supporting people's own goals, not replacing them with yours.

## Ways to serve

- Offer a skill you already have, such as organizing, cooking, teaching or fixing things.
- Support an existing community effort rather than starting a new one, at least at first.
- Show up consistently. A modest commitment kept over time often helps more than a large one kept once.
- Be honest about what you can and cannot do.

## What mentorship involves

A mentor shares experience and perspective to help someone else grow. Good mentorship is a relationship, not a lecture. It tends to include:

1. Clear expectations about how often you will meet and what you will focus on.
2. Questions that help the other person think, more than answers that tell them what to do.
3. Honest feedback, given with care.
4. Respect for the other person's choices, even when you would choose differently.
5. Confidentiality about what they share, within the limits of keeping people safe.

Mentorship flows both ways: you will often learn as much as you teach. It is also worth having mentors of your own.

## Keep boundaries healthy

Serving others should not cost you your health or your other commitments. Know your limits, and say so. If someone needs help beyond your experience, such as medical or legal help, point them toward a qualified professional rather than filling that role yourself.

## Try this

Write down one skill or experience you could share, and one person or group who might value it. Then write one small, specific way you could offer it in the next month, and ask them whether it would actually help.

## Key takeaways

- Good service starts by listening to what people actually need.
- Consistency and reliability matter more than size.
- Mentorship is a two-way relationship built on questions, honesty and respect.$body$,
  30,
  false
)

on conflict (id) do nothing;
