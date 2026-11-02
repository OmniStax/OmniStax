# 4.3 Diagonalization, similarity, and powers of a matrix {sec-eigen-diag}

In [Activity 4.1.3](ref:4.1#activity-eigen-intro), we explored a car rental company with two locations and known probabilities that a car rented at one location was returned to the same location. If the distribution of cars on a given day is recorded by the vector ${\mathbf x}_k$, we found a matrix equation ${\mathbf x}_{k+1}=A{\mathbf x}_k$ that determined how the distribution of cars changed from day to day.
To understand what happens over a number of days, we could rewrite this expression in terms of the initial distribution ${\mathbf x}_0$ as

$$ {\mathbf x}_k=A^k{\mathbf x}_0 $$

. Making long-term predictions then requires us to understand how large powers of the matrix $A$ behave. This section will introduce some ideas for determining this behavior.

## 4.3.1 Introduction

The first example we considered in this chapter was the matrix $A=\left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$, which has eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ and associated eigenvalues $\lambda_1=3$ and $\lambda_2=-1$. In [Subsection 4.1.3](ref:4.1#subsec-eigen-use), we described how $A$ is, in some sense, equivalent to the diagonal matrix $D = \left[\begin{array}{rr} 3 & 0 \\ 0 & -1\\ \end{array}\right]$.

This equivalence is summarized by [Figure 4.3.1](ref:fig-eigen-diag-A). The diagonal matrix $D$ has the geometric effect of stretching vectors horizontally by a factor of $3$ and flipping vectors vertically. The matrix $A$ has the geometric effect of stretching vectors by a factor of $3$ in the ${\mathbf v}_1$ direction and flipping them in the ${\mathbf v}_2$ direction. That is, the geometric effect of $A$ is the same as that of $D$ when viewed in a basis of eigenvectors of $A$.

> FIGURE {fig:fig-eigen-diag-A} number=4.3.1 src=../../media/ch04/eigen-intro-A-a.svg
> alt: The unit square in the coordinate system defined by the eigenvectors
> caption: The matrix $A$ has the same geometric effect as the diagonal matrix $D$ when viewed in the basis of eigenvectors.
> subfigure src=../../media/ch04/eigen-intro-A-a.svg alt: The unit square in the coordinate system defined by the eigenvectors
> subfigure src=../../media/ch04/eigen-intro-A-b.svg alt: In the new coordinate system, multiplying by A transforms the unit square into a rotated rectangle.

Our goal in this section is to express this geometric observation in algebraic terms. In doing so, we will make precise the sense in which $A$ and $D$ are equivalent.

:::exploration {act:preview-4-3-1} Preview Activity 4.3.1
In this preview activity, we will review some familiar properties about matrix multiplication that appear in this section.
PROBLEM:
a) Remember that matrix-vector multiplication constructs linear combinations of the columns of the matrix. For instance, if $A = \begin{bmatrix} {\mathbf a}_1 & {\mathbf a}_2 \end{bmatrix}$, express the product $A\left[\begin{array}{r}2 \\ -3 \end{array}\right]$ in terms of ${\mathbf a}_1$ and ${\mathbf a}_2$.
b) What is the product $A\left[\begin{array}{r}4 \\ 0 \end{array}\right]$ in terms of ${\mathbf a}_1$ and ${\mathbf a}_2$?
c) Next, remember how matrix-matrix multiplication is defined. Suppose that we have matrices $A$ and $B$ and that $B = \begin{bmatrix} {\mathbf b}_1 & {\mathbf b}_2 \end{bmatrix}$. How can we express the matrix product $AB$ in terms of the columns of $B$?
d) Suppose that $A$ is a matrix having eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$ with associated eigenvalues $\lambda_1 = 4$ and $\lambda_2 = -1$. Express the product $A(2{\mathbf v}_1+3{\mathbf v}_2)$ in terms of ${\mathbf v}_1$ and ${\mathbf v}_2$.
e) Suppose that $A$ is the matrix from the previous part and that $P=\begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}$. What is the matrix product

    $$ AP = A\begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}? $$

SOLUTION:
a) $A\left[\begin{array}{r}2 \\ -3 \end{array}\right] = 2{\mathbf a}_1 - 3{\mathbf a}_2$.
b) $A\left[\begin{array}{r}4 \\ 0 \end{array}\right] = 4{\mathbf a}_1$.
c) $AB = \begin{bmatrix} A{\mathbf b}_1 & A{\mathbf b}_2 \end{bmatrix}$.
d) $A(2{\mathbf v}_1 + 3{\mathbf v}_2) = 8{\mathbf v}_1 - 3{\mathbf v}_2$.
e) $AP = \begin{bmatrix} A{\mathbf v}_1 & A{\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} 4{\mathbf v}_1 & -{\mathbf v}_2 \end{bmatrix}$.
:::

## 4.3.2 Diagonalization of matrices

When working with an $n\times n$ matrix $A$, [Subsection 4.1.3](ref:4.1#subsec-eigen-use) demonstrated the value of having a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$. In fact, [Proposition 4.2.9](ref:4.2#prop-eigen-basis) tells us that if the eigenvalues of $A$ are real and distinct, then there is a such a basis. As we'll see later, there are other conditions on $A$ that guarantee a basis of eigenvectors. For now, suffice it to say that we can find a basis of eigenvectors for many matrices. With this assumption, we will see how the matrix $A$ is equivalent to a diagonal matrix $D$.

:::activity {act:activity-4-3-2} Activity 4.3.2
Suppose that $A$ is a $2\times2$ matrix having eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$ with associated eigenvalues $\lambda_1=3$ and $\lambda_2 = -6$. Because the eigenvalues are real and distinct, we know by [Proposition 4.2.9](ref:4.2#prop-eigen-basis) that these eigenvectors form a basis of ${\mathbb R}^2$.

a) 
    What are the products $A{\mathbf v}_1$ and $A{\mathbf v}_2$ in terms of ${\mathbf v}_1$ and ${\mathbf v}_2$?

b) 
    If we form the matrix $P = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}$, what is the product $AP$ in terms of ${\mathbf v}_1$ and ${\mathbf v}_2$?

c) 
    Use the eigenvalues to form the diagonal matrix $D = \begin{bmatrix} 3 & 0 \\ 0 & -6 \end{bmatrix}$ and determine the product $PD$ in terms of ${\mathbf v}_1$ and ${\mathbf v}_2$.

d) 
    The results from the previous two parts of this activity demonstrate that $AP=PD$. Using the fact that the eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$ form a basis of ${\mathbb R}^2$, explain why $P$ is invertible and that we must have $A=PDP^{-1}$.

e) 
    Suppose that $A=\begin{bmatrix} -3 & 6 \\ 3 & 0 \\ \end{bmatrix}$. Verify that ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}2 \\ -1 \end{array}\right]$ are eigenvectors of $A$ with eigenvalues $\lambda_1 = 3$ and $\lambda_2=-6$.

f) 
    Use the Sage cell below to define the matrices $P$ and $D$ and then verify that $A=PDP^{-1}$.

    :::sage
    ```sage
    # enter the matrices P and D below
    P =
    D =
    P*D*P.inverse()

    ```
    :::

SOLUTION:

a) 
    We have $A{\mathbf v}_1=3{\mathbf v}_1$ and $A{\mathbf v}_2 = -6{\mathbf v}_2$.

b) 
    $AP = \begin{bmatrix} A{\mathbf v}_1 & A{\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} 3{\mathbf v}_1 & -6{\mathbf v}_2 \end{bmatrix}$.

c) 
    $PD = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix} \begin{bmatrix} 3 & 0 \\ 0 & -6\\ \end{bmatrix} = \begin{bmatrix} 3{\mathbf v}_1 & -6{\mathbf v}_2 \end{bmatrix}$. Comparing the result of this part of the activity to the previous, we see that $AP = PD$.

d) 
    Since the eigenvectors form a basis, the columns of $P$ are linearly independent and their span is ${\mathbb R}^2$. This guarantees that $P$ is invertible. Multiplying the equation $AP=PD$ on the right by $P^{-1}$ gives $APP^{-1} = A = PDP^{-1}$.

The rest of the activity can be verified using Sage.
:::

More generally, suppose that we have an $n\times n$ matrix $A$ and that there is a basis of ${\mathbb R}^n$ consisting of eigenvectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ of $A$ with associated eigenvalues $\lambda_1,\lambda_2,\ldots,\lambda_n$. If we use the eigenvectors to form the matrix

$$ P = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & \cdots & {\mathbf v}_n \end{bmatrix} $$

and the eigenvalues to form the diagonal matrix

$$ D = \left[\begin{array}{cccc} \lambda_1 & 0 & \ldots & 0 \\ 0 & \lambda_2 & \ldots & 0 \\ \vdots & \vdots & \ddots & 0 \\ 0 & 0 & \ldots & \lambda_n \\ \end{array}\right] $$

and apply the same reasoning demonstrated in the activity, we find that $AP = PD$ and hence

$$ A=PDP^{-1}. $$

We have now seen the following proposition.

:::proposition {prop:prop-diagonalizable} Proposition 4.3.2
If $A$ is an $n\times n$ matrix and there is a basis $\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n\}$ of ${\mathbb R}^n$ consisting of eigenvectors of $A$ having associated eigenvalues $\lambda_1, \lambda_2, \ldots, \lambda_n$, then we can write $A=PDP^{-1}$ where $D$ is the diagonal matrix whose diagonal entries are the eigenvalues of $A$

$$ D = \left[\begin{array}{cccc} \lambda_1 & 0 & \ldots & 0 \\ 0 & \lambda_2 & \ldots & 0 \\ \vdots & \vdots & \ddots & 0 \\ 0 & 0 & \ldots & \lambda_n \\ \end{array}\right] $$

and the matrix $P = \left[\begin{array}{cccc} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_n \end{array}\right]$.
:::

:::example {ex:example-4-3-3} Example 4.3.3
We have seen that $A = \begin{bmatrix} 1 & 2 \\ 2 & 1 \\ \end{bmatrix}$ has eigenvectors ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ with associated eigenvalues $\lambda_1 = 3$ and $\lambda_2 = -1$. Forming the matrices

$$ P = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} 1 & -1 \\ 1 & 1 \\ \end{bmatrix},~~~ D = \begin{bmatrix} 3 & 0 \\ 0 & -1 \\ \end{bmatrix}, $$

we see that $A=PDP^{-1}$.
This is the sense in which we mean that $A$ is equivalent to a diagonal matrix $D$. The expression $A=PDP^{-1}$ says that $A$, expressed in the basis defined by the columns of $P$, has the same geometric effect as $D$, expressed in the standard basis ${\mathbf e}_1, {\mathbf e}_2,\ldots,{\mathbf e}_n$.
:::

:::definition {def:definition-4-3-4} Definition 4.3.4
{index-entry:diagonalizable} We say that the matrix $A$ is *diagonalizable* if there is a diagonal matrix $D$ and invertible matrix $P$ such that

$$ A = PDP^{-1} $$

.
:::

:::example {ex:example-4-3-5} Example 4.3.5
We will try to find a diagonalization of $A = \left[\begin{array}{rr} -5 & 6 \\ -3 & 4 \\ \end{array}\right]$ whose characteristic equation is

$$ \det(A-\lambda I) = (-5-\lambda)(4-\lambda)+18 = (-2-\lambda)(1-\lambda) = 0 $$

. This shows that the eigenvalues of $A$ are $\lambda_1 = -2$ and $\lambda_2 = 1$.
By constructing $\text{Nul}(A-(-2)I)$, we find a basis for $E_{-2}$ consisting of the vector ${\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$. Similarly, a basis for $E_1$ consists of the vector ${\mathbf v}_2 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$. This shows that we can construct a basis $\{{\mathbf v}_1,{\mathbf v}_2\}$ of ${\mathbb R}^2$ consisting of eigenvectors of $A$.
We now form the matrices

$$ D = \left[\begin{array}{rr} -2 & 0 \\ 0 & 1 \\ \end{array}\right],\qquad P = \left[\begin{array}{cc} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right] = \left[\begin{array}{rr} 2 & 1 \\ 1 & 1 \\ \end{array}\right] $$

and verify that

$$ PDP^{-1} = \left[\begin{array}{rr} 2 & 1 \\ 1 & 1 \\ \end{array}\right] \left[\begin{array}{rr} -2 & 0 \\ 0 & 1 \\ \end{array}\right] \left[\begin{array}{rr} 1 & -1 \\ -1 & 2 \\ \end{array}\right] = \left[\begin{array}{rr} -5 & 6 \\ -3 & 4 \\ \end{array}\right] = A $$

.
There are, in fact, many ways to diagonalize $A$. For instance, we could change the order of the eigenvalues and eigenvectors and write

$$ D = \left[\begin{array}{rr} 1 & 0 \\ 0 & -2 \\ \end{array}\right],\qquad P = \left[\begin{array}{cc} {\mathbf v}_2 & {\mathbf v}_1 \end{array}\right] = \left[\begin{array}{rr} 1 & 2 \\ 1 & 1 \\ \end{array}\right] $$

.
If we choose a different basis for the eigenspaces, we will also find a different matrix $P$ that diagonalizes $A$. The point is that there are many ways in which $A$ can be written in the form $A=PDP^{-1}$.
:::

:::example {ex:example-4-3-6} Example 4.3.6
We will try to find a diagonalization of $A = \left[\begin{array}{rr} 0 & 4 \\ -1 & 4 \\ \end{array}\right]$.
Once again, we find the eigenvalues by solving the characteristic equation:

$$ \det(A-\lambda I) = -\lambda(4-\lambda) + 4 = (2-\lambda)^2 = 0 $$

. In this case, there is a single eigenvalue $\lambda=2$.
We find a basis for the eigenspace $E_2$ by describing $\text{Nul}(A-2I)$:

$$ A-2I = \left[\begin{array}{rr} -2 & 4 \\ -1 & 2 \\ \end{array}\right] \sim \left[\begin{array}{rr} 1 & -2 \\ 0 & 0 \\ \end{array}\right] $$

. This shows that the eigenspace $E_2$ is one-dimensional with ${\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ forming a basis.
In this case, there is not a basis of ${\mathbb R}^2$ consisting of eigenvectors of $A$, which tells us that $A$ is not diagonalizable.
:::

In fact, if we only know that $A = PDP^{-1}$, we can say that the columns of $P$ are eigenvectors of $A$ and that the diagonal entries of $D$ are the associated eigenvalues.

:::proposition {prop:prop-diagonalizability} Proposition 4.3.7
An $n\times n$ matrix $A$ is diagonalizable if and only if there is a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$.
:::

:::example {ex:example-4-3-8} Example 4.3.8
Suppose we know that $A=PDP^{-1}$ where

$$ D = \left[\begin{array}{rr} 2 & 0 \\ 0 & -2 \\ \end{array}\right],\qquad P = \left[\begin{array}{cc} {\mathbf v}_2 & {\mathbf v}_1 \end{array}\right] = \left[\begin{array}{rr} 1 & 1 \\ 1 & 2 \\ \end{array}\right]. $$

The columns of $P$ form eigenvectors of $A$ so that ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ is an eigenvector of $A$ with eigenvalue $\lambda_1 = 2$ and ${\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \end{array}\right]$ is an eigenvector with eigenvalue $\lambda_2=-2$.
We can verify this by computing

$$ A = PDP^{-1} = \left[\begin{array}{rr} 6 & -4 \\ 8 & -6 \\ \end{array}\right] $$

and checking that $A{\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]=2{\mathbf v}_1$ and $A{\mathbf v}_2 = \left[\begin{array}{r}1 \\ 2 \end{array}\right] = -2{\mathbf v}_2$.
:::

:::activity {act:activity-4-3-3} Activity 4.3.3

a) 
    Find a diagonalization of $A$, if one exists, when

    $$ A = \left[\begin{array}{rr} 3 & -2 \\ 6 & -5 \\ \end{array}\right] $$

    .

b) 
    Can the diagonal matrix

    $$ A = \left[\begin{array}{rr} 2 & 0 \\ 0 & -5 \\ \end{array}\right] $$

    be diagonalized? If so, explain how to find the matrices $P$ and $D$.

c) 
    Find a diagonalization of $A$, if one exists, when

    $$ A = \left[\begin{array}{rrr} -2 & 0 & 0 \\ 1 & -3& 0 \\ 2 & 0 & -3 \\ \end{array}\right] $$

    .

    :::sage
    ```sage

    ```
    :::

d) 
    Find a diagonalization of $A$, if one exists, when

    $$ A = \left[\begin{array}{rrr} -2 & 0 & 0 \\ 1 & -3& 0 \\ 2 & 1 & -3 \\ \end{array}\right] $$

    .

    :::sage
    ```sage

    ```
    :::

e) 
    Suppose that $A=PDP^{-1}$ where

    $$ D = \left[\begin{array}{rr} 3 & 0 \\ 0 & -1 \\ \end{array}\right],\qquad P = \left[\begin{array}{cc} {\mathbf v}_2 & {\mathbf v}_1 \end{array}\right] = \left[\begin{array}{rr} 2 & 2 \\ 1 & -1 \\ \end{array}\right] $$

    .

    1. 
        Explain why $A$ is invertible.

    2. 
        Find a diagonalization of $A^{-1}$.

    3. 
        Find a diagonalization of $A^3$.

SOLUTION:

a) 
    We find that $A$ has eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_1=1$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 3 \end{array}\right]$ with associated eigenvalue $\lambda_2=-3$. We then have $P=\left[\begin{array}{rr}1 \amp 1 \\ 1 \amp 3 \\ \end{array}\right]$ and $D=\left[\begin{array}{rr}1 \amp 0 \\ 0 \amp -3 \\ \end{array}\right]$.

b) 
    Yes. We know that the eigenvectors are ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ with associated eigenvalue $\lambda_1=2$ and ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_2=-5$. Therefore, $P = \left[\begin{array}{rr}{\mathbf v}_1 & {\mathbf v}_2 \end{array}\right] = \left[\begin{array}{rr}1 \amp 0 \\ 0 \amp 1 \\ \end{array}\right]=I$ and $D=\left[\begin{array}{rr}2 \amp 0 \\ 0 \amp -5 \\ \end{array}\right]=A$. This shows that the diagonalization is $A=IAI^{-1}$; that is, since $A$ is already diagonal, it is diagonalized by the identity matrix.

c) 
    We find eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 2 \end{array}\right]$, ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]$, and ${\mathbf v}_3=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$ with associated eigenvalues $\lambda_1=-2$, $\lambda_2=-3$, and $\lambda_3=-3$. Therefore, $A = PDP^{-1}$ where

    $$ P = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 1 & 1 & 0 \\ 2 & 0 & 1 \\ \end{array}\right], D = \left[\begin{array}{rrr} -2 & 0 & 0 \\ 0 & -3 & 0 \\ 0 & 0 & -3 \\ \end{array}\right]\text{.} $$

d) 
    Once again, we see that $\lambda=-2$ is an eigenvalue with multiplicity one and $\lambda=-3$ is an eigenvalue with multiplicity two. However, $\dim E_{-3} = 1$ so we are not able to find a basis for ${\mathbb R}^3$ consisting of eigenvalues of $A$. Therefore, $A$ is not diagonalizable.

e) 
    If $A=PDP^{-1}$,

    1. 
        $A$ is invertible since $\det A = \det D = -3$.

    2. 
        We know that ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A$ with associated eigenvalues $\lambda_1=3$ and $\lambda_2=-1$. If ${\mathbf v}$ is an eigenvector of $A$ with associated eigenvalue $\lambda$, then ${\mathbf v}$ is an eigenvector of $A^{-1}$ with associated eigenvalue $\frac1{\lambda}$. Therefore, $A^{-1} = PEP^{-1}$ where $E = \left[\begin{array}{rr}\frac13 \amp 0 \\ 0 \amp -1 \\ \end{array}\right]$.

    3. 
        We have $A^3=PFP^{-1}$ where $F=\left[\begin{array}{rr}27 \amp 0 \\ 0 \amp -1 \\ \end{array}\right]$.

:::

## 4.3.3 Powers of a diagonalizable matrix {subsec-powers}

In several earlier examples, we have been interested in computing powers of a given matrix. For instance, in [Activity 4.1.3](ref:4.1#activity-eigen-intro), we had the matrix $A = \left[\begin{array}{rr} 0.8 & 0.6 \\ 0.2 & 0.4 \\ \end{array}\right]$ and an initial vector ${\mathbf x}_0=\left[\begin{array}{c}1000 \\ 0 \end{array}\right]$, and we wanted to compute

$$ \begin{aligned} {\mathbf x}_1 & {}={} A{\mathbf x}_0 \\ {\mathbf x}_2 & {}={} A{\mathbf x}_1 = A^2{\mathbf x}_0 \\ {\mathbf x}_3 & {}={} A{\mathbf x}_2 = A^3{\mathbf x}_0\text{.} \\ \end{aligned} $$

In particular, we wanted to find ${\mathbf x}_k=A^k{\mathbf x}_0$ and determine what happens as $k$ becomes very large. If a matrix $A$ is diagonalizable, writing $A=PDP^{-1}$ can help us understand powers of $A$ more easily.

:::activity {act:activity-4-3-4} Activity 4.3.4

a) 
    Let's begin with the diagonal matrix

    $$ D = \left[\begin{array}{rr} 2 & 0 \\ 0 & -1 \\ \end{array}\right] $$

    . Find the powers $D^2$, $D^3$, and $D^4$. What is $D^k$ for a general value of $k$?

b) 
    Suppose that $A$ is a matrix with eigenvector ${\mathbf v}$ and associated eigenvalue $\lambda$; that is, $A{\mathbf v} = \lambda{\mathbf v}$. By considering $A^2{\mathbf v}$, explain why ${\mathbf v}$ is also an eigenvector of $A^2$ with eigenvalue $\lambda^2$.

c) 
    Suppose that $A= PDP^{-1}$ where

    $$ D = \left[\begin{array}{rr} 2 & 0 \\ 0 & -1 \\ \end{array}\right] $$

    . Remembering that the columns of $P$ are eigenvectors of $A$, explain why $A^2$ is diagonalizable and find a diagonalization in terms of $P$ and $D$.

d) 
    Give another explanation of the diagonalizability of $A^2$ by writing

    $$ A^2 = (PDP^{-1})(PDP^{-1}) = PD(P^{-1}P)DP^{-1} $$

    .

e) 
    In the same way, find a diagonalization of $A^3$, $A^4$, and $A^k$.

f) 
    Suppose that $A$ is a diagonalizable $2\times2$ matrix with eigenvalues $\lambda_1 = 0.5$ and $\lambda_2=0.1$. What happens to $A^k$ as $k$ becomes very large?

SOLUTION:

a) 
    We have

    $$ D^2=\left[\begin{array}{rr}4 \amp 0 \\ 0 \amp 1 \\ \end{array}\right], D^3=\left[\begin{array}{rr}8 \amp 0 \\ 0 \amp -1 \\ \end{array}\right], \ldots, D^k=\left[\begin{array}{rr}2^k \amp 0 \\ 0 \amp (-1)^k \\ \end{array}\right]\text{.} $$

b) 
    We know that $A^2{\mathbf v} = \lambda A{\mathbf v} = \lambda^2{\mathbf v}$ so that ${\mathbf v}$ is also an eigenvector of $A^2$ with associated eigenvalue $\lambda^2$.

c) 
    Since eigenvectors of $A$ are also eigenvectors of $A^2$, we can use the matrix $P$ to diagonalize $A^2$. The eigenvalues are squared, however, so we have $A^2=PEP^{-1}$ where $E=D^2=\left[\begin{array}{rr}4 \amp 0 \\ 0 \amp 1 \\ \end{array}\right]$.

d) 
    We can also see this by noting that

    $$ \begin{aligned} A^2 & = (PDP^{-1})(PDP^{-1}) = PD(P^{-1}P)DP^{-1} \\ & = PDIDP^{-1} = PD^2P^{-1}\text{.}\\ \end{aligned} $$

e) 
    $A^3=PD^3P^{-1}$, $A^4=PD^4P^{-1}$, and $A^k=PD^kP^{-1}$.

f) 
    We can write $A=PDP^{-1}$ where $D=\left[\begin{array}{rr}0.5 \amp 0 \\ 0 \amp 0.1 \\ \end{array}\right]$. Therefore, $A^k=PD^kP^{-1}$ where $D^k=\left[\begin{array}{rr}0.5^k \amp 0 \\ 0 \amp 0.1^k \\ \end{array}\right]$. As $k$ becomes very large, $0.5^k$ and $0.1^k$ become very close to zero. Hence $D^k$ and $A^k$ become very close to the zero matrix.

:::

If $A$ is diagonalizable, the activity demonstrates that any power of $A$ is as well.

:::proposition {prop:prop-powers-diag} Proposition 4.3.9
If $A=PDP^{-1}$, then $A^k = PD^kP^{-1}$. When $A$ is invertible, we also have $A^{-1} = PD^{-1}P^{-1}$.
:::

:::example {ex:example-4-3-10} Example 4.3.10
Let's revisit [Activity 4.1.3](ref:4.1#activity-eigen-intro) where we had the matrix $A = \begin{bmatrix} 0.8 & 0.6 \\ 0.2 & 0.4 \\ \end{bmatrix}$ and the initial vector ${\mathbf x}_0 = \left[\begin{array}{c}1000 \\ 0 \end{array}\right]$. We were interested in understanding the sequence of vectors ${\mathbf x}_{k+1} = A{\mathbf x}_k$, which means that ${\mathbf x}_k = A^k{\mathbf x}_0$.
We can verify that ${\mathbf v}_1 = \left[\begin{array}{r}3 \\ 1 \end{array}\right]$ and ${\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ are eigenvectors of $A$ having associated eigenvalues $\lambda_1=1$ and $\lambda_2 = 0.2$. This means that $A = PDP^{-1}$ where

$$ P = \begin{bmatrix} 3 & -1 \\ 1 & 1 \\ \end{bmatrix},~~~ D = \begin{bmatrix} 1 & 0 \\ 0 & 0.2 \\ \end{bmatrix}. $$

Therefore, the powers of $A$ have the form $A^k = PD^kP^{-1}$.
Notice that $D^k = \begin{bmatrix} 1^k & 0 \\ 0 & 0.2^k \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 0.2^k \end{bmatrix}$. As $k$ increases, $0.2^k$ becomes closer and closer to zero. This means that for very large powers $k$, we have

$$ D^k \approx \begin{bmatrix} 1 & 0 \\ 0 & 0 \\ \end{bmatrix} $$

and therefore

$$ A^k = PD^kP^{-1} \approx P\begin{bmatrix} 1 & 0 \\ 0 & 0 \\ \end{bmatrix}P^{-1} = \begin{bmatrix} \frac 34 & \frac 34 \\ \frac 14 & \frac 14 \end{bmatrix}. $$

Beginning with the vector ${\mathbf x}_0 = \left[\begin{array}{c}1000 \\ 0 \end{array}\right]$, we find that ${\mathbf x}_k = A^k{\mathbf x}_0\approx \left[\begin{array}{r}750 \\ 250 \end{array}\right]$ when $k$ is very large.
:::

## 4.3.4 Similarity and complex eigenvalues

We have been interested in diagonalizing a matrix $A$ because doing so relates a matrix $A$ to a simpler diagonal matrix $D$. In particular, the effect of multiplying a vector by $A=PDP^{-1}$, viewed in the basis defined by the columns of $P$, is the same as the effect of multiplying by $D$ in the standard basis.

While many matrices are diagonalizable, there are some that are not. For example, if a matrix has complex eigenvalues, it is not possible to find a basis of ${\mathbb R}^n$ consisting of eigenvectors, which means that the matrix is not diagonalizable. In this case, however, we can still relate the matrix to a simpler form that explains the geometric effect this matrix has on vectors.

:::definition {def:definition-4-3-11} Definition 4.3.11
{index-entry:similarity} We say that $A$ is *similar* to $B$ if there is an invertible matrix $P$ such that $A = PBP^{-1}$.
:::

Notice that a matrix is diagonalizable if and only if it is similar to a diagonal matrix. In case a matrix $A$ has complex eigenvalues, we will find a simpler matrix $C$ that is similar to $A$ and note that $A=PCP^{-1}$ has the same effect, when viewed in the basis defined by the columns of $P$, as $C$, when viewed in the standard basis.

To begin, suppose that $A$ is a $2\times2$ matrix having a complex eigenvalue $\lambda = a+bi$. It turns out that $A$ is similar to $C=\begin{bmatrix} a & -b \\ b & a \\ \end{bmatrix}$.

The next activity shows that $C$ has a simple geometric effect on ${\mathbb R}^2$. First, however, we will use polar coordinates to rewrite $C$. As shown in the figure, the point $(a,b)$ defines $r$, the distance from the origin, and $\theta$, the angle formed with the positive horizontal axis. We then have

$$ \begin{aligned} a & {}={} r\cos\theta \\ b & {}={} r\sin\theta\text{.} \\ \end{aligned} $$

Notice that the Pythagorean theorem says that $r=\sqrt{a^2+b^2}$.

> IMAGE {img:eigen-polar} src=../../media/ch04/eigen-polar.svg
> alt: The conversion from standard coordinates to polar coordinates.

:::activity {act:activity-4-3-5} Activity 4.3.5
We begin by rewriting $C$ in terms of $r$ and $\theta$ and noting that

$$ C = \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right] = \left[\begin{array}{rr} r\cos\theta & -r\sin\theta \\ r\sin\theta & r\cos\theta \\ \end{array}\right] = \left[\begin{array}{rr} r & 0 \\ 0 & r \\ \end{array}\right] \left[\begin{array}{rr} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \\ \end{array}\right]. $$

a) 
    Explain why $C$ has the geometric effect of rotating vectors by $\theta$ and scaling them by a factor of $r$.

b) 
    Let's now consider the matrix

    $$ A = \left[\begin{array}{rr} -2 & 2 \\ -5 & 4 \\ \end{array}\right] $$

    whose eigenvalues are $\lambda_1 = 1+i$ and $\lambda_2 = 1-i$. We will choose to focus on one of the eigenvalues $\lambda_1 = a+bi= 1+i.$

    Form the matrix $C$ using these values of $a$ and $b$. Then rewrite the point $(a,b)$ in polar coordinates by identifying the values of $r$ and $\theta$. Explain the geometric effect of multiplying vectors by $C$.

c) 
    Suppose that $P=\left[\begin{array}{rr} 1 & 1 \\ 2 & 1 \\ \end{array}\right]$. Verify that $A = PCP^{-1}$.

    :::sage
    ```sage
    C =
    P =
    P*C*P.inverse()

    ```
    :::

d) 
    Explain why $A^k = PC^kP^{-1}$.

e) 
    We formed the matrix $C$ by choosing the eigenvalue $\lambda_1=1+i$. Suppose we had instead chosen $\lambda_2 = 1-i$. Form the matrix $C'$ and use polar coordinates to describe the geometric effect of $C'$.

f) 
    Using the matrix $P' = \left[\begin{array}{rr} 1 & -1 \\ 2 & -1 \\ \end{array}\right]$, show that $A = P'C'P'^{-1}$.

SOLUTION:

a) 
    The matrix $S=\left[\begin{array}{rr}r \amp 0 \\ 0 \amp r \\ \end{array}\right]$ has the geometric effect of scaling vectors uniformly by a factor of $r$ while the matrix $R=\left[\begin{array}{rr}\cos\theta \amp -\sin\theta \\ \sin\theta \amp \cos\theta \\ \end{array}\right]$ rotates vectors by $\theta$.

b) 
    We have $a=b=1$ so we form the matrix $C=\left[\begin{array}{rr}1 \amp -1 \\ 1 \amp 1 \\ \end{array}\right] = \left[\begin{array}{rr}\sqrt{2} \amp 0 \\ 0 \amp \sqrt{2} \\ \end{array}\right] \left[\begin{array}{rr}\cos(45^\circ) \amp -\sin(45^\circ) \\ \sin(45^\circ) \amp \cos(45^\circ) \\ \end{array}\right]$. This shows that $C$ will scale vectors by a factor of $\sqrt2$ while rotating them by $45^\circ$.

c) 
    Sage will verify this relationship.

d) 
    As we saw earlier, we have $A^2 = (PCP^{-1})(PCP^{-1}) = PC^2P^{-1}$ and hence $A^k = PC^kP^{-1}$.

e) 
    We have $a=1$ and $b=-1$ so we form the matrix $C'=\left[\begin{array}{rr}1 \amp 1 \\ -1 \amp 1 \\ \end{array}\right] = \left[\begin{array}{rr}\sqrt{2} \amp 0 \\ 0 \amp \sqrt{2} \\ \end{array}\right] \left[\begin{array}{rr}\cos(-45^\circ) \amp -\sin(-45^\circ) \\ \sin(-45^\circ) \amp \cos(-45^\circ) \\ \end{array}\right]$. This shows that $C$ will scale vectors by a factor of $\sqrt2$ while rotating them by $-45^\circ$.

:::

If the $2\times2$ matrix $A$ has a complex eigenvalue $\lambda = a + bi$, it turns out that $A$ is always similar to the matrix $C = \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right],$ whose geometric effect on vectors can be described in terms of a rotation and a scaling. There is, in fact, a method for finding the matrix $P$ so that $A=PCP^{-1}$ that we'll see in [Exercise 4.3.8](ref:exercise-complex-eigenvector). For now, we note that $A$ has the same geometric effect as $C$, when viewed in the basis provided by the columns of $P$. We will put this fact to use in the next section to understand certain dynamical systems.

:::proposition {prop:proposition-4-3-12} Proposition 4.3.12
If $A$ is a $2\times2$ matrix with a complex eigenvalue $\lambda = a + bi$, then $A$ is similar to $C = \begin{bmatrix} a & -b \\ b & a \\ \end{bmatrix}$; that is, there is a matrix $P$ such that $A= PCP^{-1}$.
:::

## 4.3.5 Summary

Our goal in this section has been to use the eigenvalues and eigenvectors of a matrix $A$ to relate $A$ to a simpler matrix.

- 
    We said that $A$ is diagonalizable if we can write $A = PDP^{-1}$ where $D$ is a diagonal matrix. The columns of $P$ consist of eigenvectors of $A$ and the diagonal entries of $D$ are the associated eigenvalues.

- 
    An $n\times n$ matrix $A$ is diagonalizable if and only if there is a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$.

- 
    We said that $A$ and $B$ are similar if there is an invertible matrix $P$ such that $A=PBP^{-1}$. In this case, $A^k = PB^kP^{-1}$.

- 
    If $A$ is a $2\times2$ matrix with complex eigenvalue $\lambda = a+bi$, then $A$ is similar to $C = \left[\begin{array}{rr} a & -b \\ b & a \\ \end{array} \right]$. Writing the point $(a,b)$ in polar coordinates $r$ and $\theta$, we see that $C$ rotates vectors through an angle $\theta$ and scales them by a factor of $r=\sqrt{a^2+b^2}$.

## 4.3.6 Exercises

:::exercise {exercise-4-3-001} number=4.3.1 answered=yes src=src/exercises/exercises4-3.xml:4
PROBLEM:
Determine whether the following matrices are diagonalizable. If so, find matrices $D$ and $P$ such that $A=PDP^{-1}$.

a) 
    $A = \left[\begin{array}{rr} -2 & -2 \\ -2 & 1 \\ \end{array}\right]$.

b) 
    $A = \left[\begin{array}{rr} -1 & 1 \\ -1 & -3 \\ \end{array}\right]$.

c) 
    $A = \left[\begin{array}{rr} 3 & -4 \\ 2 & -1 \\ \end{array}\right]$.

d) 
    $A = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 2 & -2 & 0 \\ 0 & 1 & 4 \\ \end{array}\right]$.

e) 
    $A = \left[\begin{array}{rrr} 1 & 2 & 2 \\ 2 & 1 & 2 \\ 2 & 2 & 1 \\ \end{array}\right]$.

ANSWER:

a) 
    $P = \left[\begin{array}{rr}1 \amp 2 \\ -1 \amp 1 \\ \end{array}\right]$ and $D=\left[\begin{array}{rr}2 \amp 0 \\ 0 \amp -3 \\ \end{array}\right]$

b) 
    $A$ is not diagonalizable.

c) 
    $A$ is not diagonalizable.

d) 
    $P = \left[\begin{array}{rrr} 9 & 0 & 0 \\ 6 & 6 & 0 \\ -2 & -1 & 1 \\ \end{array}\right]$ and $D = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & -2 & 0 \\ 0 & 0 & 4 \\ \end{array}\right]$

e) 
    $P = \left[\begin{array}{rrr} 1 & -1 & 0 \\ 1 & 0 & -1 \\ 1 & 1 & 1 \\ \end{array}\right]$ and $D = \left[\begin{array}{rrr} 5 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & -1 \\ \end{array}\right]$

SOLUTION:

a) 
    We find that ${\mathbf v}_1=\left[\begin{array}{r}1 \\ -2 \end{array}\right]$ is an eigenvector with associated eigenvalue $\lambda_1=2$ as is ${\mathbf v}_2=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_2=-3$. Therefore, we have $A=PDP^{-1}$ where

    $$ P = \left[\begin{array}{rr}1 \amp 2 \\ -1 \amp 1 \\ \end{array}\right], D=\left[\begin{array}{rr}2 \amp 0 \\ 0 \amp -3 \\ \end{array}\right]\text{.} $$

b) 
    We see that $\lambda=-2$ is an eigenvalue having multiplicity two. However, $\dim E_{-2} = 1$ so we cannot find a basis for ${\mathbb R}^2$ consisting of eigenvectors of $A$. Therefore, $A$ is not diagonalizable.

c) 
    We see that $A$ has complex eigenvalues $\lambda=1\pm 2i$ so it is not diagonalizable in the form $A=PDP^{-1}$ for a diagonal matrix $D$.

d) 
    The matrix $A$ has three distinct eigenvalues $\lambda_1=1$, $\lambda_2=-2$, and $\lambda_3=4$ with associated eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}9 \\ 6 \\ -2 \end{array}\right]$, ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 6 \\ -1 \end{array}\right]$, and ${\mathbf v}_3=\left[\begin{array}{r}0 \\ 0 \\ 1 \end{array}\right]$. This shows us that $A=PDP^{-1}$ where

    $$ P = \left[\begin{array}{rrr} 9 & 0 & 0 \\ 6 & 6 & 0 \\ -2 & -1 & 1 \\ \end{array}\right], D = \left[\begin{array}{rrr} 1 & 0 & 0 \\ 0 & -2 & 0 \\ 0 & 0 & 4 \\ \end{array}\right]\text{.} $$

e) 
    We have an eigenvalue $\lambda=-1$ having multiplicity two, but its eigenspace has dimension two so $A$ is diagonalizable. In particular, we choose

    $$ P = \left[\begin{array}{rrr} 1 & -1 & 0 \\ 1 & 0 & -1 \\ 1 & 1 & 1 \\ \end{array}\right], D = \left[\begin{array}{rrr} 5 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & -1 \\ \end{array}\right] $$

    and have $A=PDP^{-1}$.

:::

:::exercise {exercise-4-3-002} number=4.3.2 answered=yes src=src/exercises/exercises4-3.xml:167
PROBLEM:
Determine whether the following matrices have complex eigenvalues. If so, find the matrix $C$ such that $A = PCP^{-1}$.

a) 
    $A = \left[\begin{array}{rr} -2 & -2 \\ -2 & 1 \\ \end{array}\right]$.

b) 
    $A = \left[\begin{array}{rr} -1 & 1 \\ -1 & -3 \\ \end{array}\right]$.

c) 
    $A = \left[\begin{array}{rr} 3 & -4 \\ 2 & -1 \\ \end{array}\right]$.

ANSWER:

a) 
    There are two real eigenvalues.

b) 
    There is a single real eigenvalue.

c) 
    $C=\left[\begin{array}{rr}1 \amp -2 \\ 2 \amp 1 \\ \end{array}\right]$ or $C=\left[\begin{array}{rr}1 \amp 2 \\ -2 \amp 1 \\ \end{array}\right]$.

SOLUTION:

a) 
    We have two real eigenvalues $\lambda=2, -3$.

b) 
    We have a single real eigenvalue $\lambda=-2$.

c) 
    We have complex eigenvalues $\lambda=1\pm2i$ so we can choose $C=\left[\begin{array}{rr}1 \amp -2 \\ 2 \amp 1 \\ \end{array}\right]$ or $C=\left[\begin{array}{rr}1 \amp 2 \\ -2 \amp 1 \\ \end{array}\right]$.

:::

:::exercise {exercise-4-3-003} number=4.3.3 answered=yes src=src/exercises/exercises4-3.xml:225
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    If $A$ is invertible, then $A$ is diagonalizable.

b) 
    If $A$ and $B$ are similar and $A$ is invertible, then $B$ is also invertible.

c) 
    If $A$ is a diagonalizable $n\times n$ matrix, then there is a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$.

d) 
    If $A$ is diagonalizable, then $A^{10}$ is also diagonalizable.

e) 
    If $A$ is diagonalizable, then $A$ is invertible.

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
    False

SOLUTION:

a) 
    False. A matrix can be invertible without us being able to form a basis consisting of eigenvectors. An example is $\left[\begin{array}{rr}2 \amp 1 \\ 0 \amp 2 \\ \end{array}\right]$.

b) 
    True. If $A$ and $B$ are similar, then $A=PBP^{-1}$ so that $\det A = \det B$. If $A$ is invertible, we know that $\det A \neq 0$, which also tells us that $\det B\neq 0$ and hence that $B$ is invertible.

c) 
    True. If $A=PDP^{-1}$, then the columns of $P$ are eigenvectors of $A$ that form a basis for ${\mathbb R}^n$.

d) 
    True. If $A=PDP^{-1}$, then $A^{10}=PD^{10}P^{-1}$.

e) 
    False. It is possible that $A$ has eigenvalue $\lambda=0$, which would imply that $A$ is not invertible.

:::

:::exercise {exercise-4-3-004} number=4.3.4 answered=yes src=src/exercises/exercises4-3.xml:285
PROBLEM:
Provide a justification for your response to the following questions.

a) 
    If $A$ is a $3\times3$ matrix having eigenvalues $\lambda = 2, 3, -4$, can you guarantee that $A$ is diagonalizable?

b) 
    If $A$ is a $2\times 2$ matrix with a complex eigenvalue, can you guarantee that $A$ is diagonalizable?

c) 
    If $A$ is similar to the matrix $B = \left[\begin{array}{rrr} -5 & 0 & 0 \\ 0 & -5 & 0 \\ 0 & 0 & 3 \\ \end{array}\right]$, is $A$ diagonalizable?

d) 
    What can you say about a matrix that is similar to the identity matrix?

e) 
    If $A$ is a diagonalizable $2\times2$ matrix with a single eigenvalue $\lambda = 4$, what is $A$?

ANSWER:

a) 
    Yes

b) 
    No

c) 
    Yes

d) 
    Only the identity

e) 
    $A=\left[\begin{array}{rr}4 \amp 0 \\ 0 \amp 4 \\ \end{array}\right]$.

SOLUTION:

a) 
    Yes. If $A$ has $3$ real and distinct eigenvalues, then there is a basis of ${\mathbb R}^3$ consisting of eigenvectors of $A$. Therefore, $A$ is diagonalizable.

b) 
    No. We can write $A=PCP^{-1}$ where $C=\left[\begin{array}{rr}a \amp -b \\ b \amp a \\ \end{array}\right]$, but $A$ is not diagonalizable.

c) 
    Yes. Since $B$ is diagonal and $A=PBP^{-1}$, then $A$ is diagonalizable.

d) 
    Only the identity because $A=PIP^{-1} = PP^{-1} = I$.

e) 
    $A=\left[\begin{array}{rr}4 \amp 0 \\ 0 \amp 4 \\ \end{array}\right]$. If we denote $D=\left[\begin{array}{rr}4 \amp 0 \\ 0 \amp 4 \\ \end{array}\right]=4I$, then $A=PDP^{-1}=P4IP^{-1} = 4I = D$.

:::

:::exercise {exercise-4-3-005} number=4.3.5 answered=yes src=src/exercises/exercises4-3.xml:353
PROBLEM:
Describe geometric effect that the following matrices have on ${\mathbb R}^2$:

a) 
    $A = \left[\begin{array}{rr} 2 & 0 \\ 0 & 2 \\ \end{array}\right]$

b) 
    $A = \left[\begin{array}{rr} 4 & 2 \\ 0 & 4 \\ \end{array}\right]$

c) 
    $A = \left[\begin{array}{rr} 3 & -6 \\ 6 & 3 \\ \end{array}\right]$

d) 
    $A = \left[\begin{array}{rr} 4 & 0 \\ 0 & -2 \\ \end{array}\right]$

e) 
    $A = \left[\begin{array}{rr} 1 & 3 \\ 3 & 1 \\ \end{array}\right]$

ANSWER:

a) 
    Multiplying by $A$ uniformly stretches vectors by a factor of $2$.

b) 
    This is a shear so that vectors are stretched and then pushed horizontally.

c) 
    We write $(a,b) = (3,6) = (r\cos\theta, r\sin\theta)$ where $r=3\sqrt{5}$ and $\theta = \arctan(2)$. Therefore, $A$ will stretch vectors by a factor of $3\sqrt{5}$ and rotate them by $\theta\approx 63.4^\circ$.

d) 
    Vectors are stretched in the horizontal direction by a factor of $4$ and stretched vertically by a factor of $2$ before being reflected in the horizontal axis.

e) 
    This matrix has eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_1=4$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ with $\lambda_2=-2$. Therefore, $A$ stretches vectors by a factor of $4$ in the direction of ${\mathbf v}_1$ and a factor of $2$ in the direction of ${\mathbf v}_1$ before reflecting in the line defined by ${\mathbf v}_1$.

SOLUTION:

a) 
    Multiplying by $A$ uniformly stretches vectors by a factor of $2$.

b) 
    This is a shear so that vectors are stretched and then pushed horizontally.

c) 
    We write $(a,b) = (3,6) = (r\cos\theta, r\sin\theta)$ where $r=3\sqrt{5}$ and $\theta = \arctan(2)$. Therefore, $A$ will stretch vectors by a factor of $3\sqrt{5}$ and rotate them by $\theta\approx 63.4^\circ$.

d) 
    Vectors are stretched in the horizontal direction by a factor of $4$ and stretched vertically by a factor of $2$ before being reflected in the horizontal axis.

e) 
    This matrix has eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with associated eigenvalue $\lambda_1=4$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ with $\lambda_2=-2$. Therefore, $A$ stretches vectors by a factor of $4$ in the direction of ${\mathbf v}_1$ and a factor of $2$ in the direction of ${\mathbf v}_1$ before reflecting in the line defined by ${\mathbf v}_1$.

:::

:::exercise {exercise-4-3-006} number=4.3.6 answered=yes src=src/exercises/exercises4-3.xml:464
PROBLEM:
We say that $A$ is similar to $B$ if there is a matrix $P$ such that $A = PBP^{-1}$.

a) 
    If $A$ is similar to $B$, explain why $B$ is similar to $A$.

b) 
    If $A$ is similar to $B$ and $B$ is similar to $C$, explain why $A$ is similar to $C$.

c) 
    If $A$ is similar to $B$ and $B$ is diagonalizable, explain why $A$ is diagonalizable.

d) 
    If $A$ and $B$ are similar, explain why $A$ and $B$ have the same characteristic polynomial; that is, explain why $\det(A-\lambda I) = \det(B-\lambda I)$.

e) 
    If $A$ and $B$ are similar, explain why $A$ and $B$ have the same eigenvalues.

ANSWER:

a) 
    If $A=PBP^{-1}$, then $B=P^{-1}AP$. If we call $Q=P^{-1}$, then $B=QAQ^{-1}$, which shows that $B$ is similar to $A$.

b) 
    If $A=PBP^{-1}$ and $B=QCQ^{-1}$, then $A=PQCP^{-1}Q^{-1} = (PQ)C(PQ)^{-1}$, which shows that $A$ is similar to $C$.

c) 
    If $B$ is diagonalizable, then it is similar to a diagonal matrix $D$. Since $A$ is similar to $B$ and $B$ is similar to $D$, we know that $A$ is also similar to $D$ so that $A$ is diagonalizable.

d) 
    If $A=PBP^{-1}$, then

    $$ \begin{aligned} \det(A-\lambda I) & = \det(PBP^{-1}-\lambda PP^{-1}) \\ & = \det[P(B-\lambda I)P^{-1}] \\ & = \det(B-\lambda I)\text{.} \\ \end{aligned} $$

e) 
    The eigenvalues of a matrix are the roots of its characteristic polynomial. If $A$ and $B$ are similar, then they have the same characteristic polynomial and hence the same eigenvalues.

SOLUTION:

a) 
    If $A=PBP^{-1}$, then $B=P^{-1}AP$. If we call $Q=P^{-1}$, then $B=QAQ^{-1}$, which shows that $B$ is similar to $A$.

b) 
    If $A=PBP^{-1}$ and $B=QCQ^{-1}$, then $A=PQCP^{-1}Q^{-1} = (PQ)C(PQ)^{-1}$, which shows that $A$ is similar to $C$.

c) 
    If $B$ is diagonalizable, then it is similar to a diagonal matrix $D$. Since $A$ is similar to $B$ and $B$ is similar to $D$, we know that $A$ is also similar to $D$ so that $A$ is diagonalizable.

d) 
    If $A=PBP^{-1}$, then

    $$ \begin{aligned} \det(A-\lambda I) & = \det(PBP^{-1}-\lambda PP^{-1}) \\ & = \det[P(B-\lambda I)P^{-1}] \\ & = \det(B-\lambda I)\text{.} \\ \end{aligned} $$

e) 
    The eigenvalues of a matrix are the roots of its characteristic polynomial. If $A$ and $B$ are similar, then they have the same characteristic polynomial and hence the same eigenvalues.

:::

:::exercise {exercise-4-3-007} number=4.3.7 answered=yes src=src/exercises/exercises4-3.xml:558
PROBLEM:
Suppose that $A = PDP^{-1}$ where

$$ D = \left[\begin{array}{rr} 1 & 0 \\ 0 & 0 \\ \end{array}\right],\qquad P = \left[\begin{array}{rr} 1 & -2 \\ 2 & 1 \\ \end{array}\right] $$

.

a) 
    Explain the geometric effect that $D$ has on vectors in ${\mathbb R}^2$.

b) 
    Explain the geometric effect that $A$ has on vectors in ${\mathbb R}^2$.

c) 
    What can you say about $A^2$ and other powers of $A$?

d) 
    Is $A$ invertible?

ANSWER:

a) 
    The matrix $D$ projects vectors onto the horizontal axis.

b) 
    $A$ projects vectors onto the line defined by the eigenvector $\left[\begin{array}{r}1 \\ 2 \end{array}\right]$.

c) 
    $A^k=A$.

d) 
    No

SOLUTION:

a) 
    The matrix $D$ projects vectors onto the horizontal axis; that is, it produces the shadow of a vector on the horizontal axis from a flashlight shining down the vertical axis.

b) 
    $A$ projects vectors onto the line defined by the eigenvector $\left[\begin{array}{r}1 \\ 2 \end{array}\right]$.

c) 
    Since $A=PDP^{-1}$ and $D^2 = D$, we have $A^2 = PD^2P^{-1} = PDP^{-1} = A$. That is, $A^2 = A$ and $A^k=A$.

d) 
    $A$ is not invertible because $\lambda=0$ is an eigenvalue.

:::

:::exercise {exercise-4-3-008} number=4.3.8 answered=yes src=src/exercises/exercises4-3.xml:623 label=exercise-complex-eigenvector
PROBLEM:
When $A$ is a $2\times2$ matrix with a complex eigenvalue $\lambda = a+bi$, we have said that there is a matrix $P$ such that $A=PCP^{-1}$ where $C=\left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right]$. In this exercise, we will learn how to find the matrix $P$. As an example, we will consider the matrix $A = \left[\begin{array}{rr} 2 & 2 \\ -1 & 4 \\ \end{array}\right]$.

a) 
    Show that the eigenvalues of $A$ are complex.

b) 
    Choose one of the complex eigenvalues $\lambda=a+bi$ and construct the usual matrix $C$.

c) 
    Using the same eigenvalue, we will find an eigenvector ${\mathbf v}$ where the entries of ${\mathbf v}$ are complex numbers. As always, we will describe $\text{Nul}(A-\lambda I)$ by constructing the matrix $A-\lambda I$ and finding its reduced row echelon form. In doing so, we will necessarily need to use complex arithmetic.

d) 
    We have now found a complex eigenvector ${\mathbf v}$. Write ${\mathbf v} = {\mathbf v}_1 - i {\mathbf v}_2$ to identify vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ having real entries.

e) 
    Construct the matrix $P = \left[\begin{array}{rr} {\mathbf v}_1 & {\mathbf v}_2 \end{array}\right]$ and verify that $A=PCP^{-1}$.

ANSWER:

a) 
    $\lambda = 3\pm i$.

b) 
    If $\lambda=3+i$, then $C=\left[\begin{array}{rr}3 \amp -1 \\ 1 \amp 3 \\ \end{array}\right]$.

c) 
    ${\mathbf v} = \left[\begin{array}{r}1-i \\ 1 \end{array}\right]$

d) 
    ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

e) 
    $P = \left[\begin{array}{rr}1 \amp 1 \\ 1 \amp 0 \\ \end{array}\right]$

SOLUTION:

a) 
    The eigenvalues are $\lambda = 3\pm i$.

b) 
    We will choose $\lambda=3+i$ so that $C=\left[\begin{array}{rr}3 \amp -1 \\ 1 \amp 3 \\ \end{array}\right]$.

c) 
    Construct the matrix

    $$ A-(3+i)I = \left[\begin{array}{rr}-1-i \amp 2 \\ -1 \amp 1-i \\ \end{array}\right] \sim \left[\begin{array}{rr}1 \amp -1+i \\ 0 \amp 0 \\ \end{array}\right] $$

    so that a basis vector for the null space is ${\mathbf v} = \left[\begin{array}{r}1-i \\ 1 \end{array}\right]$.

d) 
    We have ${\mathbf v}=\left[\begin{array}{r}1-i \\ 1 \end{array}\right] = \left[\begin{array}{r}1 \\ 1 \end{array}\right]-i\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ giving ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

e) 
    We let $P = \left[\begin{array}{rr}1 \amp 1 \\ 1 \amp 0 \\ \end{array}\right]$ and verify that $A=PCP^{-1}$.

:::

:::exercise {exercise-4-3-009} number=4.3.9 answered=yes src=src/exercises/exercises4-3.xml:713
PROBLEM:
For each of the following matrices, sketch the vector ${\mathbf x} = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and powers $A^k{\mathbf x}$ for $k=1,2,3,4$.

a) 
    $A = \left[\begin{array}{rr} 0 & -1.4 \\ 1.4 & 0 \\ \end{array}\right]$.

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

b) 
    $A = \left[\begin{array}{rr} 0 & -0.8 \\ 0.8 & 0 \\ \end{array}\right]$.

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

c) 
    $A = \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$.

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

d) 
    Consider a matrix of the form $C=\left[\begin{array}{rr} a & -b \\ b & a \\ \end{array}\right]$ with $r=\sqrt{a^2+b^2}$. What happens when $k$ becomes very large when

    1. 
        $r < 1$.

    2. 
        $r = 1$.

    3. 
        $r > 1$.

ANSWER:
In each case, the vectors are rotated by $90^\circ$. Note that the figures below are draw at different scales.

a) 
    The vectors are stretched by a factor of 1.4.

    > IMAGE {img:ex-comp-power-a} src=../../media/ch04/ex-comp-power-a.svg

b) 
    The vectors are stretched by a factor of 0.8.

    > IMAGE {img:ex-comp-power-b} src=../../media/ch04/ex-comp-power-b.svg

c) 
    The length of the vectors is unchanged.

    > IMAGE {img:ex-comp-power-c} src=../../media/ch04/ex-comp-power-c.svg

d) 
    For different values of $r$,

    (i) 
        The vectors are pulled into the origin as their lengths become increasingly small.

    (ii) 
        The length of the vectors is unchanged.

    (iii) 
        The vectors are pushed away from the origin as their lengths become increasingly large.

SOLUTION:
In each case, the vectors are rotated by $90^\circ$. Note that the figures below are draw at different scales.

a) 
    The vectors are stretched by a factor of 1.4.

    > IMAGE {img:ex-comp-power-a} src=../../media/ch04/ex-comp-power-a.svg

b) 
    The vectors are stretched by a factor of 0.8.

    > IMAGE {img:ex-comp-power-b} src=../../media/ch04/ex-comp-power-b.svg

c) 
    The length of the vectors is unchanged.

    > IMAGE {img:ex-comp-power-c} src=../../media/ch04/ex-comp-power-c.svg

d) 
    For different values of $r$,

    1. 
        The vectors are pulled into the origin as their lengths become increasingly small.

    2. 
        The length of the vectors is unchanged.

    3. 
        The vectors are pushed away from the origin as their lengths become increasingly large.

:::

:::exercise {exercise-4-3-010} number=4.3.10 answered=yes src=src/exercises/exercises4-3.xml:910
PROBLEM:
For each of the following matrices and vectors, sketch the vector ${\mathbf x}$ along with $A^k{\mathbf x}$ for $k=1,2,3,4$.

a) 

    $$ \begin{aligned} A & {}={} \left[\begin{array}{rr} 1.4 & 0 \\ 0 & 0.7 \\ \end{array}\right] \\ \\ {\mathbf x} & {}={} \left[\begin{array}{r}1 \\ 2 \end{array}\right]\text{.} \end{aligned} $$

    .

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

b) 

    $$ \begin{aligned} A & {}={} \left[\begin{array}{rr} 0.6 & 0 \\ 0 & 0.9 \\ \end{array}\right] \\ \\ {\mathbf x} & {}={} \left[\begin{array}{r}4 \\ 3 \end{array}\right]\text{.} \end{aligned} $$

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

c) 

    $$ \begin{aligned} A & {}={} \left[\begin{array}{rr} 1.2 & 0 \\ 0 & 1.4 \\ \end{array}\right] \\ \\ {\mathbf x}&{}={}\left[\begin{array}{r}2 \\ 1 \end{array}\right]\text{.} \end{aligned} $$

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

d) 

    $$ \begin{aligned} A & {}={} \left[\begin{array}{rr} 0.95 & 0.25 \\ 0.25 & 0.95 \\ \end{array}\right] \\ \\ {\mathbf x}&{}={}\left[\begin{array}{r}3 \\ 0 \end{array}\right]\text{.} \end{aligned} $$

    Find the eigenvalues and eigenvectors of $A$ to create your sketch.

    > IMAGE {img:empty} src=../../media/ch04/empty.svg
    > alt: A two dimensional coordinate grid and axes

e) 
    If $A$ is a $2\times2$ matrix with eigenvalues $\lambda_1=0.7$ and $\lambda_2=0.5$ and ${\mathbf x}$ is any vector, what happens to $A^k{\mathbf x}$ when $k$ becomes very large?

ANSWER:

a) 
    > IMAGE {img:ex-power-a} src=../../media/ch04/ex-power-a.svg
    > width: 40%

b) 
    > IMAGE {img:ex-power-b} src=../../media/ch04/ex-power-b.svg
    > width: 40%

c) 
    > IMAGE {img:ex-power-c} src=../../media/ch04/ex-power-c.svg
    > width: 40%

d) 
    > IMAGE {img:ex-power-d} src=../../media/ch04/ex-power-d.svg
    > width: 40%

e) 
    Vectors will be pulled into the origin.

SOLUTION:

a) 
    Vectors are expanded horizontally and compressed vertically.

    > IMAGE {img:ex-power-a} src=../../media/ch04/ex-power-a.svg

b) 
    Vectors are compressed both horizontally and vertically.

    > IMAGE {img:ex-power-b} src=../../media/ch04/ex-power-b.svg

c) 
    Vectors are expanded both horizontally and vertically.

    > IMAGE {img:ex-power-c} src=../../media/ch04/ex-power-c.svg

d) 
    There are eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ with $\lambda_1 = 1.2$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ with $\lambda_2=0.7$. Vectors are expanded in the direction of ${\mathbf v}_1$ and compressed in the direction of ${\mathbf v}_2$.

    > IMAGE {img:ex-power-d} src=../../media/ch04/ex-power-d.svg

e) 
    Because both eigenvalues have an absolute value smaller than $1$, vectors will be compressed in the direction of both eigenvectors and hence be pulled into the origin.

:::
