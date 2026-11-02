# 6.2 Orthogonal complements and the matrix transpose {sec-transpose}

We've now seen how the dot product enables us to determine the angle between two vectors and, more specifically, when two vectors are orthogonal. Moving forward, we will explore how the orthogonality condition simplifies many common tasks, such as expressing a vector as a linear combination of a given set of vectors.
This section introduces the notion of an orthogonal complement, the set of vectors each of which is orthogonal to a prescribed subspace. We'll also find a way to describe dot products using matrix products, which allows us to study orthogonality using many of the tools for understanding linear systems that we developed earlier.

## 6.2.1 Introduction

:::exploration {act:preview-6-2-1} Preview Activity 6.2.1
PROBLEM:
a) Sketch the vector ${\mathbf v}=\left[\begin{array}{r}-1 \\ 2 \end{array}\right]$ on [Figure 6.2.1](ref:fig-pa-6-2) and one vector that is orthogonal to it.
    > FIGURE {fig:fig-pa-6-2} number=6.2.1 src=../../media/ch06/empty-4.svg
    > alt: A coordinate grid and set of axes.
    > width: 50%
    > caption: Sketch the vector ${\mathbf v}$ and one vector orthogonal to it.
b) If a vector ${\mathbf x}$ is orthogonal to ${\mathbf v}$, what do we know about the dot product ${\mathbf v}\cdot{\mathbf x}$?
c) If we write ${\mathbf x}=\left[\begin{array}{r}x \\ y \end{array}\right]$, use the dot product to write an equation for the vectors orthogonal to ${\mathbf v}$ in terms of $x$ and $y$.
d) Use this equation to sketch the set of all vectors orthogonal to ${\mathbf v}$ in [Figure 6.2.1](ref:fig-pa-6-2).
e) [Section 3.5](ref:3.5#sec-subspaces) introduced the column space $\text{Col}(A)$ and null space $\text{Nul}(A)$ of a matrix $A$. If $A$ is a matrix, what is the meaning of the null space $\text{Nul}(A)$?
f) What is the meaning of the column space $\text{Col}(A)$?
SOLUTION:
a) The vector ${\mathbf w}=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ is an example of a vector orthogonal to ${\mathbf v}$.
b) The dot product must be zero.
c) ${\mathbf v}\cdot{\mathbf x} = -x+2y = 0$.
d) This is the line $y=\frac12 x$.
e) It is the set of vectors ${\mathbf x}$ for which $A{\mathbf x} = {\mathbf 0}$.
f) It is the set of vector ${\mathbf b}$ for which the equation $A{\mathbf x}={\mathbf b}$ is consistent.
:::

## 6.2.2 Orthogonal complements

The preview activity presented us with a vector ${\mathbf v}$ and led us through the process of describing all the vectors orthogonal to ${\mathbf v}$. Notice that the set of scalar multiples of ${\mathbf v}$ describes a line $L$, a 1-dimensional subspace of ${\mathbb R}^2$. We then described a second line consisting of all the vectors orthogonal to ${\mathbf v}$. Notice that every vector on this line is orthogonal to every vector on the line $L$. We call this new line the *orthogonal complement* of $L$ and denote it by $L^\perp$. The lines $L$ and $L^\perp$ are illustrated on the left of [Figure 6.2.2](ref:fig-orthog-comps).

> FIGURE {fig:fig-orthog-comps} number=6.2.2 src=../../media/ch06/orthog-lines.svg
> alt: A line in two dimensions and its orthogonal complement.
> caption: On the left is a line $L$ and its orthogonal complement $L^\perp$. On the right is a plane $W$ and its orthogonal complement $W^\perp$ in ${\mathbb R}^3$.
> subfigure src=../../media/ch06/orthog-lines.svg alt: A line in two dimensions and its orthogonal complement.
> subfigure src=../../media/ch06/orthog-comp.svg alt: A plane in three dimensions and its orthogonal complement.

The next definition places this example into a more general context.

:::definition {def:definition-6-2-3} Definition 6.2.3
Given a subspace $W$ of ${\mathbb R}^m$, the *orthogonal complement*{index:orthogonal complement} of $W$ is the set of vectors in ${\mathbb R}^m$ each of which is orthogonal to every vector in $W$. We denote the orthogonal complement by $W^\perp$.
:::

A typical example appears on the right of [Figure 6.2.2](ref:fig-orthog-comps). Here we see a plane $W$, a two-dimensional subspace of ${\mathbb R}^3$, and its orthogonal complement $W^\perp$, which is a line in ${\mathbb R}^3$.

As the next activity demonstrates, the orthogonal complement of a subspace $W$ is itself a subspace of ${\mathbb R}^m$.

:::activity {act:activity-6-2-2} Activity 6.2.2
Suppose that ${\mathbf w}_1=\left[\begin{array}{r}1 \\ 0 \\ -2 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}1 \\ 1 \\ -1 \end{array}\right]$ form a basis for $W$, a two-dimensional subspace of ${\mathbb R}^3$. We will find a description of the orthogonal complement $W^\perp$.

a) 
    Suppose that the vector ${\mathbf x}$ is orthogonal to ${\mathbf w}_1$. If we write ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]$, use the fact that ${\mathbf w}_1\cdot{\mathbf x} = 0$ to write a linear equation for $x_1$, $x_2$, and $x_3$.

b) 
    Suppose that ${\mathbf x}$ is also orthogonal to ${\mathbf w}_2$. In the same way, write a linear equation for $x_1$, $x_2$, and $x_3$ that arises from the fact that ${\mathbf w}_2\cdot{\mathbf x} = 0$.

c) 
    If ${\mathbf x}$ is orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$, these two equations give us a linear system $B{\mathbf x}={\mathbf 0}$ for some matrix $B$. Identify the matrix $B$ and write a parametric description of the solution space to the equation $B{\mathbf x} = {\mathbf 0}$.

d) 
    Since ${\mathbf w}_1$ and ${\mathbf w}_2$ form a basis for the two-dimensional subspace $W$, any vector ${\mathbf w}$ in $W$ can be written as a linear combination

    $$ {\mathbf w} = c_1{\mathbf w}_1 + c_2{\mathbf w}_2\text{.} $$

    If ${\mathbf x}$ is orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$, use the distributive property of dot products to explain why ${\mathbf x}$ is orthogonal to ${\mathbf w}$.

e) 
    Give a basis for the orthogonal complement $W^\perp$ and state the dimension $\dim W^\perp$.

f) 
    Describe $(W^\perp)^\perp$, the orthogonal complement of $W^\perp$.

ANSWER:

a) 
    ${\mathbf w}_1\cdot{\mathbf x} = x_1 - 2x_3 = 0$.

b) 
    ${\mathbf w}_2\cdot{\mathbf x} = x_1+x_2 - x_3 = 0$.

c) 
    $B = \begin{bmatrix} 1 & 0 & -2 \\ 1 & 1 & -1 \\ \end{bmatrix}$ so ${\mathbf x}=x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

d) 
    By distributivity, $(c_1{\mathbf w}_1+c_2{\mathbf w}_2)\cdot{\mathbf x}= c_1{\mathbf w}_1\cdot{\mathbf x} + c_2{\mathbf w}_2\cdot{\mathbf x} = 0$.

e) 
    A basis consists of $\left[\begin{array}{r}1 \\ -1 \\ 1 \end{array}\right]$, and $W^\perp$ is one-dimensional.

f) 
    The orthogonal complement of $W^\perp$ is $W$.

SOLUTION:

a) 
    We have the equation ${\mathbf w}_1\cdot{\mathbf x} = x_1 - 2x_3 = 0$.

b) 
    We have the equation ${\mathbf w}_2\cdot{\mathbf x} = x_1+x_2 - x_3 = 0$.

c) 
    These two equations give $B{\mathbf x}={\mathbf 0}$ where

    $$ B = \begin{bmatrix} 1 & 0 & -2 \\ 1 & 1 & -1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & 0 & -2 \\ 0 & 1 & 1 \\ \end{bmatrix}\text{,} $$

    whose solutions have the parametric form ${\mathbf x}=x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

d) 
    By distributivity, $(c_1{\mathbf w}_1+c_2{\mathbf w}_2)\cdot{\mathbf x}= c_1{\mathbf w}_1\cdot{\mathbf x} + c_2{\mathbf w}_2\cdot{\mathbf x} = 0$.

e) 
    $W^\perp$ is the solution space to the equation $B{\mathbf x}={\mathbf 0}$. Therefore, a basis consists of the single vector $\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$, and $W^\perp$ is one-dimensional.

f) 
    Since every vector in $W^\perp$ is orthogonal to every vector in $W$, the orthogonal complement of $W^\perp$ is $W$.

:::

:::example {ex:example-orthog-comp-line} Example 6.2.4
If $L$ is the line defined by ${\mathbf v}=\left[\begin{array}{r}1 \\ -2 \\ 3 \end{array}\right]$ in ${\mathbb R}^3$, we will describe the orthogonal complement $L^\perp$, the set of vectors orthogonal to $L$.
If ${\mathbf x}$ is orthogonal to $L$, it must be orthogonal to ${\mathbf v}$ so we have

$$ {\mathbf v}\cdot{\mathbf x} = x_1-2x_2+3x_3 = 0\text{.} $$

We can describe the solutions to this equation parametrically as

$$ {\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right] = \left[\begin{array}{c}2x_2-3x_3 \\ x_2 \\ x_3 \end{array}\right] = x_2\left[\begin{array}{r}2 \\ 1 \\ 0 \end{array}\right]+x_3\left[\begin{array}{r}-3 \\ 0 \\ 1 \end{array}\right]\text{.} $$

Therefore, the orthogonal complement $L^\perp$ is a plane, a two-dimensional subspace of ${\mathbb R}^3$, spanned by the vectors $\left[\begin{array}{r}2 \\ 1 \\ 0 \end{array}\right]$ and $\left[\begin{array}{r}-3 \\ 0 \\ 1 \end{array}\right]$.
:::

:::example {ex:example-orthog-comp-gen} Example 6.2.5
Suppose that $W$ is the $2$-dimensional subspace of ${\mathbb R}^5$ with basis

$$ {\mathbf w}_1=\left[\begin{array}{r}-1 \\ -2 \\ 2 \\ 3 \\ -4 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}2 \\ 4 \\ 2 \\ 0 \\ 2 \\ \end{array}\right]\text{.} $$

We will give a description of the orthogonal complement $W^\perp$.
If ${\mathbf x}$ is in $W^\perp$, we know that ${\mathbf x}$ is orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$. Therefore,

$$ \begin{aligned} {\mathbf w}_1\cdot{\mathbf x} & {}={}-x_1-2x_2+2x_3+3x_4-4x_5 & {}={} 0 \\ {\mathbf w}_2\cdot{\mathbf x} & {}={} 2x_1+4x_2+2x_3+0x_4+2x_5 & {}={} 0 \end{aligned} $$

In other words, $B{\mathbf x}={\mathbf 0}$ where

$$ B = \begin{bmatrix} -1 & -2 & 2 & 3 & -4 \\ 2 & 4 & 2 & 0 & 2 \end{bmatrix} \sim \begin{bmatrix} 1 & 2 & 0 & -1 & 2 \\ 0 & 0 & 1 & 1 & -1 \end{bmatrix}\text{.} $$

The solutions may be described parametrically as

$$ {\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \\ x_4 \\ x_5 \\ \end{array}\right] =x_2\left[\begin{array}{r}-2 \\ 1 \\ 0 \\ 0 \\ 0 \\ \end{array}\right] + x_4\left[\begin{array}{r}1 \\ 0 \\ -1 \\ 1 \\ 0 \\ \end{array}\right] + x_5\left[\begin{array}{r}-2 \\ 0 \\ 1 \\ 0 \\ 1 \\ \end{array}\right]\text{.} $$

The distributive property of dot products implies that any vector that is orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$ is also orthogonal to any linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$ since

$$ (c_1{\mathbf w}_1 + c_2{\mathbf w}_2)\cdot{\mathbf x} = c_1{\mathbf w}_1\cdot{\mathbf x} + c_2{\mathbf w}_2\cdot{\mathbf x} = 0\text{.} $$

Therefore, $W^\perp$ is a $3$-dimensional subspace of ${\mathbb R}^5$ with basis

$$ {\mathbf v}_1=\left[\begin{array}{r}-2 \\ 1 \\ 0 \\ 0 \\ 0 \\ \end{array}\right], \hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}1 \\ 0 \\ -1 \\ 1 \\ 0 \\ \end{array}\right], \hspace{24pt} {\mathbf v}_3=\left[\begin{array}{r}-2 \\ 0 \\ 1 \\ 0 \\ 1 \\ \end{array}\right]\text{.} $$

One may check that the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ are each orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$.
:::

## 6.2.3 The matrix transpose

The previous activity and examples show how we can describe the orthogonal complement of a subspace as the solution set of a particular linear system. We will make this connection more explicit by defining a new matrix operation called the *transpose*.

:::definition {def:definition-6-2-6} Definition 6.2.6
The *transpose*{index:transpose} of the $m\times n$ matrix $A$ is the $n\times m$ matrix $A^T$ whose rows are the columns of $A$.
:::

:::example {ex:example-6-2-7} Example 6.2.7
If $A=\begin{bmatrix} 4 & -3 & 0 & 5 \\ -1 & 2 & 1 & 3 \\ \end{bmatrix}$, then $A^T=\begin{bmatrix} 4 & -1 \\ -3 & 2 \\ 0 & 1 \\ 5 & 3 \\ \end{bmatrix}$
:::

:::activity {act:activity-6-2-3} Activity 6.2.3
This activity illustrates how multiplying a vector by $A^T$ is related to computing dot products with the columns of $A$. You'll develop a better understanding of this relationship if you compute the dot products and matrix products in this activity without using technology.

a) 
    If $B = \begin{bmatrix} 3 & 4 \\ -1 & 2 \\ 0 & -2 \\ \end{bmatrix}$, write the matrix $B^T$.

b) 
    Suppose that

    $$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ 0 \\ -2 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}1 \\ 1 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf w}=\left[\begin{array}{r}-2 \\ 2 \\ 3 \end{array}\right]\text{.} $$

    Find the dot products ${\mathbf v}_1\cdot{\mathbf w}$ and ${\mathbf v}_2\cdot{\mathbf w}$.

c) 
    Now write the matrix $A = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}$ and its transpose $A^T$. Find the product $A^T{\mathbf w}$ and describe how this product computes both dot products ${\mathbf v}_1\cdot{\mathbf w}$ and ${\mathbf v}_2\cdot{\mathbf w}$.

d) 
    Suppose that ${\mathbf x}$ is a vector that is orthogonal to both ${\mathbf v}_1$ and ${\mathbf v}_2$. What does this say about the dot products ${\mathbf v}_1\cdot{\mathbf x}$ and ${\mathbf v}_2\cdot{\mathbf x}$? What does this say about the product $A^T{\mathbf x}$?

e) 
    Use the matrix $A^T$ to give a parametric description of all the vectors ${\mathbf x}$ that are orthogonal to ${\mathbf v}_1$ and ${\mathbf v}_2$.

f) 
    Remember that $\text{Nul}(A^T)$, the null space of $A^T$, is the solution set of the equation $A^T{\mathbf x}={\mathbf 0}$. If ${\mathbf x}$ is a vector in $\text{Nul}(A^T)$, explain why ${\mathbf x}$ must be orthogonal to both ${\mathbf v}_1$ and ${\mathbf v}_2$.

g) 
    Remember that $\text{Col}(A)$, the column space of $A$, is the set of linear combinations of the columns of $A$. Therefore, any vector in $\text{Col}(A)$ can be written as $c_1{\mathbf v}_1+c_2{\mathbf v}_2$. If ${\mathbf x}$ is a vector in $\text{Nul}(A^T)$, explain why ${\mathbf x}$ is orthogonal to every vector in $\text{Col}(A)$.

ANSWER:

a) 
    $A^T = \begin{bmatrix} 3 & -1 & 0 \\ 4 & 2 & -2 \end{bmatrix}$

b) 
    ${\mathbf v}_1\cdot{\mathbf w} =-10$, ${\mathbf v}_2\cdot{\mathbf w} =6$.

c) 

    $$ A^T{\mathbf w} =\left[\begin{array}{r}{\mathbf v}_1\cdot{\mathbf w} \\ {\mathbf v}_2\cdot{\mathbf w} \end{array}\right] $$

d) 
    $A^T{\mathbf x} = {\mathbf 0}$.

e) 
    ${\mathbf x}=x_3\left[\begin{array}{r}1 \\ -3 \\ 1 \end{array}\right]$.

f) 
    $A^T{\mathbf x} = \left[\begin{array}{r}{\mathbf v}_1\cdot{\mathbf x} \\ {\mathbf v}_2\cdot{\mathbf x} \end{array}\right] = \left[\begin{array}{r}0 \\ 0 \end{array}\right]$.

g) 
    Apply the distributive property of dot products.

SOLUTION:

a) 
    $A^T = \begin{bmatrix} 3 & -1 & 0 \\ 4 & 2 & -2 \end{bmatrix}$

b) 

    $$ \begin{aligned} {\mathbf v}_1\cdot{\mathbf w} &{}={} 2(-2) + 0(2) + (-2)3 &{}={} -10 \\ {\mathbf v}_2\cdot{\mathbf w} &{}={} 1(-2) + 1(2) + 2(3) &{}={} 6 \end{aligned} $$

c) 

    $$ A^T{\mathbf w} = \left[\begin{array}{r}2(-2)+0(2)+(-2)3 \\ 1(-2)+1(2)+2(3) \end{array}\right] = \left[\begin{array}{r}-10 \\ 6 \end{array}\right] =\left[\begin{array}{r}{\mathbf v}_1\cdot{\mathbf w} \\ {\mathbf v}_2\cdot{\mathbf w} \end{array}\right] $$

d) 
    Both dot products are 0 so we have $A^T{\mathbf x} = {\mathbf 0}$.

e) 
    We need to solve the equation $A^T{\mathbf x} = {\mathbf 0}$ so we find the reduced row echelon form

    $$ A^T \sim \begin{bmatrix} 1 & 0 & -1 \\ 0 & 1 & 3\\ \end{bmatrix}\text{.} $$

    The vectors orthogonal to both ${\mathbf v}_1$ and ${\mathbf v}_2$ have the form ${\mathbf x}=x_3\left[\begin{array}{r}1 \\ -3 \\ 1 \end{array}\right]$.

f) 
    $A^T{\mathbf x} = \left[\begin{array}{r}{\mathbf v}_1\cdot{\mathbf x} \\ {\mathbf v}_2\cdot{\mathbf x} \end{array}\right] = \left[\begin{array}{r}0 \\ 0 \end{array}\right]$ tells us that ${\mathbf v}_1\cdot{\mathbf x}=0$ and ${\mathbf v}_2\cdot{\mathbf x}=0$.

g) 
    Since ${\mathbf x}$ is orthogonal to both ${\mathbf v}_1$ and ${\mathbf v}_2$, we have

    $$ (c_1{\mathbf v}_1+c_2{\mathbf v}_2)\cdot{\mathbf x} = c_1{\mathbf v}_1\cdot{\mathbf x} + c_2{\mathbf v}_2\cdot{\mathbf x} = 0 $$

:::

The previous activity demonstrates an important connection between the matrix transpose and dot products. More specifically, the components of the product $A^T{\mathbf x}$ are simply the dot products of the columns of $A$ with ${\mathbf x}$. We will make frequent use of this observation so let's record it as a proposition.

:::proposition {prop:prop-transpose-multiplication} Proposition 6.2.8
If $A$ is the matrix whose columns are ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$, then

$$ A^T{\mathbf x} = \begin{bmatrix} {\mathbf v}_1\cdot{\mathbf x} \\ {\mathbf v}_2\cdot{\mathbf x} \\ \vdots \\ {\mathbf v}_n\cdot{\mathbf x} \\ \end{bmatrix} $$

:::

:::example {ex:example-6-2-9} Example 6.2.9
Suppose that $W$ is a subspace of ${\mathbb R}^4$ having basis

$$ {\mathbf w}_1=\left[\begin{array}{r}1 \\ 0 \\ 2 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}2 \\ 1 \\ 3 \\ 4 \end{array}\right]\text{,} $$

and that we wish to describe the orthogonal complement $W^\perp$.
If $A$ is the matrix $A = \begin{bmatrix}{\mathbf w}_1 & {\mathbf w}_2\end{bmatrix}$ and ${\mathbf x}$ is in $W^\perp$, we have

$$ A^T{\mathbf x} = \left[\begin{array}{r}{\mathbf w}_1\cdot{\mathbf x} \\ {\mathbf w}_2\cdot{\mathbf x} \end{array}\right] = \left[\begin{array}{r}0 \\ 0 \end{array}\right]\text{.} $$

Describing vectors ${\mathbf x}$ that are orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$ is therefore equivalent to the more familiar task of describing the solution set $A^T{\mathbf x} = {\mathbf 0}$. To do so, we find the reduced row echelon form of $A^T$ and write the solution set parametrically as

$$ {\mathbf x} = x_3\left[\begin{array}{r}-2 \\ 1 \\ 1 \\ 0 \end{array}\right] + x_4\left[\begin{array}{r}-1 \\ -2 \\ 0 \\ 1 \end{array}\right]\text{.} $$

Once again, the distributive property of dot products tells us that such a vector is also orthogonal to any linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$ so this solution set is, in fact, the orthogonal complement $W^\perp$. Indeed, we see that the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}-2 \\ 1 \\ 1 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}-1 \\ -2 \\ 0 \\ 1 \end{array}\right] $$

form a basis for $W^\perp$, which is a two-dimensional subspace of ${\mathbb R}^4$.
:::

To place this example in a slightly more general context, note that ${\mathbf w}_1$ and ${\mathbf w}_2$, the columns of $A$, form a basis of $W$. Since $\text{Col}(A)$, the column space of $A$ is the subspace of linear combinations of the columns of $A$, we have $W=\text{Col}(A)$.

This example also shows that the orthogonal complement $W^\perp = \text{Col}(A)^\perp$ is described by the solution set of $A^T{\mathbf x} = {\mathbf 0}$. This solution set is what we have called $\text{Nul}(A^T)$, the null space of $A^T$. In this way, we see the following proposition, which is visually represented in [Figure 6.2.11](ref:fig-orthog-comp).

:::proposition {prop:prop-col-orthog} Proposition 6.2.10
For any matrix $A$, the orthogonal complement of $\text{Col}(A)$ is $\text{Nul}(A^T)$; that is,

$$ \text{Col}(A)^\perp = \text{Nul}(A^T)\text{.} $$

:::

> FIGURE {fig:fig-orthog-comp} number=6.2.11 src=../../media/ch06/nul-at.svg
> alt: The column space of a matrix and the null space of its transpose.
> width: 45%
> caption: The orthogonal complement of the column space of $A$ is the null space of $A^T$.

## 6.2.4 Properties of the matrix transpose

The transpose is a simple algebraic operation performed on a matrix. The next activity explores some of its properties.

:::activity {act:activity-6-2-4} Activity 6.2.4
In Sage, the transpose of a matrix `A` is given by `A.T`. Define the matrices

$$ A = \begin{bmatrix} 1 & 0 & -3 \\ 2 & -2 & 1 \\ \end{bmatrix}, \hspace{6pt} B = \begin{bmatrix} 3 & -4 & 1 \\ 0 & 1 & 2 \\ \end{bmatrix}, \hspace{6pt} C= \begin{bmatrix} 1 & 0 & -3 \\ 2 & -2 & 1 \\ 3 & 2 & 0 \\ \end{bmatrix} $$

.
:::sage
```sage

```
:::

a) 
    Evaluate $(A+B)^T$ and $A^T+B^T$. What do you notice about the relationship between these two matrices?

b) 
    What happens if you transpose a matrix twice; that is, what is $(A^T)^T$?

c) 
    Find $\det(C)$ and $\det(C^T)$. What do you notice about the relationship between these determinants?

d) 

    1. 
        Find the product $AC$ and its transpose $(AC)^T$.

    2. 
        Is it possible to compute the product $A^TC^T$? Explain why or why not.

    3. 
        Find the product $C^TA^T$ and compare it to $(AC)^T$. What do you notice about the relationship between these two matrices?

e) 
    What is the transpose of the identity matrix $I$?

f) 
    If a square matrix $D$ is invertible, explain why you can guarantee that $D^T$ is invertible and why $(D^T)^{-1} = (D^{-1})^T$.

ANSWER:

a) 
    $(A+B)^T = A^T + B^T$.

b) 
    $(A^T)^T = A$.

c) 
    $\det(C^T) = \det(C)$

d) 
    $(AC)^T=C^TA^T$.

e) 
    $I^T=I$

f) 
    $(D^T)^{-1} = (D^{-1})^T$.

SOLUTION:

a) 
    $(A+B)^T = A^T + B^T$.

b) 
    $(A^T)^T = A$.

c) 
    $\det(C^T) = \det(C)$

d) 

    1. 
        $AC = \begin{bmatrix} -8 & -6 & -3 \\ 1 & 6 & -8 \end{bmatrix}$ and $(AC)^T = \begin{bmatrix} -8 & 1 \\ -6 & 6 \\ -3 & -8 \end{bmatrix}$

    2. 
        The product $A^TC^T$ is not defined because $A^T$ has two columns and $C^T$ has three rows.

    3. 
        $(AC)^T=C^TA^T$

e) 
    $I^T=I$

f) 
    We have $DD^{-1} = I$ so $(DD^{-1})^T = (D^{-1})^TD^T = I^T=I$. This means that $(D^T)^{-1} = (D^{-1})^T$.

:::

In spite of the fact that we are looking at some specific examples, this activity demonstrates the following general properties of the transpose, which may be verified with a little effort.

:::assemblage {asm:assemblage-prop-transpose} Properties of the transpose
Here are some properties of the matrix transpose, expressed in terms of general matrices $A$, $B$, and $C$. We assume that $C$ is a square matrix.

- 
    If $A+B$ is defined, then $(A+B)^T = A^T+B^T$.

- 
    $(sA)^T = sA^T$.

- 
    $(A^T)^T = A$.

- 
    $\det(C) = \det(C^T)$.

- 
    If $AB$ is defined, then $(AB)^T = B^TA^T$. Notice that the order of the multiplication is reversed.

- 
    If $C$ is invertible, then $(C^T)^{-1} = (C^{-1})^T$.

:::

There is one final property we wish to record though we will wait until [Section 7.4](ref:7.4#sec-svd-intro) to explain why it is true.

:::proposition {prop:prop-col-row-rank} Proposition 6.2.12
For any matrix $A$, we have

$$ \operatorname{rank}(A) = \operatorname{rank}(A^T)\text{.} $$

:::

This proposition is important because it implies a relationship between the dimensions of a subspace and its orthogonal complement. For instance, if $A$ is an $m\times n$ matrix, we saw in [Section 3.5](ref:3.5#sec-subspaces) that $\dim\text{Col}(A) = \operatorname{rank}(A)$ and $\dim\text{Nul}(A) = n-\operatorname{rank}(A)$.

Now suppose that $W$ is an $n$-dimensional subspace of ${\mathbb R}^m$ with basis ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$. If we form the $m\times n$ matrix $A=\begin{bmatrix}{\mathbf w}_1 & {\mathbf w}_2 & \ldots & {\mathbf w}_n\end{bmatrix}$, then $\text{Col}(A) = W$ so that

$$ \operatorname{rank}(A) = \dim\text{Col}(A) = \dim W = n\text{.} $$

The transpose $A^T$ is an $n\times m$ matrix having $\operatorname{rank}(A^T) = \operatorname{rank}(A)= n$. Since $W^\perp = \text{Nul}(A^T)$, we have

$$ \dim W^\perp = \dim\text{Nul}(A^T) = m - \operatorname{rank}(A^T) = m-n = m-\dim W\text{.} $$

This explains the following proposition.

:::proposition {prop:prop-orthog-dim} Proposition 6.2.13
If $W$ is a subspace of ${\mathbb R}^m$, then

$$ \dim W + \dim W^\perp = m\text{.} $$

:::

:::example {ex:example-6-2-14} Example 6.2.14
In [Example 6.2.4](ref:example-orthog-comp-line), we constructed the orthogonal complement of a line in ${\mathbb R}^3$. The dimension of the orthogonal complement should be $3 - 1 = 2$, which explains why we found the orthogonal complement to be a plane.
:::

:::example {ex:example-6-2-15} Example 6.2.15
In [Example 6.2.5](ref:example-orthog-comp-gen), we looked at $W$, a $2$-dimensional subspace of ${\mathbb R}^5$ and found its orthogonal complement $W^\perp$ to be a $5-2=3$-dimensional subspace of ${\mathbb R}^5$.
:::

:::activity {act:activity-6-2-5} Activity 6.2.5

a) 
    Suppose that $W$ is a $5$-dimensional subspace of ${\mathbb R}^9$ and that $A$ is a matrix whose columns form a basis for $W$; that is, $\text{Col}(A) = W$.

    1. 
        What is the shape of $A$?

    2. 
        What is the rank of $A$?

    3. 
        What is the shape of $A^T$?

    4. 
        What is the rank of $A^T$?

    5. 
        What is $\dim\text{Nul}(A^T)$?

    6. 
        What is $\dim W^\perp$?

    7. 
        How are the dimensions of $W$ and $W^\perp$ related?

b) 
    Suppose that $W$ is a subspace of ${\mathbb R}^4$ having basis

    $$ {\mathbf w}_1 = \left[\begin{array}{r}1 \\ 0 \\ 2 \\ -1 \end{array}\right],\hspace{24pt} {\mathbf w}_2 = \left[\begin{array}{r}-1 \\ 2 \\ -6 \\ 3 \end{array}\right]. $$

    1. 
        Find the dimensions $\dim W$ and $\dim W^\perp$.

    2. 
        Find a basis for $W^\perp$. It may be helpful to know that the Sage command `A.right_kernel()` produces a basis for $\text{Nul}(A)$.

        :::sage
        ```sage

        ```
        :::

    3. 
        Verify that each of the basis vectors you found for $W^\perp$ are orthogonal to the basis vectors for $W$.

ANSWER:

a) 

    1. 
        $9\times 5$

    2. 
        $5$

    3. 
        $5\times 9$

    4. 
        $5$

    5. 
        $4$

    6. 
        $4$

    7. 
        $\dim W + \dim W^\perp = 9$

b) 

    1. 
        $2$

    2. 
        $\left[\begin{array}{r}1 \\ -1 \\ 0 \\ 1 \end{array}\right]$ and $\left[\begin{array}{r}0 \\ 0 \\ 1 \\ 2 \end{array}\right]$ .

    3. 
        Verify by computing the four dot products.

SOLUTION:

a) 

    1. 
        $A$ is $9\times 5$.

    2. 
        $\operatorname{rank}(A) = 5$.

    3. 
        $A^T$ is $5\times 9$.

    4. 
        $\operatorname{rank}(A^T) = 5$

    5. 
        $\dim \text{Nul}(A^T) = 9 - 5 = 4$

    6. 
        $\dim W^\perp = \dim\text{Nul}(A^T) = 4$

    7. 
        $\dim W + \dim W^\perp = 9$ since the subspaces live in ${\mathbb R}^9$.

b) 

    1. 
        $\dim W = 2$ so $\dim W^\perp = 4-2=2$.

    2. 
        A basis is ${\mathbf v}_1=\left[\begin{array}{r}1 \\ -1 \\ 0 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 0 \\ 1 \\ 2 \end{array}\right]$ .

    3. 
        You can verify by computing the four dot products.

:::

## 6.2.5 Summary

This section introduced the matrix transpose, its connection to dot products, and its use in describing the orthogonal complement of a subspace.

- 
    The columns of the matrix $A$ are the rows of the matrix transpose $A^T$.

- 
    The components of the product $A^T{\mathbf x}$ are the dot products of ${\mathbf x}$ with the columns of $A$.

- 
    The orthogonal complement of the column space of $A$ equals the null space of $A^T$; that is, $\text{Col}(A)^\perp = \text{Nul}(A^T)$.

- 
    If $W$ is a subspace of ${\mathbb R}^p$, then

    $$ \dim W + \dim W^\perp = p. $$

:::exercise {checkpoint-6-2-16} number=6.2.16 answered=no src=src/section6-2.xml:1600 inline=yes title="Vectors in $W$ and $W^\\perp$"
PROBLEM:
Can a nonzero vector be in both $W$ and $W^\perp$? Explain your thinking.
:::

## 6.2.6 Exercises

:::exercise {exercise-6-2-001} number=6.2.1 answered=yes src=src/exercises/exercises6-2.xml:5
PROBLEM:
Suppose that $W$ is a subspace of ${\mathbb R}^4$ with basis

$$ {\mathbf w}_1=\left[\begin{array}{r}-2 \\ 2 \\ 2 \\ -4 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}-2 \\ 3 \\ 5 \\ -5 \end{array}\right]. $$

a) 
    What are the dimensions $\dim W$ and $\dim W^\perp$?

b) 
    Find a basis for $W^\perp$.

c) 
    Verify that each of the basis vectors for $W^\perp$ are orthogonal to ${\mathbf w}_1$ and ${\mathbf w}_2$.

ANSWER:

a) 
    $\dim W = 2$ and $\dim W^\perp = 2$.

b) 
    ${\mathbf v}_1 = \left[\begin{array}{r}-2 \\ -3 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \\ 0 \\ 1 \end{array}\right]$

c) 
    Use the dot product.

SOLUTION:

a) 
    $\dim W = 2$ and $\dim W^\perp = 4-2 = 2$.

b) 
    ${\mathbf v}_1 = \left[\begin{array}{r}-2 \\ -3 \\ 1 \\ 0 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \\ 0 \\ 1 \end{array}\right]$

c) 
    Verify that ${\mathbf w}_i\cdot{\mathbf v}_j = 0$ for all $i$ and $j$.

:::

:::exercise {exercise-6-2-002} number=6.2.2 answered=yes src=src/exercises/exercises6-2.xml:83
PROBLEM:
Consider the matrix $A = \begin{bmatrix} -1 & -2 & -2 \\ 1 & 3 & 4 \\ 2 & 1 & -2 \end{bmatrix}$.

a) 
    Find $\operatorname{rank}(A)$ and a basis for $\text{Col}(A)$.

b) 
    Determine the dimension of $\text{Col}(A)^\perp$ and find a basis for it.

ANSWER:

a) 
    $\operatorname{rank}(A) = 2$ and a basis for $\text{Col}(A)$ is $\left[\begin{array}{r}-1 \\ 1 \\ 2 \end{array}\right]$ and $\left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right]$

b) 
    $\dim\text{Col}(A)^\perp = 1$ with basis $\left[\begin{array}{r}5 \\ 3 \\ 1 \end{array}\right]$.

SOLUTION:

a) 
    $A\sim\begin{bmatrix} 1 & 0 & -2 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \end{bmatrix}$ so $\operatorname{rank}(A) = 2$ since there are two pivot positions. The reduced row echelon form shows that the third column is a linear combination of the first two so $\left[\begin{array}{r}-1 \\ 1 \\ 2 \end{array}\right]$ and $\left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right]$ form a basis for $\text{Col}(A)$.

b) 
    We know that $\dim \text{Col}(A)^\perp = 3 - 2 = 1$. To find a basis, solve the equation $A^T{\mathbf x} = {\mathbf 0}$ to obtain $\left[\begin{array}{r}5 \\ 3 \\ 1 \end{array}\right]$.

:::

:::exercise {exercise-6-2-003} number=6.2.3 answered=yes src=src/exercises/exercises6-2.xml:155
PROBLEM:
Suppose that $W$ is the subspace of ${\mathbb R}^4$ defined as the solution set of the equation

$$ x_1 - 3x_2 + 5x_3 - 2x_4 = 0. $$

a) 
    What are the dimensions $\dim W$ and $\dim W^\perp$?

b) 
    Find a basis for $W$.

c) 
    Find a basis for $W^\perp$.

d) 
    In general, how can you easily find a basis for $W^\perp$ when $W$ is defined by

    $$ Ax_1+Bx_2+Cx_3+Dx_4 = 0? $$

ANSWER:

a) 
    $\dim W = 3$, $\dim W^\perp = 1$.

b) 
    $\left[\begin{array}{r}3 \\ 1 \\ 0 \\ 0 \end{array}\right]$, $\left[\begin{array}{r}-5 \\ 0 \\ 1 \\ 0 \end{array}\right]$, and $\left[\begin{array}{r}2 \\ 0 \\ 0 \\ 1 \end{array}\right]$.

c) 
    $\left[\begin{array}{r}1 \\ -3 \\ 5 \\ -2 \end{array}\right]$

d) 
    $\left[\begin{array}{r}A \\ B \\ C \\ D \end{array}\right]$

SOLUTION:

a) 
    $W = \text{Nul}(B)$ where $B = \begin{bmatrix}1 & -3 & 5 & -2 \end{bmatrix}$ so $\dim W = 4 -1 =3$. Therefore, $\dim W^\perp = 4-3 = 1$.

b) 
    A basis for $W$ is $\left[\begin{array}{r}3 \\ 1 \\ 0 \\ 0 \end{array}\right]$, $\left[\begin{array}{r}-5 \\ 0 \\ 1 \\ 0 \end{array}\right]$, and $\left[\begin{array}{r}2 \\ 0 \\ 0 \\ 1 \end{array}\right]$.

c) 
    Since every vector in $W$ satisfies $\left[\begin{array}{r}1 \\ -3 \\ 5 \\ -2 \end{array}\right]\cdot{\mathbf x} = 0$, a basis for $W^\perp$ is $\left[\begin{array}{r}1 \\ -3 \\ 5 \\ -2 \end{array}\right]$

d) 
    $\left[\begin{array}{r}A \\ B \\ C \\ D \end{array}\right]$

:::

:::exercise {exercise-6-2-004} number=6.2.4 answered=yes src=src/exercises/exercises6-2.xml:253
PROBLEM:
Determine whether the following statements are true or false and explain your reasoning.

a) 
    If $A=\begin{bmatrix} 2 & 1 \\ 1 & 1 \\ -3 & 1 \end{bmatrix}$, then ${\mathbf x}=\left[\begin{array}{r}4 \\ -5 \\ 1 \end{array}\right]$ is in $\text{Col}(A)^\perp$.

b) 
    If $A$ is a $2\times3$ matrix and $B$ is a $3\times4$ matrix, then $(AB)^T = A^TB^T$ is a $4\times2$ matrix.

c) 
    If the columns of $A$ are ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ and $A^T{\mathbf x} = \left[\begin{array}{r}2 \\ 0 \\ 1 \end{array}\right]$, then ${\mathbf x}$ is orthogonal to ${\mathbf v}_2$.

d) 
    If $A$ is a $4\times 4$ matrix with $\operatorname{rank}(A) = 3$, then $\text{Col}(A)^\perp$ is a line in ${\mathbb R}^4$.

e) 
    If $A$ is a $5\times 7$ matrix with $\operatorname{rank}(A) = 5$, then $\operatorname{rank}(A^T) = 7$.

ANSWER:

a) 
    True

b) 
    False

c) 
    True

d) 
    True

e) 
    False

SOLUTION:

a) 
    True, since $A^T{\mathbf x}={\mathbf 0}$, ${\mathbf x}$ is in $\text{Col}(A)^\perp$.

b) 
    False, $(AB)^T$ is a $4\times2$ matrix, but it is given by $(AB)^T=B^TA^T$.

c) 
    True, because the second component of $A^T{\mathbf x} = {\mathbf v}_2\cdot{\mathbf x}=0$.

d) 
    True, because $\dim\text{Col}(A)^\perp = 4-\dim\text{Col}(A) = 4-3 = 1$.

e) 
    False, $\operatorname{rank}(A^T) = \operatorname{rank}(A) = 5$.

:::

:::exercise {exercise-6-2-005} number=6.2.5 answered=yes src=src/exercises/exercises6-2.xml:374
PROBLEM:
Apply properties of matrix operations to simplify the following expressions.

a) 
    $A^T(BA^T)^{-1}$

b) 
    $(A+B)^T(A+B)$

c) 
    $[A(A+B)^T]^T$

d) 
    $(A + 2I)^T$

ANSWER:

a) 
    $B^{-1}$

b) 
    $A^TA + B^TA + A^TB + B^TB$

c) 
    $AA^T+BA^T$

d) 
    $A^T+2I$

SOLUTION:

a) 
    $A^T(A^T)^{-1}B^{-1} = B^{-1}$

b) 
    $A^TA + B^TA + A^TB + B^TB$

c) 
    $(A+B)A^T = AA^T+BA^T$

d) 
    $A^T+2I$

:::

:::exercise {exercise-6-2-006} number=6.2.6 answered=yes src=src/exercises/exercises6-2.xml:457
PROBLEM:
A symmetric matrix $A$ is one for which $A=A^T$.

a) 
    Explain why a symmetric matrix must be square.

b) 
    If $A$ and $B$ are general matrices and $D$ is a square diagonal matrix, which of the following matrices can you guarantee are symmetric?

    1. 
        $D$

    2. 
        $BAB^{-1}$

    3. 
        $AA^T$.

    4. 
        $BDB^T$

ANSWER:

a) 
    They must have the same number of rows and columns.

b) 

    1. 
        Yes

    2. 
        No

    3. 
        No

    4. 
        Yes

SOLUTION:

a) 
    If $A$ is an $m\times n$ matrix, then $A^T$ is $n\times m$ If these matrices are the same, then $m=n$.

b) 

    1. 
        If $D$ is diagonal, then $D^T = D$.

    2. 
        $(BAB^{-1})^T = (B^{-1})^TA^TB^T$ so this matrix need not be symmetric.

    3. 
        $(AA^T)^T = (A^T)^TA^T = AA^T$ so this matrix is symmetric.

    4. 
        $(BDB^T)^T = (B^T)^TD^TB^T = BDB^T$ so this matrix is symmetric.

:::

:::exercise {exercise-6-2-007} number=6.2.7 answered=yes src=src/exercises/exercises6-2.xml:581
PROBLEM:
If $A$ is a square matrix, remember that the characteristic polynomial of $A$ is $\det(A-\lambda I)$ and that the roots of the characteristic polynomial are the eigenvalues of $A$.

a) 
    Explain why $A$ and $A^T$ have the same characteristic polynomial.

b) 
    Explain why $A$ and $A^T$ have the same set of eigenvalues.

c) 
    Suppose that $A$ is diagonalizable with diagonalization $A=PDP^{-1}$. Explain why $A^T$ is diagonalizable and find a diagonalization.

ANSWER:

a) 
    Use properties of the matrix transpose.

b) 
    Because they have the same characteristic polynomial.

c) 
    $A^T = (P^T)^{-1} D P^T$

SOLUTION:

a) 
    $(A-\lambda I)^T = A^T - \lambda I$ and therefore $\det(A^T-\lambda I) = \det[(A-\lambda I)^T] = \det(A-\lambda I)$.

b) 
    The eigenvalues of a matrix are given by the roots of its characteristic polynomial. Since $A$ and $A^T$ have the same characteristic polynomial, they have the same eigenvalues.

c) 
    $A^T = (PDP^{-1})^T = (P^T)^{-1} D P^T$

:::

:::exercise {exercise-6-2-008} number=6.2.8 answered=yes src=src/exercises/exercises6-2.xml:661
PROBLEM:
This exercise introduces a version of the Pythagorean theorem that we'll use later.

a) 
    Suppose that ${\mathbf v}$ and ${\mathbf w}$ are orthogonal to one another. Use the dot product to explain why

    $$ \left|{\mathbf v}+{\mathbf w}\right|^2 = \left|{\mathbf v}\right|^2 + \left|{\mathbf w}\right|^2. $$

b) 
    Suppose that $W$ is a subspace of ${\mathbb R}^m$ and that ${\mathbf z}$ is a vector in ${\mathbb R}^m$ for which

    $$ {\mathbf z} = {\mathbf x} + {\mathbf y}, $$

    where ${\mathbf x}$ is in $W$ and ${\mathbf y}$ is in $W^\perp$. Explain why

    $$ \left|{\mathbf z}\right|^2 = \left|{\mathbf x}\right|^2 + \left|{\mathbf y}\right|^2, $$

    which is an expression of the Pythagorean theorem.

ANSWER:

a) 
    $\left|{\mathbf v}+{\mathbf w}\right|^2 = {\mathbf v}\cdot{\mathbf v}+{\mathbf w}\cdot{\mathbf w}$

b) 
    Because ${\mathbf x}$ and ${\mathbf y}$ are orthogonal.

SOLUTION:

a) 
    $\left|{\mathbf v}+{\mathbf w}\right|^2 = ({\mathbf v}+{\mathbf w})\cdot({\mathbf v}+{\mathbf w}) = {\mathbf v}\cdot{\mathbf v}+2{\mathbf v}\cdot{\mathbf w}+{\mathbf w}\cdot{\mathbf w} = {\mathbf v}\cdot{\mathbf v}+{\mathbf w}\cdot{\mathbf w}$

b) 
    Because ${\mathbf x}$ and ${\mathbf y}$ are orthogonal.

:::

:::exercise {exercise-6-2-009} number=6.2.9 answered=yes src=src/exercises/exercises6-2.xml:732
PROBLEM:
In the next chapter, symmetric matrices---that is, matrices for which $A=A^T$---play an important role. It turns out that eigenvectors of a symmetric matrix that are associated to different eigenvalues are orthogonal. We will explain this fact in this exercise.

a) 
    Viewing a vector as a matrix having one column, we may write ${\mathbf x}\cdot{\mathbf y} = {\mathbf x}^T{\mathbf y}$. If $A$ is a matrix, explain why ${\mathbf x}\cdot (A{\mathbf y}) = (A^T{\mathbf x}) \cdot {\mathbf y}$.

b) 
    We have seen that the matrix $A=\begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$ has eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$, with associated eigenvalue $\lambda_1=3$, and ${\mathbf v}_2 = \left[\begin{array}{r}1 \\ -1 \end{array}\right]$, with associated eigenvalue $\lambda_2 = -1$. Verify that $A$ is symmetric and that ${\mathbf v}_1$ and ${\mathbf v}_2$ are orthogonal.

c) 
    Suppose that $A$ is a general symmetric matrix and that ${\mathbf v}_1$ is an eigenvector associated to eigenvalue $\lambda_1$ and that ${\mathbf v}_2$ is an eigenvector associated to a different eigenvalue $\lambda_2$. Beginning with ${\mathbf v}_1\cdot (A{\mathbf v}_2)$, apply the identity from the first part of this exercise to explain why ${\mathbf v}_1$ and ${\mathbf v}_2$ are orthogonal.

ANSWER:

a) 
    Use properties of the transpose.

b) 
    Compute the dot product of ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    It follows that $(\lambda_1-\lambda_2){\mathbf v}_1\cdot{\mathbf v}_2 = 0$

SOLUTION:

a) 
    ${\mathbf x}\cdot(A{\mathbf y}) = {\mathbf x}^TA{\mathbf y} = (A^T{\mathbf x})^T{\mathbf y} = (A^T{\mathbf x})\cdot{\mathbf y}$.

b) 
    $A^T = A$ and ${\mathbf v}_1\cdot{\mathbf v}_2=0$.

c) 

    $$ \begin{aligned} {\mathbf v}_1\cdot(A{\mathbf v}_2) & {}={} (A{\mathbf v}_1)\cdot{\mathbf v}_2 \\ \lambda_2{\mathbf v}_1\cdot{\mathbf v}_2 & {}={} \lambda_1{\mathbf v}_1\cdot{\mathbf v}_2 \\ (\lambda_1-\lambda_2){\mathbf v}_1\cdot{\mathbf v}_2&{}={} 0 \end{aligned} $$

    so ${\mathbf v}_1\cdot{\mathbf v}_2=0$ since $\lambda_1-\lambda_2\neq 0$.

:::

:::exercise {exercise-6-2-010} number=6.2.10 answered=yes src=src/exercises/exercises6-2.xml:845
PROBLEM:
Given an $m\times n$ matrix $A$, the *row space* of $A$ is the column space of $A^T$; that is, $\text{Row}(A) = \text{Col}(A^T)$.

a) 
    Suppose that $A$ is a $7\times 15$ matrix. For what $p$ is $\text{Row}(A)$ a subspace of ${\mathbb R}^p$?

b) 
    How can [Proposition 6.2.10](ref:prop-col-orthog) help us describe $\text{Row}(A)^\perp$?

c) 
    Suppose that $A = \begin{bmatrix} -1 & -2 & 2 & 1 \\ 2 & 4 & -1 & 5 \\ 1 & 2 & 0 & 3 \end{bmatrix}$. Find bases for $\text{Row}(A)$ and $\text{Row}(A)^\perp$.

ANSWER:

a) 
    $p=15$

b) 
    $\text{Row}(A)^\perp = \ \text{Nul}(A)$

c) 
    A basis for $\text{Row}(A)$ are the three rows of $A$. A basis for $\text{Row}(A)^\perp = \text{Nul}(A)$ is $\left[\begin{array}{r}-2 \\ 1 \\ 0 \\ 0 \end{array}\right]$.

SOLUTION:

a) 
    Since $A^T$ is $15\times7$, it follows that $\text{Row}(A)=\text{Col}(A^T)$ is a subspace of ${\mathbb R}^{15}$.

b) 
    $\text{Row}(A)^\perp = \text{Col}(A^T)^\perp = \text{Nul}((A^T)^T) = \text{Nul}(A)$

c) 
    $\operatorname{rank}(A) = 3$ so $\operatorname{rank}(A^T)=\dim\text{Col}(A^T) = \dim\text{Row}(A) = 3$. A basis for $\text{Row}(A)$ are the three rows of $A$. $\text{Row}(A)^\perp = \text{Nul}(A)$ is one-dimensional with basis $\left[\begin{array}{r}-2 \\ 1 \\ 0 \\ 0 \end{array}\right]$.

:::
