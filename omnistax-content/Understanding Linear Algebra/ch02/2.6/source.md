# 2.6 The geometry of matrix transformations {sec-transforms-geom}

Matrix transformations, which we explored in the last section, allow us to describe certain functions $T:{\mathbb R}^n\to{\mathbb R}^m$. In this section, we will demonstrate how matrix transformations provide a convenient way to describe geometric operations, such as rotations, reflections, and scalings. We will then explore how matrix transformations are used in computer animation.

## 2.6.1 Introduction

:::exploration {act:preview-2-6-1} Preview Activity 2.6.1
We will describe the matrix transformation $T$ that reflects 2-dimensional vectors across the horizontal axis. For instance, [Figure 2.6.1](ref:fig-reflect-intro) illustrates how a vector ${\mathbf x}$ is reflected onto the vector $T({\mathbf x})$.
> FIGURE {fig:fig-reflect-intro} number=2.6.1 src=../../media/ch02/reflect-intro.svg
> alt: A two dimensional vector and its reflection across the horizontal axis.
> width: 50%
> caption: A vector ${\mathbf x}$ and its reflection $T({\mathbf x})$ across the horizontal axis.
PROBLEM:
a) If ${\mathbf x} = \left[\begin{array}{r}2 \\ 4 \end{array}\right]$, what is the vector $T({\mathbf x})$? Sketch the vectors ${\mathbf x}$ and $T({\mathbf x})$.
b) More generally, if ${\mathbf x}=\left[\begin{array}{r}x \\ y \end{array}\right]$, what is $T({\mathbf x})$?
c) Find the vectors $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$ and $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$.
d) Use your results to write the matrix $A$ so that $T({\mathbf x}) = A{\mathbf x}$. Then verify that $T\left(\left[\begin{array}{r}x \\ y \end{array}\right]\right)$ agrees with what you found in part b.
e) Describe the transformation that results from composing $T$ with itself; that is, what is the transformation $T\circ T$? Explain how matrix multiplication can be used to justify your response.
ANSWER:
a) $T({\mathbf x}) = \left[\begin{array}{r}2 \\ -4 \end{array}\right]$.
b) $T({\mathbf x}) = \left[\begin{array}{r}x \\ -y \end{array}\right]$.
c) $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}0 \\ -1 \end{array}\right]$.
d) $A=\left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right]$.
e) $AA= A^2 = \left[\begin{array}{rr}1& 0 \\ 0 & 1 \\ \end{array}\right]$.
SOLUTION:
a) $T({\mathbf x}) = \left[\begin{array}{r}2 \\ -4 \end{array}\right]$.
b) $T({\mathbf x}) = \left[\begin{array}{r}x \\ -y \end{array}\right]$.
c) $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}0 \\ -1 \end{array}\right]$.
d) We have the matrix $A=\left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right]$. It follows that $T\left(\left[\begin{array}{r}x \\ y \end{array}\right]\right) = A\left[\begin{array}{r}x \\ y \end{array}\right] = \left[\begin{array}{r}x \\ -y \end{array}\right]$ as expected.
e) If we reflect a vector twice in the horizontal axis, we obtain the original vector. The matrix for the transformation $T\circ T$ is simply $AA= A^2 = \left[\begin{array}{rr}1& 0 \\ 0 & 1 \\ \end{array}\right]$.
:::

## 2.6.2 The geometry of $2\times2$ matrix transformations

We have now seen how a few geometric operations, such as rotations and reflections, can be described using matrix transformations. The following activity shows, more generally, that matrix transformations can perform a variety of important geometric operations.

:::activity {act:activity-linear-trans-geom} Activity 2.6.2 (Using matrix transformations to describe geometric operations)
> FIGURE {fig:js-matrix-mult} number=2.6.2 src=../../media/ch02/mult-preview.png
> alt: 
> caption: The matrix transformation $T$ transforms features shown on the left into features shown on the right.
For the following $2\times2$ matrices $A$, use the diagram to study the effect of the corresponding matrix transformation $T({\mathbf x}) = A{\mathbf x}$. For each transformation, describe the geometric effect the transformation has on the plane.

a) 
    $A=\left[\begin{array}{rr} 2 & 0 \\ 0 & 1 \\ \end{array}\right]$.

b) 
    $A=\left[\begin{array}{rr} 2 & 0 \\ 0 & 2 \\ \end{array}\right]$.

c) 
    $A=\left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right]$.

d) 
    $A=\left[\begin{array}{rr} 1 & 1 \\ 0 & 1 \\ \end{array}\right]$.

e) 
    $A=\left[\begin{array}{rr} -1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

f) 
    $A=\left[\begin{array}{rr} 1 & 0 \\ 0 & 0 \\ \end{array}\right]$.

g) 
    $A=\left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

h) 
    $A=\left[\begin{array}{rr} 1 & -1 \\ -2 & 2 \\ \end{array}\right]$.

SOLUTION:

a) 
    This transformation stretches by a factor of 2 in the horizontal direction.

b) 
    This transformation stretches by a factor of 2 uniformly in all directions.

c) 
    This is a $90^\circ$ clockwise rotation.

d) 
    This transformation is called a *shear*; it pushes vectors horizontally an amount equal to the vertical component.

e) 
    This transformation reflects vectors in the vertical axis.

f) 
    This transformation is called a *projection*; it produces the shadow of the vector on the horizontal axis.

g) 
    This transformation is called the *identity*; it causes no change.

h) 
    This transformation pushes vectors onto the line defined by the vector $\left[\begin{array}{r}1 \\ -2 \end{array}\right]$.

:::

The previous activity presented some examples showing that matrix transformations can perform interesting geometric operations, such as rotations, scalings, and reflections. Before we go any further, we should explain why it is possible to represent these operations by matrix transformations. In fact, we ask more generally: what types of functions $T:{\mathbb R}^n\to{\mathbb R}^m$ are represented as matrix transformations?

The [linearity of matrix-vector multiplication](ref:2.2#prop-matrix-mult-prop) provides the key to answering this question. Remember that if $A$ is a matrix, ${\mathbf v}$ and ${\mathbf w}$ vectors, and $c$ a scalar, then

$$ \begin{aligned} A(c{\mathbf v}) & {}={} cA{\mathbf v} \\ A({\mathbf v} + {\mathbf w}) & {}={} A{\mathbf v} + A{\mathbf w}\text{.} \end{aligned} $$

. This means that a matrix transformation $T({\mathbf x}) = A{\mathbf x}$ satisfies the corresponding linearity property:

:::assemblage {asm:linearity-of-linear-transformations} Linearity of Matrix Transformations

$$ \begin{aligned} T(c{\mathbf v}) & {}={} cT({\mathbf v}) \\ T({\mathbf v} + {\mathbf w}) & {}={} T({\mathbf v}) + T({\mathbf w})\text{.} \end{aligned} $$

:::

It turns out that, if $T:{\mathbb R}^n\to{\mathbb R}^m$ satisfies these two linearity properties, then we can find a matrix $A$ such that $T({\mathbf x}) = A{\mathbf x}$. In fact, [Proposition 2.5.6](ref:2.5#prop-linear-trans-columns) tells us how to form $A$; we simply write

$$ A = \left[\begin{array}{rrrr} T({\mathbf e}_1) & T({\mathbf e}_2) & \ldots & T({\mathbf e}_n) \end{array}\right] $$

. We will now check that $T({\mathbf x}) = A{\mathbf x}$ using the linearity of $T$:

$$ \begin{aligned} T({\mathbf x}) = T\left(\left[\begin{array}{r}x_1 \\ x_2 \\ \vdots \\ x_n \end{array}\right]\right) & {}={} T(x_1{\mathbf e}_1 + x_2{\mathbf e}_2 + \ldots + x_n{\mathbf e}_n) \\ \\ & {}={} x_1T({\mathbf e}_1) + x_2T({\mathbf e}_2) + \ldots + x_nT({\mathbf e}_n) \\ \\ & {}={} x_1A{\mathbf e}_1 + x_2A{\mathbf e}_2 + \ldots + x_nA{\mathbf e}_n \\ \\ & {}={} A(x_1{\mathbf e}_1 + x_2{\mathbf e}_2 + \ldots + x_n{\mathbf e}_n) \\ \\ & {}={} A\left[\begin{array}{r}x_1 \\ x_2 \\ \vdots \\ x_n \end{array}\right] \\ \\ & {}={} A{\mathbf x} \end{aligned} $$

.

The result is the following proposition.

:::proposition {prop:prop-linear-trans-characterization} Proposition 2.6.3
The function $T:{\mathbb R}^n\to{\mathbb R}^m$ is a matrix transformation where $T({\mathbf x}) = A{\mathbf x}$ for some $m\times n$ matrix $A$ if and only if

$$ \begin{aligned} T(c{\mathbf v}) & {}={} cT({\mathbf v}) \\ T({\mathbf v} + {\mathbf w}) & {}={} T({\mathbf v}) + T({\mathbf w})\text{.} \end{aligned} $$

. In this case, $A$ is the matrix whose columns are $T({\mathbf e}_j)$; that is,

$$ A=\left[\begin{array}{rrrr} T({\mathbf e}_1) & T({\mathbf e}_2) & \ldots & T({\mathbf e}_n) \end{array}\right] $$

.
:::

Said simply, this proposition means that if we have a function $T:{\mathbb R}^n\to{\mathbb R}^m$ and can verify the two linearity properties stated in the proposition, then we know that $T$ is a matrix transformation. Let's see how this works in practice.

:::example {ex:example-2-6-4} Example 2.6.4
We will consider the function $T:{\mathbb R}^2\to{\mathbb R}^2$ that rotates a vector ${\mathbf x}$ by $45^\circ$ in the counterclockwise direction to obtain $T({\mathbf x})$ as seen in [Figure 2.6.5](ref:fig-45-rotation).
> FIGURE {fig:fig-45-rotation} number=2.6.5 src=../../media/ch02/45-rotation-a.svg
> alt: A two dimensional vector x
> caption: The function $T$ rotates a vector counterclockwise by $45^\circ$.
> subfigure src=../../media/ch02/45-rotation-a.svg alt: A two dimensional vector x
> subfigure src=../../media/ch02/45-rotation-b.svg alt: The result of rotating the vector x by 45 degrees.
We first need to know that $T$ can be represented by a matrix transformation, which means, by [Proposition 2.6.3](ref:prop-linear-trans-characterization), that we need to verify the linearity properties:

$$ \begin{aligned} T(c{\mathbf v}) & {}={} cT({\mathbf v}) \\ T({\mathbf v} + {\mathbf w}) & {}={} T({\mathbf v}) + T({\mathbf w})\text{.} \end{aligned} $$

The next two figures illustrate why these properties hold. For instance, [Figure 2.6.6](ref:fig-45-rotation-linear-mult) shows the relationship between $T({\mathbf v})$ and $T(c{\mathbf v})$ when $c$ is a scalar. In particular, scaling a vector and then rotating it is the same as rotating and then scaling it, which means that $T(c{\mathbf v}) = cT({\mathbf v})$.
> FIGURE {fig:fig-45-rotation-linear-mult} number=2.6.6 src=../../media/ch02/45-rotation-linear-a-a.svg
> alt: A vector v and a scalar multiple of v
> caption: We see that the vector $T(c{\mathbf v})$ is a scalar multiple to $T({\mathbf v})$ so that $T(c{\mathbf v}) = cT({\mathbf v})$.
> subfigure src=../../media/ch02/45-rotation-linear-a-a.svg alt: A vector v and a scalar multiple of v
> subfigure src=../../media/ch02/45-rotation-linear-a-b.svg alt: The matrix transformation T rotates v and c times v by 45 degrees
Similarly, [Figure 2.6.7](ref:fig-45-rotation-linear-add) shows the relationship between $T({\mathbf v}+{\mathbf w})$, $T({\mathbf v})$, and $T({\mathbf w})$. Remember that the sum of two vectors is represented by the diagonal of the parallelogram defined by the two vectors. The rotation $T$ has the effect of rotating the parallelogram defined by ${\mathbf v}$ and ${\mathbf w}$ into the parallelogram defined by $T({\mathbf v})$ and $T({\mathbf w})$, explaining why $T({\mathbf v}+{\mathbf w}) = T({\mathbf v}) + T({\mathbf w})$.
> FIGURE {fig:fig-45-rotation-linear-add} number=2.6.7 src=../../media/ch02/45-rotation-linear-b-a.svg
> alt: A parallelogram resulting from the vector sum of vectors v and w
> caption: We see that the vector $T({\mathbf v}+{\mathbf w})$ is the sum of $T({\mathbf v})$ and $T({\mathbf w})$ so that $T({\mathbf v} + {\mathbf w}) = T({\mathbf v}) + T({\mathbf w})$.
> subfigure src=../../media/ch02/45-rotation-linear-b-a.svg alt: A parallelogram resulting from the vector sum of vectors v and w
> subfigure src=../../media/ch02/45-rotation-linear-b-b.svg alt: A parallelogram resulting the vector sum of vectors T of v and T of w
Having verified these two properties, we now know that the function $T$ that rotates vectors by $45^\circ$ is a matrix transformation. We may therefore write it as $T({\mathbf x}) = A{\mathbf x}$ where $A$ is the $2\times2$ matrix $A=\left[\begin{array}{rr} T({\mathbf e}_1) & T({\mathbf e}_2) \end{array}\right]$. The columns of this matrix, $T({\mathbf e}_1)$ and $T({\mathbf e}_2)$, are shown on the right of [Figure 2.6.8](ref:fig-45-rotation-basis).
> FIGURE {fig:fig-45-rotation-basis} number=2.6.8 src=../../media/ch02/45-rotation-basis-a.svg
> alt: Two standard vectors e one and e two
> caption: The matrix transformation $T$ rotates ${\mathbf e}_1$ and ${\mathbf e}_2$ by $45^\circ$.
> subfigure src=../../media/ch02/45-rotation-basis-a.svg alt: Two standard vectors e one and e two
> subfigure src=../../media/ch02/45-rotation-basis-b.svg alt: The result of applying the matrix transformation T to e one and e two
Notice that $T({\mathbf e}_1)$ forms an isosceles right triangle, as shown in [Figure 2.6.9](ref:fig-45-rotation-e1). Since the length of ${\mathbf e}_1$ is 1, the length of $T({\mathbf e}_1)$, the hypotenuse of the triangle, is also 1, and by Pythagoras' theorem, the lengths of its legs are $1/\sqrt{2}$.
> FIGURE {fig:fig-45-rotation-e1} number=2.6.9 src=../../media/ch02/45-rotation-e1.svg
> alt: The vector obtained by rotating e 1 counterclockwise by 45 degrees.
> width: 50%
> caption: The vector $T({\mathbf e}_1)$ has length 1 and is the hypotenuse of a right isosceles triangle.
This leads to $T({\mathbf e}_1) = \left[\begin{array}{r}\frac1{\sqrt{2}} \\ \frac1{\sqrt{2}} \end{array}\right]$. In the same way, we find that $T({\mathbf e}_2) = \left[\begin{array}{r}-\frac1{\sqrt{2}} \\ \frac1{\sqrt{2}} \end{array}\right]$ so that the matrix $A$ is

$$ A = \left[\begin{array}{rr} \frac{1}{\sqrt{2}} & -\frac{1}{\sqrt{2}} \\ \frac{1}{\sqrt{2}} & \frac{1}{\sqrt{2}} \\ \end{array}\right] $$

. You may wish to check this using the interactive diagram in the previous activity using the approximation $1/\sqrt{2} \approx 0.7$.
:::

In this example, we found that $T$, a function describing a rotation in the plane, was in fact a matrix transformation by checking that

$$ \begin{aligned} T(c{\mathbf v}) & {}={} cT({\mathbf v}) \\ T({\mathbf v} + {\mathbf w}) & {}={} T({\mathbf v}) + T({\mathbf w})\text{.} \end{aligned}. $$

The same kind of thinking applies more generally to show that rotations, reflections, and scalings are matrix transformations. Similarly, we could revisit the functions in [Activity 2.5.3](ref:2.5#activity-mt-intro) and verify that they are matrix transformations.

:::activity {act:activity-2-6-3} Activity 2.6.3
In this activity, we seek to describe various matrix transformations by finding the matrix that gives the desired transformation. All of the transformations that we study here have the form $T:{\mathbb R}^2\to{\mathbb R}^2$.

a) 
    Find the matrix of the transformation that has no effect on vectors; that is, $T({\mathbf x}) = {\mathbf x}$.

b) 
    Find the matrix of the transformation that reflects vectors in ${\mathbb R}^2$ across the line $y=x$.

c) 
    What is the result of composing the reflection you found in the previous part with itself; that is, what is the effect of reflecting across the line $y=x$ and then reflecting across this line again? Provide a geometric explanation for your result as well as an algebraic one obtained by multiplying matrices.

d) 
    Find the matrix that rotates vectors counterclockwise in the plane by $90^\circ$.

e) 
    Compare the result of rotating by $90^\circ$ and then reflecting in the line $y=x$ to the result of first reflecting in $y=x$ and then rotating $90^\circ$.

f) 
    Find the matrix that results from composing a $90^\circ$ rotation with itself four times; that is, if $T$ is the matrix transformation that rotates vectors by $90^\circ$, find the matrix for $T\circ T\circ T \circ T$. Explain why your result makes sense geometrically.

g) 
    Explain why the matrix that rotates vectors counterclockwise by an angle $\theta$ is

    $$ \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] $$

    .

SOLUTION:
We use the fact that the columns of the requested matrices have the form $\left[\begin{array}{rr} T({\mathbf e}_1) & T({\mathbf e}_2) \end{array}\right]$.

a) 
    $\left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]$.

c) 
    The composition of this reflection with itself is described by multiplying the matrix by itself. This produces the matrix $\left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]$, which we just saw is the matrix for the identity transformation. This means that reflecting a vector in the line $y=x$ twice produces the original vector.

d) 
    $\left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$.

e) 
    If we first rotate and then reflect, we obtain the matrix transformation defined by

    $$ \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right]\text{,} $$

    which is the matrix for reflecting in the horizontal axis.

    If we first reflect and then rotate, we obtain the matrix

    $$ \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} -1 & 0 \\ 0 & 1 \\ \end{array}\right]\text{,} $$

    which is the matrix for reflecting in the vertical axis.

f) 
    Composing four times corresponds to raising the matrix to the fourth power, which gives us the identity matrix $I$.

g) 
    If we consider the effect of rotating the vector $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ by an angle $\theta$, we obtain the vector $\left[\begin{array}{r}\cos\theta \\ \sin\theta \end{array}\right]$.

:::

## 2.6.3 Matrix transformations and computer animation

Linear algebra plays a significant role in computer animation. We will now illustrate how matrix transformations and some of the ideas we have developed in this section are used by computer animators to create the illusion of motion in their characters.

[Figure 2.6.10](ref:fig-blob-man) shows a test character used by Pixar animators. On the left is the original definition of the character; on the right, we see that the character has been moved into a different pose. To make it appear that the character is moving, animators create a sequence of frames in which the character's pose is modified slightly from one frame to the next often using matrix transformations.

> FIGURE {fig:fig-blob-man} number=2.6.10 src=../../media/ch02/char-bind.jpg
> alt: A three dimensional rendering of a human character used in computer animation.
> caption: Computer animators define a character and create motion by drawing it in a sequence of poses. © Disney/Pixar
> subfigure src=../../media/ch02/char-bind.jpg alt: A three dimensional rendering of a human character used in computer animation.
> subfigure src=../../media/ch02/char-mvt.jpg alt: The same character shown leaning to one side.

Of course, realistic characters will be drawn in three dimensions. To keep things a little more simple, however, we will look at this two-dimensional character and devise matrix transformations that move them into different poses.

> IMAGE {img:animate-char} src=../../media/ch02/animate-char.svg
> alt: A simple two dimensional stick figure that will be used in an upcoming activity.

Of course, the first thing we may wish to do is simply move them to a different position in the plane, such as that shown in [Figure 2.6.11](ref:fig-animate-translate). Motions like this are called *translations*.

> FIGURE {fig:fig-animate-translate} number=2.6.11 src=../../media/ch02/animate-translate.svg
> alt: The character has been translated two units horizontally and one unit vertically.
> width: 45%
> caption: Translating our character to a new position in the plane.

This presents a problem because a matrix transformation $T:{\mathbb R}^2\to{\mathbb R}^2$ has the property that $T({\mathbf 0}) = A{\mathbf 0} = {\mathbf 0}$. This means that a matrix transformation cannot move the origin of the coordinate plane. To address this restriction, animators use *homogeneous coordinates*, which are formed by placing the two-dimensional coordinate plane inside ${\mathbb R}^3$ as the plane $z=1$, as shown in [Figure 2.6.12](ref:fig-animate-homogeneous).

> FIGURE {fig:fig-animate-homogeneous} number=2.6.12 src=../../media/ch02/animate-homogeneous.svg
> alt: A three dimensional figure showing the two dimensional coordinate plane drawn as the plane z equal 1.
> width: 70%
> caption: We include the two-dimensional coordinate plane in ${\mathbb R}^3$ as the plane $z=1$ so that we can translate the character.

As a result, rather than describing points in the plane as vectors $\left[\begin{array}{r}x \\ y \end{array}\right]$, we describe them as three-dimensional vectors $\left[\begin{array}{r}x \\ y \\ 1 \end{array}\right]$. As we see in the next activity, this allows us to translate our character in the plane.

:::activity {act:activity-2-6-4} Activity 2.6.4
In this activity, we will use homogeneous coordinates and matrix transformations to move our character into a variety of poses.

a) 
    Since we regard our character as living in ${\mathbb R}^3$, we will consider matrix transformations defined by matrices

    $$ \left[\begin{array}{rrr} a & b & c \\ d & e & f \\ 0 & 0 & 1 \\ \end{array}\right] $$

    . Verify that such a matrix transformation transforms points in the plane $z=1$ into points in the same plane; that is, verify that

    $$ \left[\begin{array}{rrr} a & b & c \\ d & e & f \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{r}x \\ y \\ 1 \end{array}\right] = \left[\begin{array}{r}x' \\ y' \\ 1 \end{array}\right] $$

    . Express the coordinates of the resulting point $x'$ and $y'$ in terms of the coordinates of the original point $x$ and $y$.

    > FIGURE {fig:figure-animation} number=2.6.13 src=../../media/ch02/animation-preview.png
    > alt: 
    > caption: An interactive diagram that allows us to move the character using homogeneous coordinates.

b) 
    Find the matrix transformation that translates our character to a new position in the plane, as shown in [Figure 2.6.14](ref:fig-animate-translate-2)

    > FIGURE {fig:fig-animate-translate-2} number=2.6.14 src=../../media/ch02/animate-char.svg
    > alt: The standard view of the stick figure character.
    > caption: Translating to a new position.
    > subfigure src=../../media/ch02/animate-char.svg alt: The standard view of the stick figure character.
    > subfigure src=../../media/ch02/animate-translate.svg alt: The stick figure character after translating two units horizontally and one unit vertically.

c) 
    As originally drawn, our character is waving with one of their hands. In one of the movie's scenes, we would like them to wave with their other hand, as shown in [Figure 2.6.15](ref:fig-animate-reflect). Find the matrix transformation that moves them into this pose.

    > FIGURE {fig:fig-animate-reflect} number=2.6.15 src=../../media/ch02/animate-char.svg
    > alt: The standard view of the stick figure character.
    > caption: Waving with the other hand.
    > subfigure src=../../media/ch02/animate-char.svg alt: The standard view of the stick figure character.
    > subfigure src=../../media/ch02/animate-reflect.svg alt: The stick figure character has been reflected in the vertical axis.

d) 
    Later, our character performs a cartwheel by moving through the sequence of poses shown in [Figure 2.6.16](ref:fig-animate-rotate). Find the matrix transformations that create these poses.

    > FIGURE {fig:fig-animate-rotate} number=2.6.16 src=../../media/ch02/animate-rotate-a.svg
    > alt: The stick figure character after rotating 45 degrees counterclockwise about the origin.
    > caption: Performing a cartwheel.
    > subfigure src=../../media/ch02/animate-rotate-a.svg alt: The stick figure character after rotating 45 degrees counterclockwise about the origin.
    > subfigure src=../../media/ch02/animate-rotate-b.svg alt: The stick figure character after rotating 90 degrees counterclockwise about the origin.
    > subfigure src=../../media/ch02/animate-rotate-c.svg alt: The stick figure character after rotating 135 degrees counterclockwise about the origin.
    > subfigure src=../../media/ch02/animate-rotate-d.svg alt: The stick figure character after rotating 180 degrees counterclockwise about the origin.

e) 
    Next, we would like to find the transformations that zoom in on our character's face, as shown in [Figure 2.6.17](ref:fig-animate-closeup). To do this, you should think about composing matrix transformations. This can be accomplished in the diagram by using the *Compose* button, which makes the current pose, displayed on the right, the new beginning pose, displayed on the left. What is the matrix transformation that moves the character from the original pose, shown in the upper left, to the final pose, shown in the lower right?

    > FIGURE {fig:fig-animate-closeup} number=2.6.17 src=../../media/ch02/animate-char.svg
    > alt: The standard view of the stick figure character.
    > caption: Zooming in on our characters' face.
    > subfigure src=../../media/ch02/animate-char.svg alt: The standard view of the stick figure character.
    > subfigure src=../../media/ch02/animate-closeup-a.svg alt: The the stick figure character has been translated downward by one unit.
    > subfigure src=../../media/ch02/animate-closeup-b.svg alt: The the stick figure character has been again translated downward by one unit.
    > subfigure src=../../media/ch02/animate-closeup-c.svg alt: The stick figure character has been enlarged by a factor of two.

f) 
    We would also like to create our character's shadow, shown in the sequence of poses in [Figure 2.6.18](ref:fig-animate-shadow). Find the sequence of matrix transformations that achieves this. In particular, find the matrix transformation that takes our character from their original pose to their shadow in the lower right.

    > FIGURE {fig:fig-animate-shadow} number=2.6.18 src=../../media/ch02/animate-char.svg
    > alt: The standard view of the stick figure character.
    > caption: Casting a shadow.
    > subfigure src=../../media/ch02/animate-char.svg alt: The standard view of the stick figure character.
    > subfigure src=../../media/ch02/animate-shadow-a.svg alt: The character is drawn with the same height but slanting to the right at a 45 degree angle.
    > subfigure src=../../media/ch02/animate-shadow-b.svg alt: The character has been vertically compressed from its previous position.
    > subfigure src=../../media/ch02/animate-shadow-c.svg alt: The character has again been vertically compressed from its previous position.

g) 
    Write a final scene to the movie and describe how to construct a sequence of matrix transformations that create your scene.

SOLUTION:

a) 

    $$ \left[\begin{array}{rrr} a & b & c \\ d & e & f \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{r}x \\ y \\ 1 \end{array}\right] = \left[\begin{array}{c}ax+by+c \\ dx+ey+f \\ 1 \end{array}\right]\text{,} $$

    which shows that

    $$ \begin{alignedat}{2} x' & {}={} ax+by+c \\ y' & {}={} dx+ey+f\text{.} \\ \end{alignedat} $$

b) 
    Notice that the entries $c$ and $f$ are responsible for the translation. Therefore, we need the matrix transformation defined by $\left[\begin{array}{rrr} 1 & 0 & 2 \\ 0 & 1 & 1 \\ 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    We would like to reflect in the vertical axis so we use the matrix $\left[\begin{array}{rrr} -1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

d) 
    The character is successively rotated by $45^\circ$ using the matrix $\left[\begin{array}{rrr} \cos(45^\circ) & -\sin(45^\circ) & 0 \\ \sin(45^\circ) & \sin(45^\circ) & 0 \\ 0 & 0 & 1 \\ \end{array}\right] = \left[\begin{array}{rrr} \frac{1}{\sqrt{2}} & -\frac{1}{\sqrt{2}} & 0 \\ \frac{1}{\sqrt{2}} & \frac{1}{\sqrt{2}} & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

e) 
    We first translate the character down two units using the matrix $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & -2 \\ 0 & 0 & 1 \\ \end{array}\right]$. Then we zoom in by uniformly stretching by a factor of $2$ using the matrix $\left[\begin{array}{rrr} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$. The net effect is the transformation described by the matrix

    $$ \left[\begin{array}{rrr} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & -2 \\ 0 & 0 & 1 \\ \end{array}\right] = \left[\begin{array}{rrr} 2 & 0 & 0 \\ 0 & 2 & -4 \\ 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

f) 
    The shadow is first created using the shear $\left[\begin{array}{rrr} 1 & 1 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$. Then the vertical scale is compressed using the matrix $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & \frac12 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

:::

## 2.6.4 Summary

This section explored how geometric operations are performed by matrix transformations.

- 
    A function $T:{\mathbb R}^n\to{\mathbb R}^m$ is a matrix transformation if and only if these properties are satisfied:

    $$ \begin{aligned} T(c{\mathbf v}) & = cT({\mathbf v}) \\ T({\mathbf v}+{\mathbf w}) & = T({\mathbf v})+T({\mathbf w}). \\ \end{aligned} $$

- 
    Geometric operations, such as rotations, reflections, and scalings, can be represented as matrix transformations.

- 
    Composing geometric operations corresponds to matrix multiplication.

- 
    Computer animators use homogeneous coordinates and matrix transformations to create the illusion of motion.

## 2.6.5 Exercises

:::exercise {exercise-2-6-001} number=2.6.1 answered=yes src=src/exercises/exercises2-6.xml:5
PROBLEM:
For each of the following geometric operations in the plane, find a $2\times 2$ matrix that defines the matrix transformation performing the operation.

a) 
    Rotates vectors by $180^\circ$.

b) 
    Reflects vectors across the vertical axis.

c) 
    Reflects vectors across the line $y=-x$.

d) 
    Rotates vectors counterclockwise by $60^\circ$.

e) 
    First rotates vectors counterclockwise by $60^\circ$ and then reflects in the line $y=x$.

ANSWER:

a) 
    $\left[\begin{array}{rr} -1 & 0 \\ 0 & -1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} -1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rr} 0 & -1 \\ -1 & 0 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rr} \frac 12 & -\frac{\sqrt{3}}2 \\ \frac{\sqrt{3}}2 & \frac12\\ \end{array}\right]$.

e) 
    $\left[\begin{array}{rr} \frac{\sqrt{3}}2 & \frac12\\ \frac 12 & -\frac{\sqrt{3}}2 \\ \end{array}\right]$.

SOLUTION:
We create the following matrices as $\left[\begin{array}{rr} T({\mathbf e}_1) & T({\mathbf e}_2) \\ \end{array}\right]$.

a) 
    $\left[\begin{array}{rr} -1 & 0 \\ 0 & -1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} -1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rr} 0 & -1 \\ -1 & 0 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rr} \cos(60^\circ) & -\sin(60^\circ) \\ \sin(60^\circ) & \cos(60^\circ) \\ \end{array}\right] = \left[\begin{array}{rr} \frac 12 & -\frac{\sqrt{3}}2 \\ \frac{\sqrt{3}}2 & \frac12\\ \end{array}\right]$.

e) 
    $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} \frac 12 & -\frac{\sqrt{3}}2 \\ \frac{\sqrt{3}}2 & \frac12\\ \end{array}\right] = \left[\begin{array}{rr} \frac{\sqrt{3}}2 & \frac12\\ \frac 12 & -\frac{\sqrt{3}}2 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-6-002} number=2.6.2 answered=yes src=src/exercises/exercises2-6.xml:143 label=ex-compose-reflections
PROBLEM:
This exercise investigates the composition of reflections in the plane.

a) 
    Find the result of first reflecting across the line $y=0$ and then $y=x$. What familiar operation is the cumulative effect of this composition?

b) 
    What happens if you compose the operations in the opposite order; that is, what happens if you first reflect across $y=x$ and then $y=0$? What familiar operation results?

c) 
    What familiar geometric operation results if you first reflect across the line $y=x$ and then $y=-x$?

d) 
    What familiar geometric operation results if you first rotate by $90^\circ$ and then reflect across the line $y=x$?

It is a general fact that the composition of two reflections results in a rotation through twice the angle from the first line of reflection to the second. We will investigate this more generally in [Exercise 2.6.8](ref:ex-reflection-compose-general)
ANSWER:

a) 
    This is the same as a counterclockwise $90^\circ$ rotation.

b) 
    This is the same as a clockwise $90^\circ$ rotation.

c) 
    This is the same as a $180^\circ$ rotation.

d) 
    This is the same as a reflection in the horizontal axis.

SOLUTION:

a) 
    $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right] = \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$. This is the same as a counterclockwise $90^\circ$ rotation.

b) 
    $\left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right] \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right]$. This is the same as a clockwise $90^\circ$ rotation.

c) 
    $\left[\begin{array}{rr} 0 & -1 \\ -1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} -1 & 0 \\ 0 & -1 \\ \end{array}\right]$. This is the same as a $180^\circ$ rotation.

d) 
    $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right]$. This is the same as a reflection in the horizontal axis.

:::

:::exercise {exercise-2-6-003} number=2.6.3 answered=yes src=src/exercises/exercises2-6.xml:276
PROBLEM:
Shown below in [Figure 2.6.19](ref:fig-3d-basis) are the vectors ${\mathbf e}_1$, ${\mathbf e}_2$, and ${\mathbf e}_3$ in ${\mathbb R}^3$.
> FIGURE {fig:fig-3d-basis} number=2.6.19 src=../../media/ch02/3d-basis-2-6.svg
> alt: A set of three dimensional coordinate axes with a vector of length one drawn on each of the axes.
> width: 50%
> caption: The vectors ${\mathbf e}_1$, ${\mathbf e}_2$, and ${\mathbf e}_3$ in ${\mathbb R}^3$.

a) 
    Imagine that the thumb of your right hand points in the direction of ${\mathbf e}_1$. A positive rotation about the $x$ axis corresponds to a rotation in the direction in which your fingers point. Find the matrix definining the matrix transformation $T$ that rotates vectors by $90^\circ$ around the $x$-axis.

b) 
    In the same way, find the matrix that rotates vectors by $90^\circ$ around the $y$-axis.

c) 
    Find the matrix that rotates vectors by $90^\circ$ around the $z$-axis.

d) 
    What is the cumulative effect of rotating by $90^\circ$ about the $x$-axis, followed by a $90^\circ$ rotation about the $y$-axis, followed by a $-90^\circ$ rotation about the $x$-axis.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & -1 \\ 0 & 1 & 0 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ -1 & 0 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 0 & -1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rrr} 0 & 1 & 0 \\ -1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

SOLUTION:
We construct the matrices as $\left[\begin{array}{rrr} T({\mathbf e}_1) & T({\mathbf e}_2) & T({\mathbf e}_3) \\ \end{array}\right]$.

a) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & -1 \\ 0 & 1 & 0 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ -1 & 0 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 0 & -1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & -1 & 0 \\ \end{array}\right] \left[\begin{array}{rrr} 0 & 0 & 1 \\ 0 & 1 & 0 \\ -1 & 0 & 0 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 0 & -1 \\ 0 & 1 & 0 \\ \end{array}\right]= \left[\begin{array}{rrr} 0 & 1 & 0 \\ -1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$, which is a $-90^\circ$ rotation about the $z$-axis.

:::

:::exercise {exercise-2-6-004} number=2.6.4 answered=yes src=src/exercises/exercises2-6.xml:442
PROBLEM:
If a matrix transformation performs a geometric operation, we would like to find a matrix transformation that undoes that operation.

a) 
    Suppose that $T:{\mathbb R}^2\to{\mathbb R}^2$ is the matrix transformation that rotates vectors by $90^\circ$. Find a matrix transformation $S:{\mathbb R}^2\to{\mathbb R}^2$ that undoes the rotation; that is, $S$ takes $T({\mathbf x})$ back into ${\mathbf x}$ so that $(S\circ T)({\mathbf x}) = {\mathbf x}$. Think geometrically about what the transformation $S$ should be and then verify it algebraically.

    We say that $S$ is the *inverse* of $T$ and we will write it as $T^{-1}$.

b) 
    Verify algebraically that the reflection $R:{\mathbb R}^2\to{\mathbb R}^2$ across the line $y=x$ is its own inverse; that is, $R^{-1} = R$.

c) 
    The matrix transformation $T:{\mathbb R}^2\to{\mathbb R}^2$ defined by the matrix

    $$ A= \left[\begin{array}{rr} 1& 1 \\ 0 & 1\\ \end{array}\right] $$

    is called a *shear*. Find the inverse of $T$.

d) 
    Describe the geometric effect of the matrix transformation defined by

    $$ A=\left[\begin{array}{rr} \frac12 & 0 \\ 0 & 3\\ \end{array}\right] $$

    and then find its inverse.

ANSWER:

a) 
    $\left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right]$.

b) 
    The square of the matrix $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]$ is the identity.

c) 
    $\left[\begin{array}{rr} 1 & -1 \\ 0 & 1 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rr} 2 & 0 \\ 0 & \frac13 \\ \end{array}\right]$.

SOLUTION:

a) 
    The transformation $S$ should rotate vectors by $-90^\circ$. The matrix is therefore $\left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right]$.

    To check $S\circ T$, we compute $\left[\begin{array}{rr} 0 & 1 \\ -1 & 0 \\ \end{array}\right] \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]$.

b) 
    The matrix defining the reflection is $\left[\begin{array}{rr} 0 & 1 \\ 1 & 0 \\ \end{array}\right]$. Multiplying this by itself gives the identity.

c) 
    We should apply a shear in the opposite direction: $\left[\begin{array}{rr} 1 & -1 \\ 0 & 1 \\ \end{array}\right]$.

d) 
    We will undo the stretch in the horizontal and vertical directions with the matrix $\left[\begin{array}{rr} 2 & 0 \\ 0 & \frac13 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-6-005} number=2.6.5 answered=yes src=src/exercises/exercises2-6.xml:599
PROBLEM:
We have seen that the matrix

$$ \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] $$

performs a rotation through an angle $\theta$ about the origin. Suppose instead that we would like to rotate by $90^\circ$ about the point $(1,2)$. Using homogeneous coordinates, we will develop a matrix that performs this operation.
Our strategy is to

- 
    begin with a vector whose tail is at the point $(1,2)$,

- 
    translate the vector so that its tail is at the origin,

- 
    rotate by $90^\circ$, and

- 
    translate the vector so that its tail is back at $(1,2)$.

This is shown in [Figure 2.6.20](ref:fig-ex-rotate-about-p).
> FIGURE {fig:fig-ex-rotate-about-p} number=2.6.20 src=../../media/ch02/ex-rotate-about-p-a.svg
> alt: We wish to rotate this vector based at the point one two
> caption: A sequence of matrix transformations that, when read right to left and top to bottom, rotate a vector about the point $(1,2)$.
> subfigure src=../../media/ch02/ex-rotate-about-p-a.svg alt: We wish to rotate this vector based at the point one two
> subfigure src=../../media/ch02/ex-rotate-about-p-b.svg alt: We translate the vector so that it is based at the origin
> subfigure src=../../media/ch02/ex-rotate-about-p-c.svg alt: We next rotate the translated vector by 90 degrees
> subfigure src=../../media/ch02/ex-rotate-about-p-d.svg alt: Finally, we translate the vector back to the point one two
Remember that, when working with homogeneous coordinates, we consider matrices of the form

$$ \left[\begin{array}{rrr} a & b & c \\ d & e & f \\ 0 & 0 & 1 \\ \end{array}\right] $$

.

a) 
    The first operation is a translation by $(-1,-2)$. Find the matrix that performs this translation.

b) 
    The second operation is a $90^\circ$ rotation about the origin. Find the matrix that performs this rotation.

c) 
    The third operation is a translation by $(1,2)$. Find the matrix that performs this translation.

d) 
    Use these matrices to find the matrix that performs a $90^\circ$ rotation about $(1,2)$.

e) 
    Use your matrix to determine where the point $(-10, 5)$ ends up if rotated by $90^\circ$ about the $(1,2)$.

ANSWER:

a) 
    $\left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & -2 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 0 & -1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 1 & 0 & 1 \\ 0 & 1 & 2 \\ 0 & 0 & 1 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rrr} 0 & -1 & 3 \\ 1 & 0 & 1 \\ 0 & 0 & 1 \\ \end{array}\right].$

e) 
    The point $(-10,5)$ is rotated to $(-2,-9)$.

SOLUTION:

a) 
    $\left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & -2 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 0 & -1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 1 & 0 & 1 \\ 0 & 1 & 2 \\ 0 & 0 & 1 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rrr} 1 & 0 & 1 \\ 0 & 1 & 2 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 0 & -1 & 0 \\ 1 & 0 & 0 \\ 0 & 0 & 1 \\ \end{array}\right] \left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & -2 \\ 0 & 0 & 1 \\ \end{array}\right] = \left[\begin{array}{rrr} 0 & -1 & 3 \\ 1 & 0 & 1 \\ 0 & 0 & 1 \\ \end{array}\right].$

e) 
    If we call this matrix $C$, we compute $C\left[\begin{array}{r}-10 \\ 5 \\ 1 \end{array}\right] = \left[\begin{array}{r}-2 \\ -9 \\ 1 \end{array}\right]$. Therefore, the point $(-10,5)$ is rotated to $(-2,-9)$.

:::

:::exercise {exercise-2-6-006} number=2.6.6 answered=yes src=src/exercises/exercises2-6.xml:839
PROBLEM:
Consider the matrix transformation $T:{\mathbb R}^2\to{\mathbb R}^2$ that assigns to a vector ${\mathbf x}$ the closest vector on horizontal axis as illustrated in [Figure 2.6.21](ref:fig-ex-projection). This transformation is called the *projection* onto the horizontal axis. You may imagine $T({\mathbf x})$ as the shadow cast by ${\mathbf x}$ from a flashlight far up on the positive $y$-axis.
> FIGURE {fig:fig-ex-projection} number=2.6.21 src=../../media/ch02/v-projection-a.svg
> alt: The vector x whose components are two three
> caption: Projection onto the $x$-axis.
> subfigure src=../../media/ch02/v-projection-a.svg alt: The vector x whose components are two three
> subfigure src=../../media/ch02/v-projection-b.svg alt: The vector x whose components are two three

a) 
    Find the matrix that defines this matrix transformation $T$.

b) 
    Find the matrix that defines projection on the vertical axis.

c) 
    What is the result of composing the projection onto the horizontal axis with the projection onto the vertical axis?

d) 
    Find the matrix that defines projection onto the line $y=x$.

ANSWER:

a) 
    $\left[\begin{array}{rr} 1 & 0 \\ 0 & 0 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} 0 & 0 \\ 0 & 1 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rr} 0 & 0 \\ 0 & 0 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rr} \frac12 & \frac12 \\ \frac12 & \frac12 \\ \end{array}\right]$.

SOLUTION:

a) 
    $\left[\begin{array}{rr} 1 & 0 \\ 0 & 0 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} 0 & 0 \\ 0 & 1 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rr} 0 & 0 \\ 0 & 1 \\ \end{array}\right] \left[\begin{array}{rr} 1 & 0 \\ 0 & 0 \\ \end{array}\right] = \left[\begin{array}{rr} 0 & 0 \\ 0 & 0 \\ \end{array}\right]$. The result of composing the two projections sends every vector to ${\mathbf 0}$.

d) 
    $\left[\begin{array}{rr} \frac12 & \frac12 \\ \frac12 & \frac12 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-6-007} number=2.6.7 answered=yes src=src/exercises/exercises2-6.xml:1000
PROBLEM:
This exercise concerns the matrix transformations defined by matrices of the form

$$ A = \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right] $$

. Let's begin by looking at two special types of these matrices.

a) 
    First, consider the matrix where $a = 2$ and $b=0$ so that

    $$ A = \left[\begin{array}{rr} 2 & 0 \\ 0 & 2 \\ \end{array}\right] $$

    . Describe the geometric effect of this matrix. More generally, suppose we have

    $$ A = \left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right] $$

    , where $r$ is a positive number. What is the geometric effect of $A$ on vectors in the plane?

b) 
    Suppose now that $a = 0$ and $b = 1$ so that

    $$ A = \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right] $$

    . What is the geometric effect of $A$ on vectors in the plane? More generally, suppose we have

    $$ A = \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] $$

    . What is the geometric effect of $A$ on vectors in the plane?

c) 
    In general, the composition of matrix transformation depends on the order in which we compose them. For these transformations, however, it is not the case. Check this by verifying that

    $$ \left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right] \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] = \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] \left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right] $$

    .

d) 
    Let's now look at the general case where

    $$ A = \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right] $$

    . We will draw the vector $\left[\begin{array}{r}a \\ b \end{array}\right]$ in the plane and express it using polar coordinates $r$ and $\theta$ as shown in [Figure 2.6.22](ref:fig-ex-complex-polar).

    > FIGURE {fig:fig-ex-complex-polar} number=2.6.22 src=../../media/ch02/ex-complex-polar.svg
    > alt: A vector is represented by an arrow with its length and the angle with the horizontal axis indicated.
    > caption: A vector may be expressed in polar coordinates.

    We then have

    $$ \left[\begin{array}{r}a \\ b \end{array}\right] = \left[\begin{array}{r}r\cos\theta \\ r\sin\theta \end{array}\right] $$

    . Show that the matrix

    $$ \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right] = \left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right] \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] $$

    .

e) 
    Using this description, describe the geometric effect on vectors in the plane of the matrix transformation defined by

    $$ A= \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right] $$

    .

f) 
    Suppose we have a matrix transformation $T$ defined by a matrix $A$ and another transformation $S$ defined by $B$ where

    $$ A= \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right],~~~ B= \left[\begin{array}{rr} c & -d \\ d & c \\ \end{array}\right] $$

    . Describe the geometric effect of the composition $S\circ T$ in terms of the $a$, $b$, $c$, and $d$.

The matrices of this form give a model for the complex numbers and will play an important role in [Section 4.4](ref:4.4#sec-dynamical).
ANSWER:

a) 
    It stretches vectors by $r$.

b) 
    This matrix rotates vectors by an angle $\theta$.

c) 
    No matter which order we multiply the matrices, we find that their product is

    $$ \left[\begin{array}{rr} r\cos\theta & -r\sin\theta \\ r\sin\theta & r\sin\theta \\ \end{array}\right]\text{.} $$

d) 
    This follows from the previous part.

e) 
    If we use polar coordinates to write $\left[\begin{array}{r}a \\ b \end{array}\right] = \left[\begin{array}{r}r\cos\theta \\ r\sin\theta \end{array}\right]$, multiplying a vector by $A$ will stretch the vector by $r$ and rotate it by $\theta$.

f) 
    If

    $$ \left[\begin{array}{r}a \\ b \end{array}\right] = \left[\begin{array}{r}r\cos\theta \\ r\sin\theta \end{array}\right], \left[\begin{array}{r}c \\ d \end{array}\right] = \left[\begin{array}{r}s\cos\phi \\ s\sin\phi \end{array}\right]\text{,} $$

    then $S\circ T$ has the effect of stretching a vector by $rs$ and rotating it by $\theta + \phi$.

SOLUTION:

a) 
    The matrix $\left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right]$ stretches vectors by $r$. It has the same effect as scalar multiplication by $r$.

b) 
    This matrix rotates vectors by an angle $\theta$.

c) 
    No matter which order we multiply the matrices, we find that their product is

    $$ \left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right] \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \sin\theta \\ \end{array}\right] = \left[\begin{array}{rr} r\cos\theta & -r\sin\theta \\ r\sin\theta & r\sin\theta \\ \end{array}\right]\text{.} $$

d) 
    This follows from the previous part.

e) 
    If we use polar coordinates to write $\left[\begin{array}{r}a \\ b \end{array}\right] = \left[\begin{array}{r}r\cos\theta \\ r\sin\theta \end{array}\right]$, multiplying a vector by $A$ will stretch the vector by $r$ and rotate it by $\theta$.

f) 
    If

    $$ \left[\begin{array}{r}a \\ b \end{array}\right] = \left[\begin{array}{r}r\cos\theta \\ r\sin\theta \end{array}\right], \left[\begin{array}{r}c \\ d \end{array}\right] = \left[\begin{array}{r}s\cos\phi \\ s\sin\phi \end{array}\right]\text{,} $$

    then $S\circ T$ has the effect of stretching a vector by $rs$ and rotating it by $\theta + \phi$.

:::

:::exercise {exercise-2-6-008} number=2.6.8 answered=yes src=src/exercises/exercises2-6.xml:1279 label=ex-reflection-compose-general
PROBLEM:
We saw earlier that the rotation in the plane through an angle $\theta$ is given by the matrix:

$$ \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] $$

. We would like to find a similar expression for the matrix that represents the reflection across $L_\theta$, the line passing through the origin and making an angle of $\theta$ with the positive $x$-axis, as shown in [Figure 2.6.23](ref:fig-ex-reflection-def).
> FIGURE {fig:fig-ex-reflection-def} number=2.6.23 src=../../media/ch02/ex-reflection-def.svg
> alt: A line, a vector x, and the result of reflecting x in the line.
> width: 50%
> caption: The reflection across the line $L_\theta$.

a) 
    To do this, notice that this reflection can be obtained by composing three separate transformations as shown in [Figure 2.6.24](ref:fig-ex-reflection-compose). Beginning with the vector ${\mathbf x}$, we apply the transformation $R$ to rotate by $-\theta$ and obtain $R({\mathbf x})$. Next, we apply $S$, a reflection in the horizontal axis, followed by $T$, a rotation by $\theta$. We see that $T(S(R({\mathbf x})))$ is the same as the reflection of ${\mathbf x}$ in the original line $L_\theta$.

    > FIGURE {fig:fig-ex-reflection-compose} number=2.6.24 src=../../media/ch02/ex-reflection-compose-a.svg
    > alt: A line that makes an angle theta with the horizontal axis and a vector x
    > caption: Reflection in the line $L_\theta$ as a composition of three transformations.
    > subfigure src=../../media/ch02/ex-reflection-compose-a.svg alt: A line that makes an angle theta with the horizontal axis and a vector x
    > subfigure src=../../media/ch02/ex-reflection-compose-b.svg alt: The vector and the line have been rotated by an angle negative theta
    > subfigure src=../../media/ch02/ex-reflection-compose-c.svg alt: The rotated vector is next reflected across the horizontal axis
    > subfigure src=../../media/ch02/ex-reflection-compose-d.svg alt: Finally the line and vector are rotated by an angle theta

    Using this decomposition, show that the reflection in the line $L_\theta$ is described by the matrix

    $$ \left[\begin{array}{rr} \cos(2\theta) & \sin(2\theta) \\ \sin(2\theta) & -\cos(2\theta) \\ \end{array}\right] $$

    . You will need to remember the trigonometric identities:

    $$ \begin{aligned} \cos(2\theta) & {}={} \cos^2\theta - \sin^2\theta \\ \sin(2\theta) & {}={} 2\sin\theta\cos\theta \\ \end{aligned} $$

    .

b) 
    Now that we have a matrix that describes the reflection in the line $L_\theta$, show that the composition of the reflection in the horizontal axis followed by the reflection in $L_\theta$ is a counterclockwise rotation by an angle $2\theta$. We saw some examples of this earlier in [Exercise 2.6.2](ref:ex-compose-reflections).

ANSWER:

a) 
    We have

    $$ \begin{array}{rl} \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right] & \left[\begin{array}{rr} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \\ \end{array}\right] \\ = & \left[\begin{array}{rr} \cos(2\theta) & \sin(2\theta) \\ \sin(2\theta) & -\cos(2\theta) \\ \end{array}\right] \text{.} \end{array} $$

b) 
    Compute that

    $$ \left[\begin{array}{rr} \cos(2\theta) & \sin(2\theta) \\ \sin(2\theta) & -\cos(2\theta) \\ \end{array}\right] \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right] = \left[\begin{array}{rr} \cos(2\theta) & -\sin(2\theta) \\ \sin(2\theta) & \cos(2\theta) \end{array}\right]\text{.} $$

SOLUTION:

a) 
    We have

    $$ \begin{array}{rl} \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] & \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right] \left[\begin{array}{rr} \cos\theta & \sin\theta \\ -\sin\theta & \cos\theta \\ \end{array}\right] \\ = & \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right] \left[\begin{array}{rr} \cos\theta & \sin\theta \\ \sin\theta & -\cos\theta \\ \end{array}\right] \\ = & \left[\begin{array}{rr} \cos(2\theta) & \sin(2\theta) \\ \sin(2\theta) & -\cos(2\theta) \\ \end{array}\right] \text{.} \end{array} $$

b) 
    Compute that

    $$ \left[\begin{array}{rr} \cos(2\theta) & \sin(2\theta) \\ \sin(2\theta) & -\cos(2\theta) \\ \end{array}\right] \left[\begin{array}{rr} 1 & 0 \\ 0 & -1 \\ \end{array}\right] = \left[\begin{array}{rr} \cos(2\theta) & -\sin(2\theta) \\ \sin(2\theta) & \cos(2\theta) \end{array}\right]\text{.} $$

:::
