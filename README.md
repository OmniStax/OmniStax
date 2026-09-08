# OmniStax/万象
OmniStax/万象 is a next-gen, self-hostable STEM learning platform. Open source textbooks are markdown files. Diagrams are interactive and can be 3D. A low cognitive load experience powered by color-coded definitions, definitions and Diagrams are all interactive. Exercises and a mastery point system provide a curriculum experience.

## OmniStax's content generation process
OmniStax's contents are built from open-source textbook pdfs, primarily from LibreTexts. AI must not alter the tone of the original writing. AI enhances textbooks in the following pipeline:
1. Extract a concept DAG
2. Extract exercises, each tagged with a concept and a mastery level
3. Transform text to markdown
4. Transform diagrams into interactive widgets. Automatically identify diagrams to build for deserving text

Then the OmniStax frontend compiles these processings into a standard curriculum experiences.

## Education Literature OmniStax takes inspiration from
Cognitive Load Theory:
- Extraneous load: Time spent "searching" due to bad organization of the material, e.g., flipping pages because a diagram and its analysis paragraph is split, is time wasted. How we can reduce this load is my original inspiration for making OmniStax Interactive diagrams with inline formulas, color-coded variables, a floating panel to keep all relevant definitions help us cut down on this load.
- Expert Reversal Effect: Worked example is helpful to a novice because it replaces expensive search with a pattern to study. Experts have that pattern already, so that's extraneous load to them and they should focus on solving problems. My emphasis here is that initial problems should serve to adapt learners to the pattern. But as not all textbooks have worked examples, this may not be a common adoption. 
- Diagnose starting state. As I don't want to involve AI graders. I think when a question gets answered correctly, we should theoretically update the full concept DAG.

Bloom's Taxonomy: Remember, Understand, Apply, Analyze, Evaluate, Create helps OmniStax in classifying the quality of an exercise question. We won't involve too many advanced questions that can involve Evaluate and Create until we involve AI graders.

Structure of the Observed Learning Outcome, Biggs and Collis: SOLO is better used to classify responses. But I still takeaway the fact that the important jump in understanding is from multistructural to relationship. I.e., connection. This inspired exercises to map to a set of concepts not just a single concept. 

The Math Academy Way, Justin Skycak: This is a brillant read about how to upskill in general. Mathematics is especially hard and gritty.
- Skill decay is real (so our mastery DAG should have a decay parameter), so spaced repetition is important. 
- Pre-learning is an educational life hack. Positioning OmniStax as a pre-learn tool may inspire more than it as a replacement for textbooks if OmniStax wants to make itself way into the general curriculum.
- Only exercises contribute XP.

## Pipe dream and OmniStax's Roadmap
1. Static-time eyecandy. A dozen courses. Great visuals, interactives, and edtech user experience. Solid `pdf->OmniStax course` extraction pipeline. Basic mastery point system. The selling point of OmniStax is in the UX and interactive simulations.

From this point on, OmniStax should run on donations because the servers will be expensive.

2. Omni. If we have OmniStax courses covering 90% of the (American) highschool through university STEM curriculum, which I think a hundred courses will do. It is time to start thinking beyond textbook-by-textbook conversion and beyond highschool through university STEM.

3. Omniplus. Runtime AI, cross referencing, dynamic evolution, wiki suggestions. Still a few hundred courses, but the relationships between courses get deeper as we explore dependencies between different subjects. As the DAG gets more meaningful, concepts name may need to be updated. 
  2.1. Cross referencing + dynamic evolution: If course A has a prerequisite P that A's text doesn't have exercises for, but later, course B does cover P and has exercises for it, course A could refer and use course B's exercises.
  2.2. Learners will now be able to rank materials (Beli-like algorithm), put suggestions on materials, comment on materials and talk to each other.

4. Responsible experiments with AI: Additional exercises and course content. Advanced "Evaluate" and "Create" level questions that necessitate AI grading. Let's be very careful, my concern is homogenization. Reading diverse content is important for younger learners but AI tends to use the same words and structure. Increasing AI creativity was actually a topic I researched as part of my thesis in 2023, but it was too hard with those early-day puny models so I gave up. As models are getting more logical and their latent space more hundun, I see a potential marriage here. 

5. OmniStax AR. Beyond a screen. Shortest feedback loops. New experience to be considered.he te