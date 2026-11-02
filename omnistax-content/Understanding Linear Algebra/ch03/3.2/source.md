# 3.2 Bases and coordinate systems {sec-bases}

In this section, we will develop the concept of a *basis* through which we will create new coordinate systems in ${\mathbb R}^m$. We will see that the right choice of a coordinate system provides a more natural way to approach some problems.

## 3.2.1 Introduction

Standard Cartesian coordinates are commonly used to describe points in the plane. If we mention the point $(4,3)$, we know that we arrive at this point from the origin by moving four units to the right and three units up.

Sometimes, however, it is more natural to work in a different coordinate system. Suppose that you live in the city whose map is shown in [Figure 3.2.1](ref:fig-city-map) and that you would like to give a guest directions for getting from your house to the store. You would probably say something like, "Go four blocks up Maple. Then turn left on Main for three blocks." The grid of streets in the city gives a more natural coordinate system than standard north-south, east-west coordinates. We will see how a basis provides the right framework for this type of thinking.

> FIGURE {fig:fig-city-map} number=3.2.1 src=../../media/ch03/city-map.svg
> alt: Street map of a city
> width: 45%
> caption: A city map.

:::exploration {act:preview-3-2-1} Preview Activity 3.2.1
Consider the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

in ${\mathbb R}^2$, which are shown in [Figure 3.2.2](ref:fig-basis-1).
> FIGURE {fig:fig-basis-1} number=3.2.2 src=../../media/ch03/basis-1.svg
> alt: Two vectors and a set of skewed grid lines representing their linear combinations.
> width: 50%
> caption: Linear combinations of ${\mathbf v}_1$ and ${\mathbf v}_2$.
PROBLEM:
a) Indicate the linear combination ${\mathbf v}_1 - 2{\mathbf v}_2$ on the figure.
b) Express the vector $\left[\begin{array}{r}-3 \\ 0 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.
c) Find the linear combination $10{\mathbf v}_1 - 13{\mathbf v}_2$.
d) Express the vector $\left[\begin{array}{r}16 \\ -4 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.
e) Explain why every vector in ${\mathbb R}^2$ can be written as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ in exactly one way.
SOLUTION:
a) We can see graphically, or we can compute, that ${\mathbf v}_1-2{\mathbf v}_2 = \left[\begin{array}{r}0 \\ -3 \end{array}\right]$.
b) Again, we graphically see that $\left[\begin{array}{r}-3 \\ 0 \end{array}\right] = -2{\mathbf v}_1+{\mathbf v}_2$.
c) Since the linear combination extends beyond the figure, we compute that $10{\mathbf v}_1-13{\mathbf v}_2 = \left[\begin{array}{r}7 \\ -16 \end{array}\right]$.
d) We need to find the solution to the linear system $c_1{\mathbf v}_1 + c_2{\mathbf v}_2 = \left[\begin{array}{r}16 \\ -4 \end{array}\right]$, which is $\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right] = \left[\begin{array}{r}12 \\ -8 \end{array}\right]$.
e) The matrix $\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$ has a pivot position in every row and every column.
:::

In the preview activity, we worked with a set of two vectors in ${\mathbb R}^2$ and found that we could express any vector in ${\mathbb R}^2$ in two different ways: in the usual way where the components of the vector describe horizontal and vertical changes, and in a new way as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$. We could also translate between these two descriptions. This example illustrates the central idea of this section.

## 3.2.2 Bases

In the preview activity, we created a new coordinate system for ${\mathbb R}^2$ using linear combinations of a set of two vectors. More generally, the following definition will guide us.

:::definition {def:definition-3-2-3} Definition 3.2.3
{index-entry:basis} A set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ in ${\mathbb R}^m$ is called a *basis* for ${\mathbb R}^m$ if the set of vectors spans ${\mathbb R}^m$ and is linearly independent.
:::

:::activity {act:activity-3-2-2} Activity 3.2.2
We will look at some examples of bases in this activity.

a) 
    In the preview activity, we worked with the set of vectors in ${\mathbb R}^2$:

    $$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

    . Explain why these vectors form a basis for ${\mathbb R}^2$.

b) 
    Consider the set of vectors in ${\mathbb R}^3$

    $$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}0 \\ 1 \\ -1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right] $$

    and determine whether they form a basis for ${\mathbb R}^3$.

    :::sage
    ```sage

    ```
    :::

c) 
    Do the vectors

    $$ {\mathbf v}_1 = \left[\begin{array}{r}-2 \\ 1 \\ 3 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}3 \\ 0 \\ -1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}1 \\ 1 \\ 0 \end{array}\right], {\mathbf v}_4 = \left[\begin{array}{r}0 \\ 3 \\ -2 \end{array}\right] $$

    form a basis for ${\mathbb R}^3$?

d) 
    Explain why the vectors ${\mathbf e}_1,{\mathbf e}_2,{\mathbf e}_3$ form a basis for ${\mathbb R}^3$.

e) 
    If a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ forms a basis for ${\mathbb R}^m$, what can you guarantee about the pivot positions of the matrix

    $$ \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right] $$

    ?

f) 
    If the set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ is a basis for ${\mathbb R}^{10}$, how many vectors must be in the set?

SOLUTION:

a) 
    The matrix $\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$ is row equivalent to the identity matrix so it has a pivot position in every row. The span of the columns is therefore ${\mathbb R}^2$. There is also a pivot position in every column, which means that the columns are linearly independent.

b) 
    We note that

    $$ \left[\begin{array}{rrr} 1 & 0 & 1 \\ 1 & 1 & 0 \\ 1 & -1 & -1 \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{array}\right]\text{.} $$

    Since there is a pivot position in every row, the span of the vectors is ${\mathbb R}^3$. Since there is a pivot position in every column, the vectors are linearly independent. Consequently, this set of vectors forms a basis for ${\mathbb R}^3$.

c) 
    The matrix whose columns are the vectors ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$, and ${\mathbf v}_4$ has dimensions $3\times4$. Therefore, there cannot be a pivot position in every column, which tells us that the columns cannot be linearly independent. Therefore, the set of vectors do not form a basis for ${\mathbb R}^3$.

d) 
    Putting these vectors into a matrix produces the identity matrix, which has a pivot position in every row and every column. Therefore, the span of the vectors is ${\mathbb R}^3$, and they are linearly independent.

e) 
    There must be a pivot position in every row and every column.

f) 
    A basis for ${\mathbb R}^{10}$ must have $10$ vectors. Because the associated matrix must have a pivot position in every row and every column, there must be the same number of columns as there are rows. Since the vectors are $10$-dimensional, there must be 10 vectors.

:::

We can develop a test to determine if a set of vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ forms a basis for ${\mathbb R}^m$ by considering the matrix

$$ A = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right] $$

. To be a basis, this set of vectors must span ${\mathbb R}^m$ and be linearly independent.

We know that the span of the set of vectors is ${\mathbb R}^m$ if and only if $A$ has a pivot position in every row. We also know that the set of vectors is linearly independent if and only if $A$ has a pivot position in every column. This means that a set of vectors forms a basis if and only if $A$ has a pivot in every row and every column. Therefore, $A$ must be row equivalent to the identity matrix $I$:

$$ A \sim \left[\begin{array}{cccc} 1 & 0 & \cdots & 0 \\ 0 & 1 & \cdots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \cdots & 1 \end{array}\right] = I $$

.

In addition to helping identify bases, this fact tells us something important about the number of vectors in a basis. Since the matrix $A$ has a pivot position in every row and every column, it must have the same number of rows as columns. Therefore, the number of vectors in a basis for ${\mathbb R}^m$ must be $m$. For example, a basis for ${\mathbb R}^{23}$ must have exactly 23 vectors.

:::proposition {prop:proposition-3-2-4} Proposition 3.2.4
A set of vectors forms a basis for ${\mathbb R}^m$ if and only if the matrix

$$ A = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \end{array}\right] \sim I. $$

This means there must be $m$ vectors in a basis for ${\mathbb R}^m$.
:::

:::example {ex:example-3-2-5} Example 3.2.5
Notice that the vectors

$$ {\mathbf e}_1 = \left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right], {\mathbf e}_2 = \left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right], {\mathbf e}_3 = \left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right] $$

form the columns of the $3\times3$ identity matrix, which implies that this set forms a basis for ${\mathbb R}^3$. More generally, the set of vectors ${\mathbf e}_1,{\mathbf e}_2,\ldots,{\mathbf e}_m$ forms a basis for ${\mathbb R}^m$, which we call the *standard* basis for ${\mathbb R}^m$. {index-entry:basis, standard}
:::

## 3.2.3 Coordinate systems

A basis for ${\mathbb R}^m$ forms a coordinate system for ${\mathbb R}^m$, as we will describe. Rather than continuing to write a list of vectors, we will find it convenient to denote a basis using a single symbol, such as

$$ {\cal B} = \{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m\} $$

:::example {ex:example-3-2-6} Example 3.2.6
In this section's preview activity, we considered the vectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

, which form a basis ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2\}$ for ${\mathbb R}^2$.
In the standard coordinate system, the point $(2,-3)$ is found by moving 2 units to the right and 3 units down. We would like to define a new coordinate system where we interpret $(2,-3)$ to mean we move two times along ${\mathbf v}_1$ and 3 times along $-{\mathbf v}_2$. As we see in the figure, doing so leaves us at the point $(1,-4)$, expressed in the usual coordinate system.

> IMAGE {img:basis-1} src=../../media/ch03/basis-1.svg
> alt: Two vectors and a set of skewed grid lines representing their linear combinations.

We have seen that

$$ {\mathbf x} = \left[\begin{array}{r}1 \\ -4 \end{array}\right] = 2{\mathbf v}_1 - 3{\mathbf v}_2 $$

. The coordinates of the vector ${\mathbf x}$ in the new coordinate system are the weights that we use to create ${\mathbf x}$ as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.
Since we now have two descriptions of the vector ${\mathbf x}$, we need some notation to keep track of which coordinate system we are using. Because $\left[\begin{array}{r}1 \\ -4 \end{array}\right] = 2{\mathbf v}_1 - 3{\mathbf v}_2$, we will write

$$ \left\{\left[\begin{array}{r}1 \\ -4 \end{array}\right]\right\}_{{\cal B}} = \left[\begin{array}{r}2 \\ -3 \end{array}\right] $$

. More generally, $\left\{{\mathbf x}\right\}_{{\cal B}}$ will denote the coordinates of ${\mathbf x}$ in the basis ${\cal B}$; that is, $\left\{{\mathbf x}\right\}_{{\cal B}}$ is the vector $\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right]$ of weights such that

$$ {\mathbf x} = c_1{\mathbf v}_1 + c_2 {\mathbf v}_2 $$

.
For example, if the coordinates of ${\mathbf x}$ in the basis ${\cal B}$ are

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}5 \\ -2 \end{array}\right] $$

, then

$$ {\mathbf x} = 5{\mathbf v}_1 - 2{\mathbf v}_2 = 5\left[\begin{array}{r}2 \\ 1 \end{array}\right]-2\left[\begin{array}{r}1 \\ 2 \end{array}\right] = \left[\begin{array}{r}8 \\ 1 \end{array}\right], $$

and we conclude that

$$ \left\{\left[\begin{array}{r}8 \\ 1 \end{array}\right]\right\}_{{\cal B}} = \left[\begin{array}{r}5 \\ -2 \end{array}\right] $$

. This demonstrates how we can translate coordinates in the basis ${\cal B}$ into standard coordinates.
Suppose we know the expression of a vector ${\mathbf x}$ in standard coordinates. How can we find its coordinates in the basis ${\cal B}$? For instance, suppose ${\mathbf x}=\left[\begin{array}{r}-8 \\ 2 \end{array}\right]$ and that we would like to find $\left\{{\mathbf x}\right\}_{{\cal B}}$. We can write

$$ \left\{\left[\begin{array}{r}-8 \\ 2 \end{array}\right]\right\}_{{\cal B}}=\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right], $$

which means that

$$ \left[\begin{array}{r}-8 \\ 2 \end{array}\right] = c_1{\mathbf v}_1 + c_2{\mathbf v}_2 $$

or

$$ c_1 \left[\begin{array}{r}2 \\ 1 \end{array}\right] + c_2 \left[\begin{array}{r}1 \\ 2 \end{array}\right] = \left[\begin{array}{r}-8 \\ 2 \end{array}\right]. $$

This linear system for the weights defines an augmented matrix

$$ \left[\begin{array}{rr|r} 2 & 1 & -8 \\ 1 & 2 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rr|r} 1 & 0 & -6 \\ 0 & 1 & 4 \\ \end{array}\right], $$

. which means that

$$ \left\{\left[\begin{array}{r}-8 \\ 2 \end{array}\right]\right\}_{{\cal B}} = \left[\begin{array}{r}-6 \\ 4 \end{array}\right] $$

.
:::

This example illustrates how a basis in ${\mathbb R}^2$ provides a new coordinate system for ${\mathbb R}^2$ and shows how we may translate between this coordinate system and the standard one.

More generally, suppose that ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m\}$ is a basis for ${\mathbb R}^m$. We know that the span of the vectors is ${\mathbb R}^m$, which implies that any vector ${\mathbf x}$ in ${\mathbb R}^m$ can be written as a linear combination of the vectors. In addition, we know that the vectors are linearly independent, which means that we can write ${\mathbf x}$ as a linear combination of the vectors in exactly one way. Therefore, we have

$$ {\mathbf x} = c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_m{\mathbf v}_m $$

where the weights $c_1, c_2,\ldots, c_m$ are unique. In this case, we write the coordinate description of ${\mathbf x}$ in the basis ${\cal B}$ as

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{c}c_1 \\ c_2 \\ \vdots \\ c_m \end{array}\right] $$

.

:::activity {act:activity-3-2-3} Activity 3.2.3
Let's begin with the basis ${\cal B} = \{{\mathbf v}_1,{\mathbf v}_2\}$ of ${\mathbb R}^2$ where

$$ {\mathbf v}_1 = \left[\begin{array}{r}3 \\ -2 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}2 \\ 1 \end{array}\right] $$

.

a) 
    If the coordinates of ${\mathbf x}$ in the basis ${\cal B}$ are $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}-2 \\ 4 \end{array}\right]$, what is the vector ${\mathbf x}$?

b) 
    If ${\mathbf x} = \left[\begin{array}{r}3 \\ 5 \end{array}\right]$, find the coordinates of ${\mathbf x}$ in the basis ${\cal B}$; that is, find $\left\{{\mathbf x}\right\}_{{\cal B}}$.

c) 
    Find a matrix $A$ such that, for any vector ${\mathbf x}$, we have ${\mathbf x} = A\left\{{\mathbf x}\right\}_{{\cal B}}$. Explain why this matrix is invertible.

d) 
    Using what you found in the previous part, find a matrix $B$ such that, for any vector ${\mathbf x}$, we have $\left\{{\mathbf x}\right\}_{{\cal B}} = B{\mathbf x}$. What is the relationship between the two matrices $A$ and $B$? Explain why this relationship holds.

e) 
    Suppose we consider the standard basis

    $$ {\cal E} = \{{\mathbf e}_1,{\mathbf e}_2\} $$

    . What is the relationship between ${\mathbf x}$ and $\left\{{\mathbf x}\right\}_{{\cal E}}$?

f) 
    Suppose we also consider the basis

    $$ {\cal C} = \left\{\left[\begin{array}{r}1 \\ 2 \end{array}\right], \left[\begin{array}{r}-2 \\ 1 \end{array}\right]\right\} $$

    . Find a matrix $C$ that converts coordinates in the basis ${\cal C}$ into coordinates in the basis ${\cal B}$; that is,

    $$ \left\{{\mathbf x}\right\}_{{\cal B}} = C \left\{{\mathbf x}\right\}_{{\cal C}} $$

    . You may wish to think about converting coordinates from the basis ${\cal C}$ into the standard coordinate system and then into the basis ${\cal B}$.

SOLUTION:

a) 
    We know that ${\mathbf x}=-2{\mathbf v}_1+4{\mathbf v}_2=\left[\begin{array}{r}2 \\ 8 \end{array}\right]$.

b) 
    We solve the linear system $c_1{\mathbf v}_1+c_2{\mathbf v}_2=\left[\begin{array}{r}3 \\ 5 \end{array}\right]$ to find $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}-1 \\ 3 \end{array}\right]$.

c) 
    If ${\mathbf x}=\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right]$, we have

    $$ {\mathbf x}=c_1{\mathbf v}_1+c_2{\mathbf v}_2 = \left[\begin{array}{rr} 3 & 2 \\ -2 & 1 \\ \end{array}\right]\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right] = A \left\{{\mathbf x}\right\}_{{\cal B}}\text{.} $$

    This matrix $A$, whose columns are the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$, has a pivot position in every row and every column because the vectors form a basis. It is, therefore, row equivalent to the identity matrix and hence invertible.

d) 
    Since we have ${\mathbf x} = A\left\{{\mathbf x}\right\}_{{\cal B}}$, we also have $A^{-1}{\mathbf x} = \left\{{\mathbf x}\right\}_{{\cal B}}$.

e) 
    We have

    $$ {\mathbf x}=\left[\begin{array}{rr} 1&0 \\ 0 & 1 \\ \end{array}\right] \left\{{\mathbf x}\right\}_{{\cal E}} = I\left\{{\mathbf x}\right\}_{{\cal E}} = \left\{{\mathbf x}\right\}_{{\cal E}}\text{.} $$

f) 
    If we define $B$ to be the matrix whose columns are $\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and $\left[\begin{array}{r}-2 \\ 1 \end{array}\right]$, then

    $$ \left\{{\mathbf x}\right\}_{{\cal B}} = A^{-1}{\mathbf x} = A^{-1}B\left\{{\mathbf x}\right\}_{{\cal C}}\text{.} $$

    Therefore, $C=A^{-1}B = \left[\begin{array}{rr} -\frac{3}{7} & -\frac{4}{7} \\ \frac{8}{7} & -\frac{1}{7} \end{array}\right]\text{.}$

:::

This activity demonstrates how we can efficiently convert between coordinate systems defined by different bases. Let's consider a basis ${\cal B} = \{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m\}$ and a vector ${\mathbf x}$. We know that

$$ \begin{aligned} {\mathbf x} & {}={} c_1{\mathbf v}_1 +c_2{\mathbf v}_2+\ldots+c_m{\mathbf v}_m \\ \\ & {}={} \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_m \end{array}\right] \left[\begin{array}{c}c_1 \\ c_2 \\ \vdots \\ c_m \end{array}\right] \\ \\ & {}={} \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_m \end{array}\right] \left\{{\mathbf x}\right\}_{{\cal B}}\text{.} \end{aligned} $$

If we use $P_{{\cal B}}$ to denote the matrix whose columns are the basis vectors, then we find that

$$ {\mathbf x} = P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} $$

where $P_{{\cal B}} = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_m \end{array}\right]$. This means that the matrix $P_{{\cal B}}$ converts coordinates in the basis ${\cal B}$ into standard coordinates.

Since the columns of $P_{{\cal B}}$ are the basis vectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m$, we know that $P_{{\cal B}} \sim I_m$, and $P_{{\cal B}}$ is therefore invertible. Since we have

$$ {\mathbf x} = P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} $$

, we must also have

$$ P_{{\cal B}}^{-1}{\mathbf x} = \left\{{\mathbf x}\right\}_{{\cal B}} $$

.

:::proposition {prop:proposition-coordinate-transform} Proposition 3.2.7
If ${\cal B}$ is a basis and $P_{{\cal B}}$ the matrix whose columns are the basis vectors, then

$$ \begin{aligned} {\mathbf x} & = P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}, \\ \\ \left\{{\mathbf x}\right\}_{{\cal B}} & = P_{{\cal B}}^{-1}{\mathbf x}. \end{aligned} $$

:::

If we have another basis ${\cal C}$, we find, in the same way, that ${\mathbf x} = P_{{\cal C}}\left\{{\mathbf x}\right\}_{{\cal C}}$ for the conversion between coordinates in the basis ${\cal C}$ into standard coordinates. We then have

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = P^{-1}_{{\cal B}} {\mathbf x} = P_{{\cal B}}^{-1}(P_{{\cal C}} \left\{{\mathbf x}\right\}_{{\cal C}}) = (P_{{\cal B}}^{-1}P_{{\cal C}}) \left\{{\mathbf x}\right\}_{{\cal C}} $$

. Therefore, $P_{{\cal B}}^{-1}P_{{\cal C}}$ is the matrix that converts ${\cal C}$-coordinates into ${\cal B}$-coordinates.

## 3.2.4 Examples of bases

We will now look at some examples of bases that illustrate how it can be useful to study a problem using a different coordinate system.

:::example {ex:example-3-2-8} Example 3.2.8
Let's consider the basis of ${\mathbb R}^3$:

$$ {\cal B} = \left\{ \left[\begin{array}{r}1 \\ 0 \\ -2 \end{array}\right], \left[\begin{array}{r}-2 \\ 1 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 1 \\ 2 \end{array}\right] \right\}. $$

It is relatively straightforward to convert a vector's representation in this basis into to the standard basis using the matrix whose columns are the basis vectors:

$$ P_{{\cal B}} = \left[\begin{array}{rrr} 1 & -2 & 1 \\ 0 & 1 & 1 \\ -2 & 0 & 2 \\ \end{array}\right]. $$

For example, suppose that the vector ${\mathbf x}$ is described in the coordinate system defined by the basis as $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}2 \\ -2 \\ 1 \end{array}\right]$. We then have

$$ {\mathbf x} = P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{rrr} 1 & -2 & 1 \\ 0 & 1 & 1 \\ -2 & 0 & 2 \\ \end{array}\right] \left[\begin{array}{r}2 \\ -2 \\ 1 \end{array}\right] = \left[\begin{array}{r}7 \\ -1 \\ -2 \end{array}\right] $$

.
Consider now the vector ${\mathbf x}=\left[\begin{array}{r}3 \\ 1 \\ -2 \end{array}\right]$. If we would like to express ${\mathbf x}$ in the coordinate system defined by ${\cal B}$, then we compute

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = P^{-1}_{{\cal B}}{\mathbf x} = \left[\begin{array}{rrr} \frac14 & \frac 12 & -\frac38 \\ -\frac14 & \frac12 & -\frac18 \\ \frac14 & \frac12 & \frac18 \\ \end{array}\right] \left[\begin{array}{r}3 \\ 1 \\ -2 \end{array}\right] = \left[\begin{array}{r}2 \\ 0 \\ 1 \end{array}\right] $$

.
:::

:::example {ex:example-wavelet-basis} Example 3.2.9
Suppose we work for a company that records its quarterly revenue, in millions of dollars, as:
> TABLE {tab:tab-3-2-10} number=3.2.10 cols=2
> caption: A company's quarterly revenue
|  |  |
| --- | --- |
| Quarter | Revenue |
| 1 | 10.3 |
| 2 | 13.1 |
| 3 | 7.5 |
| 4 | 8.2 |
Rather than using a table to record the data, we could display it in a graph or write it as a vector in ${\mathbb R}^4$:

$$ {\mathbf x}=\left[\begin{array}{r}10.3 \\ 13.1 \\ 7.5 \\ 8.2 \end{array}\right] $$

.

> IMAGE {img:basis-revenue} src=../../media/ch03/basis-revenue.svg
> alt: Plot of four data points representing a company's revenue in the four quarters of a year.

Let's consider a new basis ${\cal B}$ for ${\mathbb R}^4$ using vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right],~~~ {\mathbf v}_2=\left[\begin{array}{r}1 \\ 1 \\ -1 \\ -1 \end{array}\right],~~~ {\mathbf v}_3=\left[\begin{array}{r}1 \\ -1 \\ 0 \\ 0 \end{array}\right],~~~ {\mathbf v}_4=\left[\begin{array}{r}0 \\ 0 \\ 1 \\ -1 \end{array}\right] $$

. We may view these basis elements graphically, as in [Figure 3.2.11](ref:fig-basis-revenue-elements)
> FIGURE {fig:fig-basis-revenue-elements} number=3.2.11 src=../../media/ch03/basis-revenue-elements-a.svg
> alt: A visual representation of the first basis vector
> caption: A representation of the basis elements of ${\cal B}$.
> subfigure src=../../media/ch03/basis-revenue-elements-a.svg alt: A visual representation of the first basis vector
> subfigure src=../../media/ch03/basis-revenue-elements-b.svg alt: A visual representation of the second basis vector
> subfigure src=../../media/ch03/basis-revenue-elements-c.svg alt: A visual representation of the third basis vector
> subfigure src=../../media/ch03/basis-revenue-elements-d.svg alt: A visual representation of the fourth basis vector
To convert our revenue vectors into the coordinates given by ${\cal B}$, we form the matrices:

$$ P_{{\cal B}} = \left[\begin{array}{rrrr} 1 & 1 & 1 & 0 \\ 1 & 1 & -1 & 0 \\ 1 & -1 & 0 & 1 \\ 1 & -1 & 0 & -1 \\ \end{array}\right],~~~ P_{{\cal B}}^{-1} = \left[\begin{array}{rrrr} \frac14 & \frac14 & \frac14 & \frac14 \\ \frac14 & \frac14 & -\frac14 & -\frac14 \\ \frac12 & -\frac12 & 0 & 0 \\ 0 & 0 & \frac12 & -\frac12 \\ \end{array}\right]. $$

In particular, if the revenue vector is ${\mathbf x} = \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \\ x_4 \end{array}\right]$, then

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{c}\frac14 x_1 + \frac14 x_2 + \frac14 x_3 + \frac14 x_4 \\ \frac14 x_1 + \frac14 x_2 - \frac14 x_3 - \frac14 x_4 \\ \frac12 x_1 - \frac12 x_2 \\ \frac12 x_3 - \frac12 x_4 \end{array}\right]. $$

Notice that the first component of $\left\{{\mathbf x}\right\}_{{\cal B}}$ is the average of the components of ${\mathbf x}$.
For our particular revenue vector ${\mathbf x} = \left[\begin{array}{r}10.3 \\ 13.1 \\ 7.5 \\ 8.2 \end{array}\right]$, we have

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = P_{{\cal B}}^{-1} {\mathbf x} = P_{{\cal B}}^{-1} \left[\begin{array}{r}10.3 \\ 13.1 \\ 7.5 \\ 8.2 \end{array}\right] = \left[\begin{array}{r}9.775 \\ 1.925 \\ -1.400 \\ -0.350 \end{array}\right]. $$

This means that our revenue vector is

$$ {\mathbf x} = 9.775 {\mathbf v}_1 + 1.925 {\mathbf v}_2 - 1.400{\mathbf v}_3 - 0.350 {\mathbf v}_4 $$

. We will think about what these terms mean by adding them together one at a time.
The first term,

$$ 9.775{\mathbf v}_1 = \left[\begin{array}{r}9.775 \\ 9.775 \\ 9.775 \\ 9.775 \end{array}\right], $$

gives us the average revenue over the year.

> IMAGE {img:basis-revenue-approx-1} src=../../media/ch03/basis-revenue-approx-1.svg
> alt: Plot of the revenue data points and a horizontal drawn at their average.

The average revenue for the first two quarters is 11.7, which is 1.925 million dollars above the yearly average. Similarly, the average revenue for the last two quarters is 1.925 million dollars below the yearly average. This is recorded by the second term

$$ 1.925{\mathbf v}_2 = \left[\begin{array}{c}1.925 \\ 1.925 \\ -1.925 \\ -1.925 \end{array}\right]. $$

> IMAGE {img:basis-revenue-approx-2} src=../../media/ch03/basis-revenue-approx-2.svg
> alt: Plot of the data points with horiztonal lines indicating averages over two halves of a year.

Finally, the first quarter's revenue is 1.400 million dollars below the average over the first two quarters and the second quarter's revenue is 1.400 million dollars above that average. This, and the corresponding data for the last two quarters, is captured by the last two terms:

$$ -1.400{\mathbf v}_3 - 0.350{\mathbf v}_4 = \left[\begin{array}{c}-1.400 \\ 1.400 \\ -0.350 \\ 0.350 \end{array}\right] $$

.

> IMAGE {img:basis-revenue-approx-3} src=../../media/ch03/basis-revenue-approx-3.svg
> alt: Four revenue data points and short horizontal lines through each of the points

If we write $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \\ c_4 \end{array}\right]$, we see that the coefficient $c_1$ measures the average revenue over the year, $c_2$ measures the deviation from the annual average in the first and second halves of the year, and $c_3$ measures how the revenue in the first and second quarter differs from the average in the first half of the year. In this way, the coefficients provide a view of the revenue over different time scales, from an annual summary to a finer view of quarterly behavior.
This basis is sometimes called a *Haar* wavelet basis, and the change of basis is known as a *Haar* wavelet transform. In the next section, we will see how this basis provides a useful way to store digital images.
:::

:::activity {act:activity-3-2-4} Activity 3.2.4 (Edge detection)
An important problem in the field of computer vision is to detect edges in a digital photograph, as is shown in [Figure 3.2.12](ref:fig-edge-detection). Edge detection algorithms are useful when, say, we want a robot to locate an object in its field of view. Graphic designers also use these algorithms to create artistic effects.
> FIGURE {fig:fig-edge-detection} number=3.2.12 src=../../media/ch03/spring-canyon-cropped.jpg
> alt: A color photograph of a red rock canyon wall against a blue sky.
> caption: A canyon wall in Capitol Reef National Park and the result of an edge detection algorithm.
> subfigure src=../../media/ch03/spring-canyon-cropped.jpg alt: A color photograph of a red rock canyon wall against a blue sky.
> subfigure src=../../media/ch03/spring-canyon-edges.jpg alt: Black and white image showing the edges detected in the photograph by an edge detection algorithm.
We will consider a very simple version of an edge detection algorithm to give a sense of how this works. Rather than considering a two-dimensional photograph, we will think about a one-dimensional row of pixels in a photograph. The grayscale values of a pixel measure the brightness of a pixel; a grayscale value of 0 corresponds to black, and a value of 255 corresponds to white.
Suppose, for simplicity, that the grayscale values for a row of six pixels are represented by a vector ${\mathbf x}$ in ${\mathbb R}^6$:

$$ {\mathbf x} = \left[\begin{array}{r} 25 \\ 34 \\ 30 \\ 45 \\ 190 \\ 200 \end{array}\right] $$

.

> IMAGE {img:edges-grayscale} src=../../media/ch03/edges-grayscale.svg
> alt: Plot of grayscale values for the six pixels.

We can easily see that there is a jump in brightness between pixels 4 and 5, but how can we detect it computationally? We will introduce a new basis ${\cal B}$ for ${\mathbb R}^6$ with vectors:

$$ {\mathbf v}_1=\left[\begin{array}{r} 1 \\ 0 \\ 0 \\ 0 \\ 0 \\ 0 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r} 1 \\ 1 \\ 0 \\ 0 \\ 0 \\ 0 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r} 1 \\ 1 \\ 1 \\ 0 \\ 0 \\ 0 \end{array}\right], {\mathbf v}_4=\left[\begin{array}{r} 1 \\ 1 \\ 1 \\ 1 \\ 0 \\ 0 \end{array}\right], {\mathbf v}_5=\left[\begin{array}{r} 1 \\ 1 \\ 1 \\ 1 \\ 1 \\ 0 \end{array}\right], {\mathbf v}_6=\left[\begin{array}{r} 1 \\ 1 \\ 1 \\ 1 \\ 1 \\ 1 \end{array}\right] $$

.

a) 
    Construct the matrix $P_{\cal B}$ that relates the standard coordinate system with the coordinates in the basis ${\cal B}$.

b) 
    Determine the matrix $P_{\cal B}^{-1}$ that converts the representation of ${\mathbf x}$ in standard coordinates into the coordinate system defined by ${\cal B}$.

    :::sage
    ```sage

    ```
    :::

c) 
    Suppose the vectors are expressed in general terms as

    $$ {\mathbf x} = \left[\begin{array}{r} x_1 \\ x_2 \\ x_3 \\ x_4 \\ x_5 \\ x_6 \end{array}\right],~~~ \left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r} c_1 \\ c_2 \\ c_3 \\ c_4 \\ c_5 \\ c_6 \end{array}\right] $$

    . Using the relationship $\left\{{\mathbf x}\right\}_{{\cal B}} = P_{{\cal B}}^{-1}{\mathbf x}$, determine an expression for the coefficient $c_2$ in terms of $x_1,x_2,\ldots,x_6$. What does $c_2$ measure in terms of the grayscale values of the pixels? What does $c_4$ measure in terms of the grayscale values of the pixels?

d) 
    Now for the specific vector

    $$ {\mathbf x} = \left[\begin{array}{r} 25 \\ 34 \\ 30 \\ 45 \\ 190 \\ 200 \end{array}\right] $$

    , determine the representation of ${\mathbf x}$ in the ${\cal B}$-coordinate system.

e) 
    Explain how the coefficients in $\left\{{\mathbf x}\right\}_{{\cal B}}$ determine the location of the jump in brightness in the grayscale values represented by the vector ${\mathbf x}$.

Readers who are familiar with calculus may recognize that this change of basis converts a vector ${\mathbf x}$ into $\left\{{\mathbf x}\right\}_{{\cal B}}$, the set of changes in ${\mathbf x}$. This process is similar to differentiation in calculus. Similarly, the process of converting $\left\{{\mathbf x}\right\}_{{\cal B}}$ into the vector ${\mathbf x}$ adds together the changes in a process similar to integration. As a result, this change of basis represents a linear algebraic version of the Fundamental Theorem of Calculus.
SOLUTION:

a) 
    We form the matrix

    $$ P_{{\cal B}} = \left[\begin{array}{rrrrrr} 1 & 1 & 1 & 1 & 1 & 1 \\ 0 & 1 & 1 & 1 & 1 & 1 \\ 0 & 0 & 1 & 1 & 1 & 1 \\ 0 & 0 & 0 & 1 & 1 & 1 \\ 0 & 0 & 0 & 0 & 1 & 1 \\ 0 & 0 & 0 & 0 & 0 & 1 \end{array}\right]\text{.} $$

b) 
    We find that

    $$ P_{{\cal B}}^{-1} = \left[\begin{array}{rrrrrr} 1 & -1 & 0 & 0 & 0 & 0 \\ 0 & 1 & -1 & 0 & 0 & 0 \\ 0 & 0 & 1 & -1 & 0 & 0 \\ 0 & 0 & 0 & 1 & -1 & 0 \\ 0 & 0 & 0 & 0 & 1 & -1 \\ 0 & 0 & 0 & 0 & 0 & 1 \end{array}\right]\text{.} $$

c) 
    We see that $c_2=x_3-x_2$ so $c_2$ measures the change in brightness between one pixel and its neighbor. Similarly, $c_4=x_5-x_4$, which measures another change in brightness.

d) 
    We compute that

    $$ \left\{{\mathbf x}\right\}_{{\cal B}}=P_{{\cal B}}^{-1}{\mathbf x} = \left[\begin{array}{c} -9 \\ 4 \\ -15 \\ -145 \\ -10 \\ 200 \end{array}\right]\text{.} $$

e) 
    Most of the coefficients that measure changes are relatively small in absolute value. The coefficient $c_4$, however, which measures the change in brightness between the fourth and fifth pixel, has a large absolute value. This tells us that there is a large change in brightness between the fourth and fifth pixel, which points to an edge in the image.

:::

## 3.2.5 Summary

We defined a basis to be a set of vectors ${\cal B} = \{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\}$ that is linearly independent and whose span is ${\mathbb R}^m$.

- 
    A set of vectors forms a basis for ${\mathbb R}^m$ if and only if the matrix

    $$ A = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \end{array}\right] \sim I $$

    . This means there must be $m$ vectors in a basis for ${\mathbb R}^m$.

- 
    If ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m$ forms a basis for ${\mathbb R}^m$, then any vector in ${\mathbb R}^m$ can be written as a linear combination of the vectors in exactly one way.

- 
    We used the basis ${\cal B}$ to define a coordinate system in which $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{c}c_1 \\ c_2 \\ \vdots \\ c_n \end{array}\right]$, the coordinates of ${\mathbf x}$ in the basis ${\cal B}$, are defined by

    $$ {\mathbf x} = c_1{\mathbf v}_1+c_2{\mathbf v}_2 + \cdots + c_n{\mathbf v}_m $$

    .

- 
    Forming the matrix $P_{{\cal B}}$ whose columns are the basis vectors, we can convert between coordinate systems:

    $$ \begin{aligned} x & {}={} P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}, \\ P_{{\cal B}}^{-1} x & {}={} \left\{{\mathbf x}\right\}_{{\cal B}}. \\ \end{aligned} $$

    .

## 3.2.6 Exercises

:::exercise {exercise-3-2-001} number=3.2.1 answered=yes src=src/exercises/exercises3-2.xml:5
PROBLEM:
Shown in [Figure 3.2.13](ref:fig-ex-basis) are two vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ in the plane ${\mathbb R}^2$.
> FIGURE {fig:fig-ex-basis} number=3.2.13 src=../../media/ch03/ex-basis-3-2.svg
> alt: Two vectors and the skewed grid of linear combinations that they define.
> width: 60%
> caption: Vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ in ${\mathbb R}^2$.

a) 
    Explain why ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2\}$ is a basis for ${\mathbb R}^2$.

b) 
    Using [Figure 3.2.13](ref:fig-ex-basis), indicate the vectors ${\mathbf x}$ such that

    1. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}2 \\ -1 \end{array}\right]$

    2. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}-1 \\ -2 \end{array}\right]$

    3. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ 3 \end{array}\right]$

c) 
    Using [Figure 3.2.13](ref:fig-ex-basis), find the representation $\left\{{\mathbf x}\right\}_{{\cal B}}$ if

    1. 
        ${\mathbf x} = \left[\begin{array}{r}-2 \\ -1 \end{array}\right]$.

    2. 
        ${\mathbf x} = \left[\begin{array}{r}2 \\ 4 \end{array}\right]$.

    3. 
        ${\mathbf x} = \left[\begin{array}{r}2 \\ -5 \end{array}\right]$.

d) 
    Find $\left\{{\mathbf x}\right\}_{{\cal B}}$ if ${\mathbf x}=\left[\begin{array}{r}60 \\ 90 \end{array}\right]$.

ANSWER:

a) 
    The vectors are linearly independent and span ${\mathbb R}^2$.

b) 
    The grid on the figure indicates that

    1. 
        ${\mathbf x} = \left[\begin{array}{r}-6 \\ 3 \end{array}\right]$.

    2. 
        ${\mathbf x} = \left[\begin{array}{r}-2 \\ -4 \end{array}\right]$.

    3. 
        ${\mathbf x} = \left[\begin{array}{r}6 \\ 3 \end{array}\right]$.

c) 
    The grid on the figure indicates that

    1. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ -1 \end{array}\right]$.

    2. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ 2 \end{array}\right]$.

    3. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}-2 \\ -1 \end{array}\right]$.

d) 
    $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}20 \\ 50 \end{array}\right]$.

SOLUTION:

a) 
    The vectors are linearly independent and span ${\mathbb R}^2$. We can see this by forming the matrix

    $$ \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right] = \left[\begin{array}{rr} -2 & 2 \\ 2 & 1 \\ \end{array}\right] \sim \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right]\text{.} $$

b) 
    The grid on the figure indicates that

    1. 
        ${\mathbf x} = \left[\begin{array}{r}-6 \\ 3 \end{array}\right]$.

    2. 
        ${\mathbf x} = \left[\begin{array}{r}-2 \\ -4 \end{array}\right]$.

    3. 
        ${\mathbf x} = \left[\begin{array}{r}6 \\ 3 \end{array}\right]$.

c) 
    The grid on the figure indicates that

    1. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ -1 \end{array}\right]$.

    2. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ 2 \end{array}\right]$.

    3. 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}-2 \\ -1 \end{array}\right]$.

d) 
    We form the matrix

    $$ P_{{\cal B}}=\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right] = \left[\begin{array}{rr} -2 & 2 \\ 2 & 1 \\ \end{array}\right] $$

    so that ${\mathbf x}=P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}$. We then need to solve the equation $P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}60 \\ 90 \end{array}\right]$, which gives $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}20 \\ 50 \end{array}\right]$.

:::

:::exercise {exercise-3-2-002} number=3.2.2 answered=yes src=src/exercises/exercises3-2.xml:149
PROBLEM:
Consider vectors

$$ \begin{aligned} {\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right], & {\mathbf v}_2=\left[\begin{array}{r}1 \\ -3 \end{array}\right] \\ {\mathbf w}_1=\left[\begin{array}{r}2 \\ 3 \end{array}\right], & {\mathbf w}_2=\left[\begin{array}{r}-1 \\ -2 \end{array}\right] \text{.} \\ \end{aligned} $$

and let ${\cal B} = \{{\mathbf v}_1,{\mathbf v}_2\}$ and ${\cal C} = \{{\mathbf w}_1,{\mathbf w}_2\}$.

a) 
    Explain why ${\cal B}$ and ${\cal C}$ are both bases of ${\mathbb R}^2$.

b) 
    If ${\mathbf x} = \left[\begin{array}{r}5 \\ -3 \end{array}\right]$, find $\left\{{\mathbf x}\right\}_{{\cal B}}$ and $\left\{{\mathbf x}\right\}_{{\cal C}}$.

c) 
    If $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}2 \\ -4 \end{array}\right]$, find ${\mathbf x}$ and $\left\{{\mathbf x}\right\}_{{\cal C}}$.

d) 
    If $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}-3 \\ 2 \end{array}\right]$, find ${\mathbf x}$ and $\left\{{\mathbf x}\right\}_{{\cal B}}$.

e) 
    Find a matrix $Q$ such that $\left\{{\mathbf x}\right\}_{{\cal B}} = Q\left\{{\mathbf x}\right\}_{{\cal C}}$.

ANSWER:

a) 
    The sets of the vectors are both linearly independent and span ${\mathbb R}^2$.

b) 
    $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}12/5 \\ 13/5 \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}13 \\ 21 \end{array}\right]$.

c) 
    ${\mathbf x}= \left[\begin{array}{r}-2 \\ 16 \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}-20 \\ -38 \end{array}\right]$.

d) 
    ${\mathbf x}=\left[\begin{array}{r}-8 \\ -13 \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}-37/5 \\ -3/5 \end{array}\right]$.

e) 
    $Q = \left[\begin{array}{rr} \frac95 & -1 \\ \frac15 & 0 \\ \end{array}\right]$.

SOLUTION:

a) 
    In both cases, we see that

    $$ P_{{\cal B}}=\left[\begin{array}{rr} {\mathbf v}_1&{\mathbf v}_2 \end{array}\right] \sim \left[\begin{array}{rr} 1&0\\ 0&1\\ \end{array}\right],~~~ P_{{\cal C}}=\left[\begin{array}{rr} {\mathbf w}_1&{\mathbf w}_2 \end{array}\right] \sim \left[\begin{array}{rr} 1&0\\ 0&1\\ \end{array}\right] $$

    so that both sets of vectors are linearly independent and span ${\mathbb R}^2$.

b) 
    We solve $P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} = {\mathbf x}$ and $P_{{\cal C}}\left\{{\mathbf x}\right\}_{{\cal C}} = {\mathbf x}$ to find $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}12/5 \\ 13/5 \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}13 \\ 21 \end{array}\right]$.

c) 
    We have ${\mathbf x}=P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}-2 \\ 16 \end{array}\right]$. We then solve $P_{{\cal C}}\left\{{\mathbf x}\right\}_{{\cal C}} = \left[\begin{array}{r}-2 \\ 16 \end{array}\right]$ to find $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}-20 \\ -38 \end{array}\right]$.

d) 
    In the same way, we find ${\mathbf x}=\left[\begin{array}{r}-8 \\ -13 \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}}=\left[\begin{array}{r}-37/5 \\ -3/5 \end{array}\right]$.

e) 
    We have $\left\{{\mathbf x}\right\}_{{\cal B}} = P_{{\cal B}}^{-1}{\mathbf x} = P_{{\cal B}}^{-1}P_{{\cal C}}\left\{{\mathbf x}\right\}_{{\cal C}}$, which shows that $Q = P_{{\cal B}}^{-1}P_{{\cal C}}= \left[\begin{array}{rr} \frac95 & -1 \\ \frac15 & 0 \\ \end{array}\right]$.

:::

:::exercise {exercise-3-2-003} number=3.2.3 answered=yes src=src/exercises/exercises3-2.xml:267
PROBLEM:
Consider the following vectors in ${\mathbb R}^4$:

$$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right], {\mathbf v}_2 = \left[\begin{array}{r}0 \\ 1 \\ 1 \\ 1 \end{array}\right], {\mathbf v}_3 = \left[\begin{array}{r}0 \\ 0 \\ 1 \\ 1 \end{array}\right], {\mathbf v}_4 = \left[\begin{array}{r}0 \\ 0 \\ 0 \\ 1 \end{array}\right] $$

.

a) 
    Explain why ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4\}$ forms a basis for ${\mathbb R}^4$.

b) 
    Explain how to convert $\left\{{\mathbf x}\right\}_{{\cal B}}$, the representation of a vector ${\mathbf x}$ in the coordinates defined by ${\cal B}$, into ${\mathbf x}$, its representation in the standard coordinate system.

c) 
    Explain how to convert the vector ${\mathbf x}$ into $\left\{{\mathbf x}\right\}_{{\cal B}}$, its representation in the coordinate system defined by ${\cal B}$.

d) 
    If ${\mathbf x}=\left[\begin{array}{r}23 \\ 12 \\ 10 \\ 19 \end{array}\right]$, find $\left\{{\mathbf x}\right\}_{{\cal B}}$.

e) 
    If $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}3 \\ 1 \\ -3 \\ -4 \end{array}\right]$, find ${\mathbf x}$.

ANSWER:

a) 
    The vectors are linearly independent and span ${\mathbb R}^4$.

b) 
    We have ${\mathbf x} = P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}$.

c) 
    We have $\left\{{\mathbf x}\right\}_{{\cal B}} = P_{{\cal B}}^{-1}{\mathbf x}$.

d) 
    $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}23 \\ -11 \\ -2 \\ 9 \end{array}\right]$.

e) 
    ${\mathbf x}=\left[\begin{array}{r}3 \\ 4 \\ 1 \\ -3 \end{array}\right]$.

SOLUTION:

a) 
    Form the matrix

    $$ P_{{\cal B}} = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 1 & 1 & 0 & 0 \\ 1 & 1 & 1 & 0 \\ 1 & 1 & 1 & 1 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{array}\right]\text{,} $$

    which shows that the vectors are linearly independent and span ${\mathbb R}^4$.

b) 
    We have ${\mathbf x} = P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}$.

c) 
    We have $\left\{{\mathbf x}\right\}_{{\cal B}} = P_{{\cal B}}^{-1}{\mathbf x}$ where

    $$ P_{{\cal B}}^{-1} = \left[\begin{array}{rrrr} 1 & 0 & 0 & 0 \\ -1 & 1 & 0 & 0 \\ 0 & -1 & 1 & 0 \\ 0 & 0 & -1 & 1 \end{array}\right]\text{.} $$

d) 
    We find $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}23 \\ -11 \\ -2 \\ 9 \end{array}\right]$.

e) 
    We find ${\mathbf x}=\left[\begin{array}{r}3 \\ 4 \\ 1 \\ -3 \end{array}\right]$.

:::

:::exercise {exercise-3-2-004} number=3.2.4 answered=yes src=src/exercises/exercises3-2.xml:376
PROBLEM:
Consider the following vectors in ${\mathbb R}^3$:

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 3 \\ 2 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \\ 4 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}-2 \\ -5 \\ 0 \end{array}\right], {\mathbf v}_4=\left[\begin{array}{r}-2 \\ -1 \\ -1 \end{array}\right], {\mathbf v}_5=\left[\begin{array}{r}1 \\ -2 \\ -1 \end{array}\right] $$

.

a) 
    Do these vectors form a basis for ${\mathbb R}^3$? Explain your thinking.

    :::sage
    ```sage

    ```
    :::

b) 
    Find a subset of these vectors that forms a basis of ${\mathbb R}^3$.

c) 
    Suppose you have a set of vectors ${\mathbf v}_1, {\mathbf v}_2,\ldots,{\mathbf v}_6$ in ${\mathbb R}^4$ such that

    $$ \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_6 \end{array}\right] \sim \left[\begin{array}{rrrrrr} 1 & 0 & -2 & 0 & 1 & 0 \\ 0 & 1 & 3 & 0 & -4 & 0 \\ 0 & 0 & 0 & 1 & 2 & 0 \\ 0 & 0 & 0 & 0 & 0 & 1 \\ \end{array}\right] $$

    . Find a subset of the vectors that forms a basis for ${\mathbb R}^4$.

ANSWER:

a) 
    No, because a basis for ${\mathbb R}^3$ must contain exactly three vectors.

b) 
    ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_4$.

c) 
    ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_4$, and ${\mathbf v}_6$.

SOLUTION:

a) 
    Looking at the reduced row echelon form, we find

    $$ \left[\begin{array}{rrrrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 & {\mathbf v}_4 & {\mathbf v}_5 \\ \end{array}\right] \sim \left[\begin{array}{rrrrr} 1 & 0 & - 2 & 0 & -1 \\ 0 & 1 & 1 & 0 & 0 \\ 0 & 0 & 0 & 1 & -1 \\ \end{array}\right]\text{.} $$

    This shows that the vectors are not linearly independent since there is not a pivot position in every column. Therefore, the set of vectors does not form a basis for ${\mathbb R}^3$. Of course, we also know this because a set of vectors for ${\mathbb R}^3$ must contain exactly three vectors.

b) 
    From the reduced row echelon form, we see that the set of vectors spans ${\mathbb R}^3$ because there is a pivot position in every row. We also see that ${\mathbf v}_3 = -2{\mathbf v}_1+{\mathbf v}_2$ and ${\mathbf v}_5 = -{\mathbf v}_1-{\mathbf v}_4$. This means that ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_4$ will span ${\mathbb R}^3$ and therefore form a basis.

c) 
    In the same way, we see that ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_4$, and ${\mathbf v}_6$ for a basis for ${\mathbb R}^4$.

:::

:::exercise {exercise-3-2-005} number=3.2.5 answered=yes src=src/exercises/exercises3-2.xml:477
PROBLEM:
This exercise involves a simple Fourier transform, which will play an important role in the next section.
Suppose that we have the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}\cos\left(\frac\pi6\right) \\ \cos\left(\frac{3\pi}6\right) \\ \cos\left(\frac{5\pi}6\right) \end{array}\right] {\mathbf v}_3=\left[\begin{array}{r}\cos\left(\frac{2\pi}6\right) \\ \cos\left(\frac{6\pi}6\right) \\ \cos\left(\frac{10\pi}6\right) \end{array}\right] $$

.

a) 
    Explain why ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\}$ is a basis for ${\mathbb R}^3$. Notice that you may enter $\cos\left(\frac\pi6\right)$ into Sage as `cos(pi/6)`.

    :::sage
    ```sage

    ```
    :::

b) 
    If ${\mathbf x}=\left[\begin{array}{r}15 \\ 15 \\ 15 \end{array}\right]$, find $\left\{{\mathbf x}\right\}_{{\cal B}}$.

c) 
    Find the matrices $P_{{\cal B}}$ and $P_{{\cal B}}^{-1}$. If ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \end{array}\right]$, explain why $c_1$ is the average of $x_1$, $x_2$, and $x_3$.

ANSWER:

a) 
    The vectors are linearly independent and span ${\mathbb R}^3$.

b) 
    $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}15 \\ 0 \\ 0 \end{array}\right]$.

c) 
    Since we have $\left\{{\mathbf x}\right\}_{{\cal B}}=C_{{\cal B}}^{-1}{\mathbf x}$, we have $c_1=\frac13 x_1 + \frac13 x_2 + \frac13 x_3 = \frac13(x_1+x_2+x_3)$.

SOLUTION:

a) 
    By forming the matrix $P_{{\cal B}}=\left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array}\right]$ and finding its reduced row echelon form, we see that the vectors are linearly independent and span ${\mathbb R}^3$. They therefore form a basis of ${\mathbb R}^3$.

b) 
    We solve $P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} = {\mathbf x}$ to find $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}15 \\ 0 \\ 0 \end{array}\right]$.

c) 
    We have

    $$ P_{{\cal B}}= \left[\begin{array}{rrr} 1 & \frac{\sqrt{3}}{2} & \frac{1}{2} \\ 1 & 0 & -1 \\ 1 & -\frac{\sqrt{3}}{2} & \frac{1}{2} \end{array}\right],~~~ P_{{\cal B}}^{-1}= \left[\begin{array}{rrr} \frac{1}{3} & \frac{1}{3} & \frac{1}{3} \\ \frac{\sqrt{3}}{3} & 0 & -\frac{\sqrt{3}}{3} \\ \frac{1}{3} & -\frac{2}{3} & \frac{1}{3} \end{array}\right]\text{.} $$

    Since we have $\left\{{\mathbf x}\right\}_{{\cal B}}=C_{{\cal B}}^{-1}{\mathbf x}$, we have $c_1=\frac13 x_1 + \frac13 x_2 + \frac13 x_3 = \frac13(x_1+x_2+x_3)$.

:::

:::exercise {exercise-3-2-006} number=3.2.6 answered=yes src=src/exercises/exercises3-2.xml:579
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    If the columns of a matrix $A$ form a basis for ${\mathbb R}^m$, then $A$ is invertible.

b) 
    There must be 125 vectors in a basis for ${\mathbb R}^{125}$.

c) 
    If ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\}$ is a basis of ${\mathbb R}^m$, then every vector in ${\mathbb R}^m$ can be expressed as a linear combination of basis vectors.

d) 
    The coordinates $\left\{{\mathbf x}\right\}_{{\cal B}}$ are the weights that form ${\mathbf x}$ as a linear combination of basis vectors.

e) 
    If the basis vectors form the columns of the matrix $P_{{\cal B}}$, then $\left\{{\mathbf x}\right\}_{{\cal B}} = P_{{\cal B}}{\mathbf x}$.

ANSWER:

a) 
    True

b) 
    True

c) 
    True

d) 
    True

e) 
    False

SOLUTION:

a) 
    True. If the columns of $A$ form a basis, then $A$ has a pivot position in every row and every column. Therefore, the reduced row echelon form of $A$ is the identity matrix, which implies that $A$ is invertible.

b) 
    True. The number of vectors in a basis of ${\mathbb R}^m$ must be $m$.

c) 
    True. If ${\cal B}$ is a basis, then the vectors in ${\cal B}$ span ${\mathbb R}^m$, which means that every vector in ${\mathbb R}^m$ can be written as a linear combination of the vectors in ${\cal B}$.

d) 
    True. This is the definition of $\left\{{\mathbf x}\right\}_{{\cal B}}$.

e) 
    False. The relationship is ${\mathbf x}=P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}$.

:::

:::exercise {exercise-3-2-007} number=3.2.7 answered=yes src=src/exercises/exercises3-2.xml:654
PROBLEM:
Provide a justification for your response to each of the following questions.

a) 
    Suppose you have $m$ linearly independent vectors in ${\mathbb R}^m$. Can you guarantee that they form a basis of ${\mathbb R}^m$?

b) 
    If $A$ is an invertible $m\times m$ matrix, do the columns necessarily form a basis of ${\mathbb R}^m$?

c) 
    Suppose we have an invertible $m\times m$ matrix $A$, and we perform a sequence of row operations on $A$ to form a matrix $B$. Can you guarantee that the columns of $B$ form a basis for ${\mathbb R}^m$?

d) 
    Suppose you have a set of 10 vectors in ${\mathbb R}^{10}$ and that every vector in ${\mathbb R}^{10}$ can be written as a linear combination of these vectors. Can you guarantee that this set of vectors is a basis for ${\mathbb R}^{10}$?

ANSWER:

a) 
    Yes

b) 
    Yes

c) 
    Yes

d) 
    Yes

SOLUTION:

a) 
    Yes. A matrix formed from $m$ linearly independent vectors in ${\mathbb R}^m$ will have a pivot position in every column. Since the matrix has the same number of rows and columns, there must also be a pivot position in every row. This means that the vectors span ${\mathbb R}^m$ and therefore form a basis.

b) 
    Yes. An invertible matrix is row equivalent to the identity matrix, which means that the columns are linearly independent and span ${\mathbb R}^m$. This implies that the columns form a basis of ${\mathbb R}^m$.

c) 
    Yes. The matrix $A$ is row equivalent to the identity matrix so $B$ must be as well. This means that the columns of $B$ form a basis for ${\mathbb R}^m$.

d) 
    Yes. The span of the set of vectors is ${\mathbb R}^{10}$, which says that the associated matrix is square and has a pivot position in every row. Therefore, it must have a pivot position in every column, which means that the set of vectors forms a basis for ${\mathbb R}^{10}$.

:::

:::exercise {exercise-3-2-008} number=3.2.8 answered=yes src=src/exercises/exercises3-2.xml:727
PROBLEM:
Crystallographers find it convenient to use coordinate systems that are adapted to the specific geometry of a crystal. As a two-dimensional example, consider a layer of graphite in which carbon atoms are arranged in regular hexagons to form the crystalline structure shown in [Figure 3.2.14](ref:fig-ex-graphite).
> FIGURE {fig:fig-ex-graphite} number=3.2.14 src=../../media/ch03/ex-graphite.svg
> alt: The hexagonal array of carbon atoms in a layer of graphite.
> width: 60%
> caption: A layer of carbon atoms in a graphite crystal.
The origin of the coordinate system is at the carbon atom labeled by “0”. It is convenient to choose the basis ${\cal B}$ defined by the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ and the coordinate system it defines.

a) 
    Locate the points ${\mathbf x}$ for which

    (i) 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$,

    (ii) 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ 1 \end{array}\right]$,

    (iii) 
        $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

b) 
    Find the coordinates $\left\{{\mathbf x}\right\}_{{\cal B}}$ for all the carbon atoms in the hexagon whose lower left vertex is labeled “0”.

c) 
    What are the coordinates $\left\{{\mathbf x}\right\}_{{\cal B}}$ of the center of that hexagon, which is labeled “C”?

d) 
    How do the coordinates of the atoms in the hexagon whose lower left corner is labeled “1” compare to the coordinates in the hexagon whose lower left corner is labeled "0"?

e) 
    Does the point ${\mathbf x}$ whose coordinates are $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}16 \\ 4 \end{array}\right]$ correspond to a carbon atom or the center of a hexagon?

ANSWER:

a) 
    The points are indicated in the figure.

    > IMAGE {img:ex-graphite-sol} src=../../media/ch03/ex-graphite-sol.svg
    > width: 50%

b) 
    $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \end{array}\right], \left[\begin{array}{r}2 \\ 1 \end{array}\right], \left[\begin{array}{r}2 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 2 \end{array}\right], \left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

c) 
    $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$.

d) 
    The coordinates differ by $\left[\begin{array}{r}4 \\ 2 \end{array}\right]$

e) 
    It is the center of a hexagon.

SOLUTION:

a) 
    The points are indicated in [](ref:fig-ex-graphite-sol).

    > FIGURE {fig:fig-ex-graphite-sol} number= src=../../media/ch03/ex-graphite-sol.svg
    > alt: 
    > width: 50%
    > caption: The points requested in part a of this exercise.

b) 
    Moving counterclockwise around the hexagon, the coordinates are

    $$ \left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \end{array}\right], \left[\begin{array}{r}2 \\ 1 \end{array}\right], \left[\begin{array}{r}2 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 2 \end{array}\right], \left[\begin{array}{r}0 \\ 1 \end{array}\right]\text{.} $$

c) 
    $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$.

d) 
    We obtain the coordinates for the hexagon with the vertex labeled “1” by adding the coordinate expression of the point “1”, which is $\left\{{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}4 \\ 2 \end{array}\right]$ to those of the original hexagon.

e) 
    It is the center of a hexagon. Adding or subtracting $\left[\begin{array}{r}3 \\ 0 \end{array}\right]$ to the coordinates translates one hexagon to another. This means that $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}16 \\ 4 \end{array}\right]$ can be translated to $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ 4 \end{array}\right]$, which is the center of a hexagon.

:::

:::exercise {exercise-3-2-009} number=3.2.9 answered=yes src=src/exercises/exercises3-2.xml:887
PROBLEM:
Suppose that $A=\left[\begin{array}{rr} 2 & 1 \\ 1& 2 \\ \end{array}\right]$ and

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right],~~~ {\mathbf v}_2=\left[\begin{array}{r}1 \\ -1 \end{array}\right] $$

.

a) 
    Explain why ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2\}$ is a basis for ${\mathbb R}^2$.

b) 
    Find $A{\mathbf v}_1$ and $A{\mathbf v}_2$.

c) 
    Use what you found in the previous part of this problem to find $\left\{A{\mathbf v}_1\right\}_{{\cal B}}$ and $\left\{A{\mathbf v}_2\right\}_{{\cal B}}$.

d) 
    If $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ -5 \end{array}\right]$, find $\left\{A{\mathbf x}\right\}_{{\cal B}}$.

e) 
    Find a matrix $D$ such that $\left\{A{\mathbf x}\right\}_{{\cal B}} = D\left\{{\mathbf x}\right\}_{{\cal B}}$.

You should find that the matrix $D$ is a very simple matrix, which means that this basis ${\cal B}$ is well suited to study the effect of multiplication by $A$. This observation is the central idea of the next chapter.
ANSWER:

a) 
    The vectors are linearly independent and span ${\mathbb R}^2$.

b) 
    $A{\mathbf v}_1 = 3{\mathbf v}_1$ and $A{\mathbf v}_2={\mathbf v}_2$.

c) 
    $\left\{A{\mathbf v}_1\right\}_{{\cal B}} = \left[\begin{array}{r}3 \\ 0 \end{array}\right]$ and $\left\{A{\mathbf v}_2\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

d) 
    $\left\{A{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}3 \\ -5 \end{array}\right]$.

e) 
    $D= \left[\begin{array}{rr} 3 & 0 \\ 0 & 1 \\ \end{array}\right]$.

SOLUTION:

a) 
    The vectors are linearly independent and span ${\mathbb R}^2$.

b) 
    We compute that $A{\mathbf v}_1 = 3{\mathbf v}_1$ and $A{\mathbf v}_2={\mathbf v}_2$.

c) 
    $\left\{A{\mathbf v}_1\right\}_{{\cal B}} = \left[\begin{array}{r}3 \\ 0 \end{array}\right]$ and $\left\{A{\mathbf v}_2\right\}_{{\cal B}} = \left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

d) 
    We know that ${\mathbf x} = {\mathbf v}_1-5{\mathbf v}_2$, which means that $A{\mathbf x} = 3{\mathbf v}_1-5{\mathbf v}_2$. Therefore, $\left\{A{\mathbf x}\right\}_{{\cal B}}=\left[\begin{array}{r}3 \\ -5 \end{array}\right]$.

e) 
    If $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}c_1 \\ c_2 \end{array}\right]$, then ${\mathbf x}=c_1{\mathbf v}_1+c_2{\mathbf v}_2$ and $A{\mathbf x}=3c_1{\mathbf v}_1+c_2{\mathbf v}_2$. Therefore, $D\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right] = \left[\begin{array}{r}3c_1 \\ c_2 \end{array}\right]$, which says that $D= \left[\begin{array}{rr} 3 & 0 \\ 0 & 1 \\ \end{array}\right]$.

:::
