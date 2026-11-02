# 2.4 Linear independence {sec-linear-dep}

In the previous section, questions about the existence of solutions of a linear system led to the concept of the span of a set of vectors. In particular, the span of a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is the set of vectors ${\mathbf b}$ for which a solution to the linear system $\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots&{\mathbf v}_n \end{array}\right] ~{\mathbf x} = {\mathbf b}$ exists.
In this section, we turn to the uniqueness of solutions of a linear system, the second of our [two fundamental questions](ref:1.4#fundamental-questions). This will lead us to the concept of linear independence.

## 2.4.1 Introduction

:::exploration {act:preview-2-4-1} Preview Activity 2.4.1
Let's begin by looking at some sets of vectors in ${\mathbb R}^3$. As we saw in the previous section, the span of a set of vectors in ${\mathbb R}^3$ will be either a line, a plane, or ${\mathbb R}^3$ itself.
PROBLEM:
a) Consider the following vectors in ${\mathbb R}^3$:

    $$ {\mathbf v}_1=\left[\begin{array}{r}0 \\ -1 \\ 2 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}3 \\ 1 \\ -1 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}2 \\ 0 \\ 1 \end{array}\right] $$

    . Describe the span of these vectors, $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$, as a line, a plane, or ${\mathbb R}^3$.
    :::sage
    ```sage

    ```
    :::
b) Now consider the set of vectors:

    $$ {\mathbf w}_1=\left[\begin{array}{r}0 \\ -1 \\ 2 \end{array}\right], {\mathbf w}_2=\left[\begin{array}{r}3 \\ 1 \\ -1 \end{array}\right], {\mathbf w}_3=\left[\begin{array}{r}3 \\ 0 \\ 1 \end{array}\right] $$

    . Describe the span of these vectors, $\text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\}$, as a line, a plane, or ${\mathbb R}^3$.
    :::sage
    ```sage

    ```
    :::
c) Show that the vector ${\mathbf w}_3$ is a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$ by finding weights such that

    $$ {\mathbf w}_3 = c{\mathbf w}_1 + d{\mathbf w}_2 $$

    .
d) Explain why any linear combination of ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$,

    $$ c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3{\mathbf w}_3 $$

    can be written as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$.
e) Explain why

    $$ \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\} = \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2\right\} $$

    .
ANSWER:
a) $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$.
b) $\text{Span}\left\{{\mathbf w}_1, {\mathbf w}_2, {\mathbf w}_3\right\}$ is a plane in ${\mathbb R}^3$.
c) ${\mathbf w}_3 = {\mathbf w}_1 + {\mathbf w}_2$.
d) We have

    $$ c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3{\mathbf w}_3 = c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3({\mathbf w}_1+{\mathbf w}_2)= (c_1+c_3){\mathbf w}_1 + (c_2+c_3){\mathbf w}_2. $$

e) Any linear combination of ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ is itself a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$.
SOLUTION:
a) We will construct the matrix whose columns are ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$:

    $$ \begin{bmatrix} 0 & 3 & 2 \\ -1 & 1 & 0 \\ 2 & -1 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}. $$

    Because there is a pivot in every row, [Proposition 2.3.14](ref:2.3#prop-pivot-row) tells us that $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$.
b) Similarly,

    $$ \begin{bmatrix} 0 & 3 & 3 \\ -1 & 1 & 0 \\ 2 & -1 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \\ \end{bmatrix}. $$

    As there are two pivot positions, we see that $\text{Span}\left\{{\mathbf w}_1, {\mathbf w}_2, {\mathbf w}_3\right\}$ is a plane in ${\mathbb R}^3$.
c) We see that

    $$ \left[ \begin{array}{rr|r} 0 & 3 & 3 \\ -1 & 1 & 0 \\ 2 & -1 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & 0 & 1 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \\ \end{array} \right], $$

    which tells us that ${\mathbf w}_3 = {\mathbf w}_1 + {\mathbf w}_2$.
d) We have

    $$ c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3{\mathbf w}_3 = c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3({\mathbf w}_1+{\mathbf w}_2)= (c_1+c_3){\mathbf w}_1 + (c_2+c_3){\mathbf w}_2. $$

e) Any linear combination of ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ is itself a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$.
:::

## 2.4.2 Linear dependence

We have seen examples where the span of a set of three vectors in ${\mathbb R}^3$ is ${\mathbb R}^3$ and other examples where the span of three vectors is a plane. We would like to understand the difference between these two situations.

:::example {ex:example-span-r3} Example 2.4.1
Let's consider the set of three vectors in ${\mathbb R}^3$:

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ 2 \\ 0 \end{array}\right],~~~ {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 1 \\ -1 \end{array}\right],~~~ {\mathbf v}_3 = \left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right]. $$

Forming the associated matrix gives

$$ \begin{bmatrix}{\mathbf v}_1&{\mathbf v}_2&{\mathbf v}_3\end{bmatrix} = \begin{bmatrix} 2 & 1 & -1 \\ 2 & 1 & 0 \\ 0 & -1 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}. $$

Because there is a pivot position in every row, [Proposition 2.3.14](ref:2.3#prop-pivot-row) tells us that $\text{Span}\left\{{\mathbf v}_1, {\mathbf v}_2, {\mathbf v}_3\right\} = {\mathbb R}^3$.
:::

:::example {ex:example-span-plane} Example 2.4.2
Now let's consider the set of three vectors:

$$ {\mathbf w}_1 = \left[\begin{array}{r}2 \\ 2 \\ 0 \end{array}\right],~~~ {\mathbf w}_2 = \left[\begin{array}{r}1 \\ 1 \\ -1 \end{array}\right],~~~ {\mathbf w}_3 = \left[\begin{array}{r}-5 \\ -5 \\ 1 \end{array}\right]. $$

Forming the associated matrix gives

$$ \begin{bmatrix}{\mathbf w}_1&{\mathbf w}_2&{\mathbf w}_3\end{bmatrix} = \begin{bmatrix} 2 & 1 & -5 \\ 2 & 1 & -5 \\ 0 & -1 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & -2 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \\ \end{bmatrix}. $$

Since the last row does not have a pivot position, we know that the span of these vectors is not ${\mathbb R}^3$ but is instead a plane.
In fact, we can say more if we shift our perspective slightly and view this as an augmented matrix:

$$ \left[ \begin{array}{rr|r}{\mathbf w}_1&{\mathbf w}_2&{\mathbf w}_3 \end{array} \right] = \left[ \begin{array}{rr|r} 2 & 1 & -5 \\ 2 & 1 & -5 \\ 0 & -1 & 1 \\ \end{array} \right] \sim \left[ \begin{array}{rr|r} 1 & 0 & -2 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \\ \end{array} \right]. $$

In this way, we see that ${\mathbf w}_3 = -2{\mathbf w}_1 - {\mathbf w}_2$, which enables us to rewrite any linear combination of these three vectors:

$$ \begin{aligned} c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3{\mathbf w}_3 & {}={} c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3(-2{\mathbf w}_1-{\mathbf w}_2) \\ & {}={} (c_1-2c_3){\mathbf w}_1 + (c_2-c_3){\mathbf w}_2. \\ \end{aligned} $$

In other words, any linear combination of ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ may be written as a linear combination using only the vectors ${\mathbf w}_1$ and ${\mathbf w}_2$. Since the span of a set of vectors is simply the set of their linear combinations, this shows that

$$ \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\} = \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2\right\}. $$

As a result, adding the vector ${\mathbf w}_3$ to the set of vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ does not change the span.
:::

Before exploring this type of behavior more generally, let's think about it from a geometric point of view. Suppose that we begin with the two vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ in [Example 2.4.1](ref:example-span-r3). The span of these two vectors is a plane in ${\mathbb R}^3$, as seen on the left of [Figure 2.4.3](ref:figure-span-r3).

> FIGURE {fig:figure-span-r3} number=2.4.3 src=../../media/ch02/3d-plane-nonstd.svg
> alt: Two three-dimensional vectors and the plane formed by their linear combinations.
> caption: The span of the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.
> subfigure src=../../media/ch02/3d-plane-nonstd.svg alt: Two three-dimensional vectors and the plane formed by their linear combinations.
> subfigure src=../../media/ch02/3d-plane-span-no-w.svg alt: Two three-dimensional vectors, the plane they define, and a third vector not in the plane.

Because the vector ${\mathbf v}_3$ is not a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$, it provides a direction to move that is independent of ${\mathbf v}_1$ and ${\mathbf v}_2$. Adding this third vector ${\mathbf v}_3$ therefore forms a set whose span is ${\mathbb R}^3$, as seen on the right of [Figure 2.4.3](ref:figure-span-r3).

Similarly, the span of the vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ in [Example 2.4.2](ref:example-span-plane) is also a plane. However, the third vector ${\mathbf w}_3$ is a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$, which means that it already lies in the plane formed by ${\mathbf w}_1$ and ${\mathbf w}_2$, as seen in [Figure 2.4.4](ref:figure-span-plane). Since we can already move in this direction using just ${\mathbf w}_1$ and ${\mathbf w}_2$, adding ${\mathbf w}_3$ to the set does not change the span. As a result, it remains a plane.

> FIGURE {fig:figure-span-plane} number=2.4.4 src=../../media/ch02/3d-plane-nonstd-w.svg
> alt: Two three-dimensional vectors and the plane formed by their linear combinations.
> caption: The span of the vectors ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$.
> subfigure src=../../media/ch02/3d-plane-nonstd-w.svg alt: Two three-dimensional vectors and the plane formed by their linear combinations.
> subfigure src=../../media/ch02/3d-plane-span-yes-w.svg alt: Two three-dimensional vectors, the plane they define, and a third vector contained in the plane.

What distinguishes these two examples is whether one of the vectors is a linear combination of the others, an observation that leads to the following definition.

:::definition {def:definition-linear-independence} Definition 2.4.5
A set of vectors is called *linearly dependent* if one of the vectors is a linear combination of the others. Otherwise, the set of vectors is called *linearly independent*.
:::

For the sake of completeness, we say that a set of vectors containing only one nonzero vector is linearly independent.

## 2.4.3 How to recognize linear dependence

:::activity {act:activity-2-4-2} Activity 2.4.2
We would like to develop a means to detect when a set of vectors is linearly dependent. This activity will point the way.

a) 
    Suppose we have five vectors in ${\mathbb R}^4$ that form the columns of a matrix having reduced row echelon form

    $$ \left[\begin{array}{rrrrr} {\mathbf v}_1 & 	 {\mathbf v}_2 & 	 {\mathbf v}_3 & {\mathbf v}_4 &	 {\mathbf v}_5 \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & -1 & 0 & 2 \\ 0 & 1 & 2 & 0 & 3 \\ 0 & 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 & 0 \\ \end{array}\right] $$

    . Is it possible to write one of the vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_5$ as a linear combination of the others? If so, show explicitly how one vector appears as a linear combination of some of the other vectors. Is this set of vectors linearly dependent or independent?

b) 
    Suppose we have another set of three vectors in ${\mathbb R}^4$ that form the columns of a matrix having reduced row echelon form

    $$ \left[\begin{array}{rrr} {\mathbf w}_1 & 	 {\mathbf w}_2 & 	 {\mathbf w}_3 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \\ \end{array}\right] $$

    . Is it possible to write one of these vectors ${\mathbf w}_1$, ${\mathbf w}_2$, ${\mathbf w}_3$ as a linear combination of the others? If so, show explicitly how one vector appears as a linear combination of some of the other vectors. Is this set of vectors linearly dependent or independent?

c) 
    By looking at the pivot positions, how can you determine whether the columns of a matrix are linearly dependent or independent?

d) 
    If one vector in a set is the zero vector ${\mathbf 0}$, can the set of vectors be linearly independent?

e) 
    Suppose a set of vectors in ${\mathbb R}^{10}$ has twelve vectors. Is it possible for this set to be linearly independent?

SOLUTION:

a) 
    Let's focus on the first three vectors and view the matrix as an augmented one:

    $$ \left[\begin{array}{rr|r} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & -1 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    This shows that ${\mathbf v}_3=-{\mathbf v}_1+2{\mathbf v}_2$ so it is possible to write one of the vectors as a linear combination of the others. Therefore, the set is linearly dependent.

b) 
    Applying the same reasoning as in the previous part, we see that we cannot write any of the vectors as a linear combination of the others. Therefore, the set is linearly independent.

c) 
    The columns of a matrix are linearly independent exactly when there is a pivot position in every column of the matrix.

d) 
    No, because we can write the zero vector ${\mathbf 0}$ as a linear combination of the other vectors: ${\mathbf 0} = 0{\mathbf v}_2 + \ldots + 0{\mathbf v}_n$.

e) 
    No, because the matrix formed by the vectors would have 12 columns and only 10 rows. There can be at most 10 pivot positions so there are at least two columns without pivot positions.

:::

By now, we should expect that the pivot positions play an important role in determining whether the columns of a matrix are linearly dependent. For instance, suppose we have four vectors and their associated matrix

$$ \left[\begin{array}{rrrr} {\mathbf v}_1 & 	 {\mathbf v}_2 & 	 {\mathbf v}_3 & {\mathbf v}_4 \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & 2 & 0 \\ 0 & 1 & -3 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]. $$

Since the third column does not contain a pivot position, let's just focus on the first three columns and view them as an augmented matrix:

$$ \left[\begin{array}{rr|r} {\mathbf v}_1 & 	 {\mathbf v}_2 & 	 {\mathbf v}_3 \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 2 \\ 0 & 1 & -3 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]. $$

This says that

$$ {\mathbf v}_3 = 2{\mathbf v}_1 -3{\mathbf v}_2, $$

which tells us that the set of vectors ${\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4$ is linearly dependent. Moreover, we see that

$$ \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_4\right\}. $$

More generally, the same reasoning implies that a set of vectors is linearly dependent if the associated matrix has a column without a pivot position. Indeed, as illustrated here, a vector corresponding to a column without a pivot position can be expressed as a linear combination of the vectors whose columns do contain pivot positions.

Suppose instead that the matrix associated to a set of vectors has a pivot position in every column.

$$ \left[\begin{array}{rrrr} {\mathbf w}_1 & 	 {\mathbf w}_2 & 	 {\mathbf w}_3 & {\mathbf w}_4 \\ \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0\\ 0 & 0 & 1 & 0\\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]. $$

Viewing this as an augmented matrix again, we see that the linear system is inconsistent since there is a pivot in the rightmost column, which means that ${\mathbf w}_4$ cannot be expressed as a linear combination of the other vectors. Similarly, ${\mathbf w}_3$ cannot be expressed as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$. In fact, none of the vectors can be written as a linear combination of the others so this set of vectors is linearly independent.

The following proposition summarizes these findings.

:::proposition {prop:proposition-2-4-6} Proposition 2.4.6
The columns of a matrix are linearly independent if and only if every column contains a pivot position.
:::

This condition imposes a constraint on how many vectors we can have in a linearly independent set. Here is an example of the reduced row echelon form of a matrix whose columns form a set of three linearly independent vectors in ${\mathbb R}^5$:

$$ \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]. $$

Notice that there are at least as many rows as columns, which must be the case if every column is to have a pivot position.

More generally, if ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a linearly independent set of vectors in ${\mathbb R}^m$, the associated matrix must have a pivot position in every column. Since every row contains at most one pivot position, the number of columns can be no greater than the number of rows. This means that the number of vectors in a linearly independent set can be no greater than the number of dimensions.

:::proposition {prop:prop-linear-indep-bound} Proposition 2.4.7
A linearly independent set of vectors in ${\mathbb R}^m$ contains at most $m$ vectors.
:::

This says, for instance, that any linearly independent set of vectors in ${\mathbb R}^3$ can contain no more three vectors. We usually imagine three independent directions, such as up/down, front/back, left/right, in our three-dimensional world. This proposition tells us that there can be no more independent directions.

The proposition above says that a set of vectors in ${\mathbb R}^m$ that is linear independent has at most $m$ vectors. By comparison, [Proposition 2.3.15](ref:2.3#prop-span-bound) says that a set of vectors whose span is ${\mathbb R}^m$ has at least $m$ vectors.

## 2.4.4 Homogeneous equations

If $A$ is a matrix, we call the equation $A{\mathbf x} = {\mathbf 0}$ a *homogeneous* equation. As we'll see, the uniqueness of solutions to this equation reflects on the linear independence of the columns of $A$.

:::activity {act:activity-2-4-3} Activity 2.4.3 (Linear independence and homogeneous equations)

a) 
    Explain why the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ is consistent no matter the matrix $A$.

b) 
    Consider the matrix

    $$ A = \left[\begin{array}{rrr} 3 & 2 & 0 \\ -1 & 0 & -2 \\ 2 & 1 & 1 \end{array}\right] $$

    whose columns we denote by ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$. Describe the solution space of the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ using a parametric description, if appropriate.

    :::sage
    ```sage

    ```
    :::

c) 
    Find a nonzero solution to the homogeneous equation and use it to find weights $c_1$, $c_2$, and $c_3$ such that

    $$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + c_3{\mathbf v}_3 = {\mathbf 0} $$

    .

d) 
    Use the equation you found in the previous part to write one of the vectors as a linear combination of the others.

e) 
    Are the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ linearly dependent or independent?

SOLUTION:

a) 
    The vector ${\mathbf 0}$ is always a solution.

b) 
    We have

    $$ \left[\begin{array}{rrr} 3 & 2 & 0 \\ -1 & 0 & -2 \\ 2 & 1 & 1 \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 2 \\ 0 & 1 & -3 \\ 0 & 0 & 0 \end{array}\right]. $$

    From the reduced row echelon form, we see that $x_3$ is a free variable and that we have

    $$ \begin{alignedat}{2} x_1 & {}={} -2x_3 \\ x_2 & {}={} 3x_3\text{.} \\ \end{alignedat} $$

    The solution space is then written parametrically as

    $$ {\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right] = x_3\left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right]\text{.} $$

c) 
    If we set $x_3=1$, then we have the solution ${\mathbf x}=\left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right]$, which says that

    $$ -2{\mathbf v}_1+3{\mathbf v}_2+{\mathbf v}_3 = {\mathbf 0}\text{.} $$

d) 
    We may rewrite this expression as ${\mathbf v}_3=2{\mathbf v}_1-3{\mathbf v}_2$, showing that ${\mathbf v}_3$ is a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

e) 
    The vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ are linearly dependent, and we know this in two ways. We have seen how to express one vector as a linear combination of the others. Also, we have seen that the associated matrix has a column without a pivot position.

:::

This activity shows how the solution space of the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ indicates whether the columns of $A$ are linearly dependent or independent. First, we know that the equation $A{\mathbf x} = {\mathbf 0}$ always has at least one solution, the vector ${\mathbf x} = {\mathbf 0}$. Any other solution is a nonzero solution.

:::example {ex:example-2-4-8} Example 2.4.8
Let's consider the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ -4 \\ 1 \\ 0 \end{array}\right],~~~ {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 1 \\ 3 \\ -2 \end{array}\right],~~~ {\mathbf v}_3 = \left[\begin{array}{r}3 \\ -3 \\ 4 \\ -2 \end{array}\right] $$

and their associated matrix $A = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{bmatrix}$.
The homogeneous equation $A{\mathbf x} = {\mathbf 0}$ has the associated augmented matrix

$$ \left[ \begin{array}{rrr|r} 2 & 1 & 3 & 0 \\ -4 & 1 & -3 & 0 \\ 1 & 3 & 4 & 0 \\ 0 & -2 & -2 & 0 \\ \end{array} \right] \sim \left[ \begin{array}{rrr|r} 1 & 0 & 1 & 0 \\ 0 & 1 & 1 & 0 \\ 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 \\ \end{array} \right]. $$

Therefore, $A$ has a column without a pivot position, which tells us that the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ are linearly dependent. However, we can also see this fact in another way.
The reduced row echelon matrix tells us that the homogeneous equation has a free variable so that there must be infinitely many solutions. In particular, we have

$$ \begin{aligned} x_1 & {}={} -x_3 \\ x_2 & {}={} -x_3 \\ \end{aligned} $$

so the solutions have the form

$$ {\mathbf x} = \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right] = \left[\begin{array}{r}-x_3 \\ -x_3 \\ x_3 \end{array}\right] = x_3\left[\begin{array}{r}-1 \\ -1 \\ 1 \end{array}\right]. $$

If we choose $x_3=1$, then we obtain the nonzero solution to the homogeneous equation ${\mathbf x} = \left[\begin{array}{r}-1 \\ -1 \\ 1 \end{array}\right]$, which implies that

$$ A\left[\begin{array}{r}-1 \\ -1 \\ 1 \end{array}\right] = \begin{bmatrix} {\mathbf v}_1&{\mathbf v}_2&{\mathbf v}_3 \end{bmatrix} \left[\begin{array}{r}-1 \\ -1 \\ 1 \end{array}\right] = -{\mathbf v}_1 -{\mathbf v}_2 + {\mathbf v}_3 = {\mathbf 0}. $$

In other words,

$$ \begin{aligned} -{\mathbf v}_1 -{\mathbf v}_2 + {\mathbf v}_3 &{}={} {\mathbf 0} \\ {\mathbf v}_3 &{}={} {\mathbf v}_1 + {\mathbf v}_2. \\ \end{aligned} $$

Because ${\mathbf v}_3$ is a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$, we know that this set of vectors is linearly dependent.
:::

As this example demonstrates, there are many ways we can view the question of linear independence, some of which are recorded in the following proposition.

:::proposition {prop:proposition-2-4-9} Proposition 2.4.9
For a matrix $A = \left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&\ldots&{\mathbf v}_n \end{array}\right]$, the following statements are equivalent:

- 
    The columns of $A$ are linearly dependent.

- 
    One of the vectors in the set ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a linear combination of the others.

- 
    The matrix $A$ has a column without a pivot position.

- 
    The homogeneous equation $A{\mathbf x} = {\mathbf 0}$ has infinitely many solutions and hence a nonzero solution.

- 
    There are weights $c_1,c_2,\ldots,c_n$, not all of which are zero, such that

    $$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_n{\mathbf v}_n = {\mathbf 0} $$

    .

:::

## 2.4.5 Summary

This section developed the concept of linear dependence of a set of vectors. More specifically, we saw that:

- 
    A set of vectors is linearly dependent if one of the vectors is a linear combination of the others.

- 
    A set of vectors is linearly independent if and only if the vectors form a matrix that has a pivot position in every column.

- 
    A set of linearly independent vectors in ${\mathbb R}^m$ contains no more than $m$ vectors.

- 
    The columns of the matrix $A$ are linearly dependent if the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ has a nonzero solution.

- 
    A set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is linearly dependent if there are weights $c_1,c_2,\ldots,c_n$, not all of which are zero, such that

    $$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_n{\mathbf v}_n = {\mathbf 0} $$

    .

At the beginning of the section, we said that this concept addressed the second of our [two fundamental questions](ref:1.4#fundamental-questions) concerning the uniqueness of solutions to a linear system. It is worth comparing the results of this section with those of the previous one so that the parallels between them become clear.

As usual, we will write a matrix as a collection of vectors,

$$ A=\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right]. $$

> TABLE {tab:tab-2-4-10} number=2.4.10 cols=2
> caption: Span and Linear Independence
| Span | Linear independence |
| --- | --- |
| A vector ${\mathbf b}$ is in the span of a set of vectors if it is a linear combination of those vectors. | A set of vectors is linearly dependent if one of the vectors is a linear combination of the others. |
| A vector ${\mathbf b}$ is in the span of ${\mathbf v}_1, {\mathbf v}_2, \ldots, {\mathbf v}_n$ if there exists a solution to $A{\mathbf x} = {\mathbf b}$. | The vectors ${\mathbf v}_1, {\mathbf v}_2, \ldots, {\mathbf v}_n$ are linearly independent if ${\mathbf x}={\mathbf 0}$ is the unique solution to $A{\mathbf x} = {\mathbf 0}$. |
| The columns of an $m\times n$ matrix span ${\mathbb R}^m$ if the matrix has a pivot position in every row. | The columns of a matrix are linearly independent if the matrix has a pivot position in every column. |
| A set of vectors that span ${\mathbb R}^m$ has at least $m$ vectors. | A set of linearly independent vectors in ${\mathbb R}^m$ has at most $m$ vectors. |

## 2.4.6 Exercises

:::exercise {exercise-2-4-001} number=2.4.1 answered=yes src=src/exercises/exercises2-4.xml:5
PROBLEM:
Consider the set of vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 2 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}0 \\ 1 \\ 3 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}2 \\ 3 \\ -1 \end{array}\right], {\mathbf v}_4 = \left[\begin{array}{r}-2 \\ 4 \\ -1 \end{array}\right] $$

.

a) 
    Explain why this set of vectors is linearly dependent.

b) 
    Write one of the vectors as a linear combination of the others.

    :::sage
    ```sage

    ```
    :::

c) 
    Find weights $c_1$, $c_2$, $c_3$, and $c_4$, not all of which are zero, such that

    $$ c_1{\mathbf v}_1 + c_2 {\mathbf v}_2 + c_3 {\mathbf v}_3 + c_4 {\mathbf v}_4 = {\mathbf 0} $$

    .

d) 
    Suppose $A=\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&{\mathbf v}_3&{\mathbf v}_4 \end{array}\right]$. Find a nonzero solution to the homogenous equation $A{\mathbf x} = {\mathbf 0}$.

ANSWER:

a) 
    Four vectors in ${\mathbb R}^3$ must always be linearly dependent.

b) 
    ${\mathbf v}_3 = 2{\mathbf v}_1-{\mathbf v}_2$.

c) 
    $c_1=-2$, $c_2=1$, $c_3=1$, and $c_4=0$

d) 
    ${\mathbf x} = \left[\begin{array}{r}-2 \\ 1 \\ 1 \\ 0 \end{array}\right]$

SOLUTION:

a) 
    We view the vectors as the columns of a matrix so that

    $$ \left[\begin{array}{rrrr} 1 & 0 & 2 & -2 \\ 2 & 1 & 3 & 4 \\ 1 & 3 & -1 & -1 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & 2 & 0 \\ 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 1 \end{array}\right]\text{.} $$

    Since there is a column without a pivot position, the vectors must be linearly dependent. We also expect this because four vectors in ${\mathbb R}^3$ must always be linearly dependent.

b) 
    If we view the first three columns as an augmented matrix, we have

    $$ \left[\begin{array}{rr|r} 1 & 0 & 2 \\ 2 & 1 & 3 \\ 1 & 3 & -1 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & 2 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    We see that ${\mathbf v}_3 = 2{\mathbf v}_1-{\mathbf v}_2$.

c) 
    From the solution to the previous part, we have $-2{\mathbf v}_1+{\mathbf v}_2+{\mathbf v}_3 = {\mathbf 0}$, which says that $c_1=-2$, $c_2=1$, $c_3=1$, and $c_4=0$ is an appropriate choice of weights.

d) 
    From the solution to the previous part, we see that ${\mathbf x} = \left[\begin{array}{r}-2 \\ 1 \\ 1 \\ 0 \end{array}\right]$ is a solution of the homogeneous equation.

:::

:::exercise {exercise-2-4-002} number=2.4.2 answered=yes src=src/exercises/exercises2-4.xml:122
PROBLEM:
Consider the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ -1 \\ 0 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \\ 1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}2 \\ -2 \\ 3 \end{array}\right] $$

.

a) 
    Are these vectors linearly independent or linearly dependent?

    :::sage
    ```sage

    ```
    :::

b) 
    Describe the $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$.

c) 
    Suppose that ${\mathbf b}$ is a vector in ${\mathbb R}^3$. Explain why we can guarantee that ${\mathbf b}$ may be written as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

d) 
    Suppose that ${\mathbf b}$ is a vector in ${\mathbb R}^3$. In how many ways can ${\mathbf b}$ be written as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$?

ANSWER:

a) 
    Linearly independent.

b) 
    $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$.

c) 
    Because $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$, every vector in ${\mathbb R}^3$ can be written as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

d) 
    In exactly one way.

SOLUTION:

a) 
    Viewing the vectors as the columns of a matrix, we have

    $$ \left[\begin{array}{rrr} 2 & 1 & 2 \\ -1 & 2 & -2 \\ 0 & 1 & 3 \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right]\text{.} $$

    Since there is a pivot position in every column, the vectors are linearly independent.

b) 
    Since the matrix has a pivot position in every row, we see that $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$.

c) 
    Because $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$, every vector in ${\mathbb R}^3$ can be written as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

d) 
    In exactly one way. Because the matrix has a pivot position in every column, there cannot be a free variable.

:::

:::exercise {exercise-2-4-003} number=2.4.3 answered=yes src=src/exercises/exercises2-4.xml:224
PROBLEM:
Respond to the following questions and provide a justification for your responses.

a) 
    If the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ form a linearly dependent set, must one vector be a scalar multiple of the other?

b) 
    Suppose that ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a linearly independent set of vectors. What can you say about the linear independence or dependence of a subset of these vectors?

c) 
    Suppose ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a linearly independent set of vectors that form the columns of a matrix $A$. If the equation $A{\mathbf x} = {\mathbf b}$ is inconsistent, what can you say about the linear independence or dependence of the set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n,{\mathbf b}$?

ANSWER:

a) 
    Yes

b) 
    Any subset is linearly independent.

c) 
    They form a linearly independent set.

SOLUTION:

a) 
    Yes. If $c_1{\mathbf v}_1 + c_2{\mathbf v}_2 = {\mathbf 0}$ and one of the weights is not zero, we can rearrange this expression to solve for one of the vectors as a scalar multiple of the other. For instance, if $2{\mathbf v}_1-3{\mathbf v}_2={\mathbf 0}$, then ${\mathbf v}_1 = \frac32{\mathbf v}_2$.

b) 
    Any subset of the vectors forms a linearly independent set. Because the original set is linearly independent, none of the vectors can be written as a linear combination of the others. This is still true when we look at a smaller set of the vectors.

c) 
    The set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n,{\mathbf b}$ will also be linearly independent. Since $A{\mathbf x}={\mathbf b}$ is inconsistent, we know that ${\mathbf b}$ cannot be written as a linear combination of the other vectors. We also know that each of the vectors ${\mathbf v}_j$ cannot be written as a linear combination of the others because ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a linearly independent set.

:::

:::exercise {exercise-2-4-004} number=2.4.4 answered=yes src=src/exercises/exercises2-4.xml:302
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    If ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ are linearly dependent, then one vector is a scalar multiple of one of the others.

b) 
    If ${\mathbf v}_1, {\mathbf v}_2, \ldots, {\mathbf v}_{10}$ are vectors in ${\mathbb R}^5$, then the set of vectors is linearly dependent.

c) 
    If ${\mathbf v}_1, {\mathbf v}_2, \ldots, {\mathbf v}_{5}$ are vectors in ${\mathbb R}^{10}$, then the set of vectors is linearly independent.

d) 
    Suppose we have a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ and that ${\mathbf v}_2$ is a scalar multiple of ${\mathbf v}_1$. Then the set is linearly dependent.

e) 
    Suppose that ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ are linearly independent and form the columns of a matrix $A$. If $A{\mathbf x} = {\mathbf b}$ is consistent, then there is exactly one solution.

ANSWER:

a) 
    False

b) 
    True

c) 
    False

d) 
    True

e) 
    True

SOLUTION:

a) 
    False. We only know that one vector can be written as a linear combination of the others.

b) 
    True. If we put the vectors into a matrix, there are more columns than rows. Therefore, there must be a column without a pivot position so the vectors form a linearly dependent set.

c) 
    False. They could form a linearly independent set, but we cannot guarantee it. We would have to look at the location of the pivot positions in the associated $10\times5$ matrix.

d) 
    True. In this case, ${\mathbf v}_2$ can be written as a linear combination of the other vectors so the set is linearly dependent.

e) 
    True. Since the vectors are linearly independent, $A$ has a pivot position in every column. Therefore, there is not a free variable in the description of the solution space to the equation $A{\mathbf x}={\mathbf b}$. Therefore, the solution is unique.

:::

:::exercise {exercise-2-4-005} number=2.4.5 answered=yes src=src/exercises/exercises2-4.xml:379
PROBLEM:
Suppose we have a set of vectors ${\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4$ in ${\mathbb R}^5$ that satisfy the relationship:

$$ 2{\mathbf v}_1 - {\mathbf v}_2 + 3{\mathbf v}_3 + {\mathbf v}_4 = {\mathbf 0} $$

and suppose that $A$ is the matrix $A=\left[\begin{array}{rrrr} {\mathbf v}_1&{\mathbf v}_2&{\mathbf v}_3&{\mathbf v}_4 \end{array}\right]$.

a) 
    Find a nonzero solution to the equation $A{\mathbf x} = {\mathbf 0}$.

b) 
    Explain why the matrix $A$ has a column without a pivot position.

c) 
    Write one of the vectors as a linear combination of the others.

d) 
    Explain why the set of vectors is linearly dependent.

ANSWER:

a) 
    ${\mathbf x}=\left[\begin{array}{r}2 \\ -1 \\ 3 \\ 1 \end{array}\right]$

b) 
    There are infinitely many solutions to the homogeneous equation $A{\mathbf x}={\mathbf 0}$.

c) 
    ${\mathbf v}_4 = -2{\mathbf v}_1 + {\mathbf v}_2 - 3{\mathbf v}_3$.

d) 
    One vector can be written as a linear combination of the others.

SOLUTION:

a) 
    The vector ${\mathbf x}=\left[\begin{array}{r}2 \\ -1 \\ 3 \\ 1 \end{array}\right]$ is a solution.

b) 
    There is a nonzero solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$. Since there is also the zero solution ${\mathbf x}={\mathbf 0}$, there must be infinitely many solutions. This can only happen when there is a column of $A$ that does not have a pivot position.

c) 
    ${\mathbf v}_4 = -2{\mathbf v}_1 + {\mathbf v}_2 - 3{\mathbf v}_3$.

d) 
    Because one of the vectors can be written as a linear combination of the others, the set of vectors is linearly dependent.

:::

:::exercise {exercise-2-4-006} number=2.4.6 answered=yes src=src/exercises/exercises2-4.xml:458
PROBLEM:
Suppose that ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a set of vectors in ${\mathbb R}^{27}$ that form the columns of a matrix $A$.

a) 
    Suppose that the vectors span ${\mathbb R}^{27}$. What can you say about the number of vectors $n$ in this set?

b) 
    Suppose instead that the vectors are linearly independent. What can you say about the number of vectors $n$ in this set?

c) 
    Suppose that the vectors are both linearly independent and span ${\mathbb R}^{27}$. What can you say about the number of vectors in the set?

d) 
    Assume that the vectors are both linearly independent and span ${\mathbb R}^{27}$. Given a vector ${\mathbf b}$ in ${\mathbb R}^{27}$, what can you say about the solution space to the equation $A{\mathbf x} = {\mathbf b}$?

ANSWER:

a) 
    There must be at least 27 vectors.

b) 
    There must be at most 27 vectors.

c) 
    There are exactly 27 vectors.

d) 
    There is exactly one solution.

SOLUTION:

a) 
    In this case, the matrix $A$ must have a pivot position in evey row. There must be at least 27 vectors for this to be possible.

b) 
    In this case, the matrix $A$ must have a pivot position in every column. There must be at most 27 vectors for this to be possible.

c) 
    There must be exactly 27 vectors.

d) 
    There is exactly one solution to the equation $A{\mathbf x}={\mathbf b}$ because the matrix $A$ has a pivot position in every row and every column.

:::

:::exercise {exercise-2-4-007} number=2.4.7 answered=yes src=src/exercises/exercises2-4.xml:532
PROBLEM:
Given below are some descriptions of sets of vectors that form the columns of a matrix $A$. For each description, give a possible reduced row echelon form for $A$ or indicate why there is no set of vectors satisfying the description by stating why the required reduced row echelon matrix cannot exist.

a) 
    A set of 4 linearly independent vectors in ${\mathbb R}^5$.

b) 
    A set of 4 linearly independent vectors in ${\mathbb R}^4$.

c) 
    A set of 3 vectors whose span is ${\mathbb R}^4$.

d) 
    A set of 5 linearly independent vectors in ${\mathbb R}^3$.

e) 
    A set of 5 vectors whose span is ${\mathbb R}^4$.

ANSWER:

a) 
    $\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    This is not possible.

d) 
    This is not possible.

e) 
    $\left[\begin{array}{rrrrr} 1 & 0 & 0 & 0 & -1 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & -2 \\ 0 & 0 & 0 & 1 & 4 \\ \end{array}\right]$.

SOLUTION:

a) 
    There must be a pivot position in every column: $\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]$.

b) 
    There must be a pivot position in every row. $\left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]$.

c) 
    This is not possible. The matrix $A$ has dimensions $4\times 3$ so there cannot be a pivot position in every row.

d) 
    This is not possible. The matrix $A$ has dimensions $3\times5$ so there cannot be a pivot position in every column.

e) 
    There must be a pivot position in every row. $\left[\begin{array}{rrrrr} 1 & 0 & 0 & 0 & -1 \\ 0 & 1 & 0 & 0 & 0 \\ 0 & 0 & 1 & 0 & -2 \\ 0 & 0 & 0 & 1 & 4 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-4-008} number=2.4.8 answered=yes src=src/exercises/exercises2-4.xml:663
PROBLEM:
When we explored matrix multiplication in [Section 2.2](ref:2.2#sec-matrices-lin-combs), we saw that some properties that are true for real numbers are not true for matrices. This exercise will investigate that in some more depth.

a) 
    Suppose that $A$ and $B$ are two matrices and that $AB = 0$. If $B \neq 0$, what can you say about the linear independence of the columns of $A$?

b) 
    Suppose that we have matrices $A$, $B$ and $C$ such that $AB = AC$. We have seen that we cannot generally conclude that $B=C$. If we assume additionally that $A$ is a matrix whose columns are linearly independent, explain why $B = C$. You may wish to begin by rewriting the equation $AB = AC$ as $AB-AC = A(B-C) = 0$.

ANSWER:

a) 
    They are linearly dependent.

b) 
    The columns of $B$ and $C$ are all equal.

SOLUTION:

a) 
    Since $B\neq0$, there is a column of $B$, which we'll call ${\mathbf x}$, that is not zero. Since $AB = 0$, we know that $A{\mathbf x} = {\mathbf 0}$, which means that ${\mathbf x}$ is a nonzero solution to the homogenous equation $A{\mathbf x} = {\mathbf 0}$. Therefore, the columns of $A$ are linearly dependent.

b) 
    Since the columns of $A$ are linearly independent, the only solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$ is ${\mathbf x}={\mathbf 0}$. Since that $A(B-C) = 0$, every column ${\mathbf x}$ of $B-C$ satisfies $A{\mathbf x} = {\mathbf 0}$. Therefore, every column of $B-C$ is the zero vector, which implies that $B=C$.

:::

:::exercise {exercise-2-4-009} number=2.4.9 answered=yes src=src/exercises/exercises2-4.xml:726
PROBLEM:
Suppose that $k$ is an unknown parameter and consider the set of vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ 0 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}4 \\ -2 \\ -1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}0 \\ 2 \\ k \end{array}\right] $$

.

a) 
    For what values of $k$ is the set of vectors linearly dependent?

b) 
    For what values of $k$ does the set of vectors span ${\mathbb R}^3$?

ANSWER:

a) 
    $k=3$.

b) 
    $k\neq3$.

SOLUTION:

a) 
    We construct the matrix

    $$ \left[\begin{array}{rrr} 2 & 4 & 0 \\ 0 & -2 & 2 \\ 1 & -1 & k \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 2 & 0 \\ 0 & 1 & -1 \\ 0 & 0 & k-3 \\ \end{array}\right]\text{.} $$

    If the vectors are linearly dependent, we cannot have a pivot position in the third column. This means that $k=3$.

b) 
    If the vectors span ${\mathbb R}^3$, there must be a pivot in the third row, which means that $k\neq 3$.

:::

:::exercise {exercise-2-4-010} number=2.4.10 answered=yes src=src/exercises/exercises2-4.xml:782
PROBLEM:
Given a set of linearly dependent vectors, we can eliminate some of the vectors to create a smaller, linearly independent set of vectors.

a) 
    Suppose that ${\mathbf w}$ is a linear combination of the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$. Explain why $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2, {\mathbf w}\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

b) 
    Consider the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ -1 \\ 0 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \\ 1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}-2 \\ 6 \\ 2 \end{array}\right], {\mathbf v}_4 = \left[\begin{array}{r}7 \\ -1 \\ 1 \end{array}\right] $$

    . Write one of the vectors as a linear combination of the others. Find a set of three vectors whose span is the same as $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\}$.

c) 
    Are the three vectors you are left with linearly independent? If not, express one of the vectors as a linear combination of the others and find a set of two vectors whose span is the same as $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\}$.

d) 
    Give a geometric description of $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\}$ in ${\mathbb R}^3$ as we did in [Section 2.3](ref:2.3#sec-span).

ANSWER:

a) 
    Any linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf w}$ can be rewritten as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

b) 
    $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_4\right\}$.

c) 
    $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

d) 
    It is a plane in ${\mathbb R}^3$.

SOLUTION:

a) 
    If ${\mathbf w}$ is a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$, then we can write ${\mathbf w}=a{\mathbf v}_1+b{\mathbf v}_2$. Then any linear combination of ${\mathbf v}_1,{\mathbf v}_2,{\mathbf w}$ can be rewritten as

    $$ c_1{\mathbf v}_1+c_2{\mathbf v}_2+c_3{\mathbf w}=(c_1+c_3a){\mathbf v}_1 + (c_2+c_3b){\mathbf v}_2\text{.} $$

b) 
    We have

    $$ \left[\begin{array}{rrrr} 2 & 1 & -2 & 7 \\ -1 & 2 & 6 & -1 \\ 0 & 1 & 2 & 1 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & -2 & 3 \\ 0 & 1 & 2 & 1 \\ 0 & 0 & 0 & 0 \end{array}\right]\text{.} $$

    This shows that ${\mathbf v}_3 = -2{\mathbf v}_1+2{\mathbf v}_2$ and so $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_4\right\}$.

c) 
    The remaining three vectors are linearly dependent because ${\mathbf v}_4 = 3{\mathbf v}_1+{\mathbf v}_2$. We therefore have $\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

d) 
    The vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ are linearly independent so their span is a plane in ${\mathbb R}^3$.

:::
