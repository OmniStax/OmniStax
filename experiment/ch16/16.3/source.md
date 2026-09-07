# Simple Harmonic Motion: A Special Periodic Motion

## Learning Objectives
By the end of this section, you will be able to:
- Describe a simple harmonic oscillator.
- Explain the link between simple harmonic motion and waves.
The oscillations of a system in which the net force can be described by Hooke’s law are of special importance, because they are very common. They are also the simplest oscillatory systems. {term:Simple Harmonic Motion} (SHM) is the name given to oscillatory motion for a system where the net force can be described by Hooke’s law, and such a system is called a {term:simple harmonic oscillator}. If the net force can be described by Hooke’s law and there is no *damping* (by friction or other non-conservative forces), then a simple harmonic oscillator will oscillate with equal displacement on either side of the equilibrium position, as shown for an object on a spring in [ref:import-auto-id1428057]. The maximum displacement from equilibrium is called the {term:amplitude} $X$. The units for amplitude and displacement are the same, but depend on the type of oscillation. For the object on the spring, the units of amplitude and displacement are meters; whereas for sound oscillations, they have units of pressure (and other types of oscillations have yet other units). Because amplitude is the maximum displacement, it is related to the energy in the oscillation.

:::note [] Take-Home Experiment: SHM and the Marble

Find a bowl or basin that is shaped like a hemisphere on the inside. Place a marble inside the bowl and tilt the bowl periodically so the marble rolls from the bottom of the bowl to equally high points on the sides of the bowl. Get a feel for the force required to maintain this periodic motion. What is the restoring force and what role does the force you apply play in the simple harmonic motion (SHM) of the marble?
:::

> FIGURE {fig:import-auto-id1428057} src=../../media/Figure_17_03_02a.jpg
> alt: The figure a shows a spring on a frictionless surface attached to a bar or wall from the left side. On the right side of the spring, an object attached to it with mass m, its amplitude is given by X, and X is equal to zero at the equilibrium level. Force F is applied to it from the right side, shown with left direction pointed red arrow and velocity v is equal to zero. A direction point showing the north and west direction is also given alongside this figure as well as with other four figures. In figure b, after the force has been applied the object moves to the left compressing the spring a bit. And the displaced area of the object from its initial point is shown in sketched dots. The F here is equal to zero and the v is max in negative direction. In figure c, the spring has been compressed to the maximum level, and the amplitude is negative X. Now the direction of force changes to the rightward direction, shown with right direction pointed red arrow and the velocity v is zero. In figure d the spring is shown released from the compressed level and the object has moved toward the right side up to the equilibrium level. The F is zero, and the velocity v is maximum. In figure e the spring has been stretched loose to the maximum level and the object has moved to the far right. Now again the velocity here is equal to zero and the direction of force again is to the left hand side, shown here as F is equal to zero.
> caption: An object attached to a spring sliding on a frictionless surface is an uncomplicated simple harmonic oscillator. When displaced from equilibrium, the object performs simple harmonic motion that has an amplitude $X$ and a period $T$. The object’s maximum speed occurs as it passes through equilibrium. The stiffer the spring is, the smaller the period $T$. The greater the mass of the object is, the greater the period $T$.

What is so significant about simple harmonic motion? One special thing is that the period $T$ and frequency $f$ of a simple harmonic oscillator are independent of amplitude. The string of a guitar, for example, will oscillate with the same frequency whether plucked gently or hard. Because the period is constant, a simple harmonic oscillator can be used as a clock.
Two important factors do affect the period of a simple harmonic oscillator. The period is related to how stiff the system is. A very stiff object has a large force constant $k$, which causes the system to have a smaller period. For example, you can adjust a diving board’s stiffness—the stiffer it is, the faster it vibrates, and the shorter its period. Period also depends on the mass of the oscillating system. The more massive the system is, the longer the period. For example, a heavy person on a diving board bounces up and down more slowly than a light one.
In fact, the mass $m$ and the force constant $k$ are the *only* factors that affect the period and frequency of simple harmonic motion.

:::note [] Period of Simple Harmonic Oscillator

The *period of a simple harmonic oscillator* is given by

$$ T=2π\sqrt{\frac{m}{k}} $$  {eq:eip-41}

and, because $f=1/T$, the *frequency of a simple harmonic oscillator* is

$$ f=\frac{1}{2π}\sqrt{\frac{k}{m}}. $$  {eq:eip-444}

Note that neither $T$ nor *$f$* has any dependence on amplitude.
:::

:::note [] Take-Home Experiment: Mass and Ruler Oscillations

Find two identical wooden or plastic rulers. Tape one end of each ruler firmly to the edge of a table so that the length of each ruler that protrudes from the table is the same. On the free end of one ruler tape a heavy object such as a few large coins. Pluck the ends of the rulers at the same time and observe which one undergoes more cycles in a time period, and measure the period of oscillation of each of the rulers.
:::

:::example {ex:fs-id1366587} Calculate the Frequency and Period of Oscillations: Bad Shock Absorbers in a Car
If the shock absorbers in a car go bad, then the car will oscillate at the least provocation, such as when going over bumps in the road and after stopping (See [ref:import-auto-id1352637]). Calculate the frequency and period of these oscillations for such a car if the car’s mass (including its load) is 900 kg and the force constant (*$k$*) of the suspension system is $6\text{.}\text{53}\times {\text{10}}^{4}\;\text{N/m}$.
**Strategy**
The frequency of the car’s oscillations will be that of a simple harmonic oscillator as given in the equation $f=\frac{1}{2π}\sqrt{\frac{k}{m}}$. The mass and the force constant are both given.
**Solution**
1. Enter the known values of *k* and *m*:
    

$$ f=\frac{1}{2π}\sqrt{\frac{k}{m}}=\frac{1}{2π}\sqrt{\frac{6\text{.}\text{53}\times {\text{10}}^{4}\;\text{N/m}}{\text{900}\;\text{kg}}}. $$  {eq:eip-686}

2. Calculate the frequency:
    

$$ \frac{1}{2\pi}\sqrt{72.6/{\text{s}}^{2}}=1.3656/{\text{s}}^{1}\approx 1.36/{\text{s}}^{1}=1.36\text{Hz}\text{.} $$  {eq:eip-465}

3. You could use $T=2π\sqrt{\frac{m}{k}}$ to calculate the period, but it is simpler to use the relationship $T=1/f$ and substitute the value just found for $f$:
    

$$ T=\frac{1}{f}=\frac{1}{1\text{.}\text{356}\;\text{Hz}}=0\text{.}\text{738}\;\text{s}. $$  {eq:eip-207}

**Discussion**
The values of $T$ and $f$ both seem about right for a bouncing car. You can observe these oscillations if you push down hard on the end of a car and let go.
:::

## The Link between Simple Harmonic Motion and Waves
If a time-exposure photograph of the bouncing car were taken as it drove by, the headlight would make a wavelike streak, as shown in [ref:import-auto-id1352637]. Similarly, [ref:import-auto-id1177267] shows an object bouncing on a spring as it leaves a wavelike "trace" of its position on a moving strip of paper. Both waves are sine functions. All simple harmonic motion is intimately related to sine and cosine waves.

> FIGURE {fig:import-auto-id1352637} src=../../media/Figure_17_03_03a.jpg
> alt: The figure shows the front right side of a running car on an uneven rough surface which also shows the driver in the driving seat. There is an oscillating sine wave drawn from left to the right side horizontally throughout the figure.
> caption: The bouncing car makes a wavelike motion. If the restoring force in the suspension system can be described only by Hooke’s law, then the wave is a sine function. (The wave is the trace produced by the headlight as the car moves to the right.)

> FIGURE {fig:import-auto-id1177267} src=../../media/Figure_17_03_04a.jpg
> alt: There are two iron paper roll bars standing vertically with a paper strip stitched from one bar to the other. There is a vertical hanging spring just over the middle of the two bars, perpendicular to the strip of the paper, having an object with mass m tied to it. There is a line graph with amplitude scale as X, zero and negative X on the left side of the paper strip, vertically over each other with their points marked. A perpendicular line is drawn through this amplitude scale toward the right with a point T marked over it, showing the time duration of the amplitude. This line has an oscillating wave drawn through it.
> caption: The vertical position of an object bouncing on a spring is recorded on a strip of moving paper, leaving a sine wave.

The displacement as a function of time *t* in any simple harmonic motion—that is, one in which the net restoring force can be described by Hooke’s law, is given by

$$ x(t)=X\;\text{cos}\frac{2πt}{T}, $$  {eq:eip-555}

where $X$ is amplitude. At $t=0$, the initial position is ${x}_{0}=X$, and the displacement oscillates back and forth with a period $T$*.* (When $t=T$, we get $x=X$ again because $\text{cos}\;2π=1$.). Furthermore, from this expression for *****$x$*, the velocity $v$ as a function of time is given by:

$$ v(t)=-{v}_{\text{max}}\;\text{sin}\;(\frac{2πt}{T}), $$  {eq:eip-468}

where ${v}_{\text{max}}=2πX/T=X\sqrt{k/m}$. The object has zero velocity at maximum displacement—for example, $v=0$ when $t=0$, and at that time $x=X$. The minus sign in the first equation for $v(t)$ gives the correct direction for the velocity. Just after the start of the motion, for instance, the velocity is negative because the system is moving back toward the equilibrium point. Finally, we can get an expression for acceleration using Newton’s second law. [Then we have $x(t),\;v(t),\;t,$ and $a(t)$, the quantities needed for kinematics and a description of simple harmonic motion.] According to Newton’s second law, the acceleration is $a=F/m=\text{kx}/m$*.* So, $a(t)$ is also a cosine function:

$$ a(t)=-\frac{\text{kX}}{m}\text{cos}\frac{2πt}{T}. $$  {eq:eip-987}

Hence, $a(t)$ is directly proportional to and in the opposite direction to $x(t)$.
[ref:import-auto-id2429266] shows the simple harmonic motion of an object on a spring and presents graphs of $x(t),v(t),$ and $a(t)$ versus time.

> FIGURE {fig:import-auto-id2429266} src=../../media/Figure_17_03_05a.jpg
> alt: In the figure at the top there are ten springboards with objects of different mass values tied to them. This makes some springs highly compressed some as loosely stretched and some at equilibrium, which are shown as red spherical shaped. Alongside the figure there is a scale given for different amplitude values as x equal to positive X, zero and negative X. the upward and downward pointing arrows are shown with a few springboards.  In the second figure there are three graphs. The first graph shows distance covered in form of a sine wave starting from a point x units on positive y-axis. The height of the wave above x-axis is marked as amplitude. The gap between two consecutive crests is marked as T. Below first graph there is another graph showing velocity in form of a sine wave starting from the origin downward. In the third graph below the second one, acceleration is shown in the form of sine wave starting from x units on the negative y-axis upward. In the last figure three position of a spring are shown. The first position shows the unstretched length of a spring pendulum. A hand is holding the bob of the pendulum. In the second position the equilibrium position of the spring and bob is shown. This position is lower the first one. In the third case the up and down oscillations of the spring pendulum are shown. The bob is moving x units in upward and downward directions alternatively.
> caption: Graphs of $x(t),\;v(t),$ and $a(t)$ versus $t$ for the motion of an object on a spring. The net force on the object can be described by Hooke’s law, and so the object undergoes simple harmonic motion. Note that the initial position has the vertical displacement at its maximum value $X$; $v$ is initially zero and then negative as the object moves down; and the initial acceleration is negative, back toward the equilibrium position and becomes zero at that point.

The most important point here is that these equations are mathematically straightforward and are valid for all simple harmonic motion. They are very useful in visualizing waves associated with simple harmonic motion, including visualizing how waves add with one another.

:::exercise {fs-id2056610} type=check-understanding Check Your Understanding

PROBLEM:
Suppose you pluck a banjo string. You hear a single note that starts out loud and slowly quiets over time. Describe what happens to the sound waves in terms of period, frequency and amplitude as the sound decreases in volume.
SOLUTION:
Frequency and period remain essentially unchanged. Only amplitude decreases as volume decreases.
:::

:::exercise {fs-id2056612} type=check-understanding Check Your Understanding

PROBLEM:
A babysitter is pushing a child on a swing. At the point where the swing reaches $X$, where would the corresponding point on a wave of this motion be located?
SOLUTION:
$X$ is the maximum deformation, which corresponds to the amplitude of the wave. The point on the wave would either be at the very top or the very bottom of the curve.
:::

:::note [interactive] Masses and Springs

A realistic [mass and spring laboratory](https://openstax.org/l/02masses_springs). Hang masses from springs and adjust the spring stiffness and damping. You can even slow time. Transport the lab to different planets. A chart shows the kinetic, potential, and thermal energy for each spring.
:::

## Test Prep for AP Courses

:::exercise {fs-id1170241052863} type=ap-test-prep 
PROBLEM:
Use these figures to answer the following questions.

> FIGURE {fig:fs-id1170241019478} src=../../media/CNX_APPhysics_16_M3_pendulum_img.jpg
> alt: The image shows two graphs with oscillating lines. The top graph has amplitude from negative A to positive A on the y axis, and time 0 to 8 pi on the x axis. The line starts at 0, A, curves down to cross amplitude 0, and then meet pi, negative A. It curves up, and passes through amplitude 0 again, and then meets 2 pi, A. It curves down, passing through amplitude 0 again, and then meets 3 pi, negative A. It continues this way, finally passing through 8 pi, A. The bottom graph has displacement from negative 3 A over 2 to positive 3 A over 2 on the y-axis, and time 0 to 24 pi on the x-axis. The line starts at 0, 3 A over two curves down through amplitude 0, and meets negative 3 A over 2 at an unmarked x-value. It curves up, passes through amplitude 0 again, and meets 3 pi, 3 A over 2. It goes on in this way, finally meeting 24 pi, 3 A over 2.
> caption: 

1. Which of the two pendulums oscillates with larger amplitude?
2. Which of the two pendulums oscillates at a higher frequency?
:::

:::exercise {fs-id1170241149016} type=ap-test-prep 
PROBLEM:
A particle of mass 100 g undergoes a simple harmonic motion. The restoring force is provided by a spring with a spring constant of 40 N∙m^−1. What is the period of oscillation?
1. 10π
2. 0.5π
3. 0.1π
4. 1π
SOLUTION:
(c)
:::

:::exercise {fs-id1170241024705} type=ap-test-prep 
PROBLEM:
The graph shows the simple harmonic motion of a mass *m* attached to a spring with spring constant *k*.

> FIGURE {fig:fs-id1170241018127} src=../../media/CNX_APPhysics_16_M3_spring_img.jpg
> alt: The image shows a graph of an oscillating line. The y-axis has amplitude from negative 1 meter to positive 1 meter. The x-axis has time from 0 seconds to 8 pi seconds. The line starts at 0, positive 1, curves down to pass through amplitude 0, and meets pi, negative one. The line curves up and passes through amplitude equals 0 again, and then meets 2 pi, positive 1. It continues this way, finally meeting 8 pi, positive 1.
> caption: 

What is the displacement at time 8*π*?
1. 1 m
2. 0 m
3. Not defined
4. −1 m
:::

:::exercise {fs-id1170241022648} type=ap-test-prep 
PROBLEM:
A pendulum of mass 200 g undergoes simple harmonic motion when acted upon by a force of 15 N. The pendulum crosses the point of equilibrium at a speed of 5 m∙s^−1. What is the energy of the pendulum at the center of the oscillation?
SOLUTION:
The energy of the particle at the center of the oscillation is given by
$E = \frac{1}{2}m{v}^{2}$  $= \frac{1}{2}\times 0.2 \text{kg}\times {(5{\text{m·s}}^{-1})}^{2}$  $= 2.5 \text{J}$
:::

## Section Summary
- Simple harmonic motion is oscillatory motion for a system that can be described only by Hooke’s law. Such a system is also called a simple harmonic oscillator.
- Maximum displacement is the amplitude *$X$*. The period *$T$* and frequency $f$ of a simple harmonic oscillator are given by
    $T=2π\sqrt{\frac{m}{k}}$ and $f=\frac{1}{2π}\sqrt{\frac{k}{m}}$, where $m$ is the mass of the system.
- Displacement in simple harmonic motion as a function of time is given by $x(t)=X\;\text{cos}\;\frac{2πt}{T}.$
- The velocity is given by

$v(t)=-{v}_{\text{max}}\text{sin}\frac{2π\text{t}}{T}$, where ${v}_{\text{max}}=X\sqrt{\frac{k}{m}}$.
- The acceleration is found to be $a(t)=-\frac{kX}{m}\;\text{cos}\;\frac{2πt}{T}.$

## Conceptual Questions

:::exercise {fs-id2017072} type=conceptual-questions 
PROBLEM:
What conditions must be met to produce simple harmonic motion?
:::

:::exercise {fs-id1561901} type=conceptual-questions 
PROBLEM:
(a) If frequency is not constant for some oscillation, can the oscillation be simple harmonic motion?
(b) Can you think of any examples of harmonic motion where the frequency may depend on the amplitude?
:::

:::exercise {fs-id2032223} type=conceptual-questions 
PROBLEM:
Give an example of a simple harmonic oscillator, specifically noting how its frequency is independent of amplitude.
:::

:::exercise {fs-id1888472} type=conceptual-questions 
PROBLEM:
Explain why you expect an object made of a stiff material to vibrate at a higher frequency than a similar object made of a spongy material.
:::

:::exercise {fs-id3306170} type=conceptual-questions 
PROBLEM:
As you pass a freight truck with a trailer on a highway, you notice that its trailer is bouncing up and down slowly. Is it more likely that the trailer is heavily loaded or nearly empty? Explain your answer.
:::

:::exercise {fs-id3449442} type=conceptual-questions 
PROBLEM:
Some people modify cars to be much closer to the ground than when manufactured. Should they install stiffer springs? Explain your answer.
:::

## Problems & Exercises

:::exercise {fs-id1587278} type=problems-exercises 
PROBLEM:
A type of cuckoo clock keeps time by having a mass bouncing on a spring, usually something cute like a cherub in a chair. What force constant is needed to produce a period of 0.500 s for a 0.0150-kg mass?
SOLUTION:
$2\text{.}\text{37}\;\text{N/m}$
:::

:::exercise {fs-id3397701} type=problems-exercises 
PROBLEM:
If the spring constant of a simple harmonic oscillator is doubled, by what factor will the mass of the system need to change in order for the frequency of the motion to remain the same?
:::

:::exercise {eip-800} type= 
PROBLEM:
A 0.500-kg mass suspended from a spring oscillates with a period of 1.50 s. How much mass must be added to the object to change the period to 2.00 s?
SOLUTION:
0.389 kg
:::

:::exercise {fs-id3062785} type=problems-exercises 
PROBLEM:
By how much leeway (both percentage and mass) would you have in the selection of the mass of the object in the previous problem if you did not wish the new period to be greater than 2.01 s or less than 1.99 s?
:::

:::exercise {fs-id1931315} type=problems-exercises 
PROBLEM:
Suppose you attach the object with mass $m$ to a vertical spring originally at rest, and let it bounce up and down. You release the object from rest at the spring’s original rest length. (a) Show that the spring exerts an upward force of   $2.00\;mg$  on the object at its lowest point. (b) If the spring has a force constant of $\text{10}\text{.}0\;\text{N/m}$ and a 0.25-kg-mass object is set in motion as described, find the amplitude of the oscillations. (c) Find the maximum velocity.
:::

:::exercise {fs-id1941088} type=problems-exercises 
PROBLEM:
A diver on a diving board is undergoing simple harmonic motion. Her mass is 55.0 kg and the period of her motion is 0.800 s. The next diver is a male whose period of simple harmonic oscillation is 1.05 s. What is his mass if the mass of the board is negligible?
SOLUTION:
94.7 kg
:::

:::exercise {fs-id2654282} type=problems-exercises 
PROBLEM:
Suppose a diving board with no one on it bounces up and down in a simple harmonic motion with a frequency of 4.00 Hz. The board has an effective mass of 10.0 kg. What is the frequency of the simple harmonic motion of a 75.0-kg diver on the board?
:::

:::exercise {fs-id3032062} type=problems-exercises 
PROBLEM:

> FIGURE {fig:import-auto-id2023197} src=../../media/Figure_17_02_02a.jpg
> alt: The figure shows a little kid, about ten to twelve months old, standing in a toy jolly jumper, which is tied to the ceiling hook by its four spring belts.
> caption: This child’s toy relies on springs to keep infants entertained. (credit: By Humboldthead, Flickr)

The device pictured in [ref:import-auto-id2023197] entertains infants while keeping them from wandering. The child bounces in a harness suspended from a door frame by a spring.
(a) If the spring stretches 0.250 m while supporting an 8.00-kg child, what is its spring constant?
(b) What is the time for one complete bounce of this child? (c) What is the child’s maximum velocity if the amplitude of her bounce is 0.200 m?
:::

:::exercise {fs-id3035922} type=problems-exercises 
PROBLEM:
A 90.0-kg skydiver hanging from a parachute bounces up and down with a period of 1.50 s. What is the new period of oscillation when a second skydiver, whose mass is 60.0 kg, hangs from the legs of the first, as seen in [ref:import-auto-id1282324].

> FIGURE {fig:import-auto-id1282324} src=../../media/Figure_17_02_03a.jpg
> alt: The figure shows two skydivers midway through the air, with both with open having their parachutes open.
> caption: The oscillations of one skydiver are about to be affected by a second skydiver. (credit: U.S. Army, www.army.mil)

SOLUTION:
1.94 s
:::

## Glossary
- {def} **amplitude**: the maximum displacement from the equilibrium position of an object oscillating around the equilibrium position
- {def} **simple harmonic motion**: the oscillatory motion in a system where the net force can be described by Hooke’s law
- {def} **simple harmonic oscillator**: a device that implements Hooke’s law, such as a mass that is attached to a spring, with the other end of the spring being connected to a rigid support such as a wall
