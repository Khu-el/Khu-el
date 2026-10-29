-- 20261029160000_founder_90_day_lessons.sql
--
-- Four DRAFT lessons for the Business Systems track, plus one INACTIVE
-- opportunity pathway that points members at them: a 90-day sequence of one
-- priority, a one-sentence offer, a clear picture of what the plan needs, and
-- three back-to-back 30-day plans.
--
-- STATUS: DRAFT, UNPUBLISHED, INACTIVE. Every lesson is inserted with
-- is_published = false and the pathway with is_active = false, so no member
-- and no anonymous visitor can see any of it (learning_modules_*_read return
-- only published lessons outside staff; opportunity_pathways_public_read
-- returns only active pathways). Staff review, edit, publish and activate each
-- row themselves in the Content Studio; this migration publishes nothing.
--
-- PROVENANCE: drafted by Claude Code (an AI assistant) on 2026-10-29 for staff
-- review, at the principal's instruction. The four-step shape (focus, offer,
-- what the plan needs, execution) was suggested by a public reference site
-- reviewed that day; every word below is original. Not reviewed by any
-- attorney, accountant, financial professional or subject-matter expert.
-- Treat every body as draft copy awaiting human review
-- (CURRENT_INTERNAL_MODEL), not as verified material.
--
-- CONTENT LIMITS -- the same ones 20261003031000_starter_lessons.sql was
-- written to; keep them when editing:
--   - General education only. No financial, legal, tax, investment or
--     insurance advice. Raising money from other people is referred to a
--     qualified professional; nothing here tells a member to seek investors.
--   - No product, company, carrier, app or brand names.
--   - No income, return or outcome guarantees.
--   - No statistics and no citations.
--   - No claims about The Excellence District's own programs.
--   - Light Markdown only (## headings, paragraphs, "- " bullets, "1. " lists),
--     rendered as React text by parseBody() in src/logic/text.ts.
--
-- WHY THREE 30-DAY PLANS, NOT ONE 90-DAY PLAN: action_plan_weeks.week_number
-- is constrained to 1-4 and src/logic/plans.ts runs a plan to day 30. A
-- 90-day plan would be a schema change; this sequence uses what exists.
--
-- IDEMPOTENT AND NON-DESTRUCTIVE: ON CONFLICT (id) DO NOTHING. Re-running this
-- never overwrites a row staff have since edited, and never publishes or
-- activates one.
--
-- Depends on: the business-systems track (20260921214125) and the
-- learning_modules.body column (20261003030000).

insert into public.learning_modules
  (id, track_id, title, summary, content_type, content_url, body, sort_order, is_published)
values
(
  'bs-04-one-priority-for-90-days',
  'business-systems',
  'Choosing One Priority for the Next 90 Days',
  'How to pick the single result that matters most for the next three months, and how to set the rest aside without losing it.',
  'lesson',
  null,
  $body$Ninety days is long enough to finish something real and short enough to stay focused. The hard part is not finding things to work on. It is choosing one result that matters more than the rest, and letting the others wait.

## Why one priority

When everything is a priority, effort spreads thin and little gets finished. One clear priority gives you a simple test for each week: does this move the main result forward? It also makes it easier to say no, or not yet, to good ideas that arrive at the wrong time.

Choosing one priority does not mean you stop everything else. Daily responsibilities continue. It means that when you have spare time and energy, you know where it goes.

## How to choose

1. Write down every result you would like to see in the next three months. Do not filter yet.
2. For each one, ask: if this were done, would several other items become easier or unnecessary?
3. Cross out anything that depends on another item being finished first.
4. From what remains, pick the one that would make the biggest difference if it were the only thing you finished.
5. Write it as a result, not an activity. "Ten paying customers" is a result. "Work on marketing" is an activity.

## Make it checkable

A good priority lets you say yes or no on day 90: done, or not done. If you cannot tell, make it more specific. Add a number, a date, or a clear description of what "finished" looks like.

## Park the rest

Keep the items you did not choose on a separate list. Nothing is lost; it is only scheduled for later. Review the list at the end of the 90 days, when you choose the next priority.

## Try this

Spend fifteen minutes on steps 1 to 5 above. Write your one priority on a single line, then write how you will know on day 90 whether it is done.

## Key takeaways

- One priority makes every weekly choice simpler.
- State it as a result you can check, not an activity.
- Park other ideas on a list instead of dropping them.$body$,
  40,
  false
),
(
  'bs-05-describe-your-offer',
  'business-systems',
  'Describing What You Offer in One Sentence',
  'How to say who you help, with what, and what changes for them, clearly enough that a stranger understands it the first time.',
  'lesson',
  null,
  $body$If people cannot tell what you offer, they cannot decide whether they want it. A one-sentence description is a tool for clarity, first for you and then for the people you serve. It is not a slogan, and it does not need to be clever.

## The three parts

A clear offer sentence usually answers three questions:

- Who is it for?
- What do you provide?
- What is different for them afterwards?

For example: "I help small restaurant owners set up a simple weekly schedule so their staff know their shifts a week ahead." Each part is concrete. A stranger could repeat it back.

## Common problems

- Too broad. "I help people succeed" could mean anything. Name a specific group.
- Too much jargon. If you would need to explain a word, use a plainer one.
- Features instead of change. Describe what is different for the person, not only what you do.
- Promises you cannot keep. Describe what you provide, not a guaranteed outcome. Results depend on many things outside your control.

## Test it

Say the sentence to three people who do not know your work. Ask each one to tell you, in their own words, who it is for and what it does. Where their answers differ from what you meant, the sentence needs work.

## Let it change

Your first version will not be your last. As you talk with the people you serve, you will learn which words make sense to them. Update the sentence when you learn something, and keep the old versions so you can see how your thinking has developed.

## Try this

Write three different versions of your offer sentence. Read each one aloud. Choose the one that is easiest to understand, and test it with one person this week.

## Key takeaways

- A clear offer names who it is for, what you provide, and what changes.
- Plain words beat clever ones.
- Describe what you provide, never a guaranteed result.$body$,
  50,
  false
),
(
  'bs-06-what-your-plan-needs',
  'business-systems',
  'Knowing What Your Plan Needs: How Much, For What, By When',
  'How to list what your 90-day priority will actually cost in money, time and help, before deciding where any of it comes from.',
  'lesson',
  null,
  $body$Many plans stall because the need was never written down. "I need money to get started" is a feeling. "I need a set amount for these three things by this date" is something you can work with. This lesson is about describing the need clearly. Where the resources come from is a separate decision, made later and with care.

## List what the priority requires

Go back to your one 90-day priority. For it to be done, what has to be in place? Think in three kinds of resources:

- Money: equipment, materials, fees, software, travel.
- Time: your hours each week, and anyone else's.
- Help: skills you do not have, people who could advise you, introductions you need.

## For each item, answer three questions

1. How much? Write your best estimate. If you are unsure, write a range and note what would narrow it.
2. For what? Say exactly what it pays for or makes possible.
3. By when? Note the date it is needed. Not everything is needed on day one.

## Separate must-have from nice-to-have

Mark each item as essential to the priority or as something that would help but is not required. Many first versions can start with fewer resources than expected. Ask: what is the smallest version of this priority that would still count as done?

## Before looking outside

Check what you already have: skills, equipment, savings set aside for this purpose, people who might help. Then look at what the work itself could fund as it goes.

If you are thinking about borrowing, or about taking money from other people, slow down. Borrowing creates obligations you must be able to meet. Offering anyone a share of a business or its profits in exchange for money is subject to legal rules. Talk with a qualified professional before making any arrangement of that kind.

## Try this

Make a three-column list for your priority: how much, for what, by when. Mark each line must-have or nice-to-have. Total the must-have lines only.

## Key takeaways

- A need you can describe is a need you can plan for.
- Answer how much, for what and by when for every item.
- Start from what you already have, and get qualified advice before borrowing or taking money from others.$body$,
  60,
  false
),
(
  'bs-07-three-30-day-plans',
  'business-systems',
  'Turning 90 Days into Three 30-Day Plans',
  'How to break one 90-day priority into three monthly stages, each with four weekly actions you can check off.',
  'lesson',
  null,
  $body$A 90-day priority can feel distant on day one. Breaking it into three 30-day stages turns it into something you can act on this week. Each stage has its own small goal, and each week inside it has one action.

## Three stages

A simple way to divide the time:

1. Days 1 to 30: get ready. Settle the priority, write your offer sentence, and list what the plan needs. Finish the setup work.
2. Days 31 to 60: do the core work. Put most of your effort into the main activity that moves the priority forward.
3. Days 61 to 90: finish and review. Close gaps, complete what is left, and look back at what you learned.

Adjust these to fit your priority. The point is that each month has a clear job.

## Four weekly actions per stage

For each 30-day stage, write four actions, one per week. Each action should be small enough to finish in that week and specific enough to check off. "Call five past customers and ask what they needed" is checkable. "Do outreach" is not.

## Start each stage fresh

At the end of each 30 days, stop and review before starting the next stage:

- What got done?
- What did not, and why?
- Does the next stage still make sense, or does it need to change?

Then write the next four weekly actions using what you just learned. Planning one month at a time keeps the plan honest.

## When a week slips

Weeks will slip. When one does, record it as not done rather than pretending otherwise. Then decide: catch up next week, or adjust the stage. An honest record is more useful than a perfect-looking one.

## Try this

Write the goal for each of your three 30-day stages in one line each. Then write the four weekly actions for the first stage only.

## Key takeaways

- Three 30-day stages make a 90-day priority actionable.
- Each week gets one small, checkable action.
- Review at the end of each stage, and plan the next one with what you learned.$body$,
  70,
  false
)

on conflict (id) do nothing;

insert into public.opportunity_pathways
  (id, title, summary, keywords, destination_type, destination_id, sort_order, is_active)
values
(
  'founder-90-days',
  'Your First 90 Days as a Founder',
  'A four-lesson sequence: one priority, a one-sentence offer, what your plan needs, and three 30-day plans.',
  array['founder','launch','offer','priority','quarter','90','blueprint','founding'],
  'learning_track',
  'business-systems',
  35,
  false
)
on conflict (id) do nothing;
