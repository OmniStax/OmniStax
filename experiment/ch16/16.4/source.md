# The Simple Pendulum

## Learning Objectives
By the end of this section, you will be able to:
- Measure acceleration due to gravity.

> FIGURE {fig:import-auto-id3178394} src=../../media/Figure_17_04_01a.jpg
> alt: In the figure, a horizontal bar is drawn. A perpendicular dotted line from the middle of the bar, depicting the equilibrium of pendulum, is drawn downward. A string of length L is tied to the bar at the equilibrium point. A circular bob of mass m is tied to the end of the string which is at a distance s from the equilibrium. The string is at an angle of theta with the equilibrium at the bar. A red arrow showing the time T of the oscillation of the mob is shown along the string line toward the bar. An arrow from the bob toward the equilibrium shows its restoring force asm g sine theta. A perpendicular arrow from the bob toward the ground depicts its mass as W equals to mg, and this arrow is at an angle theta with downward direction of string.
> caption: A simple pendulum has a small-diameter bob and a string that has a very small mass but is strong enough not to stretch appreciably. The linear displacement from equilibrium is $s$, the length of the arc. Also shown are the forces on the bob, which result in a net force of $-\text{mg}\;\text{sin}\theta$ toward the equilibrium position—that is, a restoring force.

Pendulums are in common usage. Some have crucial uses, such as in clocks; some are for fun, such as a child’s swing; and some are just there, such as the sinker on a fishing line. For small displacements, a pendulum is a simple harmonic oscillator. A {term:simple pendulum} is defined to have an object that has a small mass, also known as the pendulum bob, which is suspended from a light wire or string, such as shown in [ref:import-auto-id3178394]. Exploring the simple pendulum a bit further, we can discover the conditions under which it performs simple harmonic motion, and we can derive an interesting expression for its period.
We begin by defining the displacement to be the arc length $s$. We see from [ref:import-auto-id3178394] that the net force on the bob is tangent to the arc and equals $-\text{mg}\;\text{sin}\;\theta$. (The weight $\text{mg}$ has components $\text{mg}\;\text{cos}\;\theta$ along the string and $\text{mg}\;\text{sin}\;\theta$ tangent to the arc.) Tension in the string exactly cancels the component $\;\text{mg}\;\text{cos}\;\theta$ parallel to the string. This leaves a *net* restoring force back toward the equilibrium position at $\theta =0$.
Now, if we can show that the restoring force is directly proportional to the displacement, then we have a simple harmonic oscillator. In trying to determine if we have a simple harmonic oscillator, we should note that for small angles (less than about $\text{15º}$), $\text{sin}\;\theta \approx \;\theta \;$($\text{sin}\;\theta$ and $\theta$ differ by about 1% or less at smaller angles). Thus, for angles less than about $\text{15º}$, the restoring force *$F$* is

$$ F\approx -\text{mg}θ. $$  {eq:eip-64}

The displacement *$s$* is directly proportional to $\theta$. When $\theta$ is expressed in radians, the arc length in a circle is related to its radius (*$L$* in this instance) by:

$$ s=Lθ, $$  {eq:eip-639}

so that

$$ \theta =\frac{s}{L}. $$  {eq:eip-344}

For small angles, then, the expression for the restoring force is:

$$ F\approx -\frac{\text{mg}}{L}s $$  {eq:eip-948}

This expression is of the form:

$$ F=-\text{kx}, $$  {eq:eip-267}

where the force constant is given by $k=\text{mg}/L$ and the displacement is given by $x=s$. For angles less than about $\text{15º}$, the restoring force is directly proportional to the displacement, and the simple pendulum is a simple harmonic oscillator.
Using this equation, we can find the period of a pendulum for amplitudes less than about $\text{15º}$. For the simple pendulum:

$$ T=2π\sqrt{\frac{m}{k}}=2π\sqrt{\frac{m}{\text{mg}/L}}. $$  {eq:eip-424}

Thus,

$$ T=2π\sqrt{\frac{L}{g}} $$  {eq:eip-152}

for the period of a simple pendulum. This result is interesting because of its simplicity. The only things that affect the period of a simple pendulum are its length and the acceleration due to gravity. The period is completely independent of other factors, such as mass. As with simple harmonic oscillators, the period $T$ for a pendulum is nearly independent of amplitude, especially if *$\theta$* is less than about $\text{15º}$. Even simple pendulum clocks can be finely adjusted and accurate.
Note the dependence of $T$ on *$g$*. If the length of a pendulum is precisely known, it can actually be used to measure the acceleration due to gravity. Consider the following example.

:::example {ex:fs-id1538976} Measuring Acceleration due to Gravity: The Period of a Pendulum
What is the acceleration due to gravity in a region where a simple pendulum having a length 75.000 cm has a period of 1.7357 s?
**Strategy**
We are asked to find *$g$* given the period $T$ and the length *$L$* of a pendulum. We can solve $T=2π\sqrt{\frac{L}{g}}$ for *$g$*, assuming only that the angle of deflection is less than $\text{15º}$.
**Solution**
1. Square $T=2π\sqrt{\frac{L}{g}}$ and solve for $g$:
    

$$ g={4π}^{2}\frac{L}{{T}^{2}}. $$  {eq:eip-955}

2. Substitute known values into the new equation:
    

$$ g={4π}^{2}\frac{0\text{.}\text{75000}\;\text{m}}{{(1\text{.}\text{7357 s})}^{2}}. $$  {eq:eip-95}

3. Calculate to find $g$:
    

$$ g=9\text{.}\text{8281}\;\text{m}/{\text{s}}^{2}. $$  {eq:eip-349}

**Discussion**
This method for determining $g$ can be very accurate. This is why length and period are given to five digits in this example. For the precision of the approximation $\text{sin θ}\approx \theta$ to be better than the precision of the pendulum length and period, the maximum displacement angle should be kept below about $\text{0.5º}$.
:::

:::note [] Making Career Connections

Knowing $g$ can be important in geological exploration; for example, a map of *$g$* over large geographical regions aids the study of plate tectonics and helps in the search for oil fields and large mineral deposits.
:::

:::note [] Take Home Experiment: Determining $g$

Use a simple pendulum to determine the acceleration due to gravity $g$ in your own locale. Cut a piece of a string or dental floss so that it is about 1 m long. Attach a small object of high density to the end of the string (for example, a metal nut or a car key). Starting at an angle of less than $\text{10º}$, allow the pendulum to swing and measure the pendulum’s period for 10 oscillations using a stopwatch. Calculate $g$. How accurate is this measurement? How might it be improved?
:::

:::exercise {fs-id2990952} type=check-understanding Check Your Understanding

PROBLEM:
An engineer builds two simple pendula. Both are suspended from small wires secured to the ceiling of a room. Each pendulum hovers 2 cm above the floor. Pendulum 1 has a bob with a mass of $\text{10}\;\text{kg}$. Pendulum 2 has a bob with a mass of $\text{100 kg}$. Describe how the motion of the pendula will differ if the bobs are both displaced by $\text{12º}$.
SOLUTION:
The movement of the pendula will not differ at all because the mass of the bob has no effect on the motion of a simple pendulum. The pendula are only affected by the period (which is related to the pendulum’s length) and by the acceleration due to gravity.
:::

:::note [interactive] Pendulum Lab

Play with one or two pendulums and discover how the period of a simple pendulum depends on the length of the string, the mass of the pendulum bob, and the amplitude of the swing in [this simulation](https://openstax.org/l/02pendulum). It’s easy to measure the period using the photogate timer. You can vary friction and the strength of gravity. Use the pendulum to find the value of $g$ on planet X. Notice the anharmonic behavior at large amplitude.
:::

## Test Prep for AP Courses

:::exercise {fs-id1382257} type=ap-test-prep 
PROBLEM:
A ball is attached to a string of length 4 m to make a pendulum. The pendulum is placed at a location that is away from the Earth’s surface by twice the radius of the Earth. What is the acceleration due to gravity at that height and what is the period of the oscillations?
:::

:::exercise {fs-id1877058} type=ap-test-prep 
PROBLEM:
Which of the following gives the correct relation between the acceleration due to gravity and period of a pendulum?
1. $g = \frac{2\pi L}{{T}^{2}}$
2. $g = \frac{4{\pi}^{2}L}{{T}^{2}}$
3. $g = \frac{2\pi L}{T}$
4. $g = \frac{2{\pi}^{2}L}{T}$
SOLUTION:
(b)
:::

:::exercise {fs-id1348247} type=ap-test-prep 
PROBLEM:
Tom has two pendulums with him. Pendulum 1 has a ball of mass 0.1 kg attached to it and has a length of 5 m. Pendulum 2 has a ball of mass 0.5 kg attached to a string of length 1 m. How does mass of the ball affect the frequency of the pendulum? Which pendulum will have a higher frequency and why?
:::

## Section Summary
- A mass *$m$* suspended by a wire of length $L$ is a simple pendulum and undergoes simple harmonic motion for amplitudes less than about $\text{15º}.$
    The period of a simple pendulum is
    

$$ T=2π\sqrt{\frac{L}{g}}, $$  {eq:eip-362}

where $L$ is the length of the string and $g$ is the acceleration due to gravity.

## Conceptual Questions

:::exercise {fs-id2588490} type=conceptual-questions 
PROBLEM:
Pendulum clocks are made to run at the correct rate by adjusting the pendulum’s length. Suppose you move from one city to another where the acceleration due to gravity is slightly greater, taking your pendulum clock with you, will you have to lengthen or shorten the pendulum to keep the correct time, other factors remaining constant? Explain your answer.
:::

## Problems & Exercises
**As usual, the acceleration due to gravity in these problems is taken to be** $g=9.80\;\text{m}/{\text{s}}^{2}$, **unless otherwise specified.**

:::exercise {fs-id2593990} type=problems-exercises 
PROBLEM:
What is the length of a pendulum that has a period of 0.500 s?
SOLUTION:
6.21 cm
:::

:::exercise {fs-id1997560} type=problems-exercises 
PROBLEM:
Some people think a pendulum with a period of 1.00 s can be driven with “mental energy” or psycho kinetically, because its period is the same as an average heartbeat. True or not, what is the length of such a pendulum?
:::

:::exercise {fs-id1986261} type=problems-exercises 
PROBLEM:
What is the period of a 1.00-m-long pendulum?
SOLUTION:
2.01 s
:::

:::exercise {fs-id2449227} type=problems-exercises 
PROBLEM:
How long does it take a child on a swing to complete one swing if her center of gravity is 4.00 m below the pivot?
:::

:::exercise {fs-id2382885} type=problems-exercises 
PROBLEM:
The pendulum on a cuckoo clock is 5.00 cm long. What is its frequency?
SOLUTION:
2.23 Hz
:::

:::exercise {fs-id1417224} type=problems-exercises 
PROBLEM:
Two parakeets sit on a swing with their combined center of mass 10.0 cm below the pivot. At what frequency do they swing?
:::

:::exercise {fs-id2454166} type=problems-exercises 
PROBLEM:
(a) A pendulum that has a period of 3.00000 s and that is located where the acceleration due to gravity is $9\text{.}\text{79}\;{\text{m/s}}^{2}$ is moved to a location where the acceleration due to gravity is $9\text{.}\text{82}\;{\text{m/s}}^{2}$. What is its new period? (b) Explain why so many digits are needed in the value for the period, based on the relation between the period and the acceleration due to gravity.
SOLUTION:
(a) 2.99541 s
(b) Since the period is related to the square root of the acceleration of gravity, when the acceleration changes by 1% the period changes by $(0\text{.}\text{01}{)}^{2}=0\text{.}\text{01%}$ so it is necessary to have at least 4 digits after the decimal to see the changes.
:::

:::exercise {fs-id1980938} type=problems-exercises 
PROBLEM:
A pendulum with a period of 2.00000 s in one location $(g=9\text{.}\text{80}\;{\text{m/s}}^{2})$ is moved to a new location where the period is now 1.99796 s. What is the acceleration due to gravity at its new location?
:::

:::exercise {fs-id2408955} type=problems-exercises 
PROBLEM:
(a) What is the effect on the period of a pendulum if you double its length?
(b) What is the effect on the period of a pendulum if you decrease its length by 5.00%?
SOLUTION:
(a) Period increases by a factor of 1.41 ($\sqrt{2}$)
(b) Period decreases to 97.5% of old period
:::

:::exercise {fs-id1931004} type=problems-exercises 
PROBLEM:
Find the ratio of the new/old periods of a pendulum if the pendulum were transported from Earth to the Moon, where the acceleration due to gravity is $1\text{.}\text{63}\;{\text{m/s}}^{2}$.
:::

:::exercise {fs-id1864432} type=problems-exercises 
PROBLEM:
At what rate will a pendulum clock run on the Moon, where the acceleration due to gravity is $1\text{.}\text{63}\;{\text{m/s}}^{2}$, if it keeps time accurately on Earth? That is, find the time (in hours) it takes the clock’s minute hand, which on Earth makes one revolution per hour, to make one revolution on the Moon.
SOLUTION:
Slow by a factor of 2.45
:::

:::exercise {fs-id3229314} type=problems-exercises 
PROBLEM:
Suppose the length of a clock’s pendulum is changed by 1.000%, exactly at noon one day. What time will it read 24.00 hours later, assuming it the pendulum has kept perfect time before the change? Note that there are two answers, and perform the calculation to four-digit precision.
:::

:::exercise {fs-id2688094} type=problems-exercises 
PROBLEM:
If a pendulum-driven clock gains 5.00 s/day, what fractional change in pendulum length must be made for it to keep perfect time?
SOLUTION:
length must increase by 0.0116%.
:::

## Glossary
- {def} **simple pendulum**: an object with a small mass suspended from a light wire or string
