# 7.4 Singular Value Decompositions {sec-svd-intro}

The Spectral Theorem has motivated the past few sections. In particular, we applied the fact that symmetric matrices can be orthogonally diagonalized to simplify quadratic forms, which enabled us to use principal component analysis to reduce the dimension of a dataset.
But what can we do with matrices that are not symmetric or even square? For instance, the following matrices are not diagonalizable, much less orthogonally so:

$$ \begin{bmatrix} 2 & 1 \\ 0 & 2 \end{bmatrix}, \hspace{24pt} \begin{bmatrix} 1 & 1 & 0 \\ -1 & 0 & 1 \end{bmatrix}. $$

In this section, we will develop a description of matrices called the *singular value decomposition* that is, in many ways, analogous to an orthogonal diagonalization. For example, we have seen that any symmetric matrix can be written in the form $QDQ^T$ where $Q$ is an orthogonal matrix and $D$ is diagonal. A singular value decomposition will have the form $U\Sigma V^T$ where $U$ and $V$ are orthogonal and $\Sigma$ is diagonal. Most notably, we will see that *every* matrix has a singular value decomposition whether it's symmetric or not.

## 7.4.1 Introduction

:::exploration {act:preview-7-4-1} Preview Activity 7.4.1
Let's review orthogonal diagonalizations and quadratic forms as our understanding of singular value decompositions will rely on them.
PROBLEM:
a) Suppose that $A$ is any matrix. Explain why the matrix $G = A^TA$ is symmetric.
b) Suppose that $A = \begin{bmatrix} 1 & 2 \\ -2 & -1 \\ \end{bmatrix}$. Find the matrix $G=A^TA$ and write out the quadratic form $q_G\left(\left[\begin{array}{r}x_1 \\ x_2 \end{array}\right]\right)$ as a function of $x_1$ and $x_2$.
c) What is the maximum value of $q_G({\mathbf x})$ over all unit vectors and in which direction does it occur?
    :::sage
    ```sage

    ```
    :::
d) What is the minimum value of $q_G({\mathbf x})$ over all unit vectors and in which direction does it occur?
e) What is the geometric relationship between the directions in which the maximum and minimum values occur?
SOLUTION:
a) $G^T=(A^TA)^T = A^T(A^T)^T = A^TA=G$.
b) $G=\begin{bmatrix} 5 & 4 \\ 4 & 5 \\ \end{bmatrix}$ leads to the quadratic form $q_G = 5x_1^2 + 8x_1x_2 + 5x_2^2$.
c) The maximum value of $q_G$ equals the largest eigenvalue of $G$, which is $\lambda_1=9$. This maximum value occurs in the direction of the associated eigenvector ${\mathbf u}_1 = \left[\begin{array}{r}\frac{1}{\sqrt{2}} \\ \frac{1}{\sqrt{2}} \end{array}\right]$.
d) The minimum value of $q_G$ equals the smallest eigenvalue of $G$, which is $\lambda_2=1$. This minimum value occurs in the direction of the associated eigenvector ${\mathbf u}_2 = \left[\begin{array}{r}\frac{1}{\sqrt{2}} \\ -\frac{1}{\sqrt{2}} \end{array}\right]$.
e) These two directions are orthogonal to each other.
:::

## 7.4.2 Finding singular value decompositions

We will begin by explaining what a singular value decomposition is and how we can find one for a given matrix $A$.

Recall how the orthogonal diagonalization of a symmetric matrix is formed: if $A$ is symmetric, we write $A = QDQ^T$ where the diagonal entries of $D$ are the eigenvalues of $A$ and the columns of $Q$ are the associated eigenvectors. Moreover, the eigenvalues are related to the maximum and minimum values of the associated quadratic form $q_A({\mathbf u})$ among all unit vectors.

A general matrix, particularly a matrix that is not square, may not have eigenvalues and eigenvectors, but we can discover analogous features, called *singular values* and *singular vectors*, by studying a function somewhat similar to a quadratic form. More specifically, any matrix $A$ defines a function

$$ l_A({\mathbf x}) = |A{\mathbf x}|, $$

which measures the length of $A{\mathbf x}$. For example, the diagonal matrix $D=\begin{bmatrix} 3 & 0 \\ 0 & -2 \\ \end{bmatrix}$ gives the function $l_D({\mathbf x}) = \sqrt{9x_1^2 + 4x_2^2}$. The presence of the square root means that this function is not a quadratic form. We can, however, define the singular values and vectors by looking for the maximum and minimum of this function $l_A({\mathbf u})$ among all unit vectors ${\mathbf u}$.

While $l_A({\mathbf x})$ is not itself a quadratic form, it becomes one if we square it:

$$ \left(l_A({\mathbf x})\right)^2 = |A{\mathbf x}|^2 = (A{\mathbf x})\cdot(A{\mathbf x}) = {\mathbf x}\cdot(A^TA{\mathbf x})=q_{A^TA}({\mathbf x})\text{.} $$

{index-entry:Gram matrix} We call $G=A^TA$, the *Gram matrix* associated to $A$ and note that

$$ l_A({\mathbf x}) = \sqrt{q_G({\mathbf x})}\text{.} $$

This is important in the next activity, which introduces singular values and singular vectors.

:::activity {act:activity-7-4-2} Activity 7.4.2
The following interactive figure will help us explore singular values and vectors geometrically before we begin a more algebraic approach.
> FIGURE {fig:js-svd} number=7.4.1 src=../../media/ch07/singular-preview.png
> alt: An interactive diagram for exploring singular values
> width: 75%
> caption: Singular values, right singular vectors and left singular vectors
Select the matrix $A=\begin{bmatrix} 1 & 2 \\ -2 & - 1 \\ \end{bmatrix}$. As we vary the vector ${\mathbf x}$, we see the vector $A{\mathbf x}$ on the right in gray while the height of the blue bar to the right tells us $l_A({\mathbf x}) = |A{\mathbf x}|$.

a) 
    The first *singular value* $\sigma_1$ is the maximum value of $l_A({\mathbf x})$ over all unit vectors and an associated *right singular vector* ${\mathbf v}_1$ is a unit vector describing a direction in which this maximum occurs.

    Use the diagram to find the first singular value $\sigma_1$ and an associated right singular vector ${\mathbf v}_1$.

b) 
    The second singular value $\sigma_2$ is the minimum value of $l_A({\mathbf x})$ over all unit vectors and an associated right singular vector ${\mathbf v}_2$ is a unit vector describing a direction in which this minimum occurs.

    Use the diagram to find the second singular value $\sigma_2$ and an associated right singular vector ${\mathbf v}_2$.

c) 
    Here's how we can find the right singular values and vectors without using the diagram. Remember that $l_A({\mathbf x}) = \sqrt{q_G({\mathbf x})}$ where $G=A^TA$ is the Gram matrix associated to $A$. Since $G$ is symmetric, it is orthogonally diagonalizable. Find $G$ and an orthogonal diagonalization of it.

    :::sage
    ```sage

    ```
    :::

    What is the maximum value of the quadratic form $q_G({\mathbf x})$ among all unit vectors and in which direction does it occur? What is the minimum value of $q_G({\mathbf x})$ and in which direction does it occur?

d) 
    Because $l_A({\mathbf x}) = \sqrt{q_G({\mathbf x})}$, the first singular value $\sigma_1$ will be the square root of the maximum value of $q_G({\mathbf x})$ and $\sigma_2$ the square root of the minimum. Verify that the singular values that you found from the diagram are the square roots of the maximum and minimum values of $q_G({\mathbf x})$.

e) 
    Verify that the right singular vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ that you found from the diagram are the directions in which the maximum and minimum values occur.

f) 
    Finally, we introduce the *left singular vectors* ${\mathbf u}_1$ and ${\mathbf u}_2$ by requiring that $A{\mathbf v}_1 = \sigma_1{\mathbf u}_1$ and $A{\mathbf v}_2=\sigma_2{\mathbf u}_2$. Find the two left singular vectors.

    :::sage
    ```sage

    ```
    :::

g) 
    Form the matrices

    $$ U = \begin{bmatrix}{\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix}, \hspace{24pt} \Sigma = \begin{bmatrix} \sigma_1 & 0 \\ 0 & \sigma_2 \\ \end{bmatrix}, \hspace{24pt} V = \begin{bmatrix}{\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix} $$

    and explain why $AV = U\Sigma$.

h) 
    Finally, explain why $A=U\Sigma V^T$ and verify that this relationship holds for this specific example.

ANSWER:

a) 
    $\sigma_1=3$, ${\mathbf v}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$

b) 
    $\sigma_2=1$, ${\mathbf v}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$

c) 
    The maximum value of $q_G({\mathbf x})$ is $9$, which occurs in the direction $\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$. The minimum value of $q_G({\mathbf x})$ is $1$, which occurs in the direction $\left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$.

d) 
    $\sigma_1 = \sqrt{9} = 3$ and $\sigma_2 = \sqrt{1} = 1$

e) 
    ${\mathbf v}_1$ agrees with the direction in which $q_G({\mathbf x})$ has its maximum value. The corresponding fact is true for ${\mathbf v}_2$.

f) 
    ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$ and ${\mathbf u}_2 = \left[\begin{array}{r}-1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$

g) 
    $AV = \begin{bmatrix} A{\mathbf v}_1 & A{\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} \sigma_1{\mathbf u}_1 & \sigma_2{\mathbf u}_2 \end{bmatrix} = U\Sigma$.

h) 
    Since $V$ is an orthogonal matrix, we have $A = AVV^T = U\Sigma V^T$.

SOLUTION:

a) 
    The maximum value of $l_A({\mathbf x})$ is $\sigma_1=3$, which occurs at ${\mathbf v}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$.

b) 
    The minimum value of $l_A({\mathbf x})$ is $\sigma_2=1$, which occurs at ${\mathbf v}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$.

c) 
    $G = \begin{bmatrix} 5 & 4 \\ 4 & 5 \\ \end{bmatrix} = QDQ^T$ where

    $$ D = \begin{bmatrix} 9 & 0 \\ 0 & 1 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix}\text{.} $$

    The maximum value of $q_G({\mathbf x})$ is therefore $\lambda_1=9$, which occurs in the direction $\left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$. The minimum value of $q_G({\mathbf x})$ is $\lambda_2=1$, which occurs in the direction $\left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$.

d) 
    We see that $\sigma_1 = \sqrt{\lambda_1} = \sqrt{9} = 3$ and $\sigma_2 = \sqrt{\lambda_2} = \sqrt{1} = 1$.

e) 
    We also see that ${\mathbf v}_1$, the first right singular vector, agrees with the direction in which $q_G({\mathbf x})$ has its maximum value. The corresponding fact is true for ${\mathbf v}_2$.

f) 
    We find that ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$ and ${\mathbf u}_2 = \left[\begin{array}{r}-1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$.

g) 
    $AV = \begin{bmatrix} A{\mathbf v}_1 & A{\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} \sigma_1{\mathbf u}_1 & \sigma_2{\mathbf u}_2 \end{bmatrix} = U\Sigma$.

h) 
    Since $V$ is an orthogonal matrix, we have $A = AVV^T = U\Sigma V^T$.

:::

As this activity shows, the singular values of $A$ are the maximum and minimum values of $l_A({\mathbf x})=|A{\mathbf x}|$ among all unit vectors and the right singular vectors ${\mathbf v}_1$ and ${\mathbf v}_2$ are the directions in which they occur. The key to finding the singular values and vectors is to utilize the Gram matrix $G$ and its associated quadratic form $q_G({\mathbf x})$. We will illustrate with some more examples.

:::example {ex:example-7-4-2} Example 7.4.2
We will find a singular value decomposition of the matrix $A=\begin{bmatrix} 1 & 2 \\ -1 & 2 \end{bmatrix}$. Notice that this matrix is not symmetric so it cannot be orthogonally diagonalized.
We begin by constructing the Gram matrix $G = A^TA = \begin{bmatrix} 2 & 0 \\ 0 & 8 \\ \end{bmatrix}$. Since $G$ is symmetric, it can be orthogonally diagonalized with

$$ D = \begin{bmatrix} 8 & 0 \\ 0 & 2 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ \end{bmatrix}\text{.} $$

We now know that the maximum value of the quadratic form $q_G({\mathbf x})$ is 8, which occurs in the direction $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$. Since $l_A({\mathbf x}) = \sqrt{q_G({\mathbf x})}$, this tells us that the maximum value of $l_A({\mathbf x})$, the first singular value, is $\sigma_1=\sqrt{8}$ and that this occurs in the direction of the first right singular vector ${\mathbf v}_1=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$.
In the same way, we also know that the second singular value $\sigma_2=\sqrt{2}$ with associated right singular vector ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.
The first left singular vector ${\mathbf u}_1$ is defined by $A{\mathbf v}_1 = \left[\begin{array}{r}2 \\ 2 \end{array}\right] = \sigma_1{\mathbf u}_1$. Because $\sigma_1 = \sqrt{8}$, we have ${\mathbf u}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$. Notice that ${\mathbf u}_1$ is a unit vector because $\sigma_1 = |A{\mathbf v}_1|$.
In the same way, the second left singular vector is defined by $A{\mathbf v}_2 = \left[\begin{array}{r}1 \\ -1 \end{array}\right] = \sigma_2{\mathbf u}_2$, which gives us ${\mathbf u}_2 = \left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right]$.
We then construct

$$ \begin{aligned} U & {}={} \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix} = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix} \\ \Sigma & {}={} \begin{bmatrix} \sigma_1 & 0 \\ 0 & \sigma_2 \\ \end{bmatrix} = \begin{bmatrix} \sqrt{8} & 0 \\ 0 & \sqrt{2} \\ \end{bmatrix} \\ V & {}={} \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ \end{bmatrix} \end{aligned} $$

We now have $AV=U\Sigma$ because

$$ AV = \begin{bmatrix} A{\mathbf v}_1 & A{\mathbf v}_2 \end{bmatrix} = \begin{bmatrix} \sigma_1{\mathbf u}_1 & \sigma_2{\mathbf u}_2 \end{bmatrix} = \Sigma U\text{.} $$

Because the right singular vectors, the columns of $V$, are eigenvectors of the symmetric matrix $G$, they form an orthonormal basis, which means that $V$ is orthogonal. Therefore, we have $(AV)V^T = A = U\Sigma V^T$. This gives the singular value decomposition

$$ A = \begin{bmatrix} 1 & 2 \\ -1 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix} \begin{bmatrix} \sqrt{8} & 0 \\ 0 & \sqrt{2} \\ \end{bmatrix} \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ \end{bmatrix}^T = U\Sigma V^T\text{.} $$

:::

To summarize, we find a singular value decomposition of a matrix $A$ in the following way:

- 
    Construct the Gram matrix $G=A^TA$ and find an orthogonal diagonalization to obtain eigenvalues $\lambda_i$ and an orthonormal basis of eigenvectors.

- 
    The singular values of $A$ are the squares roots of eigenvalues $\lambda_i$ of $G$; that is, $\sigma_i = \sqrt{\lambda_i}$. By convention, the singular values are listed in decreasing order: $\sigma_1 \geq \sigma_2 \geq \ldots$. The right singular vectors ${\mathbf v}_i$ are the associated eigenvectors of $G$.

- 
    The left singular vectors ${\mathbf u}_i$ are found by $A{\mathbf v}_i = \sigma_i{\mathbf u}_i$. Because $\sigma_i=|A{\mathbf v}_i|$, we know that ${\mathbf u}_i$ will be a unit vector.

    In fact, the left singular vectors will also form an orthonormal basis. To see this, suppose that the associated singular values are nonzero. We then have:

    $$ \begin{aligned} \sigma_i\sigma_j({\mathbf u}_i\cdot{\mathbf u}_j) & {}={} (\sigma_i{\mathbf u}_i)\cdot(\sigma_j{\mathbf u}_j) = (A{\mathbf v}_i)\cdot(A{\mathbf v}_j) \\ & {}={} {\mathbf v}_i\cdot(A^TA{\mathbf v}_j) \\ & {}={} {\mathbf v}_i\cdot(G{\mathbf v}_j) = \lambda_j{\mathbf v}_i\cdot{\mathbf v}_j = 0 \end{aligned} $$

    since the right singular vectors are orthogonal.

:::example {ex:example-7-4-3} Example 7.4.3
Let's find a singular value decomposition for the symmetric matrix $A=\begin{bmatrix} 1 & 2 \\ 2 & 1 \end{bmatrix}$. The associated Gram matrix is

$$ G = A^TA = \begin{bmatrix} 5 & 4 \\ 4 & 5 \\ \end{bmatrix}\text{,} $$

which has an orthogonal diagonalization with

$$ D = \begin{bmatrix} 9 & 0 \\ 0 & 1 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix}\text{.} $$

This gives singular values and vectors

$$ \begin{aligned} \sigma_1 = 3, \hspace{24pt}& {\mathbf v}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right], & {\mathbf u}_1 = \left[\begin{array}{r}1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right] \\ \sigma_2 = 1, \hspace{24pt}& {\mathbf v}_2 = \left[\begin{array}{r}1/\sqrt{2} \\ -1/\sqrt{2} \end{array}\right], & {\mathbf u}_2 = \left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right] \end{aligned} $$

and the singular value decomposition $A=U\Sigma V^T$ where

$$ U = \begin{bmatrix} 1/\sqrt{2} & -1/\sqrt{2} \\ 1/\sqrt{2} & 1/\sqrt{2} \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} 3 & 0 \\ 0 & 1 \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \end{bmatrix}. $$

This example is special because $A$ is symmetric. With a little thought, it's possible to relate this singular value decomposition to an orthogonal diagonalization of $A$ using the fact that $G=A^TA = A^2$.
:::

:::activity {act:activity-7-4-3} Activity 7.4.3
In this activity, we will construct the singular value decomposition of $A=\begin{bmatrix} 1 & 0 & -1 \\ 1 & 1 & 1 \end{bmatrix}$. Notice that this matrix is not square so there are no eigenvalues and eigenvectors associated to it.

a) 
    Construct the Gram matrix $G=A^TA$ and find an orthogonal diagonalization of it.

    :::sage
    ```sage

    ```
    :::

b) 
    Identify the singular values of $A$ and the right singular vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$. What is the dimension of these vectors? How many nonzero singular values are there?

c) 
    Find the left singular vectors ${\mathbf u}_1$ and ${\mathbf u}_2$ using the fact that $A{\mathbf v}_i = \sigma_i{\mathbf u}_i$. What is the dimension of these vectors? What happens if you try to find a third left singular vector ${\mathbf u}_3$ in this way?

d) 
    As before, form the orthogonal matrices $U$ and $V$ from the left and right singular vectors. What are the shapes of $U$ and $V$? How do these shapes relate to the number of rows and columns of $A$?

e) 
    Now form $\Sigma$ so that it has the same shape as $A$:

    $$ \Sigma = \begin{bmatrix} \sigma_1 & 0 & 0 \\ 0 & \sigma_2 & 0 \end{bmatrix} $$

    and verify that $A = U\Sigma V^T$.

    :::sage
    ```sage

    ```
    :::

f) 
    How can you use this singular value decomposition of $A=U\Sigma V^T$ to easily find a singular value decomposition of $A^T=\begin{bmatrix} 1 & 1 \\ 0 & 1 \\ -1 & 1 \\ \end{bmatrix}$?

ANSWER:

a) 
    $G$ can be orthogonally diagaonalized with

    $$ D = \begin{bmatrix} 3 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 0 \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & 1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ 1/\sqrt{3} & -1/\sqrt{2} & 1/\sqrt{6} \end{bmatrix}. $$

b) 
    $\sigma_1 = \sqrt{3}$, $\sigma_2 = \sqrt{2}$, and $\sigma_3 = 0$. The three right singular vectors ${\mathbf v}_i$ are the columns of $Q$.

c) 
    ${\mathbf u}_1 = \left[\begin{array}{r}0 \\ 1 \end{array}\right]$ and ${\mathbf u}_2 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$

d) 
    We have

    $$ U = \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & 1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ 1/\sqrt{3} & -1/\sqrt{2} & 1/\sqrt{6} \end{bmatrix}\text{.} $$

e) 
    With $\Sigma = \begin{bmatrix} \sqrt{3} & 0 & 0 \\ 0 & \sqrt{2} & 0 \end{bmatrix}$, we see that $A=U\Sigma V^T$.

f) 
    $A^T=(U\Sigma V^T)^T = V\Sigma^T U^T$.

SOLUTION:

a) 
    Constructing the Gram matrix of $A$ gives the $3\times3$ matrix

    $$ G = \begin{bmatrix} 2 & 1 & 0 \\ 1 & 1 & 1 \\ 0 & 1 & 2 \end{bmatrix}\text{,} $$

    which can be orthogonally diagaonalized with

    $$ D = \begin{bmatrix} 3 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 0 \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & 1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ 1/\sqrt{3} & -1/\sqrt{2} & 1/\sqrt{6} \end{bmatrix}. $$

b) 
    This tells us that $\sigma_1 = \sqrt{3}$, $\sigma_2 = \sqrt{2}$, and $\sigma_3 = 0$. The three right singular vectors ${\mathbf v}_i$ are the columns of $Q$. Since these vectors are 3-dimensional, it follows that the matrix $V$ will be $3\times3$.

c) 
    We have

    $$ \begin{aligned} A{\mathbf v}_1 & = \left[\begin{array}{r}0 \\ \sqrt{3} \end{array}\right] = \sqrt{3} \left[\begin{array}{r}0 \\ 1 \end{array}\right] \\ A{\mathbf v}_2 & = \left[\begin{array}{r}\sqrt{2} \\ 0 \end{array}\right] = \sqrt{2} \left[\begin{array}{r}1 \\ 0 \end{array}\right] \end{aligned} $$

    showing that

    $$ {\mathbf u}_1 = \left[\begin{array}{r}0 \\ 1 \end{array}\right], \hspace{24pt} {\mathbf u}_2 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]. $$

    Notice that $A{\mathbf v}_3 = {\mathbf 0}$ so it is not possible to find a vector ${\mathbf u}_3$ in this way.

    The left singular vectors are 2-dimensional so $U$ will be a $2\times2$ matrix.

d) 
    We have

    $$ U = \begin{bmatrix} 0 & 1 \\ 1 & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1/\sqrt{3} & 1/\sqrt{2} & 1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ 1/\sqrt{3} & -1/\sqrt{2} & 1/\sqrt{6} \end{bmatrix}\text{.} $$

    The matrix $U$ is $2\times2$ since there are two rows in $A$ and $V$ is $3\times3$ since there are three columns in $A$

e) 
    With $\Sigma = \begin{bmatrix} \sqrt{3} & 0 & 0 \\ 0 & \sqrt{2} & 0 \end{bmatrix}$, we see that $A=U\Sigma V^T$.

f) 
    If $A = U\Sigma V^T$, then $A^T=(U\Sigma V^T)^T = V\Sigma^T U^T$.

:::

:::example {ex:example-svd-nonsquare} Example 7.4.4
We will find a singular value decomposition of the matrix $A=\begin{bmatrix} 2 & -2 & 1 \\ -4 & -8 & -8 \\ \end{bmatrix}$.
Finding an orthogonal diagonalization of $G=A^TA$ gives

$$ D=\begin{bmatrix} 144 & 0 & 0 \\ 0 & 9 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix},\hspace{24pt} Q=\begin{bmatrix} 1/3 & 2/3 & 2/3 \\ 2/3 & -2/3 & 1/3 \\ 2/3 & 1/3 & -2/3 \\ \end{bmatrix}\text{,} $$

which gives singular values $\sigma_1=\sqrt{144}=12$, $\sigma_2 = \sqrt{9}= 3$, and $\sigma_3 = 0$. The right singular vectors ${\mathbf v}_i$ appear as the columns of $Q$ so that $V = Q$.
We now find

$$ \begin{aligned} A{\mathbf v}_1 = \left[\begin{array}{r}0 \\ -12 \end{array}\right] = 12{\mathbf u}_1, \hspace{24pt} & {\mathbf u}_1 = \left[\begin{array}{r}0 \\ -1 \end{array}\right] \\ A{\mathbf v}_2 = \left[\begin{array}{r}3 \\ 0 \end{array}\right] = 3{\mathbf u}_1, \hspace{24pt} & {\mathbf u}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right] \\ A{\mathbf v}_3 = \left[\begin{array}{r}0 \\ 0 \end{array}\right] \end{aligned} $$

Notice that it's not possible to find a third left singular vector since $A{\mathbf v}_3={\mathbf 0}$. We therefore form the matrices

$$ U = \begin{bmatrix} 0 & 1 \\ -1 & 0 \\ \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} 12 & 0 & 0 \\ 0 & 3 & 0 \\ \end{bmatrix},\hspace{24pt} V=\begin{bmatrix} 1/3 & 2/3 & 2/3 \\ 2/3 & -2/3 & 1/3 \\ 2/3 & 1/3 & -2/3 \\ \end{bmatrix}\text{,} $$

which gives the singular value decomposition $A=U\Sigma V^T$.
Notice that $U$ is a $2\times2$ orthogonal matrix because $A$ has two rows, and $V$ is a $3\times3$ orthogonal matrix because $A$ has three columns.
:::

As we'll see in the next section, some additional work may be needed to construct the left singular vectors ${\mathbf u}_j$ if more of the singular values are zero, but we won't worry about that now. For the time being, let's record our work in the following theorem.

:::theorem {thm:theorem-svd} Theorem 7.4.5 (The singular value decomposition)
An $m\times n$ matrix $A$ may be written as $A=U\Sigma V^T$ where $U$ is an orthogonal $m\times m$ matrix, $V$ is an orthogonal $n\times n$ matrix, and $\Sigma$ is an $m\times n$ matrix whose entries are zero except for the singular values of $A$ which appear in decreasing order on the diagonal.
:::

Notice that a singular value decomposition of $A$ gives us a singular value decomposition of $A^T$. More specifically, if $A=U\Sigma V^T$, then

$$ A^T = (U\Sigma V^T)^T = V\Sigma^T U^T. $$

:::proposition {prop:prop-svd-transpose} Proposition 7.4.6
If $A=U\Sigma V^T$, then $A^T = V\Sigma^T U^T$. In other words, $A$ and $A^T$ share the same singular values, and the left singular vectors of $A$ are the right singular vectors of $A^T$ and vice-versa.
:::

As we said earlier, a singular value decomposition should be thought of a generalization of an orthogonal diagonalization. For instance, the Spectral Theorem tells us that a symmetric matrix can be written as $QDQ^T$. Many matrices, however, are not symmetric and so they are not orthogonally diagonalizable. However, every matrix has a singular value decomposition $U\Sigma V^T$. The price of this generalization is that we usually have two sets of singular vectors that form the orthogonal matrices $U$ and $V$ whereas a symmetric matrix has a single set of eignevectors that form the orthogonal matrix $Q$.

## 7.4.3 The structure of singular value decompositions

Now that we have an understanding of what a singular value decomposition is and how to construct it, let's explore the ways in which a singular value decomposition reveals the underlying structure of the matrix. As we'll see, the matrices $U$ and $V$ in a singular value decomposition provide convenient bases for some important subspaces, such as the column and null spaces of the matrix. This observation will provide the key to some of our uses of these decompositions in the next section.

:::activity {act:activity-7-4-4} Activity 7.4.4
Let's suppose that a matrix $A$ has a singular value decomposition $A=U\Sigma V^T$ where

$$ U=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 & {\mathbf u}_4 \end{bmatrix},\hspace{10pt} \Sigma = \begin{bmatrix} 20 & 0 & 0 \\ 0 & 5 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix},\hspace{10pt} V=\begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{bmatrix}. $$

a) 
    What is the shape of $A$; that is, how many rows and columns does $A$ have?

b) 
    Suppose we write a three-dimensional vector ${\mathbf x}$ as a linear combination of right singular vectors:

    $$ {\mathbf x} = c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + c_3{\mathbf v}_3\text{.} $$

    We would like to find an expression for $A{\mathbf x}$.

    To begin, $V^T{\mathbf x} = \left[\begin{array}{r}{\mathbf v}_1\cdot{\mathbf x} \\ {\mathbf v}_2\cdot{\mathbf x} \\ {\mathbf v}_3\cdot{\mathbf x} \end{array}\right] = \left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \end{array}\right]$.

    Now $\Sigma V^T {\mathbf x} = \begin{bmatrix} 20 & 0 & 0 \\ 0 & 5 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix}\left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \end{array}\right] = \left[\begin{array}{c}20c_1 \\ 5c_2 \\ 0 \\ 0 \end{array}\right]$.

    And finally, $A{\mathbf x} = U\Sigma V^T{\mathbf x} = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 & {\mathbf u}_4 \end{bmatrix} \left[\begin{array}{c}20c_1 \\ 5c_2 \\ 0 \\ 0 \end{array}\right] = 20c_1{\mathbf u}_1 + 5c_2{\mathbf u}_2$.

    To summarize, we have $A{\mathbf x} = 20c_1{\mathbf u}_1 + 5c_2{\mathbf u}_2$.

    What condition on $c_1$, $c_2$, and $c_3$ must be satisfied if ${\mathbf x}$ is a solution to the equation $A{\mathbf x}=40{\mathbf u}_1 + 20{\mathbf u}_2$? Is there a unique solution or infinitely many?

c) 
    Remembering that ${\mathbf u}_1$ and ${\mathbf u}_2$ are linearly independent, what condition on $c_1$, $c_2$, and $c_3$ must be satisfied if $A{\mathbf x} = {\mathbf 0}$?

d) 
    How do the right singular vectors ${\mathbf v}_i$ provide a basis for $\text{Nul}(A)$, the subspace of solutions to the equation $A{\mathbf x} = {\mathbf 0}$?

e) 
    Remember that ${\mathbf b}$ is in $\text{Col}(A)$ if the equation $A{\mathbf x} = {\mathbf b}$ is consistent, which means that

    $$ A{\mathbf x} = 20c_1{\mathbf u}_1 + 5c_2{\mathbf u}_2 = {\mathbf b} $$

    for some coefficients $c_1$ and $c_2$. How do the left singular vectors ${\mathbf u}_i$ provide an orthonormal basis for $\text{Col}(A)$?

f) 
    Remember that $\operatorname{rank}(A)$ is the dimension of the column space. What is $\operatorname{rank}(A)$ and how do the number of nonzero singular values determine $\operatorname{rank}(A)$?

ANSWER:

a) 
    $A$ is $4\times3$

b) 
    $c_1 = 2$, $c_2 = 4$, and there is no condition on $c_3$

c) 
    $c_1 = 0$, $c_2 = 0$, and there is no condition on $c_3$

d) 
    ${\mathbf v}_3$ forms a basis for $\text{Nul}(A)$.

e) 
    ${\mathbf u}_1$ and ${\mathbf u}_2$ form a basis for $\text{Col}(A)$.

f) 
    $\operatorname{rank}(A) = 2$, which is the number of nonzero singular values.

SOLUTION:

a) 
    The shape of $A$ is the same as $\Sigma$ so $A$ is $4\times3$; that is, $A$ has $4$ rows and $3$ columns.

b) 
    We have $A{\mathbf x}=20c_1{\mathbf u}_1 + 5c_2{\mathbf u}_2 = 40{\mathbf u}_1 + 20{\mathbf u}_2$. This means that $c_1 = 2$, $c_2 = 4$, and $c_3$ could be anything. Since there is no condition on $c_3$, there are infinitely many solutions.

c) 
    We have $A{\mathbf x}=20c_1{\mathbf u}_1 + 5c_2{\mathbf u}_2 = {\mathbf 0}$, which says that $c_1 = 0$, $c_2 = 0$, and $c_3$ could be anything.

d) 
    Any vector ${\mathbf x}$ in $\text{Nul}(A)$ satisfies $A{\mathbf x} = {\mathbf 0}$ and must have the form ${\mathbf x} = c_3{\mathbf v}_3$. Therefore, ${\mathbf v}_3$ forms a basis for $\text{Nul}(A)$.

e) 
    The vector ${\mathbf b}$ is in $\text{Col}(A)$ only if ${\mathbf b}$ is a linear combination of ${\mathbf u}_1$ and ${\mathbf u}_2$. Therefore, ${\mathbf u}_1$ and ${\mathbf u}_2$ form a basis for $\text{Col}(A)$.

f) 
    $\operatorname{rank}(A) = 2$, which is the number of nonzero singular values.

:::

This activity shows how a singular value decomposition of a matrix encodes important information about its null and column spaces. More specifically, the left and right singular vectors provide orthonormal bases for $\text{Nul}(A)$ and $\text{Col}(A)$. This is one of the reasons that singular value decompositions are so useful.

:::example {ex:example-7-4-7} Example 7.4.7
Suppose we have a singular value decomposition $A=U\Sigma V^T$ where $\Sigma = \begin{bmatrix} \sigma_1 & 0 & 0 & 0 & 0 \\ 0 & \sigma_2 & 0 & 0 & 0 \\ 0 & 0 & \sigma_3 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ \end{bmatrix}$. This means that $A$ has four rows and five columns just as $\Sigma$ does.
As in the activity, if ${\mathbf x} = c_1 {\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_5{\mathbf v}_5$, we have

$$ A{\mathbf x} = \sigma_1c_1{\mathbf u}_1 + \sigma_2c_2{\mathbf u}_2 + \sigma_3c_3{\mathbf u}_3\text{.} $$

If ${\mathbf b}$ is in $\text{Col}(A)$, then ${\mathbf b}$ must have the form

$$ {\mathbf b} = \sigma_1c_1{\mathbf u}_1 + \sigma_2c_2{\mathbf u}_2 + \sigma_3c_3{\mathbf u}_3\text{,} $$

which says that ${\mathbf b}$ is a linear combination of ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$. These three vectors therefore form a basis for $\text{Col}(A)$. In fact, since they are columns in the orthogonal matrix $U$, they form an orthonormal basis for $\text{Col}(A)$.
Remembering that $\operatorname{rank}(A)=\dim\text{Col}(A)$, we see that $\operatorname{rank}(A) = 3$, which results from the three nonzero singular values. In general, the rank $r$ of a matrix $A$ equals the number of nonzero singular values, and ${\mathbf u}_1, {\mathbf u}_2, \ldots,{\mathbf u}_r$ form an orthonormal basis for $\text{Col}(A)$.
Moreover, if ${\mathbf x} = c_1 {\mathbf v}_1 + c_2{\mathbf v}_2 + \ldots + c_5{\mathbf v}_5$ satisfies $A{\mathbf x} = {\mathbf 0}$, then

$$ A{\mathbf x} = \sigma_1c_1{\mathbf u}_1 + \sigma_2c_2{\mathbf u}_2 + \sigma_3c_3{\mathbf u}_3={\mathbf 0}\text{,} $$

which implies that $c_1=0$, $c_2=0$, and $c_3=0$. Therefore, ${\mathbf x} = c_4{\mathbf v}_4+c_5{\mathbf v}_5$ so ${\mathbf v}_4$ and ${\mathbf v}_5$ form an orthonormal basis for $\text{Nul}(A)$.
More generally, if $A$ is an $m\times n$ matrix and if $\operatorname{rank}(A) = r$, the last $n-r$ right singular vectors form an orthonormal basis for $\text{Nul}(A)$.
:::

Generally speaking, if the rank of an $m\times n$ matrix $A$ is $r$, then there are $r$ nonzero singular values and $\Sigma$ has the form

$$ \begin{bmatrix} \sigma_1 & \ldots & 0 & \ldots & 0 \\ 0 & \ldots & 0 & \ldots & 0 \\ 0 & \ldots & \sigma_r & \ldots & 0 \\ 0 & \ldots & 0 & \ldots & 0 \\ \vdots & \vdots & \vdots & \ddots & \vdots \\ 0 & \ldots & 0 & \ldots & 0 \\ \end{bmatrix}, $$

The first $r$ columns of $U$ form an orthonormal basis for $\text{Col}(A)$:

$$ U = \left[ \underbrace{{\mathbf u}_1 ~ \ldots ~ {\mathbf u}_r}_{\text{Col}(A)} \hspace{3pt} {\mathbf u}_{r+1} ~ \ldots ~ {\mathbf u}_m \right] $$

and the last $n-r$ columns of $V$ form an orthonormal basis for $\text{Nul}(A)$:

$$ V = \left[ {\mathbf v}_1 ~ \ldots ~ {\mathbf v}_r\hspace{3pt} \underbrace{{\mathbf v}_{r+1} ~ \ldots ~ {\mathbf v}_n}_{\text{Nul}(A)} \right] $$

Remember that [Proposition 7.4.6](ref:prop-svd-transpose) says that $A$ and its transpose $A^T$ share the same singular values. Since the rank of a matrix equals its number of nonzero singular values, this means that $\operatorname{rank}(A)=\operatorname{rank}(A^T)$, a fact that we cited back in [Section 6.2](ref:6.2#sec-transpose).

:::proposition {prop:prop-rank-transpose} Proposition 7.4.8
For any matrix $A$,

$$ \operatorname{rank}(A) = \operatorname{rank}(A^T)\text{.} $$

:::

If we have a singular value decomposition of an $m\times n$ matrix $A=U\Sigma V^T$, [Proposition 7.4.6](ref:prop-svd-transpose) also tells us that the left singular vectors of $A$ are the right singular vectors of $A^T$. Therefore, $U$ is the $m\times m$ matrix whose columns are the right singular vectors of $A^T$. This means that the last $m-r$ vectors form an orthonormal basis for $\text{Nul}(A^T)$. Therefore, the columns of $U$ provide orthonormal bases for $\text{Col}(A)$ and $\text{Nul}(A^T)$:

$$ U = \left[ \underbrace{{\mathbf u}_1 ~ \ldots ~ {\mathbf u}_r}_{\text{Col}(A)} \hspace{3pt} \underbrace{{\mathbf u}_{r+1} ~ \ldots ~ {\mathbf u}_m}_{\text{Nul}(A^T)} \right]\text{.} $$

This reflects the familiar fact that $\text{Nul}(A^T)$ is the orthogonal complement of $\text{Col}(A)$.

{index-entry:row space} In the same way, $V$ is the $n\times n$ matrix whose columns are the left singular vectors of $A^T$, which means that the first $r$ vectors form an orthonormal basis for $\text{Col}(A^T)$. Because the columns of $A^T$ are the rows of $A$, this subspace is sometimes called the *row space* of $A$ and denoted $\text{Row}(A)$. While we have yet to have an occasion to use $\text{Row}(A)$, there are times when it is important to have an orthonormal basis for it, and a singular value decomposition provides just that. To summarize, the columns of $V$ provide orthonormal bases for $\text{Col}(A^T)$ and $\text{Nul}(A)$:

$$ V = \left[ \underbrace{{\mathbf v}_1 ~ \ldots ~ {\mathbf v}_r}_{\text{Col}(A^T)}\hspace{3pt} \underbrace{{\mathbf v}_{r+1} ~ \ldots ~ {\mathbf v}_n}_{\text{Nul}(A)} \right] $$

Considered altogether, the subspaces $\text{Col}(A)$, $\text{Nul}(A)$, $\text{Col}(A^T)$, and $\text{Nul}(A^T)$ are called the *four fundamental subspaces* associated to $A$. In addition to telling us the rank of a matrix, a singular value decomposition gives us orthonormal bases for all four fundamental subspaces.

:::theorem {thm:thm-four-subspaces} Theorem 7.4.9
Suppose $A$ is an $m\times n$ matrix having a singular value decomposition $A=U\Sigma V^T$. Then

- 
    $r=\operatorname{rank}(A)$ is the number of nonzero singular values.

- 
    The columns ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_r$ form an orthonormal basis for $\text{Col}(A)$.

- 
    The columns ${\mathbf u}_{r+1},\ldots,{\mathbf u}_m$ form an orthonormal basis for $\text{Nul}(A^T)$.

- 
    The columns ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_r$ form an orthonormal basis for $\text{Col}(A^T)$.

- 
    The columns ${\mathbf v}_{r+1},\ldots,{\mathbf v}_n$ form an orthonormal basis for $\text{Nul}(A)$.

:::

When we previously outlined a procedure for finding a singular decomposition of an $m\times n$ matrix $A$, we found the left singular vectors ${\mathbf u}_j$ using the expression $A{\mathbf v}_j = \sigma_j{\mathbf u}_j$. This produces left singular vectors ${\mathbf u}_1, {\mathbf u}_2,\ldots,{\mathbf u}_r$, where $r=\operatorname{rank}(A)$. If $r< m$, however, we still need to find the left singular vectors ${\mathbf u}_{r+1},\ldots,{\mathbf u}_m$. [Theorem 7.4.9](ref:thm-four-subspaces) tells us how to do that: because those vectors form an orthonormal basis for $\text{Nul}(A^T)$, we can find them by solving $A^T{\mathbf x} = {\mathbf 0}$ to obtain a basis for $\text{Nul}(A^T)$ and applying the Gram-Schmidt algorithm.

We won't worry about this issue too much, however, as we will frequently use software to find singular value decompositions for us.

## 7.4.4 Reduced singular value decompositions

As we'll see in the next section, there are times when it is helpful to express a singular value decomposition in a slightly different form.

:::activity {act:activity-7-4-5} Activity 7.4.5
Suppose we have a singular value decomposition $A = U\Sigma V^T$ where

$$ U = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 & {\mathbf u}_4 \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{bmatrix}\text{.} $$

a) 
    What is the shape of $A$? What is $\operatorname{rank}(A)$?

b) 
    Identify bases for $\text{Col}(A)$ and $\text{Col}(A^T)$.

c) 
    Explain why

    $$ U\Sigma = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix} \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix}\text{.} $$

d) 
    Explain why

    $$ \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix}V^T = \begin{bmatrix} 18 & 0 \\ 0 & 4 \\ \end{bmatrix} \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}^T\text{.} $$

e) 
    If $A = U\Sigma V^T$, explain why $A=U_r\Sigma_rV_r^T$ where the columns of $U_r$ are an orthonormal basis for $\text{Col}(A)$, $\Sigma_r$ is a square, diagonal, invertible matrix, and the columns of $V_r$ form an orthonormal basis for $\text{Col}(A^T)$.

ANSWER:

a) 
    $A$ is a $4\times3$ matrix and $\operatorname{rank}(A) = 2$

b) 
    ${\mathbf u}_1$ and ${\mathbf u}_2$ form an orthonormal basis for $\text{Col}(A)$, and ${\mathbf v}_1$ and ${\mathbf v}_2$ form an orthonormal basis for $\text{Nul}(A)$.

c) 
    Notice that

    $$ U\Sigma = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 & {\mathbf u}_4 \end{bmatrix} \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix} = \begin{bmatrix} 18{\mathbf u}_1 & 4{\mathbf u}_2 & {\mathbf 0} \end{bmatrix} $$

d) 
    Notice that

    $$ \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix}V^T = \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix} \begin{bmatrix} {\mathbf v}_1^T \\ {\mathbf v}_2^T \\ {\mathbf v}_3^T \end{bmatrix} $$

e) 
    Put together the previous parts to see that $A=U_r\Sigma_rV_r^T$ where

    $$ U_r = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix},\hspace{24pt} \Sigma_r = \begin{bmatrix} 18 & 0 \\ 0 & 4 \\ \end{bmatrix},\hspace{24pt} V_r = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}\text{.} $$

SOLUTION:

a) 
    $A$ is a $4\times3$ matrix and $\operatorname{rank}(A) = 2$ because there are two nonzero singular values.

b) 
    ${\mathbf u}_1$ and ${\mathbf u}_2$ form an orthonormal basis for $\text{Col}(A)$, and ${\mathbf v}_1$ and ${\mathbf v}_2$ form an orthonormal basis for $\text{Nul}(A)$.

c) 
    Notice that

    $$ U\Sigma = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 & {\mathbf u}_4 \end{bmatrix} \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ 0 & 0 & 0 \\ 0 & 0 & 0 \end{bmatrix} = \begin{bmatrix} 18{\mathbf u}_1 & 4{\mathbf u}_2 & {\mathbf 0} \end{bmatrix} = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix} \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix}\text{.} $$

d) 
    Notice that

    $$ \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix}V^T = \begin{bmatrix} 18 & 0 & 0 \\ 0 & 4 & 0 \\ \end{bmatrix} \begin{bmatrix} {\mathbf v}_1^T \\ {\mathbf v}_2^T \\ {\mathbf v}_3^T \end{bmatrix} = \begin{bmatrix} 18 {\mathbf v}_1^T \\ 4 {\mathbf v}_2^T \end{bmatrix} = \begin{bmatrix} 18 & 0 \\ 0 & 4 \\ \end{bmatrix} \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}^T\text{.} $$

e) 
    Put together the previous parts to see that $A=U_r\Sigma_rV_r^T$ where

    $$ U_r = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix},\hspace{24pt} \Sigma_r = \begin{bmatrix} 18 & 0 \\ 0 & 4 \\ \end{bmatrix},\hspace{24pt} V_r = \begin{bmatrix} {\mathbf v}_1 & {\mathbf v}_2 \end{bmatrix}\text{.} $$

:::

We call this a *reduced singular value decomposition*.

:::proposition {prop:prop-reduced-svd} Proposition 7.4.10 (Reduced singular value decomposition)
If $A$ is an $m\times n$ matrix having rank $r$, then $A=U_r \Sigma_r V_r^T$ where

- 
    $U_r$ is an $m\times r$ matrix whose columns form an orthonormal basis for $\text{Col}(A)$,

- 
    $\Sigma_r=\begin{bmatrix} \sigma_1 & 0 & \ldots & 0 \\ 0 & \sigma_2 & \ldots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & 0 & \sigma_r \\ \end{bmatrix}$ is an $r\times r$ diagonal, invertible matrix, and

- 
    $V_r$ is an $n\times r$ matrix whose columns form an orthonormal basis for $\text{Col}(A^T)$.

:::

:::example {ex:example-7-4-11} Example 7.4.11
In [Example 7.4.4](ref:example-svd-nonsquare), we found the singular value decomposition

$$ A=\begin{bmatrix} 2 & -2 & 1 \\ -4 & -8 & -8 \\ \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -1 & 0 \\ \end{bmatrix} \begin{bmatrix} 12 & 0 & 0 \\ 0 & 3 & 0 \\ \end{bmatrix} \begin{bmatrix} 1/3 & 2/3 & 2/3 \\ 2/3 & -2/3 & 1/3 \\ 2/3 & 1/3 & -2/3 \\ \end{bmatrix}^T\text{.} $$

Since there are two nonzero singular values, $\operatorname{rank}(A) =2$ so that the reduced singular value decomposition is

$$ A=\begin{bmatrix} 2 & -2 & 1 \\ -4 & -8 & -8 \\ \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -1 & 0 \\ \end{bmatrix} \begin{bmatrix} 12 & 0 \\ 0 & 3 \\ \end{bmatrix} \begin{bmatrix} 1/3 & 2/3 \\ 2/3 & -2/3 \\ 2/3 & 1/3 \\ \end{bmatrix}^T\text{.} $$

:::

## 7.4.5 Summary

This section has explored singular value decompositions, how to find them, and how they organize important information about a matrix.

- 
    A singular value decomposition of a matrix $A$ is a factorization where $A=U\Sigma V^T$. The matrix $\Sigma$ has the same shape as $A$, and its only nonzero entries are the singular values of $A$, which appear in decreasing order on the diagonal. The matrices $U$ and $V$ are orthogonal and contain the left and right singular vectors, respectively, as their columns.

- 
    To find a singular value decomposition of a matrix, we construct the Gram matrix $G=A^TA$, which is symmetric. The singular values of $A$ are the square roots of the eigenvalues of $G$, and the right singular vectors ${\mathbf v}_j$ are the associated eigenvectors of $G$. The left singular vectors ${\mathbf u}_j$ are determined from the relationship $A{\mathbf v}_j=\sigma_j{\mathbf u}_j$.

- 
    A singular value decomposition reveals fundamental information about a matrix. For instance, the number of nonzero singular values is the rank $r$ of the matrix. The first $r$ left singular vectors form an orthonormal basis for $\text{Col}(A)$ with the remaining left singular vectors forming an orthonormal basis of $\text{Nul}(A^T)$. The first $r$ right singular vectors form an orthonormal basis for $\text{Col}(A^T)$ while the remaining right singular vectors form an orthonormal basis of $\text{Nul}(A)$.

- 
    If $A$ is a rank $r$ matrix, we can write a reduced singular value decomposition as $A=U_r\Sigma_rV_r^T$ where the columns of $U_r$ form an orthonormal basis for $\text{Col}(A)$, the columns of $V_r$ form an orthonormal basis for $\text{Col}(A^T)$, and $\Sigma_r$ is an $r\times r$ diagonal, invertible matrix.

## 7.4.6 Exercises

:::exercise {exercise-7-4-001} number=7.4.1 answered=yes src=src/exercises/exercises7-4.xml:5 label=ex-7-4-1
PROBLEM:
Consider the matrix $A = \begin{bmatrix} 1 & 2 & 1 \\ 0 & -1 & 2 \\ \end{bmatrix}$.
:::sage
```sage

```
:::

a) 
    Find the Gram matrix $G=A^TA$ and use it to find the singular values and right singular vectors of $A$.

b) 
    Find the left singular vectors.

c) 
    Form the matrices $U$, $\Sigma$, and $V$ and verify that $A=U\Sigma V^T$.

d) 
    What is $\operatorname{rank}(A)$ and what does this say about $\text{Col}(A)$?

e) 
    Determine an orthonormal basis for $\text{Nul}(A)$.

ANSWER:

a) 
    $G = \begin{bmatrix} 1 & 2 & 1 \\ 2 & 5 & 0 \\ 1 & 0 & 5 \\ \end{bmatrix}$, which has

    $$ D=\begin{bmatrix} 6 & 0 & 0 \\ 0 & 5 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{6} & 0 & 5/\sqrt{30} \\ 2/\sqrt{6} & 1/\sqrt{5} & -2/\sqrt{30} \\ 1/\sqrt{6} & -2/\sqrt{5} & -1/\sqrt{30} \\ \end{bmatrix} $$

    $\sigma_1 = \sqrt{6}$ and $\sigma_2=\sqrt{5}$. The right singular vectors are the columns of $Q$.

b) 
    ${\mathbf u}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and ${\mathbf u}_2=\left[\begin{array}{r}0 \\ -1 \end{array}\right]$.

c) 

    $$ U=\begin{bmatrix} 1 & 0 \\ 0 & -1 \\ \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} \sqrt{6} & 0 & 0 \\ 0 & \sqrt{5} & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1/\sqrt{6} & 0 & 5/\sqrt{30} \\ 2/\sqrt{6} & 1/\sqrt{5} & -2/\sqrt{30} \\ 1/\sqrt{6} & -2/\sqrt{5} & -1/\sqrt{30} \\ \end{bmatrix} $$

d) 
    $\operatorname{rank}(A)=2$ and $\text{Col}(A)={\mathbb R}^2$.

e) 
    ${\mathbf v}_3 = \left[\begin{array}{r}5/\sqrt{30} \\ -2/\sqrt{30} \\ -1/\sqrt{30} \end{array}\right]$

SOLUTION:

a) 
    $G = \begin{bmatrix} 1 & 2 & 1 \\ 2 & 5 & 0 \\ 1 & 0 & 5 \\ \end{bmatrix}$, which has

    $$ D=\begin{bmatrix} 6 & 0 & 0 \\ 0 & 5 & 0 \\ 0 & 0 & 0 \\ \end{bmatrix},\hspace{24pt} Q = \begin{bmatrix} 1/\sqrt{6} & 0 & 5/\sqrt{30} \\ 2/\sqrt{6} & 1/\sqrt{5} & -2/\sqrt{30} \\ 1/\sqrt{6} & -2/\sqrt{5} & -1/\sqrt{30} \\ \end{bmatrix} $$

    This says that $\sigma_1 = \sqrt{6}$ and $\sigma_2=\sqrt{5}$. The right singular vectors are the columns of $Q$.

b) 
    ${\mathbf u}_1 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$ and ${\mathbf u}_2=\left[\begin{array}{r}0 \\ -1 \end{array}\right]$.

c) 

    $$ U=\begin{bmatrix} 1 & 0 \\ 0 & -1 \\ \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} \sqrt{6} & 0 & 0 \\ 0 & \sqrt{5} & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1/\sqrt{6} & 0 & 5/\sqrt{30} \\ 2/\sqrt{6} & 1/\sqrt{5} & -2/\sqrt{30} \\ 1/\sqrt{6} & -2/\sqrt{5} & -1/\sqrt{30} \\ \end{bmatrix} $$

d) 
    $\operatorname{rank}(A)=2$ because there are two nonzero singular values. Therefore, $\text{Col}(A)$ is 2-dimensional and so $\text{Col}(A)={\mathbb R}^2$.

e) 
    ${\mathbf v}_3 = \left[\begin{array}{r}5/\sqrt{30} \\ -2/\sqrt{30} \\ -1/\sqrt{30} \end{array}\right]$

:::

:::exercise {exercise-7-4-002} number=7.4.2 answered=yes src=src/exercises/exercises7-4.xml:196
PROBLEM:
Find singular value decompositions for the following matrices:

a) 
    $\begin{bmatrix} 0 & 0 \\ 0 & -8 \end{bmatrix}$.

b) 
    $\begin{bmatrix} 2 & 3 \\ 0 & 2 \end{bmatrix}$.

c) 
    $\begin{bmatrix} 4 & 0 & 0 \\ 0 & 0 & 2 \end{bmatrix}$

d) 
    $\begin{bmatrix} 4 & 0 \\ 0 & 0 \\ 0 & 2 \end{bmatrix}$

ANSWER:

a) 
    $\begin{bmatrix} 0 & 0 \\ 0 & -8 \\ \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -1 & 0 \\ \end{bmatrix} \begin{bmatrix} 8 & 0 \\ 0 & 0 \\ \end{bmatrix} \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix}^T$

b) 
    $\begin{bmatrix} 2 & 3 \\ 0 & 2 \\ \end{bmatrix} = \begin{bmatrix} 2/\sqrt{5} & 1/\sqrt{5} \\ 1/\sqrt{5} & -2/\sqrt{5} \\ \end{bmatrix} \begin{bmatrix} 4 & 0 \\ 0 & 1 \\ \end{bmatrix} \begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ 2/\sqrt{5} & -1/\sqrt{5} \\ \end{bmatrix}^T$

c) 
    $\begin{bmatrix} 4 & 0 & 0 \\ 0 & 0 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix} \begin{bmatrix} 4 & 0 & 0 \\ 0 & 2 & 0 \\ \end{bmatrix} \begin{bmatrix} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \\ \end{bmatrix}^T$

d) 
    $\begin{bmatrix} 4 & 0 \\ 0 & 0 \\ 0 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \\ \end{bmatrix} \begin{bmatrix} 4 & 0 \\ 0 & 2 \\ 0 & 0 \\ \end{bmatrix} \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix}^T$

SOLUTION:

a) 
    $\begin{bmatrix} 0 & 0 \\ 0 & -8 \\ \end{bmatrix} = \begin{bmatrix} 0 & 1 \\ -1 & 0 \\ \end{bmatrix} \begin{bmatrix} 8 & 0 \\ 0 & 0 \\ \end{bmatrix} \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix}^T$

b) 
    $\begin{bmatrix} 2 & 3 \\ 0 & 2 \\ \end{bmatrix} = \begin{bmatrix} 2/\sqrt{5} & 1/\sqrt{5} \\ 1/\sqrt{5} & -2/\sqrt{5} \\ \end{bmatrix} \begin{bmatrix} 4 & 0 \\ 0 & 1 \\ \end{bmatrix} \begin{bmatrix} 1/\sqrt{5} & 2/\sqrt{5} \\ 2/\sqrt{5} & -1/\sqrt{5} \\ \end{bmatrix}^T$

c) 
    $\begin{bmatrix} 4 & 0 & 0 \\ 0 & 0 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix} \begin{bmatrix} 4 & 0 & 0 \\ 0 & 2 & 0 \\ \end{bmatrix} \begin{bmatrix} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \\ \end{bmatrix}^T$

d) 
    $\begin{bmatrix} 4 & 0 \\ 0 & 0 \\ 0 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 0 & 1 \\ 0 & 1 & 0 \\ \end{bmatrix} \begin{bmatrix} 4 & 0 \\ 0 & 2 \\ 0 & 0 \\ \end{bmatrix} \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ \end{bmatrix}^T$

:::

:::exercise {exercise-7-4-003} number=7.4.3 answered=yes src=src/exercises/exercises7-4.xml:429
PROBLEM:
Consider the matrix $A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$.

a) 
    Find a singular value decomposition of $A$ and verify that it is also an orthogonal diagonalization of $A$.

b) 
    If $A$ is a symmetric, positive semidefinite matrix, explain why a singular value decomposition of $A$ is an orthogonal diagonalization of $A$.

ANSWER:

a) 
    $\begin{bmatrix} 2 & 1 \\ 1 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix} \begin{bmatrix} 3 & 0 \\ 0 & 1 \\ \end{bmatrix} \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix}^T$

b) 
    The singular values $\sigma_i = \lambda_i$, the eigenvalues of $A$ and the right singular vectors are eigenvectors of $A$.

SOLUTION:

a) 
    $\begin{bmatrix} 2 & 1 \\ 1 & 2 \\ \end{bmatrix} = \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix} \begin{bmatrix} 3 & 0 \\ 0 & 1 \\ \end{bmatrix} \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & -1/\sqrt{2} \\ \end{bmatrix}^T$

    Since $U=V$, this is an orthogonal diagonalization.

b) 
    In this case, $G=A^TA = A^2$. If $\lambda_i\geq 0$ are the eigenvalues of $A$ and ${\mathbf v}_i$ the associated eigenvectors, then $\lambda_i^2$ is an eigenvalue of $G$ with associated eigenvector ${\mathbf v}_i$. Therefore, $\sigma_i = \sqrt{\lambda_i^2} = \lambda_i$ and the right singular vectors are ${\mathbf v}_i$.

    The left singular vectors are $A{\mathbf v}_i = \sigma_i{\mathbf u}_i = \lambda_i{\mathbf v}_i$ so the left singular vectors are the same as the right singular vectors.

:::

:::exercise {exercise-7-4-004} number=7.4.4 answered=yes src=src/exercises/exercises7-4.xml:544
PROBLEM:
Suppose that the matrix $A$ has the singular value decomposition

$$ \begin{bmatrix} -0.46 & 0.52 & 0.46 & 0.55 \\ -0.82 & 0.00 & -0.14 & -0.55 \\ -0.04 & 0.44 & -0.85 & 0.28 \\ -0.34 & -0.73 & -0.18 & 0.55 \end{bmatrix} \begin{bmatrix} 6.2 & 0.0 & 0.0 \\ 0.0 & 4.1 & 0.0 \\ 0.0 & 0.0 & 0.0 \\ 0.0 & 0.0 & 0.0 \end{bmatrix} \begin{bmatrix} -0.74 & 0.62 & -0.24 \\ 0.28 & 0.62 & 0.73 \\ -0.61 & -0.48 & 0.64 \end{bmatrix}. $$

a) 
    What are the dimensions of $A$?

b) 
    What is $\operatorname{rank}(A)$?

c) 
    Find orthonormal bases for $\text{Col}(A)$, $\text{Nul}(A)$, $\text{Col}(A^T)$, and $\text{Nul}(A^T)$.

d) 
    Find the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}1 \\ 0 \\ 2 \\ -1 \end{array}\right]$ onto $\text{Col}(A)$.

ANSWER:

a) 
    $4\times 3$

b) 
    $2$

c) 
    A basis for $\text{Col}(A)$ is formed by the first two columns of $U$. A basis for $\text{Nul}(A^T)$ is formed by the last two columns of $U$. A basis for $\text{Col}(A^T)$ is formed by the first two columns of $V$. A basis for $\text{Nul}(A)$ is formed by the last column of $V$.

d) 
    $\left[\begin{array}{r}1.20 \\ 0.16 \\ 0.95 \\ -1.49 \end{array}\right]$.

SOLUTION:

a) 
    $A$ is $4\times 3$

b) 
    $\operatorname{rank}(A) = 2$

c) 
    A basis for $\text{Col}(A)$ is formed by the first two columns of $U$. A basis for $\text{Nul}(A^T)$ is formed by the last two columns of $U$. A basis for $\text{Col}(A^T)$ is formed by the first two columns of $V$. A basis for $\text{Nul}(A)$ is formed by the last column of $V$.

d) 
    Form $Q = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2\end{bmatrix}$ and find $QQ^T{\mathbf b} = \left[\begin{array}{r}1.20 \\ 0.16 \\ 0.95 \\ -1.49 \end{array}\right]$.

:::

:::exercise {exercise-7-4-005} number=7.4.5 answered=yes src=src/exercises/exercises7-4.xml:663
PROBLEM:
Consider the matrix $A = \begin{bmatrix} 1 & 0 & -1 \\ 2 & 2 & 0 \\ -1 & 1 & 2\\ \end{bmatrix}$.
:::sage
```sage

```
:::

a) 
    Construct the Gram matrix $G$ and use it to find the singular values and right singular vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ of $A$. What are the matrices $\Sigma$ and $V$ in a singular value decomposition?

b) 
    What is $\operatorname{rank}(A)$?

c) 
    Find as many left singular vectors ${\mathbf u}_j$ as you can using the relationship $A{\mathbf v}_j=\sigma_j{\mathbf u}_j$.

d) 
    Find an orthonormal basis for $\text{Nul}(A^T)$ and use it to construct the matrix $U$ so that $A=U\Sigma V^T$.

e) 
    State an orthonormal basis for $\text{Nul}(A)$ and an orthonormal basis for $\text{Col}(A)$.

ANSWER:

a) 
    $\Sigma = \begin{bmatrix} 3 & 0 & 0 \\ 0 & \sqrt{7} & 0 \\ 0 & 0 & 0 \\ \end{bmatrix}$ and $V = \begin{bmatrix} 2/\sqrt{6} & 0 & 1/\sqrt{3} \\ 1/\sqrt{6} & 1/\sqrt{2} & -1/\sqrt{3} \\ -1/\sqrt{6} & 1/\sqrt{2} & 1/\sqrt{3} \\ \end{bmatrix}$

b) 
    $\operatorname{rank}(A)=2$

c) ${\mathbf u}_1 =\left[\begin{array}{r}1/\sqrt{6} \\ 2/\sqrt{6} \\ -1/\sqrt{6} \end{array}\right]$ and ${\mathbf u}_1 =\left[\begin{array}{r}-1/\sqrt{14} \\ 2/\sqrt{14} \\ 3/\sqrt{14} \end{array}\right]$
d) 
    $U=\begin{bmatrix} 1/\sqrt{6} & -1/\sqrt{14} & 4/\sqrt{21} \\ 2/\sqrt{6} & 2/\sqrt{14} & -1/\sqrt{21} \\ -1/\sqrt{6} & 3/\sqrt{14} & 2/\sqrt{21} \\ \end{bmatrix}$

e) 
    The third column of $V$ forms a basis for $\text{Nul}(A)$ while the first two columns of $U$ form a basis for $\text{Col}(A)$.

SOLUTION:

a) 
    $\Sigma = \begin{bmatrix} 3 & 0 & 0 \\ 0 & \sqrt{7} & 0 \\ 0 & 0 & 0 \\ \end{bmatrix}$ and $V = \begin{bmatrix} 2/\sqrt{6} & 0 & 1/\sqrt{3} \\ 1/\sqrt{6} & 1/\sqrt{2} & -1/\sqrt{3} \\ -1/\sqrt{6} & 1/\sqrt{2} & 1/\sqrt{3} \\ \end{bmatrix}$

b) 
    $\operatorname{rank}(A)=2$

c) ${\mathbf u}_1 =\left[\begin{array}{r}1/\sqrt{6} \\ 2/\sqrt{6} \\ -1/\sqrt{6} \end{array}\right]$ and ${\mathbf u}_1 =\left[\begin{array}{r}-1/\sqrt{14} \\ 2/\sqrt{14} \\ 3/\sqrt{14} \end{array}\right]$
d) 
    ${\mathbf u}_3 = \left[\begin{array}{r}4/\sqrt{21} \\ -1/\sqrt{21} \\ 2/\sqrt{21} \end{array}\right]$ so that $U=\begin{bmatrix} 1/\sqrt{6} & -1/\sqrt{14} & 4/\sqrt{21} \\ 2/\sqrt{6} & 2/\sqrt{14} & -1/\sqrt{21} \\ -1/\sqrt{6} & 3/\sqrt{14} & 2/\sqrt{21} \\ \end{bmatrix}$

e) 
    The third column of $V$ forms a basis for $\text{Nul}(A)$ while the first two columns of $U$ form a basis for $\text{Col}(A)$.

:::

:::exercise {exercise-7-4-006} number=7.4.6 answered=yes src=src/exercises/exercises7-4.xml:819
PROBLEM:
Consider the matrix $B=\begin{bmatrix} 1 & 0 \\ 2 & -1 \\ 1 & 2 \end{bmatrix}$ and notice that $B=A^T$ where $A$ is the matrix in [Exercise 7.4.1](ref:ex-7-4-1).
:::sage
```sage

```
:::

a) 
    Use your result from [Exercise 7.4.1](ref:ex-7-4-1) to find a singular value decomposition of $B=U\Sigma V^T$.

b) 
    What is $\operatorname{rank}(B)$? Determine a basis for $\text{Col}(B)$ and $\text{Col}(B)^\perp$.

c) 
    Suppose that ${\mathbf b}=\left[\begin{array}{r}-3 \\ 4 \\ 7 \end{array}\right]$. Use the bases you found in the previous part of this exercise to write ${\mathbf b}=\widehat{{\mathbf b}}+{\mathbf b}^\perp$, where $\widehat{{\mathbf b}}$ is in $\text{Col}(B)$ and ${\mathbf b}^\perp$ is in $\text{Col}(B)^\perp$.

d) 
    Find the least-squares approximate solution to the equation $B{\mathbf x}={\mathbf b}$.

ANSWER:

a) 
    From the previous problem, we have

    $$ U=\begin{bmatrix} 1/\sqrt{6} & 0 & 5/\sqrt{30} \\ 2/\sqrt{6} & 1/\sqrt{5} & -2/\sqrt{30} \\ 1/\sqrt{6} & -2/\sqrt{5} & -1/\sqrt{30} \\ \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} \sqrt{6} & 0 \\ 0 & \sqrt{5} \\ 0 & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1 & 0 \\ 0 & -1 \\ \end{bmatrix} $$

b) 
    $\operatorname{rank}(B)=2$

c) 
    $\widehat{{\mathbf b}} = \left[\begin{array}{r}2 \\ 2 \\ 6 \end{array}\right]$

d) 
    $\widehat{{\mathbf x}} =\left[\begin{array}{r}2 \\ 2 \end{array}\right]$.

SOLUTION:

a) 
    From the previous problem, we have

    $$ U=\begin{bmatrix} 1/\sqrt{6} & 0 & 5/\sqrt{30} \\ 2/\sqrt{6} & 1/\sqrt{5} & -2/\sqrt{30} \\ 1/\sqrt{6} & -2/\sqrt{5} & -1/\sqrt{30} \\ \end{bmatrix},\hspace{24pt} \Sigma = \begin{bmatrix} \sqrt{6} & 0 \\ 0 & \sqrt{5} \\ 0 & 0 \\ \end{bmatrix},\hspace{24pt} V = \begin{bmatrix} 1 & 0 \\ 0 & -1 \\ \end{bmatrix} $$

b) 
    $\operatorname{rank}(B)=2$. A basis for $\text{Col}(B)$ consists of the first two columns of $U$ and a basis for $\text{Col}(A)^\perp$ consists of the third column of $U$.

c) 
    If $Q$ is the matrix consisting of the first two columns of $U$, then $\widehat{{\mathbf b}} = QQ^T{\mathbf b} = \left[\begin{array}{r}2 \\ 2 \\ 6 \end{array}\right]$. Then ${\mathbf b}^\perp = {\mathbf b} - \widehat{{\mathbf b}} = \left[\begin{array}{r}-5 \\ 2 \\ 1 \end{array}\right]$.

d) 
    We solve the equation $B{\mathbf x} = \widehat{{\mathbf b}} = \left[\begin{array}{r}2 \\ 2 \\ 6 \end{array}\right]$ to find $\widehat{{\mathbf x}} =\left[\begin{array}{r}2 \\ 2 \end{array}\right]$.

:::

:::exercise {exercise-7-4-007} number=7.4.7 answered=yes src=src/exercises/exercises7-4.xml:963
PROBLEM:
Suppose that $A$ is a square $m\times m$ matrix with singular value decomposition $A=U\Sigma V^T$.

a) 
    If $A$ is invertible, find a singular value decomposition of $A^{-1}$.

b) 
    What condition on the singular values must hold for $A$ to be invertible?

c) 
    How are the singular values of $A$ and the singular values of $A^{-1}$ related to one another?

d) 
    How are the right and left singular vectors of $A$ related to the right and left singular vectors of $A^{-1}$?

ANSWER:

a) 
    $A^{-1} = V\Sigma^{-1}U^T$

b) 
    All the singular values are nonzero.

c) 
    They are reciprocals of one another.

d) 
    The left singular vectors of $A$ are the right singular vectors of $A^{-1}$ and vice versa.

SOLUTION:

a) 
    $A^{-1} = (U\Sigma^{-1}V^T)^{-1} = V\Sigma^{-1}U^T$

b) 
    We need $\operatorname{rank}(A)=m$ so all the singular values are nonzero. This means that the square matrix $\Sigma$ is invertible.

c) 
    If $\sigma_i$ are the singular values for $A$, then $1/\sigma_i$ are the singular values for $A^{-1}$.

d) 
    The left singular vectors of $A$ are the right singular vectors of $A^{-1}$ and vice versa.

:::

:::exercise {exercise-7-4-008} number=7.4.8 answered=yes src=src/exercises/exercises7-4.xml:1061
PROBLEM:

a) 
    If $Q$ is an orthogonal matrix, remember that $Q^TQ=I$. Explain why $\det Q = \pm 1$.

b) 
    If $A=U\Sigma V^T$ is a singular value decomposition of a square matrix $A$, explain why $|\det A|$ is the product of the singular values of $A$.

c) 
    What does this say about the singular values of $A$ if $A$ is invertible?

ANSWER:

a) 
    $\det(Q^TQ) = \det(Q^T)\det(Q)=\det(I)$

b) 
    $|\det(A) = |\det(U)|~|\det(\Sigma)|~|\det(V^T)|$

c) 
    All the singular values are nonzero.

SOLUTION:

a) 
    $\det(Q^TQ) = \det(Q^T)\det(Q)=(\det(Q))^2 = \det(I) = 1$ so $\det(Q) = \pm 1$.

b) 
    $|\det(A) = |\det(U)|~|\det(\Sigma)|~|\det(V^T)| = |\det(\Sigma)|$, which equals the product of the singular values.

c) 
    If $A$ is invertible, then $\det(A) \neq 0$, which says that all the singular values are nonzero.

:::

:::exercise {exercise-7-4-009} number=7.4.9 answered=yes src=src/exercises/exercises7-4.xml:1140
PROBLEM:
If $A$ is a matrix and $G=A^TA$ its Gram matrix, remember that

$$ {\mathbf x}\cdot(G{\mathbf x}) = {\mathbf x}\cdot(A^TA{\mathbf x}) = (A{\mathbf x})\cdot(A{\mathbf x}) = \left|A{\mathbf x}\right|^2. $$

a) 
    For a general matrix $A$, explain why the eigenvalues of $G$ are nonnegative.

b) 
    Given a symmetric matrix $A$ having an eigenvalue $\lambda$, explain why $\lambda^2$ is an eigenvalue of $G$.

c) 
    If $A$ is symmetric, explain why the singular values of $A$ equal the absolute value of its eigenvalues: $\sigma_j = |\lambda_j|$.

ANSWER:

a) 
    If ${\mathbf v}$ is an eigenvector of $G$ with eigenvalue $\lambda$, then ${\mathbf v}\cdot(G{\mathbf v}) = \lambda{\mathbf v}\cdot{\mathbf v}$

b) 
    If $A$ is symmetric, then $G=A^TA = A^2$.

c) 
    If $\lambda$ is an eigenvalue of $A$, then $\sigma^2 = \lambda^2$ is an eigenvalue of $G$.

SOLUTION:

a) 
    If ${\mathbf v}$ is an eigenvector of $G$ with eigenvalue $\lambda$, then ${\mathbf v}\cdot(G{\mathbf v}) = \lambda{\mathbf v}\cdot{\mathbf v}= \lambda|{\mathbf v}|^2 = |A{\mathbf v}|^2$ so $\lambda\geq0$.

b) 
    If $A$ is symmetric, then $G=A^TA = A^2$. Then if $A{\mathbf v}=\lambda {\mathbf v}$, it follows that $G{\mathbf v} = \lambda^2{\mathbf v}$.

c) 
    If $\lambda$ is an eigenvalue of $A$, then $\sigma^2 = \lambda^2$ is an eigenvalue of $G$. Then $\sigma = |\lambda|$.

:::

:::exercise {exercise-7-4-010} number=7.4.10 answered=yes src=src/exercises/exercises7-4.xml:1232
PROBLEM:
Determine whether the following statements are true or false and explain your reasoning.

a) 
    If $A=U\Sigma V^T$ is a singular value decomposition of $A$, then $G=V(\Sigma^T\Sigma)V^T$ is an orthogonal diagonalization of its Gram matrix.

b) 
    If $A=U\Sigma V^T$ is a singular value decomposition of a rank 2 matrix $A$, then ${\mathbf v}_1$ and ${\mathbf v}_2$ form an orthonormal basis for the column space $\text{Col}(A)$.

c) 
    If $A$ is a symmetric matrix, then its set of singular values is the same as its set of eigenvalues.

d) 
    If $A$ is a $10\times7$ matrix and $\sigma_7 = 4$, then the columns of $A$ are linearly independent.

e) 
    The Gram matrix is always orthogonally diagonalizable.

ANSWER:

a) 
    True

b) 
    False

c) 
    False

d) 
    True

e) 
    True

SOLUTION:

a) 
    True. Remembering that $U$ is orthogonal, we have $G = A^TA=(U\Sigma V^T)^T(U\Sigma V^T) = V\Sigma^T U^T U \Sigma V^T = V (\Sigma^T\Sigma)V^T$. Since $\Sigma^T\Sigma$ is diagonal and $V$ is orthogonal, this is an orthogonal diagonalization.

b) 
    False. They form a basis for $\text{Col}(A^T)$.

c) 
    False. The singular values are always nonnegative whereas the eigenvalues can take on any sign.

d) 
    True. This would say that $\text{Nul}(A) = \{{\mathbf 0}\}$, which implies that the columns are linearly independent.

e) 
    True. The Gram matrix is always symmetric and hence orthogonally diagonalizable.

:::

:::exercise {exercise-7-4-011} number=7.4.11 answered=yes src=src/exercises/exercises7-4.xml:1351
PROBLEM:
Suppose that $A=U\Sigma V^T$ is a singular value decomposition of the $m\times n$ matrix $A$. If $\sigma_1,\ldots,\sigma_r$ are the nonzero singular values, the general form of the matrix $\Sigma$ is

$$ \Sigma = \begin{bmatrix} \sigma_1 & \ldots & 0 & \ldots & 0 \\ 0 & \ldots & 0 & \ldots & 0 \\ 0 & \ldots & \sigma_r & \ldots & 0 \\ 0 & \ldots & 0 & \ldots & 0 \\ 0 & \vdots & 0 & \vdots & 0 \\ 0 & \ldots & 0 & \ldots & 0 \\ \end{bmatrix}. $$

a) 
    If you know that the columns of $A$ are linearly independent, what more can you say about the form of $\Sigma$?

b) 
    If you know that the columns of $A$ span ${\mathbb R}^m$, what more can you say about the form of $\Sigma$?

c) 
    If you know that the columns of $A$ are linearly independent and span ${\mathbb R}^m$, what more can you say about the form of $\Sigma$?

ANSWER:

a) 
    Every column of $\Sigma$ has a nonzero singular value.

b) 
    Every row of $\Sigma$ has a nonzero singular value.

c) 
    Then $\Sigma$ is a square matrix and every singular value is nonzero.

SOLUTION:

a) 
    If the columns are linearly independent, then $\text{Nul}(A)=\{{\mathbf 0}\}$, which means that the rank equals the number of columns. Therefore, every column of $\Sigma$ has a nonzero singular value.

b) 
    In the columns span ${\mathbb R}^m$, then $\text{Col}(A)={\mathbb R}^m$, which says that the rank equals the number of rows. Therefore, every row of $\Sigma$ has a nonzero singular value.

c) 
    Then $\Sigma$ is a square matrix and every singular value is nonzero.

:::
