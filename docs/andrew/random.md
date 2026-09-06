
- monorepo.
- postgresql
- andrew-programming-standard are laws
- exercises should be in the same page as the content (reduce extraneous load). "Remember" and "Understand" exercises should cite the relevant parts of the text, easy gotos. "Apply" and "Analyze" exercises should not.
- Some textbooks should permanently have certain objects displayed. E.g., all chemistry exercises should just have the periodic table around. Regular text might also appreciate floats of different diagrams. Maybe the global table should allow users to freely drag in animations of current page (and even prev page through a search func)
- Anytime there is an important equation, there should automatically be some questions about the relationships of the variables in the equation (and don't show the equation). 
- The exercises UI should float. For recall based questions, the text should be hidden...!
- Most data types can use a generated-by field with values: AI, admin, ...
- Walking the full concept tree when a question is answered correctly is expensive. A 9th grade math concept probably depends on 2nd grade multiplication, walking 7 grades worth of concepts is super expensive. So we could store a "propagated downwards" field on each node...
- Not every concept needs exercises. And concepts can be learned without an exercise mapping directly to it, because concept can be thought of as a set (downward closure of lattice). I.e., the DAG has a partial order of inclusion on it.
- Each course should map to a DAG. A global DAG is never constructed, only walked dynamically when needed.
- When showing the user's DAG, maybe we should search for the "next thing". 

- There is always a "Why" to each concept. Some concept's "why" serves mainly to understand other concepts, but eventually they should connect to something about the real-life. Some engineering marvel, some curable disease...
- course-domain-specific rules for how widgets look, what to go in the global object list. Meaning, the ingestion of a textbook should be a interactive and careful process. A few hours of work should be required to set the foundations for how a textbook gets translated.

- Maybe AI grading is important and necessary. Think of computer science exercises. I think "plug your own AI" is a necessary component.
- Open-ended answers in a free-form textbox.
- Bring your own AI (connect to anthropic/openai/gemini, or some other more aggregating service so that it's easy to connect even to a local AI). And think country lockdowns. China can't access American models.
- Maybe it's better if we, for now, just "reveal answer"? And ask if the user did get the same.. Depends on the honesty of users, for curious people this is fine, for kids using this in standard education, no.
- Yea I think bring your own AI is necessary to grade and respond to results.
- AI should probably read the existing images to help make better diagrams? Hm. Also, if we want to just copy-paste over an image from a PDF. How easy is that? I imagine there are such images.
- If the recipes to extracting from AI becomes hard enough and diverse, Omnia is no longer plug-and-play for educators to try converting materials. But that's fine. The core is still the content.

## Textbook->course transformation process
Transforming a book into a course should be an interactive process. Because it is the wielder of the AI who must decide who concepts are to be interactively diagrammed, what kind of domain specific widgets should there be, etc etc.

Now, the agent should first do some routine tasks:
1. Extract the organization strategy (book -> units -> chapters -> sections?)
1. Extract a concept DAG
2. Extract exercises, each tagged with a concept and a mastery level

And we should make the feedback loop tight. The agent should start off with exploring maybe what the DAG and exercises look like for just one section, then one chapter, then a unit, then the whole book (whatever the organization strategy is)