# Working notes — teaching preferences

- **Format preferences:** tables/cheat-sheets, quiz/recall drills, diagrams/concept maps. NOT long prose explanations.
- **Context:** Exam-cram mode (3h window on 2026-07-01). Optimise for fast retrieval, not long-term retention.
- **Scope:** "Everything in this folder is the material." Broad — whole conspectus fair game. Exam format modelled on the conspectus's *Mid-term Test 3*: simple choice (5), true/false (5), grouping (5p), essay/graph (5p), surprise (5p).
- **High-yield targets:** the three Grouping timelines (capitalism / current-age / geopolitics), the trade-graph essays (quadrangle, Big & Small Triangle), the chaos equation, and thinker→concept→school matching. True/False hinges on **dates**.
- Source of truth so far = the `.docx` conspectus (extracted to text) + slide screenshots.

## Assets built
- `assets/course.css` — shared Tufte-style print-friendly stylesheet.
- `assets/quiz.css` + `assets/quiz.js` — reusable engine: `GE.mcQuiz`, `GE.flashcards`, `GE.grouping` (instant feedback). `mcQuiz` now also takes `opts.img`/`opts.caption` and per-question `item.img` (study-the-graph MCs).
- `assets/imgquiz.css` + `GE.imgReveal` (in quiz.js) — **image occlusion drill**: numbered blue boxes (`{x,y,w,h}` in %) cover a graph's labels; click to reveal the answer in green. Prints with answers shown. Needs `imgquiz.css`.
- `assets/img/` — clean-named copies of the slide graphs (kebab-case) for reuse in lessons.

## Teaching preferences (user, 2026-07-01)
- Wants **image-based practice/tests** on the actual slide graphs: "what does this graph represent", "which part means what", and **hide-a-part → what's missing**. Delivered via `GE.imgReveal` (occlusion) + `GE.mcQuiz` with images. Lesson 0004 covers 7 graphs; the other images in `assets/img/` (Rostow, VUCA, globalisation spans, long-20th-c timeline, Ágh cycles table, electronic-age waves, postnormal times) are ready to be turned into the same drill on request.
- When placing occluder boxes: verify alignment by previewing (temporarily lower `.spot` opacity) — screenshot tool only refreshes on **navigation** (use a `?v=N#anchor` cache-buster), not on scroll/eval DOM edits.
