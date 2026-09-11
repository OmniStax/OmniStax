# OmniStax/万象
OmniStax/万象 is a next-gen, local STEM learning platform, which I call an *Integrated Learning Environment* (ILE), mimicing the seamless experience that a programmer feels in an Integrated Development Environment. When you read one of the OmniStax-transformed textbooks, you are dropped into this ILE which comes with an abundance of features.


## Installation
Browser: https://omnistax.andrewchen14250.workers.dev/

I recommend installing the website as a Progressive Web App since browser-reserved keybindings become available. `Ctrl + W` is how you close a tab in VSCode, and it so should be how you close it in OmniStax.

In the near futuer, I will build this into a true Desktop App. It will probably be Electron-based.

OmniStax is totally local. This means there's no account syncing. But there is easy export/import OmniStax system for now. In the near future I will implement self-hosting options. I do not want to make money off of this by any means because education must be completely open. Donations are welcomed though (todo: setup a link).  


## Contributors: Read This
I strongly welcome PRs - whether it is changes to the OmniStax platform in `omnistax-web` or adding new content to the collection in `omnistax-content`. If you are contributing to `omnistax-content` on the `main` branch, you are adding content to the publicly available https://omnistax.andrewchen14250.workers.dev/, so please ensure you are transforming an open-source text or have the appropriate rights to enhance the text. You are probably using an agent to do the transformation. Read `docs/` for instructions and rules that an agent tasked with making new content will use.

The books can use human reviews! If you catch incoherencies, please report them! Likely, they will be in *AI-written* content, e.g., interactive diagrams, proposed solutions for problems without a key (the default behavior is to omit these problems). They are less likely to be in *AI-extracted* contents like concept map, definition and formula sheet. However, as the books can get large, AI could miss key extraction. Incoherencies are least likely to be found in the text itself, which the book-enhancing agent is asked to keep the original words of.

The future must be more and more open, and it takes folks reading this to contribute.

## AI Agents: Read This
If you are tasked with generating OmniStax textbooks, read `docs/`.

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
1. Static-time eyecandy. Enhance 4 textbooks: Physics, Math, Chem, and CS. Great visuals, interactives, and edtech user experience. Solid `pdf->OmniStax course` extraction pipeline. Basic mastery point system. The selling point of OmniStax is in the UX and interactive simulations.

From this point on, OmniStax should run on donations because the servers will be expensive.

2. Omni. If we have OmniStax courses covering 90% of the (American) highschool through university STEM curriculum, which I think a hundred courses will do. It is time to start thinking beyond textbook-by-textbook conversion and beyond highschool through university STEM.

3. Omniplus. Runtime AI, cross referencing, dynamic evolution, wiki suggestions. Still a few hundred courses, but the relationships between courses get deeper as we explore dependencies between different subjects. As the DAG gets more meaningful, concepts name may need to be updated. 
  2.1. Cross referencing + dynamic evolution: If course A has a prerequisite P that A's text doesn't have exercises for, but later, course B does cover P and has exercises for it, course A could refer and use course B's exercises.
  2.2. Learners will now be able to rank materials (Beli-like algorithm), put suggestions on materials, comment on materials and talk to each other.

4. Responsible experiments with AI: Additional exercises and course content. Advanced "Evaluate" and "Create" level questions that necessitate AI grading. Let's be very careful, my concern is homogenization. Reading diverse content is important for younger learners but AI tends to use the same words and structure. Increasing AI creativity was actually a topic I researched as part of my thesis in 2023, but it was too hard with those early-day puny models so I gave up. As models are getting more logical and their latent space more hundun, I see a potential marriage here. 

5. OmniStax AR. Beyond a screen. Shortest feedback loops. New experience to be considered.he te