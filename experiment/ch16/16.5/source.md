# Energy and the Simple Harmonic Oscillator

## Learning Objectives
By the end of this section, you will be able to:
- Determine the maximum speed of an oscillating system.
To study the energy of a simple harmonic oscillator, we first consider all the forms of energy it can have We know from [Hooke’s Law: Stress and Strain Revisited](module:m42240) that the energy stored in the deformation of a simple harmonic oscillator is a form of potential energy given by:

$$ {\text{PE}}_{\text{el}}=\frac{1}{2}{kx}^{2}. $$  {eq:eip-663}

Because a simple harmonic oscillator has no dissipative forces, the other important form of energy is kinetic energy $\text{KE}$. Conservation of energy for these two forms is:

$$ \text{KE}+{\text{PE}}_{\text{el}}=\text{constant} $$  {eq:eip-716}

or

$$ \frac{1}{2}{\text{mv}}^{2}+\frac{1}{2}{\text{kx}}^{2}=\text{constant.} $$  {eq:eip-969}

This statement of conservation of energy is valid for *all* simple harmonic oscillators, including ones where the gravitational force plays a role
Namely, for a simple pendulum we replace the velocity with $v=Lω$, the spring constant with $k=\text{mg}/L$, and the displacement term with $x=Lθ$. Thus

$$ \frac{1}{2}{\text{mL}}^{2}{\omega}^{2}+\frac{1}{2}\text{mgL}{\theta}^{2}=\text{constant.} $$  {eq:eip-721}

In the case of undamped simple harmonic motion, the energy oscillates back and forth between kinetic and potential, going completely from one to the other as the system oscillates. So for the simple example of an object on a frictionless surface attached to a spring, as shown again in [ref:import-auto-id3062499], the motion starts with all of the energy stored in the spring. As the object starts to move, the elastic potential energy is converted to kinetic energy, becoming entirely kinetic energy at the equilibrium position. It is then converted back into elastic potential energy by the spring, the velocity becomes zero when the kinetic energy is completely converted, and so on. This concept provides extra insight here and in later applications of simple harmonic motion, such as alternating current circuits.

> FIGURE {fig:import-auto-id3062499} src=../../media/Figure_17_05_01a.jpg
> alt: Figure a shows a spring on a frictionless surface attached to a bar or wall from the left side, and on the right side of it there’s an object attached to it with mass m, its amplitude is given by X, and x equal to zero at the equilibrium level. Force F is applied to it from the right side, shown with left direction pointed red arrow and velocity v is equal to zero. A direction point showing the north and west direction is also given alongside this figure as well as with other four figures. The energy given here for the object is given according to the velocity. In figure b, after the force has been applied, the object moves to the left compressing the spring a bit, and the displaced area of the object from its initial point is shown in sketched dots. F is equal to zero and the V is max in negative direction. The energy given here for the object is given according to the velocity. In figure c, the spring has been compressed to the maximum level, and the amplitude is negative x. Now the direction of force changes to the rightward direction, shown with right direction pointed red arrow and the velocity v zero. The energy given here for the object is given according to the velocity.                In figure d, the spring is shown released from the compressed level and the object has moved toward the right side up to the equilibrium level. F is zero, and the velocity v is maximum. The energy given here for the object is given according to the velocity.               In figure e, the spring has been stretched loose to the maximum level and the object has moved to the far right. Now again the velocity here is equal to zero and the direction of force again is to the left hand side, shown here as F is equal to zero. The energy given here for the object is given according to the velocity.               
> caption: The transformation of energy in simple harmonic motion is illustrated for an object attached to a spring on a frictionless surface.

The conservation of energy principle can be used to derive an expression for velocity $v$. If we start our simple harmonic motion with zero velocity and maximum displacement ($x=X$), then the total energy is

$$ \frac{1}{2}{\text{kX}}^{2}. $$  {eq:eip-792}

This total energy is constant and is shifted back and forth between kinetic energy and potential energy, at most times being shared by each. The conservation of energy for this system in equation form is thus:

$$ \frac{1}{2}{\text{mv}}^{2}+\frac{1}{2}{\text{kx}}^{2}=\frac{1}{2}{\text{kX}}^{2}. $$  {eq:eip-446}

Solving this equation for *$v$* yields:

$$ v=\pm \sqrt{\frac{k}{m}({X}^{2}-{x}^{2})}. $$  {eq:eip-404}

Manipulating this expression algebraically gives:

$$ v=\pm \sqrt{\frac{k}{m}}X\sqrt{1-\frac{{x}^{2}}{{X}^{2}}} $$  {eq:eip-559}

and so

$$ v=\pm {v}_{\text{max}}\sqrt{1-\frac{{x}^{2}}{{X}^{2}}}, $$  {eq:eip-932}

where

$$ {v}_{\text{max}}=X\sqrt{\frac{k}{m}}. $$  {eq:eip-582}

From this expression, we see that the velocity is a maximum (${v}_{\text{max}}$) at $x=0$, as stated earlier in $v(t)=-{v}_{\text{max}}\;\text{sin}\;\frac{2πt}{T}$*.* Notice that the maximum velocity depends on three factors. Maximum velocity is directly proportional to amplitude. As you might guess, the greater the maximum displacement the greater the maximum velocity. Maximum velocity is also greater for stiffer systems, because they exert greater force for the same displacement. This observation is seen in the expression for ${v}_{\text{max}};$ it is proportional to the square root of the force constant $k$. Finally, the maximum velocity is smaller for objects that have larger masses, because the maximum velocity is inversely proportional to the square root of $m$. For a given force, objects that have large masses accelerate more slowly.
A similar calculation for the simple pendulum produces a similar result, namely:

$$ {\omega}_{\text{max}}=\sqrt{\frac{g}{L}}{\theta}_{\text{max}}. $$  {eq:eip-468}

:::example {ex:fs-id3424702} Determine the Maximum Speed of an Oscillating System: A Bumpy Road
Suppose that a car is 900 kg and has a suspension system that has a force constant $k=6\text{.}\text{53}\times {\text{10}}^{4}\;\text{N/m}$. The car hits a bump and bounces with an amplitude of 0.100 m. What is its maximum vertical velocity if you assume no damping occurs?
**Strategy**
We can use the expression for ${v}_{\text{max}}$ given in ${v}_{\text{max}}=X\sqrt{\frac{k}{m}}$ to determine the maximum vertical velocity. The variables $m$ and $k$ are given in the problem statement, and the maximum displacement $X$ is 0.100 m.
**Solution**
1. Identify known.
2. Substitute known values into ${v}_{\text{max}}=\sqrt{\frac{k}{m}}X$:
    

$$ {v}_{\text{max}}=\sqrt{\frac{6\text{.}\text{53}\times {\text{10}}^{4}\;\text{N/m}}{\text{900}\;\text{kg}}}(0\text{.}\text{100}\;\text{m)}. $$  {eq:eip-52}

3. Calculate to find ${v}_{\text{max}}\text{= 0.852 m/s}.$
**Discussion**
This answer seems reasonable for a bouncing car. There are other ways to use conservation of energy to find ${v}_{\text{max}}$. We could use it directly, as was done in the example featured in [Hooke’s Law: Stress and Strain Revisited](module:m42240).
The small vertical displacement  $y$  of an oscillating simple pendulum, starting from its equilibrium position, is given as

$$ y(t)=a\;\text{sin}\;ωt, $$  {eq:eip-329}

where $a$ is the amplitude, $\omega$ is the angular velocity and $t$ is the time taken. Substituting $\omega =\frac{2π}{T}$, we have

$$ y(t)=a\;\text{sin}(\frac{2πt}{T}). $$  {eq:eip-589}

Thus, the displacement of pendulum is a function of time as shown above.
Also the velocity of the pendulum is given by

$$ v(t)=\frac{2aπ}{T}\;\text{cos}\;(\frac{2πt}{T}), $$  {eq:eip-264}

so the motion of the pendulum is a function of time.
:::

:::exercise {fs-id3399175} type=check-understanding Check Your Understanding

PROBLEM:
Why does it hurt more if your hand is snapped with a ruler than with a loose spring, even if the displacement of each system is equal?
SOLUTION:
The ruler is a stiffer system, which carries greater force for the same amount of displacement. The ruler snaps your hand with greater force, which hurts more.
:::

:::exercise {fs-id2653384} type=check-understanding Check Your Understanding

PROBLEM:
You are observing a simple harmonic oscillator. Identify one way you could decrease the maximum velocity of the system.
SOLUTION:
You could increase the mass of the object that is oscillating.
:::

## Test Prep for AP Courses

:::exercise {fs-id1765110} type=ap-test-prep 
PROBLEM:
A mass of 1 kg undergoes simple harmonic motion with amplitude of 1 m. If the period of the oscillation is 1 s, calculate the internal energy of the system.
SOLUTION:
19.7 J
:::

## Section Summary
- Energy in the simple harmonic oscillator is shared between elastic potential energy and kinetic energy, with the total being constant:
    

$$ \frac{1}{2}{\text{mv}}^{2}+\frac{1}{2}{\text{kx}}^{2}=\text{constant.} $$  {eq:eip-963}

- Maximum velocity depends on three factors: it is directly proportional to amplitude, it is greater for stiffer systems, and it is smaller for objects that have larger masses:
    

$$ {v}_{\text{max}}=X\sqrt{\frac{k}{m}} $$  {eq:eip-996}

## Conceptual Questions

:::exercise {fs-id3144926} type=conceptual-questions 
PROBLEM:
Explain in terms of energy how dissipative forces such as friction reduce the amplitude of a harmonic oscillator. Also explain how a driving mechanism can compensate. (A pendulum clock is such a system.)
:::

## Problems & Exercises

:::exercise {eip-863} type=problems-exercises 
PROBLEM:
The length of nylon rope from which a mountain climber is suspended has a force constant of $1.40\times {10}^{4}\text{N/m}$
(a) What is the frequency at which he bounces, given his mass plus and the mass of his equipment are 90.0 kg? Ignore the change in gravitational potential energy after the cord begins to stretch.
(b) How much would this rope stretch to break the climber’s fall if he free-falls 2.00 m before the rope runs out of slack? Hint: Use conservation of energy.
(c) Repeat both parts of this problem in the situation where twice this length of nylon rope is used.
SOLUTION:
(a) $\text{1.99 Hz}$
(b) 50.2 cm
(c) 1.40 Hz, 71.0 cm
:::

:::exercise {eip-217} type=problems-exercises 
PROBLEM:
**Engineering Application**
Near the top of the Citigroup Center building in New York City, there is an object with mass of $4\text{.}\text{00}\times {\text{10}}^{5}\;\text{kg}$ on springs that have adjustable force constants. Its function is to dampen wind-driven oscillations of the building by oscillating at the same frequency as the building is being driven—the driving force is transferred to the object, which oscillates instead of the entire building. (a) What effective force constant should the springs have to make the object oscillate with a period of 2.00 s? (b) What energy is stored in the springs for a 2.00-m displacement from equilibrium?
SOLUTION:
(a) $3\text{.}\text{95}\times {\text{10}}^{6}\;\text{N/m}$
(b) $7\text{.}\text{90}\times {\text{10}}^{6}\;\text{J}$
:::
