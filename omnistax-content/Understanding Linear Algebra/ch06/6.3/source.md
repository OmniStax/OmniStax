# 6.3 Orthogonal bases and projections {sec-orthogonal-bases}

We know that a linear system $A{\mathbf x}={\mathbf b}$ is inconsistent when ${\mathbf b}$ is not in $\text{Col}(A)$, the column space of $A$. Later in this chapter, we'll develop a strategy for dealing with inconsistent systems by finding $\widehat{{\mathbf b}}$, the vector in $\text{Col}(A)$ that minimizes the distance to ${\mathbf b}$. The equation $A{\mathbf x}=\widehat{{\mathbf b}}$ is therefore consistent and its solution set can provide us with useful information about the original system $A{\mathbf x}={\mathbf b}$.
In this section and the next, we'll develop some techniques that enable us to find $\widehat{{\mathbf b}}$, the vector in a given subspace $W$ that is closest to a given vector ${\mathbf b}$.

## 6.3.1 Introduction

:::exploration {act:preview-orthogonal-basis} Preview Activity 6.3.1
For this activity, it will be helpful to recall the distributive property of dot products:

$$ {\mathbf v}\cdot(c_1{\mathbf w}_1+c_2{\mathbf w}_2) = c_1{\mathbf v}\cdot{\mathbf w}_1 + c_2{\mathbf v}\cdot{\mathbf w}_2\text{.} $$

We'll work with the basis of ${\mathbb R}^2$ formed by the vectors

$$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}-2 \\ 1 \end{array}\right] $$

.
PROBLEM:
a) Verify that the vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ are orthogonal.
b) Suppose that ${\mathbf b} =\left[\begin{array}{r}7 \\ 4 \end{array}\right]$ and find the dot products ${\mathbf w}_1\cdot{\mathbf b}$ and ${\mathbf w}_2\cdot{\mathbf b}$.
c) We would like to express ${\mathbf b}$ as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$, which means that we need to find weights $c_1$ and $c_2$ such that

    $$ {\mathbf b} = c_1{\mathbf w}_1 + c_2{\mathbf w}_2 $$

    . To find the weight $c_1$, dot both sides of this expression with ${\mathbf w}_1$:

    $$ {\mathbf b}\cdot{\mathbf w}_1 = (c_1{\mathbf w}_1 + c_2{\mathbf w}_2)\cdot{\mathbf w}_1 $$

    . and apply the distributive property.
d) In a similar fashion, find the weight $c_2$.
e) Verify that ${\mathbf b} = c_1{\mathbf w}_1+c_2{\mathbf w}_2$ using the weights you have found.
SOLUTION:
a) We can compute that ${\mathbf w}_1\cdot{\mathbf w}_2 = 0$.
b) ${\mathbf b}\cdot{\mathbf w}_1 = 15$ and ${\mathbf b}\cdot{\mathbf w}_2 = -10$.
c) $c_1 = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1} = 3$.
d) $c_2 = \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2} = -2$.
e) ${\mathbf b} = 3{\mathbf w}_1 - 2{\mathbf w}_2$.
:::

We frequently ask to write a given vector as a linear combination of given basis vectors. In the past, we have done this by solving a linear system. The preview activity illustrates how this task can be simplified when the basis vectors are orthogonal to each other. We'll explore this and other uses of orthogonal bases in this section.

## 6.3.2 Orthogonal sets

The preview activity dealt with a basis of ${\mathbb R}^2$ formed by two orthogonal vectors. More generally, we will consider a set of orthogonal vectors, as described in the next definition.

:::definition {def:definition-6-3-1} Definition 6.3.1
{index-entry:orthogonal set} By an *orthogonal set* of vectors, we mean a set of nonzero vectors each of which is orthogonal to the others.
:::

:::example {ex:example-orthogonal-basis} Example 6.3.2
The 3-dimensional vectors

$$ {\mathbf w}_1 = \left[\begin{array}{r}1 \\ -1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2 = \left[\begin{array}{r}1 \\ 1 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf w}_3 = \left[\begin{array}{r}1 \\ -1 \\ -2 \end{array}\right]. $$

form an orthogonal set, which can be verified by computing

$$ \begin{array}{rcl} {\mathbf w}_1\cdot{\mathbf w}_2 & {}={} & 0 \\ {\mathbf w}_1\cdot{\mathbf w}_3 & {}={} & 0 \\ {\mathbf w}_2\cdot{\mathbf w}_3 & {}={} & 0\text{.} \\ \end{array} $$

Notice that this set of vectors forms a basis for ${\mathbb R}^3$.
:::

:::example {ex:example-orthogonal-set} Example 6.3.3
The vectors

$$ {\mathbf w}_1 = \left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2 = \left[\begin{array}{r}1 \\ 1 \\ -1 \\ -1 \end{array}\right],\hspace{24pt} {\mathbf w}_3 = \left[\begin{array}{r}1 \\ -1 \\ 1 \\ -1 \end{array}\right] $$

form an orthogonal set of 4-dimensional vectors. Since there are only three vectors, this set does not form a basis for ${\mathbb R}^4$. It does, however, form a basis for a 3-dimensional subspace $W$ of ${\mathbb R}^4$.
:::

Suppose that a vector ${\mathbf b}$ is a linear combination of an orthogonal set of vectors ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$; that is, suppose that

$$ c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + \cdots + c_n{\mathbf w}_n = {\mathbf b}. $$

Just as in the preview activity, we can find the weight $c_1$ by dotting both sides with ${\mathbf w}_1$ and applying the distributive property of dot products:

$$ \begin{aligned} (c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + \cdots + c_n{\mathbf w}_n)\cdot{\mathbf w}_1 & = {\mathbf b}\cdot{\mathbf w}_1 \\ c_1{\mathbf w}_1\cdot{\mathbf w}_1 + c_2{\mathbf w}_2\cdot{\mathbf w}_1 +\cdots + c_n{\mathbf w}_n\cdot{\mathbf w}_1 & = {\mathbf b}\cdot{\mathbf w}_1 \\ c_1{\mathbf w}_1\cdot{\mathbf w}_1 & = {\mathbf b}\cdot{\mathbf w}_1 \\ c_1 & = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}\text{.} \end{aligned} $$

Notice how the presence of an orthogonal set causes most of the terms in the sum to vanish. In the same way, we find that

$$ c_i = \frac{{\mathbf b}\cdot{\mathbf w}_i}{{\mathbf w}_i\cdot{\mathbf w}_i} $$

so that

$$ {\mathbf b} = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 + \cdots + \frac{{\mathbf b}\cdot{\mathbf w}_n}{{\mathbf w}_n\cdot{\mathbf w}_n}{\mathbf w}_n\text{.} $$

We'll record this fact in the following proposition.

:::proposition {prop:prop-orthog-lincomb} Proposition 6.3.4
If a vector ${\mathbf b}$ is a linear combination of an orthogonal set of vectors ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$, then

$$ {\mathbf b} = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 + \cdots + \frac{{\mathbf b}\cdot{\mathbf w}_n}{{\mathbf w}_n\cdot{\mathbf w}_n}{\mathbf w}_n\text{.} $$

:::

Using this proposition, we can see that an orthogonal set of vectors must be linearly independent. Suppose, for instance, that ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$ is a set of nonzero orthogonal vectors and that one of the vectors is a linear combination of the others, say,

$$ {\mathbf w}_3 = c_1{\mathbf w}_1 + c_2{\mathbf w}_2\text{.} $$

We therefore know that

$$ {\mathbf w}_3 = \frac{{\mathbf w}_3\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 + \frac{{\mathbf w}_3\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 = {\mathbf 0}\text{,} $$

which cannot happen since we know that ${\mathbf w}_3$ is nonzero. This tells us that

:::proposition {prop:prop-orthog-lin-indep} Proposition 6.3.5
An orthogonal set of vectors ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$ is linearly independent.
:::

If the vectors in an orthogonal set have dimension $m$, they form a linearly independent set in ${\mathbb R}^m$ and are therefore a basis for the subspace $W=\text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n\right\}$. If there are $m$ vectors in the orthogonal set, they form a basis for ${\mathbb R}^m$.

:::activity {act:activity-6-3-2} Activity 6.3.2
Consider the vectors

$$ {\mathbf w}_1 = \left[\begin{array}{r}1 \\ -1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2 = \left[\begin{array}{r}1 \\ 1 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf w}_3 = \left[\begin{array}{r}1 \\ -1 \\ -2 \end{array}\right]. $$

a) 
    Verify that this set forms an orthogonal set of $3$-dimensional vectors.

    :::sage
    ```sage

    ```
    :::

b) 
    Explain why we know that this set of vectors forms a basis for ${\mathbb R}^3$.

c) 
    Suppose that ${\mathbf b}=\left[\begin{array}{r}2 \\ 4 \\ -4 \end{array}\right]$. Find the weights $c_1$, $c_2$, and $c_3$ that express ${\mathbf b}$ as a linear combination ${\mathbf b}=c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + c_3{\mathbf w}_3$ using [Proposition 6.3.4](ref:prop-orthog-lincomb).

d) 
    If we multiply a vector ${\mathbf v}$ by a positive scalar $s$, the length of ${\mathbf v}$ is also multiplied by $s$; that is, $\left|s{\mathbf v}\right| = s\left|{\mathbf v}\right|$.

    {index-entry:unit vector} Using this observation, find a vector ${\mathbf u}_1$ that is parallel to ${\mathbf w}_1$ and has length 1. Such vectors are called *unit vectors*.

    :::sage
    ```sage

    ```
    :::

e) 
    Similarly, find a unit vector ${\mathbf u}_2$ that is parallel to ${\mathbf w}_2$ and a unit vector ${\mathbf u}_3$ that is parallel to ${\mathbf w}_3$.

f) 
    Construct the matrix $Q=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 \end{bmatrix}$ and find the product $Q^TQ$. Use [Proposition 6.2.8](ref:6.2#prop-transpose-multiplication) to explain your result.

ANSWER:

a) 
    We compute the dot products ${\mathbf w}_1\cdot{\mathbf w}_2=0$, ${\mathbf w}_1\cdot{\mathbf w}_3=0$, and ${\mathbf w}_2\cdot{\mathbf w}_3=0$.

b) 
    An orthogonal set of vectors is linearly independent.

c) 
    ${\mathbf b} = -2{\mathbf w}_1 + 3{\mathbf w}_2 + {\mathbf w}_3$.

d) 
    ${\mathbf u}_1 = \frac{1}{\sqrt{3}}{\mathbf w}_1 = \left[\begin{array}{r}1/\sqrt{3} \\ -1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$

e) 
    We find that

    $$ {\mathbf u}_2 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \\ 0 \end{array}\right],\hspace{24pt} {\mathbf u}_3 = \left[\begin{array}{r}1/\sqrt{6} \\ -1/\sqrt{6} \\ -2/\sqrt{6} \end{array}\right] $$

f) 
    $Q^TQ=I$

SOLUTION:

a) 
    We compute the dot products ${\mathbf w}_1\cdot{\mathbf w}_2=0$, ${\mathbf w}_1\cdot{\mathbf w}_3=0$, and ${\mathbf w}_2\cdot{\mathbf w}_3=0$.

b) 
    We know that an orthogonal set of vectors is linearly independent. Therefore, we have a set of three linearly independent vectors in ${\mathbb R}^3$ so they must form a basis for ${\mathbb R}^3$.

c) 
    We find that ${\mathbf b} = -2{\mathbf w}_1 + 3{\mathbf w}_2 + {\mathbf w}_3$.

d) 
    Since $\left|{\mathbf w}_1\right| = \sqrt{3}$, we find

    $$ {\mathbf u}_1 = \frac{1}{\sqrt{3}}{\mathbf w}_1 = \left[\begin{array}{r}1/\sqrt{3} \\ -1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right] $$

e) 
    We find that

    $$ {\mathbf u}_2 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \\ 0 \end{array}\right],\hspace{24pt} {\mathbf u}_3 = \left[\begin{array}{r}1/\sqrt{6} \\ -1/\sqrt{6} \\ -2/\sqrt{6} \end{array}\right] $$

f) 
    We find $Q^TQ=I$ since each entry in this matrix product is the dot product of two columns of $Q$.

:::

This activity introduces an important way of modifying an orthogonal set so that the vectors in the set have unit length. Recall that we may multiply any nonzero vector ${\mathbf w}$ by a scalar so that the new vector has length 1. For instance, we know that if $s$ is a positive scalar, then $\left|s{\mathbf w}\right| = s\left|{\mathbf w}\right|$. To obtain a vector ${\mathbf u}$ having unit length, we want

$$ \left|{\mathbf u}\right| = \left|s{\mathbf w}\right| = s\left|{\mathbf w}\right| = 1 $$

so that $s=1/\left|{\mathbf w}\right|$. Therefore,

$$ {\mathbf u} = \frac{1}{\left|{\mathbf w}\right|}{\mathbf w} $$

becomes a unit vector parallel to ${\mathbf w}$.

Orthogonal sets in which the vectors have unit length are called *orthonormal* and are especially convenient.

:::definition {def:definition-6-3-6} Definition 6.3.6
{index-entry:othonormal set} An *orthonormal* set is an orthogonal set of vectors each of which has unit length.
:::

:::example {ex:example-6-3-7} Example 6.3.7
The vectors

$$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right] $$

are an orthonormal set of vectors in ${\mathbb R}^2$ and form an orthonormal basis for ${\mathbb R}^2$.
If we form the matrix

$$ Q=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix} = \begin{bmatrix} 1/\sqrt{2} & -1/\sqrt{2} \\ 1/\sqrt{2} & 1/\sqrt{2} \\ \end{bmatrix}\text{,} $$

we find that $Q^TQ = I$ since [Proposition 6.2.8](ref:6.2#prop-transpose-multiplication) tells us that

$$ Q^TQ = \begin{bmatrix} {\mathbf u}_1\cdot{\mathbf u}_1 & {\mathbf u}_1\cdot{\mathbf u}_2 \\ {\mathbf u}_2\cdot{\mathbf u}_1 & {\mathbf u}_2\cdot{\mathbf u}_2 \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix} $$

:::

The previous activity and example illustrate the next proposition.

:::proposition {prop:prop-orthonormal-QTQ} Proposition 6.3.8
If the columns of the $m\times n$ matrix $Q$ form an orthonormal set, then $Q^TQ = I_n$, the $n\times n$ identity matrix.
:::

## 6.3.3 Orthogonal projections

We now turn to an important problem that will appear in many forms in the rest of our explorations. Suppose, as shown in [Figure 6.3.9](ref:fig-3d-orthog-proj), that we have a subspace $W$ of ${\mathbb R}^m$ and a vector ${\mathbf b}$ that is not in that subspace. We would like to find the vector $\widehat{{\mathbf b}}$ in $W$ that is closest to ${\mathbf b}$, meaning the distance between $\widehat{{\mathbf b}}$ and ${\mathbf b}$ is as small as possible.

> FIGURE {fig:fig-3d-orthog-proj} number=6.3.9 src=../../media/ch06/3d-orthog-proj-3.svg
> alt: A plane in three dimensions, a vector not in the plane, and the orthogonal projection of that vector.
> width: 55%
> caption: Given a plane in ${\mathbb R}^3$ and a vector ${\mathbf b}$ not in the plane, we wish to find the vector $\widehat{{\mathbf b}}$ in the plane that is closest to ${\mathbf b}$.

To get started, let's consider a simpler problem where we have a line $L$ in ${\mathbb R}^2$, defined by the vector ${\mathbf w}$, and another vector ${\mathbf b}$ that is not on the line, as shown on the left of [Figure 6.3.10](ref:fig-projection-line-a). We wish to find $\widehat{{\mathbf b}}$, the vector on the line that is closest to ${\mathbf b}$, as illustrated in the right of [Figure 6.3.10](ref:fig-projection-line-a).

> FIGURE {fig:fig-projection-line-a} number=6.3.10 src=../../media/ch06/projection-line-1.svg
> alt: A line in two dimensions defined by a vector and another vector not on the line.
> caption: Given a line $L$ and a vector ${\mathbf b}$, we seek the vector $\widehat{{\mathbf b}}$ on $L$ that is closest to ${\mathbf b}$.
> subfigure src=../../media/ch06/projection-line-1.svg alt: A line in two dimensions defined by a vector and another vector not on the line.
> subfigure src=../../media/ch06/projection-line-4.svg alt: A line in two dimensions, a vector not on the line, and the orthogonal projection of that vector onto the line.

To find $\widehat{{\mathbf b}}$, we require that ${\mathbf b}-\widehat{{\mathbf b}}$ be orthogonal to $L$. For instance, if ${\mathbf y}$ is another vector on the line, as shown in [Figure 6.3.11](ref:fig-projection-line-b), then the Pythagorean theorem implies that

$$ \left|{\mathbf b}-{\mathbf y}\right|^2 = |{\mathbf b}-\widehat{{\mathbf b}}|^2 + |\widehat{{\mathbf b}}-{\mathbf y}|^2 $$

which means that $\left|{\mathbf b}-{\mathbf y}\right|\geq|{\mathbf b}-\widehat{{\mathbf b}}|$. Therefore, $\widehat{{\mathbf b}}$ is closer to ${\mathbf b}$ than any other vector on the line $L$.

> FIGURE {fig:fig-projection-line-b} number=6.3.11 src=../../media/ch06/projection-line-3.svg
> alt: A two dimensional diagram demonstrating how orthogonality determines the orthogonal projection.
> width: 50%
> caption: The vector $\widehat{{\mathbf b}}$ is closer to ${\mathbf b}$ than ${\mathbf y}$ because ${\mathbf b}-\widehat{{\mathbf b}}$ is orthogonal to $L$.

:::definition {def:definition-6-3-12} Definition 6.3.12
Given a vector ${\mathbf b}$ in ${\mathbb R}^m$ and a subspace $W$ of ${\mathbb R}^m$, the *orthogonal projection* of ${\mathbf b}$ onto $W$ is the vector $\widehat{{\mathbf b}}$ in $W$ that is closest to ${\mathbf b}$. It is characterized by the property that ${\mathbf b}-\widehat{{\mathbf b}}$ is orthogonal to $W$.
:::

:::activity {act:activity-6-3-3} Activity 6.3.3
This activity demonstrates how to determine the orthogonal projection of a vector onto a subspace of ${\mathbb R}^m$.

a) 
    Let's begin by considering a line $L$, defined by the vector ${\mathbf w}=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$, and a vector ${\mathbf b}=\left[\begin{array}{r}2 \\ 4 \end{array}\right]$ not on $L$, as illustrated in [Figure 6.3.13](ref:fig-projection-line-c).

    > FIGURE {fig:fig-projection-line-c} number=6.3.13 src=../../media/ch06/projection-line-4.svg
    > alt: A two dimensional line, a vector not on the line, and its orthogonal complement.
    > caption: Finding the orthogonal projection of ${\mathbf b}$ onto the line defined by ${\mathbf w}$.
    > subfigure src=../../media/ch06/projection-line-4.svg alt: A two dimensional line, a vector not on the line, and its orthogonal complement.
    > subfigure src=../../media/ch06/projection-line-2.svg alt: The orthogonal projection is now represented as a scalar multiple of a basis vector for the line.

    1. 
        To find $\widehat{{\mathbf b}}$, first notice that $\widehat{{\mathbf b}} = s{\mathbf w}$ for some scalar $s$. Since ${\mathbf b}-\widehat{{\mathbf b}} = {\mathbf b} - s{\mathbf w}$ is orthogonal to ${\mathbf w}$, what do we know about the dot product

        $$ ({\mathbf b}-s{\mathbf w})\cdot{\mathbf w}\text{?} $$

    2. 
        Apply the distributive property of dot products to find the scalar $s$. What is the vector $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto $L$?

    3. 
        More generally, explain why the orthogonal projection of ${\mathbf b}$ onto the line defined by ${\mathbf w}$ is

        $$ \widehat{{\mathbf b}}= \frac{{\mathbf b}\cdot{\mathbf w}}{{\mathbf w}\cdot{\mathbf w}}~{\mathbf w}\text{.} $$

b) 
    The same ideas apply more generally. Suppose we have an orthogonal set of vectors ${\mathbf w}_1=\left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}1 \\ 0 \\ 2 \end{array}\right]$ that define a plane $W$ in ${\mathbb R}^3$. If ${\mathbf b}=\left[\begin{array}{r}3 \\ 9 \\ 6 \end{array}\right]$ another vector in ${\mathbb R}^3$, we seek the vector $\widehat{{\mathbf b}}$ on the plane $W$ closest to ${\mathbf b}$. As before, the vector ${\mathbf b}-\widehat{{\mathbf b}}$ will be orthogonal to $W$, as illustrated in [Figure 6.3.14](ref:fig-3d-orthog).

    > FIGURE {fig:fig-3d-orthog} number=6.3.14 src=../../media/ch06/3d-orthog-proj-2.svg
    > alt: Finding the orthogonal projection in three dimensions.
    > width: 55%
    > caption: Given a plane $W$ defined by the orthogonal vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ and another vector ${\mathbf b}$, we seek the vector $\widehat{{\mathbf b}}$ on $W$ closest to ${\mathbf b}$.

    1. 
        The vector ${\mathbf b}-\widehat{{\mathbf b}}$ is orthogonal to $W$. What does this say about the dot products: $({\mathbf b}-\widehat{{\mathbf b}})\cdot{\mathbf w}_1$ and $({\mathbf b}-\widehat{{\mathbf b}})\cdot{\mathbf w}_2$?

    2. 
        Since $\widehat{{\mathbf b}}$ is in the plane $W$, we can write it as a linear combination $\widehat{{\mathbf b}} = c_1{\mathbf w}_1 + c_2{\mathbf w}_2$. Then

        $$ {\mathbf b}-\widehat{{\mathbf b}} = {\mathbf b} - (c_1{\mathbf w}_1+c_2{\mathbf w}_2)\text{.} $$

        Find the weight $c_1$ by dotting ${\mathbf b}-\widehat{{\mathbf b}}$ with ${\mathbf w}_1$ and applying the distributive property of dot products. Similarly, find the weight $c_2$.

    3. 
        What is the vector $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto the plane $W$?

c) 
    Suppose that $W$ is a subspace of ${\mathbb R}^m$ with orthogonal basis ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$ and that ${\mathbf b}$ is a vector in ${\mathbb R}^m$. Explain why the orthogonal projection of ${\mathbf b}$ onto $W$ is the vector

    $$ \widehat{{\mathbf b}} = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}~{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}~{\mathbf w}_2 + \cdots + \frac{{\mathbf b}\cdot{\mathbf w}_n}{{\mathbf w}_n\cdot{\mathbf w}_n}~{\mathbf w}_n\text{.} $$

d) 
    Suppose that ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$ is an *orthonormal* basis for $W$; that is, the vectors are orthogonal to one another and have unit length. Explain why the orthogonal projection is

    $$ \widehat{{\mathbf b}}= ({\mathbf b}\cdot{\mathbf u}_1)~{\mathbf u}_1 + ({\mathbf b}\cdot{\mathbf u}_2)~{\mathbf u}_2 + \cdots + ({\mathbf b}\cdot{\mathbf u}_n)~{\mathbf u}_n\text{.} $$

e) 
    If $Q=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & \ldots & {\mathbf u}_n \end{bmatrix}$ is the matrix whose columns are an orthonormal basis of $W$, use [Proposition 6.2.8](ref:6.2#prop-transpose-multiplication) to explain why $\widehat{{\mathbf b}} = QQ^T{\mathbf b}$.

ANSWER:

a) 

    1. 
        0

    2. 
        $\widehat{{\mathbf b}} = \left[\begin{array}{r}16/5 \\ 8/5 \end{array}\right]$.

    3. 
        $\widehat{{\mathbf b}}= \frac{{\mathbf b}\cdot{\mathbf w}}{{\mathbf w}\cdot{\mathbf w}}{\mathbf w}$

b) 

    1. 
        0

    2. 
        $c_1= 2$

        $c_2=3$

    3. 
        $\widehat{{\mathbf b}} = \left[\begin{array}{r}7 \\ 4 \\ 4 \end{array}\right]$

c) 
    We require that ${\mathbf b}-\widehat{{\mathbf b}}$ be orthogonal to every vector ${\mathbf w}_i$.

d) 
    $c_i=\frac{{\mathbf b}\cdot{\mathbf u}_i}{{\mathbf u}_i\cdot{\mathbf u}_i} = {\mathbf b}\cdot{\mathbf u}_i$

e) 
    Use the fact that $Q^T{\mathbf b} = \left[\begin{array}{r}{\mathbf b}\cdot{\mathbf u}_1 \\ \vdots \\ {\mathbf b}\cdot{\mathbf u}_n \end{array}\right]$

SOLUTION:

a) 

    1. 
        This dot product should be 0 since the vectors are orthogonal.

    2. 
        $\widehat{{\mathbf b}}=\frac{b\cdot{\mathbf w}}{{\mathbf w}\cdot{\mathbf w}}{\mathbf w} = \left[\begin{array}{r}16/5 \\ 8/5 \end{array}\right]$.

    3. 
        As before, $\widehat{{\mathbf b}}= \frac{{\mathbf b}\cdot{\mathbf w}}{{\mathbf w}\cdot{\mathbf w}}{\mathbf w}$

b) 

    1. 
        These dot products are 0.

    2. 
        $c_1=\frac{{\mathbf b}\cdot{\mathbf w}_1} {{\mathbf w}_1\cdot{\mathbf w}_1} = 2$

        $c_2=\frac{{\mathbf b}\cdot{\mathbf w}_2} {{\mathbf w}_2\cdot{\mathbf w}_2} = 3$

    3. 
        $\widehat{{\mathbf b}} = \left[\begin{array}{r}7 \\ 4 \\ 4 \end{array}\right]$

c) 
    We know $\widehat{{\mathbf b}}=c_1{\mathbf w}_1 + c_2{\mathbf w}_2 + \cdots + c_n{\mathbf w}_n$ and we can find $c_i=\frac{{\mathbf b}\cdot{\mathbf w}_i}{{\mathbf w}_i\cdot{\mathbf w}_i}$ by requiring that ${\mathbf b}-\widehat{{\mathbf b}}$ be orthogonal to every vector ${\mathbf w}_i$.

d) 
    The vectors ${\mathbf u}_i$ form an orthogonal set and since ${\mathbf u}_i\cdot{\mathbf u}_i = \left|{\mathbf u}_i\right|^2 = 1$, the weights are $c_i=\frac{{\mathbf b}\cdot{\mathbf u}_i}{{\mathbf u}_i\cdot{\mathbf u}_i} = {\mathbf b}\cdot{\mathbf u}_i$.

e) 
    We have $Q^T{\mathbf b} = \left[\begin{array}{c}{\mathbf b}\cdot{\mathbf u}_1 \\ \vdots \\ {\mathbf b}\cdot{\mathbf u}_n \end{array}\right]$ so that

    $$ QQ^T{\mathbf b} = ({\mathbf b}\cdot{\mathbf u}_1)~{\mathbf u}_1 + ({\mathbf b}\cdot{\mathbf u}_2)~{\mathbf u}_2 + \cdots + ({\mathbf b}\cdot{\mathbf u}_n)~{\mathbf u}_n=\widehat{{\mathbf b}}\text{.} $$

:::

In all the cases considered in the activity, we are looking for $\widehat{{\mathbf b}}$, the vector in a subspace $W$ closest to a vector ${\mathbf b}$, which is found by requiring that ${\mathbf b}-\widehat{{\mathbf b}}$ be orthogonal to $W$. This means that $({\mathbf b}-\widehat{{\mathbf b}})\cdot{\mathbf w} = 0$ for any vector ${\mathbf w}$ in $W$.

If we have an orthogonal basis ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$ for $W$, then $\widehat{{\mathbf b}} = c_1{\mathbf w}_1+c_w{\mathbf w}_2+\cdots+c_n{\mathbf w}_n$. Therefore,

$$ \begin{aligned} ({\mathbf b}-\widehat{{\mathbf b}})\cdot{\mathbf w}_i & = 0 \\ {\mathbf b}\cdot{\mathbf w}_i & = \widehat{{\mathbf b}}\cdot{\mathbf w}_i \\ {\mathbf b}\cdot{\mathbf w}_i & = (c_1{\mathbf w}_1+c_2{\mathbf w}_2+\cdots + c_n{\mathbf w}_n)\cdot{\mathbf w}_i \\ {\mathbf b}\cdot{\mathbf w}_i & = c_i{\mathbf w}_i\cdot{\mathbf w}_i \\ c_i & = \frac{{\mathbf b}\cdot{\mathbf w}_i}{{\mathbf w}_i\cdot{\mathbf w}_i}. \end{aligned} $$

This leads to the projection formula:

:::proposition {prop:prop-proj-formula} Proposition 6.3.15 (Projection formula)
If $W$ is a subspace of ${\mathbb R}^m$ having an orthogonal basis ${\mathbf w}_1,{\mathbf w}_2,\ldots, {\mathbf w}_n$ and ${\mathbf b}$ is a vector in ${\mathbb R}^m$, then the orthogonal projection of ${\mathbf b}$ onto $W$ is

$$ \widehat{{\mathbf b}}= \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}~{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}~{\mathbf w}_2 + \cdots + \frac{{\mathbf b}\cdot{\mathbf w}_n}{{\mathbf w}_n\cdot{\mathbf w}_n}~{\mathbf w}_n\text{.} $$

:::

:::assemblage {asm:assemblage-} Caution
Remember that the projection formula given in [Proposition 6.3.15](ref:prop-proj-formula) applies only when the basis ${\mathbf w}_1,{\mathbf w}_2,\cdots,{\mathbf w}_n$ of $W$ is *orthogonal*.
:::

If we have an orthonormal basis ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$ for $W$, the projection formula simplifies to

$$ \widehat{{\mathbf b}}= ({\mathbf b}\cdot{\mathbf u}_1)~{\mathbf u}_1 + ({\mathbf b}\cdot{\mathbf u}_2)~{\mathbf u}_2 + \cdots + ({\mathbf b}\cdot{\mathbf u}_n)~{\mathbf u}_n\text{.} $$

If we then form the matrix

$$ Q = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & \ldots & {\mathbf u}_n \end{bmatrix}\text{,} $$

this expression may be succintly written

$$ \begin{aligned} \widehat{{\mathbf b}} & {}={} ({\mathbf b}\cdot{\mathbf u}_1)~{\mathbf u}_1 + ({\mathbf b}\cdot{\mathbf u}_2)~{\mathbf u}_2 + \cdots + ({\mathbf b}\cdot{\mathbf u}_n)~{\mathbf u}_n \\ & {}={} \begin{bmatrix} {\mathbf u}_1&{\mathbf u}_2&\ldots&{\mathbf u}_n \end{bmatrix} \begin{bmatrix} {\mathbf u}_1\cdot{\mathbf b} \\ {\mathbf u}_2\cdot{\mathbf b} \\ \vdots \\ {\mathbf u}_n\cdot{\mathbf b} \\ \end{bmatrix} \\ & {}={} QQ^T{\mathbf b} \end{aligned} $$

This leads to the following proposition.

:::proposition {prop:prop-proj-orthonormal} Proposition 6.3.16
If ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$ is an orthonormal basis for a subspace $W$ of ${\mathbb R}^m$, then the matrix transformation that projects vectors in ${\mathbb R}^m$ orthogonally onto $W$ is represented by the matrix $P=QQ^T$ where

$$ Q = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & \ldots & {\mathbf u}_n \\ \end{bmatrix}\text{.} $$

:::

:::example {ex:example-projection-matrix} Example 6.3.17
In the previous activity, we looked at the plane $W$ defined by the two orthogonal vectors

$$ {\mathbf w}_1=\left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}1 \\ 0 \\ 2 \end{array}\right]\text{.} $$

We can form an orthonormal basis by scalar multiplying these vectors to have unit length:

$$ {\mathbf u}_1=\frac13\left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right] = \left[\begin{array}{r}2/3 \\ 2/3 \\ -1/3 \end{array}\right],\hspace{24pt} {\mathbf u}_2=\frac1{\sqrt{5}}\left[\begin{array}{r}1 \\ 0 \\ 2 \end{array}\right] = \left[\begin{array}{r}1/\sqrt{5} \\ 0 \\ 2/\sqrt{5} \end{array}\right]\text{.} $$

Using these vectors, we form the matrix

$$ Q = \begin{bmatrix} 2/3 & 1/\sqrt{5} \\ 2/3 & 0 \\ -1/3 & 2/\sqrt{5} \\ \end{bmatrix}\text{.} $$

The projection onto the plane $W$ is then given by the matrix

$$ QQ^T = \begin{bmatrix} 2/3 & 1/\sqrt{5} \\ 2/3 & 0 \\ -1/3 & 2/\sqrt{5} \\ \end{bmatrix} \begin{bmatrix} 2/3 & 2/3 & -1/3 \\ 1/\sqrt{5} & 0 & 2/\sqrt{5} \\ \end{bmatrix} = \begin{bmatrix} {29}/{45} & {4}/{9} & {8}/{45} \\ {4}/{9} & {4}/{9} & -{2}/{9} \\ {8}/{45} & -{2}/{9} & {41}/{45} \end{bmatrix}\text{.} $$

Let's check that this works by considering the vector ${\mathbf b}=\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$ and finding $\widehat{{\mathbf b}}$, its orthogonal projection onto the plane $W$. In terms of the original basis ${\mathbf w}_1$ and ${\mathbf w}_2$, the projection formula from [Proposition 6.3.15](ref:prop-proj-formula) tells us that

$$ \widehat{{\mathbf b}}=\frac{{\mathbf b}\cdot{\mathbf w}_1} {{\mathbf w}_1\cdot{\mathbf w}_1}~{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2} {{\mathbf w}_2\cdot{\mathbf w}_2}~{\mathbf w}_2 = \left[\begin{array}{c}{29}/{45} \\ 4/9 \\ 8/{45} \end{array}\right] \\ $$

Alternatively, we use the matrix $QQ^T$, as in [Proposition 6.3.16](ref:prop-proj-orthonormal), to find that

$$ \widehat{{\mathbf b}} = QQ^T{\mathbf b} = \begin{bmatrix} {29}/{45} & {4}/{9} & {8}/{45} \\ {4}/{9} & {4}/{9} & -{2}/{9} \\ {8}/{45} & -{2}/{9} & {41}/{45} \end{bmatrix}\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right] = \left[\begin{array}{c}{29}/{45} \\ 4/9 \\ 8/{45} \end{array}\right]\text{.} $$

:::

:::activity {act:activity-6-3-4} Activity 6.3.4

a) 
    Suppose that $L$ is the line in ${\mathbb R}^3$ defined by the vector ${\mathbf w}=\left[\begin{array}{r}1 \\ 2 \\ -2 \end{array}\right]$.

    :::sage
    ```sage

    ```
    :::

    1. 
        Find an orthonormal basis ${\mathbf u}$ for $L$.

    2. 
        Construct the matrix $Q = \begin{bmatrix}{\mathbf u}\end{bmatrix}$ and use it to construct the matrix $P$ that projects vectors orthogonally onto $L$.

    3. 
        Use your matrix to find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$ onto $L$.

    4. 
        Find $\operatorname{rank}(P)$ and explain its geometric significance.

b) 
    The vectors

    $$ {\mathbf w}_1 = \left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2 = \left[\begin{array}{r}0 \\ 1 \\ 1 \\ -2 \end{array}\right] $$

    form an orthogonal basis of $W$, a two-dimensional subspace of ${\mathbb R}^4$.

    :::sage
    ```sage

    ```
    :::

    1. 
        Use the projection formula from [Proposition 6.3.15](ref:prop-proj-formula) to find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}9 \\ 2 \\ -2 \\ 3 \end{array}\right]$ onto $W$.

    2. 
        Find an orthonormal basis ${\mathbf u}_1$ and ${\mathbf u}_2$ for $W$ and use it to construct the matrix $P$ that projects vectors orthogonally onto $W$. Check that $P{\mathbf b} = \widehat{{\mathbf b}}$, the orthogonal projection you found in the previous part of this activity.

    3. 
        Find $\operatorname{rank}(P)$ and explain its geometric significance.

    4. 
        Find a basis for $W^\perp$.

    5. 
        Find a vector ${\mathbf b}^\perp$ in $W^\perp$ such that

        $$ {\mathbf b} = \widehat{{\mathbf b}} + {\mathbf b}^\perp. $$

    6. 
        If $Q$ is the matrix whose columns are ${\mathbf u}_1$ and ${\mathbf u}_2$, find the product $Q^TQ$ and explain your result.

ANSWER:

a) 

    1. 
        ${\mathbf u}=\left[\begin{array}{r}1/3 \\ 2/3 \\ -2/3 \end{array}\right]$

    2. 
        $QQ^T = \begin{bmatrix} 1/9 & 2/9 & -2/9 \\ 2/9 & 4/9 & -4/9 \\ -2/9 & -4/9 & 4/9 \end{bmatrix}$

    3. 
        $\widehat{{\mathbf b}}=\left[\begin{array}{r}1/9 \\ 2/9 \\ -2/9 \end{array}\right]$

    4. 
        $\operatorname{rank}(P)=1$

b) 

    1. 
        $\widehat{{\mathbf b}} = \left[\begin{array}{r}3 \\ 2 \\ 3 \\ 5 \end{array}\right]$

    2. 
        $P = \begin{bmatrix} 1/4 & 1/4 & 1/4 & 1/4 \\ 1/4 & 5/12 & 5/12 & -1/12 \\ 1/4 & 5/12 & 5/12 & 1/12 \\ 1/4 & -1/12 & -1/12 & 11/12 \end{bmatrix}$

    3. 
        $\operatorname{rank}(P)=2$

    4. 
        ${\mathbf v}_1=\left[\begin{array}{r}0 \\ -1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-3 \\ -2 \\ 0 \\ 1 \end{array}\right]$

    5. 
        ${\mathbf b}^\perp = \left[\begin{array}{r}6 \\ 0 \\ -4 \\ -2 \end{array}\right]$

    6. 
        $Q^TQ = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$

SOLUTION:

a) 

    1. 
        ${\mathbf u}=\left[\begin{array}{r}1/3 \\ 2/3 \\ -2/3 \end{array}\right]$

    2. 
        $QQ^T = \begin{bmatrix} 1/9 & 2/9 & -2/9 \\ 2/9 & 4/9 & -4/9 \\ -2/9 & -4/9 & 4/9 \end{bmatrix}$

    3. 
        $\widehat{{\mathbf b}}=\left[\begin{array}{r}1/9 \\ 2/9 \\ -2/9 \end{array}\right]$

    4. 
        We find that $\operatorname{rank}(P)$, which makes sense because $\text{Col}(P) = L$, a 1-dimensional subspace of ${\mathbb R}^3$.

b) 

    1. 
        $\widehat{{\mathbf b}} = \left[\begin{array}{r}3 \\ 2 \\ 2 \\ 5 \end{array}\right]$

    2. 
        $P = \begin{bmatrix} 1/4 & 1/4 & 1/4 & 1/4 \\ 1/4 & 5/12 & 5/12 & -1/12 \\ 1/4 & 5/12 & 5/12 & 1/12 \\ 1/4 & -1/12 & -1/12 & 11/12 \end{bmatrix}$

    3. 
        $\operatorname{rank}(P)=2$ since $\text{Col}(P) = W$

    4. 
        Since $W=\text{Col}(P)$, then $W^\perp = \text{Nul}(P)$, which gives ${\mathbf v}_1=\left[\begin{array}{r}0 \\ -1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-3 \\ -2 \\ 0 \\ 1 \end{array}\right]$

    5. 
        We can find ${\mathbf b}^\perp = {\mathbf b} - \widehat{{\mathbf b}} = \left[\begin{array}{r}6 \\ 0 \\ -4 \\ -2 \end{array}\right]$

    6. 
        $Q^TQ = \begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$ since this product computes the dot products between the columns of $Q$.

:::

This activity demonstrates one issue of note. We found $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto $W$, by requiring that ${\mathbf b}-\widehat{{\mathbf b}}$ be orthogonal to $W$. In other words, ${\mathbf b}-\widehat{{\mathbf b}}$ is a vector in the orthogonal complement $W^\perp$, which we may denote ${\mathbf b}^\perp$. This explains the following proposition, which is illustrated in [Figure 6.3.19](ref:fig-orthog-decomp)

:::proposition {prop:prop-orthog-decomp} Proposition 6.3.18
If $W$ is a subspace of ${\mathbb R}^n$ with orthogonal complement $W^\perp$, then any $n$-dimensional vector ${\mathbf b}$ can be uniquely written as

$$ {\mathbf b} = \widehat{{\mathbf b}} + {\mathbf b}^\perp $$

where $\widehat{{\mathbf b}}$ is in $W$ and ${\mathbf b}^\perp$ is in $W^\perp$. The vector $\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto $W$ and ${\mathbf b}^\perp$ is the orthogonal projection of ${\mathbf b}$ onto $W^\perp$.
:::

> FIGURE {fig:fig-orthog-decomp} number=6.3.19 src=../../media/ch06/orthog-decomp.svg
> alt: A two dimensional vector orthogonally projected onto a line and the orthogonal complement of the line.
> width: 45%
> caption: A vector ${\mathbf b}$ along with $\widehat{{\mathbf b}}$, its orthogonal projection onto the line $L$, and ${\mathbf b}^\perp$, its orthogonal projection onto the orthogonal complement $L^\perp$.

Let's summarize what we've found. If $Q$ is a matrix whose columns ${\mathbf u}_1, {\mathbf u}_2,\ldots,{\mathbf u}_n$ form an orthonormal set in ${\mathbb R}^m$, then

- 
    $Q^TQ = I_n$, the $n\times n$ identity matrix, because this product computes the dot products between the columns of $Q$.

- 
    $QQ^T$ is the matrix the projects vectors orthogonally onto $W$, the subspace of ${\mathbb R}^m$ spanned by ${\mathbf u}_1,\ldots,{\mathbf u}_n$.

As we've said before, matrix multiplication depends on the order in which we multiply the matrices, and we see this clearly here.

Because $Q^TQ=I$, there is a temptation to say that $Q$ is invertible. This is usually not the case, however. Remember that an invertible matrix must be a square matrix, and the matrix $Q$ will only be square if $n=m$. In this case, there are $m$ vectors in the orthonormal set so the subspace $W$ spanned by the vectors ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_m$ is ${\mathbb R}^m$. If ${\mathbf b}$ is a vector in ${\mathbb R}^m$, then $\widehat{{\mathbf b}}=QQ^T{\mathbf b}$ is the orthogonal projection of ${\mathbf b}$ onto ${\mathbb R}^m$. In other words, $QQ^T{\mathbf b}$ is the closest vector in ${\mathbb R}^m$ to ${\mathbf b}$, and this closest vector must be ${\mathbf b}$ itself. Therefore, $QQ^T{\mathbf b} = {\mathbf b}$, which means that $QQ^T=I$. In this case, $Q$ is an invertible matrix.

:::example {ex:example-6-3-20} Example 6.3.20
Consider the orthonormal set of vectors

$$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ -1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right], \hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \\ 0 \end{array}\right] $$

and the matrix they define

$$ Q = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} \\ -1/\sqrt{3} & 1/\sqrt{2} \\ 1/\sqrt{3} & 0 \\ \end{bmatrix}\text{.} $$

In this case, ${\mathbf u}_1$ and ${\mathbf u}_2$ span a plane, a 2-dimensional subspace of ${\mathbb R}^3$. We know that $Q^TQ = I_2$ and $QQ^T$ projects vectors orthogonally onto the plane. However, $Q$ is not a square matrix so it cannot be invertible.
:::

:::example {ex:example-6-3-21} Example 6.3.21
Now consider the orthonormal set of vectors

$$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ -1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right], \hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \\ 0 \end{array}\right], \hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{6} \\ -1/\sqrt{6} \\ -2/\sqrt{6} \end{array}\right] $$

and the matrix they define

$$ Q = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & 1/\sqrt{6} \\ -1/\sqrt{3} & 1/\sqrt{2} & -1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ \end{bmatrix}\text{.} $$

Here, ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$ form a basis for ${\mathbb R}^3$ so that both $Q^TQ=I_3$ and $QQ^T=I_3$. Therefore, $Q$ is a square matrix and is invertible.
Moreover, since $Q^TQ = I$, we see that $Q^{-1} = Q^T$ so finding the inverse of $Q$ is as simple as writing its transpose. Matrices with this property are very special and will play an important role in our upcoming work. We will therefore give them a special name.
:::

:::definition {def:definition-6-3-22} Definition 6.3.22
{index-entry:orthogonal matrix} A square $m\times m$ matrix $Q$ whose columns form an orthonormal basis for ${\mathbb R}^m$ is called *orthogonal*.
:::

This terminology can be a little confusing. We call a basis orthogonal if the basis vectors are orthogonal to one another. However, a matrix is orthogonal if the columns are orthogonal to one another and have unit length. It pays to keep this in mind when reading statements about orthogonal bases and orthogonal matrices. In the meantime, we record the following proposition.

:::proposition {prop:prop-orthog-matrix} Proposition 6.3.23
An orthogonal matrix $Q$ is invertible and its inverse $Q^{-1} = Q^T$.
:::

## 6.3.4 Summary

This section introduced orthogonal sets and the projection formula that allows us to project vectors orthogonally onto a subspace.

- 
    Given an orthogonal set ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$ that spans an $n$-dimensional subspace $W$ of ${\mathbb R}^m$, the orthogonal projection of ${\mathbf b}$ onto $W$ is the vector in $W$ closest to ${\mathbf b}$ and may be written as

    $$ \widehat{{\mathbf b}} = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}~{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}~{\mathbf w}_2 + \cdots + \frac{{\mathbf b}\cdot{\mathbf w}_n}{{\mathbf w}_n\cdot{\mathbf w}_n}~{\mathbf w}_n\text{.} $$

- 
    If ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$ is an orthonormal basis of $W$ and $Q$ is the matrix whose columns are ${\mathbf u}_i$, then the matrix $P=QQ^T$ projects vectors orthogonally onto $W$.

- 
    If the columns of $Q$ form an orthonormal basis for an $n$-dimensional subspace of ${\mathbb R}^m$, then $Q^TQ=I_n$.

- 
    An orthogonal matrix $Q$ is a square matrix whose columns form an orthonormal basis. In this case, $QQ^T=Q^TQ = I$ so that $Q^{-1} = Q^T$.

## 6.3.5 Exercises

:::exercise {exercise-6-3-001} number=6.3.1 answered=yes src=src/exercises/exercises6-3.xml:5
PROBLEM:
Suppose that

$$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}1 \\ -2 \\ 1 \end{array}\right]. $$

a) 
    Verify that ${\mathbf w}_1$ and ${\mathbf w}_2$ form an orthogonal basis for a plane $W$ in ${\mathbb R}^3$.

b) 
    Use [Proposition 6.3.15](ref:prop-proj-formula) to find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}2 \\ 1 \\ -1 \end{array}\right]$ onto $W$.

c) 
    Find an orthonormal basis ${\mathbf u}_1$, ${\mathbf u}_2$ for $W$.

d) 
    Find the matrix $P$ representing the matrix transformation that projects vectors in ${\mathbb R}^3$ orthogonally onto $W$. Verify that $\widehat{{\mathbf b}} = P{\mathbf b}$.

e) 
    Determine $\operatorname{rank}(P)$ and explain its geometric significance.

ANSWER:

a) 
    ${\mathbf w}_1\cdot{\mathbf w}_2=0$.

b) 
    $\widehat{{\mathbf b}} = \left[\begin{array}{r}1/2 \\ 1 \\ 1/2 \end{array}\right]$.

c) 
    ${\mathbf u}_1=\frac{1}{\left|{\mathbf w}_1\right|}{\mathbf w}_1 = \left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$ and ${\mathbf u}_2=\frac{1}{\left|{\mathbf w}_2\right|}{\mathbf w}_2 = \left[\begin{array}{r}1/\sqrt{6} \\ -2/\sqrt{6} \\ 1/\sqrt{6} \end{array}\right]$

d) 
    $P=\begin{bmatrix} 1/2 & 0 & 1/2 \\ 0 & 1 & 0 \\ 1/2 & 0 & 1/2 \end{bmatrix}$

e) 
    $\operatorname{rank}(P) = 2$

SOLUTION:

a) 
    Check that ${\mathbf w}_1\cdot{\mathbf w}_2=0$.

b) 
    Applying the Projection Formula gives $\widehat{{\mathbf b}} = \left[\begin{array}{r}1/2 \\ 1 \\ 1/2 \end{array}\right]$.

c) 
    ${\mathbf u}_1=\frac{1}{\left|{\mathbf w}_1\right|}{\mathbf w}_1 = \left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$ and ${\mathbf u}_2=\frac{1}{\left|{\mathbf w}_2\right|}{\mathbf w}_2 = \left[\begin{array}{r}1/\sqrt{6} \\ -2/\sqrt{6} \\ 1/\sqrt{6} \end{array}\right]$

d) 
    Form $Q=\begin{bmatrix}{\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix}$ so that $P=QQ^T=\begin{bmatrix} 1/2 & 0 & 1/2 \\ 0 & 1 & 0 \\ 1/2 & 0 & 1/2 \end{bmatrix}$

e) 
    Since $\text{Col}(P)=W$, we have $\operatorname{rank}(P) = 2$

:::

:::exercise {exercise-6-3-002} number=6.3.2 answered=yes src=src/exercises/exercises6-3.xml:137
PROBLEM:
Consider the vectors

$$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}-1 \\ 0 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_3=\left[\begin{array}{r}1 \\ -2 \\ 1 \end{array}\right]. $$

a) 
    Explain why these vectors form an orthogonal basis for ${\mathbb R}^3$.

b) 
    Suppose that $A=\begin{bmatrix} {\mathbf w}_1 & {\mathbf w}_2 & {\mathbf w}_3 \end{bmatrix}$ and evaluate the product $A^TA$. Why is this product a diagonal matrix and what is the significance of the diagonal entries?

c) 
    Express the vector ${\mathbf b}=\left[\begin{array}{r}-3 \\ -6 \\ 3 \end{array}\right]$ as a linear combination of ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$.

d) 
    Multiply the vectors ${\mathbf w}_1$, ${\mathbf w}_2$, ${\mathbf w}_3$ by appropriate scalars to find an orthonormal basis ${\mathbf u}_1$, ${\mathbf u}_2$, ${\mathbf u}_3$ of ${\mathbb R}^3$.

e) 
    If $Q=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 \end{bmatrix}$, find the matrix product $QQ^T$ and explain the result.

ANSWER:

a) 
    ${\mathbf w}_1\cdot{\mathbf w}_1=0$, ${\mathbf w}_1\cdot{\mathbf w}_3=0$, and ${\mathbf w}_2\cdot{\mathbf w}_3=0$.

b) 
    $A^TA = \begin{bmatrix} 3 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 6 \end{bmatrix}$

c) 
    ${\mathbf b}=-2{\mathbf w}_1+3{\mathbf w}_2+2{\mathbf w}_3$.

d) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ 0 \\ 1/\sqrt{2} \end{array}\right], \hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{6} \\ -2/\sqrt{6} \\ 1/\sqrt{6} \end{array}\right],\hspace{24pt} $$

e) 
    $QQ^T=I$

SOLUTION:

a) 
    Check that all three dot products ${\mathbf w}_1\cdot{\mathbf w}_1=0$, ${\mathbf w}_1\cdot{\mathbf w}_3=0$, and ${\mathbf w}_2\cdot{\mathbf w}_3=0$.

b) 
    $A^TA = \begin{bmatrix} 3 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 6 \end{bmatrix} = \begin{bmatrix} {\mathbf w}_1\cdot{\mathbf w}_1& {\mathbf w}_1\cdot{\mathbf w}_2& {\mathbf w}_1\cdot{\mathbf w}_3 \\ {\mathbf w}_2\cdot{\mathbf w}_1& {\mathbf w}_2\cdot{\mathbf w}_2& {\mathbf w}_2\cdot{\mathbf w}_3 \\ {\mathbf w}_3\cdot{\mathbf w}_1& {\mathbf w}_3\cdot{\mathbf w}_2& {\mathbf w}_3\cdot{\mathbf w}_3 \\ \end{bmatrix}$. This matrix is diagonal because the vectors form an orthogonal set.

c) 
    We may find the weights of this linear combination by finding $c_i=\frac{b\cdot{\mathbf w}_i}{{\mathbf w}_i\cdot{\mathbf w}_i}$ so that ${\mathbf b}=-2{\mathbf w}_1+3{\mathbf w}_2+2{\mathbf w}_3$.

d) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ 0 \\ 1/\sqrt{2} \end{array}\right], \hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{6} \\ -2/\sqrt{6} \\ 1/\sqrt{6} \end{array}\right],\hspace{24pt} $$

e) 
    The columns of $Q$ form an orthonormal basis for ${\mathbb R}^3$ so $Q$ is orthogonal. Therefore, $QQ^T=I$.

:::

:::exercise {exercise-6-3-003} number=6.3.3 answered=yes src=src/exercises/exercises6-3.xml:298
PROBLEM:
Suppose that

$$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 0 \\ -1 \end{array}\right], \hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}1 \\ 0 \\ 1 \\ 1 \end{array}\right] $$

form an orthogonal basis for a subspace $W$ of ${\mathbb R}^4$.

a) 
    Find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}2 \\ -1 \\ -6 \\ 7 \end{array}\right]$ onto $W$.

b) 
    Find the vector ${\mathbf b}^\perp$ in $W^\perp$ such that ${\mathbf b} = \widehat{{\mathbf b}} + {\mathbf b}^\perp$.

c) 
    Find a basis for $W^\perp$. and express ${\mathbf b}^\perp$ as a linear combination of the basis vectors.

ANSWER:

a) 
    $\widehat{{\mathbf b}} = \left[\begin{array}{r}-1 \\ -2 \\ 1 \\ 3 \end{array}\right]$

b) 
    ${\mathbf b}^\perp = \left[\begin{array}{r}3 \\ 1 \\ -7 \\ 4 \end{array}\right]$

c) 
    A basis for $W^\perp$ is ${\mathbf v}_1=\left[\begin{array}{r}-1 \\ 1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 2 \\ 0 \\ 1 \end{array}\right]$. We then have ${\mathbf b}^\perp = -7{\mathbf v}_1 + 4{\mathbf v}_2$.

SOLUTION:

a) 
    Apply the Projection Formula to find $\widehat{{\mathbf b}} = \left[\begin{array}{r}-1 \\ -2 \\ 1 \\ 3 \end{array}\right]$.

b) 
    ${\mathbf b}^\perp = \left[\begin{array}{r}3 \\ 1 \\ -7 \\ 4 \end{array}\right]$.

c) 
    Constructing a matrix $A$ whose columns are ${\mathbf w}_1$ and ${\mathbf w}_2$ allows us to find a basis for $W^\perp=\text{Nul}(A^T)$. This gives the basis ${\mathbf v}_1=\left[\begin{array}{r}-1 \\ 1 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 2 \\ 0 \\ 1 \end{array}\right]$. We then have ${\mathbf b}^\perp = -7{\mathbf v}_1 + 4{\mathbf v}_2$.

:::

:::exercise {exercise-6-3-004} number=6.3.4 answered=yes src=src/exercises/exercises6-3.xml:386
PROBLEM:
Consider the vectors

$$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 0 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}0 \\ 0 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf b}=\left[\begin{array}{r}2 \\ -4 \\ 1 \\ 3 \end{array}\right]. $$

a) 
    If $L$ is the line defined by the vector ${\mathbf w}_1$, find the vector in $L$ closest to ${\mathbf b}$. Call this vector $\widehat{{\mathbf b}}_1$.

b) 
    If $W$ is the subspace spanned by ${\mathbf w}_1$ and ${\mathbf w}_2$, find the vector in $W$ closest to ${\mathbf b}$. Call this vector $\widehat{{\mathbf b}}_2$.

c) 
    Determine whether $\widehat{{\mathbf b}}_1$ or $\widehat{{\mathbf b}}_2$ is closer to ${\mathbf b}$ and explain why.

ANSWER:

a) 
    $\widehat{{\mathbf b}}_1 = \left[\begin{array}{r}-1 \\ -1 \\ 0 \\ 0 \end{array}\right]$

b) 
    $\widehat{{\mathbf b}}_2 = \left[\begin{array}{r}-1 \\ -1 \\ 2 \\ 2 \end{array}\right]$

c) 
    $\widehat{{\mathbf b}}_2$

SOLUTION:

a) 
    Applying the Projection Formula gives $\widehat{{\mathbf b}}_1 = \left[\begin{array}{r}-1 \\ -1 \\ 0 \\ 0 \end{array}\right]$

b) 
    Applying the Projection Formula gives $\widehat{{\mathbf b}}_2 = \left[\begin{array}{r}-1 \\ -1 \\ 2 \\ 2 \end{array}\right]$

c) 
    $\widehat{{\mathbf b}}_2$ is the closest vector in $W$ to ${\mathbf b}$. Since $L$ is contained in $W$, $\widehat{{\mathbf b}}_1$ cannot be closer. Therefore, $\widehat{{\mathbf b}}_2$ must be closer to ${\mathbf b}$ than $\widehat{{\mathbf b}}_1$.

:::

:::exercise {exercise-6-3-005} number=6.3.5 answered=yes src=src/exercises/exercises6-3.xml:470
PROBLEM:
Suppose that ${\mathbf w}=\left[\begin{array}{r}2 \\ -1 \\ 2 \end{array}\right]$ defines a line $L$ in ${\mathbb R}^3$.

a) 
    Find the orthogonal projections of the vectors $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$, $\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]$, $\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$ onto $L$.

b) 
    Find the matrix $P = \frac{1}{\left|{\mathbf w}\right|^2} {\mathbf w} {\mathbf w}^T$.

c) 
    Use [Proposition 2.5.6](ref:2.5#prop-linear-trans-columns) to explain why the columns of $P$ are related to the orthogonal projections you found in the first part of this exercise.

ANSWER:

a) 

    $$ \left[\begin{array}{r}4/9 \\ -2/9 \\ 4/9 \end{array}\right],\hspace{24pt} \left[\begin{array}{r}-2/9 \\ 1/9 \\ 4/9 \end{array}\right],\hspace{24pt} \left[\begin{array}{r}4/9 \\ -2/9 \\ 4/9 \end{array}\right] $$

b) 
    $P=\begin{bmatrix} 4/9 & -2/9 & 4/9\\ -2/9 & 1/9 & -2/9\\ 4/9 & -2/9 & 4/9\\ \end{bmatrix}$

c) 
    The columns of $P$ are the results of projecting the standard basis vectors onto $L$.

SOLUTION:

a) 
    Applying the Projection Formula gives the projections

    $$ \left[\begin{array}{r}4/9 \\ -2/9 \\ 4/9 \end{array}\right],\hspace{24pt} \left[\begin{array}{r}-2/9 \\ 1/9 \\ 4/9 \end{array}\right],\hspace{24pt} \left[\begin{array}{r}4/9 \\ -2/9 \\ 4/9 \end{array}\right] $$

b) 
    $P=\begin{bmatrix} 4/9 & -2/9 & 4/9\\ -2/9 & 1/9 & -2/9\\ 4/9 & -2/9 & 4/9\\ \end{bmatrix}$

c) 
    If ${\mathbf u} = \frac{1}{\left|{\mathbf w}\right|}{\mathbf w}$, then $P={\mathbf u}{\mathbf u}^T$, which projects vectors orthogonally onto $L$. The columns of $P$ are the results of projecting the standard basis vectors onto $L$.

:::

:::exercise {exercise-6-3-006} number=6.3.6 answered=yes src=src/exercises/exercises6-3.xml:572
PROBLEM:
Suppose that

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \\ 3 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}2 \\ 2 \\ 2 \end{array}\right] $$

form the basis for a plane $W$ in ${\mathbb R}^3$.

a) 
    Find a basis for the line that is the orthogonal complement $W^\perp$.

b) 
    Given the vector ${\mathbf b}=\left[\begin{array}{r}6 \\ -6 \\ 2 \end{array}\right]$, find ${\mathbf y}$, the orthogonal projection of ${\mathbf b}$ onto the line $W^\perp$.

c) 
    Explain why the vector ${\mathbf z} = {\mathbf b}-{\mathbf y}$ must be in $W$ and write ${\mathbf z}$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

ANSWER:

a) 
    $\left[\begin{array}{r}-3 \\ 2 \\ 1 \end{array}\right]$

b) 
    ${\mathbf y} = \left[\begin{array}{r}6 \\ -4 \\ -2 \end{array}\right]$

c) 
    ${\mathbf z} = \left[\begin{array}{r}0 \\ -2 \\ 4 \end{array}\right] = 2{\mathbf v}_1-{\mathbf v}_2$.

SOLUTION:

a) 
    A basis vector is $\left[\begin{array}{r}-3 \\ 2 \\ 1 \end{array}\right]$

b) 
    ${\mathbf y} = \left[\begin{array}{r}6 \\ -4 \\ -2 \end{array}\right]$

c) 
    ${\mathbf y}$ is the orthogonal projection of ${\mathbf b}$ onto $W^\perp$ so ${\mathbf z}={\mathbf b}-{\mathbf y}$ must be orthogonal to $W^\perp$, which means that it is in $W$. We see that ${\mathbf z} = \left[\begin{array}{r}0 \\ -2 \\ 4 \end{array}\right] = 2{\mathbf v}_1-{\mathbf v}_2$.

:::

:::exercise {exercise-6-3-007} number=6.3.7 answered=yes src=src/exercises/exercises6-3.xml:657
PROBLEM:
Determine whether the following statements are true or false and explain your thinking.

a) 
    If the columns of $Q$ form an orthonormal basis for a subspace $W$ and ${\mathbf w}$ is a vector in $W$, then $QQ^T{\mathbf w} = {\mathbf w}$.

b) 
    An orthogonal set of vectors in ${\mathbb R}^8$ can have no more than 8 vectors.

c) 
    If $Q$ is a $7\times5$ matrix whose columns are orthonormal, then $QQ^T = I_7$.

d) 
    If $Q$ is a $7\times5$ matrix whose columns are orthonormal, then $Q^TQ = I_5$.

e) 
    If the orthogonal projection of ${\mathbf b}$ onto a subspace $W$ satisfies $\widehat{{\mathbf b}} = {\mathbf 0}$, then ${\mathbf b}$ is in $W^\perp$.

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
    True

SOLUTION:

a) 
    True, because ${\mathbf w}$ is the closest vector in $W$ to ${\mathbf w}$. Therefore, $\widehat{{\mathbf w}} = QQ^T{\mathbf w} = {\mathbf w}$.

b) 
    True, because the orthogonal set of vectors is linearly independent.

c) 
    False, $QQ^T$ projects vectors orthogonally onto the 5-dimensional subspace $\text{Col}(A)$.

d) 
    True, because $Q^TQ$ computes the dot products between the columns of $Q$

e) 
    True, because ${\mathbf b}=\widehat{{\mathbf b}}+{\mathbf b}^\perp = {\mathbf b}^\perp$. Therefore, ${\mathbf b}$ is in $W^\perp$.

:::

:::exercise {exercise-6-3-008} number=6.3.8 answered=yes src=src/exercises/exercises6-3.xml:771
PROBLEM:
Suppose that $Q$ is an orthogonal matrix.

a) 
    Remembering that ${\mathbf v}\cdot{\mathbf w}={\mathbf v}^T{\mathbf w}$, explain why

    $$ Q{\mathbf x}\cdot(Q{\mathbf y}) = {\mathbf x}\cdot{\mathbf y}. $$

b) 
    Explain why $\left|Q{\mathbf x}\right| = \left|{\mathbf x}\right|$.

    This means that the length of a vector is unchanged after multiplying by an orthogonal matrix.

c) 
    If $\lambda$ is a real eigenvalue of $Q$, explain why $\lambda=\pm1$.

ANSWER:

a) 
    $Q{\mathbf x}\cdot(Q{\mathbf y}) = (Q{\mathbf x})^T\cdot(Q{\mathbf y}) = {\mathbf x}^TQ^TQ{\mathbf y} = {\mathbf x}^T{\mathbf y}={\mathbf x}\cdot{\mathbf y}$.

b) 
    $\left|Q{\mathbf x}\right|^2 = (Q{\mathbf x})\cdot(Q{\mathbf x}) = {\mathbf x}\cdot{\mathbf x} = \left|{\mathbf x}\right|^2$

c) 
    If $Q{\mathbf v} = \lambda{\mathbf v}$, then $\left|Q{\mathbf v}\right| = |\lambda|\left|{\mathbf v}\right|=\left|{\mathbf v}\right|$ so $|\lambda|=1$

SOLUTION:

a) 
    $Q{\mathbf x}\cdot(Q{\mathbf y}) = (Q{\mathbf x})^T\cdot(Q{\mathbf y}) = {\mathbf x}^TQ^TQ{\mathbf y} = {\mathbf x}^T{\mathbf y}={\mathbf x}\cdot{\mathbf y}$.

b) 
    $\left|Q{\mathbf x}\right|^2 = (Q{\mathbf x})\cdot(Q{\mathbf x}) = {\mathbf x}\cdot{\mathbf x} = \left|{\mathbf x}\right|^2$

c) 
    If $Q{\mathbf v} = \lambda{\mathbf v}$, then $\left|Q{\mathbf v}\right| = |\lambda|\left|{\mathbf v}\right|=\left|{\mathbf v}\right|$ so $|\lambda|=1$

:::

:::exercise {exercise-6-3-009} number=6.3.9 answered=yes src=src/exercises/exercises6-3.xml:860
PROBLEM:
Explain why the following statements are true.

a) 
    If $Q$ is an orthogonal matrix, then $\det Q = \pm 1$.

b) 
    If $Q$ is a $8\times 4$ matrix whose columns are orthonormal, then $QQ^T$ is an $8\times8$ matrix whose rank is 4.

c) 
    If $\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto a subspace $W$, then ${\mathbf b}-\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto $W^\perp$.

ANSWER:

a) 
    Since $Q^TQ=I$, we have $\det(Q^TQ)=\det(I)=1$.

b) 
    The four columns of $Q$ form a basis for the column space $\text{Col}(QQ^T)$

c) 
    If ${\mathbf b}^\perp={\mathbf b}-\widehat{{\mathbf b}}$, then ${\mathbf b}-{\mathbf b}^\perp = \widehat{{\mathbf b}}$ is in $W$.

SOLUTION:

a) 
    Since $Q^TQ=I$, we have $\det(Q^TQ)=\det(Q^T)\det(Q)=(\det(Q))^2 = \det(I) = 1$

b) 
    The columns of $Q$ form an orthonormal basis for $W$, a 4-dimensional subspace of ${\mathbb R}^8$. Therefore, $QQ^T$ projects vectors orthogonally onto $W$ so $\text{Col}(QQ^T)=W$ and $\operatorname{rank}(QQ^T)=4$.

c) 
    If ${\mathbf b}^\perp={\mathbf b}-\widehat{{\mathbf b}}$, then ${\mathbf b}-{\mathbf b}^\perp = \widehat{{\mathbf b}}$ is in $W$, the orthogonal complement of $W^\perp$. This means that ${\mathbf b}^\perp$ is the orthogonal projection of ${\mathbf b}$ onto $W^\perp$.

:::

:::exercise {exercise-6-3-010} number=6.3.10 answered=yes src=src/exercises/exercises6-3.xml:950
PROBLEM:
This exercise is about $2\times2$ orthogonal matrices.

a) 
    In [Section 2.6](ref:2.6#sec-transforms-geom), we saw that the matrix $\begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}$ represents a rotation by an angle $\theta$. Explain why this matrix is an orthogonal matrix.

b) 
    We also saw that the matrix $\begin{bmatrix} \cos\theta & \sin\theta \\ \sin\theta & -\cos\theta \end{bmatrix}$ represents a reflection in a line. Explain why this matrix is an orthogonal matrix.

c) 
    Suppose that ${\mathbf u}_1=\left[\begin{array}{r}\cos\theta \\ \sin\theta \end{array}\right]$ is a 2-dimensional unit vector. Use a sketch to indicate all the possible vectors ${\mathbf u}_2$ such that ${\mathbf u}_1$ and ${\mathbf u}_2$ form an orthonormal basis of ${\mathbb R}^2$.

d) 
    Explain why every $2\times2$ orthogonal matrix is either a rotation or a reflection.

ANSWER:

a) 
    $Q^TQ=I$.

b) 
    $Q^TQ=I$.

c) 
    ${\mathbf u}_2=\left[\begin{array}{r}-\sin\theta \\ \cos\theta \end{array}\right]$ or $\left[\begin{array}{r}\sin\theta \\ -\cos\theta \end{array}\right]$

d) 
    The first column of $Q$ has the form ${\mathbf u}_1=\left[\begin{array}{r}\cos\theta \\ \sin\theta \end{array}\right]$. Now apply the result of the last part of this problem.

SOLUTION:

a) 
    If this matrix is $Q$, we have $Q^TQ=I$.

b) 
    If this matrix is $Q$, we have $Q^TQ=I$.

c) 
    ${\mathbf u}_2=\left[\begin{array}{r}-\sin\theta \\ \cos\theta \end{array}\right]$ or $\left[\begin{array}{r}\sin\theta \\ -\cos\theta \end{array}\right]$

d) 
    If $Q=\begin{bmatrix}{\mathbf u}_1&{\mathbf u}_2\end{bmatrix}$ is an orthogonal $2\times2$ matrix, then ${\mathbf u}_1$ is a unit vector and has the form ${\mathbf u}_1=\left[\begin{array}{r}\cos\theta \\ \sin\theta \end{array}\right]$ for some angle $\theta$. By the last part of this problem, there are only two choices for ${\mathbf u}_2$, one of which gives a rotation and one of which gives a reflection.

:::
