# 7.2 Quadratic forms {sec-quadratic-forms}

With our understanding of symmetric matrices and variance in hand, we'll now explore how to determine the directions in which the variance of a dataset is as large as possible and where it is as small as possible. This is part of a much larger story involving a type of function, called a *quadratic form*, that we'll introduce here.

## 7.2.1 Introduction

:::exploration {act:preview-quadforms} Preview Activity 7.2.1
Let's begin by looking at an example. Suppose we have three data points that form the demeaned data matrix

$$ A = \begin{bmatrix} 2 & 1 & -3 \\ 1 & 2 & -3 \\ \end{bmatrix} $$

.
PROBLEM:
a) Plot the demeaned data points in [Figure 7.2.1](ref:fig-quad-preview). In which direction does the variance appear to be largest and in which does it appear to be smallest?
    > FIGURE {fig:fig-quad-preview} number=7.2.1 src=../../media/ch07/empty-4.svg
    > alt: A standard coordinate grid and set of axes.
    > width: 50%
    > caption: Use this coordinate grid to plot the demeaned data points.
b) Construct the covariance matrix $C$ and determine the variance in the direction of $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and the variance in the direction of $\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.
    :::sage
    ```sage

    ```
    :::
c) What is the total variance of this dataset?
d) Generally speaking, if $C$ is the covariance matrix of a dataset and ${\mathbf u}$ is an eigenvector of $C$ having unit length and with associated eigenvalue $\lambda$, what is $V_{{\mathbf u}}$?
SOLUTION:
a) The variance appears to be greatest in the direction of $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and smallest in the direction of $\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.
b) In the direction of $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$, the variance is $9$, while in the direction of $\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$, the variance is $1/3$.
c) The total variance is $9+1/3 = 28/3$.
d) $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = \lambda{\mathbf u}\cdot{\mathbf u} = \lambda$
:::

## 7.2.2 Quadratic forms

Given a matrix $A$ of $N$ demeaned data points, the symmetric covariance matrix $C=\frac1N AA^T$ determines the variance in a particular direction

$$ V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}), $$

where ${\mathbf u}$ is a unit vector defining the direction.

More generally, a symmetric $m\times m$ matrix $A$ defines a function $q:{\mathbb R}^m \to {\mathbb R}$ by

$$ q({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x}). $$

Notice that this expression is similar to the one we use to find the variance $V_{{\mathbf u}}$ in terms of the covariance matrix $C$. The only difference is that we allow ${\mathbf x}$ to be any vector rather than requiring it to be a unit vector.

:::example {ex:example-7-2-2} Example 7.2.2
Suppose that $A=\begin{bmatrix} 1 & 2\\ 2 & 1 \end{bmatrix}$. If we write ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$, then we have

$$ \begin{aligned} q\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) & = \left[\begin{array}{r}x_1 \\ x_2 \end{array}\right] \cdot \left( \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix} \left[\begin{array}{r}x_1 \\ x_2 \end{array}\right] \right) \\ & = \left[\begin{array}{r}x_1 \\ x_2 \end{array}\right] \cdot \left[\begin{array}{r}x_1 + 2x_2 \\ 2x_1 + x_2 \end{array}\right] \\ & = x_1^2 + 2x_1x_2 + 2x_1x_2 + x_2^2 \\ & = x_1^2 + 4x_1x_2 + x_2^2. \end{aligned} $$

We may evaluate the quadratic form using some input vectors:

$$ q\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = 1, \hspace{24pt} q\left(\left[\begin{array}{r}1 \\ 1 \end{array}\right]\right) = 6, \hspace{24pt} q\left(\left[\begin{array}{r}2 \\ 4 \end{array}\right]\right) = 52. $$

Notice that the value of the quadratic form is a scalar.
:::

:::definition {def:definition-7-2-3} Definition 7.2.3
If $A$ is a symmetric $m\times m$ matrix, the *quadratic form* defined by $A$ is the function $q_A({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x})$.
:::

:::activity {act:activity-7-2-2} Activity 7.2.2
Let's look at some more examples of quadratic forms.

a) 
    Consider the symmetric matrix $D = \begin{bmatrix} 3 & 0 \\ 0 & -1 \\ \end{bmatrix}$. Write the quadratic form $q_D({\mathbf x})$ defined by $D$ in terms of the components of ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$. What is the value of $q_D\left(\left[\begin{array}{r}2 \\ -4 \end{array}\right]\right)$?

b) 
    Given the symmetric matrix $A=\begin{bmatrix} 2 & 5 \\ 5 & -3 \end{bmatrix}$, write the quadratic form $q_A({\mathbf x})$ defined by $A$ and evaluate $q_A\left(\left[\begin{array}{r}2 \\ -1 \end{array}\right]\right)$.

c) 
    Suppose that $q\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) = 3x_1^2 - 4x_1x_2 + 4x_2^2$. Find a symmetric matrix $A$ such that $q$ is the quadratic form defined by $A$.

d) 
    Suppose that $q$ is a quadratic form and that $q({\mathbf x}) = 3$. What is $q(2{\mathbf x})$? $q(-{\mathbf x})$? $q(10{\mathbf x})$?

e) 
    Suppose that $A$ is a symmetric matrix and $q_A({\mathbf x})$ is the quadratic form defined by $A$. Suppose that ${\mathbf x}$ is an eigenvector of $A$ with associated eigenvalue -4 and with length 7. What is $q_A({\mathbf x})$?

ANSWER:

a) 
    $q_D({\mathbf x}) = 3x_1^2 - x_2^2$ and $q_D\left(\left[\begin{array}{r}2 \\ -4 \end{array}\right]\right) = -4$

b) 
    $q_A({\mathbf x}) = 2x_1^2 + 10x_1x_2-3x_2^2$ and $q_A\left(\left[\begin{array}{r}2 \\ -1 \end{array}\right]\right) = -15$

c) 
    $A=\begin{bmatrix} 3 & -2 \\ -2 & 4 \\ \end{bmatrix}$

d) 
    $q(2{\mathbf x}) = 12$, $q(-{\mathbf x}) = 3$ and $q(10{\mathbf x})=300$

e) 
    $q_A({\mathbf x}) = -196$

SOLUTION:

a) 
    $q_D({\mathbf x}) = 3x_1^2 - x_2^2$ and $q_D\left(\left[\begin{array}{r}2 \\ -4 \end{array}\right]\right) = -4$

b) 
    $q_A({\mathbf x}) = 2x_1^2 + 10x_1x_2-3x_2^2$ and $q_A\left(\left[\begin{array}{r}2 \\ -1 \end{array}\right]\right) = -15$

c) 
    $A=\begin{bmatrix} 3 & -2 \\ -2 & 4 \\ \end{bmatrix}$

d) 
    Notice that $q(2{\mathbf x}) = (2{\mathbf x})\cdot(A(2{\mathbf x})) = 4{\mathbf x}\cdot(A{\mathbf x}) = 4q({\mathbf x})$. In the same way, we have $q(-{\mathbf x}) = q({\mathbf x})$ and $q(10{\mathbf x}) = 100q({\mathbf x})$.

e) 
    $q_A({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x}) = -4{\mathbf x}\cdot{\mathbf x} = -4(49) = -196$

:::

Linear algebra is principally about things that are linear. However, quadratic forms, as the name implies, have a distinctly non-linear character. First, if $A=\begin{bmatrix} a & b \\ b & c \end{bmatrix}$, is a symmetric matrix, then the associated quadratic form is

$$ q_A\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) = ax_1^2 + 2bx_1x_2 + cx_2^2. $$

Notice how the variables $x_1$ and $x_2$ are multiplied together, which tells us this isn't a linear function.

This expression assumes an especially simple form when $D$ is a diagonal matrix. In particular, if $D = \begin{bmatrix} a & 0 \\ 0 & c \\ \end{bmatrix}$, then $q_D\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) = ax_1^2 + cx_2^2$. This is special because there is no cross-term involving $x_1x_2$.

Remember that matrix transformations have the property that $T(s{\mathbf x}) = sT({\mathbf x})$. Quadratic forms behave differently:

$$ q_A(s{\mathbf x}) = (s{\mathbf x})\cdot(A(s{\mathbf x})) = s^2{\mathbf x}\cdot(A{\mathbf x})= s^2q_A({\mathbf x}). $$

For instance, when we multiply ${\mathbf x}$ by the scalar 2, then $q_A(2{\mathbf x}) = 4q_A({\mathbf x})$. Also, notice that $q_A(-{\mathbf x}) = q_A({\mathbf x})$ since the scalar is squared.

Finally, evaluating a quadratic form on an eigenvector has a particularly simple form. Suppose that ${\mathbf x}$ is an eigenvector of $A$ with associated eigenvalue $\lambda$. We then have

$$ q_A({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x}) = \lambda{\mathbf x}\cdot{\mathbf x} = \lambda \left|{\mathbf x}\right|^2. $$

Let's now return to our motivating question: in which direction ${\mathbf u}$ is the variance $V_{{\mathbf u}}={\mathbf u}\cdot(C{\mathbf u})$ of a dataset as large as possible and in which is it as small as possible. Remembering that the vector ${\mathbf u}$ is a unit vector, we can now state a more general form of this question: *If $q_A({\mathbf x})$ is a quadratic form, for which unit vectors	${\mathbf u}$ is $q_A({\mathbf u})={\mathbf u}\cdot(A{\mathbf u})$ as large as possible and for which is it as small as possible?* Since a unit vector specifies a direction, we will often ask for the directions in which the quadratic form $q({\mathbf x})$ is at its maximum or minimum value.

:::activity {act:activity-7-2-3} Activity 7.2.3
We can gain some intuition about this problem by graphing the quadratic form and paying particular attention to the unit vectors.

a) 
    Evaluating the following cell defines the matrix $D = \begin{bmatrix} 3 & 0 \\ 0 & -1 \end{bmatrix}$ and displays the graph of the associated quadratic form $q_D({\mathbf x})$. In addition, the points corresponding to vectors ${\mathbf u}$ with unit length are displayed as a curve.

    :::sage
    ```sage

    sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/quad_plot.py', globals())

    ## We define our matrix here
    A = matrix(2, 2, [3, 0, 0, -1])

    quad_plot(A)

    ```
    :::

    Notice that the matrix $D$ is diagonal. In which directions does the quadratic form have its maximum and minimum values?

b) 
    Write the quadratic form $q_D$ associated to $D$. What is the value of $q_D\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right)$? What is the value of $q_D\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right)$?

c) 
    Consider a unit vector ${\mathbf u}=\left[\begin{array}{r}u_1 \\ u_2 \end{array}\right]$ so that $u_1^2+u_2^2 = 1$, an expression we can rewrite as $u_1^2 = 1-u_2^2$. Write the quadratic form $q_D({\mathbf u})$ and replace $u_1^2$ by $1-u_2^2$. Now explain why the maximum of $q_D({\mathbf u})$ is 3. In which direction does the maximum occur? Does this agree with what you observed from the graph above?

d) 
    Write the quadratic form $q_D({\mathbf u})$ and replace $u_2^2$ by $1-u_1^2$. What is the minimum value of $q_D({\mathbf u})$ and in which direction does the minimum occur?

e) 
    Use the previous Sage cell to change the matrix to $A=\begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$ and display the graph of the quadratic form $q_A({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x})$. Determine the directions in which the maximum and minimum occur.

f) 
    Remember that $A=\begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$ is symmetric so that $A=QDQ^T$ where $D$ is the diagonal matrix above and $Q$ is the orthogonal matrix that rotates vectors by $45^\circ$. Notice that

    $$ q_A({\mathbf u}) = {\mathbf u}\cdot(A{\mathbf u}) = {\mathbf u}\cdot(QDQ^T{\mathbf u}) = (Q^T{\mathbf u})\cdot(DQ^T{\mathbf u}) = q_D({\mathbf v}) $$

    where ${\mathbf v}=Q^T{\mathbf u}$. That is, we have $q_A({\mathbf u}) = q_D({\mathbf v})$.

    Explain why ${\mathbf v} = Q^T{\mathbf u}$ is also a unit vector; that is, explain why

    $$ |{\mathbf v}|^2 = |Q^T{\mathbf u}|^2 = (Q^T{\mathbf u})\cdot(Q^T{\mathbf u}) = 1. $$

g) 
    Using the fact that $q_A({\mathbf u}) = q_D({\mathbf v})$, explain how we now know the maximum value of $q_A({\mathbf u})$ is 3 and determine the direction in which it occurs. Also, determine the minimum value of $q_A({\mathbf u})$ and determine the direction in which it occurs.

ANSWER:

a) 
    The maximum appears to occur in the direction of $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and the minimum appears to occur in the direction of $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

b) 
    $q_D({\mathbf x}) = 3x_1^2 - x_2^2$ so that $q_D\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = 3$ and $q_D\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = -1$.

c) 
    The maximum value of $q_D({\mathbf u})$ is $3$ in the direction $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

d) 
    The minimum value of $q_D({\mathbf u})$ is $-1$ in the direction $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

e) 
    The maximum appears to occur in the direction $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and the minimum in the direction $\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.

f) 
    Use the fact that $QQ^T=I$

g) 
    The maximum of $q_A({\mathbf u})$ is $3$, which occurs when ${\mathbf u}= \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$.

    The maximum of $q_A({\mathbf u})$ is $-1$, which occurs when ${\mathbf u}= \left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$.

SOLUTION:

a) 
    The maximum appears to occur in the direction of $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and the minimum appears to occur in the direction of $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

b) 
    $q_D({\mathbf x}) = 3x_1^2 - x_2^2$ so that $q_D\left(\left[\begin{array}{r}1 \\ 0 \end{array}\right]\right) = 3$ and $q_D\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = -1$.

c) 
    We have $q_D({\mathbf u}) = 3u_1^2 - u_2^2 = 3 - 4u_2^2$ so that the quadratic form only depends on $u_2$. The graph of this function of $u_2$ is a parabola that has a maximum of $3$ when $u_2=0$. Since $u_1^2 = 1-u_2^2$, this means that the maximum occurs when $u_1=\pm 1$. We therefore see that the maximum value of $q_D({\mathbf u})$ is $3$ in the direction $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ as we saw from the graph.

d) 
    Now $q_D({\mathbf u}) = -1 + 4u_1^2$, which has a minimum value of $-1$ when $u_1=0$. Therefore, the minimum value of $q_D({\mathbf u})$ is $-1$ in the direction $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

e) 
    The graph of $q_A$ appears to be similar to the graph of $q_D$ only rotated by $45^\circ$. This means the maximum appears to occur in the direction $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and the minimum in the direction $\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.

f) 
    Since $Q$ is orthogonal, we have $QQ^T=I$ so that

    $$ |{\mathbf v}|^2 = (Q^T{\mathbf u})\cdot(Q^T{\mathbf u}) = {\mathbf u}\cdot(QQ^T{\mathbf u}) = {\mathbf u}\cdot{\mathbf u} = |{\mathbf u}|^2 = 1\text{.} $$

g) 
    Since $q_A({\mathbf u}) = q_D({\mathbf v})$, the maximum of $q_A({\mathbf u})$ is $3$, which occurs when ${\mathbf v} = Q^T{\mathbf u} = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$. This means that ${\mathbf u}=Q\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$, the eigenvector of $A$ associated to $\lambda=3$.

    In the same way, the minimum value of $q_A({\mathbf u})$ is $-1$, which occurs when ${\mathbf u}=\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$, the eigenvector of $A$ associated to $\lambda=-1$.

:::

This activity demonstrates how the eigenvalues of $A$ determine the maximum and minimum values of the quadratic form $q_A({\mathbf u})$ when evaluated on unit vectors and how the associated eigenvectors determine the directions in which the maximum and minimum values occur. Let's look at another example so that this connection is clear.

:::example {ex:example-7-2-4} Example 7.2.4
Consider the symmetric matrix $A=\begin{bmatrix} -7 & -6 \\ -6 & 2 \\ \end{bmatrix}$. Because $A$ is symmetric, we know that it can be orthogonally diagonalized. In fact, we have $A=QDQ^T$ where

$$ D = \begin{bmatrix} 5 & 0 \\ 0 & -10 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ -2/\sqrt{5} & 1/\sqrt{5} \\ \end{bmatrix}\text{.} $$

From this diagonalization, we know that $\lambda_1=5$ is the largest eigenvalue of $A$ with associated eigenvector ${\mathbf u}_1 = \left[\begin{array}{r}1/\sqrt{5} \\ -2/\sqrt{5} \end{array}\right]$ and that $\lambda_2 = -10$ is the smallest eigenvalue with associated eigenvector ${\mathbf u}_2 = \left[\begin{array}{r}2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$.
Let's first study the quadratic form $q_D({\mathbf u}) = 5u_1^2 - 10u_2^2$ because the absence of the cross-term makes it comparatively simple. Remembering that ${\mathbf u}$ is a unit vector, we have $u_1^2+u_2^2=1$, which means that $u_1^2 = 1-u_2^2$. Therefore,

$$ q_D({\mathbf u}) = 5u_1^2 - 10u_2^2 = 5(1-u_2^2)-10u_2^2 = 5 - 15u_2^2\text{.} $$

This tells us that $q_D({\mathbf u})$ has a maximum value of $5$, which occurs when $u_2=0$ or in the direction $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.
In the same way, rewriting $u_2^2 = 1-u_1^2$ allows us to conclude that the minimum value of $q_D({\mathbf u})$ is $-10$, which occurs in the direction $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.
Let's now return to the matrix $A$ whose quadratic form $q_A$ is related to $q_D$ because $A = QDQ^T$. In particular, we have

$$ q_A({\mathbf u}) = {\mathbf u}\cdot(A{\mathbf u}) = {\mathbf u}\cdot(QDQ^T{\mathbf u}) = (Q^T{\mathbf u})\cdot(DQ^T{\mathbf u}) = {\mathbf v}\cdot(D{\mathbf v}) = q_D({\mathbf v})\text{.} $$

In other words, we have $q_A({\mathbf u}) = q_D({\mathbf v})$ where ${\mathbf v}=Q^T{\mathbf u}$. This is quite useful because it allows us to relate the values of $q_A$ to those of $q_D$, which we already understand quite well.
Now it turns out that ${\mathbf v}$ is also a unit vector because

$$ |{\mathbf v}|^2 = {\mathbf v}\cdot{\mathbf v} = (Q^T{\mathbf u})\cdot(Q^T{\mathbf u}) = {\mathbf u}\cdot(QQ^T{\mathbf u}) = {\mathbf u}\cdot{\mathbf u} = |{\mathbf u}|^2 = 1\text. $$

Therefore, the maximum value of $q_A({\mathbf u})$ is the same as $q_D({\mathbf v})$, which we know to be $5$ and which occurs in the direction ${\mathbf v}=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$. This means that the maximum value of $q_A({\mathbf u})$ is also $5$ and that this occurs in the direction ${\mathbf u} = Q{\mathbf v} = Q\left[\begin{array}{r}1 \\ 0 \end{array}\right] = \left[\begin{array}{r}1/\sqrt{5} \\ -2/\sqrt{5} \end{array}\right]$. We now know that the maximum value of $q_A({\mathbf u})$ is the largest eigenvalue $\lambda_1=5$ and that this maximum value occurs in the direction of an associated eigenvector.
In the same way, we see that the minimum value of $q_A({\mathbf u})$ is the smallest eigenvalue $\lambda_2=-10$ and that this minimum occurs in the direction of ${\mathbf u}=Q\left[\begin{array}{r}0 \\ 1 \end{array}\right] = \left[\begin{array}{r}2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$, an associated eigenvector.
:::

More generally, we have

:::proposition {prop:prop-quadform-extrema} Proposition 7.2.5
Suppose that $A$ is a symmetric matrix, that we list its eigenvalues in decreasing order $\lambda_1 \geq \lambda_2 \geq \ldots \geq \lambda_m$, and that ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_m$ is a basis of associated eigenvectors. The maximum value of $q_A({\mathbf u})$ among all unit vectors ${\mathbf u}$ is $\lambda_1$, which occurs in the direction ${\mathbf u}_1$. Similarly, the minimum value of $q_A({\mathbf u})$ is $\lambda_m$, which occurs in the direction ${\mathbf u}_m$.
:::

:::example {ex:example-7-2-6} Example 7.2.6
Suppose that $A$ is the symmetric matrix $A=\begin{bmatrix} 0 & 6 & 3 \\ 6 & 3 & 6 \\ 0 & 6 & 6 \\ \end{bmatrix}$, which may be orthogonally diagonalized as $A=QDQ^T$ where

$$ D = \begin{bmatrix} 12 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & -6 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 1/3 & 2/3 & 2/3 \\ 2/3 & 1/3 & -2/3 \\ 2/3 & -2/3 & 1/3 \\ \end{bmatrix}\text{.} $$

We see that the maximum value of $q_A({\mathbf u})$ is 12, which occurs in the direction $\left[\begin{array}{r}1/3 \\ 2/3 \\ 2/3 \end{array}\right]$, and the minimum value is -6, which occurs in the direction $\left[\begin{array}{r}2/3 \\ -2/3 \\ 1/3 \end{array}\right]$.
:::

:::example {ex:example-7-2-7} Example 7.2.7
Suppose we have the matrix of demeaned data points $A = \begin{bmatrix} 2 & 1 & -3 \\ 1 & 2 & -3 \\ \end{bmatrix}$ that we considered in [Preview Activity 7.2.1](ref:preview-quadforms). The data points are shown in [Figure 7.2.8](ref:fig-covariance-quad).
> FIGURE {fig:fig-covariance-quad} number=7.2.8 src=../../media/ch07/quad-variance-data.svg
> alt: A coordinate grid and axes with three data points.
> width: 50%
> caption: The set of demeaned data points from [Preview Activity 7.2.1](ref:preview-quadforms).
Constructing the covariance matrix $C=\frac13~AA^T$ gives $C=\begin{bmatrix} 14/3 & 13/3 \\ 13/3 & 14/3 \end{bmatrix}$, which has eigenvalues $\lambda_1 = 9$, with associated eigenvector $\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$, and $\lambda_2=1/3$, with associated eigenvector $\left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$.
Remember that the variance in a direction ${\mathbf u}$ is $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = q_C({\mathbf u})$. Therefore, the variance attains a maximum value of 9 in the direction $\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$ and a minimum value of 1/3 in the direction $\left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$. [Figure 7.2.9](ref:fig-quad-project) shows the data projected onto the lines defined by these vectors.
> FIGURE {fig:fig-quad-project} number=7.2.9 src=../../media/ch07/quad-variance-a.svg
> alt: Three data points projected onto the line that makes a 45 degree angle with the positive horizontal axis.
> caption: The demeaned data from [Preview Activity 7.2.1](ref:preview-quadforms) is shown projected onto the lines of maximal and minimal variance.
> subfigure src=../../media/ch07/quad-variance-a.svg alt: Three data points projected onto the line that makes a 45 degree angle with the positive horizontal axis.
> subfigure src=../../media/ch07/quad-variance-b.svg alt: Three data points projected onto the line that makes a -45 degree angle with the positive horizontal axis.
Remember that variance is additive, as stated in [Proposition 7.1.16](ref:7.1#prop-variance-additivity), which tells us that the total variance is $V = 9 + 1/3 = 28/3$.
:::

We've been focused on finding the directions in which a quadratic form attains its maximum and minimum values, but there's another important observation to make after this activity. Recall how we used the fact that a symmetric matrix is orthogonally diagonalizable: if $A=QDQ^T$, then $q_A({\mathbf u}) = q_D({\mathbf v})$ where ${\mathbf v} = Q^T{\mathbf u}$.

More generally, if we define ${\mathbf y} = Q^T{\mathbf x}$, we have

$$ q_A({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x}) = {\mathbf x}\cdot(QDQ^T{\mathbf x}) = (Q^T{\mathbf x})\cdot(DQ^T{\mathbf x}) = {\mathbf y}\cdot(D{\mathbf y}) = q_D({\mathbf y}) $$

Remembering that the quadratic form associated to a diagonal form has no cross terms, we obtain

$$ q_A({\mathbf x}) = q_D({\mathbf y}) = \lambda_1y_1^2 + \lambda_2y_2^2 + \ldots + \lambda_my_m^2. $$

In other words, after a change of coordinates, the quadratic form $q_A$ can be written without cross terms. This is known as the Principal Axes Theorem.

:::theorem {thm:theorem-7-2-10} Theorem 7.2.10 (Principal Axes Theorem)
If $A$ is a symmetric $m\times m$ matrix with eigenvalues $\lambda_1,\lambda_2,\ldots,\lambda_m$, then the quadratic form $q_A$ can be written, after an orthogonal change of coordinates ${\mathbf y}=Q^T{\mathbf x}$, as

$$ q_A({\mathbf x}) = \lambda_1y_1^2 + \lambda_2y_2^2 + \ldots + \lambda_my_m^2. $$

:::

We will put this to use in the next section.

## 7.2.3 Definite symmetric matrices

While our questions about variance provide some motivation for exploring quadratic forms, these functions appear in a variety of other contexts so it's worth spending some more time with them. For example, quadratic forms appear in multivariable calculus when describing the behavior of a function of several variables near a critical point and in physics when describing the kinetic energy of a rigid body.

The following definition will be important in this section.

:::definition {def:definition-7-2-11} Definition 7.2.11
A symmetric matrix $A$ is called *positive definite* if its associated quadratic form satisfies $q_A({\mathbf x}) > 0$ for any nonzero vector ${\mathbf x}$. If $q_A({\mathbf x}) \geq 0$ for all nonzero vectors ${\mathbf x}$, we say that $A$ is *positive semidefinite*.
Likewise, we say that $A$ is *negative definite* if $q_A({\mathbf x}) < 0$ for all nonzero vectors ${\mathbf x}$.
Finally, $A$ is called *indefinite* if $q_A({\mathbf x}) > 0$ for some ${\mathbf x}$ and $q_A({\mathbf x}) < 0$ for others.
:::

:::activity {act:activity-7-2-4} Activity 7.2.4
This activity explores the relationship between the eigenvalues of a symmetric matrix and its definiteness.

a) 
    Consider the diagonal matrix $D=\begin{bmatrix} 4 & 0 \\ 0 & 2 \\ \end{bmatrix}$ and write its quadratic form $q_D({\mathbf x})$ in terms of the components of ${\mathbf x}=\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]$. How does this help you decide whether $D$ is positive definite or not?

b) 
    Now consider $D=\begin{bmatrix} 4 & 0 \\ 0 & 0 \\ \end{bmatrix}$ and write its quadratic form $q_D({\mathbf x})$ in terms of $x_1$ and $x_2$. What can you say about the definiteness of $D$?

c) 
    If $D$ is a diagonal matrix, what condition on the diagonal entries guarantee that $D$ is

    1. 
        positive definite?

    2. 
        positive semidefinite?

    3. 
        negative definite?

    4. 
        negative semidefinite?

    5. 
        indefinite?

d) 
    Suppose that $A$ is a symmetric matrix with eigenvalues 4 and 2 so that $A=QDQ^T$ where $D=\begin{bmatrix}4 & 0 \\ 0 & 2 \end{bmatrix}$. If ${\mathbf y} = Q^T{\mathbf x}$, then we have $q_A({\mathbf x}) = q_D({\mathbf y})$. Explain why this tells us that $A$ is positive definite.

e) 
    Suppose that $A$ is a symmetric matrix with eigenvalues 4 and 0. What can you say about the definiteness of $A$ in this case?

f) 
    What condition on the eigenvalues of a symmetric matrix $A$ guarantees that $A$ is

    1. 
        positive definite?

    2. 
        positive semidefinite?

    3. 
        negative definite?

    4. 
        negative semidefinite?

    5. 
        indefinite?

ANSWER:

a) 
    $q_D({\mathbf x}) = 4x_1^2 + 2x_2^2$ so $D$ is positive definite.

b) 
    $q_D({\mathbf x}) = 4x_1^2$ so $D$ is positive semidefinite.

c) 

    1. 
        They are all positive.

    2. 
        They are all nonnegative.

    3. 
        They are all negative.

    4. 
        They are all nonpositive.

    5. 
        They are some positive eigenvalues and some negative ones .

d) 
    $A$ is positive definite.

e) 
    $A$ is positive semidefinite.

f) 
    They will be the same as before.

SOLUTION:

a) 
    $q_D({\mathbf x}) = 4x_1^2 + 2x_2^2$. Both addends are nonnegative, and one of them is positive if ${\mathbf x}$ is nonzero. This means that $q_D({\mathbf x}) > 0$ when ${\mathbf x}$ is nonzero and so $D$ is positive definite.

b) 
    $q_D({\mathbf x}) = 4x_1^2$, which is always nonnegative. However, $q_D\left(\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right) = 0$ so $D$ is positive semidefinite.

c) 

    1. 
        They are all positive.

    2. 
        They are all nonnegative.

    3. 
        They are all negative.

    4. 
        They are all nonpositive.

    5. 
        They are some positive eigenvalues and some negative ones .

d) 
    Since we know that $q_D({\mathbf y}) > 0$ when ${\mathbf y}$ is nonzero, we know that $q_A({\mathbf x}) > 0$ when ${\mathbf x}$ is nonzero. Therefore, $A$ is positive definite.

e) 
    It will be positive semidefinite.

f) 
    They will be the same as before.

:::

As seen in this activity, it is straightforward to determine the definiteness of a diagonal matrix. For instance, if $D=\begin{bmatrix} 7 & 0 \\ 0 & 5 \end{bmatrix}$, then

$$ q_D({\mathbf x}) = 7x_1^2 + 5x_2^2. $$

This shows that $q_D({\mathbf x}) > 0$ when either $x_1$ or $x_2$ is not zero so we conclude that $D$ is positive definite. In the same way, we see that $D$ is positive semidefinite if all the diagonal entries are nonnegative.

Understanding this behavior for diagonal matrices enables us to understand more general symmetric matrices. As we saw previously, the quadratic form for a symmetric matrix $A=QDQ^T$ agrees with the quadratic form for the diagonal matrix $D$ after a change of coordinates. In particular,

$$ q_A({\mathbf x}) = q_D({\mathbf y}) $$

where ${\mathbf y}=Q^T{\mathbf x}$. Now the diagonal entries of $D$ are the eigenvalues of $A$ from which we conclude that $q_A({\mathbf x}) > 0$ if all the eigenvalues of $A$ are positive. Likewise, $q_A({\mathbf x})\geq 0$ if all the eigenvalues are nonnegative.

:::proposition {prop:prop-definite-matrices} Proposition 7.2.12
A symmetric matrix is positive definite if all its eigenvalues are positive. It is positive semidefinite if all its eigenvalues are nonnegative.
Likewise, a symmetric matrix is indefinite if some eigenvalues are positive and some are negative.
:::

We will now apply what we've learned about quadratic forms to study the nature of critical points in multivariable calculus. The rest of this section assumes that the reader is familiar with ideas from multivariable calculus and can be skipped by others.

First, suppose that $f(x,y)$ is a differentiable function. We will use $f_x$ and $f_y$ to denote the partial derivatives of $f$ with respect to $x$ and $y$. Similarly, $f_{xx}$, $f_{xy}$, $f_{yx}$ and $f_{yy}$ denote the second partial derivatives. You may recall that the mixed partials, $f_{xy}$ and $f_{yx}$ are equal under a mild assumption on the function $f$. A typical question in calculus is to determine where this function has its maximum and minimum values.

Any local maximum or minimum of $f$ appears at a critical point $(x_0,y_0)$ where

$$ f_x(x_0,y_0) = 0,\hspace{24pt} f_y(x_0,y_0) = 0. $$

Near a critical point, the quadratic approximation of $f$ tells us that

$$ \begin{aligned} f(x,y)\approx f(x_0,y_0) & + \frac12 f_{xx}(x_0,y_0)(x-x_0)^2 \\ & + f_{xy}(x_0,y_0)(x-x_0)(y-y_0) + \frac12 f_{yy}(x_0,y_0)(y-y_0)^2. \end{aligned} $$

:::activity {act:activity-7-2-5} Activity 7.2.5
Let's explore how our understanding of quadratic forms helps us determine the behavior of a function $f$ near a critical point.

a) 
    Consider the function $f(x,y) = 2x^3 - 6xy + 3y^2$. Find the partial derivatives $f_{x}$ and $f_y$ and use these expressions to determine the critical points of $f$.

b) 
    Evaluate the second partial derivatives $f_{xx}$, $f_{xy}$, and $f_{yy}$.

c) 
    Let's first consider the critical point $(1,1)$. Use the quadratic approximation as written above to find an expression approximating $f$ near the critical point.

d) 
    Using the vector ${\mathbf w} = \left[\begin{array}{r}x-1 \\ y-1 \end{array}\right]$, rewrite your approximation as

    $$ f(x,y) \approx f(1,1) + q_A({\mathbf w}) $$

    for some matrix $A$. What is the matrix $A$ in this case?

e) 
    Find the eigenvalues of $A$. What can you conclude about the definiteness of $A$?

f) 
    Recall that $(x_0,y_0)$ is a local minimum for $f$ if $f(x,y) > f(x_0,y_0)$ for nearby points $(x,y)$. Explain why our understanding of the eigenvalues of $A$ shows that $(1,1)$ is a local minimum for $f$.

    :::sage
    ```sage
    x, y = var('x', 'y')
    plot3d(2*x^3 - 6*x*y + 3*y^2, (x, 0.75,1.25), (y,0.75,1.25))

    ```
    :::

ANSWER:

a) 
    We have

    $$ \begin{aligned} f_x & {}={} 6x^2 - 6y = 0 \\ f_y & {}={} -6x + 6y = 0 \end{aligned} $$

    with critical points $(0,0)$ and $(1,1)$.

b) 
    We have

    $$ f_{xx} = 12x, \hspace{24pt} f_{xy} = -6, \hspace{24pt} f_{yy} = 6 $$

c) 
    This gives

    $$ f(x,y)\approx -1 + \frac12 12(x-1)^2 -6(x-1)(y-1) + \frac12 6(y-1)^2 $$

d) 
    $A = \begin{bmatrix} 6 & -3 \\ -3 & 3 \end{bmatrix}$.

e) 
    $A$ is positive definite.

f) 
    $f(x,y) \approx f(1,1) + q_A({\mathbf w}) > f(1,1)$ for points $(x,y)$ near to $(1,1)$.

SOLUTION:

a) 
    We have

    $$ \begin{aligned} f_x & {}={} 6x^2 - 6y = 0 \\ f_y & {}={} -6x + 6y = 0 \end{aligned} $$

    which leads to the conditions $y=x^2$ and $y=x$. This gives the critical points $(0,0)$ and $(1,1)$.

b) 
    We have

    $$ f_{xx} = 12x, \hspace{24pt} f_{xy} = -6, \hspace{24pt} f_{yy} = 6 $$

c) 
    This gives

    $$ f(x,y)\approx -1 + \frac12 12(x-1)^2 -6(x-1)(y-1) + \frac12 6(y-1)^2 $$

d) 
    The matrix is $A = \begin{bmatrix} 6 & -3 \\ -3 & 3 \end{bmatrix}$.

e) 
    The eigenvalues are $\lambda_1=7.85$ and $\lambda_2=1.15$, both of which are positive, which means that $A$ is positive definite.

f) 
    We have $q_A({\mathbf w}) > 0$ if ${\mathbf w}$ is nonzero so

    $$ f(x,y) \approx f(1,1) + q_A({\mathbf w}) > f(1,1) $$

    for points $(x,y)$ near to $(1,1)$.

:::

Near a critical point $(x_0,y_0)$ of a function $f(x,y)$, we can write

$$ f(x,y) \approx f(x_0, y_0) + q_A({\mathbf w}) $$

where ${\mathbf w} = \left[\begin{array}{r}x-x_0 \\ y-y_0 \end{array}\right]$ and $A = \frac12 \begin{bmatrix} f_{xx}(x_0,y_0) & f_{xy}(x_0,y_0) \\ f_{yx}(x_0,y_0) & f_{yy}(x_0,y_0) \end{bmatrix}$. If $A$ is positive definite, then $q_A({\mathbf w}) > 0$, which tells us that

$$ f(x,y) \approx f(x_0,y_0) + q_A({\mathbf w}) > f(x_0,y_0) $$

and that the critical point $(x_0,y_0)$ is therefore a local minimum.

The matrix

$$ H = \begin{bmatrix} f_{xx}(x_0,y_0) & f_{xy}(x_0,y_0) \\ f_{yx}(x_0,y_0) & f_{yy}(x_0,y_0) \end{bmatrix} $$

is called the *Hessian* of $f$, and we see now that the eigenvalues of this symmetric matrix determine the nature of the critical point $(x_0,y_0)$. In particular, if the eigenvalues are both positive, then $q_H$ is positive definite, and the critical point is a local minimum.

This observation leads to the Second Derivative Test for multivariable functions.

:::proposition {prop:proposition-7-2-13} Proposition 7.2.13 (Second Derivative Test)
The nature of a critical point of a multivariable function is determined by the Hessian $H$ of the function at the critical point. If

- 
    $H$ has all positive eigenvalues, the critical point is a local minimum.

- 
    $H$ has all negative eigenvalues, the critical point is a local maximum.

- 
    $H$ has both positive and negative eigenvalues, the critical point is neither a local maximum nor minimum.

:::

Most multivariable calculus texts assume that the reader is not familiar with linear algebra and so write the second derivative test for functions of two variables in terms of $D=\det(H)$. If

- 
    $D > 0$ and $f_{xx}(x_0,y_0) > 0$, then $(x_0, y_0)$ is a local minimum.

- 
    $D > 0$ and $f_{xx}(x_0,y_0) < 0$, then $(x_0, y_0)$ is a local maximum.

- 
    $D < 0$, then $(x_0,y_0)$ is neither a local maximum nor minimum.

The conditions in this version of the second derivative test are simply algebraic criteria that tell us about the definiteness of the Hessian matrix $H$.

## 7.2.4 Summary

This section explored quadratic forms, functions that are defined by symmetric matrices.

- 
    If $A$ is a symmetric matrix, then the quadratic form defined by $A$ is the function $q_A({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x})$. Quadratic forms appear when studying the variance of a dataset. If $C$ is the covariance matrix, then the variance in the direction defined by a unit vector ${\mathbf u}$ is $q_C({\mathbf u}) = {\mathbf u}\cdot(C{\mathbf u})=V_{{\mathbf u}}$.

    Similarly, quadratic forms appear in multivariable calculus when analyzing the behavior of a function of several variables near a critical point.

- 
    If $\lambda_1$ is the largest eigenvalue of a symmetric matrix $A$ and $\lambda_m$ the smallest, then the maximum value of $q_A({\mathbf u})$ among unit vectors ${\mathbf u}$, is $\lambda_1$, and this maximum value occurs in the direction of ${\mathbf u}_1$, a unit eigenvector associated to $\lambda_1$.

    Similarly, the minimum value of $q_A({\mathbf u})$ is $\lambda_m$, which appears in the direction of ${\mathbf u}_m$, an eigenvector associated to $\lambda_m$.

- 
    A symmetric matrix is positive definite if its eigenvalues are all positive, positive semidefinite if its eigenvalues are all nonnegative, and indefinite if it has both positive and negative eigenvalues.

- 
    If the Hessian $H$ of a multivariable function $f$ is positive definite at a critical point, then the critical point is a local minimum. Likewise, if the Hessian is negative definite, the critical point is a local maximum.

## 7.2.5 Exercises

:::exercise {exercise-7-2-001} number=7.2.1 answered=yes src=src/exercises/exercises7-2.xml:5
PROBLEM:
Suppose that $A = \begin{bmatrix} 4 & 2 \\ 2 & 7 \end{bmatrix}$.

a) 
    Find an orthogonal diagonalization of $A$.

b) 
    Evaluate the quadratic form $q_A\left(\left[\begin{array}{r}1 \\ 1 \end{array}\right]\right)$.

c) 
    Find the unit vector ${\mathbf u}$ for which $q_A({\mathbf u})$ is as large as possible. What is the value of $q_A({\mathbf u})$ in this direction?

d) 
    Find the unit vector ${\mathbf u}$ for which $q_A({\mathbf u})$ is as small as possible. What is the value of $q_A({\mathbf u})$ in this direction?

ANSWER:

a) 
    $A = QDQ^T$ where

    $$ D=\begin{bmatrix} 8 & 0 \\ 0 & 3 \\ \end{bmatrix},\hspace{24pt} Q=\begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ 2/\sqrt{5} & -1/\sqrt{5} \\ \end{bmatrix}\text{.} $$

b) 
    $15$

c) 
    The maximum value is $8$ in the direction $\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$.

d) 
    The minimum value is $3$ in the direction $\left[\begin{array}{r}2/\sqrt{5} \\ -1/\sqrt{5} \end{array}\right]$.

SOLUTION:

a) 
    $A = QDQ^T$ where

    $$ D=\begin{bmatrix} 8 & 0 \\ 0 & 3 \\ \end{bmatrix},\hspace{24pt} Q=\begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ 2/\sqrt{5} & -1/\sqrt{5} \\ \end{bmatrix}\text{.} $$

b) 
    $q_A\left(\left[\begin{array}{r}1 \\ 1 \end{array}\right]\right) = \left[\begin{array}{r}1 \\ 1 \end{array}\right]\cdot\left(A\left[\begin{array}{r}1 \\ 1 \end{array}\right]\right) = 15$

c) 
    The maximum value is $8$ in the direction $\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$.

d) 
    The minimum value is $3$ in the direction $\left[\begin{array}{r}2/\sqrt{5} \\ -1/\sqrt{5} \end{array}\right]$.

:::

:::exercise {exercise-7-2-002} number=7.2.2 answered=yes src=src/exercises/exercises7-2.xml:123
PROBLEM:
Consider the quadratic form

$$ q\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) = 3x_1^2 - 4x_1x_2 + 6x_2^2. $$

a) 
    Find a matrix $A$ such that $q({\mathbf x}) = {\mathbf x}^TA{\mathbf x}$.

b) 
    Find the maximum and minimum values of $q({\mathbf u})$ among all unit vectors ${\mathbf u}$ and describe the directions in which they occur.

ANSWER:

a) 
    $A = \begin{bmatrix} 3 & -2 \\ -2 & 6 \\ \end{bmatrix}$

b) 
    The maximum value is $7$ in the direction $\left[\begin{array}{r}1/\sqrt{5} \\ -2/\sqrt{5} \end{array}\right]$. The minimum value is $2$ in the direction $\left[\begin{array}{r}2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$.

SOLUTION:

a) 
    $A = \begin{bmatrix} 3 & -2 \\ -2 & 6 \\ \end{bmatrix}$

b) 
    The maximum value is $7$ in the direction $\left[\begin{array}{r}1/\sqrt{5} \\ -2/\sqrt{5} \end{array}\right]$. The minimum value is $2$ in the direction $\left[\begin{array}{r}2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$.

:::

:::exercise {exercise-7-2-003} number=7.2.3 answered=yes src=src/exercises/exercises7-2.xml:195
PROBLEM:
Suppose that $A$ is a demeaned data matrix:

$$ A = \begin{bmatrix} 1 & -2 & 0 & 1 \\ 1 & -1 & -1 & 1 \\ \end{bmatrix}. $$

a) 
    Find the covariance matrix $C$.

b) 
    What is the variance of the data projected onto the line defined by ${\mathbf u}=\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$.

c) 
    What is the total variance?

d) 
    In which direction is the variance greatest and what is the variance in this direction?

ANSWER:

a) 
    $\begin{bmatrix} 3/2 & 1 \\ 1 & 1 \end{bmatrix}$

b) 
    $9/4$

c) 
    $5/2$.

d) 
    In the direction ${\mathbf u}=\left[\begin{array}{r}0.79 \\ 0.62 \end{array}\right]$ where $V_{{\mathbf u}}=2.28$.

SOLUTION:

a) 
    $C = \frac14 AA^T = \begin{bmatrix} 3/2 & 1 \\ 1 & 1 \end{bmatrix}$

b) 
    $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = 9/4$

c) 
    The total variance is $V_x+V_y = 3/2+1=5/2$.

d) 
    The variance is greatest in the direction ${\mathbf u}=\left[\begin{array}{r}0.79 \\ 0.62 \end{array}\right]$ where $V_{{\mathbf u}}=2.28$.

:::

:::exercise {exercise-7-2-004} number=7.2.4 answered=yes src=src/exercises/exercises7-2.xml:296
PROBLEM:
Consider the matrix $A = \begin{bmatrix} 4 & -3 & -3 \\ -3 & 4 & -3 \\ -3 & -3 & 4 \\ \end{bmatrix}$.

a) 
    Find $Q$ and $D$ such that $A=QDQ^T$.

b) 
    Find the maximum and minimum values of $q({\mathbf u}) = {\mathbf x}^TA{\mathbf x}$ among all unit vectors ${\mathbf u}$.

c) 
    Describe the direction in which the minimum value occurs. What can you say about the direction in which the maximum occurs?

ANSWER:

a) 

    $$ D = \begin{bmatrix} 7 & 0 & 0 \\ 0 & 7 & 0 \\ 0 & 0 & -2 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & -1/\sqrt{6} & 1/\sqrt{3} \\ 0 & 2/\sqrt{6} & 1/\sqrt{3} \\ -1/\sqrt{2} & -1/\sqrt{6} & 1/\sqrt{3} \\ \end{bmatrix} $$

b) 
    The maximum is 7 and the minimum is -2.

c) 
    The minimum occurs in the direction of $\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$. The maximum occurs along a circle defined by $c_1{\mathbf u}_1+c_2{\mathbf u}_2$ where $c_1^2+c_2^2=1$ and ${\mathbf u}_1$ and ${\mathbf u}_2$ are the first two columns of $Q$.

SOLUTION:

a) 

    $$ D = \begin{bmatrix} 7 & 0 & 0 \\ 0 & 7 & 0 \\ 0 & 0 & -2 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & -1/\sqrt{6} & 1/\sqrt{3} \\ 0 & 2/\sqrt{6} & 1/\sqrt{3} \\ -1/\sqrt{2} & -1/\sqrt{6} & 1/\sqrt{3} \\ \end{bmatrix} $$

b) 
    The maximum is 7 and the minimum is -2.

c) 
    The minimum occurs in the direction of $\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$. The maximum occurs along a circle defined by $c_1{\mathbf u}_1+c_2{\mathbf u}_2$ where $c_1^2+c_2^2=1$ and ${\mathbf u}_1$ and ${\mathbf u}_2$ are the first two columns of $Q$.

:::

:::exercise {exercise-7-2-005} number=7.2.5 answered=yes src=src/exercises/exercises7-2.xml:408
PROBLEM:
Consider the matrix $B = \begin{bmatrix} -2 & 1 \\ 4 & -2 \\ 2 & -1 \\ \end{bmatrix}$.

a) 
    Find the matrix $A$ so that $q\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right) = \left|B{\mathbf x}\right|^2=q_A({\mathbf x})$.

b) 
    Find the maximum and minimum values of $q({\mathbf u})$ among all unit vectors ${\mathbf u}$ and describe the directions in which they occur.

c) 
    What does the minimum value of $q({\mathbf u})$ tell you about the matrix $B$?

ANSWER:

a) 
    $A = B^TB=\begin{bmatrix} 24 & -12 \\ -12 & 6 \\ \end{bmatrix}$.

b) 
    The maximum value is $30$ in the direction $\left[\begin{array}{r}2/\sqrt{5} \\ -1/\sqrt{5} \end{array}\right]$ and the minimum value is $0$ in the direction $\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$.

c) 
    The columns of $B$ are linearly dependent.

SOLUTION:

a) 
    $q({\mathbf x}) = |B{\mathbf x}|^2 = (B{\mathbf x})\cdot(B{\mathbf x}) = {\mathbf x}\cdot(B^TB{\mathbf x})$ so $A = B^TB=\begin{bmatrix} 24 & -12 \\ -12 & 6 \\ \end{bmatrix}$.

b) 
    The maximum value is $30$ in the direction $\left[\begin{array}{r}2/\sqrt{5} \\ -1/\sqrt{5} \end{array}\right]$ and the minimum value is $0$ in the direction $\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$.

c) 
    The minimum value of $0$ says there is a vector such that $q({\mathbf u}) = |B{\mathbf u}|^2 = 0$, which means that $B{\mathbf u}=0$. So there is a nonzero vector that is a solution to the homogeneous equations, which implies that the columns of $B$ are linearly dependent.

:::

:::exercise {exercise-7-2-006} number=7.2.6 answered=yes src=src/exercises/exercises7-2.xml:502
PROBLEM:
Consider the quadratic form

$$ q\left(\left[\begin{array}{r}x_1 \\ x_2 \\ x_3 \end{array}\right]\right) = 7x_1^2 + 4x_2^2 + 7x_3^2 - 2x_1x_2 -4x_1x_3-2x_2x_3. $$

a) 
    What can you say about the definiteness of the matrix $A$ that defines the quadratic form?

b) 
    Find a matrix $Q$ so that the change of coordinates ${\mathbf y} = Q^T{\mathbf x}$ transforms the quadratic form into one that has no cross terms. Write the quadratic form in terms of ${\mathbf y}$.

c) 
    What are the maximum and minimum values for $q({\mathbf u})$ among all unit vectors ${\mathbf u}$?

ANSWER:

a) 
    $A$ is positive definite.

b) 
    $Q=\begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ 0 & -1/\sqrt{3} & 2/\sqrt{6} \\ -1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ \end{bmatrix}$ and $q_A({\mathbf x}) = 9y_1^2 + 6y_2^2 + 3y_3^2$

c) 
    The maximum value is $9$ and the minimum value is $3$.

SOLUTION:

a) 
    The matrix $A = \begin{bmatrix} 7 & -1 & -2 \\ -1 & 4 & -1 \\ -2 & -1 & 7 \end{bmatrix}$ has eigenvalues $3$, $6$, and $9$ so $A$ is positive definite.

b) 
    $Q=\begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ 0 & -1/\sqrt{3} & 2/\sqrt{6} \\ -1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ \end{bmatrix}$. If ${\mathbf y}=Q^T{\mathbf x}$, then

    $$ q_A({\mathbf x}) = 9y_1^2 + 6y_2^2 + 3y_3^2\text{.} $$

c) 
    The maximum value is $9$ and the minimum value is $3$.

:::

:::exercise {exercise-7-2-007} number=7.2.7 answered=yes src=src/exercises/exercises7-2.xml:600
PROBLEM:
Explain why the following statements are true.

a) 
    Given any matrix $B$, the matrix $B^TB$ is a symmetric, positive semidefinite matrix.

b) 
    If both $A$ and $B$ are symmetric, positive definite matrices, then $A+B$ is a symmetric, positive definite matrix.

c) 
    If $A$ is a symmetric, invertible, positive definite matrix, then $A^{-1}$ is also.

ANSWER:

a) 
    $q({\mathbf u}) = |B{\mathbf u}|^2 = \lambda \geq 0$.

b) 
    $q_{A+B}({\mathbf x}) = q_A({\mathbf x}) + q_B({\mathbf x}) > 0$.

c) 
    The eigenvalues of $A^{-1}$ are the reciprocals of the eigenvalues of $A$.

SOLUTION:

a) 
    The matrix is symmetric because $(B^TB)^T = B^T(B^T)^T = B^TB$. If ${\mathbf u}$ is an eigenvector having unit length, then $q({\mathbf u}) = {\mathbf u}\cdot(B^TB{\mathbf u}) = \lambda$ and $q({\mathbf u}) = {\mathbf u}\cdot(B^TB{\mathbf u}) = (B{\mathbf u})\cdot(B{\mathbf u}) = |B{\mathbf u}|^2 = \lambda \geq 0$.

b) 
    If ${\mathbf x}$ is a nonzero vector, then $q_{A+B}({\mathbf x}) = {\mathbf x}\cdot((A+B){\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x}) + {\mathbf x}\cdot(B{\mathbf x}) = q_A({\mathbf x}) + q_B({\mathbf x}) > 0$.

c) 
    In this case, we know that the eigenvalues of $A$ are all positive. If $\lambda$ is an eigenvalue of $A$, then $1/\lambda$ is an eigenvalue of $A^{-1}$ so $A^{-1}$ is also positive definite.

:::

:::exercise {exercise-7-2-008} number=7.2.8 answered=yes src=src/exercises/exercises7-2.xml:688
PROBLEM:
Determine whether the following statements are true or false and explain your reasoning.

a) 
    If $A$ is an indefinite matrix, we can't know whether it is positive definite or not.

b) 
    If the smallest eigenvalue of $A$ is 3, then $A$ is positive definite.

c) 
    If $C$ is the covariance matrix associated with a dataset, then $C$ is positive semidefinite.

d) 
    If $A$ is a symmetric $2\times2$ matrix and the maximum and minimum values of $q_A({\mathbf u})$ occur at $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$, then $A$ is diagonal.

e) 
    If $A$ is negative definite and $Q$ is an orthogonal matrix with $B = QAQ^T$, then $B$ is negative definite.

ANSWER:

a) 
    False

b) 
    True

c) 
    True

d) 
    True

e) 
    True

SOLUTION:

a) 
    False. We know that it is neither positive nor negative definite.

b) 
    True. This implies that $q_A({\mathbf u}) \geq 3$ for all unit vectors ${\mathbf u}$. Then for any other vector $q_A({\mathbf x}) =q_A(|{\mathbf x}|{\mathbf u})= |{\mathbf x}|^2 q_A({\mathbf u}) > 0$.

c) 
    True. If $\lambda$ is an eigenvalue with associated unit eigenvector ${\mathbf u}$, then

    $$ q_C({\mathbf u}) = {\mathbf u}\cdot(C{\mathbf u}) = \frac1N{\mathbf u}\cdot(AA^T{\mathbf u}) = \frac1N(A^T{\mathbf u})\cdot(A^T{\mathbf u}) = \frac1N|A^T{\mathbf u}|^2 \geq 0\text{.} $$

d) 
    True. The matrix $Q=\begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix}$ is the identity so $A = QDQ^T = D$.

e) 
    True. In this case, $A$ and $B$ are similar so they have the same eigenvalues, all of which are negative.

:::

:::exercise {exercise-7-2-009} number=7.2.9 answered=yes src=src/exercises/exercises7-2.xml:811
PROBLEM:
Determine the critical points for each of the following functions. At each critical point, determine the Hessian $H$, describe the definiteness of $H$, and determine whether the critical point is a local maximum or minimum.

a) 
    $f(x,y) = xy + \frac2x + \frac2y$.

b) 
    $f(x,y) = x^4 + y^4 - 4xy$.

ANSWER:

a) 
    $(\sqrt[3]{2}, \sqrt[3]{2})$ is neither a local maximum nor minimum.

b) 
    $(0,0)$ is neither a local maximum nor minimum. Both $(1,1)$ and $(-1,-1)$ are local minima.

SOLUTION:

a) 

    $$ \begin{aligned} f_x & {}={} y - \frac2{x^2} = 0 \\ f_y & {}={} x - \frac2{y^2} = 0 \end{aligned} $$

    so $x^2y=2$ and $xy^2=2$. Therefore, $xy(x-y)=0$ so $x=y=\sqrt[3]{2}$.

    Also, $f_{xx} = \frac4{x^3}$, $f_{xy} = 1$, and $f_{yy} = \frac4{y^3}$ so that the Hessian matrix is $\begin{bmatrix} 1/2 & 1 \\ 1 & 1/2 \end{bmatrix}$. The eigenvalues are $-1/2$ and $3/2$ so this matrix is indefinite and the critical point is neither a local maximum nor minimum.

b) 

    $$ \begin{aligned} f_x & {}={} 4x^3 - 4y = 0 \\ f_y & {}={} 4y^3 - 4x = 0 \end{aligned} $$

    so $x=y^3$ and $y=x^3$. Therefore, $x=x^9$ so $x=y=0$, $1$, or $-1$.

    Also, $f_{xx} = 12{x^2}$, $f_{xy} = -4$, and $f_{yy} = 12{y^2}$ so that the Hessian matrix is $\begin{bmatrix} 12x^2 & -4 \\ -4 & 12y^2 \end{bmatrix}$.

    At $(0,0)$, the Hessian is indefinite so this critical point is neither a local maximum nor minimum. At both $(1,1)$ and $(-1,-1)$, it is positive definite so the critical points are local minima.

:::

:::exercise {exercise-7-2-010} number=7.2.10 answered=yes src=src/exercises/exercises7-2.xml:911
PROBLEM:
Consider the function $f(x,y,z) = x^4 + y^4 +z^4 - 4xyz$.

a) 
    Show that $f$ has a critical point at $(-1,1,-1)$ and construct the Hessian $H$ at that point.

b) 
    Find the eigenvalues of $H$. Is this a definite matrix of some kind?

c) 
    What does this imply about whether $(-1,1,-1)$ is a local maximum or minimum?

ANSWER:

a) 
    The Hessian matrix at that point is $H=\begin{bmatrix} 12 & 4 & -4 \\ 4 & 12 & 4 \\ -4 & 4 & 12 \end{bmatrix}$

b) 
    $H$ is positive definite.

c) 
    The critical point is a local minimum.

SOLUTION:

a) 

    $$ \begin{aligned} f_x & {}={} 4x^3 - 4yz = 0 \\ f_y & {}={} 4y^3 - 4xz = 0 \\ f_z & {}={} 4z^3 - 4xy = 0 \end{aligned} $$

    and all three equations are satisfied at the point $(-1,1,-1)$.

    The Hessian matrix at that point is $H=\begin{bmatrix} 12 & 4 & -4 \\ 4 & 12 & 4 \\ -4 & 4 & 12 \end{bmatrix}$

b) 
    The eigenvalues are $4$, $16$, and $16$ so $H$ is positive definite

c) 
    This implies that the critical point is a local minimum.

:::
