# 2.5 Matrix transformations {sec-linear-trans}

The past few sections introduced us to matrix-vector multiplication as a means of thinking geometrically about the solutions to a linear system. In particular, we rewrote a linear system as a matrix equation $A{\mathbf x} = {\mathbf b}$ and developed the concepts of span and linear independence in response to our [two fundamental questions.](ref:1.4#fundamental-questions)
In this section, we will explore how matrix-vector multiplication defines certain types of functions, which we call *matrix transformations*, similar to those encountered in previous algebra courses. In particular, we will develop some algebraic tools for thinking about matrix transformations and look at some motivating examples. In the next section, we will see how matrix transformations describe important geometric operations and how they are used in computer animation.

## 2.5.1 Introduction

:::exploration {act:preview-2-5-1} Preview Activity 2.5.1
We will begin by considering a more familiar situation; namely, the function $f(x) = x^2$, which takes a real number $x$ as an input and produces its square $x^2$ as its output.
PROBLEM:
a) What is the value of $f(3)$?
b) Can we solve the equation $f(x) = 4$? If so, is the solution unique?
c) Can we solve the equation $f(x) = -10$? If so, is the solution unique?
d) Sketch a graph of the function $f(x)=x^2$ in [Figure 2.5.1](ref:fig-graph-square).
    > FIGURE {fig:fig-graph-square} number=2.5.1 src=../../media/ch02/empty-4.svg
    > alt: A coordinate grid and set of axes.
    > width: 50%
    > caption: Graph the function $f(x)=x^2$ above.
e) We will now consider functions having the form $g(x)=mx$. Draw a graph of the function $g(x) = 2x$ on the left in [Figure 2.5.2](ref:fig-graph-linear).
    > FIGURE {fig:fig-graph-linear} number=2.5.2 src=../../media/ch02/empty-4.svg
    > alt: A coordinate grid and set of axes.
    > caption: Graphs of the function $g(x)=2x$ and $h(x) = -\frac13 x$.
    > subfigure src=../../media/ch02/empty-4.svg alt: A coordinate grid and set of axes.
    > subfigure src=../../media/ch02/empty-4.svg alt: A coordinate grid and set of axes.
f) Draw a graph of the function $h(x) = -\frac13 x$ on the right of [Figure 2.5.2](ref:fig-graph-linear).
g) Remember that composing two functions means we use the output from one function as the input into the other; that is, $(g\circ h)(x) = g(h(x))$. What function results from composing $(g\circ h)(x)$?
ANSWER:
a) $f(3) = 3^2 = 9$.
b) There is not a unique solution.
c) There are no solutions.
d) > IMAGE {img:ex-graph-x-squared} src=../../media/ch02/ex-graph-x-squared.svg
    > width: 50%
e) The graph is shown on the left below.
    > IMAGE {img:ex-graph-2x} src=../../media/ch02/ex-graph-2x.svg

    > IMAGE {img:ex-graph-fracx} src=../../media/ch02/ex-graph-fracx.svg

f) The graph is shown on the right above.
g) $g(h(x)) = g(-\frac13x)= -\frac23 x$.
SOLUTION:
a) We find $f(3) = 3^2 = 9$.
b) If $f(x)=x^2 = 4$, then $x = \pm2$ so there is not a unique solution.
c) There are no solutions to the equation $f(x)=x^2=-10$.
d) > IMAGE {img:ex-graph-x-squared} src=../../media/ch02/ex-graph-x-squared.svg
    > width: 50%
e) The graph is shown on the left below.
    > IMAGE {img:ex-graph-2x} src=../../media/ch02/ex-graph-2x.svg

    > IMAGE {img:ex-graph-fracx} src=../../media/ch02/ex-graph-fracx.svg

f) The graph is shown on the right above.
g) Composing the functions, we find that $g(h(x)) = g(-\frac13x)= -\frac23 x$. We see that the composition is a new linear function whose slope is obtained by multiplying the slopes of $g$ and $h$.
:::

## 2.5.2 Matrix transformations

In the preview activity, we considered familiar linear functions of a single variable, such as $g(x) = 2x$. We construct a function like this by choosing a number $m$; when given an input $x$, the output $g(x) = mx$ is formed by multiplying $x$ by $m$.

In this section, we will consider functions whose inputs are vectors and whose outputs are vectors defined through matrix-vector multiplication. That is, if $A$ is a matrix and ${\mathbf x}$ is a vector, the function $T({\mathbf x}) = A{\mathbf x}$ forms the product $A{\mathbf x}$ as its output. Such a function is called a matrix transformation.

:::definition {def:definition-2-5-3} Definition 2.5.3
{index-entry:matrix transformation} The *matrix transformation*{index:matrix transformation} associated to the matrix $A$ is the function that assigns to the vector ${\mathbf x}$ the vector $A{\mathbf x}$; that is, $T({\mathbf x}) = A{\mathbf x}$.
:::

:::example {ex:example-matrix-to-mt} Example 2.5.4
The matrix $A = \begin{bmatrix} 3 & -2 \\ 1 & 2 \\ 0 & 3 \end{bmatrix}$ defines a matrix transformation $T({\mathbf x}) = A{\mathbf x}$ in the following way:

$$ T\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) = \begin{bmatrix} 3 & -2 \\ 1 & 2 \\ 0 & 3 \end{bmatrix} \left[\begin{array}{r}x_1 \\ x_2 \end{array}\right] = \left[\begin{array}{c}3x_1 - 2x_2 \\ x_1 + 2x_2 \\ 3x_2 \end{array}\right]. $$

Notice that the input to $T$ is a two-dimensional vector $\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$ and the output is a three-dimensional vector $\left[\begin{array}{c}3x_1 - 2x_2 \\ x_1 + 2x_2 \\ 3x_2 \end{array}\right]$. As a shorthand, we will write

$$ T:{\mathbb R}^2\to{\mathbb R}^3 $$

to indicate that the inputs are two-dimensional vectors and the outputs are three-dimensional vectors.
:::

:::example {ex:example-mt-to-matrix} Example 2.5.5
Suppose we have a function $T:{\mathbb R}^3\to{\mathbb R}^2$ that has the form

$$ T\left(\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]\right) = \begin{bmatrix} -4x_1 -x_2 + 2x_3 \\ x_1 + 2x_2 - x_3 \\ \end{bmatrix}. $$

We may write

$$ \begin{aligned} T\left(\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]\right) & {}={} \begin{bmatrix} -4x_1 -x_2 + 2x_3 \\ x_1 + 2x_2 - x_3 \\ \end{bmatrix} \\ & {}={} \left[\begin{array}{r}-4x_1 \\ x_1 \end{array}\right] + \left[\begin{array}{r}-x_2 \\ 2x_2 \end{array}\right] + \left[\begin{array}{r}2x_3 \\ -x_3 \end{array}\right] \\ & {}={} x_1\left[\begin{array}{r}-4 \\ 1 \end{array}\right] + x_2\left[\begin{array}{r}-1 \\ 2 \end{array}\right] + x_3\left[\begin{array}{r}2 \\ -1 \end{array}\right] \\ &{}={} \begin{bmatrix} -4 & -1 & 2 \\ 1 & 2 & -1 \\ \end{bmatrix} \left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]. \end{aligned} $$

This shows that $T$ is a matrix transformation $T({\mathbf x}) = A{\mathbf x}$ associated to the matrix $A = \begin{bmatrix} -4 & -1 & 2 \\ 1 & 2 & -1 \\ \end{bmatrix}.$
:::

:::activity {act:activity-2-5-2} Activity 2.5.2
In this activity, we will look at some examples of matrix transformations.

a) 
    To begin, suppose that $A$ is the matrix

    $$ A = \left[\begin{array}{rr} 2 & 1 \\ 1 & 2 \\ \end{array}\right]. $$

    with associated matrix transformation $T({\mathbf x}) = A{\mathbf x}$.

    1. 
        What is $T\left(\left[\begin{array}{r}1 \\ -2 \end{array}\right]\right)$?

    2. 
        What is $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$?

    3. 
        What is $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$?

    4. 
        Is there a vector ${\mathbf x}$ such that $T({\mathbf x}) = \left[\begin{array}{r}3 \\ 0 \end{array}\right]$?

    5. 
        Write $T\left(\left[\begin{array}{r}x \\ y \end{array}\right]\right)$ as a two-dimensional vector.

b) 
    Suppose that $T({\mathbf x}) = A{\mathbf x}$ where

    $$ A=\left[\begin{array}{rrrr} 3 & 3 & -2 & 1 \\ 0 & 2 & 1 & -3 \\ -2 & 1 & 4 & -4 \end{array}\right] $$

    .

    1. 
        What is the dimension of the vectors ${\mathbf x}$ that are inputs for $T$?

    2. 
        What is the dimension of the vectors $T({\mathbf x})=A{\mathbf x}$ that are outputs?

    3. 
        If we describe this transformation as $T:{\mathbb R}^n\to{\mathbb R}^m$, what are the values of $n$ and $m$ and how do they relate to the shape of $A$?

    4. 
        Describe the vectors ${\mathbf x}$ for which $T({\mathbf x}) = {\mathbf 0}$.

c) 
    If $A$ is the matrix $A=\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$, what is $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$ in terms of the vectors ${\mathbf v}_1$ and ${\mathbf v}_2$? What about $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$?

d) 
    Suppose that $A$ is a $3\times 2$ matrix and that $T({\mathbf x})=A{\mathbf x}$. If

    $$ T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}3 \\ -1 \\ 1 \end{array}\right], T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right] $$

    , what is the matrix $A$?

SOLUTION:

a) 
    If $A = \left[\begin{array}{rr} 2 & 1 \\ 1 & 2 \end{array}\right]$, then

    1. 
        $T\left(\left[\begin{array}{r}1 \\ -2 \end{array}\right]\right) = A\left[\begin{array}{r}1 \\ -2 \end{array}\right] = \left[\begin{array}{r}0 \\ -3 \end{array}\right]$.

    2. 
        $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

    3. 
        $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = A\left[\begin{array}{r}0 \\ 1 \end{array}\right] = \left[\begin{array}{r}1 \\ 2 \end{array}\right]$.

    4. 
        $T\left(\left[\begin{array}{r}x \\ y \end{array}\right]\right) = \left[\begin{array}{r}2x+y \\ x+2y \end{array}\right]$.

    5. 
        We seek a vector ${\mathbf x}$ such that $T({\mathbf x}) = A{\mathbf x}=\left[\begin{array}{r}3 \\ 0 \end{array}\right]$. We can solve this equation to find the unique solution ${\mathbf x}=\left[\begin{array}{r}2 \\ -1 \end{array}\right]$.

b) 
    Now if

    $$ A=\left[\begin{array}{rrrr} 3 & 3 & -2 & 1 \\ 0 & 2 & 1 & -3 \\ -2 & 1 & 4 & -4 \end{array}\right]\text{,} $$

    the matrix has dimensions $3\times4$.

    1. 
        ${\mathbf x}$ must be a four-dimensional vector.

    2. 
        $A{\mathbf x}$ must be a three-dimensional vector.

    3. 
        For this matrix, we have $T:{\mathbb R}^4\to{\mathbb R}^3$. In general, if $A$ is an $m\times n$ matrix, $T:{\mathbb R}^n\to{\mathbb R}^m$.

    4. 
        If we solve the homogeneous equation $A{\mathbf x}={\mathbf 0}$, we find that ${\mathbf x}=x_4\left[\begin{array}{r}-3 \\ 2 \\ -1 \\ 1 \end{array}\right]$.

c) 
    $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = {\mathbf v}_1$, the first column of the matrix. Similarly, $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$ gives the second column of the matrix.

d) 
    The matrix is $A=\left[ \begin{array}{rr} 3 & 2 \\ -1 & 2 \\ 1 & -1 \\ \end{array}\right]\text{.}$

:::

Let's discuss a few of the issues that appear in this activity. First, notice that the shape of the matrix $A$ and the dimension of the input vector ${\mathbf x}$ must be compatible if the product $A{\mathbf x}$ is to be defined. In particular, if $A$ is an $m\times n$ matrix, ${\mathbf x}$ needs to be an $n$-dimensional vector, and the resulting product $A{\mathbf x}$ will be an $m$-dimensional vector. For the associated matrix transformation, we therefore write $T:{\mathbb R}^n\to{\mathbb R}^m$ meaning $T$ takes vectors in ${\mathbb R}^n$ as inputs and produces vectors in ${\mathbb R}^m$ as outputs. For instance, if

$$ A=\left[\begin{array}{rrrr} 4 & 0 & -3 & 2 \\ 0 & 1 & 3 & 1 \\ \end{array}\right] $$

, then $T:{\mathbb R}^4\to{\mathbb R}^2$.

Second, we can often reconstruct the matrix $A$ if we only know some output values from its associated linear transformation $T$ by remembering that matrix-vector multiplication constructs linear combinations. For instance, if $A$ is an $m\times2$ matrix $A=\left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$, then

$$ T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]\left[\begin{array}{r}1 \\ 0 \end{array}\right] = 1{\mathbf v}_1 + 0{\mathbf v}_2 = {\mathbf v}_1 $$

. That is, we can find the first column of $A$ by evaluating $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$. Similarly, the second column of $A$ is found by evaluating $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$.

More generally, we will write the columns of the $n\times n$ identity matrix as

$$ {\mathbf e}_1 = \left[\begin{array}{c} 1 \\ 0 \\ \vdots \\ 0 \end{array}\right],~~~ {\mathbf e}_2 = \left[\begin{array}{c} 0 \\ 1 \\ \vdots \\ 0 \end{array}\right],~~~ \ldots,~~~ {\mathbf e}_n = \left[\begin{array}{c} 0 \\ 0 \\ \vdots \\ 1 \end{array}\right] $$

so that

$$ T({\mathbf e}_j) = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right] ~{\mathbf e}_j = {\mathbf v}_j $$

. This means that the $j^{th}$ column of $A$ is found by evaluating $T({\mathbf e}_j)$. We record this fact in the following proposition.

:::proposition {prop:prop-linear-trans-columns} Proposition 2.5.6
If $T:{\mathbb R}^n\to{\mathbb R}^m$ is a matrix transformation given by $T({\mathbf x}) = A{\mathbf x}$, then the matrix $A$ has columns $T({\mathbf e}_j)$; that is,

$$ A = \left[\begin{array}{rrrr} T({\mathbf e}_1) & T({\mathbf e}_2) & \cdots & T({\mathbf e}_n) \end{array}\right] $$

.
:::

:::activity {act:activity-mt-intro} Activity 2.5.3
Let's look at some examples and apply these observations.

a) 
    To begin, suppose that $T$ is the matrix transformation that takes a two-dimensional vector ${\mathbf x}$ as an input and outputs $T({\mathbf x})$, the two-dimensional vector obtained by rotating ${\mathbf x}$ counterclockwise by $90^\circ$, as shown in [Figure 2.5.7](ref:fig-mt-rotate).

    > FIGURE {fig:fig-mt-rotate} number=2.5.7 src=../../media/ch02/two-dim-basis.svg
    > alt: Three two dimensional vectors
    > caption: The matrix transformation $T$ takes two-dimensional vectors on the left and rotates them by $90^\circ$ counterclockwise into the vectors on the right.
    > subfigure src=../../media/ch02/two-dim-basis.svg alt: Three two dimensional vectors
    > subfigure src=../../media/ch02/two-dim-basis-rotate.svg alt: Three two dimensional vectors obtained by rotating the vectors in the previous figure.

    We will see in the next section that many geometric operations like this one can be performed by matrix transformations.

    1. 
        If we write $T:{\mathbb R}^n\to{\mathbb R}^m$, what are the values of $m$ and $n$, and what is the shape of the associated matrix $A$?

    2. 
        Determine the matrix $A$ by applying [Proposition 2.5.6](ref:prop-linear-trans-columns).

    3. 
        If ${\mathbf v}=\left[\begin{array}{r}-2 \\ -1 \end{array}\right]$ as shown on the left in [Figure 2.5.7](ref:fig-mt-rotate), use your matrix to determine $T({\mathbf v})$ and verify that it agrees with that shown on the right of [Figure 2.5.7](ref:fig-mt-rotate).

    4. 
        If ${\mathbf x}=\left[\begin{array}{r}x \\ y \end{array}\right]$, determine the vector $T({\mathbf x})$ obtained by rotating ${\mathbf x}$ counterclockwise by $90^\circ$.

b) 
    Suppose that we work for a company that makes baked goods, including cakes, doughnuts, and eclairs. The company operates two bakeries, Bakery 1 and Bakery 2. In one hour of operation,

    - 
        Bakery 1 produces 10 cakes, 50 doughnuts, and 30 eclairs.

    - 
        Bakery 2 produces 20 cakes, 30 doughnuts, and 30 eclairs.

    If Bakery 1 operates for $x_1$ hours and Bakery 2 for $x_2$ hours, we will use the vector ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$ to describe the operation of the two bakeries.

    We would like to describe a matrix transformation $T$ where ${\mathbf x}$ describes the number of hours the bakeries operate and $T({\mathbf x})$ describes the total number of cakes, doughnuts, and eclairs produced. That is, $T({\mathbf x}) = \left[\begin{array}{r}y_1 \\ y_2 \\ y_3 \end{array}\right]$ where $y_1$ is the number of cakes, $y_2$ is the number of doughnuts, and $y_3$ is the number of eclairs produced.

    1. 
        If $T:{\mathbb R}^n\to{\mathbb R}^m$, what are the values of $m$ and $n$, and what is the shape of the associated matrix $A$?

    2. 
        We can determine the matrix $A$ using [Proposition 2.5.6](ref:prop-linear-trans-columns). For instance, $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$ will describe the number of cakes, doughnuts, and eclairs produced when Bakery 1 operates for one hour and Bakery 2 sits idle. What is this vector?

    3. 
        In the same way, determine $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$. What is the matrix $A$?

    4. 
        If Bakery 1 operates for 120 hours and Bakery 2 for 180 hours, what is the total number of cakes, doughnuts, and eclairs produced?

        :::sage
        ```sage

        ```
        :::

    5. 
        Suppose that in one period of time, the company produces 5060 cakes, 14310 doughnuts, and 10470 eclairs. How long did each bakery operate?

    6. 
        Suppose that the company receives an order for a certain number of cakes, doughnuts, and eclairs. Can you guarantee that you can fill the order without having leftovers?

SOLUTION:

a) 

    1. 
        Since both the inputs and the outputs of $T$ are two-dimensional, it follows that $T:{\mathbb R}^2\to{\mathbb R}^2$ and that $A$ is a $2\times2$ matrix.

    2. 
        Since

        $$ T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}0 \\ 1 \end{array}\right],~~~ T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}-1 \\ 0 \end{array}\right], $$

        we have $A=\begin{bmatrix} 0 & -1 \\ 1 & 0 \\ \end{bmatrix}$.

    3. 
        Multiplying $T({\mathbf v}) = A{\mathbf v} = \left[\begin{array}{r}1 \\ -2 \end{array}\right]$, which agrees with the vector shown in the figure.

    4. 
        $T\left(\left[\begin{array}{r}x \\ y \end{array}\right]\right) = \left[\begin{array}{r}-y \\ x \end{array}\right]$.

b) 

    1. 
        The shape of matrix $A$ is $3\times 2$, and $T:{\mathbb R}^2\to{\mathbb R}^3$.

    2. 
        $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}10 \\ 50 \\ 30 \end{array}\right]$.

    3. 
        $A = \begin{bmatrix} 10 & 20 \\ 50 & 30 \\ 30 & 30 \\ \end{bmatrix}$.

    4. 
        $T\left(\left[\begin{array}{r}120 \\ 180 \end{array}\right]\right) = \left[\begin{array}{r}4800 \\ 11400 \\ 9000 \end{array}\right]$.

    5. 
        We solve the equation $T({\mathbf x}) = A{\mathbf x} = \left[\begin{array}{r}5060 \\ 14310 \\ 10470 \end{array}\right]$ to obtain ${\mathbf x} = \left[\begin{array}{r}192 \\ 157 \end{array}\right].$

    6. 
        No, you cannot guarantee this because the two columns of $A$ cannot span ${\mathbb R}^3$. If we view an order received as a three-dimensional vector ${\mathbf b}$, then a solution to the equation $A{\mathbf x} = {\mathbf b}$ tells us how long to operate the two bakeries to produce this order. However, since $A$ is a $3\times 2$ matrix, it must have a row without a pivot position, which means that the equation $A{\mathbf x} = {\mathbf b}$ will be inconsistent for some vectors ${\mathbf b}$.

:::

In these examples, we glided over an important point: how do we know these functions $T:{\mathbb R}^n\to{\mathbb R}^m$ can be expressed as matrix transformations? We will take up this question in detail in the next section and not worry about it for now.

## 2.5.3 Composing matrix transformations

It sometimes happens that we want to combine matrix transformations by performing one and then another. In the last activity, for instance, we considered the matrix transformation where $T({\mathbf x})$ is the result of rotating the two-dimensional vector ${\mathbf x}$ by $90^\circ$. Now suppose we are interested in rotating that vector twice; that is, we take a vector ${\mathbf x}$, rotate it by $90^\circ$ to obtain $T({\mathbf x})$, and then rotate the result by $90^\circ$ again to obtain $T(T({\mathbf x}))$.

This process is called function *composition* and likely appeared in an earlier algebra course. For instance, if $g(x) = 2x + 1$ and $h(x) = x^2$, the composition of these functions obtained by first performing $g$ and then performing $h$ is denoted by

$$ (h\circ g)(x) = h(g(x)) = h(2x+1) = (2x+1)^2. $$

Composing matrix transformations is similar. Suppose that we have two matrix transformations, $T:{\mathbb R}^n\to{\mathbb R}^m$ and $S:{\mathbb R}^m\to{\mathbb R}^p$. Their associated matrices will be denoted by $A$ and $B$ so that $T({\mathbf x}) = A{\mathbf x}$ and $S({\mathbf x}) = B{\mathbf x}$. If we apply $T$ to a vector ${\mathbf x}$ to obtain $T({\mathbf x})$ and then apply $S$ to the result, we have

$$ (S\circ T)({\mathbf x}) = S(T({\mathbf x})) = S(A{\mathbf x}) = BA{\mathbf x} = (BA){\mathbf x}. $$

Notice that this implies that the composition $(S\circ T)$ is itself a matrix transformation and that the associated matrix is the product $BA$.

:::proposition {prop:proposition-2-5-8} Proposition 2.5.8
If $T:{\mathbb R}^n\to{\mathbb R}^m$ and $S:{\mathbb R}^m\to{\mathbb R}^p$ are matrix transformations with associated matrices $A$ and $B$ respectively, then the composition $(S\circ T)$ is also a matrix transformation whose associated matrix is the product $BA$.
:::

Notice that the matrix transformations must be compatible if they are to be composed. In particular, the vector $T({\mathbf x})$, an $m$-dimensional vector, must be a suitable input vector for $S$, which means that the inputs to $S$ must be $m$-dimensional. In fact, this is the same condition we need to form the product $BA$ of their associated matrices, namely, that the number of columns of $B$ is the same as the number of rows of $A$.

:::activity {act:activity-2-5-4} Activity 2.5.4
We will explore the composition of matrix transformations by revisiting the matrix transformations from [Activity 2.5.3](ref:activity-mt-intro).

a) 
    Let's begin with the matrix transformation $T:{\mathbb R}^2\to{\mathbb R}^2$ that rotates a two-dimensional vector ${\mathbf x}$ by $90^\circ$ to produce $T({\mathbf x})$. We saw in the earlier activity that the associated matrix is $A = \begin{bmatrix} 0 & -1 \\ 1 & 0 \\ \end{bmatrix}$. Suppose that we compose this matrix transformation with itself to obtain $(T\circ T)({\mathbf x}) = T(T({\mathbf x}))$, which is the result of rotating ${\mathbf x}$ by $90^\circ$ twice.

    1. 
        What is the matrix associated to the composition $(T\circ T)$?

    2. 
        What is the result of rotating ${\mathbf v}=\left[\begin{array}{r}-2 \\ -1 \end{array}\right]$ twice?

    3. 
        Suppose that $R:{\mathbb R}^2\to{\mathbb R}^2$ is the matrix transformation that rotates vectors by $180^\circ$, as shown in [Figure 2.5.9](ref:fig-mt-180).

        > FIGURE {fig:fig-mt-180} number=2.5.9 src=../../media/ch02/two-dim-basis.svg
        > alt: Three two dimensional vectors
        > caption: The matrix transformation $R$ takes two-dimensional vectors on the left and rotates them by $180^\circ$ into the vectors on the right.
        > subfigure src=../../media/ch02/two-dim-basis.svg alt: Three two dimensional vectors
        > subfigure src=../../media/ch02/two-dim-basis-180.svg alt: Three two dimensional vectors obtained by rotating the vectors in the previous figure.

        Use [Proposition 2.5.6](ref:prop-linear-trans-columns) to find the matrix associated to $R$ and explain why it is the same matrix associated to $(T\circ T)$.

    4. 
        Write the two-dimensional vector $(T\circ T)\left(\left[\begin{array}{r}x \\ y \end{array}\right]\right)$. How might this vector be expressed in terms of scalar multiplication and why does this make sense geometrically?

b) 
    In the previous activity, we imagined a company that operates two bakeries. We found the matrix transformation $T:{\mathbb R}^2\to{\mathbb R}^3$ where $T\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right)$ describes the number of cakes, doughnuts, and eclairs when Bakery1 runs for $x_1$ hours and Bakery 2 runs for $x_2$ hours. The associated matrix is $A = \begin{bmatrix} 10 & 20 \\ 50 & 30 \\ 30 & 30 \\ \end{bmatrix}$.

    Suppose now that

    - 
        Each cake requires 4 cups of flour and and 2 cups of sugar.

    - 
        Each doughnut requires 1 cup of flour and 1 cup of sugar.

    - 
        Each eclair requires 1 cup of flour and 2 cups of sugar.

    We will describe a matrix transformation $S:{\mathbb R}^3\to{\mathbb R}^2$ where $S\left(\left[\begin{array}{r}y_1 \\ y_2 \\ y_3 \end{array}\right]\right)$ is a two-dimensional vector describing the number of cups of flour and sugar required to make $y_1$ cakes, $y_2$ doughnuts, and $y_3$ eclairs.

    1. 
        Use [Proposition 2.5.6](ref:prop-linear-trans-columns) to write the matrix $B$ associated to the transformation $S$.

    2. 
        If we make 1200 cakes, 2850 doughnuts, and 2250 eclairs, how many cups of flour and sugar are required?

        :::sage
        ```sage

        ```
        :::

    3. 
        Suppose that Bakery 1 operates for 75 hours and Bakery 2 operates for 53 hours. How many cakes, doughnuts, and eclairs are produced? How many cups of flour and sugar are required?

    4. 
        What is the meaning of the composition $(S\circ T)$ and what is its associated matrix?

    5. 
        In a certain time interval, both bakeries use a total of 5800 cups of flour and 5980 cups of sugar. How long have the two bakeries been operating?

SOLUTION:

a) 

    1. 
        The matrix is $B=AA=A^2 = \begin{bmatrix} -1 & 0 \\ 0 & -1 \\ \end{bmatrix}$.

    2. 
        $(T\circ T)({\mathbf v}) = A^2{\mathbf v} = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

    3. 
        The matrix associated to $R$ is also $A^2$ since rotating by $90^\circ$ twice is the same as rotating once by $180^\circ$.

    4. 
        $(T\circ T)({\mathbf x}) = R({\mathbf x}) = -{\mathbf x}$, which makes sense because multiplying a vector by $-1$ simply changes its direction.

b) 

    1. 
        $B = \begin{bmatrix} 4 & 1 & 1 \\ 2 & 1 & 2 \\ \end{bmatrix}$.

    2. 
        $S\left(\left[\begin{array}{r}1200 \\ 2850 \\ 2250 \end{array}\right]\right) = B\left[\begin{array}{r}1200 \\ 2850 \\ 2250 \end{array}\right] = \left[\begin{array}{r}9900 \\ 9750 \end{array}\right]$.

    3. 
        $T\left(\left[\begin{array}{r}75 \\ 53 \end{array}\right]\right) = \left[\begin{array}{r}1810 \\ 5340 \\ 3840 \end{array}\right]$ and $S\left(\left[\begin{array}{r}1810 \\ 5340 \\ 3840 \end{array}\right]\right) = \left[\begin{array}{r}16430 \\ 16640 \end{array}\right]$.

    4. 
        $(S\circ T)$ takes as input a vector ${\mathbf x}$ that records the number of hours both bakeries operate and outputs a vector $(S\circ T)({\mathbf x})$ that tells us the total number of cups of flour and sugar used. The associated matrix is $BA=\begin{bmatrix} 120 & 140 \\ 130 & 130 \\ \end{bmatrix}$.

    5. 
        We want to find the vector ${\mathbf x}$ for which $(S\circ T)({\mathbf x}) = BA{\mathbf x} = \left[\begin{array}{r}5800 \\ 5980 \end{array}\right]$. Solving this equation gives ${\mathbf x}=\left[\begin{array}{r}32 \\ 14 \end{array}\right]$.

:::

## 2.5.4 Discrete Dynamical Systems {subsec-dynamical-systems}

In [Chapter 4](ref:4#chap4), we will give considerable attention to a specific type of matrix transformation, which is illustrated in the next activity.

:::activity {act:activity-2-5-5} Activity 2.5.5
Suppose we run a company that has two warehouses, which we will call $P$ and $Q$, and a fleet of 1000 delivery trucks. Every morning, a delivery truck goes out from one of the warehouses and returns in the evening to one of the warehouses. It is observed that

- 
    70% of the trucks that leave $P$ return to $P$. The other 30% return to $Q$.

- 
    50% of the trucks that leave $Q$ return to $Q$ and 50% return to $P$.

The distribution of trucks is represented by the vector ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$ when there are $x_1$ trucks at location $P$ and $x_2$ trucks at $Q$. If ${\mathbf x}$ describes the distribution of trucks in the morning, then the matrix transformation $T({\mathbf x})$ will describe the distribution in the evening.
:::sage
```sage

```
:::

a) 
    Suppose that all 1000 trucks begin the day at location $P$ and none at $Q$. How many trucks are at each location that evening? Using our vector representation, what is $T\left(\left[\begin{array}{c}1000 \\ 0 \end{array}\right]\right)$?

    So that we can find the matrix $A$ associated to $T$, what does this tell us about $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$?

b) 
    In the same way, suppose that all 1000 trucks begin the day at location $Q$ and none at $P$. How many trucks are at each location that evening? What is the result $T\left(\left[\begin{array}{c}0 \\ 1000 \end{array}\right]\right)$ and what is $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$?

c) 
    Find the matrix $A$ such that $T({\mathbf x}) = A{\mathbf x}$.

d) 
    Suppose that there are 100 trucks at $P$ and 900 at $Q$ in the morning. How many are there at the two locations in the evening?

e) 
    Suppose that there are 550 trucks at $P$ and 450 at $Q$ in the evening. How many trucks were there at the two locations that morning?

f) 
    Suppose that all of the trucks are at location $Q$ on Monday morning.

    1. 
        How many trucks are at each location Monday evening?

    2. 
        How many trucks are at each location Tuesday evening?

    3. 
        How many trucks are at each location Wednesday evening?

g) 
    Suppose that $S$ is the matrix transformation that transforms the distribution of trucks ${\mathbf x}$ one morning into the distribution of trucks in the morning one week (seven days) later. What is the matrix that defines the transformation $S$?

SOLUTION:

a) 
    If 1000 trucks begin at $P$, that evening we find that 70% of them are at $P$ with the remaining 30% at $Q$. Therefore, $T\left(\left[\begin{array}{c}1000 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}700 \\ 300 \end{array}\right]$. Since $T\left(\left[\begin{array}{c}1000 \\ 0 \end{array}\right]\right) = 1000A\left[\begin{array}{r}1 \\ 0 \end{array}\right]$, we see that $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}0.7 \\ 0.3 \end{array}\right]$.

b) 
    In the same way, we see that $T\left(\left[\begin{array}{c}0 \\ 1000 \end{array}\right]\right) = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$ so that $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}0.5 \\ 0.5 \end{array}\right]$.

c) 
    The columns of $A$ are $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$ and $T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$ so that $A=\left[\begin{array}{rr} 0.7 & 0.5 \\ 0.3 & 0.5 \\ \end{array}\right]$.

d) 
    Evaluate $T\left(\left[\begin{array}{r}100 \\ 900 \end{array}\right]\right) = A\left[\begin{array}{r}100 \\ 900 \end{array}\right] = \left[\begin{array}{r}520 \\ 480 \end{array}\right]$.

e) 
    We solve $T({\mathbf x}) = A{\mathbf x} = \left[\begin{array}{r}550 \\ 450 \end{array}\right]$ to find ${\mathbf x}=\left[\begin{array}{r}250 \\ 750 \end{array}\right]$.

f) 
    We denote the distribution of trucks Monday morning by ${\mathbf x}_0 = \left[\begin{array}{c}0 \\ 1000 \end{array}\right]$.

    (i) 
        Monday evening, we have ${\mathbf x}_1=A{\mathbf x}_0 = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$.

    (ii) 
        Tuesday evening, we have ${\mathbf x}_2=A{\mathbf x}_1 = \left[\begin{array}{r}600 \\ 400 \end{array}\right]$.

    (iii) 
        Wednesday evening, we have ${\mathbf x}_3=A{\mathbf x}_2 = \left[\begin{array}{r}620 \\ 380 \end{array}\right]$.

g) 
    The matrix is $A^7 = \left[\begin{array}{rr} 0.625 & 0.625 \\ 0.375 & 0.375 \\ \end{array}\right]$.

:::

As we will see later, this type of situation occurs frequently. We have a vector ${\mathbf x}$ that describes the state of some system; in this case, ${\mathbf x}$ describes the distribution of trucks between the two locations at a particular time. Then there is a matrix transformation $T({\mathbf x}) = A{\mathbf x}$ that describes the state at some later time. We call ${\mathbf x}$ the *state* vector and $T$ the *transition* function, as it describes the transition of the state vector from one time to the next. {index-entry:state vector} {index-entry:transition function}

Beginning with an initial state ${\mathbf x}_0$, we would like to know how the state evolves over time. For instance,

$$ \begin{aligned} {\mathbf x}_1 & = T({\mathbf x}_0)=A{\mathbf x}_0 \\ {\mathbf x}_2 & = T({\mathbf x}_1) = (T\circ T)({\mathbf x}_0)= A^2{\mathbf x}_0 \\ {\mathbf x}_3 & = T({\mathbf x}_2) = A^3{\mathbf x}_0 \end{aligned} $$

and so on.

{index-entry:discrete dynamical system} We call this situation where the state of a system evolves from one time to the next according to the rule ${\mathbf x}_{k+1}=A{\mathbf x}_k$ a *discrete dynamical system*. In [Chapter 4](ref:4#chap4), we will develop a theory that enables us to make long-term predictions about the evolution of the state vector.

## 2.5.5 Summary

This section introduced matrix transformations, functions that are defined by matrix-vector multiplication, such as $T({\mathbf x}) = A{\mathbf x}$ for some matrix $A$.

- 
    If $A$ is an $m\times n$ matrix, then $T:{\mathbb R}^n\to{\mathbb R}^m$.

- 
    The columns of the matrix $A$ are given by evaluating the transformation $T$ on the vectors ${\mathbf e}_j$; that is,

    $$ A=\left[\begin{array}{rrrr} T({\mathbf e}_1) & T({\mathbf e}_2) & \cdots & T({\mathbf e}_n) \end{array}\right] $$

    .

- 
    The composition of matrix transformations corresponds to matrix multiplication.

- 
    A discrete dynamical system consists of a state vector ${\mathbf x}$ along with a transition function $T({\mathbf x}) = A{\mathbf x}$ that describes how the state vector evolves from one time to the next. Powers of the matrix $A$ determine the long-term behavior of the state vector.

## 2.5.6 Exercises

:::exercise {exercise-2-5-001} number=2.5.1 answered=yes src=src/exercises/exercises2-5.xml:5
PROBLEM:
Suppose that $T$ is the matrix transformation defined by the matrix $A$ and $S$ is the matrix transformation defined by $B$ where

$$ A = \left[\begin{array}{rrr} 3 & -1 & 0 \\ 1 & 2 & 2 \\ -1 & 3 & 2 \\ \end{array}\right], \qquad B = \left[\begin{array}{rrr} 1 & -1 & 0 \\ 2 & 1 & 2 \\ \end{array}\right] $$

.

a) 
    If $T:{\mathbb R}^n\to{\mathbb R}^m$, what are the values of $m$ and $n$? What values of $m$ and $n$ are appropriate for the transformation $S$?

b) 
    Evaluate $T\left(\left[\begin{array}{r}1 \\ -3 \\ 2 \end{array}\right]\right)$.

c) 
    Evaluate $S\left(\left[\begin{array}{r}-2 \\ 2 \\ 1 \end{array}\right]\right)$.

d) 
    Evaluate $S\circ T\left(\left[\begin{array}{r}1 \\ -3 \\ 2 \end{array}\right]\right)$.

e) 
    Find the matrix $C$ that defines the matrix transformation $S\circ T$.

ANSWER:

a) 
    $T:{\mathbb R}^3\to{\mathbb R}^3$ and $S:{\mathbb R}^3\to{\mathbb R}^2$.

b) 
    $\left[\begin{array}{r}6 \\ -1 \\ -6 \end{array}\right]$.

c) 
    $\left[\begin{array}{r}-4 \\ 0 \end{array}\right]$.

d) 
    $\left[\begin{array}{r}7 \\ -1 \end{array}\right]$.

e) 
    $\left[ \begin{array}{rrr} 2 & -3 & -2 \\ 5 & 6 & 6 \\ \end{array}\right]$.

SOLUTION:

a) 
    Since $A$ is a $3\times3$ matrix, we have $T:{\mathbb R}^3\to{\mathbb R}^3$. Since $B$ is a $2\times3$ matrix, we have $S:{\mathbb R}^3\to{\mathbb R}^2$.

b) 
    $T\left(\left[\begin{array}{r}1 \\ -3 \\ 2 \end{array}\right]\right) = A\left[\begin{array}{r}1 \\ -3 \\ 2 \end{array}\right] = \left[\begin{array}{r}6 \\ -1 \\ -6 \end{array}\right]$.

c) 
    $S\left(\left[\begin{array}{r}-2 \\ 2 \\ 1 \end{array}\right]\right) = A\left[\begin{array}{r}-2 \\ 2 \\ 1 \end{array}\right]= \left[\begin{array}{r}-4 \\ 0 \end{array}\right]$.

d) 
    $S\circ T\left(\left[\begin{array}{r}1 \\ -3 \\ 2 \end{array}\right]\right) = BA\left[\begin{array}{r}1 \\ -3 \\ 2 \end{array}\right] = \left[\begin{array}{r}7 \\ -1 \end{array}\right]$.

e) 
    $C = BA = \left[ \begin{array}{rrr} 2 & -3 & -2 \\ 5 & 6 & 6 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-5-002} number=2.5.2 answered=yes src=src/exercises/exercises2-5.xml:97
PROBLEM:
This problem concerns the identification of matrix transformations, about which more will be said in the next section.

a) 
    Check that the following function $T:{\mathbb R}^3\to{\mathbb R}^2$ is a matrix transformation by finding a matrix $A$ such that $T({\mathbf x}) = A{\mathbf x}$.

    $$ T\left(\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]\right) = \left[\begin{array}{c} 3x_1 - x_2 + 4x_3 \\ 5x_2 - x_3 \\ \end{array}\right] $$

    .

b) 
    Explain why

    $$ T\left(\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]\right) = \left[\begin{array}{c} 3x_1^4 - x_2 + 4x_3 \\ 5x_2 - x_3 \\ \end{array}\right] $$

    is not a matrix transformation.

ANSWER:

a) 
    $A=\left[\begin{array}{rrr} 3 & -1 & 4 \\ 0 & 5 & -1 \\ \end{array}\right]$.

b) 
    Because the first component has the term $3x_1^4$.

SOLUTION:

a) 
    The matrix $A=\left[\begin{array}{rrr} 3 & -1 & 4 \\ 0 & 5 & -1 \\ \end{array}\right]$.

b) 
    Because the first component has the term $3x_1^4$, there is no matrix such that $T({\mathbf x}) = A{\mathbf x}$.

:::

:::exercise {exercise-2-5-003} number=2.5.3 answered=yes src=src/exercises/exercises2-5.xml:157
PROBLEM:
Suppose that the matrix

$$ A = \left[\begin{array}{rrr} 1 & 3 & 1 \\ -2 & 1 & 5 \\ 0 & 2 & 2 \\ \end{array}\right] $$

defines the matrix transformation $T:{\mathbb R}^3\to{\mathbb R}^3$.

a) 
    Describe the vectors ${\mathbf x}$ that satisfy $T({\mathbf x}) = {\mathbf 0}$.

b) 
    Describe the vectors ${\mathbf x}$ that satisfy $T({\mathbf x}) = \left[\begin{array}{r}-8 \\ 9 \\ 2 \end{array}\right]$.

c) 
    Describe the vectors ${\mathbf x}$ that satisfy $T({\mathbf x}) = \left[\begin{array}{r}-8 \\ 2 \\ -4 \end{array}\right]$.

ANSWER:

a) 
    ${\mathbf x}= x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

b) 
    There are no such vectors.

c) 
    ${\mathbf x}=\left[\begin{array}{r}-2 \\ -2 \\ 0 \end{array}\right] + x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

SOLUTION:

a) 
    We have $T({\mathbf x}) = A{\mathbf x} = {\mathbf 0}$. The reduced row echelon form of $A$ is $A \sim \left[\begin{array}{rrr} 1 & 0 & -2 \\ 0 & 1 & 1 \\ 0 & 0 & 0 \\ \end{array}\right]$. Therefore, the solutions have the form ${\mathbf x}=x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

b) 
    We see that

    $$ \left[\begin{array}{rrr|r} 1 & 3 & 1 & -8 \\ -2 & 1 & 5 & 9 \\ 0 & 2 & 2 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rrr|r} 1 & 0 & -2 & 0 \\ 0 & 1 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ \end{array}\right]\text{.} $$

    Since this is an inconsistent system, there are no vectors ${\mathbf x}$ satisfying the equation.

c) 
    In the same way, we have

    $$ \left[\begin{array}{rrr|r} 1 & 3 & 1 & -8 \\ -2 & 1 & 5 & 2 \\ 0 & 2 & 2 & -4 \end{array}\right] \sim \left[\begin{array}{rrrr} 1 & 0 & -2 & -2 \\ 0 & 1 & 1 & -2 \\ 0 & 0 & 0 & 0 \\ \end{array}\right]\text{.} $$

    This shows that ${\mathbf x}=\left[\begin{array}{r}-2 \\ -2 \\ 0 \end{array}\right] + x_3\left[\begin{array}{r}2 \\ -1 \\ 1 \end{array}\right]$.

:::

:::exercise {exercise-2-5-004} number=2.5.4 answered=yes src=src/exercises/exercises2-5.xml:247
PROBLEM:
Suppose $T:{\mathbb R}^3\to{\mathbb R}^2$ is a matrix transformation with $T({\mathbf e}_j) = {\mathbf v}_j$ where ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ are as shown in [Figure 2.5.10](ref:fig-ex-linear-trans).
> FIGURE {fig:fig-ex-linear-trans} number=2.5.10 src=../../media/ch02/ex-linear-trans-2-5.svg
> alt: Three two dimensional vectors.
> width: 50%
> caption: The vectors $T({\mathbf e}_j)={\mathbf v}_j$.

a) 
    Sketch the vector $T\left(\left[\begin{array}{r}2 \\ 1 \\ 2 \end{array}\right]\right)$.

b) 
    What is the vector $T\left(\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]\right)$?

c) 
    Find all the vectors ${\mathbf x}$ such that $T({\mathbf x}) = {\mathbf 0}$.

ANSWER:

a) 
    $\left[\begin{array}{r}1 \\ -1 \end{array}\right]$.

b) 
    ${\mathbf v}_2$.

c) 
    ${\mathbf x}=x_3\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$.

SOLUTION:

a) 
    $T\left(\left[\begin{array}{r}2 \\ 1 \\ 2 \end{array}\right]\right) = 2{\mathbf v}_1+{\mathbf v}_2+2{\mathbf v}_3 = \left[\begin{array}{r}1 \\ -1 \end{array}\right]$.

b) 
    $T\left(\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]\right) = {\mathbf v}_2$.

c) 
    The matrix that defines $T$ is

    $$ A = \left[\begin{array}{rrr} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \\ \end{array}\right] = \left[\begin{array}{rrr} 2 & -1 & -1 \\ 1 & 1 & -2 \\ \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & -1 \\ 0 & 1 & -1 \\ \end{array}\right]\text{.} $$

    This shows that the solutions to $T({\mathbf x}) = A{\mathbf x} = {\mathbf 0}$ are ${\mathbf x}=x_3\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$.

:::

:::exercise {exercise-2-5-005} number=2.5.5 answered=yes src=src/exercises/exercises2-5.xml:338
PROBLEM:
In [Example 2.5.5](ref:example-mt-to-matrix) and [Example 2.5.4](ref:example-matrix-to-mt), we wrote matrix transformations in terms of the components of $T({\mathbf x})$. This exercise makes use of that form.

a) 
    Let's return to the example in [Activity 2.5.3](ref:activity-mt-intro) concerning the company that operates two bakeries. We used a matrix transformation with input ${\mathbf x}$, which recorded the amount of time the two bakeries operated, and output $T({\mathbf x})$, the number of cakes, doughnuts, and eclairs produced. The associated matrix is $A=\begin{bmatrix} 10 & 20 \\ 50 & 30 \\ 30 & 30 \\ \end{bmatrix}$.

    1. 
        If ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$, write the output $T({\mathbf x})$ as a three-dimensional vector in terms of $x_1$ and $x_2$.

    2. 
        If Bakery 1 operates for $x_1$ hours and Bakery 2 for $x_2$ hours, how many cakes are produced?

    3. 
        Explain how you may have discovered this expression by considering the rates at which the two locations make cakes.

b) 
    Suppose that a bicycle sharing program has two locations $P$ and $Q$. Bicycles are rented from some location in the morning and returned to a location in the evening. Suppose that

    - 
        60% of bicycles that begin at $P$ in the morning are returned to $P$ in the evening while the other 40% are returned to $Q$.

    - 
        30% of bicycles that begin at $Q$ are returned to $Q$ and the other 70% are returned to $P$.

    1. 
        If $x_1$ is the number of bicycles at location $P$ and $x_2$ the number at $Q$ in the morning, write an expression for the number of bicycles at $P$ in the evening.

    2. 
        Write an expression for the number of bicycles at $Q$ in the evening.

    3. 
        Write an expression for $T\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right)$, the vector that describs the distribution of bicycles in the evening.

    4. 
        Use this expression to identify the matrix $A$ associated to the matrix transformation $T$.

ANSWER:

a) 

    1. 
        We have $T({\mathbf x}) = \left[\begin{array}{r}10x_1+20x_2 \\ 50x_1+20x_2 \\ 30x_1+30x_2 \end{array}\right]$.

    2. 
        $10x_1 + 20x_2$.

    3. 
        Bakery 1 makes 10 cakes per hour and Bakery 2 makes 20.

b) 

    1. 
        $0.6x_1 + 0.7x_2$.

    2. 
        $0.4x_1 + 0.3x_2$

    3. 
        $T({\mathbf x}) = \left[\begin{array}{r}0.6x_1+0.7x_2 \\ 0.4x_1+0.3x_2 \end{array}\right]$.

    4. 
        $A = \begin{bmatrix} 0.6 & 0.7 \\ 0.4 & 0.3 \\ \end{bmatrix}$.

SOLUTION:

a) 

    1. 
        We have

        $$ T({\mathbf x}) = \begin{bmatrix} 10 & 20 \\ 50 & 30 \\ 30 & 30 \\ \end{bmatrix} \left[\begin{array}{r}x_1 \\ x_2 \end{array}\right] = \left[\begin{array}{r}10x_1+20x_2 \\ 50x_1+20x_2 \\ 30x_1+30x_2 \end{array}\right]. $$

    2. 
        The number of cakes produced is $10x_1 + 20x_2$.

    3. 
        This is consistent with the given information because Bakery 1 produces cakes at the rate of 10 cakes per hour so the number of cakes it produces is $10x_1$. In the same way, the number of cakes produced by Bakery 2 is $20x_2$ giving a total of $10x_1 + 20x_2$.

b) 

    1. 
        Of the bicycles that begin at $P$, 60% of them end up at $P$. Therefore $0.6x_1$ is the number of bicycles that begin at $P$ and end at $P$. Similarly, 70% of the bicycles that begin at $Q$ end up at $P$ so this number is $0.7x_2$. Therefore, the total number of bicycles that end up at $P$ is

        $$ 0.6x_1 + 0.7x_2. $$

    2. 
        In the same way, the number of bicycles that end up at $Q$ is

        $$ 0.4x_1 + 0.3x_2. $$

    3. 
        This gives the matrix

        $$ T({\mathbf x}) = \left[\begin{array}{r}0.6x_1+0.7x_2 \\ 0.4x_1+0.3x_2 \end{array}\right] = \begin{bmatrix} 0.6 & 0.7 \\ 0.4 & 0.3 \\ \end{bmatrix} {\mathbf x}. $$

    4. 
        This expression leads to $A = \begin{bmatrix} 0.6 & 0.7 \\ 0.4 & 0.3 \\ \end{bmatrix}$.

:::

:::exercise {exercise-2-5-006} number=2.5.6 answered=yes src=src/exercises/exercises2-5.xml:612
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    A matrix transformation $T:{\mathbb R}^4\to{\mathbb R}^5$ is defined by $T({\mathbf x}) = A{\mathbf x}$ where $A$ is a $4\times5$ matrix.

b) 
    If $T:{\mathbb R}^3\to{\mathbb R}^2$ is a matrix transformation, then there are infinitely many vectors ${\mathbf x}$ such that $T({\mathbf x}) = {\mathbf 0}$.

c) 
    If $T:{\mathbb R}^2\to{\mathbb R}^3$ is a matrix transformation, then it is possible that every equation $T({\mathbf x}) = {\mathbf b}$ has a solution for every vector ${\mathbf b}$.

d) 
    If $T:{\mathbb R}^n\to{\mathbb R}^m$ is a matrix transformation, then the equation $T({\mathbf x}) = {\mathbf 0}$ always has a solution.

ANSWER:

a) 
    False

b) 
    True

c) 
    False

d) 
    True

SOLUTION:

a) 
    False. The dimensions of $A$ are $5\times4$.

b) 
    True. The dimensions of $A$ are $2\times3$ so there must be a column without a pivot position.

c) 
    False. The dimensions of $A$ are $3\times2$ so there must be a row without a pivot position.

d) 
    True. The vector ${\mathbf x}={\mathbf 0}$ is always a solution.

:::

:::exercise {exercise-2-5-007} number=2.5.7 answered=yes src=src/exercises/exercises2-5.xml:670
PROBLEM:
Suppose that a company has three plants, called Plants 1, 2, and 3, that produce milk $M$ and yogurt $Y$. For every hour of operation,

- 
    Plant $1$ produces 20 units of milk and 15 units of yogurt.

- 
    Plant $2$ produces 30 units of milk and 5 units of yogurt.

- 
    Plant $3$ produces 0 units of milk and 40 units of yogurt.

a) 
    Suppose that $x_1$, $x_2$, and $x_3$ record the amounts of time that the three plants are operated and that $M$ and $Y$ record the amount of milk and yogurt produced. If we write ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]$ and ${\mathbf y} = \left[\begin{array}{r}M \\ Y \end{array}\right]$, find the matrix $A$ that defines the matrix transformation $T({\mathbf x}) = {\mathbf y}$.

b) 
    Furthermore, suppose that producing each unit of

    - 
        milk requires 5 units of electricity and 8 units of labor.

    - 
        yogurt requires 6 units of electricity and 10 units of labor.

    If we write the vector ${\mathbf z} = \left[\begin{array}{r}E \\ L \end{array}\right]$ to record the required amounts of electricity $E$ and labor $L$, find the matrix $B$ that defines the matrix transformation $S({\mathbf y}) = {\mathbf z}$.

c) 
    If ${\mathbf x} = \left[\begin{array}{r}30 \\ 20 \\ 10 \end{array}\right]$ describes the amounts of time that the three plants are operated, how much milk and yogurt is produced? How much electricity and labor are required?

d) 
    Find the matrix $C$ that describes the matrix transformation $R({\mathbf x})={\mathbf z}$ that gives the required amounts of electricity and labor when the each plants is operated an amount of time given by the vector ${\mathbf x}$.

ANSWER:

a) 
    $A = \left[\begin{array}{rrr} 20 & 30 & 0 \\ 15 & 5 & 40 \\ \end{array}\right]$.

b) 
    $B = \left[\begin{array}{rr} 5 & 6 \\ 8 & 10 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{r}M \\ Y \end{array}\right]=T\left(\left[\begin{array}{r}30 \\ 20 \\ 10 \end{array}\right]\right) = \left[\begin{array}{r}1200 \\ 950 \end{array}\right]$ and $\left[\begin{array}{r}E \\ L \end{array}\right]=S\left(T\left(\left[\begin{array}{r}30 \\ 20 \\ 10 \end{array}\right]\right)\right) = \left[\begin{array}{r}11700 \\ 19100 \end{array}\right]$.

d) 
    $C=BA = \left[\begin{array}{rrr} 190 & 180 & 240 \\ 310 & 290 & 400 \\ \end{array}\right]$.

SOLUTION:

a) 
    The first column of the matrix is $T\left(\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]\right)=\left[\begin{array}{r}20 \\ 15 \end{array}\right]$. This shows us that the matrix is $A = \left[\begin{array}{rrr} 20 & 30 & 0 \\ 15 & 5 & 40 \\ \end{array}\right]$.

b) 
    In the same way, the matrix is $B = \left[\begin{array}{rr} 5 & 6 \\ 8 & 10 \\ \end{array}\right]$.

c) 
    $\left[\begin{array}{r}M \\ Y \end{array}\right]=T\left(\left[\begin{array}{r}30 \\ 20 \\ 10 \end{array}\right]\right) = \left[\begin{array}{r}1200 \\ 950 \end{array}\right]$ and $\left[\begin{array}{r}E \\ L \end{array}\right]=S\left(T\left(\left[\begin{array}{r}30 \\ 20 \\ 10 \end{array}\right]\right)\right) = \left[\begin{array}{r}11700 \\ 19100 \end{array}\right]$.

d) 
    $C=BA = \left[\begin{array}{rrr} 190 & 180 & 240 \\ 310 & 290 & 400 \\ \end{array}\right]$.

:::

:::exercise {exercise-2-5-008} number=2.5.8 answered=yes src=src/exercises/exercises2-5.xml:785
PROBLEM:
Suppose that $T:{\mathbb R}^2\to{\mathbb R}^2$ is a matrix transformation and that

$$ T\left(\left[\begin{array}{r}1 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}3 \\ -2 \end{array}\right], \qquad T\left(\left[\begin{array}{r}-1 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

.

a) 
    Find the vector $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$.

b) 
    Find the matrix $A$ that defines $T$.

c) 
    Find the vector $T\left(\left[\begin{array}{r}4 \\ -5 \end{array}\right]\right)$.

ANSWER:

a) 
    $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}1 \\ -2 \end{array}\right]$.

b) 
    $A=\left[\begin{array}{rr} 1 & 2 \\ -2 & 0 \\ \end{array}\right]$.

c) 
    $T\left(\left[\begin{array}{r}4 \\ -5 \end{array}\right]\right) = \left[\begin{array}{r}-6 \\ -8 \end{array}\right]$.

SOLUTION:

a) 
    We first find weights $c$ and $d$ such that $\left[\begin{array}{r}1 \\ 0 \end{array}\right] = c\left[\begin{array}{r}1 \\ 1 \end{array}\right] + d\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ by constructing the augmented matrix

    $$ \left[\begin{array}{rrr} 1 & -1 & 1 \\ 1 & 1 & 0 \end{array}\right] \sim \left[\begin{array}{rrr} 1 & 0 & \frac{1}{2} \\ 0 & 1 & -\frac{1}{2} \end{array}\right]\text{.} $$

    This shows that $\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \frac12\left[\begin{array}{r}1 \\ 1 \end{array}\right] - \frac12\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. Therefore,

    $$ T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = A\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \frac12 A\left[\begin{array}{r}1 \\ 1 \end{array}\right] - \frac12A\left[\begin{array}{r}-1 \\ 1 \end{array}\right]= \left[\begin{array}{r}1 \\ -2 \end{array}\right]\text{.} $$

b) 
    In the same way, we find that

    $$ T\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = \frac12A\left[\begin{array}{r}1 \\ 1 \end{array}\right] + \frac12A\left[\begin{array}{r}-1 \\ 1 \end{array}\right] = \left[\begin{array}{r}2 \\ 0 \end{array}\right]\text{.} $$

    This gives the matrix $A=\left[\begin{array}{rr} 1 & 2 \\ -2 & 0 \\ \end{array}\right]$.

c) 
    Then $T\left(\left[\begin{array}{r}4 \\ -5 \end{array}\right]\right) = A\left[\begin{array}{r}4 \\ -5 \end{array}\right] = \left[\begin{array}{r}-6 \\ -8 \end{array}\right]$.

:::

:::exercise {exercise-2-5-009} number=2.5.9 answered=yes src=src/exercises/exercises2-5.xml:875
PROBLEM:
Suppose that two species $P$ and $Q$ interact with one another and that we measure their populations every month. We record their populations in a state vector ${\mathbf x} = \left[\begin{array}{r}p \\ q \end{array}\right]$, where $p$ and $q$ are the populations of $P$ and $Q$, respectively. We observe that there is a matrix

$$ A = \left[\begin{array}{rr} 0.8 & 0.3 \\ 0.7 & 1.2 \\ \end{array}\right] $$

such that the matrix transformation $T({\mathbf x})=A{\mathbf x}$ is the transition function describing how the state vector evolves from month to month. We also observe that, at the beginning of July, the populations are described by the state vector ${\mathbf x}=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$.
:::sage
```sage

```
:::

a) 
    What will the populations be at the beginning of August?

b) 
    What were the populations at the beginning of June?

c) 
    What will the populations be at the beginning of December?

d) 
    What will the populations be at the beginning of July in the following year?

ANSWER:

a) 
    $\left[\begin{array}{r}1.4 \\ 3.1 \end{array}\right]$.

b) 
    $\left[\begin{array}{r}0.8 \\ 1.2 \end{array}\right]$.

c) 
    $\left[\begin{array}{r}6.8 \\ 15.9 \end{array}\right]$.

d) 
    $\left[\begin{array}{r}116.8 \\ 272.5 \end{array}\right]$.

SOLUTION:
The initial state is the vector ${\mathbf x}_0=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$.

a) 
    At the beginning of August, we have ${\mathbf x}_1 = A{\mathbf x}_0 = \left[\begin{array}{r}1.4 \\ 3.1 \end{array}\right]$.

b) 
    At the beginning of June, we have $A{\mathbf x}_{-1} = {\mathbf x}_0$. Solving this equation gives ${\mathbf x}_{-1}=\left[\begin{array}{r}0.8 \\ 1.2 \end{array}\right]$.

c) 
    At the beginning of December, we have ${\mathbf x}_5=A^5{\mathbf x}_0 = \left[\begin{array}{r}6.8 \\ 15.9 \end{array}\right]$.

d) 
    At the beginning of July in the following year, we have ${\mathbf x}_{12} = A^{12}{\mathbf x}_0 = \left[\begin{array}{r}116.8 \\ 272.5 \end{array}\right]$.

:::

:::exercise {exercise-2-5-010} number=2.5.10 answered=yes src=src/exercises/exercises2-5.xml:956
PROBLEM:
Students in a school are sometimes absent due to an illness. Suppose that

- 
    95% of the students who attend school will attend school the next day.

- 
    50% of the students who are absent one day will be absent the next day.

We will record the number of present students $p$ and the number of absent students $a$ in a state vector ${\mathbf x}=\left[\begin{array}{r}p \\ a \end{array}\right]$ and note that that state vector evolves from one day to the next according to the transition function $T:{\mathbb R}^2\to{\mathbb R}^2$. On Tuesday, the state vector is ${\mathbf x}=\left[\begin{array}{c}1700 \\ 100 \end{array}\right]$.
:::sage
```sage

```
:::

a) 
    Suppose we initially have 1000 students who are present and none absent. Find $T\left(\left[\begin{array}{c}1000 \\ 0 \end{array}\right]\right)$.

b) 
    Suppose we initially have 1000 students who are absent and none present. Find $T\left(\left[\begin{array}{c}0 \\ 1000 \end{array}\right]\right)$.

c) 
    Use the results of parts a and b to find the matrix $A$ that defines the matrix transformation $T$.

d) 
    If ${\mathbf x}=\left[\begin{array}{c}1700 \\ 100 \end{array}\right]$ on Tuesday, how are the students distributed on Wednesday?

e) 
    How many students were present on Monday?

f) 
    How many students are present on the following Tuesday?

g) 
    What happens to the number of students who are present after a very long time?

ANSWER:

a) 
    $T\left(\left[\begin{array}{r}1000 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}950 \\ 0 \end{array}\right]$

b) 
    $T\left(\left[\begin{array}{r}0 \\ 1000 \end{array}\right]\right) = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$

c) 
    $A=\left[\begin{array}{rr}0.95 & 0.50 \\ 0.05 & 0.50 \\ \end{array}\right]$.

d) 
    There are 1665 students present and 135 absent.

e) 
    1778

f) 
    1636

g) 
    It stabilizes around 1636 students present.

SOLUTION:

a) 
    $T\left(\left[\begin{array}{r}1000 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}950 \\ 0 \end{array}\right]$ so that $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}0.95 \\ 0 \end{array}\right]$.

b) 
    $T\left(\left[\begin{array}{r}0 \\ 1000 \end{array}\right]\right) = \left[\begin{array}{r}500 \\ 500 \end{array}\right]$ so that $T\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = \left[\begin{array}{r}0.5 \\ 0.5 \end{array}\right]$.

c) 
    The matrix $A=\left[\begin{array}{rr}0.95 & 0.50 \\ 0.05 & 0.50 \\ \end{array}\right]$.

d) 
    $T({\mathbf x}) = A{\mathbf x} = \left[\begin{array}{r}1665 \\ 135 \end{array}\right]$ meaning that 1665 students are present and 135 are absent.

e) 
    We want to solve the equation $T({\mathbf x}) = A{\mathbf x}=\left[\begin{array}{r}1700 \\ 100 \end{array}\right]$, which gives ${\mathbf x} = \left[\begin{array}{r}1778 \\ 22 \end{array}\right]$. There were 1778 students present on Monday.

f) 
    The following Tuesday, the state will be described by the vector $A^7\left[\begin{array}{r}1700 \\ 100 \end{array}\right] = \left[\begin{array}{r}1636 \\ 163 \end{array}\right]$. This means that there were 1636 students present the following Tuesday.

g) 
    If we compute $A^k\left[\begin{array}{r}1700 \\ 100 \end{array}\right]$ for some large powers $k$, we find that there are about 1636 students present every day after a very long time.

:::
