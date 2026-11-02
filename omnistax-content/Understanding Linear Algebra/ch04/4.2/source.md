# 4.2 Finding eigenvalues and eigenvectors {sec-eigen-find}

The last section introduced eigenvalues and eigenvectors, presented the underlying geometric intuition behind their definition, and demonstrated their use in understanding the long-term behavior of certain systems. We will now develop a more algebraic understanding of eigenvalues and eigenvectors. In particular, we will find an algebraic method for determining the eigenvalues and eigenvectors of a square matrix.

## 4.2.1 Introduction

:::exploration {act:preview-4-2-1} Preview Activity 4.2.1
Let's begin by reviewing some important ideas that we have seen previously.
PROBLEM:
a) Suppose that $A$ is a square matrix and that the nonzero vector ${\mathbf x}$ is a solution to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$. What can we conclude about the invertibility of $A$?
b) How does the determinant $\det(A)$ tell us if there is a nonzero solution to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$?
c) Suppose that

    $$ A = \left[\begin{array}{rrr} 3 & -1 & 1 \\ 0 & 2 & 4 \\ 1 & 1 & 3 \\ \end{array}\right] $$

    . Find the determinant $\det(A)$. What does this tell us about the solution space to the homogeneous equation $A{\mathbf x} = {\mathbf 0}$?
d) Find a basis for $\text{Nul}(A)$.
e) What is the relationship between the rank of a matrix and the dimension of its null space?
SOLUTION:
a) The matrix cannot have a pivot position in every column so it is not invertible.
b) If there is a nonzero solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$, then $A$ is not invertible so $\det(A) = 0$.
c) We find that $\det(A) = 0$ so there is a nonzero solution to the homogeneous equation.
d) The reduced row echelon form of $A$ is

    $$ \left[\begin{array}{rrr} 1 & 0 & 1 \\ 0 & 1 & 2 \\ 0 & 0 & 0 \\ \end{array}\right] $$

    so the solution space to the homogeneous equation may be described parametrically as $x=x_3\left[\begin{array}{r}-1 \\ -2 \\ 1 \end{array}\right]$. A basis for $\text{Nul}(A)$ is therefore $\left[\begin{array}{r}-1 \\ -2 \\ 1 \end{array}\right]$.
e) If $A$ is an $n\times n$ matrix, then $\dim~\text{Nul}(A) = n-\operatorname{rank}(A)$.
:::

## 4.2.2 The characteristic polynomial

We will first see that the eigenvalues of a square matrix appear as the roots of a particular polynomial. To begin, notice that we originally defined an eigenvector as a nonzero vector ${\mathbf v}$ that satisfies the equation $A{\mathbf v} = \lambda{\mathbf v}$. We will rewrite this as

$$ \begin{aligned} A{\mathbf v} & {}={} \lambda{\mathbf v} \\ A{\mathbf v} - \lambda{\mathbf v} & {}={} {\mathbf 0} \\ A{\mathbf v} - \lambda I{\mathbf v} & {}={} {\mathbf 0} \\ (A-\lambda I){\mathbf v} & {}={} {\mathbf 0}\text{.} \\ \end{aligned} $$

In other words, an eigenvector ${\mathbf v}$ is a solution of the homogeneous equation $(A-\lambda I){\mathbf v}={\mathbf 0}$. This puts us in the familiar territory explored in the next activity.

:::activity {act:activity-4-2-2} Activity 4.2.2
The eigenvalues of a square matrix are defined by the condition that there be a nonzero solution to the homogeneous equation $(A-\lambda I){\mathbf v}={\mathbf 0}$.

a) 
    If there is a nonzero solution to the homogeneous equation $(A-\lambda I){\mathbf v} = {\mathbf 0}$, what can we conclude about the invertibility of the matrix $A-\lambda I$?

b) 
    If there is a nonzero solution to the homogeneous equation $(A-\lambda I){\mathbf v} = {\mathbf 0}$, what can we conclude about the determinant $\det(A-\lambda I)$?

c) 
    Let's consider the matrix

    $$ A = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right] $$

    from which we construct

    $$ A-\lambda I = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right] - \lambda \left[\begin{array}{rr} 1 & 0 \\ 0 & 1 \\ \end{array}\right] = \left[\begin{array}{rr} 1-\lambda & 2 \\ 2 & 1-\lambda \\ \end{array}\right] $$

    . Find the determinant $\det(A-\lambda I)$. What kind of equation do you obtain when we set this determinant to zero to obtain $\det(A-\lambda I) = 0$?

d) 
    Use the determinant you found in the previous part to find the eigenvalues $\lambda$ by solving the equation $\det(A-\lambda I) = 0$. We considered this matrix in [Activity 4.1.2](ref:4.1#activity-eigen-geom) so we should find the same eigenvalues for $A$ that we found by reasoning geometrically there.

e) 
    Consider the matrix $A = \left[\begin{array}{rr} 2 & 1 \\ 0 & 2 \\ \end{array}\right]$ and find its eigenvalues by solving the equation $\det(A-\lambda I) = 0$.

f) 
    Consider the matrix $A = \left[\begin{array}{rr} 0 & -1 \\ 1 & 0 \\ \end{array}\right]$ and find its eigenvalues by solving the equation $\det(A-\lambda I) = 0$.

g) 
    Find the eigenvalues of the triangular matrix $\left[\begin{array}{rrr} 3 & -1 & 4 \\ 0 & -2 & 3 \\ 0 & 0 & 1 \\ \end{array}\right]$. What is generally true about the eigenvalues of a triangular matrix?

SOLUTION:

a) 
    The matrix $A-\lambda I$ cannot be invertible.

b) 
    It must be the case that $\det(A-\lambda I) = 0$.

c) 
    We find that $\det(A-\lambda I) = \lambda^2 - 2\lambda - 3 = 0$.

d) 
    $\lambda^2 - 2\lambda - 3= (\lambda-3)(\lambda+1) = 0$ so we find eigenvalues $\lambda = 3$ and $\lambda = -1$.

e) 
    For this matrix, we have $\det(A-\lambda I) = (\lambda-2)^2=0$ so there is one eigenvalue, $\lambda = 2$.

f) 
    $\det(A-\lambda I) = \lambda^2 + 1 = 0$ so there are complex eigenvalues, $\lambda = i$ and $\lambda = -i$.

g) 
    Because the determinant of a triangular matrix equals the product of its diagonal entries, The eigenvalues are equal to the entries on the diagonal.

:::

This activity demonstrates a technique that enables us to find the eigenvalues of a square matrix $A$. Since an eigenvalue $\lambda$ is a scalar for which the equation $(A-\lambda I){\mathbf v} = {\mathbf 0}$ has a nonzero solution, it must be the case that $A-\lambda I$ is not invertible. Therefore, its determinant is zero. This gives us the equation

$$ \det(A-\lambda I) = 0 $$

whose solutions are the eigenvalues of $A$. This equation is called the *characteristic equation* of $A$. {index-entry:characteristic equation}

:::example {ex:example-eigenvalues-poly} Example 4.2.1
If we write the characteristic equation for the matrix $A = \left[\begin{array}{rr} -4 & 4 \\ -12 & 10 \\ \end{array}\right]$, we see that

$$ \begin{aligned} \det(A-\lambda I) & {}={} 0 \\ \\ \det \left[\begin{array}{rr} -4 - \lambda & 4 \\ -12 & 10 - \lambda \\ \end{array}\right] & {}={} 0 \\ \\ (-4-\lambda)(10-\lambda) + 48 & {}={} 0 \\ \lambda^2-6\lambda + 8 {}={} 0 \\ (\lambda-4)(\lambda-2) {}={} 0\text{.} \\ \end{aligned} $$

This shows us that the eigenvalues are $\lambda = 4$ and $\lambda=2$.
:::

{index-entry:characteristic polynomial} In general, the expression $\det(A-\lambda I)$ is a polynomial in $\lambda$, which is called the *characteristic polynomial* of $A$. If $A$ is an $n\times n$ matrix, the degree of the characteristic polynomial is $n$. For instance, if $A$ is a $2\times2$ matrix, then $\det(A-\lambda I)$ is a quadratic polynomial; if $A$ is a $3\times3$ matrix, then $\det(A-\lambda I)$ is a cubic polynomial.

The matrix in [Example 4.2.1](ref:example-eigenvalues-poly) has a characteristic polynomial with two real and distinct roots. This will not always be the case, as demonstrated in the next two examples.

:::example {ex:example-4-2-2} Example 4.2.2
Consider the matrix $A=\begin{bmatrix} 5 & -1\\ 4 & 1 \\ \end{bmatrix}$, whose characteristic equation is

$$ \lambda^2 - 6\lambda + 9 = (\lambda-3)^2 = 0. $$

In this case, the characteristic polynomial has one real root, which means that this matrix has a single real eigenvalue, $\lambda = 3$.
:::

:::example {ex:example-4-2-3} Example 4.2.3
To find the eigenvalues of a triangular matrix, we remember that the determinant of a triangular matrix is the product of the entries on the diagonal. For instance, the following triangular matrix has the characteristic equation

$$ \begin{aligned} \det\left( \left[\begin{array}{rrr} 4 & 2 & 3 \\ 0 & -2 & -1 \\ 0 & 0 & 3 \\ \end{array}\right] -\lambda I\right) & {}={} \det \left[\begin{array}{rrr} 4-\lambda & 2 & 3 \\ 0 & -2-\lambda & -1 \\ 0 & 0 & 3-\lambda \\ \end{array}\right] \\ \\ & {}={}(4-\lambda)(-2-\lambda)(3-\lambda) = 0\text{,} \end{aligned} $$

showing that the eigenvalues are the diagonal entries $\lambda = 4,-2,3$.
:::

## 4.2.3 Finding eigenvectors

Now that we can find the eigenvalues of a square matrix $A$ by solving the characteristic equation $\det(A-\lambda I) = 0$, we will turn to the question of finding the eigenvectors associated to an eigenvalue $\lambda$. The key, as before, is to note that an eigenvector is a nonzero solution to the homogeneous equation $(A-\lambda I){\mathbf v} = {\mathbf 0}$. In other words, the eigenvectors associated to an eigenvalue $\lambda$ form the null space $\text{Nul}(A-\lambda I)$.

This shows that the eigenvectors associated to an eigenvalue form a subspace of ${\mathbb R}^n$. We will denote the subspace of eigenvectors of a matrix $A$ associated to the eigenvalue $\lambda$ by $E_\lambda$ and note that

$$ E_\lambda = \text{Nul}(A-\lambda I) $$

. We say that $E_\lambda$ is the *eigenspace* of $A$ associated to the eigenvalue $\lambda$. {index-entry:eigenspace}

:::activity {act:activity-4-2-3} Activity 4.2.3
In this activity, we will find the eigenvectors of a matrix as the null space of the matrix $A-\lambda I$.

a) 
    Let's begin with the matrix $A = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$. We have seen that $\lambda = 3$ is an eigenvalue. Form the matrix $A-3I$ and find a basis for the eigenspace $E_3 = \text{Nul}(A-3I)$. What is the dimension of this eigenspace? For each of the basis vectors ${\mathbf v}$, verify that $A{\mathbf v} = 3{\mathbf v}$.

b) 
    We also saw that $\lambda = -1$ is an eigenvalue. Form the matrix $A-(-1)I$ and find a basis for the eigenspace $E_{-1}$. What is the dimension of this eigenspace? For each of the basis vectors ${\mathbf v}$, verify that $A{\mathbf v} = -{\mathbf v}$.

c) 
    Is it possible to form a basis of ${\mathbb R}^2$ consisting of eigenvectors of $A$?

d) 
    Now consider the matrix $A = \left[\begin{array}{rr} 3 & 0 \\ 0 & 3 \\ \end{array}\right]$. Write the characteristic equation for $A$ and use it to find the eigenvalues of $A$. For each eigenvalue, find a basis for its eigenspace $E_\lambda$. Is it possible to form a basis of ${\mathbb R}^2$ consisting of eigenvectors of $A$?

e) 
    Next, consider the matrix $A = \left[\begin{array}{rr} 2 & 1 \\ 0 & 2 \\ \end{array}\right]$. Write the characteristic equation for $A$ and use it to find the eigenvalues of $A$. For each eigenvalue, find a basis for its eigenspace $E_\lambda$. Is it possible to form a basis of ${\mathbb R}^2$ consisting of eigenvectors of $A$?

f) 
    Finally, find the eigenvalues and eigenvectors of the diagonal matrix $A = \left[\begin{array}{rr} 4 & 0 \\ 0 & -1 \\ \end{array}\right]$. Explain your result by considering the geometric effect of the matrix transformation defined by $A$.

SOLUTION:

a) 
    We have

    $$ A - 3I = \left[\begin{array}{rr}-2 \amp 2 \\ 2 \amp -2 \\ \end{array}\right] \sim \left[\begin{array}{rr}1 \amp -1 \\ 0 \amp 0 \\ \end{array}\right]\text{.} $$

    The null space $\text{Nul}(A-3I)$ is one-dimensional with basis $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$.

b) 
    We have

    $$ A - (-1)I = \left[\begin{array}{rr}2 \amp 2 \\ 2 \amp 2 \\ \end{array}\right] \sim \left[\begin{array}{rr}1 \amp 1 \\ 0 \amp 0 \\ \end{array}\right]\text{.} $$

    The null space $\text{Nul}(A+I)$ is one-dimensional with basis $\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.

c) 
    We can form a basis for ${\mathbb R}^2$ consisting of eigenvectors of $A$ by taking $\left\{\left[\begin{array}{r}1 \\ 1 \end{array}\right], \left[\begin{array}{r}-1 \\ 1 \end{array}\right]\right\}$.

d) 
    The characteristic equation is $(3-\lambda)^2 = 0$, which means that there is a single eigenvalue $\lambda=3$. This eigenspace is two-dimensional with basis $\left\{\left[\begin{array}{r}1 \\ 0 \end{array}\right],\left[\begin{array}{r}0 \\ 1 \end{array}\right]\right\}$. In this case, we can form a basis for ${\mathbb R}^2$ consisting of eigenvectors of $A$.

e) 
    The characteristic equation is $(2-\lambda)^2 = 0$ so there is again a single eigenvalue $\lambda=2$. In this case, the eigenspace is one-dimensional with basis vector $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$. It is not possible to form a basis for ${\mathbb R}^2$ consisting of eigenvectors.

f) 
    We have eigenvectors $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$ with associated eigenvector $\lambda=4$ and $\left[\begin{array}{r}0 \\ 1 \end{array}\right]$ with associated eigenvector $\lambda=-1$.

:::

Once we find an eigenvalue of a matrix $A$, describing the associated eigenspace $E_\lambda$ amounts to the familiar task of describing the null space $\text{Nul}(A-\lambda I)$.

:::example {ex:example-4-2-4} Example 4.2.4
Revisiting the matrix $A = \left[\begin{array}{rr} -4 & 4 \\ -12 & 10 \\ \end{array}\right]$ from [Example 4.2.1](ref:example-eigenvalues-poly), we recall that we found eigenvalues $\lambda = 4$ and $\lambda = 2$.
Considering the eigenvalue $\lambda = 4$, we have

$$ A -4I = \begin{bmatrix} -8 & 4 \\ -12 & 6 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & -1/2 \\ 0 & 0 \\ \end{bmatrix}. $$

Since the eigenvectors ${\mathbf v} = \left[\begin{array}{r}v_1 \\ v_2 \end{array}\right]$ are the solutions of the equation $(A-4I){\mathbf v}={\mathbf 0}$, we see that they are determined by the single equation $v_1-\frac12 v_2 = 0$ or $v_1 = \frac12v_2$. Therefore the eigenvectors in $E_4$ have the form

$$ {\mathbf v}=\left[\begin{array}{r}v_1 \\ v_2 \end{array}\right] = \left[\begin{array}{c}\frac12 v_2 \\ v_2 \end{array}\right] = v_2\left[\begin{array}{c}1/2 \\ 1 \end{array}\right]. $$

In other words, $E_4$ is a one-dimensional subspace of ${\mathbb R}^2$ with basis vector $\left[\begin{array}{c}1/2 \\ 1 \end{array}\right]$ or basis vector $\left[\begin{array}{r}1 \\ 2 \end{array}\right]$. In the same way, we find that a basis for the eigenspace $E_2$ is $\left[\begin{array}{r}2 \\ 3 \end{array}\right]$.
We note that, for this matrix, it is possible to construct a basis of ${\mathbb R}^2$ consisting of eigenvectors, namely,

$$ {\cal B} = \left\{\left[\begin{array}{r}1 \\ 2 \end{array}\right], \left[\begin{array}{r}2 \\ 3 \end{array}\right]\right\}. $$

:::

:::example {ex:example-4-2-5} Example 4.2.5
Consider the matrix $A=\begin{bmatrix} 1 & 1 \\ -1 & 3 \\ \end{bmatrix}$ whose characteristic equation is

$$ \det(A-\lambda I) = \lambda^2 - 4\lambda + 4 = (\lambda-2)^2 =0. $$

There is a single eigenvalue $\lambda= 2$, and we find that

$$ A - 2\lambda = \begin{bmatrix} -1 & 1 \\ -1 & 1 \\ \end{bmatrix} \sim \begin{bmatrix} 1 & -1 \\ 0 & 0 \\ \end{bmatrix}. $$

Therefore, the eigenspace $E_2 = \text{Nul}(A-2I)$ is one-dimensional with a basis vector $\left[\begin{array}{r}1 \\ 1 \end{array}\right]$.
:::

:::example {ex:example-4-2-6} Example 4.2.6
If $A=\begin{bmatrix} -1 & 0 \\ 0 & -1 \\ \end{bmatrix}$, then

$$ \det(A - \lambda I) = (\lambda+1)^2 = 0, $$

which implies that there is a single eigenvalue $\lambda=-1$. We find that

$$ A-(-1)I = \begin{bmatrix} 0 & 0 \\ 0 & 0 \\ \end{bmatrix}, $$

which says that every two-dimensional vector ${\mathbf v}$ satisfies $(A-(-1)I){\mathbf v} = {\mathbf 0}$. Therefore, every vector is an eigenvector and so $E_{-1} = {\mathbb R}^2$. This eigenspace is two-dimensional.
We can see this in another way. The matrix transformation defined by $A$ rotates vectors by $180^\circ$, which says that $A{\mathbf x} = -{\mathbf x}$ for every vector ${\mathbf x}$. In other words, every two-dimensional vector is an eigenvector with associated eigenvalue $\lambda=-1$.
:::

These last two examples illustrate two types of behavior when there is a single eigenvalue. In one case, we are able to construct a basis of ${\mathbb R}^2$ using eigenvectors; in the other, we are not. We will explore this behavior more in the next subsection.

:::assemblage {asm:assemblage-} A check on our work
When finding eigenvalues and their associated eigenvectors in this way, we first find eigenvalues $\lambda$ by solving the characteristic equation. If $\lambda$ is a solution to the characteristic equation, then $A-\lambda I$ is not invertible and, consequently, $A-\lambda I$ must contain a row without a pivot position.
This serves as a check on our work. If we row reduce $A-\lambda I$ and find the identity matrix, then we have made an error either in solving the characteristic equation or in finding $\text{Nul}(A-\lambda I)$.
:::

## 4.2.4 The characteristic polynomial and the dimension of eigenspaces

Given a square $n\times n$ matrix $A$, we saw in the previous section the value of being able to express any vector in ${\mathbb R}^n$ as a linear combination of eigenvectors of $A$. For this reason, [Question 4.1.8](ref:4.1#question-eigen-basis) asks when we can construct a basis of ${\mathbb R}^n$ consisting of eigenvectors. We will explore this question more fully now.

As we saw above, the eigenvalues of $A$ are the solutions of the characteristic equation $\det(A-\lambda I) = 0$. The examples we have considered demonstrate some different types of behavior. For instance, we have seen the characteristic equations

- 
    $(4-\lambda)(-2-\lambda)(3-\lambda) = 0$, which has real and distinct roots,

- 
    $(2-\lambda)^2 = 0$, which has repeated roots, and

- 
    $\lambda^2 +1 = (i-\lambda)(-i-\lambda) = 0$, which has complex roots.

If $A$ is an $n\times n$ matrix, then the characteristic polynomial is a degree $n$ polynomial, and this means that it has $n$ roots. Therefore, the characteristic equation can be written as

$$ \det(A-\lambda I) = (\lambda_1 - \lambda)(\lambda_2-\lambda)\ldots(\lambda_n-\lambda) = 0 $$

giving eigenvalues $\lambda_1, \lambda_2,\ldots,\lambda_n$. As we have seen, some of the eigenvalues may be complex. Moreover, some of the eigenvalues may appear in this list more than once. However, we can always write the characteristic equation in the form

$$ (\lambda_1-\lambda)^{m_1} (\lambda_2-\lambda)^{m_2} \ldots (\lambda_p-\lambda)^{m_p} = 0. $$

The number of times that $\lambda_j - \lambda$ appears as a factor in the characteristic polynomial, is called the *multiplicity* of the eigenvalue $\lambda_j$. {index-entry:multiplicity}

:::example {ex:example-4-2-7} Example 4.2.7
We have seen that the matrix $A = \left[\begin{array}{rr} 1 & 1 \\ -1 & 3 \\ \end{array}\right]$ has the characteristic equation $(2-\lambda)^2 = 0$. This matrix has a single eigenvalue $\lambda = 2$, which has multiplicity $2$.
:::

:::example {ex:example-4-2-8} Example 4.2.8
If a matrix has the characteristic equation

$$ (4-\lambda)^2(-5-\lambda)(1-\lambda)^7(3-\lambda)^2 = 0 $$

, then that matrix has four eigenvalues: $\lambda=4$ having multiplicity 2; $\lambda=-5$ having multiplicity 1; $\lambda=1$ having multiplicity 7; and $\lambda=3$ having multiplicity 2. The degree of the characteristic polynomial is the sum of the multiplicities $2+1+7+2 = 12$ so this matrix must be a $12\times12$ matrix.
:::

The multiplicities of the eigenvalues are important because they influence the dimension of the eigenspaces. We know that the dimension of an eigenspace must be at least one; the following proposition also tells us the dimension of an eigenspace can be no larger than the multiplicity of its associated eigenvalue.

:::proposition {prop:prop-eigen-basis} Proposition 4.2.9
If $\lambda$ is a real eigenvalue of the matrix $A$ with multiplicity $m$, then

$$ 1 \leq \dim~E_\lambda \leq m $$

.
:::

:::example {ex:example-4-2-10} Example 4.2.10
The diagonal matrix $\left[\begin{array}{rr} -1 & 0 \\ 0 & -1 \\ \end{array}\right]$ has the characteristic equation $(-1-\lambda)^2 = 0$. There is a single eigenvalue $\lambda = -1$ having multiplicity $m = 2$, and we saw earlier that $\dim E_{-1} = 2 \leq m = 2$.
:::

:::example {ex:example-4-2-11} Example 4.2.11
The matrix $\left[\begin{array}{rr} 1 & 1 \\ -1 & 3 \\ \end{array}\right]$ has the characteristic equation $(2-\lambda)^2 = 0$. This tells us that there is a single eigenvalue $\lambda = 2$ having multiplicity $m = 2$. In contrast with the previous example, we have $\dim~ E_2 = 1 \leq m = 2$.
:::

:::example {ex:example-4-2-12} Example 4.2.12
We saw earlier that the matrix $\left[\begin{array}{rrr} 4 & 2 & 3 \\ 0 & -2 & -1 \\ 0 & 0 & 3 \\ \end{array}\right]$ has the characteristic equation

$$ (4-\lambda)(-2-\lambda)(3-\lambda)=0 $$

. There are three eigenvalues $\lambda=3,-2,1$ each having multiplicity $1$. By the proposition, we are guaranteed that the dimension of each eigenspace is $1$; that is,

$$ \dim E_3 = \dim E_{-2} = \dim E_1 = 1 $$

. It turns out that this is enough to guarantee that there is a basis of ${\mathbb R}^3$ consisting of eigenvectors.
:::

:::example {ex:example-4-2-13} Example 4.2.13
If a $12\times12$ matrix has the characteristic equation

$$ (4-\lambda)^2(-5-\lambda)(1-\lambda)^7(3-\lambda)^2 = 0 $$

, we know there are four eigenvalues $\lambda=4,-5,1,3$. Without more information, all we can say about the dimensions of the eigenspaces is

$$ \begin{aligned} 1 \leq \dim E_4 & {}\leq{} 2 \\ 1 \leq \dim E_{-5} & {}\leq{} 1 \\ 1 \leq \dim E_1 & {}\leq{} 7 \\ 1 \leq \dim E_3 & {}\leq{} 2\text{.} \\ \end{aligned} $$

We can guarantee that $\dim E_{-5} = 1$, but we cannot be more specific about the dimensions of the other eigenspaces.
:::

Fortunately, if we have an $n\times n$ matrix, it frequently happens that the characteristic equation has the form

$$ (\lambda_1-\lambda) (\lambda_2-\lambda) \ldots (\lambda_n-\lambda) = 0 $$

where there are $n$ distinct real eigenvalues, each of which has multiplicity $1$. In this case, the dimension of each of the eigenspaces $\dim E_{\lambda_j} = 1$. With a little work, it can be seen that choosing a basis vector ${\mathbf v}_j$ for each of the eigenspaces produces a basis for ${\mathbb R}^n$. We therefore have the following proposition.

:::proposition {prop:proposition-4-2-14} Proposition 4.2.14
If $A$ is an $n\times n$ matrix having $n$ distinct real eigenvalues, then there is a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$.
:::

This proposition provides one answer to our [Question 4.1.8](ref:4.1#question-eigen-basis). The next activity explores this question further.

:::activity {act:activity-4-2-4} Activity 4.2.4

a) 
    Identify the eigenvalues, and their multiplicities, of an $n\times n$ matrix whose characteristic polynomial is $(2-\lambda)^3(-3-\lambda)^{10}(5-\lambda)$. What can you conclude about the dimensions of the eigenspaces? What is the shape of the matrix? Do you have enough information to guarantee that there is a basis of ${\mathbb R}^n$ consisting of eigenvectors?

b) 
    Find the eigenvalues of $\left[\begin{array}{rr} 0 & -1 \\ 4 & -4 \\ \end{array}\right]$ and state their multiplicities. Can you find a basis of ${\mathbb R}^2$ consisting of eigenvectors of this matrix?

c) 
    Consider the matrix $A = \left[\begin{array}{rrr} -1 & 0 & 2 \\ -2 & -2 & -4 \\ 0 & 0 & -2 \\ \end{array}\right]$ whose characteristic equation is

    $$ (-2-\lambda)^2(-1-\lambda) = 0 $$

    .

    1. 
        Identify the eigenvalues and their multiplicities.

    2. 
        For each eigenvalue $\lambda$, find a basis of the eigenspace $E_\lambda$ and state its dimension.

    3. 
        Is there a basis of ${\mathbb R}^3$ consisting of eigenvectors of $A$?

d) 
    Now consider the matrix $A = \left[\begin{array}{rrr} -5 & -2 & -6 \\ -2 & -2 & -4 \\ 2 & 1 & 2 \\ \end{array}\right]$ whose characteristic equation is also

    $$ (-2-\lambda)^2(-1-\lambda) = 0 $$

    .

    1. 
        Identify the eigenvalues and their multiplicities.

    2. 
        For each eigenvalue $\lambda$, find a basis of the eigenspace $E_\lambda$ and state its dimension.

    3. 
        Is there a basis of ${\mathbb R}^3$ consisting of eigenvectors of $A$?

e) 
    Consider the matrix $A = \left[\begin{array}{rrr} -5 & -2 & -6 \\ 4 & 1 & 8 \\ 2 & 1 & 2 \\ \end{array}\right]$ whose characteristic equation is

    $$ (-2-\lambda)(1-\lambda)(-1-\lambda) = 0 $$

    .

    1. 
        Identify the eigenvalues and their multiplicities.

    2. 
        For each eigenvalue $\lambda$, find a basis of the eigenspace $E_\lambda$ and state its dimension.

    3. 
        Is there a basis of ${\mathbb R}^3$ consisting of eigenvectors of $A$?

SOLUTION:

a) 
    There are three eigenvalues, $\lambda=2$ has multiplicity $3$, $\lambda=-3$ has multiplicity $10$, and $\lambda=5$ has multiplicity $1$. We know that

    $$ \begin{aligned} 1 \leq \dim E_2 & {}\leq{} 3 \\ 1 \leq \dim E_{-3} & {}\leq{} 10 \\ 1 \leq \dim E_5 & {}\leq{} 1\text{.} \\ \end{aligned} $$

    We can guarantee that $\dim E_{5} = 1$, but we can say nothing further about the other two eigenspaces.

    The dimension of the matrix is $14\times14$ since the degree of the characteristic polynomial is $14$. We cannot guarantee that we can form a basis for ${\mathbb R}^{14}$ consisting of eigenvectors, however.

b) 
    There is one eigenvalue $\lambda=-2$ having multiplicity two. Because the eigenspace $E_{-2}$ is one-dimensional, however, we cannot find a basis for ${\mathbb R}^2$ consisting of eigenvectors of $A$.

c) 
    For the $3\times3$ matrix $A$,

    1. 
        We have eigenvalues $\lambda=-2$ with multiplicity $2$ and $\lambda=-1$ with multiplicity $1$.

    2. 
        The eigenspace $E_{-2}$ is two-dimensional with basis $\left\{\left[\begin{array}{r}-2 \\ 0 \\ 1 \end{array}\right],\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right]\right\}$. The eigenspace $E_{-1}$ is one-dimensional with basis vector $\left[\begin{array}{r}-1 \\ 2 \\ 0 \end{array}\right]$.

    3. 
        We are able to form a basis for ${\mathbb R}^3$ consisting of eigenvectors of $A$.

d) 
    For the $3\times3$ matrix $A$,

    1. 
        We have eigenvalues $\lambda=-2$ with multiplicity $2$ and $\lambda=-1$ with multiplicity $1$.

    2. 
        The eigenspace $E_{-2}$ is one-dimensional with basis vector $\left[\begin{array}{r}-2 \\ 0 \\ 1 \end{array}\right]$. The eigenspace $E_{-1}$ is also one-dimensional with basis vector $\left[\begin{array}{r}-1 \\ 2 \\ 0 \end{array}\right]$.

    3. 
        It is not possible to form a basis for ${\mathbb R}^3$ consisting of eigenvectors of $A$.

e) 
    For this matrix,

    1. 
        There are three eigenvalues $\lambda=-2$, $-1$, and $1$, each having multiplicity $1$.

    2. 
        A basis vector for the eigenspace $E_{-2}$ is $\left[\begin{array}{r}-2 \\ 0 \\ 1 \end{array}\right]$. A basis vector for the eigenspace $E_{-1}$ is $\left[\begin{array}{r}1 \\ -2 \\ 0 \end{array}\right]$. A basis vector for the eigenspace $E_{1}$ is $\left[\begin{array}{r}-2 \\ 3 \\ 1 \end{array}\right]$.

    3. 
        We can form a basis for ${\mathbb R}^3$ consisting of eigenvectors of $A$.

:::

## 4.2.5 Using Sage to find eigenvalues and eigenvectors

We can use Sage to find the characteristic polynomial, eigenvalues, and eigenvectors of a matrix. As we will see, however, some care is required when dealing with matrices whose entries include decimals.

:::activity {act:activity-4-2-5} Activity 4.2.5
We will use Sage to find the eigenvalues and eigenvectors of a matrix. Let's begin with the matrix $A = \left[\begin{array}{rr} -3 & 1 \\ 0 & -3 \\ \end{array}\right]$.

a) 
    We can find the characteristic polynomial of $A$ by writing `A.charpoly('lambda')`. Notice that we have to give Sage a variable in which to write the polynomial; here, we use `lambda` though `x` works just as well.

    :::sage
    ```sage
    A = matrix(2,2,[-3,1,0,-3])
    A.charpoly('lambda')

    ```
    :::

    The factored form of the characteristic polynomial may be more useful since it will tell us the eigenvalues and their multiplicities. The factored characteristic polynomial is found with `A.fcp('lambda')`.

    :::sage
    ```sage
    A = matrix(2,2,[-3,1,0,-3])
    A.fcp('lambda')

    ```
    :::

b) 
    If we only want the eigenvalues, we can use `A.eigenvalues()`.

    :::sage
    ```sage
    A = matrix(2,2,[-3,1,0,-3])
    A.eigenvalues()

    ```
    :::

    Notice that the multiplicity of an eigenvalue is the number of times it is repeated in the list of eigenvalues.

c) 
    Finally, we can find eigenvectors by `A.eigenvectors_right()`. (We are looking for *right* eigenvalues since the vector ${\mathbf v}$ appears to the right of $A$ in the definition $A{\mathbf v}=\lambda {\mathbf v}$.)

    :::sage
    ```sage
    A = matrix(2,2,[-3,1,0,-3])
    A.eigenvectors_right()

    ```
    :::

    At first glance, the result of this command can be a little confusing to interpret. What we see is a list with one entry for each eigenvalue. For each eigenvalue, there is a triple consisting of (i) the eigenvalue $\lambda$, (ii) a basis for $E_\lambda$, and (iii) the multiplicity of $\lambda$.

d) 
    When working with decimal entries, which are called *floating point numbers* in computer science, we must remember that computers perform only approximate arithmetic. This is a problem when we wish to find the eigenvectors of such a matrix. To illustrate, consider the matrix $A=\left[\begin{array}{rr} 0.4 & 0.3 \\ 0.6 & 0.7 \\ \end{array}\right]$.

    1. 
        Without using Sage, find the eigenvalues of this matrix.

    2. 
        What do you find for the reduced row echelon form of $A-I$?

    3. 
        Let's now use Sage to determine the reduced row echelon form of $A-I$:

        :::sage
        ```sage
        A = matrix(2,2,[0.4,0.3,0.6,0.7])
        (A-identity_matrix(2)).rref()

        ```
        :::

        What result does Sage report for the reduced row echelon form? Why is this result not correct?

    4. 
        Because the arithmetic Sage performs with floating point entries is only approximate, we are not able to find the eigenspace $E_1$. In this next chapter, we will learn how to address this issue. In the meantime, we can get around this problem by writing the entries in the matrix as rational numbers:

        :::sage
        ```sage
        A = matrix(2,2,[4/10,3/10,6/10,7/10])
        A.eigenvectors_right()

        ```
        :::

SOLUTION:

a) 
    The `fcp` command will return the factored characteristic polynomial `lambda^2 - 2*lambda - 3`.

b) 
    The `eigenvalues` command returns a list of eigenvalues `[-3, -3]`.

c) 
    The `eigenvectors_right` command returns `[(-3, [(1, 0)], 2)]`.

d) 
    If we begin with the matrix $A$, we find

    1. 
        The eigenvalues are $\lambda=1$ and $\lambda=0.1$.

    2. 
        The reduced row echelon form is $\left[\begin{array}{rr}-2 \amp 1 \\ 0 \amp 0 \\ \end{array}\right]$, which shows that $A-I$ is not invertible, as expected.

    3. 
        Sage returns $\left[\begin{array}{rr}1 \amp 0 \\ 0 \amp 1 \\ \end{array}\right]$, which is not correct because $A-I$ cannot be invertible if $\lambda=1$ is an eigenvalue of $A$.

    4. 
        Here we find the correct eigenvalues, $\lambda=1$ with basis vector $\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ for $E_1$ and $\lambda=0.1$ with basis vector $\left[\begin{array}{r}1 \\ -1 \end{array}\right]$ for $E_{0.1}$.

:::

## 4.2.6 Summary

In this section, we developed a technique for finding the eigenvalues and eigenvectors of an $n\times n$ matrix $A$.

- 
    The expression $\det(A-\lambda I)$ is a degree $n$ polynomial, known as the characteristic polynomial of $A$. The eigenvalues of $A$ are the roots of the characteristic polynomial found by solving the characteristic equation $\det(A-\lambda I) = 0$.

- 
    The set of eigenvectors associated to the eigenvalue $\lambda$ forms a subspace of ${\mathbb R}^n$, the eigenspace $E_\lambda = \text{Nul}(A-\lambda I)$.

- 
    If the factor $(\lambda_j - \lambda)$ appears $m_j$ times in the characteristic polynomial, we say that the eigenvalue $\lambda_j$ has multiplicity $m_j$ and note that

    $$ 1 \leq \dim E_{\lambda_j} \leq m_j $$

    .

- 
    If each of the eigenvalues is real and has multiplicity $1$, then we can form a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$.

- 
    We can use Sage to find the eigenvalues and eigenvalues of matrices. However, we need to be careful working with floating point numbers since floating point arithmetic is only an approximation.

## 4.2.7 Exercises

:::exercise {exercise-4-2-001} number=4.2.1 answered=yes src=src/exercises/exercises4-2.xml:4
PROBLEM:
For each of the following matrices, find its characteristic polynomial, its eigenvalues, and the multiplicity of each eigenvalue.

a) 
    $A=\left[\begin{array}{rr} 4 & -1 \\ 4 & 0 \\ \end{array}\right]$.

b) 
    $A=\left[\begin{array}{rrr} 3 & -1 & 3 \\ 0 & 4 & 0 \\ 0 & 0 & -6 \end{array}\right]$.

c) 
    $A = \left[\begin{array}{rr} -2 & 0 \\ 0 & -2 \\ \end{array}\right]$.

d) 
    $A=\left[\begin{array}{rr} -1 & 2 \\ 2 & 2 \\ \end{array}\right]$.

ANSWER:

a) 
    $(2-\lambda)^2$. There is a single eigenvalue $\lambda=2$ having multiplicity $2$.

b) 
    $(3-\lambda)(4-\lambda)(-6-\lambda)$. There are three eigenvalues $\lambda=3, 4, -6$, each of multiplicity $1$.

c) 
    $(-2-\lambda)^2$. There is one eigenvalue $\lambda=-2$ having multiplicity $2$.

d) 
    $(3-\lambda)(-2-\lambda)$. There are two eigenvalues $\lambda=3$ and $\lambda=-2$, each having multiplicity $1$.

SOLUTION:

a) 
    The characteristic polynomial is $\det(A-\lambda I) = (2-\lambda)^2$. There is a single eigenvalue $\lambda=2$ having multiplicity $2$.

b) 
    The characteristic polynomial is $\det(A-\lambda I) = (3-\lambda)(4-\lambda)(-6-\lambda)$. There are three eigenvalues $\lambda=3, 4, -6$, each of multiplicity $1$.

c) 
    The characteristic polynomial is $\det(A-\lambda I) = (-2-\lambda)^2$, showing that there is one eigenvalue $\lambda=-2$ having multiplicity $2$.

d) 
    The characteristic polynomial is $\det(A-\lambda I) = (3-\lambda)(-2-\lambda)$. There are two eigenvalues $\lambda=3$ and $\lambda=-2$, each having multiplicity $1$.

:::

:::exercise {exercise-4-2-002} number=4.2.2 answered=yes src=src/exercises/exercises4-2.xml:96
PROBLEM:
Given an $n\times n$ matrix $A$, an important question, [Question 4.1.8](ref:4.1#question-eigen-basis), asks whether we can find a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$. For each of the matrices in the previous exercise, find a basis of ${\mathbb R}^n$ consisting of eigenvectors or state why such a basis does not exist.
ANSWER:

a) 
    It is not possible.

b) 
    $\left\{ \left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right], \left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -3 \end{array}\right] \right\}$.

c) 
    $\left\{\left[\begin{array}{r}1 \\ 0 \end{array}\right], \left[\begin{array}{r}0 \\ 1 \end{array}\right]\right\}$

d) 
    $\left\{\left[\begin{array}{r}1 \\ 2 \end{array}\right],\left[\begin{array}{r}-2 \\ 1 \end{array}\right]\right\}$

SOLUTION:

a) 
    There is a single eigenvalue $\lambda=2$ and $\dim E_2=1$ so it is not possible to find a basis for ${\mathbb R}^2$ consisting of eigenvectors of $A$.

b) 
    The three eigenvalues each have multiplicity one so we know that their eigenspaces are one-dimensional. We find a basis vector for $E_3$ is $\left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right]$, for $E_4$ is $\left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right]$, and for $E_{-6}$ is $\left[\begin{array}{r}1 \\ 0 \\ -3 \end{array}\right]$. A basis for ${\mathbb R}^3$ consisting of eigenvectors of $A$ is therefore

    $$ \left\{ \left[\begin{array}{r}1 \\ 0 \\ 0 \end{array}\right], \left[\begin{array}{r}-1 \\ 1 \\ 0 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -3 \end{array}\right] \right\}\text{.} $$

c) 
    Since $A-(-2)I$ is the zero matrix, every vector is an eigenvector of $A$. This means that $\left\{\left[\begin{array}{r}1 \\ 0 \end{array}\right], \left[\begin{array}{r}0 \\ 1 \end{array}\right]\right\}$ is a basis of ${\mathbb R}^2$ consisting of eigenvectors.

d) 
    The multiplicity of each eigenvalue is one so there will be a basis of ${\mathbb R}^2$ consisting of eigenvectors. In particular, a basis vector for $E_3$ is $\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and a basis vector for $E_{-2}$ is $\left[\begin{array}{r}-2 \\ 1 \end{array}\right]$. This means that $\left\{\left[\begin{array}{r}1 \\ 2 \end{array}\right],\left[\begin{array}{r}-2 \\ 1 \end{array}\right]\right\}$ is a basis for ${\mathbb R}^2$ consisting of eigenvectors of $A$.

:::

:::exercise {exercise-4-2-003} number=4.2.3 answered=yes src=src/exercises/exercises4-2.xml:168
PROBLEM:
Determine whether the following statements are true or false and provide a justification for your response.

a) 
    The eigenvalues of a matrix $A$ are the entries on the diagonal of $A$.

b) 
    If $\lambda$ is an eigenvalue of multiplicity $1$, then $E_\lambda$ is one-dimensional.

c) 
    If a matrix $A$ is invertible, then $\lambda=0$ cannot be an eigenvalue.

d) 
    If $A$ is a $13\times 13$ matrix, the characteristic polynomial has degree less than $13$.

e) 
    The eigenspace $E_\lambda$ of $A$ is the same as the null space $\text{Nul}(A-\lambda I)$.

ANSWER:

a) 
    False

b) 
    True

c) 
    True

d) 
    False

e) 
    True

SOLUTION:

a) 
    False. This is true for a diagonal matrix, but it is not generally true as we see by considering the matrix $\left[\begin{array}{rr}1 \amp 2 \\ 2 \amp 1 \\ \end{array}\right]$ whose eigenvalues are $\lambda = 3$ and $\lambda=-1$.

b) 
    True. If $m$ is the multiplicity, we have $1\leq\dim E_\lambda \leq m=1$ so we must have $\dim E_\lambda = 1$.

c) 
    True. If $\lambda=0$ is an eigenvalue, then an associated eigenvector ${\mathbf v}$ is a nonzero solution to the homogeneous equation $A{\mathbf x}={\mathbf 0}$. This would say that $A$ is not invertible.

d) 
    False. The degree of the characteristic polynomial equals the number of rows and columns of the square matrix.

e) 
    True. An eigenvector ${\mathbf v}$ associated to the eigenvalue $\lambda$ satisfies $(A-\lambda I){\mathbf v}={\mathbf 0}$. This is the same equation that characterizes the null space $\text{Nul}(A-\lambda I)$.

:::

:::exercise {exercise-4-2-004} number=4.2.4 answered=yes src=src/exercises/exercises4-2.xml:233
PROBLEM:
Provide a justification for your response to the following questions.

a) 
    Suppose that $A$ is a $3\times 3$ matrix having eigenvalues $\lambda = -3,3,-5$. What are the eigenvalues of $2A$?

b) 
    Suppose that $D$ is a diagonal $3\times 3$ matrix. Why can you guarantee that there is a basis of ${\mathbb R}^3$ consisting of eigenvectors of $D$?

c) 
    If $A$ is a $3\times 3$ matrix whose eigenvalues are $\lambda = -1,3,5$, can you guarantee that there is a basis of ${\mathbb R}^3$ consisting of eigenvectors of $A$?

d) 
    Suppose that the characteristic polynomial of a matrix $A$ is

    $$ \det(A-\lambda I) = -\lambda^3 + 4\lambda $$

    . What are the eigenvalues of $A$? Is $A$ invertible? Is there a basis of ${\mathbb R}^n$ consisting of eigenvectors of $A$?

e) 
    If the characteristic polynomial of $A$ is

    $$ \det(A-\lambda I) = (4 -\lambda)(-2-\lambda)(1-\lambda) $$

    , what is the characteristic polynomial of $A^2$? what is the characteristic polynomial of $A^{-1}$?

ANSWER:

a) 
    $\lambda=-6,6,-10$.

b) 
    The standard basis vectors ${\mathbf e}_j$ are eigenvectors associated to the diagonal entries.

c) 
    Yes.

d) 
    $\lambda=0,2,-2$. The matrix $A$ is not invertible, but there is a basis for ${\mathbb R}^3$ consisting of eigenvectors of $A$.

e) 
    $\det(A^2-\lambda I) = (16-\lambda)(4-\lambda)(1-\lambda)$.

SOLUTION:

a) 
    If $A{\mathbf v}=\lambda{\mathbf v}$, then $2A{\mathbf v} = 2\lambda{\mathbf v}$. This says that the eigenvalues of $2A$ are $\lambda=-6,6,-10$.

b) 
    The standard basis vectors ${\mathbf e}_j$ are eigenvectors associated to the diagonal entries.

c) 
    Yes. Since there are three distinct eigenvalues, the multiplicity of each eigenvalue must be one. Therefore, the dimension of each eigenspace is one. If we choose a basis vector for each of the eigenspaces, we will obtain a basis for ${\mathbb R}^3$.

d) 
    The eigenvalues are determined by $\det(A-\lambda I) = -\lambda^3+4\lambda = -\lambda(2-\lambda)(-2-\lambda)$, which shows that the eigenvalues are $\lambda=0,2,-2$. This shows that $A$ is not invertible since $\lambda=0$ is an eigenvalue. There is, however, a basis for ${\mathbb R}^3$ consisting of eigenvectors of $A$ since the three eigenvalues are distinct.

e) 
    If $\lambda$ is an eigenvalue of $A$, then $\lambda^2$ is an eigenvalue of $A^2$. Therefore, the characteristic polynomial of $A^2$ is $\det(A^2-\lambda I) = (16-\lambda)(4-\lambda)(1-\lambda)$.

:::

:::exercise {exercise-4-2-005} number=4.2.5 answered=yes src=src/exercises/exercises4-2.xml:331
PROBLEM:
For each of the following matrices, use Sage to determine its eigenvalues, their multiplicities, and a basis for each eigenspace. For which matrices is it possible to construct a basis for ${\mathbb R}^3$ consisting of eigenvectors?
:::sage
```sage

```
:::

a) 
    $A = \left[\begin{array}{rrr} -4 & 12 & -6 \\ 4 & -5 & 4 \\ 11 & -20 & 13 \\ \end{array}\right]$

b) 
    $A = \left[\begin{array}{rrr} 1 & -3 & 1 \\ -4 & 8 & -5 \\ -8 & 17 & -10 \\ \end{array}\right]$

c) 
    $A = \left[\begin{array}{rrr} 3 & -8 & 4 \\ -2 & 3 & -2 \\ -6 & 12 & -7 \\ \end{array}\right]$

ANSWER:

a) 
    A basis of eigenvectors is

    $$ \left\{\left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right], \left[\begin{array}{r}-2 \\ 1 \\ 3 \end{array}\right]\right\}\text{.} $$

b) 
    It is not possible to find a basis of eigenvectors.

c) 
    A basis of eigenvectors is

    $$ \left\{\left[\begin{array}{r}-2 \\ 3 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right], \left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right]\right\}\text{.} $$

SOLUTION:

a) 
    Sage tells us there are three distinct eigenvalues $\lambda=3,2,-1$, each having multiplicity one. A basis of eigenvectors is

    $$ \left\{\left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right], \left[\begin{array}{r}-2 \\ 1 \\ 3 \end{array}\right]\right\}\text{.} $$

b) 
    It is not possible to find a basis of eigenvectors because the eigenvalue $\lambda=-1$ has multiplicity two but its eigenspace is one-dimensional.

c) 
    It is possible to find a basis for ${\mathbb R}^3$ consisting of eignevectors because one eigenvalue $\lambda=1$ has multiplicity one while the other $\lambda=-1$ has multiplicity two and a two-dimensional eigenspace. A basis is

    $$ \left\{\left[\begin{array}{r}-2 \\ 3 \\ 2 \end{array}\right], \left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right], \left[\begin{array}{r}0 \\ 1 \\ 2 \end{array}\right]\right\}\text{.} $$

:::

:::exercise {exercise-4-2-006} number=4.2.6 answered=yes src=src/exercises/exercises4-2.xml:428
PROBLEM:
There is a relationship between the determinant of a matrix and the product of its eigenvalues.

a) 
    We have seen that the eigenvalues of the matrix $A = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$ are $\lambda = 3,-1$. What is $\det A$? What is the product of the eigenvalues of $A$?

b) 
    Consider the triangular matrix $A = \left[\begin{array}{rrr} 2 & 0 & 0 \\ -1 & -3 & 0 \\ 3 & 1 & -2 \\ \end{array}\right]$. What are the eigenvalues of $A$? What is $\det A$? What is the product of the eigenvalues of $A$?

c) 
    Based on these examples, what do you think is the relationship between the determinant of a matrix and the product of its eigenvalues?

d) 
    Suppose the characteristic polynomial is written as

    $$ \det(A-\lambda I) = (\lambda_1-\lambda)(\lambda_2-\lambda) \ldots (\lambda_n-\lambda) $$

    . By substituting $\lambda = 0$ into this equation, explain why the determinant of a matrix equals the product of its eigenvalues.

ANSWER:

a) 
    Both equal $-3$.

b) 
    Both equal $12$.

c) 
    $\det A$ equals the product of the eigenvalues.

d) 
    We see that $\det A = \lambda_1\lambda_2\ldots\lambda_n$.

SOLUTION:

a) 
    We have $\det A = -3$, and the product of the eigenvalues is $-3$.

b) 
    We have $\det A = 12$, and the product of the eigenvalues is $12$

c) 
    We suspect that $\det A$ equals the product of the eigenvalues.

d) 
    Setting $\lambda=0$, we have

    $$ \begin{aligned} \det(A-0I) & {}={} (\lambda_1-0)(\lambda_2-0)\ldots(\lambda_m-0) \\ \det A & {}={}\lambda_1\lambda_2\ldots\lambda_n\text{.} \end{aligned} $$

    Notice that we mean the product of the eigenvalues, including their multiplicities.

:::

:::exercise {exercise-4-2-007} number=4.2.7 answered=yes src=src/exercises/exercises4-2.xml:510
PROBLEM:
Consider the matrix $A=\left[\begin{array}{rr} 0.5 & 0.6 \\ -0.3 & 1.4 \\ \end{array}\right]$.

a) 
    Find the eigenvalues of $A$ and a basis for their associated eigenspaces.

b) 
    Suppose that ${\mathbf x}_0=\left[\begin{array}{r}11 \\ 6 \end{array}\right]$. Express ${\mathbf x}_0$ as a linear combination of eigenvectors of $A$.

c) 
    Define the vectors

    $$ \begin{aligned} {\mathbf x}_1 & {}={} A{\mathbf x}_0 \\ {\mathbf x}_2 & {}={} A{\mathbf x}_1 = A^2{\mathbf x}_0 \\ {\mathbf x}_3 & {}={} A{\mathbf x}_2 = A^3{\mathbf x}_0 \\ \vdots & {}={} \vdots \end{aligned} $$

    . Write ${\mathbf x}_1$, ${\mathbf x}_2$, and ${\mathbf x}_3$ as a linear combination of eigenvectors of $A$.

d) 
    What happens to ${\mathbf x}_k$ as $k$ grows larger and larger?

ANSWER:

a) 
    $\lambda_1=1.1$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and $\lambda_2=0.8$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

b) 
    ${\mathbf x}_0={\mathbf v}_1+5{\mathbf v}_2$.

c) 
    We have

    $$ \begin{aligned} {\mathbf x}_1 & {}={} 1.1{\mathbf v}_1+0.8\cdot5{\mathbf v}_2 \\ {\mathbf x}_2 & {}={} 1.1^2{\mathbf v}_1+0.8^2\cdot5{\mathbf v}_2 \\ {\mathbf x}_3 & {}={} 1.1^3{\mathbf v}_1+0.8^3\cdot5{\mathbf v}_2 \\ \end{aligned} $$

    .

d) 
    ${\mathbf x}_k \approx \left[\begin{array}{r}1.1^k \\ 1.1^k \end{array}\right]$.

SOLUTION:

a) 
    We find the eigenvalues $\lambda_1=1.1$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and $\lambda_2=0.8$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$.

b) 
    After constructing an augmented matrix, we find that ${\mathbf x}_0={\mathbf v}_1+5{\mathbf v}_2$.

c) 
    Since $A(c_1{\mathbf v}_1+c_2{\mathbf v}_2) = 1.1c_1{\mathbf v}_1 + 0.8c_2{\mathbf v}_2$, we have

    $$ \begin{aligned} {\mathbf x}_1 & {}={} 1.1{\mathbf v}_1+0.8\cdot5{\mathbf v}_2 \\ {\mathbf x}_2 & {}={} 1.1^2{\mathbf v}_1+0.8^2\cdot5{\mathbf v}_2 \\ {\mathbf x}_3 & {}={} 1.1^3{\mathbf v}_1+0.8^3\cdot5{\mathbf v}_2 \\ \end{aligned} $$

    .

d) 
    We have ${\mathbf x}_k = 1.1^k{\mathbf v}_1+0.8^k\cdot5{\mathbf v}_2$. As $k$ grows larger, $0.8^k$ becomes less significant. Eventually, ${\mathbf x}_k \approx 1.1^k{\mathbf v}_1= \left[\begin{array}{r}1.1^k \\ 1.1^k \end{array}\right]$.

:::

:::exercise {exercise-4-2-008} number=4.2.8 answered=yes src=src/exercises/exercises4-2.xml:605
PROBLEM:
Consider the matrix $A=\left[\begin{array}{rr} 0.4 & 0.3 \\ 0.6 & 0.7 \\ \end{array}\right]$

a) 
    Find the eigenvalues of $A$ and a basis for their associated eigenspaces.

b) 
    Suppose that ${\mathbf x}_0=\left[\begin{array}{r}0 \\ 1 \end{array}\right]$. Express ${\mathbf x}_0$ as a linear combination of eigenvectors of $A$.

c) 
    Define the vectors

    $$ \begin{aligned} {\mathbf x}_1 & {}={} A{\mathbf x}_0 \\ {\mathbf x}_2 & {}={} A{\mathbf x}_1 = A^2{\mathbf x}_0 \\ {\mathbf x}_3 & {}={} A{\mathbf x}_2 = A^3{\mathbf x}_0 \\ \vdots & {}={} \vdots \end{aligned} $$

    . Write ${\mathbf x}_1$, ${\mathbf x}_2$, and ${\mathbf x}_3$ as a linear combination of eigenvectors of $A$.

d) 
    What happens to ${\mathbf x}_k$ as $k$ grows larger and larger?

ANSWER:

a) 
    $\lambda_1=1$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and $\lambda_2=0.1$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.

b) 
    ${\mathbf x}_0=\frac13{\mathbf v}_1+\frac13{\mathbf v}_2$.

c) 
    We have

    $$ \begin{aligned} {\mathbf x}_1 & {}={} \frac13{\mathbf v}_1+0.1\frac13{\mathbf v}_2 \\ {\mathbf x}_2 & {}={} \frac13{\mathbf v}_1+0.1^2\frac13{\mathbf v}_2 \\ {\mathbf x}_3 & {}={} \frac13{\mathbf v}_1+0.1^3\frac13{\mathbf v}_2 \\ \end{aligned} $$

    .

d) 
    ${\mathbf x}_k \approx \left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$.

SOLUTION:

a) 
    We have eigenvalues $\lambda_1=1$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$ and $\lambda_2=0.1$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.

b) 
    After constructing an augmented matrix, we find ${\mathbf x}_0=\frac13{\mathbf v}_1+\frac13{\mathbf v}_2$.

c) 
    Since $A(c_1{\mathbf v}_1+c_2{\mathbf v}_2) = c_1{\mathbf v}_1 + 0.1c_2{\mathbf v}_2$, we have

    $$ \begin{aligned} {\mathbf x}_1 & {}={} \frac13{\mathbf v}_1+0.1\frac13{\mathbf v}_2 \\ {\mathbf x}_2 & {}={} \frac13{\mathbf v}_1+0.1^2\frac13{\mathbf v}_2 \\ {\mathbf x}_3 & {}={} \frac13{\mathbf v}_1+0.1^3\frac13{\mathbf v}_2. \\ \end{aligned} $$

d) 
    We have ${\mathbf x}_k = \frac13{\mathbf v}_1+0.1^k\frac13{\mathbf v}_2$. As $k$ grows larger, $0.1^k$ becomes less significant. Eventually, ${\mathbf x}_k \approx \frac13{\mathbf v}_1= \left[\begin{array}{r}\frac13 \\ \frac23 \end{array}\right]$.

:::
