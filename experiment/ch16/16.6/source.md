# Uniform Circular Motion and Simple Harmonic Motion

## Learning Objectives
By the end of this section, you will be able to:
- Compare simple harmonic motion with uniform circular motion.

> FIGURE {fig:import-auto-id1580481} src=../../media/Figure_17_06_01a.jpg
> alt: The figure shows a clock-wise rotating empty merry go round with iron bars holding the decorated wooden horse statues, four in each column.
> caption: The horses on this merry-go-round exhibit uniform circular motion. (credit: Wonderlane, Flickr)

There is an easy way to produce simple harmonic motion by using uniform circular motion. [ref:import-auto-id2680526] shows one way of using this method. A ball is attached to a uniformly rotating vertical turntable, and its shadow is projected on the floor as shown. The shadow undergoes simple harmonic motion. Hooke’s law usually describes uniform circular motions ($\omega$ constant) rather than systems that have large visible displacements. So observing the projection of uniform circular motion, as in [ref:import-auto-id2680526], is often easier than observing a precise large-scale simple harmonic oscillator. If studied in sufficient depth, simple harmonic motion produced in this manner can give considerable insight into many aspects of oscillations and waves and is very useful mathematically. In our brief treatment, we shall indicate some of the major features of this relationship and how they might be useful.

> FIGURE {fig:import-auto-id2680526} src=../../media/Figure_17_06_02a.jpg
> alt: The given figure shows a vertical turntable with four floor projecting light bulbs at the top. A smaller sized rectangular bar is attached to this turntable at the bottom half, with a circular knob attached to it. A red colored small ball is rolling along the boundary of this knob in angular direction, and the lights falling through this ball are ball making shadows just under the knob on the floor. The middle shadow is the brightest and starts fading as we look through to the cornered shadow.
> caption: The shadow of a ball rotating at constant angular velocity $\omega$ on a turntable goes back and forth in precise simple harmonic motion.

[ref:import-auto-id2447767] shows the basic relationship between uniform circular motion and simple harmonic motion. The point P travels around the circle at constant angular velocity $\omega$. The point P is analogous to an object on the merry-go-round. The projection of the position of P onto a fixed axis undergoes simple harmonic motion and is analogous to the shadow of the object. At the time shown in the figure, the projection has position $x$ and moves to the left with velocity $v$. The velocity of the point P around the circle equals ${\bar{v}}_{\text{max}}$.The projection of ${\bar{v}}_{\text{max}}$ on the $x$-axis is the velocity *$v$* of the simple harmonic motion along the $x$-axis.

> FIGURE {fig:import-auto-id2447767} src=../../media/Figure_17_06_03a.jpg
> alt: The figure shows a point P moving through the circumference of a circle in an angular way with angular velocity omega. The diameter is projected along the x axis, with point P making an angle theta at the centre of the circle. A point along the diameter shows the projection of the point P with a dotted perpendicular line from P to this point, the projection of the point is given as v along the circle and its velocity v subscript max, over the top of the projection arrow in an upward left direction.
> caption: A point P moving on a circular path with a constant angular velocity $\omega$ is undergoing uniform circular motion. Its projection on the x-axis undergoes simple harmonic motion. Also shown is the velocity of this point around the circle, ${\bar{v}}_{\text{max}}$, and its projection, which is $v$. Note that these velocities form a similar triangle to the displacement triangle.

To see that the projection undergoes simple harmonic motion, note that its position $x$ is given by

$$ x=X\;\text{cos}\;\theta \text{,} $$  {eq:eip-202}

where $\theta =\omega t$, $\omega$ is the constant angular velocity, and $X$ is the radius of the circular path. Thus,

$$ x=X\;\text{cos}\;\omega t. $$  {eq:eip-804}

The angular velocity $\omega$ is in radians per unit time; in this case $2π$ radians is the time for one revolution *$T$*. That is, $\omega =2π/T$. Substituting this expression for $\omega$, we see that the position *$x$* is given by:

$$ x(t)=X\text{cos}(\frac{2πt}{T}). $$  {eq:eip-901}

This expression is the same one we had for the position of a simple harmonic oscillator in [Simple Harmonic Motion: A Special Periodic Motion](module:m42242). If we make a graph of position versus time as in [ref:import-auto-id2598176], we see again the wavelike character (typical of simple harmonic motion) of the projection of uniform circular motion onto the $x$-axis.

> FIGURE {fig:import-auto-id2598176} src=../../media/Figure_17_06_04a.jpg
> alt: The given figure shows a vertical turntable with four floor projecting light bulbs at the top. A smaller sized rectangular bar is attached to this turntable at the bottom half, with a circular knob attached to it. A red colored small ball is rolling along the boundary of this knob in angular direction. The turnaround table is put upon a roller paper sheet, on which the simple harmonic motion is measured, which is shown here in oscillating waves on the paper sheet in front of the table. A graph of amplitude versus time is also given alongside the figure.
> caption: The position of the projection of uniform circular motion performs simple harmonic motion, as this wavelike graph of $x$ versus $t$ indicates.

Now let us use [ref:import-auto-id2447767] to do some further analysis of uniform circular motion as it relates to simple harmonic motion. The triangle formed by the velocities in the figure and the triangle formed by the displacements ($X,\;x,\;$ and $\sqrt{{X}^{2}-{x}^{2}}$) are similar right triangles. Taking ratios of similar sides, we see that

$$ \frac{v}{{v}_{\text{max}}}=\frac{\sqrt{{X}^{2}-{x}^{2}}}{X}=\sqrt{1-\frac{{x}^{2}}{{X}^{2}}}. $$  {eq:eip-830}

We can solve this equation for the speed $v$ or

$$ v={v}_{\text{max}}\sqrt{1-\frac{{x}^{2}}{{X}^{2}}}. $$  {eq:eip-561}

This expression for the speed of a simple harmonic oscillator is exactly the same as the equation obtained from conservation of energy considerations in [Energy and the Simple Harmonic Oscillator](module:m42244).You can begin to see that it is possible to get all of the characteristics of simple harmonic motion from an analysis of the projection of uniform circular motion.
Finally, let us consider the period *$T$* of the motion of the projection. This period is the time it takes the point P to complete one revolution. That time is the circumference of the circle $2πX$ divided by the velocity around the circle, ${v}_{\text{max}}$. Thus, the period *$T$* is

$$ T=\frac{2πX}{{v}_{\text{max}}}. $$  {eq:eip-645}

We know from conservation of energy considerations that

$$ {v}_{\text{max}}=\sqrt{\frac{k}{m}}X. $$  {eq:eip-694}

Solving this equation for $X/{v}_{\text{max}}$ gives

$$ \frac{X}{{v}_{\text{max}}}=\sqrt{\frac{m}{k}}. $$  {eq:eip-862}

Substituting this expression into the equation for *$T$* yields

$$ T=2π\sqrt{\frac{m}{k}}\text{.} $$  {eq:eip-445}

Thus, the period of the motion is the same as for a simple harmonic oscillator. We have determined the period for any simple harmonic oscillator using the relationship between uniform circular motion and simple harmonic motion.
Some modules occasionally refer to the connection between uniform circular motion and simple harmonic motion. Moreover, if you carry your study of physics and its applications to greater depths, you will find this relationship useful. It can, for example, help to analyze how waves add when they are superimposed.

:::exercise {fs-id2209875} type=check-understanding Check Your Understanding

PROBLEM:
Identify an object that undergoes uniform circular motion. Describe how you could trace the simple harmonic motion of this object as a wave.
SOLUTION:
A record player undergoes uniform circular motion. You could attach dowel rod to one point on the outside edge of the turntable and attach a pen to the other end of the dowel. As the record player turns, the pen will move. You can drag a long piece of paper under the pen, capturing its motion as a wave.
:::

## Test Prep for AP Courses

:::exercise {fs-id2020362} type=ap-test-prep 
PROBLEM:
In the equation $x = A sin wt,$ what values can the position $x$ take?
1. −1 to +1
2. –*A* to +*A*
3. 0
4. –*t* to *t*
:::

## Section Summary
A projection of uniform circular motion undergoes simple harmonic oscillation.

## Problems & Exercises

:::exercise {fs-id2615915} type=problems-exercises 
PROBLEM:
(a)What is the maximum velocity of an 85.0-kg person bouncing on a bathroom scale having a force constant of $1\text{.}\text{50}\times {\text{10}}^{6}\;\text{N/m}$, if the amplitude of the bounce is 0.200 cm? (b)What is the maximum energy stored in the spring?
SOLUTION:
a). 0.266 m/s
b). 3.00 J
:::

:::exercise {fs-id3358173} type=problems-exercises 
PROBLEM:
A novelty clock has a 0.0100-kg mass object bouncing on a spring that has a force constant of 1.25 N/m. What is the maximum velocity of the object if the object bounces 3.00 cm above and below its equilibrium position? (b) How many joules of kinetic energy does the object have at its maximum velocity?
:::

:::exercise {fs-id1348556} type=problems-exercises 
PROBLEM:
At what positions is the speed of a simple harmonic oscillator half its maximum? That is, what values of $x/X$ give $v=\pm {v}_{\text{max}}/2$, where *$X$* is the amplitude of the motion?
SOLUTION:
$\pm \frac{\sqrt{3}}{2}$
:::

:::exercise {fs-id2666940} type=problems-exercises 
PROBLEM:
A ladybug sits 12.0 cm from the center of a Beatles music album spinning at 33.33 rpm. What is the maximum velocity of its shadow on the wall behind the turntable, if illuminated parallel to the record by the parallel rays of the setting Sun?
:::
