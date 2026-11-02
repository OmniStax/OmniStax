# 1.1 What can we expect {sec-expect}

At its heart, the subject of linear algebra is about linear equations and, more specifically, sets of two or more linear equations. Google routinely deals with a set of trillions of equations each of which has trillions of unknowns. We will eventually understand how to deal with that kind of complexity. To begin, however, we will look at a more familiar situation in which there are a small number of equations and a small number of unknowns. In spite of its relative simplicity, this situation is rich enough to demonstrate some fundamental concepts that will motivate much of our exploration.

## 1.1.1 Some simple examples

:::activity {act:activity-1-1-1} Activity 1.1.1
In this activity, we consider sets of linear equations having just two unknowns. In this case, we can graph the solutions sets for the equations, which allows us to visualize different types of behavior.
PROBLEM:
a) On the grid below, graph the lines

    $$ \begin{aligned} y & = x+1 \\ y & = 2x-1\text{.} \\ \end{aligned} $$

    At what point or points $(x,y)$, do the lines intersect? How many points $(x,y)$ satisfy both equations?
    > FIGURE {fig:fig-1-1-1} number=1.1.1 src=../../media/ch01/empty-4.svg
    > alt: A coordinate grid and axes for plotting two lines.
    > width: 50%
    > caption: A coordinate grid and axes for plotting two lines.
b) On the grid below, graph the lines

    $$ \begin{aligned} y & = x+1 \\ y & = x-1\text{.} \\ \end{aligned} $$

    At what point or points $(x,y)$, do the lines intersect? How many points $(x,y)$ satisfy both equations?
    > FIGURE {fig:fig-1-1-2} number=1.1.2 src=../../media/ch01/empty-4.svg
    > alt: A coordinate grid and axes for plotting two lines.
    > width: 50%
    > caption: A coordinate grid and axes for plotting two lines.
c) On the grid below, graph the line

    $$ y = x+1 $$

    .
    How many points $(x,y)$ satisfy this equation?
    > FIGURE {fig:fig-1-1-3} number=1.1.3 src=../../media/ch01/empty-4.svg
    > alt: A coordinate grid and axes for plotting two lines.
    > width: 50%
    > caption: A coordinate grid and axes for plotting two lines.
d) On the grid below, graph the lines

    $$ \begin{aligned} y & = x+1 \\ y & = 2x-1 \\ y & = -x. \\ \end{aligned} $$

    At what point or points $(x,y)$, do the lines intersect? How many points $(x,y)$ satisfy all three equations?
    > FIGURE {fig:fig-1-1-4} number=1.1.4 src=../../media/ch01/empty-4.svg
    > alt: A coordinate grid and axes for plotting two lines.
    > width: 50%
    > caption: A coordinate grid and axes for plotting two lines.
ANSWER:
a) There is exactly one point, the point $(2,3)$, that satisfies both equations.
b) There are no points that satisfy both equations.
c) There are infinitely many points.
d) There are no points that satisfy all three equations.
SOLUTION:
a) The graph of the two lines is as shown on the right. There is a single point, the point $(2,3)$, at which the lines intersect. Therefore, there is a single point that satisfies both equations.

    > IMAGE {img:intro-two} src=../../media/ch01/intro-two.svg
    > alt: Two lines that intersect in a point

b) These two lines are parallel, which means there is no point at which the lines intersect. Therefore, there is no point that satisfies both equations.

    > IMAGE {img:intro-parallel} src=../../media/ch01/intro-parallel.svg
    > alt: Two parallel lines

c) There are infinitely many points that lie on this line and that, therefore, satisfy this single equation.

    > IMAGE {img:intro-single} src=../../media/ch01/intro-single.svg

d) These three lines do not have a common intersection point. Consequently, there is no point satisfying all three equations.

    > IMAGE {img:intro-three} src=../../media/ch01/intro-three.svg

:::

The examples in this introductory activity demonstrate several possible outcomes for the solutions to a set of linear equations. Notice that we are interested in points that satisfy each equation in the set and that these are seen as intersection points of the lines. Similar to the examples considered in the activity, three types of outcomes are seen in [Figure 1.1.5](ref:fig-three-possibilities).

> FIGURE {fig:fig-three-possibilities} number=1.1.5 src=../../media/ch01/three-possibilities-1.svg
> alt: A single line
> caption: Three sets of linear equations demonstrating there can be infinitely, exactly one, or no solutions.
> subfigure src=../../media/ch01/three-possibilities-1.svg alt: A single line
> subfigure src=../../media/ch01/three-possibilities-2.svg alt: Two lines that intersect in a point
> subfigure src=../../media/ch01/three-possibilities-3.svg alt: Three lines that have no common point of intersection

In [Figure 1.1.5](ref:fig-three-possibilities), we see that

- With a single equation, there are infinitely many points $(x,y)$ satisfying that equation.
- Adding a second equation adds another condition we place on the points $(x,y)$ resulting in a single point that satisfies both equations.
- Adding a third equation adds a third condition on the points $(x,y)$, and there is no point that satisfies all three equations.

Generally speaking, a single equation will have many solutions, in fact, infinitely many. As we add equations, we add conditions which lead, in a sense we will make precise later, to a smaller number of solutions. Eventually, we have too many equations and find there are no points that satisfy all of them.

This example illustrates a general principle to which we will frequently return.

:::assemblage {asm:solution-possibilities} Solutions to sets of linear equations
Given a set of linear equations, there are either:

- 
    infinitely many points,

- 
    exactly one point, or

- 
    no points

that satisfy every equation in the set.
:::

Notice that we can see a bit more. In [Figure 1.1.5](ref:fig-three-possibilities), we are looking at equations in two unknowns. Here we see that

- 
    One equation has infinitely many solutions.

- 
    Two equations have exactly one solution.

- 
    Three equations have no solutions.

It seems reasonable to wonder if the number of solutions depends on whether the number of equations is less than, equal to, or greater than the number of unknowns. Of course, one of the examples in the activity shows that there are exceptions to this simple rule, as seen in [Figure 1.1.6](ref:solution-exceptions). For instance, two equations in two unknowns may correspond to parallel lines so that the set of equations has no solutions. It may also happen that a set of three equations in two unknowns has a single solution. However, it seems safe to think that the more equations we have, the smaller the set of solutions will be.

> FIGURE {fig:solution-exceptions} number=1.1.6 src=../../media/ch01/intro-parallel-2.svg
> alt: Two parallel lines
> caption: A set of two equations in two unknowns can have no solutions, and a set of three equations can have one solution.
> subfigure src=../../media/ch01/intro-parallel-2.svg alt: Two parallel lines
> subfigure src=../../media/ch01/intro-coincident.svg alt: Three lines that intersect in a single point.

Let's also consider some examples of equations having three unknowns, which we call $x$, $y$, and $z$. Just as solutions to linear equations in two unknowns formed straight lines, solutions to linear equations in three unknowns form planes.

When we consider an equation in three unknowns graphically, we need to add a third coordinate axis, as shown in [Figure 1.1.7](ref:fig-coordinates).

> FIGURE {fig:fig-coordinates} number=1.1.7 src=../../media/ch01/coordinates-2d.svg
> alt: A set of two dimensional coordinate axes labelled by x and y.
> caption: Coordinate systems in two and three dimensions.
> subfigure src=../../media/ch01/coordinates-2d.svg alt: A set of two dimensional coordinate axes labelled by x and y.
> subfigure src=../../media/ch01/coordinates-3d.svg alt: A set of three dimensional coordinate axes labelled by x, y, and z.

As shown in [Figure 1.1.8](ref:fig-plane-z0), a linear equation in two unknowns, such as $y=0$, is a line while a linear equation in three unknowns, such as $z=0$, is a plane.

> FIGURE {fig:fig-plane-z0} number=1.1.8 src=../../media/ch01/2dy0.svg
> alt: The solution to the equation y equals zero in two dimensions
> caption: The solutions to the equation $y=0$ in two dimensions and $z=0$ in three.
> subfigure src=../../media/ch01/2dy0.svg alt: The solution to the equation y equals zero in two dimensions
> subfigure src=../../media/ch01/3dz0.svg alt: The solution to the equation z equals zero in three dimensions.

In three unknowns, the set of solutions to one linear equation forms a plane. The set of solutions to a pair of linear equations is seen graphically as the intersection of the two planes. As in [Figure 1.1.9](ref:fig-two-planes), we typically expect this intersection to be a line.

> FIGURE {fig:fig-two-planes} number=1.1.9 src=../../media/ch01/plane-simple.svg
> alt: A single plane in three dimensions.
> caption: A single plane and the intersection of two planes.
> subfigure src=../../media/ch01/plane-simple.svg alt: A single plane in three dimensions.
> subfigure src=../../media/ch01/plane-int-1.svg alt: Two planes intersecting in a line.

When we add a third equation, we are looking for the intersection of three planes, which we expect to form a point, as in the left of [Figure 1.1.10](ref:fig-three-planes). However, in certain special cases, it may happen that there are no solutions, as seen on the right.

> FIGURE {fig:fig-three-planes} number=1.1.10 src=../../media/ch01/plane-int-2.svg
> alt: Three planes that intersect in a single point.
> caption: Two examples showing the intersections of three planes.
> subfigure src=../../media/ch01/plane-int-2.svg alt: Three planes that intersect in a single point.
> subfigure src=../../media/ch01/plane-int-3.svg alt: Three planes that do not intersect in any common points.

:::activity {act:activity-1-1-2} Activity 1.1.2
This activity considers sets of equations having three unknowns. In this case, we know that the solutions of a single equation form a plane. If it helps with visualization, consider using $3\times5$-inch index cards to represent planes.

a) 
    Is it possible that there are no solutions to two linear equations in three unknowns? Either sketch an example or state a reason why it can't happen.

b) 
    Is it possible that there is exactly one solution to two linear equations in three unknowns? Either sketch an example or state a reason why it can't happen.

c) 
    Is it possible that the solutions to four equations in three unknowns form a line? Either sketch an example or state a reason why it can't happen.

d) 
    What would you usually expect for the set of solutions to four equations in three unknowns?

e) 
    Suppose we have a set of 500 linear equations in 10 unknowns. Which of the [three possibilities](ref:solution-possibilities) would you expect to hold?

f) 
    Suppose we have a set of 10 linear equations in 500 unknowns. Which of the three possibilities would you expect to hold?

ANSWER:

a) 
    Yes.

b) 
    No.

c) 
    Yes.

d) 
    We would expect there to be no solutions.

e) 
    We would expect there to be no solutions.

f) 
    We would expect there to be infinitely many solutions.

SOLUTION:

a) 
    Yes, it is possible if the two planes are parallel to one another.

b) 
    No, this is not possible. Two planes will either intersect in a line, if they are not parallel, or not intersect at all, if they are parallel.

c) 
    Yes, it is possible that four planes intersect in a line. One may sketch four planes that intersect in, say, the $z$-axis.

d) 
    In general, we would expect there to be no solutions to four equations in three unknowns because there are more equations than unknowns.

e) 
    Since there are more equations than unknowns, we would expect there to be no solutions. We cannot guarantee this, however.

f) 
    Since there are fewer equations than unknowns, we would expect there to be infinitely many solutions. We cannot guarantee this, however.

:::

## 1.1.2 Systems of linear equations

Now that we have seen some simple examples, let's agree on some terminology to help us think more precisely about sets of equations.

First, we considered a linear equation having the form

$$ y = 2x - 1 $$

. It will be convenient for us to rewrite this so that all the unknowns are on one side of the equation:

$$ -2x + y = -1 $$

. More generally, the equation of a line can always be expressed in the form

$$ ax + by = c, $$

which gives us the flexibility to describe all lines. For instance, vertical lines, such as $x=3$, may be represented in this form.

Notice that each term on the left is the product of a constant and the first power of an unknown. In the future, we will want to consider equations having many more unknowns, which we will sometimes denote as $x_1, x_2, \ldots, x_n$. This leads to the following definition:

:::definition {def:definition-1-1-11} Definition 1.1.11
{index-entry:linear equation} A linear equation in the unknowns $x_1,x_2,\ldots,x_n$ may be written in the form

$$ a_1x_1 + a_2x_2 + \ldots + a_nx_n = b $$

, where $a_1,a_2,\ldots,a_n$ are real numbers known as *coefficients*. We also say that $x_1,x_2,\ldots,x_n$ are the *variables* in the equation.
By a *system of linear equations*{index:system of linear equations} or a {index-entry:linear system} *linear system*{index:linear system}, we mean a set of linear equations written in a common set of unknowns.
:::

For instance,

$$ \begin{alignedat}{4} 2x_1 & {} + & {} 1.2x_2 & {}-{} & 4x_3 & {}={} & 3.7 \\ -0.1x_1 & {} & {} & {} + {} & x_3 & {}={} & 2 \\ x_1 & {}+{} & x_2 & {}-{} & x_3 & {}={} & 1.4 \\ \end{alignedat} $$

is an example of a linear system.

:::definition {def:definition-1-1-12} Definition 1.1.12
{index-entry:solution} A *solution*{index:solution} to a linear system is simply a set of numbers $x_1 = s_1, x_2 = s_2, \ldots, x_n=s_n$ that satisfy all the equations in the system.
:::

For instance, we earlier considered the linear system

$$ \begin{alignedat}{3} -x & {}+{} & y & {} = {} & 1 \\ -2x & {}+{} & y & {} = {} & -1. \\ \end{alignedat} $$

To check that $(x,y) = (2,3)$ is a solution, we verify that the following equations are true.

$$ \begin{alignedat}{3} -2 & {}+{} & 3 & {} = {} & 1 \\ -2(2) & {}+{} & 3 & {} = {} & -1. \\ \end{alignedat} $$

:::definition {def:definition-1-1-13} Definition 1.1.13
{index-entry:solution space} We call the set of all solutions the *solution space*{index:solution space} of the linear system.
:::

:::activity {act:activity-1-1-3} Activity 1.1.3 (Linear equations and their solutions)

a) 
    Which of the following equations are linear? Please provide a justification for your response.

    1. 

        $$ 2x + xy -3y^2 = 2 $$

        .

    2. 

        $$ -2x_1 + 3x_2 +4x_3 - x_5 = 0 $$

        .

    3. 

        $$ x = 3z - 4y $$

        .

b) 
    Consider the system of linear equations:

    $$ \begin{alignedat}{4} x & {}+{} & y & & & {}={} & 3 \\ & & y & {}-{} & z & {}={} & 2 \\ 2x & {}+{} & y & {}+{} & z & {}={} & 4. \\ \end{alignedat} $$

    1. 
        Is $(x,y,z) = (1,2,0)$ a solution?

    2. 
        Is $(x,y,z) = (-2,1,0)$ a solution?

    3. 
        Is $(x,y,z) = (0,-3,1)$ a solution?

    4. 
        Can you find a solution in which $y = 0$?

    5. 
        Do you think there are other solutions? Please explain your response.

ANSWER:

a) 
    There are two linear equations in this list.

    1. 
        This is not a linear equation.

    2. 
        This is a linear equation.

    3. 
        This is a linear equation.

b) 
    We will see that the system of linear equations has infinitely many solutions.

    1. 
        This is a solution.

    2. 
        This is a not solution.

    3. 
        This is a not solution.

    4. 
        Yes, $(x,y,z) = (3,0,-2)$ is a solution.

    5. 
        Yes, because there should be infinitely many solutions.

SOLUTION:

a) 
    There are two linear equations in this list.

    1. 
        This is not a linear equation due to the presence of $y^2$ in the third term on the left.

    2. 
        This is a linear equation.

    3. 
        This is a linear equation since it can be rewritten in the form $x + 4y - 3z = 0$.

b) 
    We will see that the system of linear equations has infinitely many solutions.

    1. 
        Yes, this is a solution since all three equations are satisfied if we set $x=1$, $y=2$, and $z=0$.

    2. 
        No, this is not a solution since the first equation is not satisfied if $x=-2$ and $y=1$.

    3. 
        This is also not a solution.

    4. 
        If $y=0$, then we arrive at the system of three linear equations:

        $$ \begin{alignedat}{4} x & & & {}={} & 3 \\ & {}-{} & z & {}={} & 2 \\ 2x & {}+{} & z & {}={} & 4. \\ \end{alignedat} $$

        We have a solution when $x=3$ and $z=-2$. Therefore, $(x,y,z)=(3,0,-2)$ is a solution to the original system of equations.

    5. 
        Since we have found more than one solution to the system of equations, we should expect that there are infinitely many. Therefore, there should be many other solutions.

:::

## 1.1.3 Summary

The point of this section is to build some intuition about the behavior of solutions to linear systems through consideration of some simple examples. We will develop a deeper and more precise understanding of these phenomena in our future explorations.

- 
    A linear equation is one that may be written in the form

    $$ a_1x_1 + a_2x_2 + \ldots + a_nx_n = b $$

    .

- 
    A linear system is a set of linear equations and a solution is a set of values assigned to the unknowns that make each equation true.

- 
    We came to expect that a linear system has either infinitely many solutions, exactly one solution, or no solutions.

- 
    When we add more equations to a system, the solution space usually seems to become smaller.

## 1.1.4 Exercises

:::exercise {exercise-1-1-001} number=1.1.1 answered=no src=src/exercises/exercises1-1.xml:4
PROBLEM:
Give a brief explanation of your response to the following questions.

a) Suppose we have a system of 500 linear equations in 10 unknowns. What would be a reasonable guess about which of the three possibilities for the set of solutions holds?
b) Suppose we have a system of 10 linear equations in 500 unknowns. What would be a reasonable guess about which of the three possibilities for the set of solutions holds?

:::

:::exercise {exercise-1-1-002} number=1.1.2 answered=no src=src/exercises/exercises1-1.xml:19
PROBLEM:
Which of the following equations are linear? Please provide a justification for your response.

a) 
    $$ 2x + xy -3y^2 = 2 $$

    .
b) 
    $$ -2x_1 + 3x_2 +4x_3 - x_5 = 0 $$

    .
c) 
    $$ x = 3z - 4y $$

    .

:::

:::exercise {exercise-1-1-003} number=1.1.3 answered=no src=src/exercises/exercises1-1.xml:33
PROBLEM:
Consider the system of linear equations:

$$ \begin{alignedat}{4} x & {}+{} & y & & & {}={} & 3 \\ & & y & {}-{} & z & {}={} & 2 \\ 2x & {}+{} & y & {}+{} & z & {}={} & 4. \\ \end{alignedat} $$

a) Is $(x,y,z) = (1,2,0)$ a solution?
b) Is $(x,y,z) = (-2,1,0)$ a solution?
c) Is $(x,y,z) = (0,-3,1)$ a solution?
d) Can you find a solution in which $y = 0$?
e) Do you think there are other solutions? Please explain your response.

:::

:::exercise {exercise-1-1-004} number=1.1.4 answered=no src=src/exercises/exercises1-1.xml:58
PROBLEM:
This exercise concerns systems of equations having three unknowns. In this case, we know that the solution space of a single equation is a plane. If it helps with visualization, consider using $3\times5$ index cards to represent planes.

a) 
    Is it possible that the solution space of a system of four equations in three unknowns is a line? Either sketch an example or give a reason why it can't happen.

b) 
    What would you usually expect for the solution space to a system of four equations in three unknowns?

c) 
    Is it possible that there are no solutions to a system of two equations in three unknowns? Either sketch an example or give a reason why it can't happen.

d) 
    Is it possible that there is exactly one solution to a system of two equations in three unknowns? Either sketch an example or give a reason why it can't happen.

:::
