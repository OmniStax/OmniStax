# 3.5 Subspaces {sec-subspaces}

In this chapter, we have been looking at bases for ${\mathbb R}^p$, sets of vectors that are linearly independent and span ${\mathbb R}^p$. Frequently, however, we focus on only a subset of ${\mathbb R}^p$. In particular, if we are given an $m\times n$ matrix $A$, we have been interested in both the span of the columns of $A$ and the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$. In this section, we will expand the concept of basis to describe sets like these.

## 3.5.1 Introduction

:::exploration {act:preview-3-5-1} Preview Activity 3.5.1
Let's consider the following matrix $A$ and its reduced row echelon form.

$$ A = \left[\begin{array}{rrrr} 2 & -1 & 2 & 3 \\ 1 & 0 & 0 & 2 \\ -2 & 2 & -4 & -2 \\ \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 2 \\ 0 & 1 & -2 & 1 \\ 0 & 0 & 0 & 0 \\ \end{array}\right] $$

.
PROBLEM:
a) Are the columns of $A$ linearly independent? Is the span of the columns ${\mathbb R}^3$?
b) Give a parametric description of the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$.
c) Explain how this parametric description produces two vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ whose span is the solution space to the equation $A{\mathbf x} = {\mathbf 0}$.
d) What can you say about the linear independence of the set of vectors ${\mathbf w}_1$ and ${\mathbf w}_2$?
e) Let's denote the columns of $A$ as ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$. Explain why ${\mathbf v}_3$ and ${\mathbf v}_4$ can be written as linear combinations of ${\mathbf v}_1$ and ${\mathbf v}_2$.
f) Explain why ${\mathbf v}_1$ and ${\mathbf v}_2$ are linearly independent and

    $$ \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\} = \text{Span}\left\{{\mathbf v}_1, {\mathbf v}_2, {\mathbf v}_3, {\mathbf v}_4\right\}. $$

SOLUTION:
a) The columns of $A$ are not linearly independent since there is not a pivot position in every column. Also, the span of the columns is not ${\mathbb R}^3$ because there is not a pivot position in every row.
b) From the reduced row echelon form, we see that the homogeneous equation leads to the equations

    $$ \begin{alignedat}{5} x_1 & & & & & {}+{} & 2x_4 & {}={} & 0 \\ & & x_2 & {}-{} & 2x_3 & {}+{} & x_4 & {}={} & 0\text{,} \\ \end{alignedat} $$

    which leads to the parametric description

    $$ {\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \\ x_4 \end{array}\right] = \left[\begin{array}{r}-2x_4 \\ 2x_3-x_4 \\ x_3 \\ x_4 \end{array}\right] = x_3\left[\begin{array}{r}0 \\ 2 \\ 1 \\ 0 \end{array}\right] + x_4\left[\begin{array}{r}2 \\ -1 \\ 0 \\ 1 \end{array}\right]\text{.} $$

c) We see that every vector in the solution space is a linear combination of the vectors ${\mathbf w}_1=\left[\begin{array}{r}0 \\ 2 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf w}_2 = \left[\begin{array}{r}2 \\ -1 \\ 0 \\ 1 \end{array}\right]$.
d) This pair of vectors is linearly independent because one is not a scalar multiple of the other.
e) From the reduced row echelon form of $A$, we see that ${\mathbf v}_3 = -2{\mathbf v}_2$ and ${\mathbf v}_4=2{\mathbf v}_1+{\mathbf v}_2$.
f) We see that ${\mathbf v}_1$ and ${\mathbf v}_2$ are linearly independent from the reduced row echelon form of $A$. Moreover, we know that ${\mathbf v}_3$ and ${\mathbf v}_4$ can be written as linear combinations of ${\mathbf v}_1$ and ${\mathbf v}_2$. Therefore, any linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$ can be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ alone.
:::

## 3.5.2 Subspaces

Our goal is to develop a common framework for describing subsets like the span of the columns of a matrix and the solution space to a homogeneous equation. That leads us to the following definition.

:::definition {def:definition-3-5-1} Definition 3.5.1
{index-entry:subspace} A *subspace*{index:subspace} of ${\mathbb R}^p$ is a subset of ${\mathbb R}^p$ that is the span of a set of vectors.
:::

Since we have explored the concept of span in some detail, this definition just gives us a new word to describe something familiar. Let's look at some examples.

:::example {ex:example-3-5-2} Example 3.5.2 (Subspaces of ${\mathbb R}^3$)
In [Activity 2.3.3](ref:2.3#activity-span-r3) and the following discussion, we looked at subspaces in ${\mathbb R}^3$ without explicitly using that language. Let's recall some of those examples.

- 
    Suppose we have a single nonzero vector ${\mathbf v}$. The span of ${\mathbf v}$ is a subspace, which we'll write as $S = \text{Span}\left\{{\mathbf v}\right\}$. As we have seen, the span of a single vector consists of all scalar multiples of that vector, and these form a line passing through the origin.

    > IMAGE {img:3d-line} src=../../media/ch03/3d-line.svg
    > alt: A line formed by all scalar multiples of a three dimensional vector.

- 
    If instead we have two linearly independent vectors ${\mathbf v}_1$ and ${\mathbf v}_2$, the subspace $S=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$ is a plane passing through the origin.

    > IMAGE {img:3d-plane-nonstd} src=../../media/ch03/3d-plane-nonstd.svg
    > alt: A three dimensional diagram with two vectors and the plane formed by all their linear combinations.

- 
    Consider the three vectors ${\mathbf e}_1$, ${\mathbf e}_2$, and ${\mathbf e}_3$. Since we know that every 3-dimensional vector can be written as a linear combination, we have $S = \text{Span}\left\{{\mathbf e}_1, {\mathbf e}_2, {\mathbf e}_3\right\} = {\mathbb R}^3$.

- 
    One more subspace worth mentioning is $S=\text{Span}\left\{{\mathbf 0}\right\}$. Since any linear combination of the zero vector is itself the zero vector, this subspace consists of a single vector, ${\mathbf 0}$.

In fact, any subspace of ${\mathbb R}^3$ is one of these types: the origin, a line, a plane, or all of ${\mathbb R}^3$.
:::

:::activity {act:activity-3-5-2} Activity 3.5.2
We will look at some sets of vectors and the subspaces they form.

a) 
    If ${\mathbf v}_1, {\mathbf v}_2,\ldots,{\mathbf v}_n$ is a set of vectors in ${\mathbb R}^m$, explain why ${\mathbf 0}$ can be expressed as a linear combination of these vectors. Use this fact to explain why the zero vector ${\mathbf 0}$ belongs to any subspace in ${\mathbb R}^m$.

b) 
    Explain why the line on the left of [Figure 3.5.3](ref:figure-lines-r2) is not a subspace of ${\mathbb R}^2$ and why the line on the right is.

    > FIGURE {fig:figure-lines-r2} number=3.5.3 src=../../media/ch03/subspace-line-skew.svg
    > alt: A line in two dimensions that does not pass through the origin.
    > caption: Two lines in ${\mathbb R}^2$, one of which is a subspace and one of which is not.
    > subfigure src=../../media/ch03/subspace-line-skew.svg alt: A line in two dimensions that does not pass through the origin.
    > subfigure src=../../media/ch03/subspace-line-origin.svg alt: A line in two dimensions that does passes through the origin.

c) 
    Consider the vectors

    $$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \\ 1 \end{array}\right],~~~ {\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \\ 1 \end{array}\right],~~~ {\mathbf v}_3=\left[\begin{array}{r}1 \\ 1 \\ 0 \end{array}\right], $$

    and describe the subspace $S=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ of ${\mathbb R}^3$.

    :::sage
    ```sage

    ```
    :::

d) 
    Consider the vectors

    $$ {\mathbf w}_1=\left[\begin{array}{r}2 \\ 1 \\ 0 \end{array}\right],~~~ {\mathbf w}_2=\left[\begin{array}{r}-1 \\ 1 \\ -1 \end{array}\right],~~~ {\mathbf w}_3=\left[\begin{array}{r}0 \\ 3 \\ -2 \end{array}\right] $$

    1. 
        Write ${\mathbf w}_3$ as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$.

    2. 
        Explain why $\text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\} = \text{Span}\left\{{\mathbf w}_1, {\mathbf w}_2\right\}$.

    3. 
        Describe the subspace $S = \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\}$ of ${\mathbb R}^3$.

e) 
    Suppose that ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$ are four vectors in ${\mathbb R}^3$ and that

    $$ \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 & {\mathbf v}_4 \end{bmatrix} \sim \begin{bmatrix} 1 & 2 & 0 & -2 \\ 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 \\ \end{bmatrix}. $$

    Give a description of the subspace $S=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\}$ of ${\mathbb R}^3$.

SOLUTION:

a) 
    If we choose all the weights $c_1=c_2=\ldots=c_n = 0$, then the linear combination

    $$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \cdots + c_n{\mathbf v}_n = {\mathbf 0}. $$

    This means that ${\mathbf 0}$ is the subspace $S=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\right\}$.

b) 
    The line on the left cannot be a subspace of ${\mathbb R}^2$ since it does not contain the zero vector. The line on the right is a subspace because it can be represented as the span of any nonzero vector on the line.

c) 
    The matrix whose columns are the given vectors has a pivot in every row. Therefore, the span of these vectors is ${\mathbb R}^3$ and so $S=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = {\mathbb R}^3$.

d) 

    1. 
        We see that ${\mathbf w}_3 = {\mathbf w}_1 + 2{\mathbf w}_2$.

    2. 
        Any linear combination

        $$ c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_2{\mathbf w}_3 = (c_1 + c_2){\mathbf w}_1 + (c_2+2c_2){\mathbf w}_2. $$

    3. 
        The subspace $S=\text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\} = \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2\right\}$ is a plane in ${\mathbb R}^3$.

e) 
    Since we can write ${\mathbf v}_2 = 2{\mathbf v}_1$ and ${\mathbf v}_4 = -2{\mathbf v}_1 + {\mathbf v}_2$, then

    $$ S = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_3\right\}, $$

    which is a plane in ${\mathbb R}^3$.

:::

As the activity shows, it is possible to represent some subspaces as the span of more than one set of vectors. We are particularly interested in representing a subspace as the span of a linearly independent set of vectors.

:::definition {def:definition-3-5-4} Definition 3.5.4
{index-entry:dimension} A *basis* for a subspace $S$ of ${\mathbb R}^p$ is a set of vectors in $S$ that are linearly independent and whose span is $S$. We say that the *dimension* of the subspace $S$, denoted $\dim S$, is the number of vectors in any basis.
:::

:::example {ex:example-3-5-5} Example 3.5.5 (A subspace of ${\mathbb R}^4$)
Suppose we have the 4-dimensional vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ that define the subspace $S = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$ of ${\mathbb R}^4$. Suppose also that

$$ \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{bmatrix} \sim \begin{bmatrix} 1 & -1 & 0 \\ 0 & 0 & 1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix}. $$

From the reduced row echelon form of the matrix, we see that ${\mathbf v}_2 = -{\mathbf v}_1$. Therefore, any linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ can be rewritten

$$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + c_3 {\mathbf v}_3 = (c_1-c_2){\mathbf v}_1 + c_2{\mathbf v}_3 $$

as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_3$. This tells us that

$$ S = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_3\right\}. $$

Furthermore, the reduced row echelon form of the matrix shows that ${\mathbf v}_1$ and ${\mathbf v}_3$ are linearly independent. Therefore, $\{{\mathbf v}_1,{\mathbf v}_3\}$ is a basis for $S$, which means that $S$ is a two-dimensional subspace of ${\mathbb R}^4$.
:::

Subspaces of ${\mathbb R}^3$ are either

- 
    0-dimensional, consisting of the single vector ${\mathbf 0}$,

- 
    a 1-dimensional line,

- 
    a 2-dimensional plane, or

- 
    the 3-dimensional subspace ${\mathbb R}^3$.

There is no 4-dimensional subspace of ${\mathbb R}^3$ because there is no linearly independent set of four vectors in ${\mathbb R}^3$.

There are two important subspaces associated to any matrix, each of which springs from one of our [two fundamental questions,](ref:1.4#fundamental-questions) as we will now see.

## 3.5.3 The column space of $A$

The first subspace associated to a matrix that we'll consider is its column space.

:::definition {def:definition-3-5-6} Definition 3.5.6
{index-entry:column space} If $A$ is an $m\times n$ matrix, we call the span of its columns the *column space* of $A$ and denote it as $\text{Col}(A)$.
:::

Notice that the columns of $A$ are vectors in ${\mathbb R}^m$, which means that any linear combination of the columns is also in ${\mathbb R}^m$. Since the column space is described as the span of a set of vectors, we see that $\text{Col}(A)$ is a subspace of ${\mathbb R}^m$.

:::activity {act:activity-3-5-3} Activity 3.5.3
We will explore some column spaces in this activity.

a) 
    Consider the matrix

    $$ A= \left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right] = \left[\begin{array}{rrr} 1 & 3 & -1 \\ -2 & 0 & -4 \\ 1 & 2 & 0 \\ \end{array}\right]. $$

    Since $\text{Col}(A)$ is the span of the columns, we have

    $$ \text{Col}(A) = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}. $$

    Explain why ${\mathbf v}_3$ can be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ and why $\text{Col}(A)=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.

b) 
    Explain why the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ form a basis for $\text{Col}(A)$ and why $\text{Col}(A)$ is a 2-dimensional subspace of ${\mathbb R}^3$ and therefore a plane.

c) 
    Now consider the matrix $B$ and its reduced row echelon form:

    $$ B = \left[\begin{array}{rrrr} -2 & -4 & 0 & 6 \\ 1 & 2 & 0 & -3 \\ \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 2 & 0 & -3 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]. $$

    Explain why $\text{Col}(B)$ is a 1-dimensional subspace of ${\mathbb R}^2$ and is therefore a line.

d) 
    For a general matrix $A$, what is the relationship between the dimension $\dim~\text{Col}(A)$ and the number of pivot positions in $A$?

e) 
    How does the location of the pivot positions indicate a basis for $\text{Col}(A)$?

f) 
    If $A$ is an invertible $9\times9$ matrix, what can you say about the column space $\text{Col}(A)$?

g) 
    Suppose that $A$ is an $8\times 10$ matrix and that $\text{Col}(A) = {\mathbb R}^8$. If ${\mathbf b}$ is an 8-dimensional vector, what can you say about the equation $A{\mathbf x} = {\mathbf b}$?

SOLUTION:

a) 
    We have

    $$ A=\left[\begin{array}{rrr} 1 & 3 & -1 \\ -2 & 0 & -4 \\ 1 & 2 & 0 \\ \end{array}\right]\sim \left[\begin{array}{rrr} 1 & 0 & 2 \\ 0 & 1 & -1 \\ 0 & 0 & 0 \\ \end{array}\right]\text{,} $$

    which shows that the vectors are not linearly independent and, in fact, that ${\mathbf v}_3 = 2{\mathbf v}_1 - {\mathbf v}_2$. As we've seen several times, this means that any linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ can be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ alone and hence that

    $$ \text{Col}(A)=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}. $$

b) 
    The reduced row echelon form of $A$ shows that ${\mathbf v}_1$ and ${\mathbf v}_2$ are linearly independent. We also know that the span of these two vectors is $\text{Col}(A)$. Therefore, they form a basis for $\text{Col}(A)$.

c) 
    Denoting the columns of $B$ as ${\mathbf v}_i$, the reduced row echelon form shows that ${\mathbf v}_2=2{\mathbf v}_1$, ${\mathbf v}_3=0{\mathbf v}_1$, and ${\mathbf v}_4 = -3{\mathbf v}_1$. Therefore, any linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$ can be written as a linear combination of ${\mathbf v}_1$ alone. This means that ${\mathbf v}_1$ forms a basis for $\text{Col}(A)$, which is then the line consisting of all scalar multiples of ${\mathbf v}_1$. p

d) 
    The number of vectors in a basis of $\text{Col}(A)$ equals the number of pivot positions. Therefore, $\dim~\text{Col}(A)$ equals the number of pivot positions in $A$.

e) 
    As the examples in this activity illustrate, the columns of $A$ that contain pivot positions form a basis for $\text{Col}(A)$.

f) 
    If $A$ is invertible, then it has a pivot position in every row, which means that the span of the columns is ${\mathbb R}^9$. Therefore, $\text{Col}(A) = {\mathbb R}^9$.

g) 
    Since $\text{Col}(A)={\mathbb R}^8$, we know that every 8-dimensional vector ${\mathbf b}$ is in $\text{Col}(A)$. This means that ${\mathbf b}$ is in the span of the columns of $A$ so the equation $A{\mathbf x} = {\mathbf b}$ must be consistent.

:::

:::example {ex:example-col-basis} Example 3.5.7
Consider the matrix $A$ and its reduced row echelon form:

$$ A = \left[\begin{array}{rrrrr} 2 & 0 & -4 & -6 & 0 \\ -4 & -1 & 7 & 11 & 2 \\ 0 & -1 & -1 & -1 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & -2 & -3 & 0 \\ 0 & 1 & 1 & 1 & -2 \\ 0 & 0 & 0 & 0 & 0 \\ \end{array}\right], $$

and denote the columns of $A$ as ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_5$.
It is certainly true that $\text{Col}(A) = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_5\right\}$ by the definition of the column space. However, the reduced row echelon form of the matrix shows us that the vectors are not linearly independent so ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_5$ do not form a basis for $\text{Col}(A)$.
From the reduced row echelon form, however, we can see that

$$ \begin{aligned} {\mathbf v}_3 & {}={} -2{\mathbf v}_1 + {\mathbf v}_2 \\ {\mathbf v}_4 & {}={} -3{\mathbf v}_1 + {\mathbf v}_2 \\ {\mathbf v}_5 & {}={} -2{\mathbf v}_2 \\ \end{aligned} $$

. This means that any linear combination of ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_5$ can be written as a linear combination of just ${\mathbf v}_1$ and ${\mathbf v}_2$. Therefore, we see that $\text{Col}(A) = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$.
Moreover, the reduced row echelon form shows that ${\mathbf v}_1$ and ${\mathbf v}_2$ are linearly independent, which implies that they form a basis for $\text{Col}(A)$. This means that $\text{Col}(A)$ is a 2-dimensional subspace of ${\mathbb R}^3$, which is a plane in ${\mathbb R}^3$, having basis

$$ \left[\begin{array}{r}2 \\ -4 \\ 0 \end{array}\right], \qquad \left[\begin{array}{r}0 \\ -1 \\ 1 \end{array}\right] $$

.
:::

In general, a column without a pivot position can be written as a linear combination of the columns that have pivot positions. This means that a basis for $\text{Col}(A)$ will always be given by the columns of $A$ having pivot positions. This leads us to the following definition and proposition.

:::definition {def:definition-3-5-8} Definition 3.5.8
{index-entry:rank} {index-entry:matrix, rank} The *rank*{index:rank} of a matrix $A$ is the number of pivot positions in $A$ and is denoted by $\operatorname{rank}(A)$.
:::

:::proposition {prop:proposition-col-dim} Proposition 3.5.9
If $A$ is an $m\times n$ matrix, then $\text{Col}(A)$ is a subspace of ${\mathbb R}^m$ whose dimension equals $\operatorname{rank}(A)$. The columns of $A$ that contain pivot positions form a basis for $\text{Col}(A)$.
:::

For example, the rank of the matrix $A$ in [Example 3.5.7](ref:example-col-basis) is two because there are two pivot positions. A basis for $\text{Col}(A)$ is given by the first two columns of $A$ since those columns have pivot positions.

As a note of caution, we determine the pivot positions by looking at the reduced row echelon form of $A$. However, we form a basis of $\text{Col}(A)$ from the columns of $A$ rather than the columns of the reduced row echelon matrix.

## 3.5.4 The null space of $A$

The second subspace associated to a matrix is its null space.

:::definition {def:definition-3-5-10} Definition 3.5.10
{index-entry:null space} If $A$ is an $m\times n$ matrix, we call the subset of vectors ${\mathbf x}$ in ${\mathbb R}^n$ satisfying $A{\mathbf x} = {\mathbf 0}$ the *null space* of $A$ and denote it by $\text{Nul}(A)$.
:::

Remember that a subspace is a subset that can be represented as the span of a set of vectors. The column space of $A$, which is simply the span of the columns of $A$, fits this definition. It may not be immediately clear how the null space of $A$, which is the solution space of the equation $A{\mathbf x} = {\mathbf 0}$, does, but we will see that $\text{Nul}(A)$ is a subspace of ${\mathbb R}^n$.

:::activity {act:activity-3-5-4} Activity 3.5.4
We will explore some null spaces in this activity and see why $\text{Nul}(A)$ satisfies the definition of a subspace.

a) 
    Consider the matrix

    $$ A=\begin{bmatrix} 1 & 3 & -1 & 2 \\ -2 & 0 & -4 & 2 \\ 1 & 2 & 0 & 1 \end{bmatrix} $$

    and give a parametric description of the solution space to the equation $A{\mathbf x} = {\mathbf 0}$. In other words, give a parametric description of $\text{Nul}(A)$.

    :::sage
    ```sage

    ```
    :::

b) 
    This parametric description shows that the vectors satisfying the equation $A{\mathbf x}={\mathbf 0}$ can be written as a linear combination of a set of vectors. In other words, this description shows why $\text{Nul}(A)$ is the span of a set of vectors and is therefore a subspace. Identify a set of vectors whose span is $\text{Nul}(A)$.

c) 
    Use this set of vectors to find a basis for $\text{Nul}(A)$ and state the dimension of $\text{Nul}(A)$.

d) 
    The null space $\text{Nul}(A)$ is a subspace of ${\mathbb R}^p$ for which value of $p$?

e) 
    Now consider the matrix $B$ whose reduced row echelon form is given by

    $$ B \sim \left[\begin{array}{rrrr} 1 & 2 & 0 & -3 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]. $$

    Give a parametric description of $\text{Nul}(B)$.

f) 
    The parametric description gives a set of vectors that span $\text{Nul}(B)$. Explain why this set of vectors is linearly independent and hence forms a basis. What is the dimension of $\text{Nul}(B)$?

g) 
    For a general matrix $A$, how does the number of pivot positions indicate the dimension of $\text{Nul}(A)$?

h) 
    Suppose that the columns of a matrix $A$ are linearly independent. What can you say about $\text{Nul}(A)$?

SOLUTION:

a) 
    We have

    $$ A=\begin{bmatrix} 1 & 3 & -1 & 2 \\ -2 & 0 & -4 & 2 \\ 1 & 2 & 0 & 1 \\ \end{bmatrix}\sim \begin{bmatrix} 1 & 0 & 2 & -1 \\ 0 & 1 & -1 & 1 \\ 0 & 0 & 0 & 0\\ \end{bmatrix}, $$

    which leads to the parametric description of the solution space to the homogeneous equation:

    $$ {\mathbf x}=x_3\left[\begin{array}{r}-2 \\ 1 \\ 1 \\ 0 \end{array}\right] + x_4\left[\begin{array}{r}1 \\ -1 \\ 0 \\ 1 \end{array}\right]. $$

b) 
    The parametric description shows that every solution to the equation $A{\mathbf x}={\mathbf 0}$ is a linear combination of ${\mathbf w}_1=\left[\begin{array}{r}-2 \\ 1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}1 \\ -1 \\ 0 \\ 1 \end{array}\right]$.

c) 
    The vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ are linearly independent so they form a basis for $\text{Nul}(A)$. Therefore, $\text{Nul}(A)$ is 2-dimensional.

d) 
    The vectors in $\text{Nul}(A)$ are 4-dimensional so $\text{Nul}(A)$ is a subspace of ${\mathbb R}^4$.

e) 
    A parametric description of the null space is ${\mathbf x}=x_2\left[\begin{array}{r}-2 \\ 1 \\ 0 \\ 0 \end{array}\right] + x_3\left[\begin{array}{r}0 \\ 0 \\ 1 \\ 0 \end{array}\right] + x_4\left[\begin{array}{r}3 \\ 0 \\ -2 \\ 1 \end{array}\right]$. We can check that the vectors

    $$ \left[\begin{array}{r}-2 \\ 1 \\ 0 \\ 0 \end{array}\right],~~~\left[\begin{array}{r}0 \\ 0 \\ 1 \\ 0 \end{array}\right],~~~\left[\begin{array}{r}3 \\ 0 \\ -2 \\ 1 \end{array}\right] $$

    are linearly independent so they form a basis for $\text{Nul}(A)$. This means that $\text{Nul}(A)$ is 3-dimensional.

f) 
    The number of vectors in a basis of the null space equals the number of free variables that appear in the equation $A{\mathbf x}={\mathbf 0}$, which is the number of columns that do not have pivot positions. This says that $\dim~\text{Nul}(A)$ equals the number of columns of $A$ minus the number of pivot positions.

g) 
    If the columns are linearly independent, then the homogeneous equation $A{\mathbf x}={\mathbf 0}$ has only the zero solution ${\mathbf x}={\mathbf 0}$. Therefore, $\text{Nul}(A) = \{{\mathbf 0}\}$.

:::

:::example {ex:example-null-intro} Example 3.5.11
Consider the matrix $A$ along with its reduced row echelon form:

$$ A = \left[\begin{array}{rrrrr} 2 & 0 & -4 & -6 & 0 \\ -4 & -1 & 7 & 11 & 2 \\ 0 & -1 & -1 & -1 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & -2 & -3 & 0 \\ 0 & 1 & 1 & 1 & -2 \\ 0 & 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

To find a parametric description of the solution space to $A{\mathbf x}={\mathbf 0}$, imagine that we augment both $A$ and its reduced row echelon form by a column of zeroes, which leads to the equations

$$ \begin{alignedat}{6} x_1 & & & {}-{} & 2x_3 & {}-{} & 3x_4 & & & {}={} & 0 \\ & & x_2 & {}+{} & x_3 & {}+{} & x_4 & {}-{} & 2x_5 & {}={} & 0. \\ \end{alignedat} $$

Notice that $x_3$, $x_4$, and $x_5$ are free variables so we rewrite these equations as

$$ \begin{aligned} x_1 & {}={} 2x_3 + 3x_4 \\ x_2 & {}={} -x_3 - x_4 + 2x_5. \\ \end{aligned} $$

In vector form, we have

$$ \begin{aligned} {\mathbf x} & {}={} \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \\ x_4 \\ x_5 \\ \end{array}\right] = \left[\begin{array}{r}2x_3 + 3x_4 \\ -x_3-x_4+2x_5 \\ x_3 \\ x_4 \\ x_5 \\ \end{array}\right] \\ \\ & {}={} x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \\ 0 \\ 0 \\ \end{array}\right] +x_4\left[\begin{array}{r}3 \\ -1 \\ 0 \\ 1 \\ 0 \\ \end{array}\right] +x_5\left[\begin{array}{r}0 \\ 2 \\ 0 \\ 0 \\ 1 \\ \end{array}\right]. \end{aligned} $$

This expression says that any vector ${\mathbf x}$ satisfying $A{\mathbf x}= {\mathbf 0}$ is a linear combination of the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ -1 \\ 1 \\ 0 \\ 0 \\ \end{array}\right],~~~ {\mathbf v}_2 = \left[\begin{array}{r}3 \\ -1 \\ 0 \\ 1 \\ 0 \\ \end{array}\right],~~~ {\mathbf v}_3 = \left[\begin{array}{r}0 \\ 2 \\ 0 \\ 0 \\ 1 \\ \end{array}\right]. $$

It is straightforward to check that these vectors are linearly independent, which means that ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ form a basis for $\text{Nul}(A)$, a 3-dimensional subspace of ${\mathbb R}^5$.
:::

As illustrated in this example, the dimension of $\text{Nul}(A)$ is equal to the number of free variables in the equation $A{\mathbf x}={\mathbf 0}$, which equals the number of columns of $A$ without pivot positions or the number of columns of $A$ minus the number of pivot positions.

:::proposition {prop:proposition-nul-dim} Proposition 3.5.12
If $A$ is an $m\times n$ matrix, then $\text{Nul}(A)$ is a subspace of ${\mathbb R}^n$ whose dimension is

$$ \dim~\text{Nul}(A) = n - \operatorname{rank}(A). $$

:::

Combining [Proposition 3.5.9](ref:proposition-col-dim) and [Proposition 3.5.12](ref:proposition-nul-dim) shows that

:::proposition {prop:proposition-3-5-13} Proposition 3.5.13
If $A$ is an $m\times n$ matrix, then

$$ \dim~\text{Col}(A) + \dim~\text{Nul}(A) = n. $$

:::

## 3.5.5 Summary

Once again, we find ourselves revisiting [our two fundamental questions](ref:1.4#fundamental-questions) concerning the existence and uniqueness of solutions to linear systems. The column space $\text{Col}(A)$ contains all the vectors ${\mathbf b}$ for which the equation $A{\mathbf x} = {\mathbf b}$ is consistent. The null space $\text{Nul}(A)$ is the solution space to the equation $A{\mathbf x} = {\mathbf 0}$, which reflects on the uniqueness of solutions to this and other equations.

- 
    A subspace $S$ of ${\mathbb R}^p$ is a subset of ${\mathbb R}^p$ that can be represented as the span of a set of vectors. A basis of $S$ is a linearly independent set of vectors whose span is $S$.

- 
    If $A$ is an $m\times n$ matrix, the column space $\text{Col}(A)$ is the span of the columns of $A$ and forms a subspace of ${\mathbb R}^m$.

- 
    A basis for $\text{Col}(A)$ is found from the columns of $A$ that have pivot positions. The dimension is therefore $\dim~\text{Col}(A) = \operatorname{rank}(A)$.

- 
    The null space $\text{Nul}(A)$ is the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ and is a subspace of ${\mathbb R}^n$.

- 
    A basis for $\text{Nul}(A)$ is found through a parametric description of the solution space of $A{\mathbf x} = {\mathbf 0}$, and we have that $\dim~\text{Nul}(A) = n - \operatorname{rank}(A)$.

## 3.5.6 Exercises

:::exercise {exercise-3-5-001} number=3.5.1 answered=yes src=src/exercises/exercises3-5.xml:5
PROBLEM:
Suppose that $A$ and its reduced row echelon form are

$$ A = \left[\begin{array}{rrrrrr} 0 & 2 & 0 & -4 & 0 & 6 \\ 0 & -4 & -1 & 7 & 0 & -16 \\ 0 & 6 & 0 & -12 & 3 & 15 \\ 0 & 4 & -1 & -9 & 0 & 8 \\ \end{array}\right] \sim \left[\begin{array}{rrrrrr} 0 & 1 & 0 & -2 & 0 & 3 \\ 0 & 0 & 1 & 1 & 0 & 4 \\ 0 & 0 & 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 & 0 & 0 \\ \end{array}\right] $$

.

a) 
    The null space $\text{Nul}(A)$ is a subspace of ${\mathbb R}^p$ for what $p$? The column space $\text{Col}(A)$ is a subspace of ${\mathbb R}^p$ for what $p$?

b) 
    What are the dimensions $\dim~\text{Nul}(A)$ and $\dim~\text{Col}(A)$?

c) 
    Find a basis for the column space $\text{Col}(A)$.

d) 
    Find a basis for the null space $\text{Nul}(A)$.

ANSWER:

a) 
    $\text{Nul}(A)$ is a subspace of ${\mathbb R}^6$ and $\text{Col}(A)$ is a subspace of ${\mathbb R}^4$.

b) 
    $\dim~\text{Nul}(A) = 3$ and $\dim~\text{Col}(A)=3$.

c) 
    $\left[\begin{array}{r}2 \\ -4 \\ 6 \\ 4 \end{array}\right], \left[\begin{array}{r}0 \\ -1 \\ 0 \\ -1 \end{array}\right], \left[\begin{array}{r}0 \\ 0 \\ 3 \\ 0 \end{array}\right]$

d) 
    $\left[\begin{array}{r} 1 \\ 0 \\ 0 \\ 0 \\ 0 \\ 0 \\ \end{array}\right], \left[\begin{array}{r} 0 \\ 2 \\ -1 \\ 1 \\ 0 \\ 0 \\ \end{array}\right], \left[\begin{array}{r} 0 \\ -3 \\ -4 \\ 0 \\ 1 \\ 1 \end{array}\right]$

SOLUTION:

a) 
    $\text{Nul}(A)$ is a subspace of ${\mathbb R}^6$ and $\text{Col}(A)$ is a subspace of ${\mathbb R}^4$.

b) 
    Because there are three pivot positions, we see that $\operatorname{rank}(A) = 3$. Therefore, $\dim~\text{Nul}(A) = 6-3=3$ and $\dim~\text{Col}(A)=3$.

c) 
    A basis for $\text{Col}(A)$ is given by the columns of $A$ that contain pivot positions. Therefore, a basis is

    $$ \left[\begin{array}{r}2 \\ -4 \\ 6 \\ 4 \end{array}\right], \left[\begin{array}{r}0 \\ -1 \\ 0 \\ -1 \end{array}\right], \left[\begin{array}{r}0 \\ 0 \\ 3 \\ 0 \end{array}\right]\text{.} $$

d) 
    We can write a parametric description for the solution space to the homogeneous equation as

    $$ {\mathbf x} = \left[\begin{array}{r} x_1 \\ 2x_4 - 3x_6 \\ -x_4-4x_6 \\ x_4 \\ x_6 \\ x_6 \end{array}\right] = x_1 \left[\begin{array}{r} 1 \\ 0 \\ 0 \\ 0 \\ 0 \\ 0 \\ \end{array}\right] +x_4 \left[\begin{array}{r} 0 \\ 2 \\ -1 \\ 1 \\ 0 \\ 0 \\ \end{array}\right] + x_6 \left[\begin{array}{r} 0 \\ -3 \\ -4 \\ 0 \\ 1 \\ 1 \end{array}\right]\text{.} $$

    Therefore, a basis for $\text{Nul}(A)$ is

    $$ \left[\begin{array}{r} 1 \\ 0 \\ 0 \\ 0 \\ 0 \\ 0 \\ \end{array}\right], \left[\begin{array}{r} 0 \\ 2 \\ -1 \\ 1 \\ 0 \\ 0 \\ \end{array}\right], \left[\begin{array}{r} 0 \\ -3 \\ -4 \\ 0 \\ 1 \\ 1 \end{array}\right]\text{.} $$

:::

:::exercise {exercise-3-5-002} number=3.5.2 answered=yes src=src/exercises/exercises3-5.xml:129
PROBLEM:
Suppose that

$$ A = \left[\begin{array}{rrrr} 2 & 0 & -2 & -4 \\ -2 & -1 & 1 & 2 \\ 0 & -1 & -1 & -2 \end{array}\right] $$

.

a) 
    Is the vector $\left[\begin{array}{r}0 \\ -1 \\ -1 \end{array}\right]$ in $\text{Col}(A)$?

b) 
    Is the vector $\left[\begin{array}{r}2 \\ 1 \\ 0 \\ 2 \end{array}\right]$ in $\text{Col}(A)$?

c) 
    Is the vector $\left[\begin{array}{r}2 \\ -2 \\ 0 \end{array}\right]$ in $\text{Nul}(A)$?

d) 
    Is the vector $\left[\begin{array}{r}1 \\ -1 \\ 3 \\ -1 \end{array}\right]$ in $\text{Nul}(A)$?

e) 
    Is the vector $\left[\begin{array}{r}1 \\ 0 \\ 1 \\ -1 \end{array}\right]$ in $\text{Nul}(A)$?

ANSWER:

a) 
    Yes

b) 
    No

c) 
    No

d) 
    Yes

e) 
    No

SOLUTION:

a) 
    Yes. This vector is a column of $A$ so it may be written as a linear combination of the columns of $A$.

b) 
    No. Vectors in $\text{Col}(A)$ must be three-dimensional.

c) 
    No. Vectors in $\text{Nul}(A)$ must be four-dimensional.

d) 
    Yes, because this vector, when multiplied by $A$, gives ${\mathbf 0}$.

e) 
    No, because this vector, when multiplied by $A$, does not give ${\mathbf 0}$.

:::

:::exercise {exercise-3-5-003} number=3.5.3 answered=yes src=src/exercises/exercises3-5.xml:190
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response. Unless otherwise stated, assume that $A$ is an $m\times n$ matrix.

a) 
    If $A$ is a $127\times 341$ matrix, then $\text{Nul}(A)$ is a subspace of ${\mathbb R}^{127}$.

b) 
    If $\dim~\text{Nul}(A) = 0$, then the columns of $A$ are linearly independent.

c) 
    If $\text{Col}(A) = {\mathbb R}^m$, then $A$ is invertible.

d) 
    If $A$ has a pivot position in every column, then $\text{Nul}(A) = {\mathbb R}^n$.

e) 
    If $\text{Col}(A) = {\mathbb R}^m$ and $\text{Nul}(A) = \{{\mathbf 0}\}$, then $A$ is invertible.

ANSWER:

a) 
    False

b) 
    True

c) 
    False

d) 
    False

e) 
    True

SOLUTION:

a) 
    False. $\text{Nul}(A)$ is a subspace of ${\mathbb R}^{341}$.

b) 
    True. In this case, the only solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$ is the zero solution ${\mathbf x}={\mathbf 0}$. This means that every column has a pivot position so the columns are linearly independent.

c) 
    False. The matrix $A$ is not necessarily a square matrix.

d) 
    False. If $A$ has a pivot position in every column, then $\text{Nul}(A) = \{{\mathbf 0}\}$.

e) 
    True. Since $\text{Col}(A)={\mathbb R}^m$, we know that $A$ has a pivot position in every row. Since $\text{Nul}(A)=\{{\mathbf 0}\}$, we know that $A$ has a pivot position in every column. Therefore, $A$ must be a square matrix and invertible.

:::

:::exercise {exercise-3-5-004} number=3.5.4 answered=yes src=src/exercises/exercises3-5.xml:252
PROBLEM:
Explain why the following statements are true.

a) 
    If $B$ is invertible, then $\text{Nul}(BA) = \text{Nul}(A)$.

b) 
    If $B$ is invertible, then $\text{Col}(AB) = \text{Col}(A)$.

c) 
    If $A\sim A'$, then $\text{Nul}(A) = \text{Nul}(A')$.

ANSWER:

a) 
    If $BA{\mathbf x}={\mathbf 0}$, then $A{\mathbf x}={\mathbf 0}$ if $B$ is invertible.

b) 
    The column space consists of all the vectors ${\mathbf b}$ for which $A{\mathbf x}={\mathbf b}$ is consistent. We can rewrite this condition as $AB(B^{-1}{\mathbf x})={\mathbf b}$, which means that $A{\mathbf x}={\mathbf b}$ is consistent exactly when $AB{\mathbf x}={\mathbf b}$ is.

c) 
    If $A\sim A'$, then $A$ and $A'$ have the same reduced row echelon form, which determines $\text{Nul}(A)$.

SOLUTION:

a) 
    If $BA{\mathbf x}={\mathbf 0}$, then $A{\mathbf x}={\mathbf 0}$ if $B$ is invertible.

b) 
    The column space consists of all the vectors ${\mathbf b}$ for which $A{\mathbf x}={\mathbf b}$ is consistent. We can rewrite this condition as $AB(B^{-1}{\mathbf x})={\mathbf b}$, which means that $A{\mathbf x}={\mathbf b}$ is consistent exactly when $AB{\mathbf x}={\mathbf b}$ is.

c) 
    If $A\sim A'$, then $A$ and $A'$ have the same reduced row echelon form, which determines $\text{Nul}(A)$.

:::

:::exercise {exercise-3-5-005} number=3.5.5 answered=yes src=src/exercises/exercises3-5.xml:305
PROBLEM:
For each of the following conditions, construct a $3\times 3$ matrix having the given properties.

a) 
    $\dim~\text{Nul}(A) = 0$.

b) 
    $\dim~\text{Nul}(A) = 1$.

c) 
    $\dim~\text{Nul}(A) = 2$.

d) 
    $\dim~\text{Nul}(A) = 3$.

ANSWER:

a) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 1 & 4 & -1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rrr} 0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]$.

SOLUTION:

a) 
    $\left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]$.

b) 
    $\left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{rrr} 1 & 4 & -1 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]$.

d) 
    $\left[\begin{array}{rrr} 0 & 0 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{array}\right]$.

:::

:::exercise {exercise-3-5-006} number=3.5.6 answered=yes src=src/exercises/exercises3-5.xml:401
PROBLEM:
Suppose that $A$ is a $3\times 4$ matrix.

a) 
    Is it possible that $\dim~\text{Nul}(A) = 0$?

b) 
    If $\dim~\text{Nul}(A) = 1$, what can you say about $\text{Col}(A)$?

c) 
    If $\dim~\text{Nul}(A) = 2$, what can you say about $\text{Col}(A)$?

d) 
    If $\dim~\text{Nul}(A) = 3$, what can you say about $\text{Col}(A)$?

e) 
    If $\dim~\text{Nul}(A) = 4$, what can you say about $\text{Col}(A)$?

ANSWER:

a) 
    No

b) 
    $\text{Col}(A) = {\mathbb R}^3$

c) 
    $\text{Col}(A)$ is a plane in ${\mathbb R}^3$

d) 
    $\text{Col}(A)$ is a line in ${\mathbb R}^3$

e) 
    $\text{Col}(A)=\{{\mathbf 0}\}$.

SOLUTION:

a) 
    No. There are more columns than rows so there must be at least one column without a pivot position.

b) 
    Remember that we have $\dim~\text{Col}(A) + \dim~\text{Nul}(A) = 4$. Therefore, we have $\dim~\text{Col}(A) = 3$ in this case, which implies that $\text{Col}(A) = {\mathbb R}^3$.

c) 
    Here, $\dim~\text{Col}(A) = 2$ so $\text{Col}(A)$ is a plane in ${\mathbb R}^3$.

d) 
    Here, $\dim~\text{Col}(A) = 1$ so $\text{Col}(A)$ is a line in ${\mathbb R}^3$.

e) 
    Here, $\dim~\text{Col}(A) = 0$ so $\text{Col}(A)=\{{\mathbf 0}\}$.

:::

:::exercise {exercise-3-5-007} number=3.5.7 answered=yes src=src/exercises/exercises3-5.xml:453
PROBLEM:
Suppose we have the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ 3 \\ -1 \end{array}\right],~ {\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 2 \\ 4 \end{array}\right],~ {\mathbf w}_1 = \left[\begin{array}{r}3 \\ -1 \\ 1 \\ 0 \end{array}\right],~ {\mathbf w}_2 = \left[\begin{array}{r}-2 \\ 4 \\ 0 \\ 1 \end{array}\right] $$

and that $A$ is a matrix such that $\text{Col}(A)=\text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$ and $\text{Nul}(A) = \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2\right\}$.

a) 
    What are the dimensions of $A$?

b) 
    Find such a matrix $A$.

ANSWER:

a) 
    $3\times4$

b) 
    $A = \left[\begin{array}{rrrr} 2 & -1 & -7 & 8 \\ 3 & 2 & -7 & -2 \\ -1 & 4 & 7 & -18 \\ \end{array}\right]$

SOLUTION:

a) 
    Since ${\mathbf v}_1$ and ${\mathbf v}_2$ are three-dimensional vectors, $A$ must have three rows. Since ${\mathbf w}_1$ and ${\mathbf w}_2$ are 4-dimensional, $A$ must have four columns. Alternatively, we know that $\dim~\text{Nul}(A) = 2$ and $\dim~\text{Col}(A) = 2$. Therefore, the number of columns is $n=\dim~\text{Nul}(A) + \dim~\text{Col}(A) = 4$. Hence, $A$ is a $3\times4$ matrix.

b) 
    We can use ${\mathbf v}_1$ and ${\mathbf v}_2$ as the first two columns of $A$. We also know that $A{\mathbf w}_1={\mathbf 0}$ and $A{\mathbf w}_2={\mathbf 0}$. If we call the other two columns ${\mathbf v}_3$ and ${\mathbf v}_4$, then $A{\mathbf w}_1={\mathbf 0}$ implies that $3{\mathbf v}_1-{\mathbf v}_2+{\mathbf v}_3 = {\mathbf 0}$ so that ${\mathbf v}_3 = \left[\begin{array}{r}-7 \\ -7 \\ 7 \end{array}\right]$. Since $A{\mathbf w}_2 = {\mathbf 0}$, we have $-2{\mathbf v}_1+4{\mathbf v}_2 + {\mathbf v}_4={\mathbf 0}$, which says that ${\mathbf v}_4=\left[\begin{array}{r}8 \\ -2 \\ -18 \end{array}\right]$. This gives

    $$ A = \left[\begin{array}{rrrr} 2 & -1 & -7 & 8 \\ 3 & 2 & -7 & -2 \\ -1 & 4 & 7 & -18 \\ \end{array}\right]\text{.} $$

:::

:::exercise {exercise-3-5-008} number=3.5.8 answered=yes src=src/exercises/exercises3-5.xml:523
PROBLEM:
Suppose that $A$ is an $8\times 8$ matrix and that $\det A = 14$.

a) 
    What can you conclude about $\text{Nul}(A)$?

b) 
    What can you conclude about $\text{Col}(A)$?

ANSWER:
$\text{Nul}(A)=\{{\mathbf 0}\}$ and $\text{Col}(A) = {\mathbb R}^8$.
SOLUTION:
We know that $A$ is invertible so $\text{Nul}(A)=\{{\mathbf 0}\}$ and $\text{Col}(A) = {\mathbb R}^8$.
:::

:::exercise {exercise-3-5-009} number=3.5.9 answered=yes src=src/exercises/exercises3-5.xml:549
PROBLEM:
Suppose that $A$ is a matrix and there is an invertible matrix $P$ such that

$$ A = P~\left[\begin{array}{rrr} 2 & 0 & 0 \\ 0 & -3 & 0 \\ 0 & 0 & 1 \\ \end{array}\right]~P^{-1} $$

.

a) 
    What can you conclude about $\text{Nul}(A)$?

b) 
    What can you conclude about $\text{Col}(A)$?

ANSWER:
$\text{Nul}(A)=\{{\mathbf 0}\}$ and $\text{Col}(A)={\mathbb R}^3$.
SOLUTION:
We know that $\det A = -6$ so $A$ is invertible. Therefore, $\text{Nul}(A)=\{{\mathbf 0}\}$ and $\text{Col}(A)={\mathbb R}^3$.
:::

:::exercise {exercise-3-5-010} number=3.5.10 answered=yes src=src/exercises/exercises3-5.xml:582
PROBLEM:
In this section, we saw that the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$ is a subspace of ${\mathbb R}^p$ for some $p$. In this exercise, we will investigate whether the solution space to another equation $A{\mathbf x} = {\mathbf b}$ can form a subspace.
Let's consider the matrix

$$ A = \left[\begin{array}{rr} 2 & -4 \\ -1 & 2 \\ \end{array}\right] $$

.

a) 
    Find a parametric description of the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$.

b) 
    Graph the solution space to the homogeneous equation to the right.

    > IMAGE {img:empty-4} src=../../media/ch03/empty-4.svg
    > alt: A two dimensional coordinate grid and axes.

c) 
    Find a parametric description of the solution space to the equation $A{\mathbf x} = \left[\begin{array}{r}4 \\ -2 \end{array}\right]$ and graph it above.

d) 
    Is the solution space to the equation $A{\mathbf x} = \left[\begin{array}{r}4 \\ -2 \end{array}\right]$ a subspace of ${\mathbb R}^2$?

e) 
    Find a parametric description of the solution space to the equation $A{\mathbf x}=\left[\begin{array}{r}-8 \\ 4 \end{array}\right]$ and graph it above.

f) 
    What can you say about all the solution spaces to equations of the form $A{\mathbf x} = {\mathbf b}$ when ${\mathbf b}$ is a vector in $\text{Col}(A)$?

g) 
    Suppose that the solution space to the equation $A{\mathbf x} = {\mathbf b}$ forms a subspace. Explain why it must be true that ${\mathbf b} = {\mathbf 0}$.

ANSWER:

a) 
    ${\mathbf x}=x_2\left[\begin{array}{r}2 \\ 1 \end{array}\right]$

b) 
    The solution space forms a line through the origin.

c) 
    ${\mathbf x}=\left[\begin{array}{r}2 \\ 0 \end{array}\right]+x_2\left[\begin{array}{r}2 \\ 1 \end{array}\right]$

d) 
    No

e) 
    ${\mathbf x}=\left[\begin{array}{r}-4 \\ 0 \end{array}\right]+x_2\left[\begin{array}{r}2 \\ 1 \end{array}\right]$. The graph of the solution spaces is shown below.

    > IMAGE {img:ex-3-5} src=../../media/ch03/ex-3-5.svg
    > width: 50%

f) 
    They are all parallel to the solution space to the homogeneous equation.

g) 
    ${\mathbf x}={\mathbf 0}$ must be in the solution space.

SOLUTION:

a) 
    We have

    $$ A = \left[\begin{array}{rr} 2 & -4 \\ -1 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rr} 1 & -2 \\ 0 & 0 \\ \end{array}\right]\text{,} $$

    which shows that ${\mathbf x}=x_2\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ describes the solution space to the homogeneous equation.

b) 
    The solution space forms a line through the origin.

c) 
    The solution space has the parametric description ${\mathbf x}=\left[\begin{array}{r}2 \\ 0 \end{array}\right]+x_2\left[\begin{array}{r}2 \\ 1 \end{array}\right]$, which is a line parallel to the solution space to the homogeneous equation.

d) 
    This cannot form a subspace since it does not contain the vector ${\mathbf 0}$.

e) 
    The solution space has the parametric description ${\mathbf x}=\left[\begin{array}{r}-4 \\ 0 \end{array}\right]+x_2\left[\begin{array}{r}2 \\ 1 \end{array}\right]$, which is a line parallel to the solution space to the homogeneous equation. The graph of the solution spaces is shown below.

    > IMAGE {img:ex-3-5} src=../../media/ch03/ex-3-5.svg
    > width: 50%

f) 
    They are all parallel to the solution space to the homogeneous equation.

g) 
    If the solution space is a subspace, then ${\mathbf x}={\mathbf 0}$ must be in the solution space. This means that $A{\mathbf x} = A{\mathbf 0} = {\mathbf 0} = {\mathbf b}$.

:::
