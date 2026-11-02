# 2.3 The span of a set of vectors {sec-span}

Matrix multiplication allows us to rewrite a linear system in the form $A{\mathbf x} = {\mathbf b}$. Besides being a more compact way of expressing a linear system, this form allows us to think about linear systems geometrically since matrix multiplication is defined in terms of linear combinations of vectors.
We now return to our [two fundamental questions,](ref:1.4#fundamental-questions) rephrased here in terms of matrix multiplication.

- 
    *Existence:* Is there a solution to the equation $A{\mathbf x}={\mathbf b}$?

- 
    *Uniqueness:* If there is a solution to the equation $A{\mathbf x}={\mathbf b}$, is it unique?

In this section, we focus on the existence question and see how it leads to the concept of the *span* of a set of vectors.

## 2.3.1 Introduction

:::exploration {act:preview-2-3-1} Preview Activity 2.3.1 (The existence of solutions)
PROBLEM:
a) If the equation $A{\mathbf x} = {\mathbf b}$ is inconsistent, what can we say about the pivot positions of the augmented matrix $\left[\begin{array}{r|r} A & {\mathbf b} \end{array}\right]$?
b) Consider the matrix $A$

    $$ A = \left[ \begin{array}{rrr} 1 & 0 & -2 \\ -2 & 2 & 2 \\ 1 & 1 & -3 \end{array}\right] $$

    . If ${\mathbf b}=\left[\begin{array}{r}2 \\ 2 \\ 5 \end{array}\right]$, is the equation $A{\mathbf x} = {\mathbf b}$ consistent? If so, find a solution.
    :::sage
    ```sage

    ```
    :::
c) If ${\mathbf b}=\left[\begin{array}{r}2 \\ 2 \\ 6 \end{array}\right]$, is the equation $A{\mathbf x} = {\mathbf b}$ consistent? If so, find a solution.
    :::sage
    ```sage

    ```
    :::
d) Identify the pivot positions of $A$.
e) For our two choices of the vector ${\mathbf b}$, one equation $A{\mathbf x} = {\mathbf b}$ has a solution and the other does not. What feature of the pivot positions of the matrix $A$ tells us to expect this?
ANSWER:
a) We know there must be a pivot position in the rightmost column of the augmented matrix.
b) ${\mathbf x}=\left[\begin{array}{r}2 \\ 3 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}2 \\ 1 \\ 1 \end{array}\right]$
c) The equation $A{\mathbf x}={\mathbf b}$ is inconsistent.
d) There are two pivot positions.
e) There is a row of $A$ without a pivot position.
SOLUTION:
a) We know there must be a pivot position in the rightmost column of the augmented matrix.
b) We construct the augmented matrix

    $$ \left[\begin{array}{rrr|r} 1 & 0 & -2 & 2 \\ -2 & 2 & 2 & 2 \\ 1 & 1 & -3 & 5 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & -2 & 2 \\ 0 & 1 & -1 & 3 \\ 0 & 0 & 0 & 0 \end{array}\right]\text{,} $$

    which shows that the system is consistent. The solution space is described parametrically as

    $$ {\mathbf x}=\left[\begin{array}{r}2 \\ 3 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}2 \\ 1 \\ 1 \end{array}\right] $$

    .
c) Now the augmented matrix is

    $$ \left[\begin{array}{rrr|r} 1 & 0 & -2 & 2 \\ -2 & 2 & 2 & 2 \\ 1 & 1 & -3 & 6 \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & -2 & 0 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 1 \end{array}\right] $$

    showing that the equation $A{\mathbf x}={\mathbf b}$ is inconsistent.
d) There are two pivot positions in $A$, as shown.

    $$ \left[\begin{array}{rrr} {\mathbf 1} & 0 & -2 \\ -2 & {\mathbf 2} & 2 \\ 1 & 1 & -3 \\ \end{array}\right] \sim \left[\begin{array}{rrr} {\mathbf 1} & 0 & -2 \\ 0 & {\mathbf 1} & -1 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

e) Since there is a row of $A$ that does not have a pivot position, it is possible to augment $A$ by a vector ${\mathbf b}$ so that we obtain a pivot position in the rightmost column of the augmented matrix. In this case, we have an inconsistent system.
:::

## 2.3.2 The span of a set of vectors

In the preview activity, we considered a $3\times3$ matrix $A$ and found that the equation $A{\mathbf x} = {\mathbf b}$ has a solution for some vectors ${\mathbf b}$ in ${\mathbb R}^3$ and has no solution for others. We will introduce a concept called *span* that describes the vectors ${\mathbf b}$ for which there is a solution.

We can write an $m\times n$ matrix $A$ in terms of its columns

$$ A = \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\cdots&{\mathbf v}_n \end{array}\right] $$

. Remember that [Proposition 2.2.4](ref:2.2#prop-matrix-eq-solution) says that the equation $A{\mathbf x} = {\mathbf b}$ is consistent if and only if we can express ${\mathbf b}$ as a linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$.

:::definition {def:definition-2-3-1} Definition 2.3.1
{index-entry:span} The *span*{index:span} of a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is the set of all linear combinations that can be formed from the vectors.
Alternatively, if $A = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \end{bmatrix}$, then the span of the vectors consists of all vectors ${\mathbf b}$ for which the equation $A{\mathbf x} = {\mathbf b}$ is consistent.
:::

:::example {ex:example-2-3-2} Example 2.3.2
Considering the set of vectors ${\mathbf v}=\left[\begin{array}{r}-2 \\ 1 \end{array}\right]$ and ${\mathbf w} = \left[\begin{array}{r}8 \\ -4 \end{array}\right]$, we see that the vector

$$ {\mathbf b} = 3{\mathbf v} + {\mathbf w} = \left[\begin{array}{r}2 \\ -1 \end{array}\right] $$

is one vector in the span of the vectors ${\mathbf v}$ and ${\mathbf w}$ because it is a linear combination of ${\mathbf v}$ and ${\mathbf w}$.
To determine whether the vector ${\mathbf b}=\left[\begin{array}{r}5 \\ 2 \end{array}\right]$ is in the span of ${\mathbf v}$ and ${\mathbf w}$, we form the matrix

$$ A = \begin{bmatrix} {\mathbf v} & {\mathbf w} \end{bmatrix} = \begin{bmatrix} -2 & 8 \\ 1 & -4 \\ \end{bmatrix} $$

and consider the equation $A{\mathbf x}={\mathbf b}$. We have

$$ \left[ \begin{array}{rr|r} -2 & 8 & 5 \\ 1 & -4 & 2 \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & -4 & 0 \\ 0 & 0 & 1 \\ \end{array} \right], $$

which shows that the equation $A{\mathbf x} = {\mathbf b}$ is inconsistent. Therefore, ${\mathbf b}=\left[\begin{array}{r}5 \\ 2 \end{array}\right]$ is one vector that is not in the span of ${\mathbf v}$ and ${\mathbf w}$.
:::

:::activity {act:activity-intro-span} Activity 2.3.2
Let's look at two examples to develop some intuition for the concept of span.

a) 
    First, we will consider the set of vectors

    $$ {\mathbf v} = \left[\begin{array}{r}1 \\ 2 \end{array}\right], ~~~{\mathbf w} = \left[\begin{array}{r}-2 \\ -4 \end{array}\right] $$

    .

    > FIGURE {fig:js-span-1} number=2.3.3 src=../../media/ch02/span1-preview.png
    > alt: 
    > caption: An interactive diagram for constructing linear combinations of the vectors ${\mathbf v}$ and ${\mathbf w}$.

    1. 
        What vector is the linear combination of ${\mathbf v}$ and ${\mathbf w}$ with weights:

        - 
            $c = 2$ and $d=0$?

        - 
            $c = 1$ and $d=1$?

        - 
            $c = 0$ and $d=-1$?

    2. 
        Can the vector $\left[\begin{array}{r}2 \\ 4 \end{array}\right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? Is the vector $\left[\begin{array}{r}2 \\ 4 \end{array}\right]$ in the span of ${\mathbf v}$ and ${\mathbf w}$?

    3. 
        Can the vector $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? Is the vector $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ in the span of ${\mathbf v}$ and ${\mathbf w}$?

    4. 
        Describe the set of vectors in the span of ${\mathbf v}$ and ${\mathbf w}$.

    5. 
        For what vectors ${\mathbf b}$ does the equation

        $$ \left[\begin{array}{rr} 1 & -2 \\ 2 & -4 \end{array}\right] {\mathbf x} = {\mathbf b} $$

        have a solution?

b) 
    We will now look at an example where

    $$ {\mathbf v} = \left[\begin{array}{r}2 \\ 1 \end{array}\right], ~~~{\mathbf w} = \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

    .

    > FIGURE {fig:js-span-2} number=2.3.4 src=../../media/ch02/span2-preview.png
    > alt: 
    > caption: An interactive diagram for constructing linear combinations of the vectors ${\mathbf v}$ and ${\mathbf w}$.

    1. 
        What vector is the linear combination of ${\mathbf v}$ and ${\mathbf w}$ with weights:

        - 
            $c = 2$ and $d=0$?

        - 
            $c = 1$ and $d=1$?

        - 
            $c = 0$ and $d=-1$?

    2. 
        Can the vector $\left[\begin{array}{r}-2 \\ 2 \end{array}\right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? Is the vector $\left[\begin{array}{r}-2 \\ 2 \end{array}\right]$ in the span of ${\mathbf v}$ and ${\mathbf w}$?

    3. 
        Can the vector $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ be expressed as a linear combination of ${\mathbf v}$ and ${\mathbf w}$? Is the vector $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ in the span of ${\mathbf v}$ and ${\mathbf w}$?

    4. 
        Describe the set of vectors in the span of ${\mathbf v}$ and ${\mathbf w}$.

    5. 
        For what vectors ${\mathbf b}$ does the equation

        $$ \left[\begin{array}{rr} 2 & 1 \\ 1 & 2 \end{array}\right] {\mathbf x} = {\mathbf b} $$

        have a solution?

SOLUTION:

a) 
    For the first set of vectors, we find:

    1. 
        We can form the linear combinations:

        - 
            When $c = 2$ and $d=0$, the linear combination is $\left[\begin{array}{r}2 \\ 4 \end{array}\right]$.

        - 
            When $c = 1$ and $d=1$, the linear combination is $\left[\begin{array}{r}-1 \\ -2 \end{array}\right]$.

        - 
            When $c = 0$ and $d=-1$, the linear combination is $\left[\begin{array}{r}2 \\ 4 \end{array}\right]$.

    2. 
        Yes, we saw that there are at least two ways. For instance, when the weights are $c=2$ and $d=0$. This means that $\left[\begin{array}{r}2 \\ 4 \end{array}\right]$ is in the span of ${\mathbf v}$ and ${\mathbf w}$.

    3. 
        No. No matter how we change the weights, the linear combination lies on the line through ${\mathbf v}$ and ${\mathbf w}$. This means that $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ is not in the span of ${\mathbf v}$ and ${\mathbf w}$.

    4. 
        The span of ${\mathbf v}$ and ${\mathbf w}$ is the set of all vectors on the line through ${\mathbf v}$.

    5. 
        If the equation has a solution, ${\mathbf b}$ must lie on the line defined by ${\mathbf v}$.

b) 
    For the second set of vectors, we have:

    1. 
        We can form the linear combinations:

        - 
            When $c = 2$ and $d=0$, the linear combination is $\left[\begin{array}{r}4 \\ 2 \end{array}\right]$.

        - 
            When $c = 1$ and $d=1$, the linear combination is $\left[\begin{array}{r}3 \\ 3 \end{array}\right]$.

        - 
            When $c = 0$ and $d=-1$, the linear combination is $\left[\begin{array}{r}-1 \\ -2 \end{array}\right]$.

    2. 
        Yes. Using the diagram, we see that $\left[\begin{array}{r}-2 \\ 2 \end{array}\right]=-2{\mathbf v} + 2{\mathbf w}$. This means that $\left[\begin{array}{r}-2 \\ 2 \end{array}\right]$ is in the span of ${\mathbf v}$ and ${\mathbf w}$.

    3. 
        Yes. Using the diagram, we see that $\left[\begin{array}{r}3 \\ 0 \end{array}\right]=2{\mathbf v}-1{\mathbf w}$. This means that $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ is in the span of ${\mathbf v}$ and ${\mathbf w}$.

    4. 
        Every two-dimensional vector is in the span of ${\mathbf v}$ and ${\mathbf w}$.

    5. 
        The equation has a solution for every ${\mathbf b}$.

:::

This activity aims to convey the geometric meaning of span. Remember that we can think of a linear combination of the two vectors ${\mathbf v}$ and ${\mathbf w}$ as a recipe for walking in the plane ${\mathbb R}^2$. We first move a prescribed amount in the direction of ${\mathbf v}$ and then a prescribed amount in the direction of ${\mathbf w}$. The span consists of all the places we can walk to.

:::example {ex:example-span-linear-indep} Example 2.3.5
Let's consider the vectors ${\mathbf v}=\left[\begin{array}{r}2 \\ 0 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ as shown in [Figure 2.3.6](ref:fig-span-linear-indep).
> FIGURE {fig:fig-span-linear-indep} number=2.3.6 src=../../media/ch02/span-linear-indep.svg
> alt: Two vectors in the plane along with a grid representing the linear combinations of these vectors.
> width: 50%
> caption: The vectors ${\mathbf v}$ and ${\mathbf w}$ and some linear combinations they create.
The figure shows us that ${\mathbf b} = {\mathbf v} + 2{\mathbf w} = \left[\begin{array}{r}0 \\ 2 \end{array}\right]$ is a linear combination of ${\mathbf v}$ and ${\mathbf w}$. Indeed, we can verify this algebraically by constructing the linear system

$$ \begin{bmatrix}{\mathbf v} & {\mathbf w} \end{bmatrix} ~ {\mathbf x} = \left[\begin{array}{r}0 \\ 2 \end{array}\right], $$

whose corresponding augmented matrix has the reduced row echelon form

$$ \left[ \begin{array}{rr|r} 2 & -1 & 0 \\ 0 & 1 & 2 \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & 0 & 1 \\ 0 & 1 & 2 \\ \end{array} \right]. $$

Because this system is consistent, we know that ${\mathbf b}=\left[\begin{array}{r}0 \\ 2 \end{array}\right]$ is in the span of ${\mathbf v}$ and ${\mathbf w}$.
In fact, we can say more. Notice that the coefficient matrix

$$ \begin{bmatrix} 2 & -1 \\ 0 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix} $$

has a pivot position in every row. This means that for any other vector ${\mathbf b}$, the augmented matrix corresponding to the equation $\begin{bmatrix}{\mathbf v} & {\mathbf w} \end{bmatrix} ~{\mathbf x} = {\mathbf b}$ cannot have a pivot position in its rightmost column:

$$ \left[ \begin{array}{rr|r} 2 & -1 & * \\ 0 & 1 & * \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & 0 & * \\ 0 & 1 & * \\ \end{array} \right]. $$

Therefore, the equation $\begin{bmatrix}{\mathbf v} & {\mathbf w} \end{bmatrix} ~{\mathbf x} = {\mathbf b}$ is consistent for every two-dimensional vector ${\mathbf b}$, which tells us that every two-dimensional vector is in the span of ${\mathbf v}$ and ${\mathbf w}$. In this case, we say that the span of ${\mathbf v}$ and ${\mathbf w}$ is ${\mathbb R}^2$.
The intuitive meaning is that we can walk to any point in the plane by moving an appropriate distance in the ${\mathbf v}$ and ${\mathbf w}$ directions.
:::

:::example {ex:example-span-linear-dep} Example 2.3.7
Now let's consider the vectors ${\mathbf v}=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}2 \\ -2 \end{array}\right]$ as shown in [Figure 2.3.8](ref:fig-span-linear-dep).
> FIGURE {fig:fig-span-linear-dep} number=2.3.8 src=../../media/ch02/span-linear-dep.svg
> alt: Two vectors that lie on a line.
> width: 50%
> caption: The vectors ${\mathbf v}$ and ${\mathbf w}$ and some linear combinations they create.
From the figure, we expect that ${\mathbf b} = \left[\begin{array}{r}0 \\ 2 \end{array}\right]$ is not a linear combination of ${\mathbf v}$ and ${\mathbf w}$. Once again, we can verify this algebraically by constructing the linear system

$$ \begin{bmatrix}{\mathbf v} & {\mathbf w} \end{bmatrix} ~ {\mathbf x} = \left[\begin{array}{r}0 \\ 2 \end{array}\right]. $$

The augmented matrix has the reduced row echelon form

$$ \left[ \begin{array}{rr|r} -1 & 2 & 0 \\ 1 & -2 & 2 \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & -2 & 0 \\ 0 & 0 & 1 \\ \end{array} \right], $$

from which we see that the system is inconsistent. Therefore, ${\mathbf b}=\left[\begin{array}{r}0 \\ 2 \end{array}\right]$ is not in the span of ${\mathbf v}$ and ${\mathbf w}$.
We should expect this behavior from the coefficient matrix

$$ \begin{bmatrix} -1 & 2 \\ 1 & -2 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & -2 \\ 0 & 0 \\ \end{bmatrix}. $$

Because the second row of the coefficient matrix does not have a pivot position, it is possible for a linear system $\begin{bmatrix}{\mathbf v} & {\mathbf w} \end{bmatrix} ~{\mathbf x} = {\mathbf b}$ to have a pivot position in its rightmost column:

$$ \left[ \begin{array}{rr|r} -1 & 2 & * \\ 1 & -2 & * \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & -2 & 0 \\ 0 & 0 & 1 \\ \end{array} \right]. $$

If we notice that ${\mathbf w} = -2{\mathbf v}$, we see that any linear combination of ${\mathbf v}$ and ${\mathbf w}$,

$$ c{\mathbf v} + d{\mathbf w} = c{\mathbf v} -2d{\mathbf v} = (c-2d){\mathbf v}, $$

is actually a scalar multiple of ${\mathbf v}$. Therefore, the span of ${\mathbf v}$ and ${\mathbf w}$ is the line defined by the vector ${\mathbf v}$. Intuitively, this means that we can only walk to points on this line using these two vectors.
:::

:::convention {conv:convention-2-3-9} Convention 2.3.9
We will denote the span of the set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ by $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$.
:::

In [Example 2.3.5](ref:example-span-linear-indep), we saw that $\text{Span}\left\{{\mathbf v},{\mathbf w}\right\} = {\mathbb R}^2$. However, for the vectors in [Example 2.3.7](ref:example-span-linear-dep), we saw that $\text{Span}\left\{{\mathbf v},{\mathbf w}\right\}$ is simply a line.

## 2.3.3 Pivot positions and span

A set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ naturally defines a matrix $A = \begin{bmatrix}{\mathbf v}_1&{\mathbf v}_2&\cdots{\mathbf v}_n\end{bmatrix}$ whose columns are the given vectors. As we've seen, a vector ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$ precisely when the linear system $A{\mathbf x}={\mathbf b}$ is consistent.

The previous examples point to the fact that the span is related to the pivot positions of $A$. While [Section 2.4](ref:2.4#sec-linear-dep) and [Section 3.5](ref:3.5#sec-subspaces) develop this idea more fully, we will now examine the possibilities in ${\mathbb R}^3$.

:::activity {act:activity-span-r3} Activity 2.3.3
In this activity, we will look at the span of sets of vectors in ${\mathbb R}^3$.

a) 
    Suppose ${\mathbf v}=\left[\begin{array}{r}1 \\ 2 \\ 1 \end{array}\right]$. Give a geometric description of $\text{Span}\left\{{\mathbf v}\right\}$ and a rough sketch of ${\mathbf v}$ and its span in [Figure 2.3.10](ref:fig-3d-span-1).

    > FIGURE {fig:fig-3d-span-1} number=2.3.10 src=../../media/ch02/coordinates-3d.svg
    > alt: A set of three dimensional coordinate axes.
    > width: 50%
    > caption: A three-dimensional coordinate system for sketching ${\mathbf v}$ and its span.

b) 
    Now consider the two vectors

    $$ {\mathbf e}_1 = \left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right],~~~ {\mathbf e}_2 = \left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right] $$

    . Sketch the vectors below. Then give a geometric description of $\text{Span}\left\{{\mathbf e}_1,{\mathbf e}_2\right\}$ and a rough sketch of the span in [Figure 2.3.11](ref:fig-3d-span-2).

    > FIGURE {fig:fig-3d-span-2} number=2.3.11 src=../../media/ch02/coordinates-3d.svg
    > alt: A set of three dimensional coordinate axes.
    > width: 50%
    > caption: A coordinate system for sketching ${\mathbf e}_1$, ${\mathbf e}_2$, and $\text{Span}\left\{{\mathbf e}_1,{\mathbf e}_2\right\}$.

c) 
    Let's now look at this situation algebraically by writing write ${\mathbf b} = \left[\begin{array}{r}b_1 \\ b_2 \\ b_3 \end{array}\right]$. Determine the conditions on $b_1$, $b_2$, and $b_3$ so that ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf e}_1,{\mathbf e}_2\right\}$ by considering the linear system

    $$ \left[\begin{array}{rr} {\mathbf e}_1 & {\mathbf e}_2 \\ \end{array}\right] ~{\mathbf x} = {\mathbf b} $$

    or

    $$ \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ 0 & 0 \\ \end{array}\right] {\mathbf x} = \left[\begin{array}{r}b_1 \\ b_2 \\ b_3 \end{array}\right] $$

    . Explain how this relates to your sketch of $\text{Span}\left\{{\mathbf e}_1,{\mathbf e}_2\right\}$.

d) 
    Consider the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \\ -1 \end{array}\right],~~ {\mathbf v}_2 = \left[\begin{array}{r}0 \\ 2 \\ 1 \end{array}\right]. $$

    1. 
        Is the vector ${\mathbf b}=\left[\begin{array}{r}1 \\ -2 \\ 4 \end{array}\right]$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$?

        :::sage
        ```sage

        ```
        :::

    2. 
        Is the vector ${\mathbf b}=\left[\begin{array}{r}-2 \\ 0 \\ 3 \end{array}\right]$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$?

        :::sage
        ```sage

        ```
        :::

    3. 
        Give a geometric description of $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

e) 
    Consider the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \\ -1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}0 \\ 2 \\ 1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}1 \\ -2 \\ 4 \end{array}\right] $$

    . Form the matrix $\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]$ and find its reduced row echelon form.

    :::sage
    ```sage

    ```
    :::

    What does this tell you about $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$?

f) 
    If the span of a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is ${\mathbb R}^3$, what can you say about the pivot positions of the matrix $\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots&{\mathbf v}_n \end{array}\right]$?

g) 
    What is the smallest number of vectors such that $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\} = {\mathbb R}^3$?

SOLUTION:

a) 
    $\text{Span}\left\{{\mathbf v}\right\}$ is the line defined by ${\mathbf v}$.

b) 
    $\text{Span}\left\{{\mathbf e}_1,{\mathbf e}_2\right\}$ is the $xy$-plane.

c) 
    For the linear system to be consistent, we need $b_3=0$, which means that the third coordinate of the vector ${\mathbf b}$ must be 0 for ${\mathbf b}$ to be in $\text{Span}\left\{{\mathbf e}_1,{\mathbf e}_2\right\}$. In other words, ${\mathbf b}$ must lie in the $xy$-plane.

d) 
    We consider the two cases.

    1. 
        We have the augmented matrix

        $$ \left[\begin{array}{rr|r} 1 & 0 & 1 \\ 1 & 2 & -2 \\ -1 & 1 & 4 \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right]\text{,} $$

        which shows that the system is inconsistent. Therefore, ${\mathbf b}$ is not in $\text{Span}\left\{{\mathbf v}_1, {\mathbf v}_2\right\}$.

    2. 
        We have the augmented matrix

        $$ \left[\begin{array}{rr|r} 1 & 0 & -2 \\ 1 & 2 & 0 \\ -1 & 1 & 3 \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & -2 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \end{array}\right]\text{,} $$

        which shows that the system is consistent. Therefore, ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1, {\mathbf v}_2\right\}$.

    3. 
        The span is the plane in ${\mathbb R}^3$ defined by ${\mathbf v}_1$ and ${\mathbf v}_2$.

e) 
    We have the reduced row echelon form

    $$ \left[\begin{array}{rrr} 1 & 0 & 1 \\ 1 & 2 & -2 \\ -1 & 1 & 4 \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right]\text{.} $$

    Since there is a pivot position in every row, this says that every equation $A{\mathbf x}={\mathbf b}$ is consistent. The $\text{Span}\left\{{\mathbf v}_1, {\mathbf v}_2, {\mathbf v}_3\right\}$ is therefore ${\mathbb R}^3$.

f) 
    There must be a pivot position in every row.

g) 
    If a set of vectors spans ${\mathbb R}^3$, its corresponding matrix must have a pivot position in every row. Because there can be at most one pivot position in a column, there must be at least three columns. Therefore, the smallest number of vectors that span ${\mathbb R}^3$ is three.

:::

The types of sets that appear as the span of a set of vectors in ${\mathbb R}^3$ are relatively simple.

- 
    First, with a single nonzero vector, all linear combinations are simply scalar multiples of that vector so that the span of this vector is a line, as shown in [Figure 2.3.12](ref:fig-span-line).

    > FIGURE {fig:fig-span-line} number=2.3.12 src=../../media/ch02/3d-line.svg
    > alt: A three dimensional diagram showing a vector, the line it defines, and the standard coordinate axes.
    > width: 70%
    > caption: The span of a single nonzero vector is a line.

    Notice that the matrix formed by this vector has one pivot position. For example,

    $$ \left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right] \sim \left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right] $$

    .

- 
    The span of two vectors in ${\mathbb R}^3$ that do not lie on the same line will be a plane, as seen in [Figure 2.3.13](ref:fig-span-plane).

    > FIGURE {fig:fig-span-plane} number=2.3.13 src=../../media/ch02/3d-plane-nonstd.svg
    > alt: The span of two three dimensional vectors.
    > width: 70%
    > caption: The span of these two vectors in ${\mathbb R}^3$ is a plane.

    For example, the vectors

    $$ {\mathbf v}_1=\left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right],~~~ {\mathbf v}_2=\left[\begin{array}{r}1 \\ -1 \\ 3 \end{array}\right] $$

    lead to the matrix

    $$ \left[\begin{array}{rr} -2 & 1 \\ 3 & -1 \\ 1 & 3 \\ \end{array}\right] \sim \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ 0 & 0 \\ \end{array}\right] $$

    with two pivot positions.

- 
    Finally, a set of three vectors, such as

    $$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \\ -1 \end{array}\right],~~~ {\mathbf v}_2=\left[\begin{array}{r}2 \\ 0 \\ 1 \end{array}\right],~~~ {\mathbf v}_3=\left[\begin{array}{r}-2 \\ 2 \\ 0 \end{array}\right] $$

    may form a matrix having three pivot positions

    $$ \left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right] = \left[\begin{array}{rrr} 1 & 2 & -2 \\ 2 & 0 & 2 \\ -1 & 1 & 0 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right], $$

    one in every row. When this happens, no matter how we augment this matrix, it is impossible to obtain a pivot position in the rightmost column:

    $$ \left[\begin{array}{rrr|r} 1 & 2 & -2 & *\\ 2 & 0 & 2 & * \\ -1 & 1 & 0 & * \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & 0 & *\\ 0 & 1 & 0 & * \\ 0 & 0 & 1 & * \\ \end{array}\right]. $$

    Therefore, any linear system $\begin{bmatrix}{\mathbf v}_1&{\mathbf v}_2&{\mathbf v}_3\end{bmatrix} ~{\mathbf x} = {\mathbf b}$ is consistent, which tells us that $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$.

To summarize, we looked at the pivot positions in a matrix whose columns are the three-dimensional vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$. We found that with

- 
    one pivot position, the span was a line.

- 
    two pivot positions, the span was a plane.

- 
    three pivot positions, the span was ${\mathbb R}^3$.

Though we will return to these ideas later, for now take note of the fact that the span of a set of vectors in ${\mathbb R}^3$ is a relatively simple, familiar geometric object.

The reasoning that led us to conclude that the span of a set of vectors is ${\mathbb R}^3$ when the associated matrix has a pivot position in every row applies more generally.

:::proposition {prop:prop-pivot-row} Proposition 2.3.14
Suppose we have vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ in ${\mathbb R}^m$. Then $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}={\mathbb R}^m$ if and only if the matrix $\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\cdots&{\mathbf v}_n \end{array}\right]$ has a pivot position in every row.
:::

This tells us something important about the number of vectors needed to span ${\mathbb R}^m$. Suppose we have $n$ vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ that span ${\mathbb R}^m$. The proposition tells us that the matrix $A = \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots&{\mathbf v}_n \end{array}\right]$ has a pivot position in every row, such as in this reduced row echelon matrix.

$$ \left[\begin{array}{rrrrrr} 1 & 0 & * & 0 & * & 0 \\ 0 & 1 & * & 0 & * & 0 \\ 0 & 0 & 0 & 1 & * & 0 \\ 0 & 0 & 0 & 0 & 0 & 1 \\ \end{array}\right]. $$

Since a matrix can have at most one pivot position in a column, there must be at least as many columns as there are rows, which implies that $n\geq m$. For instance, if we have a set of vectors that span ${\mathbb R}^{632}$, there must be at least 632 vectors in the set.

:::proposition {prop:prop-span-bound} Proposition 2.3.15
A set of vectors whose span is ${\mathbb R}^m$ contains at least $m$ vectors.
:::

We have thought about a linear combination of a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ as the result of walking a certain distance in the direction of ${\mathbf v}_1$, followed by walking a certain distance in the direction of ${\mathbf v}_2$, and so on. If $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\} = {\mathbb R}^m$, this means that we can walk to every point in ${\mathbb R}^m$ using the directions ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$. Intuitively, this proposition is telling us that we need at least $m$ directions to have the flexibility needed to reach every point in ${\mathbb R}^m$.

:::assemblage {asm:assemblage-} Terminology
Because span is a concept that is connected to a set of vectors, we say, “The span of the set of vectors ${\mathbf v}_1, {\mathbf v}_2, \ldots, {\mathbf v}_n$ is ....” While it may be tempting to say, “The span of the matrix $A$ is ...,” we should instead say “The span of the columns of the matrix $A$ is ....”
:::

## 2.3.4 Summary

We defined the span of a set of vectors and developed some intuition for this concept through a series of examples.

- 
    The span of a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is the set of linear combinations of the vectors. We denote the span by $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$.

- 
    A vector ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$ if and only if the linear system

    $$ \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots{\mathbf v}_n \end{array}\right] ~{\mathbf x} = {\mathbf b} $$

    is consistent.

- 
    If the $m\times n$ matrix

    $$ \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots{\mathbf v}_n \end{array}\right] $$

    has a pivot position in every row, then the span of these vectors is ${\mathbb R}^m$; that is,

    $$ \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\} = {\mathbb R}^m. $$

- 
    Any set of vectors that spans ${\mathbb R}^m$ must have at least $m$ vectors.

## 2.3.5 Exercises

:::exercise {exercise-2-3-001} number=2.3.1 answered=yes src=src/exercises/exercises2-3.xml:5
PROBLEM:
In this exercise, we will consider the span of some sets of two- and three-dimensional vectors.
:::sage
```sage

```
:::

a) 
    Consider the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ -2 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}4 \\ 3 \end{array}\right] $$

    .

    1. 
        Is ${\mathbf b} = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$?

    2. 
        Give a geometric description of $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

b) 
    Consider the vectors

    $$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \\ 3 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}-2 \\ 0 \\ 2 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}6 \\ 1 \\ -1 \end{array}\right] $$

    .

    1. 
        Is the vector ${\mathbf b}=\left[\begin{array}{r}-10 \\ -1 \\ 5 \end{array}\right]$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$?

    2. 
        Is the vector ${\mathbf v}_3$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$?

    3. 
        Is the vector ${\mathbf b}=\left[\begin{array}{r}3 \\ 3 \\ -1 \end{array}\right]$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$?

    4. 
        Give a geometric description of $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

ANSWER:

a) 
    $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\} = {\mathbb R}^2$.

b) 
    For the following vectors,

    1. 
        ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

    2. 
        ${\mathbf v}_3$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

    3. 
        ${\mathbf b}$ is not in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

    4. 
        $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ is a plane in ${\mathbb R}^3$.

SOLUTION:

a) 
    The equation $\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right] ~{\mathbf x} = {\mathbf b}$ is consistent so ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$. Since $\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$ has a pivot position in every row, $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$ is ${\mathbb R}^2$.

b) 
    Let's consider the following vectors.

    1. 
        The equation $\left[\begin{array}{rrr}{\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]~{\mathbf x} = {\mathbf b}$ is consistent so ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

    2. 
        The vector ${\mathbf v}_3$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$ because ${\mathbf v}_3 = {\mathbf v}_1-2{\mathbf v}_2$.

    3. 
        The equation $\left[\begin{array}{rrr}{\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]~{\mathbf x} = {\mathbf b}$ is not consistent so ${\mathbf b}$ is not in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

    4. 
        $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ is the plane defined by ${\mathbf v}_1$ and ${\mathbf v}_2$.

:::

:::exercise {exercise-2-3-002} number=2.3.2 answered=yes src=src/exercises/exercises2-3.xml:130
PROBLEM:
Provide a justification for your response to the following questions.

a) 
    Suppose you have a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$. Can you guarantee that ${\mathbf 0}$ is in $\text{Span}\left\{{\mathbf v}_1\,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$?

b) 
    Suppose that $A$ is an $m \times n$ matrix. Can you guarantee that the equation $A{\mathbf x} = {\mathbf 0}$ is consistent?

c) 
    What is $\text{Span}\left\{{\mathbf 0},{\mathbf 0},\ldots,{\mathbf 0}\right\}$?

ANSWER:

a) 
    Yes

b) 
    Yes

c) 
    $\text{Span}\left\{{\mathbf 0},{\mathbf 0},\ldots,{\mathbf 0}\right\}$ consists only of the vector ${\mathbf 0}$.

SOLUTION:

a) 
    Yes, because ${\mathbf 0} = 0{\mathbf v}_1+0{\mathbf v}_2+\ldots+0{\mathbf v}_n$.

b) 
    Yes, ${\mathbf x}={\mathbf 0}$ is a solution to the equation $A{\mathbf x}={\mathbf 0}$.

c) 
    $\text{Span}\left\{{\mathbf 0},{\mathbf 0},\ldots,{\mathbf 0}\right\}$ consists only of the vector ${\mathbf 0}$.

:::

:::exercise {exercise-2-3-003} number=2.3.3 answered=yes src=src/exercises/exercises2-3.xml:191
PROBLEM:
For both parts of this exercise, give a geometric description of sets of the vectors ${\mathbf b}$ and include a sketch.

a) 
    For which vectors ${\mathbf b}$ in ${\mathbb R}^2$ is the equation

    $$ \left[\begin{array}{rr} 3 & -6 \\ -2 & 4 \\ \end{array}\right] {\mathbf x} = {\mathbf b} $$

    consistent?

b) 
    For which vectors ${\mathbf b}$ in ${\mathbb R}^2$ is the equation

    $$ \left[\begin{array}{rr} 3 & -6 \\ -2 & 2 \\ \end{array}\right] {\mathbf x} = {\mathbf b} $$

    consistent?

ANSWER:

a) 
    ${\mathbf b}$ must be a scalar multiple of $\left[\begin{array}{r}3 \\ -2 \end{array}\right]$.

b) 
    ${\mathbf b}$ can be any vector in ${\mathbb R}^2$.

SOLUTION:

a) 
    $\left[\begin{array}{rr} 3 & -6 \\ -2 & 4 \\ \end{array}\right] \sim \left[\begin{array}{rr} 1 & -2 \\ 0 & 0 \\ \end{array}\right]$ so ${\mathbf b}$ must be on the line defined by $\left[\begin{array}{r}3 \\ -2 \end{array}\right]$.

b) 
    $\left[\begin{array}{rr} 3 & -6 \\ -2 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]$ so ${\mathbf b}$ can be any vector in ${\mathbb R}^2$.

:::

:::exercise {exercise-2-3-004} number=2.3.4 answered=yes src=src/exercises/exercises2-3.xml:273
PROBLEM:
Consider the following matrices:

$$ A = \left[\begin{array}{rrrr} 3 & 0 & -1 & 1 \\ 1 & -1 & 3 & 7 \\ 3 & -2 & 1 & 5 \\ -1 & 2 & 2 & 3 \\ \end{array}\right],~~~ B = \left[\begin{array}{rrrr} 3 & 0 & -1 & 4 \\ 1 & -1 & 3 & -1 \\ 3 & -2 & 1 & 3 \\ -1 & 2 & 2 & 1 \\ \end{array}\right] $$

. Do the columns of $A$ span ${\mathbb R}^4$? Do the columns of $B$ span ${\mathbb R}^4$?
:::sage
```sage

```
:::
ANSWER:
The columns of $A$ do not span ${\mathbb R}^4$. The columns of $B$ do.
SOLUTION:

a) 
    The reduced row echelon form of $A$ is

    $$ \left[\begin{array}{rrrr} 3 & 0 & -1 & 1 \\ 1 & -1 & 3 & 7 \\ 3 & -2 & 1 & 5 \\ -1 & 2 & 2 & 3 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 1 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 2 \\ 0 & 0 & 0 & 0 \end{array}\right] $$

    so the columns of $A$ do not span ${\mathbb R}^4$.

b) 
    The reduced row echelon form of $B$ is

    $$ \left[\begin{array}{rrrr} 3 & 0 & -1 & 4 \\ 1 & -1 & 3 & -1 \\ 3 & -2 & 1 & 3 \\ -1 & 2 & 2 & 1 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{array}\right] $$

    so the columns of $B$ span ${\mathbb R}^4$.

:::

:::exercise {exercise-2-3-005} number=2.3.5 answered=yes src=src/exercises/exercises2-3.xml:349
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response. Throughout, we will assume that the matrix $A$ has columns ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$; that is,

$$ A = \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots&{\mathbf v}_n \end{array}\right] $$

.

a) 
    If the equation $A{\mathbf x} = {\mathbf b}$ is consistent, then ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$.

b) 
    The equation $A{\mathbf x} = {\mathbf v}_1$ is consistent.

c) 
    If ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$ are vectors in ${\mathbb R}^3$, then their span is ${\mathbb R}^3$.

d) 
    If ${\mathbf b}$ is a linear combination of ${\mathbf v}_1, {\mathbf v}_2,\ldots,{\mathbf v}_n$, then ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$.

e) 
    If $A$ is an $8032\times 427$ matrix, then the span of the columns of $A$ is a set of vectors in ${\mathbb R}^{427}$.

ANSWER:

a) 
    True

b) 
    True

c) 
    False

d) 
    True

e) 
    False

SOLUTION:

a) 
    True. If ${\mathbf x}$ is a solution to $A{\mathbf x}={\mathbf b}$, then the components of ${\mathbf x}$ are weights whose linear combination is ${\mathbf b}$.

b) 
    True, because $x=\left[\begin{array}{r}1 \\ 0 \\ \vdots \\ 0 \end{array}\right]$ is a solution.

c) 
    False. The span could be a smaller set.

d) 
    True. This is the definition of the span.

e) 
    False. The span is a set of vectors in ${\mathbb R}^{8032}$.

:::

:::exercise {exercise-2-3-006} number=2.3.6 answered=yes src=src/exercises/exercises2-3.xml:429
PROBLEM:
This exercise asks you to construct some matrices whose columns span a given set.

a) 
    Construct a $3\times3$ matrix whose columns span ${\mathbb R}^3$.

b) 
    Construct a $3\times3$ matrix whose columns span a plane in ${\mathbb R}^3$.

c) 
    Construct a $3\times3$ matrix whose columns span a line in ${\mathbb R}^3$.

ANSWER:
We will choose matrices in reduced row echelon form.

a) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 1 & 0 & -2 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 1 & 3 & -1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]$.

SOLUTION:
We will choose matrices in reduced row echelon form.

a) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 1 & 0 & -2 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 1 & 3 & -1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-3-007} number=2.3.7 answered=yes src=src/exercises/exercises2-3.xml:513
PROBLEM:
Provide a justification for your response to the following questions.

a) 
    Suppose that we have vectors in ${\mathbb R}^8$, ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_{10}$, whose span is ${\mathbb R}^8$. Can every vector ${\mathbf b}$ in ${\mathbb R}^8$ be written as a linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_{10}$?

b) 
    Suppose that we have vectors in ${\mathbb R}^8$, ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_{10}$, whose span is ${\mathbb R}^8$. Can every vector ${\mathbf b}$ in ${\mathbb R}^8$ be written *uniquely* as a linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_{10}$?

c) 
    Do the vectors

    $$ {\mathbf e}_1=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right], {\mathbf e}_2=\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right], {\mathbf e}_3=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right] $$

    span ${\mathbb R}^3$?

d) 
    Suppose that ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ span ${\mathbb R}^{438}$. What can you guarantee about the value of $n$?

e) 
    Can 17 vectors in ${\mathbb R}^{20}$ span ${\mathbb R}^{20}$?

ANSWER:

a) 
    Yes

b) 
    No

c) 
    Yes

d) 
    $n\geq 438$

e) 
    No

SOLUTION:

a) 
    Yes. Because the span is ${\mathbb R}^8$, every vector in ${\mathbb R}^8$ can be written as a linear combination of the vectors.

b) 
    No. The matrix $A=\left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_{10} \end{array} \right]$ must have a column without a pivot position. Therefore, any equation $A{\mathbf x}={\mathbf b}$ has infinitely many solutions.

c) 
    Yes, because $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$ has a pivot position in every row.

d) 
    There must be at least 438 vectors so $n\geq438$.

e) 
    No, because we need at least 20 vectors to span ${\mathbb R}^{20}$.

:::

:::exercise {exercise-2-3-008} number=2.3.8 answered=yes src=src/exercises/exercises2-3.xml:603
PROBLEM:
The following observation will be helpful in this exercise. If we want to find a solution to the equation $AB{\mathbf x} = {\mathbf b}$, we could first find a solution to the equation $A{\mathbf y} = {\mathbf b}$ and then find a solution to the equation $B{\mathbf x} = {\mathbf y}$.
Suppose that $A$ is a $3\times 4$ matrix whose columns span ${\mathbb R}^3$ and $B$ is a $4\times 5$ matrix. In this case, we can form the product $AB$.

a) 
    What is the shape of the product $AB$?

b) 
    Can you guarantee that the columns of $AB$ span ${\mathbb R}^3$?

c) 
    If you know additionally that the span of the columns of $B$ is ${\mathbb R}^4$, can you guarantee that the columns of $AB$ span ${\mathbb R}^3$?

ANSWER:

a) 
    $3\times5$

b) 
    No

c) 
    Yes

SOLUTION:

a) 
    $AB$ is a $3\times5$ matrix.

b) 
    No. Since the columns of $A$ span ${\mathbb R}^3$, then the equation $A{\mathbf y}={\mathbf b}$ has a solution ${\mathbf y}$ for every vector ${\mathbf b}$. However, we may not be able to solve the equation $B{\mathbf x}={\mathbf y}$ if the columns of $B$ do not span ${\mathbb R}^4$.

c) 
    Yes. If we are given a vector ${\mathbf b}$ in ${\mathbb R}^3$, we can find a vector ${\mathbf y}$ such that $A{\mathbf y} = {\mathbf b}$ since the columns of $A$ span ${\mathbb R}^3$. Since the columns of $B$ span ${\mathbb R}^4$, we can find a vector ${\mathbf x}$ such that $B{\mathbf x}={\mathbf y}$. Then $AB{\mathbf x} = {\mathbf b}$, which means that $B$ is the span of the columns of $AB$.

:::

:::exercise {exercise-2-3-009} number=2.3.9 answered=yes src=src/exercises/exercises2-3.xml:673
PROBLEM:
Suppose that $A$ is a $12\times12$ matrix and that, for some vector ${\mathbf b}$, the equation $A{\mathbf x}={\mathbf b}$ has a unique solution.

a) 
    What can you say about the pivot positions of $A$?

b) 
    What can you say about the span of the columns of $A$?

c) 
    If ${\mathbf c}$ is some other vector in ${\mathbb R}^{12}$, what can you conclude about the equation $A{\mathbf x} = {\mathbf c}$?

d) 
    What can you say about the solution space to the equation $A{\mathbf x} ={\mathbf 0}$?

ANSWER:

a) 
    There is a pivot position in each row and each column.

b) 
    The span is ${\mathbb R}^{12}$.

c) 
    There is a unique solution.

d) 
    There is a unique solution ${\mathbf x}={\mathbf 0}.$

SOLUTION:

a) 
    Since the solution is unique, each column of $A$ must have a pivot position. Since there are also 12 rows, each row must have a pivot position as well. This means that the row reduced echelon form of $A$ is the identity matrix.

b) 
    Since there is a pivot position in every row, the span of the columns of $A$ is ${\mathbb R}^{12}$.

c) 
    There is a unique solution to the equation because $A$ has a pivot position in every row and every column.

d) 
    There is a unique solution ${\mathbf x}={\mathbf 0}$.

:::

:::exercise {exercise-2-3-010} number=2.3.10 answered=yes src=src/exercises/exercises2-3.xml:736
PROBLEM:
Suppose that

$$ {\mathbf v}_1 = \left[\begin{array}{r}3 \\ 1 \\ 3 \\ -1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}0 \\ -1 \\ -2 \\ 2 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}-3 \\ -3 \\ -7 \\ 5 \end{array}\right] $$

.

a) 
    Is ${\mathbf v}_3$ a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$? If so, find weights such that ${\mathbf v}_3 = a{\mathbf v}_1+b{\mathbf v}_2$.

b) 
    Show that a linear combination

    $$ a{\mathbf v}_1 + b{\mathbf v}_2 + c{\mathbf v}_3 $$

    can be rewritten as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    Explain why $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

ANSWER:

a) 
    Yes

b) 
    We have

    $$ \begin{array}{rl} a{\mathbf v}_1+b{\mathbf v}_2+c{\mathbf v}_3 & = a{\mathbf v}_1 + b{\mathbf v}_2+c(-{\mathbf v}_1+2{\mathbf v}_2) \\ & = (a-c){\mathbf v}_1+(b+2c){\mathbf v}_2\text{.} \end{array} $$

c) 
    As seen in the last part of this problem, every linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ can be rewritten as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

SOLUTION:

a) 
    Yes, because ${\mathbf v}_3=-{\mathbf v}_1+2{\mathbf v}_2$.

b) 
    We have

    $$ \begin{array}{rl} a{\mathbf v}_1+b{\mathbf v}_2+c{\mathbf v}_3 & = a{\mathbf v}_1 + b{\mathbf v}_2+c(-{\mathbf v}_1+2{\mathbf v}_2) \\ & = (a-c){\mathbf v}_1+(b+2c){\mathbf v}_2\text{.} \end{array} $$

c) 
    As seen in the last part of this problem, every linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ can be rewritten as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

:::

:::exercise {exercise-2-3-011} number=2.3.11 answered=yes src=src/exercises/exercises2-3.xml:815
PROBLEM:
As defined in this section, the span of a set of vectors is generated by taking all possible linear combinations of those vectors. This exercise will demonstrate the fact that the span can also be realized as the solution space to a linear system.
We will consider the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \\ -2 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}2 \\ 1 \\ 0 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}1 \\ 1 \\ 2 \end{array}\right] $$

a) 
    Is every vector in ${\mathbb R}^3$ in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$? If not, describe the span.

    :::sage
    ```sage

    ```
    :::

b) 
    To describe $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ as the solution space of a linear system, we will write

    $$ {\mathbf b}=\left[\begin{array}{r}a \\ b \\ c \end{array}\right] $$

    . If ${\mathbf b}$ is in $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$, then the linear system corresponding to the augmented matrix

    $$ \left[\begin{array}{rrr|r} 1 & 2 & 1 & a \\ 0 & 1 & 1 & b \\ -2& 0 & 2 & c \\ \end{array}\right] $$

    must be consistent. This means that a pivot cannot occur in the rightmost column. Perform row operations to put this augmented matrix into a triangular form. Now identify an equation in $a$, $b$, and $c$ that tells us when there is no pivot in the rightmost column. The solution space to this equation describes $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

c) 
    In this example, the matrix formed by the vectors $\left[\begin{array}{rrr} {\mathbf v}_1&{\mathbf v}_2&{\mathbf v}_3 \\ \end{array}\right]$ has two pivot positions. Suppose we were to consider another example in which this matrix had had only one pivot position. How would this have changed the linear system describing $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$?

ANSWER:

a) 
    $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ is the plane defined by ${\mathbf v}_1$ and ${\mathbf v}_2$.

b) 
    $2a-4b+c=0$.

c) 
    There would be two equations involving the variables $a$, $b$, and $c$.

SOLUTION:

a) 
    Finding the reduced row echelon form

    $$ \left[\begin{array}{rrr} 1 & 2 & 1 \\ 0 & 1 & 1 \\ -2 & 0 & 2 \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \end{array}\right] $$

    shows that ${\mathbf v}_3$ is a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$. Therefore, $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ is the plane defined by ${\mathbf v}_1$ and ${\mathbf v}_2$.

b) 
    We see that

    $$ \left[\begin{array}{rrr|r} 1 & 2 & 1 & a \\ 0 & 1 & 1 & b \\ -2 & 0 & 2 & c \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 2 & 1 & a \\ 0 & 1 & 1 & b \\ 0 & 0 & 0 & 2a-4b+c \\ \end{array}\right]\text{.} $$

    If the equation is consistent, we must have $2a-4b+c=0$. The solution space is the plane defined by ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    In that case, there would be two equations involving the variables $a$, $b$, and $c$, and the solution space would be a line.

:::
