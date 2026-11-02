# 7.1 Symmetric matrices and variance {sec-symmetric-matrices}

In this section, we will revisit the theory of eigenvalues and eigenvectors for the special class of matrices that are *symmetric*, meaning that the matrix equals its transpose. This understanding of symmetric matrices will enable us to form singular value decompositions later in the chapter. We'll also begin studying variance in this section as it provides an important context that motivates some of our later work.

## 7.1.1 Introduction

To begin, remember that if $A$ is a square matrix, we say that ${\mathbf v}$ is an eigenvector of $A$ with associated eigenvalue $\lambda$ if $A{\mathbf v}=\lambda{\mathbf v}$. In other words, for these special vectors, the operation of matrix multiplication simplifies to scalar multiplication.

:::exploration {act:preview-7-1-1} Preview Activity 7.1.1
This preview activity reminds us how a basis of eigenvectors can be used to relate a square matrix to a diagonal one.
> FIGURE {fig:fig-preview-similar} number=7.1.1 src=../../media/ch07/empty-5.svg
> alt: A coordinate grid and set of axes.
> caption: Use these plots to sketch the vectors requested in the preview activity.
> subfigure src=../../media/ch07/empty-5.svg alt: A coordinate grid and set of axes.
> subfigure src=../../media/ch07/empty-5.svg alt: A coordinate grid and set of axes.
PROBLEM:
a) Suppose that $D=\begin{bmatrix} 3 & 0 \\ 0 & -1 \end{bmatrix}$ and that ${\mathbf e}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and ${\mathbf e}_2=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

    1. 
        Sketch the vectors ${\mathbf e}_1$ and $D{\mathbf e}_1$ on the left side of [Figure 7.1.1](ref:fig-preview-similar).

    2. 
        Sketch the vectors ${\mathbf e}_2$ and $D{\mathbf e}_2$ on the left side of [Figure 7.1.1](ref:fig-preview-similar).

    3. 
        Sketch the vectors ${\mathbf e}_1+2{\mathbf e}_2$ and $D({\mathbf e}_1+2{\mathbf e}_2)$ on the left side.

    4. 
        Give a geometric description of the matrix transformation defined by $D$.

b) Now suppose we have vectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ and that $A$ is a $2\times2$ matrix such that

    $$ A{\mathbf v}_1 = 3{\mathbf v}_1, \hspace{24pt} A{\mathbf v}_2 = -{\mathbf v}_2 $$

    . That is, ${\mathbf v}_1$ and ${\mathbf v}_2$ are eigenvectors of $A$ with associated eigenvalues $3$ and $-1$.

    1. 
        Sketch the vectors ${\mathbf v}_1$ and $A{\mathbf v}_1$ on the right side of [Figure 7.1.1](ref:fig-preview-similar).

    2. 
        Sketch the vectors ${\mathbf v}_2$ and $A{\mathbf v}_2$ on the right side of [Figure 7.1.1](ref:fig-preview-similar).

    3. 
        Sketch the vectors ${\mathbf v}_1+2{\mathbf v}_2$ and $A({\mathbf v}_1+2{\mathbf v}_2)$ on the right side.

    4. 
        Give a geometric description of the matrix transformation defined by $A$.

c) In what ways are the matrix transformations defined by $D$ and $A$ related to one another?
SOLUTION:
a) 
    1. 
        > IMAGE {img:diag-D-a} src=../../media/ch07/diag-D-a.svg
        > alt: The vector e one multiplied by D
        > width: 50%

    2. 
        > IMAGE {img:diag-D-b} src=../../media/ch07/diag-D-b.svg
        > alt: The vector e two multiplied by D
        > width: 50%

    3. 
        > IMAGE {img:diag-D-c} src=../../media/ch07/diag-D-c.svg
        > alt: The vector e one plue e two multiplied by D
        > width: 50%

    4. 
        $D$ stretches vectors horizontally by a factor of 3 and reflects them in the horizontal axis.

b) 
    1. 
        > IMAGE {img:eigen-A-a} src=../../media/ch07/eigen-A-a.svg
        > alt: The vector v one multiplied by A
        > width: 50%

    2. 
        > IMAGE {img:eigen-A-b} src=../../media/ch07/eigen-A-b.svg
        > alt: The vector v two multiplied by A
        > width: 50%

    3. 
        > IMAGE {img:eigen-A-c} src=../../media/ch07/eigen-A-c.svg
        > alt: The vector v one plus v two multiplied by A
        > width: 50%

    4. 
        $A$ stretches vectors in the direction of ${\mathbf v}_1$ by a factor of 3 and reflects them in the line defined by ${\mathbf v}_1$.

c) The effect of the two transformations are the same when viewed in the coordinate systems given by the appropriate set of vectors.
:::

The preview activity asks us to compare the matrix transformations defined by two matrices, a diagonal matrix $D$ and a matrix $A$ whose eigenvectors are given to us. The transformation defined by $D$ stretches horizontally by a factor of 3 and reflects in the horizontal axis, as shown in [Figure 7.1.2](ref:fig-eigen-diag-D)

> FIGURE {fig:fig-eigen-diag-D} number=7.1.2 src=../../media/ch07/eigen-diag-D-a.svg
> alt: The unit square in the two dimensional plane
> caption: The matrix transformation defined by $D$.
> subfigure src=../../media/ch07/eigen-diag-D-a.svg alt: The unit square in the two dimensional plane
> subfigure src=../../media/ch07/eigen-diag-D-b.svg alt: Multiplying by A transforms the unit square into a rectangle

By contrast, the transformation defined by $A$ stretches the plane by a factor of 3 in the direction of ${\mathbf v}_1$ and reflects in the line defined by ${\mathbf v}_1$, as seen in [Figure 7.1.3](ref:fig-eigen-diag-general).

> FIGURE {fig:fig-eigen-diag-general} number=7.1.3 src=../../media/ch07/eigen-diag-A-a.svg
> alt: A one by one coordinate grid in the coordinate system defined by the eigenvectors
> caption: The matrix transformation defined by $A$.
> subfigure src=../../media/ch07/eigen-diag-A-a.svg alt: A one by one coordinate grid in the coordinate system defined by the eigenvectors
> subfigure src=../../media/ch07/eigen-diag-A-b.svg alt: The grid and square have been been transformed by multiplying by A

In this way, we see that the matrix transformations defined by these two matrices are equivalent after a $45^\circ$ rotation. This notion of equivalence is what we called *similarity* in [Section 4.3](ref:4.3#sec-eigen-diag). There we considered a square $m\times m$ matrix $A$ that provided enough eigenvectors to form a basis of ${\mathbb R}^m$. For example, suppose we can construct a basis for ${\mathbb R}^m$ using eigenvectors ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m$ having associated eigenvalues $\lambda_1,\lambda_2,\ldots,\lambda_m$. Forming the matrices,

$$ P = \begin{bmatrix} {\mathbf v}_1&{\mathbf v}_2&\ldots&{\mathbf v}_m \end{bmatrix}, \hspace{24pt} D = \begin{bmatrix} \lambda_1 & 0 & \ldots & 0 \\ 0 & \lambda_2 & \ldots & 0 \\ \vdots&\vdots&\ddots&\vdots\\ 0 & 0 & \ldots & \lambda_m \end{bmatrix}, $$

enables us to write $A = PDP^{-1}$. This is what it means for $A$ to be diagonalizable.

For the example in the preview activity, we are led to form

$$ P = \begin{bmatrix} 1 & -1 \\ 1 & 1 \end{bmatrix}, \hspace{24pt} D = \begin{bmatrix} 3 & 0 \\ 0 & - 1 \end{bmatrix} $$

which tells us that $A=PDP^{-1} = \begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$.

Notice that the matrix $A$ has eigenvectors ${\mathbf v}_1$ and ${\mathbf v}_2$ that not only form a basis for ${\mathbb R}^2$ but, in fact, form an orthogonal basis for ${\mathbb R}^2$. Given the prominent role played by orthogonal bases in the last chapter, we would like to understand what conditions on a matrix enable us to form an orthogonal basis of eigenvectors.

## 7.1.2 Symmetric matrices and orthogonal diagonalization

Let's begin by looking at some examples in the next activity.

:::activity {act:activity-7-1-2} Activity 7.1.2
Remember that the Sage command `A.right_eigenmatrix()` attempts to find a basis for ${\mathbb R}^m$ consisting of eigenvectors of $A$. In particular, the assignment `D, P = A.right_eigenmatrix()` provides a diagonal matrix $D$ constructed from the eigenvalues of $A$ with the columns of $P$ containing the associated eigenvectors.
:::sage
```sage

```
:::

a) 
    For each of the following matrices, determine whether there is a basis for ${\mathbb R}^2$ consisting of eigenvectors of that matrix. When there is such a basis, form the matrices $P$ and $D$ and verify that the matrix equals $PDP^{-1}$.

    1. 
        $\begin{bmatrix} 3 & -4 \\ 4 & 3 \end{bmatrix}$.

    2. 
        $\begin{bmatrix} 1 & 1 \\ -1 & 3 \end{bmatrix}$.

    3. 
        $\begin{bmatrix} 1 & 0\\ -1 & 2 \end{bmatrix}$.

    4. 
        $\begin{bmatrix} 9 & 2 \\ 2 & 6 \end{bmatrix}$.

b) 
    For which of these examples is it possible to form an orthogonal basis for ${\mathbb R}^2$ consisting of eigenvectors?

c) 
    For any such matrix $A$, find an orthonormal basis of eigenvectors and explain why $A=QDQ^{-1}$ where $Q$ is an orthogonal matrix.

d) 
    Finally, explain why $A=QDQ^T$ in this case.

e) 
    When $A=QDQ^T$, what is the relationship between $A$ and $A^T$?

ANSWER:

a) 

    1. 
        There is no such basis.

    2. 
        There is no such basis.

    3. 
        This matrix is diagonalizable with

        $$ D = \begin{bmatrix} 2 & 0 \\ 0 & 1 \\ \end{bmatrix}, \hspace{24pt} P = \begin{bmatrix} 0 & 1 \\ 1 & 1 \\ \end{bmatrix}\text{.} $$

    4. 
        This matrix is also diagonalizable with

        $$ D = \begin{bmatrix} 10 & 0 \\ 0 & 5 \\ \end{bmatrix}, \hspace{24pt} P = \begin{bmatrix} 2 & 1 \\ 1 & -2 \\ \end{bmatrix}\text{.} $$

b) 
    Only the last matrix.

c) 
    $Q = \begin{bmatrix} 2/\sqrt{5} & 1/\sqrt{5} \\ 1/\sqrt{5} & -2/\sqrt{5} \\ \end{bmatrix}$

d) 
    $Q^{-1} = Q^T$

e) 
    $A=A^T$

SOLUTION:

a) 

    1. 
        The eigenvalues of this matrix are complex so there is no such basis.

    2. 
        There is one eigenvalue $\lambda=2$ with multiplicity two. The associated eigenspace $E_2$ is one-dimensional so there is not a basis of ${\mathbb R}^2$ consisting of eigenvectors.

    3. 
        This matrix is diagonalizable with

        $$ D = \begin{bmatrix} 2 & 0 \\ 0 & 1 \\ \end{bmatrix}, \hspace{24pt} P = \begin{bmatrix} 0 & 1 \\ 1 & 1 \\ \end{bmatrix}\text{.} $$

    4. 
        This matrix is also diagonalizable with

        $$ D = \begin{bmatrix} 10 & 0 \\ 0 & 5 \\ \end{bmatrix}, \hspace{24pt} P = \begin{bmatrix} 2 & 1 \\ 1 & -2 \\ \end{bmatrix}\text{.} $$

b) 
    Only the last matrix $A=\begin{bmatrix} 9 & 2 \\ 2 & 6 \end{bmatrix}$.

c) 
    We form an orthonormal basis by scaling the eigenvectors to have length 1. This gives $Q = \begin{bmatrix} 2/\sqrt{5} & 1/\sqrt{5} \\ 1/\sqrt{5} & -2/\sqrt{5} \\ \end{bmatrix}$, which is orthogonal since the columns form an orthonormal basis of ${\mathbb R}^2$.

d) 
    Orthogonal matrices are invertible and have $Q^{-1} = Q^T$

e) 
    If $A=QDQ^T$, we have $A^T=(QDQ^T)^T = (Q^T)^TD^TQ^T = QDQ^T = A$. This means that the matrix is symmetric.

:::

The examples in this activity illustrate a range of possibilities. First, a matrix may have complex eigenvalues, in which case it will not be diagonalizable. Second, even if all the eigenvalues are real, there may not be a basis of eigenvalues if the dimension of one of the eigenspaces is less than the algebraic multiplicity of the associated eigenvalue.

We are interested in matrices for which there is an orthogonal basis of eigenvectors. When this happens, we can create an orthonormal basis of eigenvectors by scaling each eigenvector in the basis so that its length is 1. Putting these orthonormal vectors into a matrix $Q$ produces an orthogonal matrix, which means that $Q^T=Q^{-1}$. We then have

$$ A = QDQ^{-1} = QDQ^T. $$

In this case, we say that $A$ is *orthogonally diagonalizable*.

:::definition {def:def-orthog-diag} Definition 7.1.4
If there is an orthonormal basis of ${\mathbb R}^n$ consisting of eigenvectors of the matrix $A$, we say that $A$ is *orthogonally diagonalizable*. In particular, we can write $A=QDQ^T$ where $Q$ is an orthogonal matrix.
:::

When $A$ is orthogonally diagonalizable, notice that

$$ A^T=(QDQ^T)^T = (Q^T)^TD^TQ^T = QDQ^T = A. $$

That is, when $A$ is orthogonally diagonalizable, $A=A^T$ and we say that $A$ is *symmetric*.

:::definition {def:definition-7-1-5} Definition 7.1.5
A *symmetric* matrix $A$ is one for which $A=A^T$.
:::

:::example {ex:example-7-1-6} Example 7.1.6
Consider the matrix $A = \begin{bmatrix} -2 & 36 \\ 36 & -23 \end{bmatrix}$, which has eigenvectors ${\mathbf v}_1 = \left[\begin{array}{r}4 \\ 3 \end{array}\right]$, with associated eigenvalue $\lambda_1=25$, and ${\mathbf v}_2=\left[\begin{array}{r}3 \\ -4 \end{array}\right]$, with associated eigenvalue $\lambda_2=-50$. Notice that ${\mathbf v}_1$ and ${\mathbf v}_2$ are orthogonal so we can form an orthonormal basis of eigenvectors:

$$ {\mathbf u}_1 = \left[\begin{array}{r}4/5 \\ 3/5 \end{array}\right], \hspace{24pt} {\mathbf u}_1 = \left[\begin{array}{r}3/5 \\ -4/5 \end{array}\right]\text{.} $$

In this way, we construct the matrices

$$ Q = \begin{bmatrix} 4/5 & 3/5 \\ 3/5 & -4/5 \\ \end{bmatrix}, \hspace{24pt} D = \begin{bmatrix} 25 & 0 \\ 0 & -50 \end{bmatrix} $$

and note that $A = QDQ^T$.
Notice also that, as expected, $A$ is symmetric; that is, $A=A^T$.
:::

:::example {ex:example-7-1-7} Example 7.1.7
If $A = \begin{bmatrix} 1 & 2 \\ 2 & 1 \\ \end{bmatrix}$, then there is an orthogonal basis of eigenvectors ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ with eigenvalues $\lambda_1=3$ and $\lambda_2=-1$. Using these eigenvectors, we form the orthogonal matrix $Q$ consisting of eigenvectors and the diagonal matrix $D$, where

$$ Q = \begin{bmatrix} 1/\sqrt{2} & -1/\sqrt{2} \\ 1/\sqrt{2} & 1/\sqrt{2} \end{bmatrix},\hspace{24pt} D = \begin{bmatrix} 3 & 0 \\ 0 & - 1 \end{bmatrix}. $$

Then we have $A = QDQ^T$.
Notice that the matrix transformation represented by $Q$ is a $45^\circ$ rotation while that represented by $Q^T=Q^{-1}$ is a $-45^\circ$ rotation. Therefore, if we multiply a vector ${\mathbf x}$ by $A$, we can decompose the multiplication as

$$ A{\mathbf x} = Q(D(Q^T{\mathbf x})). $$

That is, we first rotate ${\mathbf x}$ by $-45^\circ$, then apply the diagonal matrix $D$, which stretches and reflects, and finally rotate by $45^\circ$. We may visualize this factorization as in [Figure 7.1.8](ref:fig-diag-factors).
> FIGURE {fig:fig-diag-factors} number=7.1.8 src=../../media/ch07/eigen-diag-a.svg
> alt: The unit square and coordinate grid and axes in the eigenvector coordinate system
> caption: The transformation defined by $A=QDQ^T$ can be interpreted as a sequence of geometric transformations: $Q^T$ rotates by $-45^\circ$, $D$ stretches and reflects, and $Q$ rotates by $45^\circ$.
> subfigure src=../../media/ch07/eigen-diag-a.svg alt: The unit square and coordinate grid and axes in the eigenvector coordinate system
> subfigure src=../../media/ch07/eigen-diag-b.svg alt: The unit square and coordinate grid and axes in the standard coordinate system
> subfigure src=../../media/ch07/eigen-diag-c.svg alt: Multiplying by D stretches the unit square horizontal and reflects in the horizontal axis
> subfigure src=../../media/ch07/eigen-diag-d.svg alt: The stretched rectangle is rotated clockwise by 45 degrees
In fact, a similar picture holds any time the matrix $A$ is orthogonally diagonalizable.
:::

We have seen that a matrix that is orthogonally diagonalizable must be symmetric. In fact, it turns out that any symmetric matrix is orthogonally diagonalizable. We record this fact in the next theorem.

:::theorem {thm:theorem-7-1-9} Theorem 7.1.9 (The Spectral Theorem)
The matrix $A$ is orthogonally diagonalizable if and only if $A$ is symmetric.
:::

:::activity {act:activity-orthog-diag} Activity 7.1.3
Each of the following matrices is symmetric so the Spectral Theorem tells us that each is orthogonally diagonalizable. The point of this activity is to find an orthogonal diagonalization for each matrix.
To begin, find a basis for each eigenspace. Use this basis to find an orthogonal basis for each eigenspace and put these bases together to find an orthogonal basis for ${\mathbb R}^m$ consisting of eigenvectors. Use this basis to write an orthogonal diagonalization of the matrix.
:::sage
```sage

```
:::

a) 
    $\begin{bmatrix} 0 & 2 \\ 2 & 3 \end{bmatrix}$.

b) 
    $\begin{bmatrix} 4 & -2 & 14 \\ -2 & 19 & -16 \\ 14 & -16 & 13 \end{bmatrix}$.

c) 
    $\begin{bmatrix} 5 & 4 & 2 \\ 4 & 5 & 2 \\ 2 & 2 & 2 \end{bmatrix}$.

d) 
    Consider the matrix $A = B^TB$ where $B = \begin{bmatrix} 0 & 1 & 2 \\ 2 & 0 & 1 \end{bmatrix}$. Explain how we know that $A$ is symmetric and then find an orthogonal diagonalization of $A$.

ANSWER:

a) 

    $$ D = \begin{bmatrix} 4 & 0 \\ 0 & -1 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ 2/\sqrt{5} & -1/\sqrt{5} \\ \end{bmatrix}\text{.} $$

b) 

    $$ D = \begin{bmatrix} 36 & 0 & 0 \\ 0 & 9 & 0 \\ 0 & 0 & -9 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 1/3 & 2/3 & 2/3 \\ -2/3 & 2/3 & -1/3 \\ 2/3 & 1/3 & -2/3 \\ \end{bmatrix}\text{.} $$

c) 

    $$ D = \begin{bmatrix} 10 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 2/3 & 1/\sqrt{5} & -4/\sqrt{45} \\ 2/3 & 0 & 5/\sqrt{45} \\ 1/3 & -2/\sqrt{5} & -2/\sqrt{45} \\ \end{bmatrix}\text{.} $$

d) 

    $$ D = \begin{bmatrix} 7 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 2/\sqrt{14} & 2/\sqrt{6} & 1/\sqrt{21} \\ 1/\sqrt{14} & -1/\sqrt{6} & 4/\sqrt{21} \\ 3/\sqrt{14} & -1/\sqrt{6} & -2/\sqrt{21} \\ \end{bmatrix}\text{.} $$

SOLUTION:

a) 
    We have eigenvectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and ${\mathbf v}_2 = \left[\begin{array}{r}2 \\ -1 \end{array}\right]$ with associated eigenvalues $\lambda_1 = 4$ and $\lambda_2=-1$. We form an orthonormal basis of eigenvectors, ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$ and ${\mathbf u}_2=\left[\begin{array}{r}2/\sqrt{5} \\ -1/\sqrt{5} \end{array}\right]$. This gives

    $$ D = \begin{bmatrix} 4 & 0 \\ 0 & -1 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ 2/\sqrt{5} & -1/\sqrt{5} \\ \end{bmatrix}\text{.} $$

b) 
    We find

    $$ D = \begin{bmatrix} 36 & 0 & 0 \\ 0 & 9 & 0 \\ 0 & 0 & -9 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 1/3 & 2/3 & 2/3 \\ -2/3 & 2/3 & -1/3 \\ 2/3 & 1/3 & -2/3 \\ \end{bmatrix}\text{.} $$

c) 
    We have eigenvalues $\lambda_1=10$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \\ 1 \end{array}\right]$ and $\lambda_2 = 1$ with associated eigenvectors ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 0 \\ -2 \end{array}\right]$ and ${\mathbf v}_3=\left[\begin{array}{r}0 \\ 1 \\ -2 \end{array}\right]$. Notice that ${\mathbf v}_1$ is orthogonal to both ${\mathbf v}_2$ and ${\mathbf v}_3$, but ${\mathbf v}_2$ and ${\mathbf v}_3$ are not orthogonal to one another. We can, however, apply Gram-Schmidt to create an orthogonal basis of the eigenspace $E_1$. We can then form an orthonormal basis so that

    $$ D = \begin{bmatrix} 10 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 2/3 & 1/\sqrt{5} & -4/\sqrt{45} \\ 2/3 & 0 & 5/\sqrt{45} \\ 1/3 & -2/\sqrt{5} & -2/\sqrt{45} \\ \end{bmatrix}\text{.} $$

d) 
    We have $A^T = (B^TB)^T = B^T(B^T)^T=B^TB = A$ so $A$ must be symmetric. Then we find the orthogonal diagonalization

    $$ D = \begin{bmatrix} 7 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix}, \hspace{24pt} Q = \begin{bmatrix} 2/\sqrt{14} & 2/\sqrt{6} & 1/\sqrt{21} \\ 1/\sqrt{14} & -1/\sqrt{6} & 4/\sqrt{21} \\ 3/\sqrt{14} & -1/\sqrt{6} & -2/\sqrt{21} \\ \end{bmatrix}\text{.} $$

:::

### 

As the examples in [Activity 7.1.3](ref:activity-orthog-diag) illustrate, the Spectral Theorem implies a number of things. Namely, if $A$ is a symmetric $m\times m$ matrix, then

- 
    the eigenvalues of $A$ are real.

- 
    there is a basis of ${\mathbb R}^m$ consisting of eigenvectors.

- 
    two eigenvectors that are associated to different eigenvalues are orthogonal.

We won't justify the first two facts here since that would take us rather far afield. However, it will be helpful to explain the third fact. To begin, notice the following:

$$ {\mathbf v}\cdot(A{\mathbf w}) = {\mathbf v}^TA{\mathbf w} = (A^T{\mathbf v})^T{\mathbf w} = (A^T{\mathbf v})\cdot {\mathbf w}. $$

This is a useful fact that we'll employ quite a bit in the future so let's summarize it in the following proposition.

:::proposition {prop:prop-symmetric-dot} Proposition 7.1.10
For any matrix $A$, we have

$$ {\mathbf v}\cdot(A{\mathbf w}) = (A^T{\mathbf v})\cdot{\mathbf w}. $$

In particular, if $A$ is symmetric, then

$$ {\mathbf v}\cdot(A{\mathbf w}) = (A{\mathbf v})\cdot{\mathbf w}. $$

:::

:::example {ex:example-7-1-11} Example 7.1.11
Suppose a symmetric matrix $A$ has eigenvectors ${\mathbf v}_1$, with associated eigenvalue $\lambda_1=3$, and ${\mathbf v}_2$, with associated eigenvalue $\lambda_2 = 10$. Notice that

$$ \begin{aligned} (A{\mathbf v}_1)\cdot{\mathbf v}_2 & = 3{\mathbf v}_1\cdot{\mathbf v}_2 \\ {\mathbf v}_1\cdot(A{\mathbf v}_2) & = 10{\mathbf v}_1\cdot{\mathbf v}_2. \end{aligned} $$

Since $(A{\mathbf v}_1)\cdot{\mathbf v}_2 = {\mathbf v}_1\cdot(A{\mathbf v}_2)$ by [Proposition 7.1.10](ref:prop-symmetric-dot), we have

$$ 3{\mathbf v}_1\cdot{\mathbf v}_2 = 10 {\mathbf v}_1\cdot{\mathbf v}_2, $$

which can only happen if ${\mathbf v}_1\cdot{\mathbf v}_2 = 0$. Therefore, ${\mathbf v}_1$ and ${\mathbf v}_2$ are orthogonal.
More generally, the same argument shows that two eigenvectors of a symmetric matrix associated to distinct eigenvalues are orthogonal.
:::

## 7.1.3 Variance

Many of the ideas we'll encounter in this chapter, such as orthogonal diagonalizations, can be applied to the study of data. In fact, it can be useful to understand these applications because they provide an important context in which mathematical ideas have a more concrete meaning and their motivation appears more clearly. For that reason, we will now introduce the statistical concept of variance as a way to gain insight into the significance of orthogonal diagonalizations.

Given a set of data points, their variance measures how spread out the points are. The next activity looks at some examples.

:::activity {act:activity-7-1-4} Activity 7.1.4
We'll begin with a set of three data points

$$ {\mathbf d}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right], \hspace{24pt} {\mathbf d}_2=\left[\begin{array}{r}2 \\ 1 \end{array}\right], \hspace{24pt} {\mathbf d}_3=\left[\begin{array}{r}3 \\ 4 \end{array}\right]. $$

a) 
    Find the centroid, or mean, $\overline{{\mathbf d}} = \frac1N\sum_j {\mathbf d}_j$. Then plot the data points and their centroid in [Figure 7.1.12](ref:fig-variance-data).

    > FIGURE {fig:fig-variance-data} number=7.1.12 src=../../media/ch07/empty-4.svg
    > alt: A standard coordinate grid and set of axes.
    > width: 50%
    > caption: Plot the data points and their centroid here.

b) 
    Notice that the centroid lies in the center of the data so the spread of the data will be measured by how far away the points are from the centroid. To simplify our calculations, find the demeaned data points

    $$ \widetilde{\mathbf d}_j = {\mathbf d}_j - \overline{{\mathbf d}} $$

    and plot them in [Figure 7.1.13](ref:fig-variance-demeaned).

    > FIGURE {fig:fig-variance-demeaned} number=7.1.13 src=../../media/ch07/empty-4.svg
    > alt: A standard coordinate grid and set of axes.
    > width: 50%
    > caption: Plot the demeaned data points $\widetilde{\mathbf d}_j$ here.

c) 
    Now that the data has been demeaned, we will define the total variance as the average of the squares of the distances from the origin; that is, the total variance is

    $$ V = \frac 1N\sum_j~|\widetilde{\mathbf d}_j|^2. $$

    Find the total variance $V$ for our set of three points.

d) 
    Now plot the projections of the demeaned data onto the $x$ and $y$ axes using [Figure 7.1.14](ref:fig-variance-projection) and find the variances $V_x$ and $V_y$ of the projected points.

    > FIGURE {fig:fig-variance-projection} number=7.1.14 src=../../media/ch07/x-axis-4.svg
    > alt: A horizontal number line.
    > caption: Plot the projections of the demeaned data onto the $x$ and $y$ axes.
    > subfigure src=../../media/ch07/x-axis-4.svg alt: A horizontal number line.
    > subfigure src=../../media/ch07/y-axis-4.svg alt: A vertical number line

e) 
    Which of the variances, $V_x$ and $V_y$, is larger and how does the plot of the projected points explain your response?

f) 
    What do you notice about the relationship between $V$, $V_x$, and $V_y$? How does the Pythagorean theorem explain this relationship?

g) 
    Plot the projections of the demeaned data points onto the lines defined by vectors ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ using [Figure 7.1.15](ref:fig-variance-projection-2) and find the variances $V_{{\mathbf v}_1}$ and $V_{{\mathbf v}_2}$ of these projected points.

    > FIGURE {fig:fig-variance-projection-2} number=7.1.15 src=../../media/ch07/empty-4-diag.svg
    > alt: A coordinate grid and set of axes along with two orthogonal lines at 45 degrees to the axes.
    > width: 50%
    > caption: Plot the projections of the deameaned data onto the lines defined by ${\mathbf v}_1$ and ${\mathbf v}_2$.

h) 
    What is the relationship between the total variance $V$ and $V_{{\mathbf v}_1}$ and $V_{{\mathbf v}_2}$? How does the Pythagorean theorem explain your response?

ANSWER:

a) 
    $\overline{d} = \left[\begin{array}{r}2 \\ 2 \end{array}\right]$.

b) 

    $$ \widetilde{\mathbf d}_1=\left[\begin{array}{r}-1 \\ -1 \end{array}\right],\hspace{24pt} \widetilde{\mathbf d}_2=\left[\begin{array}{r}0 \\ -1 \end{array}\right],\hspace{24pt} \widetilde{\mathbf d}_3=\left[\begin{array}{r}1 \\ 2 \end{array}\right]\text{.} $$

c) 
    $V=8/3$.

d) 
    $V_x = 2/3$ and $V_y=2$

e) 
    $V=V_x+V_y$

f) 
    $V_{{\mathbf v}_1} = 7/3$

    $V_{{\mathbf v}_2} = 1/3$

g) 
    $V = V_{{\mathbf v}_1} + V_{{\mathbf v}_2}$

SOLUTION:

a) 
    The centroid is $\overline{d} = \left[\begin{array}{r}2 \\ 2 \end{array}\right]$.

b) 
    The demeaned data points are

    $$ \widetilde{\mathbf d}_1=\left[\begin{array}{r}-1 \\ -1 \end{array}\right],\hspace{24pt} \widetilde{\mathbf d}_2=\left[\begin{array}{r}0 \\ -1 \end{array}\right],\hspace{24pt} \widetilde{\mathbf d}_3=\left[\begin{array}{r}1 \\ 2 \end{array}\right]\text{.} $$

c) 
    The total variance is $V=8/3$.

d) 
    We find $V_x = 2/3$ and $V_y=2$. Notice that $V_y$ is larger because the points are more spread out in the vertical direction.

e) 
    We have $V=V_x+V_y$ due to the Pythagorean theorem.

f) 
    The points projected onto the line defined by ${\mathbf v}_1$ are $\left[\begin{array}{r}-1 \\ -1 \end{array}\right]$, $\left[\begin{array}{r}-1/2 \\ -1/2 \end{array}\right]$, and $\left[\begin{array}{r}3/2 \\ 3/2 \end{array}\right]$. This gives the variance $V_{{\mathbf v}_1} = 7/3$.

    The points projected onto the line defined by ${\mathbf v}_2$ are $\left[\begin{array}{r}0 \\ 0 \end{array}\right]$, $\left[\begin{array}{r}1/2 \\ -1/2 \end{array}\right]$, and $\left[\begin{array}{r}-1/2 \\ 1/2 \end{array}\right]$. This gives the variance $V_{{\mathbf v}_2} = 1/3$.

g) 
    Once again, $V = V_{{\mathbf v}_1} + V_{{\mathbf v}_2}$ because of the Pythagorean theorem.

:::

Notice that variance enjoys an additivity property. Consider, for instance, the situation where our data points are two-dimensional and suppose that the demeaned points are $\widetilde{\mathbf d}_j=\left[\begin{array}{r}\widetilde{x}_j \\ \widetilde{y}_j \end{array}\right]$. We have

$$ |\widetilde{\mathbf d}_j|^2 = \widetilde{x}_j^2 + \widetilde{y}_j^2. $$

If we take the average over all data points, we find that the total variance $V$ is the sum of the variances in the $x$ and $y$ directions:

$$ \begin{aligned} \frac1N \sum_j~ |\widetilde{\mathbf d}_j|^2 & = \frac1N \sum_j~ \widetilde{x}_j^2 + \frac1N \sum_j~ \widetilde{y}_j^2 \\ V & = V_x + V_y. \end{aligned} $$

More generally, suppose that we have an orthonormal basis ${\mathbf u}_1$ and ${\mathbf u}_2$. If we project the demeaned points onto the line defined by ${\mathbf u}_1$, we obtain the points $(\widetilde{\mathbf d}_j\cdot{\mathbf u}_1){\mathbf u}_1$ so that

$$ V_{{\mathbf u}_1} = \frac1N\sum_j ~|(\widetilde{\mathbf d}_j\cdot{\mathbf u}_1)~{\mathbf u}_1|^2 = \frac1N\sum_j~(\widetilde{\mathbf d}_j\cdot{\mathbf u}_1)^2. $$

For each of our demeaned data points, the Projection Formula tells us that

$$ \widetilde{\mathbf d}_j = (\widetilde{\mathbf d}_j\cdot{\mathbf u}_1)~{\mathbf u}_1 + (\widetilde{\mathbf d}_j\cdot{\mathbf u}_2)~{\mathbf u}_2. $$

We then have

$$ |\widetilde{\mathbf d}_j|^2 = \widetilde{\mathbf d}_j\cdot\widetilde{\mathbf d}_j = (\widetilde{\mathbf d}_j\cdot{\mathbf u}_1)^2 + (\widetilde{\mathbf d}_j\cdot{\mathbf u}_2)^2 $$

since ${\mathbf u}_1\cdot{\mathbf u}_2 = 0$. When we average over all the data points, we find that the total variance $V$ is the sum of the variances in the ${\mathbf u}_1$ and ${\mathbf u}_2$ directions. This leads to the following proposition, in which this observation is expressed more generally.

:::proposition {prop:prop-variance-additivity} Proposition 7.1.16 (Additivity of Variance)
If $W$ is a subspace with orthonormal basis ${\mathbf u}_1$,${\mathbf u}_2$,$\ldots$, ${\mathbf u}_n$, then the variance of the points projected onto $W$ is the sum of the variances in the ${\mathbf u}_j$ directions:

$$ V_W = V_{{\mathbf u}_1} + V_{{\mathbf u}_2} + \ldots + V_{{\mathbf u}_n}. $$

:::

The next activity demonstrates a more efficient way to find the variance $V_{{\mathbf u}}$ in a particular direction and connects our discussion of variance with symmetric matrices.

:::activity {act:activity-7-1-5} Activity 7.1.5
Let's return to the dataset from the previous activity in which we have demeaned data points:

$$ \widetilde{\mathbf d}_1=\left[\begin{array}{r}-1 \\ -1 \end{array}\right],\hspace{24pt} \widetilde{\mathbf d}_2=\left[\begin{array}{r}0 \\ -1 \end{array}\right],\hspace{24pt} \widetilde{\mathbf d}_3=\left[\begin{array}{r}1 \\ 2 \end{array}\right]. $$

Our goal is to compute the variance $V_{{\mathbf u}}$ in the direction defined by a unit vector ${\mathbf u}$.
To begin, form the demeaned data matrix

$$ A = \begin{bmatrix} \widetilde{\mathbf d}_1 & \widetilde{\mathbf d}_2 & \widetilde{\mathbf d}_3 \end{bmatrix} $$

and suppose that ${\mathbf u}$ is a unit vector.

a) 
    Write the vector $A^T{\mathbf u}$ in terms of the dot products $\widetilde{\mathbf d}_j\cdot{\mathbf u}$.

b) 
    Explain why $V_{{\mathbf u}} = \frac13|A^T{\mathbf u}|^2$.

c) 
    Apply [Proposition 7.1.10](ref:prop-symmetric-dot) to explain why

    $$ V_{{\mathbf u}} = \frac13|A^T{\mathbf u}|^2 = \frac13 (A^T{\mathbf u})\cdot(A^T{\mathbf u}) = {\mathbf u}^T\left(\frac13 AA^T\right){\mathbf u} = {\mathbf u}\cdot\left(\frac13 AA^T\right){\mathbf u} $$

d) 
    In general, the matrix $C=\frac1N~AA^T$ is called the *covariance* matrix of the dataset, and it is useful because the variance $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u})$, as we have just seen. Find the matrix $C$ for our dataset with three points.

    :::sage
    ```sage

    ```
    :::

e) 
    Use the covariance matrix to find the variance $V_{{\mathbf u}_1}$ when ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$.

f) 
    Use the covariance matrix to find the variance $V_{{\mathbf u}_2}$ when ${\mathbf u}_2=\left[\begin{array}{r}-2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$. Since ${\mathbf u}_1$ and ${\mathbf u}_2$ are orthogonal, verify that the sum of $V_{{\mathbf u}_1}$ and $V_{{\mathbf u}_2}$ gives the total variance.

g) 
    Explain why the covariance matrix $C$ is a symmetric matrix.

ANSWER:

a) 
    $A^T{\mathbf u}=\left[\begin{array}{r}\widetilde{\mathbf d}_1\cdot{\mathbf u} \\ \widetilde{\mathbf d}_2\cdot{\mathbf u} \\ \widetilde{\mathbf d}_3\cdot{\mathbf u} \end{array}\right]$

b) 

    $$ V_{{\mathbf u}} = \frac13\left((\widetilde{\mathbf d}_1\cdot{\mathbf u})^2 + (\widetilde{\mathbf d}_2\cdot{\mathbf u})^2 + (\widetilde{\mathbf d}_3\cdot{\mathbf u})^2\right) = \frac13|A^T{\mathbf u}|^2\text{.} $$

c) 

    $$ \frac13(A^T{\mathbf u})\cdot(A^T{\mathbf u}) = \frac13{\mathbf u}\cdot(A^T)^TA^T{\mathbf u} = {\mathbf u}\cdot\left(\frac13AA^T\right){\mathbf u} $$

d) $C=\begin{bmatrix} 2/3 & 1 \\ 1 & 2 \end{bmatrix}$
e) 
    $V_{{\mathbf u}_1} = 38/15$

f) 
    $V_{{\mathbf u}_2} = 2/15$.

g) 
    $C^T = \left(\frac13 AA^T\right)^T = \frac13(A^T)^TA^T = \frac13 AA^T = C$

SOLUTION:

a) 
    $A^T{\mathbf u}=\left[\begin{array}{r}\widetilde{\mathbf d}_1\cdot{\mathbf u} \\ \widetilde{\mathbf d}_2\cdot{\mathbf u} \\ \widetilde{\mathbf d}_3\cdot{\mathbf u} \end{array}\right]$

b) 
    Projecting $\widetilde{\mathbf d}_j$ onto ${\mathbf u}$ gives $(\widetilde{\mathbf d}_j\cdot{\mathbf u}){\mathbf u}$, whose length squared is $(\widetilde{\mathbf d}_j\cdot{\mathbf u})^2$. Then

    $$ V_{{\mathbf u}} = \frac13\left((\widetilde{\mathbf d}_1\cdot{\mathbf u})^2 + (\widetilde{\mathbf d}_2\cdot{\mathbf u})^2 + (\widetilde{\mathbf d}_3\cdot{\mathbf u})^2\right) = \frac13|A^T{\mathbf u}|^2\text{.} $$

c) 

    $$ \frac13(A^T{\mathbf u})\cdot(A^T{\mathbf u}) = \frac13{\mathbf u}\cdot(A^T)^TA^T{\mathbf u} = {\mathbf u}\cdot\left(\frac13AA^T\right){\mathbf u} $$

d) $C=\begin{bmatrix} 2/3 & 1 \\ 1 & 2 \end{bmatrix}$
e) 
    $V_{{\mathbf u}_1} = 38/15$

f) 
    $V_{{\mathbf u}_2} = 2/15$. Then $V_{{\mathbf u}_1}+V_{{\mathbf u}_2} = 8/3$, which is the total variance.

g) 
    $C^T = \left(\frac13 AA^T\right)^T = \frac13(A^T)^TA^T = \frac13 AA^T = C$

:::

This activity introduced the covariance matrix of a dataset, which is defined to be $C=\frac1N~AA^T$ where $A$ is the matrix of demeaned data points. Notice that

$$ C^T = \frac1N~(AA^T)^T = \frac1N~AA^T = C, $$

which tells us that $C$ is symmetric. In particular, we know that it is orthogonally diagonalizable, an observation that will play an important role in the future.

This activity also demonstrates the significance of the covariance matrix, which is recorded in the following proposition.

:::proposition {prop:prop-covariance} Proposition 7.1.17
If $C$ is the covariance matrix associated to a demeaned dataset and ${\mathbf u}$ is a unit vector, then the variance of the demeaned points projected onto the line defined by ${\mathbf u}$ is

$$ V_{{\mathbf u}} = {\mathbf u}\cdot C{\mathbf u}. $$

:::

Our goal in the future will be to find directions ${\mathbf u}$ where the variance is as large as possible and directions where it is as small as possible. The next activity demonstrates why this is useful.

:::activity {act:activity-7-1-6} Activity 7.1.6

a) 
    Evaluating the following Sage cell loads a dataset consisting of 100 demeaned data points and provides a plot of them. It also provides the demeaned data matrix $A$.

    :::sage
    ```sage
    import pandas as pd
    df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/variance-data.csv', header=None)
    data = [vector(row) for row in df.values]
    A = matrix(data).T
    list_plot(data, size=20, color='blue', aspect_ratio=1)

    ```
    :::

    What is the shape of the covariance matrix $C$? Find $C$ and verify your response.

    :::sage
    ```sage

    ```
    :::

b) 
    By visually inspecting the data, determine which is larger, $V_x$ or $V_y$. Then compute both of these quantities to verify your response.

c) 
    What is the total variance $V$?

d) 
    In approximately what direction is the variance greatest? Choose a reasonable vector ${\mathbf u}$ that points in approximately that direction and find $V_{{\mathbf u}}$.

e) 
    In approximately what direction is the variance smallest? Choose a reasonable vector ${\mathbf w}$ that points in approximately that direction and find $V_{{\mathbf w}}$.

f) 
    How are the directions ${\mathbf u}$ and ${\mathbf w}$ in the last two parts of this problem related to one another? Why does this relationship hold?

ANSWER:

a) 
    $C=\begin{bmatrix} 1.38 & 0.70 \\ 0.70 & 0.37 \end{bmatrix}$

b) 
    $V_x = 1.38$ and $V_y=0.37$

c) 
    $V=1.75$

d) 
    If ${\mathbf u}_1=\left[\begin{array}{r}2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$, then $V_{{\mathbf u}_1} = 1.74$.

e) 
    If ${\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$, then $V_{{\mathbf u}_2} = 0.01$.

f) 
    They are orthogonal to one another.

SOLUTION:

a) 
    $C$ will be the $2\times2$ matrix $C=\begin{bmatrix} 1.38 & 0.70 \\ 0.70 & 0.37 \end{bmatrix}$

b) 
    $V_x = 1.38$ and $V_y=0.37$, which agrees with the fact that the data is more spread out in the horizontal than vertical direction.

c) 
    $V=V_x+V_y=1.75$

d) 
    It looks like the direction $\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ defined by the unit vector ${\mathbf u}_1=\left[\begin{array}{r}2/\sqrt{5} \\ 1/\sqrt{5} \end{array}\right]$. We find that $V_{{\mathbf u}_1} = 1.74$, which is almost all of the total variance.

e) 
    It looks like the direction $\left[\begin{array}{r}-1 \\ 2 \end{array}\right]$ defined by the unit vector ${\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{5} \\ 2/\sqrt{5} \end{array}\right]$. We find that $V_{{\mathbf u}_2} = 0.01$.

f) 
    They are orthogonal to one another. Since the total variance $V=V_{{\mathbf u}_1}+V_{{\mathbf u}_2}$ when ${\mathbf u}_1$ and ${\mathbf u}_2$ are orthogonal, $V_{{\mathbf u}_1}$ will be as large as possible when $V_{{\mathbf u}_2}$ is as small as possible.

:::

This activity illustrates how variance can identify a line along which the data are concentrated. When the data primarily lie along a line defined by a vector ${\mathbf u}_1$, then the variance in that direction will be large while the variance in an orthogonal direction ${\mathbf u}_2$ will be small.

Remember that variance is additive, according to [Proposition 7.1.16](ref:prop-variance-additivity), so that if ${\mathbf u}_1$ and ${\mathbf u}_2$ are orthogonal unit vectors, then the total variance is

$$ V = V_{{\mathbf u}_1} + V_{{\mathbf u}_2}. $$

Therefore, if we choose ${\mathbf u}_1$ to be the direction where $V_{{\mathbf u}_1}$ is a maximum, then $V_{{\mathbf u}_2}$ will be a minimum.

In the next section, we will use an orthogonal diagonalization of the covariance matrix $C$ to find the directions having the greatest and smallest variances. In this way, we will be able to determine when data are concentrated along a line or subspace.

## 7.1.4 Summary

This section explored both symmetric matrices and variance. In particular, we saw that

- 
    A matrix $A$ is orthogonally diagonalizable if there is an orthonormal basis of eigenvectors. In particular, we can write $A=QDQ^T$, where $D$ is a diagonal matrix of eigenvalues and $Q$ is an orthogonal matrix of eigenvectors.

- 
    The Spectral Theorem tells us that a matrix $A$ is orthogonally diagonalizable if and only if it is symmetric; that is, $A=A^T$.

- 
    The variance of a dataset can be computed using the covariance matrix $C=\frac1N~AA^T$, where $A$ is the matrix of demeaned data points. In particular, the variance of the demeaned data points projected onto the line defined by the unit vector ${\mathbf u}$ is $V_{{\mathbf u}} = {\mathbf u}\cdot C{\mathbf u}$.

- 
    Variance is additive so that if $W$ is a subspace with orthonormal basis ${\mathbf u}_1, {\mathbf u}_2,\ldots,{\mathbf u}_n$, then

    $$ V_W = V_{{\mathbf u}_1} + V_{{\mathbf u}_2} + \ldots + V_{{\mathbf u}_n}. $$

## 7.1.5 Exercises

:::exercise {exercise-7-1-001} number=7.1.1 answered=yes src=src/exercises/exercises7-1.xml:5
PROBLEM:
For each of the following matrices, find the eigenvalues and a basis for each eigenspace. Determine whether the matrix is diagonalizable and, if so, find a diagonalization. Determine whether the matrix is orthogonally diagonalizable and, if so, find an orthogonal diagonalization.
:::sage
```sage

```
:::

a) 
    $\begin{bmatrix} 5 & 1 \\ -1 & 3 \\ \end{bmatrix}$

b) 
    $\begin{bmatrix} 0 & 1 \\ 1 & 0 \\ \end{bmatrix}$

c) 
    $\begin{bmatrix} 1 & 0 & 0 \\ 2 & -2 & 0 \\ 0 & 1 & 4 \\ \end{bmatrix}$

d) 
    $\begin{bmatrix} 2 & 5 & -4\\ 5 & -7 & 5 \\ -4 & 5 & 2 \\ \end{bmatrix}$

ANSWER:

a) 
    Not diagonalizable

b) 

    $$ D = \begin{bmatrix} 1 & 0 \\ 0 & -1 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix}\text{.} $$

c) 
    Diagonalizable, but not orthogonally diagonalizable.

    $$ D = \begin{bmatrix} 4 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 2 \\ \end{bmatrix},\hspace{24pt} P = \begin{bmatrix} 0 & 9 & 0 \\ 0 & 6 & 6 \\ 1 & -2 & -1 \end{bmatrix}\text{.} $$

d) 

    $$ D = \begin{bmatrix} 6 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & -12 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ 0 & 1/\sqrt{3} & -2/\sqrt{6} \\ -1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ \end{bmatrix}\text{.} $$

SOLUTION:

a) 
    This matrix is not diagonalizable because there is not a basis of ${\mathbb R}^2$ consisting of eigenvectors.

b) 
    This matrix is symmetric so it is orthogonally diagonalizable:

    $$ D = \begin{bmatrix} 1 & 0 \\ 0 & -1 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix}\text{.} $$

c) 
    This matrix is diagonalizable but not orthogonally diagonalizable.

    $$ D = \begin{bmatrix} 4 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 2 \\ \end{bmatrix},\hspace{24pt} P = \begin{bmatrix} 0 & 9 & 0 \\ 0 & 6 & 6 \\ 1 & -2 & -1 \end{bmatrix}\text{.} $$

d) 
    This matrix is symmetric so it's orthogonally diagonalizable.

    $$ D = \begin{bmatrix} 6 & 0 & 0 \\ 0 & 3 & 0 \\ 0 & 0 & -12 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ 0 & 1/\sqrt{3} & -2/\sqrt{6} \\ -1/\sqrt{2} & 1/\sqrt{3} & 1/\sqrt{6} \\ \end{bmatrix}\text{.} $$

:::

:::exercise {exercise-7-1-002} number=7.1.2 answered=yes src=src/exercises/exercises7-1.xml:192
PROBLEM:
Consider the matrix $A = \begin{bmatrix} 1 & 2 & 2 \\ 2 & 1 & 2 \\ 2 & 2 & 1 \\ \end{bmatrix}$ whose eigenvalues are $\lambda_1=5$, $\lambda_2=-1$, and $\lambda_3 = -1$.
:::sage
```sage

```
:::

a) 
    Explain why $A$ is orthogonally diagonalizable.

b) 
    Find an orthonormal basis for the eigenspace $E_5$.

c) 
    Find a basis for the eigenspace $E_{-1}$.

d) 
    Now find an orthonormal basis for $E_{-1}$.

e) 
    Find matrices $D$ and $Q$ such that $A=QDQ^T$.

ANSWER:

a) 
    Because of the Spectral Theorem

b) 
    ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$

c) 
    ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \\ -1 \end{array}\right]$

d) 
    ${\mathbf u}_2 = \left[\begin{array}{r}1/\sqrt{2} \\ 0 \\ -1/\sqrt{2} \end{array}\right]$ and ${\mathbf u}_3 = \left[\begin{array}{r}-1/\sqrt{6} \\ 2/\sqrt{6} \\ -1/\sqrt{6} \end{array}\right]$

e) 

    $$ D = \begin{bmatrix} 5 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & -1 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & -1/\sqrt{6} \\ 1/\sqrt{3} & 0 & 2/\sqrt{6} \\ 1/\sqrt{3} & -1/\sqrt{2} & -1/\sqrt{6} \\ \end{bmatrix}\text{.} $$

SOLUTION:

a) 
    Since the matrix is symmetric, the Spectral Theorem says it is orthogonally diagonalizable.

b) 
    ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$

c) 
    ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}0 \\ 1 \\ -1 \end{array}\right]$

d) 
    ${\mathbf u}_2 = \left[\begin{array}{r}1/\sqrt{2} \\ 0 \\ -1/\sqrt{2} \end{array}\right]$ and ${\mathbf u}_3 = \left[\begin{array}{r}-1/\sqrt{6} \\ 2/\sqrt{6} \\ -1/\sqrt{6} \end{array}\right]$

e) 

    $$ D = \begin{bmatrix} 5 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & -1 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & -1/\sqrt{6} \\ 1/\sqrt{3} & 0 & 2/\sqrt{6} \\ 1/\sqrt{3} & -1/\sqrt{2} & -1/\sqrt{6} \\ \end{bmatrix}\text{.} $$

:::

:::exercise {exercise-7-1-003} number=7.1.3 answered=yes src=src/exercises/exercises7-1.xml:341
PROBLEM:
Find an orthogonal diagonalization, if one exists, for the following matrices.
:::sage
```sage

```
:::

a) 
    $\begin{bmatrix} 11 & 4 & 12 \\ 4 & -3 & -16 \\ 12 & -16 & 1 \end{bmatrix}$.

b) 
    $\begin{bmatrix} 1 & 0 & 2 \\ 0 & 1 & 2 \\ -2 & -2 & 1 \\ \end{bmatrix}$.

c) 
    $\begin{bmatrix} 9 & 3 & 3 & 3\\ 3 & 9 & 3 & 3\\ 3 & 3 & 9 & 3\\ 3 & 3 & 3 & 9\\ \end{bmatrix}$.

ANSWER:

a) 

    $$ D = \begin{bmatrix} 21 & 0 & 0 \\ 0 & 9 & 0 \\ 0 & 0 & -21 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 2/3 & 2/3 & 1/3 \\ -1/3 & 2/3 & -2/3 \\ 2/3 & -1/3 & -2/3 \\ \end{bmatrix}\text{.} $$

b) 
    Not orthogonally diagonalizable

c) 

    $$ D = \begin{bmatrix} 18 & 0 & 0 & 0 \\ 0 & 6 & 0 & 0 \\ 0 & 0 & 6 & 0\\ 0 & 0 & 0 & 6\\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/2 & 1/\sqrt{2} & -1/\sqrt{6} & -1/\sqrt{12} \\ 1/2 & 0 & 2/\sqrt{6} & -1/\sqrt{12} \\ 1/2 & 0 & 0 & 3/\sqrt{12} \\ 1/2 & -1/\sqrt{2} & -1/\sqrt{6} & -1/\sqrt{12} \\ \end{bmatrix}\text{.} $$

SOLUTION:

a) 

    $$ D = \begin{bmatrix} 21 & 0 & 0 \\ 0 & 9 & 0 \\ 0 & 0 & -21 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 2/3 & 2/3 & 1/3 \\ -1/3 & 2/3 & -2/3 \\ 2/3 & -1/3 & -2/3 \\ \end{bmatrix}\text{.} $$

b) 
    This matrix is not symmetric so it is not orthogonally diagonalizable.

c) 

    $$ D = \begin{bmatrix} 18 & 0 & 0 & 0 \\ 0 & 6 & 0 & 0 \\ 0 & 0 & 6 & 0\\ 0 & 0 & 0 & 6\\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/2 & 1/\sqrt{2} & -1/\sqrt{6} & -1/\sqrt{12} \\ 1/2 & 0 & 2/\sqrt{6} & -1/\sqrt{12} \\ 1/2 & 0 & 0 & 3/\sqrt{12} \\ 1/2 & -1/\sqrt{2} & -1/\sqrt{6} & -1/\sqrt{12} \\ \end{bmatrix}\text{.} $$

:::

:::exercise {exercise-7-1-004} number=7.1.4 answered=yes src=src/exercises/exercises7-1.xml:488
PROBLEM:
Suppose that $A$ is an $m\times n$ matrix and that $B=A^TA$.

a) 
    Explain why $B$ is orthogonally diagonalizable.

b) 
    Explain why ${\mathbf v}\cdot(B{\mathbf v}) = \left|A{\mathbf v}\right|^2$.

c) 
    Suppose that ${\mathbf u}$ is an eigenvector of $B$ with associated eigenvalue $\lambda$ and that ${\mathbf u}$ has unit length. Explain why $\lambda = \left|A{\mathbf u}\right|^2$.

d) 
    Explain why the eigenvalues of $B$ are nonnegative.

e) 
    If $C$ is the covariance matrix associated to a demeaned dataset, explain why the eigenvalues of $C$ are nonnegative.

ANSWER:

a) 
    $B$ is symmetric

b) 
    ${\mathbf v}\cdot(A^TA{\mathbf v}) = (A{\mathbf v})\cdot(A{\mathbf v})$

c) 
    $|A{\mathbf u}|^2 = \lambda$

d) 
    $\lambda=|A{\mathbf u}|^2 \geq 0$.

e) 
    ${\mathbf u}\cdot(C{\mathbf u}) = \frac1N(A^T{\mathbf u})\cdot(A^T{\mathbf u}) = \frac1N |A^T{\mathbf u}|^2$.

SOLUTION:

a) 
    Because $B^T = (A^TA)^T = A^TA = B$, the matrix $B$ is symmetric and hence orthogonally diagonalizable.

b) 
    ${\mathbf v}\cdot(B{\mathbf v}) = {\mathbf v}\cdot(A^TA{\mathbf v}) = (A{\mathbf v})\cdot(A{\mathbf v}) = |A{\mathbf v}|^2$.

c) 
    $|A{\mathbf u}|^2 = {\mathbf u}\cdot(B{\mathbf u}) = \lambda{\mathbf u}\cdot{\mathbf u} = \lambda$

d) 
    Because $\lambda=|A{\mathbf u}|^2 \geq 0$.

e) 
    In the same way, $C=\frac1N AA^T$ so that ${\mathbf u}\cdot(C{\mathbf u}) = \frac1N(A^T{\mathbf u})\cdot(A^T{\mathbf u}) = \frac1N |A^T{\mathbf u}|^2$. Therefore, $\lambda = \frac1N|A^T{\mathbf u}|^2$.

:::

:::exercise {exercise-7-1-005} number=7.1.5 answered=yes src=src/exercises/exercises7-1.xml:603
PROBLEM:
Suppose that you have the data points

$$ (2,0), (2,3), (4,1), (3,2), (4,4). $$

a) 
    Find the demeaned data points.

b) 
    Find the total variance $V$ of the dataset.

c) 
    Find the variance in the direction ${\mathbf e}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and the variance in the direction ${\mathbf e}_2=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.

d) 
    Project the demeaned data points onto the line defined by ${\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$ and find the variance of these projected points.

e) 
    Project the demeaned data points onto the line defined by ${\mathbf v}_2=\left[\begin{array}{r}1 \\ -2 \end{array}\right]$ and find the variance of these projected points.

f) 
    How and why are the results of from the last two parts related to the total variance?

ANSWER:

a) 

    $$ \left[\begin{array}{r}-1 \\ -2 \end{array}\right],\left[\begin{array}{r}-1 \\ 1 \end{array}\right],\left[\begin{array}{r}1 \\ -1 \end{array}\right],\left[\begin{array}{r}0 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

b) 
    $V = 14/5$

c) 
    $V_{{\mathbf e}_1} = 4/5$ and $V_{{\mathbf e}_2} = 2$

d) 
    $34/25$

e) 
    $36/24$

f) 
    The variances add to the toal variance.

SOLUTION:

a) 

    $$ \left[\begin{array}{r}-1 \\ -2 \end{array}\right],\left[\begin{array}{r}-1 \\ 1 \end{array}\right],\left[\begin{array}{r}1 \\ -1 \end{array}\right],\left[\begin{array}{r}0 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 2 \end{array}\right] $$

b) 
    $V = 14/5$

c) 
    $V_{{\mathbf e}_1} = 4/5$ and $V_{{\mathbf e}_2} = 2$

d) 
    Let ${\mathbf u}_1$ be the unit vector parallel to ${\mathbf v}_1$ so that $V_{{\mathbf u}_1} = 34/25$.

e) 
    Let ${\mathbf u}_2$ be the unit vector parallel to ${\mathbf v}_2$ so that $V_{{\mathbf u}_2} = 36/25$.

f) 
    The vectors are parallel so the variances add to the toal variance.

:::

:::exercise {exercise-7-1-006} number=7.1.6 answered=yes src=src/exercises/exercises7-1.xml:739
PROBLEM:
Suppose you have six 2-dimensional data points arranged in the matrix

$$ \begin{bmatrix} 2 & 0 & 4 & 4 & 5 & 3 \\ 1 & 0 & 3 & 5 & 4 & 5 \end{bmatrix}. $$

a) 
    Find the matrix $A$ of demeaned data points and plot the points in [Figure 7.1.18](ref:ex-demean-plot).

    > FIGURE {fig:ex-demean-plot} number=7.1.18 src=../../media/ch07/empty-4.svg
    > alt: A standard coordinate grid and set of axes.
    > width: 50%
    > caption: A plot for the demeaned data points.

b) 
    Construct the covariance matrix $C$ and explain why you know that it is orthogonally diagonalizable.

c) 
    Find an orthogonal diagonalization of $C$.

d) 
    Sketch the lines corresponding to the two eigenvectors on the plot above.

e) 
    Find the variances in the directions of the eigenvectors.

ANSWER:

a) 
    $A = \begin{bmatrix} -1 & -3 & 1 & 1 & 2 & 0 \\ -2 & -3 & 0 & 2 & 1 & 2 \end{bmatrix}$

b) 
    $C=\begin{bmatrix} 8/3 & 5/2 \\ 5/2 & 11/3 \end{bmatrix}$

c) 

    $$ D = \begin{bmatrix} 5.72 & 0 \\ 0 & 0.62 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 0.63 & 0.77 \\ 0.77 & -0.63 \\ \end{bmatrix} $$

d) 
    ${\mathbf u}_1=\left[\begin{array}{r}0.63 \\ 0.77 \end{array}\right]$ and ${\mathbf u}_2=\left[\begin{array}{r}0.77 \\ -0.63 \end{array}\right]$.

e) 
    $V_{{\mathbf u}_1}=5.72$ and $V_{{\mathbf u}_2} = 0.62$

SOLUTION:

a) 
    $A = \begin{bmatrix} -1 & -3 & 1 & 1 & 2 & 0 \\ -2 & -3 & 0 & 2 & 1 & 2 \end{bmatrix}$

b) 
    $C=\begin{bmatrix} 8/3 & 5/2 \\ 5/2 & 11/3 \end{bmatrix}$ is orthonally diagonalizable because it is symmetric.

c) 

    $$ D = \begin{bmatrix} 5.72 & 0 \\ 0 & 0.62 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 0.63 & 0.77 \\ 0.77 & -0.63 \\ \end{bmatrix} $$

d) 
    Sketch the lines defined by $\left[\begin{array}{r}0.63 \\ 0.77 \end{array}\right]$ and $\left[\begin{array}{r}0.77 \\ -0.63 \end{array}\right]$.

e) 
    The variances are the eigenvalues $\lambda_1=5.72$ and $\lambda_2 = 0.62$

:::

:::exercise {exercise-7-1-007} number=7.1.7 answered=yes src=src/exercises/exercises7-1.xml:906
PROBLEM:
Suppose that $C$ is the covariance matrix of a demeaned dataset.

a) 
    Suppose that ${\mathbf u}$ is an eigenvector of $C$ with associated eigenvalue $\lambda$ and that ${\mathbf u}$ has unit length. Explain why $V_{{\mathbf u}} = \lambda$.

b) 
    Suppose that the covariance matrix of a demeaned dataset can be written as $C=QDQ^T$ where

    $$ Q = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix}, \hspace{24pt} D = \begin{bmatrix} 10 & 0 \\ 0 & 0 \\ \end{bmatrix}. $$

    What is $V_{{\mathbf u}_2}$? What does this tell you about the demeaned data?

c) 
    Explain why the total variance of a dataset equals the sum of the eigenvalues of the covariance matrix.

ANSWER:

a) 
    $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = \lambda{\mathbf u}\cdot{\mathbf u} = \lambda$.

b) 
    $V_{{\mathbf u}_2} = 0$

c) 
    $V_{{\mathbf u}_1}+V_{{\mathbf u}_2} = \lambda_1+\lambda_2$

SOLUTION:

a) 
    The variance is $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = \lambda{\mathbf u}\cdot{\mathbf u} = \lambda$.

b) 
    $V_{{\mathbf u}_2} = 0$

c) 
    $V=V_{{\mathbf u}_1}+V_{{\mathbf u}_2} = \lambda_1+\lambda_2$

:::

:::exercise {exercise-7-1-008} number=7.1.8 answered=yes src=src/exercises/exercises7-1.xml:994
PROBLEM:
Determine whether the following statements are true or false and explain your thinking.

a) 
    If $A$ is an invertible, orthogonally diagonalizable matrix, then so is $A^{-1}$.

b) 
    If $\lambda=2+i$ is an eigenvalue of $A$, then $A$ cannot be orthogonally diagonalizable.

c) 
    If there is a basis for ${\mathbb R}^m$ consisting of eigenvectors of $A$, then $A$ is orthogonally diagonalizable.

d) 
    If ${\mathbf u}$ and ${\mathbf v}$ are eigenvectors of a symmetric matrix associated to eigenvalues -2 and 3, then ${\mathbf u}\cdot{\mathbf v}=0$.

e) 
    If $A$ is a square matrix, then ${\mathbf u}\cdot(A{\mathbf v}) = (A{\mathbf u})\cdot{\mathbf v}$.

ANSWER:

a) 
    True.

b) 
    True.

c) 
    False.

d) 
    True.

e) 
    False.

SOLUTION:

a) 
    True. If $A=QDQ^T$ is invertible, then the eigenvalues are nonzero, which means that $D$ is invertible. Therefore, $A^{-1} = (Q^T)^{-1}D^{-1}Q^{-1} = QD^{-1}Q^T$, which says that $A^{-1}$ is orthogonally diagonalizable.

b) 
    True. In this case, there cannot be a basis for ${\mathbb R}^m$ consisting of eigenvalues of $A$ so $A$ is not diagonalizable.

c) 
    False. This condition implies that $A$ is diagonalizable, but it may not be orthogonally diagonalizable.

d) 
    True. The eigenvectors of a symmetric matrix associated to different eigenvalues are orthogonal.

e) 
    False. This is only true if $A$ is symmetric.

:::

:::exercise {exercise-7-1-009} number=7.1.9 answered=yes src=src/exercises/exercises7-1.xml:1111
PROBLEM:
Suppose that $A$ is a noninvertible, symmetric $3\times3$ matrix having eigenvectors

$$ {\mathbf v}_1 = \left[\begin{array}{r}2 \\ -1 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 4 \\ 1 \end{array}\right] $$

and associated eigenvalues $\lambda_1 = 20$ and $\lambda_2 = -4$. Find matrices $Q$ and $D$ such that $A = QDQ^T$.
ANSWER:

$$ D = \begin{bmatrix} 20 & 0 & 0 \\ 0 & -4 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 2/3 & 1/\sqrt{18} & -1/\sqrt{2} \\ -1/3 & 4/\sqrt{18} & 0 \\ 2/3 & 1/\sqrt{18} & 1/\sqrt{2} \\ \end{bmatrix} $$

SOLUTION:
Since $A$ is not invertible, the third eigenvalue must be zero: $\lambda_3=0$. Also, an eigenvector associated to $\lambda_3$ must be orthogonal to both ${\mathbf v}_1$ and ${\mathbf v}_2$. We can find such a vector by finding $\text{Nul}(B^T)$ where $B=\begin{bmatrix}{\mathbf v}_1&{\mathbf v}_2\end{bmatrix}$. This leads to

$$ D = \begin{bmatrix} 20 & 0 & 0 \\ 0 & -4 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 2/3 & 1/\sqrt{18} & -1/\sqrt{2} \\ -1/3 & 4/\sqrt{18} & 0 \\ 2/3 & 1/\sqrt{18} & 1/\sqrt{2} \\ \end{bmatrix} $$

:::

:::exercise {exercise-7-1-010} number=7.1.10 answered=yes src=src/exercises/exercises7-1.xml:1170
PROBLEM:
Suppose that $W$ is a plane in ${\mathbb R}^3$ and that $P$ is the $3\times3$ matrix that projects vectors orthogonally onto $W$.

a) 
    Explain why $P$ is orthogonally diagonalizable.

b) 
    What are the eigenvalues of $P$?

c) 
    Explain the relationship between the eigenvectors of $P$ and the plane $W$.

ANSWER:

a) 
    $P$ is symmetric

b) 
    0 or 1

c) 
    The eigenspaces $E_1=W$ and $E_0=W^{\perp}$

SOLUTION:

a) 
    If $Q$ is a $3\times2$ matrix whose columns are an orthonormal basis for $W$, then $P=QQ^T$. This means that $P^T=(Q^T)^TQ^T = QQ^T = P$ so $P$ is symmetric and hence orthogonally diagonalizable.

b) 
    If ${\mathbf v}$ is in $W$, then $P{\mathbf v}={\mathbf v}$ and if ${\mathbf v}$ is in $W^\perp$, then $P{\mathbf v}=0$. This means that the eigenvalues of $P$ are either 0 or 1.

c) 
    The eigenspaces $E_1=W$ and $E_0=W^{\perp}$

:::
