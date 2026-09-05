
- monorepo.
- postgresql
- andrew-programming-standard are laws
- exercises should be in the same page as the content (reduce extraneous load). "Remember" and "Understand" exercises should cite the relevant parts of the text, easy gotos. "Apply" and "Analyze" exercises should not.
- Some textbooks should permanently have certain objects displayed. E.g., all chemistry exercises should just have the periodic table around.
- Anytime there is an important equation, there should automatically be some questions about the relationships of the variables in the equation (and don't show the equation). 
- The exercises UI should float. For recall based questions, the text should be hidden...!
- Most data types can use a generated-by field with values: AI, admin, ...
- Walking the full concept tree when a question is answered correctly is expensive. A 9th grade math concept probably depends on 2nd grade multiplication, walking 7 grades worth of concepts is super expensive. So we could store a "propagated downwards" field on each node...
- Not every concept needs exercises. And concepts can be learned without an exercise mapping directly to it, because concept can be thought of as a set (downward closure of lattice). I.e., the DAG has a partial order of inclusion on it.
- Each course should map to a DAG. A global DAG is never constructed, only walked dynamically when needed.
- When showing the user's DAG, maybe we should search for the "next thing". 

- There is always a "Why" to each concept. Some concept's "why" serves mainly to understand other concepts, but eventually they should be a real-life connection point.