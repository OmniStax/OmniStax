# 7.5 Using Singular Value Decompositions {sec-svd-uses}

We've now seen what singular value decompositions are, how to construct them, and how they provide important information about a matrix such as orthonormal bases for the four fundamental subspaces. This puts us in a good position to begin using singular value decompositions to solve a wide variety of problems.
Given the fact that singular value decompositions so immediately convey fundamental data about a matrix, it seems natural that some of our previous work can be reinterpreted in terms of singular value decompositions. Therefore, we'll take some time in this section to revisit some familiar issues, such as least-squares problems and principal component analysis, while also looking at some new applications.

## 7.5.1 Introduction

:::exploration {act:preview-7-5-1} Preview Activity 7.5.1
Suppose that $A = U\Sigma V^T$ where

$$ \Sigma = \begin{bmatrix} 13 & 0 & 0 & 0 \\ 0 & 8 & 0 & 0 \\ 0 & 0 & 2 & 0 \\ 0 &0 & 0 & 0 \\ 0 &0 & 0 & 0 \end{bmatrix}, $$

vectors ${\mathbf u}_j$ form the columns of $U$, and vectors ${\mathbf v}_j$ form the columns of $V$.
PROBLEM:
a) What are the shapes of the matrices $A$, $U$, and $V$?
b) What is the rank of $A$?
c) Describe how to find an orthonormal basis for $\text{Col}(A)$.
d) Describe how to find an orthonormal basis for $\text{Nul}(A)$.
e) If the columns of $Q$ form an orthonormal basis for $\text{Col}(A)$, what is $Q^TQ$?
f) How would you form a matrix that projects vectors orthogonally onto $\text{Col}(A)$?
SOLUTION:
a) $A$ is $5\times4$, $U$ is $5\times5$, and $V$ is $4\times4$.
b) $\operatorname{rank}(A)=3$ since there are three nonzero singular values.
c) The first three columns, ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$, of $U$ form an orthonormal basis for $\text{Col}(A)$.
d) The last column ${\mathbf v}_4$ of $V$ is a basis for $\text{Nul}(A)$.
e) $Q^TQ=I$ since each entry is a dot product of two vectors in an orthonormal set.
f) $QQ^T$ projects vectors orthogonally onto $\text{Col}(A)$.
:::

## 7.5.2 Least-squares problems

Least-squares problems, which we explored in [Section 6.5](ref:6.5#sec-least-squares), arise when we are confronted with an inconsistent linear system $A{\mathbf x}={\mathbf b}$. Since there is no solution to the system, we instead find the vector ${\mathbf x}$ minimizing the distance between ${\mathbf b}$ and $A{\mathbf x}$. That is, we find the vector $\widehat{{\mathbf x}}$, the least-squares approximate solution, by solving $A\widehat{{\mathbf x}}=\widehat{{\mathbf b}}$ where $\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto the column space of $A$.

If we have a singular value decomposition $A=U\Sigma V^T$, then the number of nonzero singular values $r$ tells us the rank of $A$, and the first $r$ columns of $U$ form an orthonormal basis for $\text{Col}(A)$. This basis may be used to project vectors onto $\text{Col}(A)$ and hence to solve least-squares problems.

Before exploring this connection further, we will introduce Sage as a tool for automating the construction of singular value decompositions. One new feature is that we need to declare our matrix to consist of floating point entries. We do this by including `RDF` inside the matrix definition, as illustrated in the following cell.

:::sage
```sage
A = matrix(RDF, 3, 2, [1,0,-1,1,1,1])
U, Sigma, V = A.SVD()
print(U)
print('---------')
print(Sigma)
print('---------')
print(V)

```
:::

:::activity {act:activity-7-5-2} Activity 7.5.2
Consider the equation $A{\mathbf x}={\mathbf b}$ where

$$ \begin{bmatrix} 1 & 0 \\ 1 & 1 \\ 1 & 2 \end{bmatrix} {\mathbf x} = \left[\begin{array}{r}-1 \\ 3 \\ 6 \end{array}\right] $$

a) 
    Find a singular value decomposition for $A$ using the Sage cell below. What are singular values of $A$?

    :::sage
    ```sage

    ```
    :::

b) 
    What is $r$, the rank of $A$? How can we identify an orthonormal basis for $\text{Col}(A)$?

c) 
    Form the reduced singular value decomposition $U_r\Sigma_rV_r^T$ by constructing: the matrix $U_r$, consisting of the first $r$ columns of $U$; the matrix $V_r$, consisting of the first $r$ columns of $V$; and $\Sigma_r$, a square $r\times r$ diagonal matrix. Verify that $A=U_r\Sigma_r V_r^T$.

    You may find it convenient to remember that if `B` is a matrix defined in Sage, then `B.matrix_from_columns( list )` and `B.matrix_from_rows( list )` can be used to extract columns or rows from `B`. For instance, `B.matrix_from_rows([0,1,2])` provides a matrix formed from the first three rows of `B`.

    :::sage
    ```sage

    ```
    :::

d) 
    How does the reduced singular value decomposition provide a matrix whose columns are an orthonormal basis for $\text{Col}(A)$?

e) 
    Explain why a least-squares approximate solution $\widehat{{\mathbf x}}$ satisfies

    $$ A\widehat{{\mathbf x}} = U_rU_r^T{\mathbf b}. $$

f) 
    What is the product $V_rV_r^T$ and why does it have this form?

g) 
    Explain why

    $$ \widehat{{\mathbf x}} = V_r\Sigma_r^{-1}U_r^T{\mathbf b} $$

    is the least-squares approximate solution, and use this expression to find $\widehat{{\mathbf x}}$.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    $\sigma_1 = 2.67$ and $\sigma_2 = 0.92$.

b) 
    $\operatorname{rank}(A) = 2$ and the first two columns of $U$ form an orthonormal basis for $\text{Col}(A)$.

c) 
    We have

    $$ U_r = \begin{bmatrix} -0.22 & 0.89 \\ -0.52 & 0.25 \\ -0.83 & -0.39 \end{bmatrix},\hspace{24pt} \Sigma_r = \begin{bmatrix} 2.7 & 0.00 \\ 0.00 & 0.92 \end{bmatrix},\hspace{24pt} V_r = \begin{bmatrix} -0.58 & 0.81 \\ -0.81 & -0.58 \end{bmatrix}\text{.} $$

d) 
    The columns of $U_r$ form an orthonormal basis for $\text{Col}(A)$.

e) 
    $\widehat{{\mathbf b}}=U_rU_r^T{\mathbf b}$

f) 
    $V_r^TV_r = I$

g) 
    $\widehat{{\mathbf x}}=\left[\begin{array}{r}-0.83 \\ 3.50 \end{array}\right]$

SOLUTION:

a) 
    The singular values are $\sigma_1 = 2.67$ and $\sigma_2 = 0.92$.

b) 
    There are two nonzero singular values so $\operatorname{rank}(A) = 2$. The first two columns of $U$ form an orthonormal basis for $\text{Col}(A)$.

c) 
    We have

    $$ U_r = \begin{bmatrix} -0.22 & 0.89 \\ -0.52 & 0.25 \\ -0.83 & -0.39 \end{bmatrix},\hspace{24pt} \Sigma_r = \begin{bmatrix} 2.7 & 0.00 \\ 0.00 & 0.92 \end{bmatrix},\hspace{24pt} V_r = \begin{bmatrix} -0.58 & 0.81 \\ -0.81 & -0.58 \end{bmatrix}\text{.} $$

d) 
    The columns of $U_r$ form an orthonormal basis for $\text{Col}(A)$.

e) 
    Since $\widehat{{\mathbf b}}=U_rU_r^T{\mathbf b}$, we obtain the equation $A\widehat{{\mathbf x}} = U_rU_r^T{\mathbf b}$.

f) 
    Because the matrix has full rank, we know that $\text{Nul}(A)=\{{\mathbf 0}\}$. Therefore, $V_r=V$ is a square matrix and $V_rV_r^T = I$ it is orthogonal.

g) 
    We have the equation $A\widehat{{\mathbf x}} = U_rU_r^T{\mathbf b}$, which gives

    $$ \begin{aligned} A\widehat{{\mathbf x}} & = U_rU_r^T{\mathbf b} \\ U_r\Sigma_rV_r^T\widehat{{\mathbf x}} & = U_rU_r^T{\mathbf b} \\ \Sigma_rV_r^T\widehat{{\mathbf x}} & = U_r^T{\mathbf b} \\ V_r^T\widehat{{\mathbf x}} & = \Sigma_r^{-1}U_r^T{\mathbf b} \\ \widehat{{\mathbf x}} & = V_r\Sigma_r^{-1}U_r^T{\mathbf b} \\ \end{aligned} $$

:::

This activity demonstrates the power of a singular value decomposition to find a least-squares approximate solution for an equation $A{\mathbf x} = {\mathbf b}$. Because it immediately provides an orthonormal basis for $\text{Col}(A)$, something that we've had to construct using the Gram-Schmidt process in the past, we can easily project ${\mathbf b}$ onto $\text{Col}(A)$, which results in a simple expression for $\widehat{{\mathbf x}}$.

:::proposition {prop:prop-svd-ols} Proposition 7.5.1
If $A=U_r\Sigma_r V_r^T$ is a reduced singular value decomposition of $A$, then a least-squares approximate solution to $A{\mathbf x}={\mathbf b}$ is given by

$$ \widehat{{\mathbf x}} = V_r\Sigma_r^{-1}U_r^T{\mathbf b}. $$

:::

If the columns of $A$ are linearly independent, then the equation $A\widehat{{\mathbf x}} = \widehat{{\mathbf b}}$ has only one solution so there is a unique least-squares approximate solution $\widehat{{\mathbf x}}$. Otherwise, the expression in [Proposition 7.5.1](ref:prop-svd-ols) produces the solution to $A\widehat{{\mathbf x}}=\widehat{{\mathbf b}}$ having the shortest length.

{index-entry:Moore-Penrose psuedoinverse} The matrix $A^+ = V_r\Sigma_r^{-1}U_r^T$ is known as the *Moore-Penrose psuedoinverse* of $A$. When $A$ is invertible, $A^{-1} = A^+$.

## 7.5.3 Rank $k$ approximations

If we have a singular value decomposition for a matrix $A$, we can form a sequence of matrices $A_k$ that approximate $A$ with increasing accuracy. This may feel familiar to calculus students who have seen the way in which a function $f(x)$ can be approximated by a linear function, a quadratic function, and so forth with increasing accuracy.

We'll begin with a singular value decomposition of a rank $r$ matrix $A$ so that $A=U\Sigma V^T$. To create the approximating matrix $A_k$, we keep the first $k$ singular values and set the others to zero. For instance, if $\Sigma = \begin{bmatrix} 22 & 0 & 0 & 0 & 0 \\ 0 & 14 & 0 & 0 & 0 \\ 0 & 0 & 3 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ \end{bmatrix}$, we can form matrices

$$ \Sigma^{(1)} = \begin{bmatrix} 22 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ \end{bmatrix}, \hspace{24pt} \Sigma^{(2)} = \begin{bmatrix} 22 & 0 & 0 & 0 & 0 \\ 0 & 14 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ \end{bmatrix} $$

and define $A_1 = U\Sigma^{(1)}V^T$ and $A_2 = U\Sigma^{(2)}V^T$. Because $A_k$ has $k$ nonzero singular values, we know that $\operatorname{rank}(A_k) = k$. In fact, there is a sense in which $A_k$ is the closest matrix to $A$ among all rank $k$ matrices.

:::activity {act:activity-7-5-3} Activity 7.5.3
Let's consider a matrix $A=U\Sigma V^T$ where

$$ \begin{aligned} & U = \begin{bmatrix} \frac{1}{2} & \frac{1}{2} & \frac{1}{2} & \frac{1}{2} \\ \frac{1}{2} & \frac{1}{2} & -\frac{1}{2} & -\frac{1}{2} \\ \frac{1}{2} & -\frac{1}{2} & \frac{1}{2} & -\frac{1}{2} \\ \frac{1}{2} & -\frac{1}{2} & -\frac{1}{2} & \frac{1}{2} \\ \end{bmatrix},\hspace{10pt} \Sigma = \begin{bmatrix} 500 & 0 & 0 & 0 \\ 0 & 100 & 0 & 0 \\ 0 & 0 & 20 & 0 \\ 0 & 0 & 0 & 4 \end{bmatrix} \\ & V = \begin{bmatrix} \frac{1}{2} & \frac{1}{2} & \frac{1}{2} & \frac{1}{2} \\ \frac{1}{2} & -\frac{1}{2} & -\frac{1}{2} & \frac{1}{2} \\ -\frac{1}{2} & -\frac{1}{2} & \frac{1}{2} & \frac{1}{2} \\ -\frac{1}{2} & \frac{1}{2} & -\frac{1}{2} & \frac{1}{2} \end{bmatrix} \end{aligned} $$

Evaluating the following cell will create the matrices `U`, `V`, and `Sigma`. Notice how the `diagonal_matrix` command provides a convenient way to form the diagonal matrix $\Sigma$.
:::sage
```sage
h = 1/2
U = matrix(4,4,[h,h,h,h,  h,h,-h,-h,  h,-h,h,-h,  h,-h,-h,h])
V = matrix(4,4,[h,h,h,h,  h,-h,-h,h,  -h,-h,h,h,  -h,h,-h,h])
Sigma = diagonal_matrix([500, 100, 20, 4])

```
:::

a) 
    Form the matrix $A=U\Sigma V^T$. What is $\operatorname{rank}(A)$?

    :::sage
    ```sage

    ```
    :::

b) 
    Now form the approximating matrix $A_1=U\Sigma^{(1)} V^T$. What is $\operatorname{rank}(A_1)$?

    :::sage
    ```sage

    ```
    :::

c) 
    Find the error in the approximation $A\approx A_1$ by finding $A-A_1$.

d) 
    Now find $A_2 = U\Sigma^{(2)} V^T$ and the error $A-A_2$. What is $\operatorname{rank}(A_2)$?

    :::sage
    ```sage

    ```
    :::

e) 
    Find $A_3 = U\Sigma^{(3)} V^T$ and the error $A-A_3$. What is $\operatorname{rank}(A_3)$?

f) 
    What would happen if we were to compute $A_4$?

g) 
    What do you notice about the error $A-A_k$ as $k$ increases?

ANSWER:

a) 
    $A = \begin{bmatrix} 156 & 96 & -144 & -104 \\ 144 & 104 & -156 & -96 \\ 104 & 144 & -96 & -156 \\ 96 & 156 & -104 & -144 \end{bmatrix}$.

b) 
    $A_1=\begin{bmatrix} 125 & 125 & -125 & -125 \\ 125 & 125 & -125 & -125 \\ 125 & 125 & -125 & -125 \\ 125 & 125 & -125 & -125 \end{bmatrix}$.

c) 
    $A-A_1 = \begin{bmatrix} 31 & -29 & -19 & 21 \\ 19 & -21 & -31 & 29 \\ -21 & 19 & 29 & -31 \\ -29 & 31 & 21 & -19 \end{bmatrix}$

d) 
    $A_2 = \begin{bmatrix} 150 & 100 & -150 & -100 \\ 150 & 100 & -150 & -100 \\ 100 & 150 & -100 & -150 \\ 100 & 150 & -100 & -150 \end{bmatrix}$ and $A-A_2 = \begin{bmatrix} 6 & -4 & 6 & -4 \\ -6 & 4 & -6 & 4 \\ 4 & -6 & 4 & -6 \\ -4 & 6 & -4 & 6 \end{bmatrix}$.

e) 
    $A_3 = \begin{bmatrix} 155 & 95 & -145 & -105 \\ 145 & 105 & -155 & -95 \\ 105 & 145 & -95 & -155 \\ 95 & 155 & -105 & -145 \end{bmatrix}$ and $A-A_3 = \begin{bmatrix} 1 & 1 & 1 & 1 \\ -1 & -1 & -1 & -1 \\ -1 & -1 & -1 & -1 \\ 1 & 1 & 1 & 1 \end{bmatrix}$.

f) 
    $A_4=A$

g) 
    The entries get closer to $0$.

SOLUTION:

a) 
    We find that $A$ is the rank $4$ matrix: $\begin{bmatrix} 156 & 96 & -144 & -104 \\ 144 & 104 & -156 & -96 \\ 104 & 144 & -96 & -156 \\ 96 & 156 & -104 & -144 \end{bmatrix}$.

b) 
    Because it has one nonzero singular value, $A_1$ has rank $1$ and has the form: $A_1=\begin{bmatrix} 125 & 125 & -125 & -125 \\ 125 & 125 & -125 & -125 \\ 125 & 125 & -125 & -125 \\ 125 & 125 & -125 & -125 \end{bmatrix}$.

c) 
    $A-A_1 = \begin{bmatrix} 31 & -29 & -19 & 21 \\ 19 & -21 & -31 & 29 \\ -21 & 19 & 29 & -31 \\ -29 & 31 & 21 & -19 \end{bmatrix}$

d) 
    $A_2$ is the rank $2$ matrix $\begin{bmatrix} 150 & 100 & -150 & -100 \\ 150 & 100 & -150 & -100 \\ 100 & 150 & -100 & -150 \\ 100 & 150 & -100 & -150 \end{bmatrix}$ and $A-A_2 = \begin{bmatrix} 6 & -4 & 6 & -4 \\ -6 & 4 & -6 & 4 \\ 4 & -6 & 4 & -6 \\ -4 & 6 & -4 & 6 \end{bmatrix}$.

e) 
    $A_3$ is the rank $3$ matrix $\begin{bmatrix} 155 & 95 & -145 & -105 \\ 145 & 105 & -155 & -95 \\ 105 & 145 & -95 & -155 \\ 95 & 155 & -105 & -145 \end{bmatrix}$ with $A-A_3 = \begin{bmatrix} 1 & 1 & 1 & 1 \\ -1 & -1 & -1 & -1 \\ -1 & -1 & -1 & -1 \\ 1 & 1 & 1 & 1 \end{bmatrix}$.

f) 
    $A_4=A$ since $A$ is a rank $4$ matrix.

g) 
    As $k$ increases, the entries in the $A-A_k$ get closer to $0$. This means that our approximations $A\approx A_k$ are improving.

:::

In this activity, the approximating matrix $A_k$ has rank $k$ because its singular value decomposition has $k$ nonzero singular values. We then saw how the difference between $A$ and the approximations $A_k$ decreases as $k$ increases, which means that the sequence $A_k$ forms better approximations as $k$ increases.

Another way to represent $A_k$ is with a reduced singular value decomposition so that $A_k = U_k\Sigma_kV_k^T$ where

$$ U_k = \begin{bmatrix} {\mathbf u}_1 & \ldots & {\mathbf u}_k \end{bmatrix},\hspace{10pt} \Sigma_k = \begin{bmatrix} \sigma_1 & 0 & \ldots & 0 \\ 0 & \sigma_2 & \ldots & 0 \\ \vdots & \vdots & \ddots & \vdots \\ 0 & 0 & \ldots & \sigma_k \end{bmatrix},\hspace{10pt} V_k = \begin{bmatrix} {\mathbf v}_1 & \ldots & {\mathbf v}_k \end{bmatrix}\text{.} $$

Notice that the rank $1$ matrix $A_1$ then has the form $A_1 = {\mathbf u}_1\begin{bmatrix}\sigma_1\end{bmatrix} {\mathbf v}_1^T = \sigma_1{\mathbf u}_1{\mathbf v}_1^T$ and that we can similarly write:

$$ \begin{aligned} A \approx A_1 & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T \\ A \approx A_2 & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T \\ A \approx A_3 & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T + \sigma_3{\mathbf u}_3{\mathbf v}_3^T \\ \vdots & \\ A = A_r & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T + \sigma_3{\mathbf u}_3{\mathbf v}_3^T + \ldots + \sigma_r{\mathbf u}_r{\mathbf v}_r^T\text{.} \end{aligned} $$

Given two vectors ${\mathbf u}$ and ${\mathbf v}$, the matrix ${\mathbf u}~{\mathbf v}^T$ is called the *outer product* of ${\mathbf u}$ and ${\mathbf v}$. (The dot product ${\mathbf u}\cdot{\mathbf v}={\mathbf u}^T{\mathbf v}$ is sometimes called the *inner product*.) An outer product will always be a rank $1$ matrix so we see above how $A_k$ is obtained by adding together $k$ rank $1$ matrices, each of which gets us one step closer to the original matrix $A$.

## 7.5.4 Principal component analysis

In [Section 7.3](ref:7.3#sec-pca), we explored principal component analysis as a technique to reduce the dimension of a dataset. In particular, we constructed the covariance matrix $C$ from a demeaned data matrix and saw that the eigenvalues and eigenvectors of $C$ tell us about the variance of the dataset in different directions. We referred to the eigenvectors of $C$ as *principal components* and found that projecting the data onto a subspace defined by the first few principal components frequently gave us a way to visualize the dataset. As we added more principal components, we retained more information about the original dataset. This feels similar to the rank $k$ approximations we have just seen so let's explore the connection.

Suppose that we have a dataset with $N$ points, that $A$ represents the demeaned data matrix, that $A = U\Sigma V^T$ is a singular value decomposition, and that the singular values are $A$ are denoted as $\sigma_i$. It follows that the covariance matrix

$$ C = \frac1N AA^T = \frac1N (U\Sigma V^T) (U\Sigma V^T)^T = U\left(\frac1N \Sigma \Sigma^T\right) U^T. $$

Notice that $\frac1N \Sigma\Sigma^T$ is a diagonal matrix whose diagonal entries are $\frac1N\sigma_i^2$. Therefore, it follows that

$$ C = U\left(\frac1N \Sigma \Sigma^T\right) U^T $$

is an orthogonal diagonalization of $C$ showing that

- 
    the principal components of the dataset, which are the eigenvectors of $C$, are given by the columns of $U$. In other words, the left singular vectors of $A$ are the principal components of the dataset.

- 
    the variance in the direction of a principal component is the associated eigenvalue of $C$ and therefore

    $$ V_{{\mathbf u}_i} = \frac1N\sigma_i^2. $$

:::activity {act:activity-7-5-4} Activity 7.5.4
Let's revisit the iris dataset that we studied in [Section 7.3](ref:7.3#sec-pca). Remember that there are four measurements given for each of 150 irises and that each iris belongs to one of three species.
Evaluating the following cell will load the dataset and define the demeaned data matrix $A$ whose shape is $4\times150$.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/pca_iris.py', globals())
df.T

```
:::

a) 
    Find the singular values of $A$ using the command `A.singular_values()` and use them to determine the variance $V_{{\mathbf u}_j}$ in the direction of each of the four principal components. What is the fraction of variance retained by the first two principal components?

    :::sage
    ```sage

    ```
    :::

b) 
    We will now write the matrix $\Gamma = \Sigma V^T$ so that $A = U\Gamma$. Suppose that a demeaned data point, say, the 100th column of $A$, is written as a linear combination of principal components:

    $$ {\mathbf x} = c_1{\mathbf u}_1+c_2{\mathbf u}_2+c_3{\mathbf u}_3+c_4{\mathbf u}_4. $$

    Explain why $\left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \\ c_4 \end{array}\right]$, the vector of coordinates of ${\mathbf x}$ in the basis of principal components, appears as 100th column of $\Gamma$.

c) 
    Suppose that we now project this demeaned data point ${\mathbf x}$ orthogonally onto the subspace spanned by the first two principal components ${\mathbf u}_1$ and ${\mathbf u}_2$. What are the coordinates of the projected point in this basis and how can we find them in the matrix $\Gamma$?

d) 
    Alternatively, consider the approximation $A_2=U_2\Sigma_2V_2^T$ of the demeaned data matrix $A$. Explain why the 100th column of $A_2$ represents the projection of ${\mathbf x}$ onto the two-dimensional subspace spanned by the first two principal components, ${\mathbf u}_1$ and ${\mathbf u}_2$. Then explain why the coefficients in that projection, $c_1{\mathbf u}_1 + c_2{\mathbf u}_2$, form the two-dimensional vector $\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right]$ that is the 100th column of $\Gamma_2=\Sigma_2 V_2^T$.

e) 
    Now we've seen that the columns of $\Gamma_2 = \Sigma_2 V_2^T$ form the coordinates of the demeaned data points projected on to the two-dimensional subspace spanned by ${\mathbf u}_1$ and ${\mathbf u}_2$. In the cell below, find a singular value decomposition of $A$ and use it to form the matrix `Gamma2`. When you evaluate this cell, you will see a plot of the projected demeaned data plots, similar to the one we created in [Section 7.3](ref:7.3#sec-pca).

    :::sage
    ```sage
    # Form the SVD of A and use it to form Gamma2

    Gamma2 =

    # The following will plot the projected demeaned data points
    data = Gamma2.columns()
    (list_plot(data[:50], color='blue', aspect_ratio=1) +
     list_plot(data[50:100], color='orange') +
     list_plot(data[100:], color='green'))

    ```
    :::

ANSWER:

a) 
    The fraction of the total variance represented by the first two principal components is $97.8\%$.

b) 
    If ${\mathbf x} = c_1{\mathbf u}_1+c_2{\mathbf u}_2+c_3{\mathbf u}_3+c_4{\mathbf u}_4$, then $\left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \\ c_4 \end{array}\right]$ is the corresponding column of $U^TA$.

c) 
    We just need the first two components of the corresponding column of $\Gamma$.

d) 
    $\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right]$ is the corresponding column of $U_2^TA$.

e) 
    We can construct $\Gamma_2=\Sigma_2 V_2^T$ or just pull out the first two rows of $\Gamma=\Sigma V^T$.

SOLUTION:

a) 
    The singular values are $\sigma_1=25.1$, $\sigma_2 = 6.0$, $\sigma_3=3.4$ and $\sigma_4 = 1.9$. Since $V_{{\mathbf u}_i} = \frac{1}{150} \sigma_i^2$, the variances are $4.20$, $0.24$, $0.08$, and $0.02$. The fraction of the total variance represented by the first two principal components is $97.8\%$.

b) 
    If ${\mathbf x}$ is the $100^{th}$ column of $A$, then $\left[\begin{array}{r}c_1 \\ c_2 \\ c_3 \\ c_4 \end{array}\right]$ is the $100^{th}$ column of $U^TA = U^T(U\Sigma V^T) = \Sigma V^T = \Gamma$.

c) 
    The projected data point is $\widehat{{\mathbf x}} = c_1{\mathbf u}_1 + c_2{\mathbf u}_2$ since $c_3{\mathbf u}_3+c_4{\mathbf u}_4$ is orthogonal to the subspace spanned by the first two principal components. Therefore, the coordinates of the projected data point are the first two components of the corresponding column of $\Gamma$. The coordinates of all the projected data points are given by the first two rows of $\Gamma$.

d) 
    Once again, suppose that ${\mathbf x}=c_1{\mathbf u}_1+c_2{\mathbf u}_2+c_3{\mathbf u}_3+c_4{\mathbf u}_4$ is a column of $A$ and that $U_2 = \begin{bmatrix}{\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix}$. Then $\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right]$ is the corresponding column of $U_2^TA = U_2(U\Sigma V^T) = \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ \end{bmatrix}\Sigma V^T = \Sigma_2 V_2^T=\Gamma_2$.

e) 
    We can construct $\Gamma_2=\Sigma_2 V_2^T$ or just pull out the first two rows of $\Gamma=\Sigma V^T$.

:::

In our first encounter with principal component analysis, we began with a demeaned data matrix $A$, formed the covariance matrix $C$, and used the eigenvalues and eigenvectors of $C$ to project the demeaned data onto a smaller dimensional subspace. In this section, we have seen that a singular value decomposition of $A$ provides a more direct route: the left singular vectors of $A$ form the principal components and the approximating matrix $A_k$ represents the data points projected onto the subspace spanned by the first $k$ principal components. The coordinates of a projected demeaned data point are given by the columns of $\Gamma_k = \Sigma_kV_k^T$.

## 7.5.5 Image compressing and denoising

In addition to principal component analysis, the approximations $A_k$ of a matrix $A$ obtained from a singular value decomposition can be used in image processing. Remember that we studied the JPEG compression algorithm, whose foundation is the change of basis defined by the Discrete Cosine Transform, in [Section 3.3](ref:3.3#sec-jpeg). We will now see how a singular value decomposition provides another tool for both compressing images and removing noise in them.

:::activity {act:activity-7-5-5} Activity 7.5.5
Evaluating the following cell loads some data that we'll use in this activity. To begin, it defines and displays a $25\times15$ matrix $A$.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/svd_compress.py', globals())
print(A)

```
:::

a) 
    If we interpret 0 as black and 1 as white, this matrix represents an image as shown below.

    :::sage
    ```sage
    display_matrix(A)

    ```
    :::

    We will explore how the singular value decomposition helps us to compress this image.

    1. 
        By inspecting the image represented by $A$, identify a basis for $\text{Col}(A)$ and determine $\operatorname{rank}(A)$.

    2. 
        The following cell plots the singular values of $A$. Explain how this plot verifies that the rank is what you found in the previous part.

        :::sage
        ```sage
        plot_sv(A)

        ```
        :::

    3. 
        There is a command `approximate(A, k)` that creates the approximation $A_k$. Use the cell below to define $k$ and look at the images represented by the first few approximations. What is the smallest value of $k$ for which $A=A_k$?

        :::sage
        ```sage
        k =
        display_matrix(approximate(A, k))

        ```
        :::

    4. 
        Now we can see how the singular value decomposition allows us to compress images. Since this is a $25\times15$ matrix, we need $25\cdot15=375$ numbers to represent the image. However, we can also reconstruct the image using a small number of singular values and vectors:

        $$ A = A_k = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T + \ldots + \sigma_k{\mathbf u}_k{\mathbf v}_k^T. $$

        What are the dimensions of the singular vectors ${\mathbf u}_i$ and ${\mathbf v}_i$? Between the singular vectors and singular values, how many numbers do we need to reconstruct $A_k$ for the smallest $k$ for which $A=A_k$? This is the compressed size of the image.

    5. 
        The *compression ratio* is the ratio of the uncompressed size to the compressed size. What compression ratio does this represent?

b) 
    Next we'll explore an example based on a photograph.

    1. 
        Consider the following image consisting of an array of $316\times310$ pixels stored in the matrix $A$.

        :::sage
        ```sage
        A = matrix(RDF, image)
        display_image(A)

        ```
        :::

        Plot the singular values of $A$.

        :::sage
        ```sage
        plot_sv(A)

        ```
        :::

    2. 
        Use the cell below to study the approximations $A_k$ for $k=1, 10, 20, 50, 100$.

        :::sage
        ```sage
        k = 1
        display_image(approximate(A, k))

        ```
        :::

        Notice how the approximating image $A_k$ more closely approximates the original image $A$ as $k$ increases.

        What is the compression ratio when $k=50$? What is the compression ratio when $k=100$? Notice how a higher compression ratio leads to a lower quality reconstruction of the image.

c) 
    A second, related application of the singular value decomposition to image processing is called *denoising*. For example, consider the image represented by the matrix $A$ below.

    :::sage
    ```sage
    A = matrix(RDF, noise.values)
    display_matrix(A)

    ```
    :::

    This image is similar to the image of the letter "O" we first studied in this activity, but there are splotchy regions in the background that result, perhaps, from scanning the image. We think of the splotchy regions as noise, and our goal is to improve the quality of the image by reducing the noise.

    1. 
        Plot the singular values below. How are the singular values of this matrix similar to those represented by the clean image that we considered earlier and how are they different?

        :::sage
        ```sage
        plot_sv(A)

        ```
        :::

    2. 
        There is a natural point where the singular values dramatically decrease so it makes sense to think of the noise as being formed by the small singular values. To denoise the image, we will therefore replace $A$ by its approximation $A_k$, where $k$ is the point at which the singular values drop off. This has the effect of setting the small singular values to zero and hence eliminating the noise. Choose an appropriate value of $k$ below and notice that the new image appears to be somewhat cleaned up as a result of removing the noise.

        :::sage
        ```sage
        k =
        display_matrix(approximate(A, k))

        ```
        :::

ANSWER:

a) 

    1. 
        $\operatorname{rank}(A) = 3$

    2. 
        $\operatorname{rank}(A) = 3$

    3. 
        $k=3$

    4. 
        $123$

    5. 
        The compression ratio is $375/123=3.0$

b) 

    1. 
        The singular values fall off steeply but never reach $0$.

    2. 
        When $k=50$, the compression ratio is about $3.1$. When $k=100$, the compression ratio is about $1.6$.

c) 

    1. 
        The singular values are similar, but they never reach $0$.

    2. 
        $k=3$ seems like a natural approximation

SOLUTION:

a) 

    1. 
        $\operatorname{rank}(A) = 3$ because there are three distinct columns represented by the first, third, and sixth columns.

    2. 
        There are three nonzero singular values so $\operatorname{rank}(A) =3$ as we suspected.

    3. 
        The smallest value is $k=3$ since $\operatorname{rank}(A) = 3$.

    4. 
        The left singular vectors are $25$-dimensional and the right singular vectors are $15$-dimensional. If we keep three singular values, left singular vectors, and right singular vectors, we have $3(1+25+15) = 123$.

    5. 
        The compression ratio is $375/123=3.0$ so the data is compressed by a factor of $3$.

b) 

    1. 
        The singular values fall off steeply but never reach $0$.

    2. 
        When $k=50$, the compression ratio is about $3.1$. When $k=100$, the compression ratio is about $1.6$.

c) 

    1. 
        The singular values are similar, but they never reach $0$.

    2. 
        $k=3$ seems like a natural approximation since that's the place where the singular values become almost $0$.

:::

Several examples illustrating how the singular value decomposition compresses images are available at this page from [timbaumann.info/projects.html](http://timbaumann.info/svd-image-compression-demo/)

## 7.5.6 Analyzing Supreme Court cases

As we've seen, a singular value decomposition concentrates the most important features of a matrix into the first singular values and singular vectors. We will now use this observation to extract meaning from a large dataset giving the voting records of Supreme Court justices. A similar analysis appears in the paper [gvsu.edu/s/21F](https://www.pnas.org/content/100/13/7432) by Lawrence Sirovich.

The makeup of the Supreme Court was unusually stable during a period from 1994-2005 when it was led by Chief Justice William Rehnquist. This is sometimes called the *second Rehnquist court*. The justices during this period were:

- 
    William Rehnquist

- 
    Antonin Scalia

- 
    Clarence Thomas

- 
    Anthony Kennedy

- 
    Sandra Day O'Connor

- 
    John Paul Stevens

- 
    David Souter

- 
    Ruth Bader Ginsburg

- 
    Stephen Breyer

During this time, there were 911 cases in which all nine judges voted. We would like to understand patterns in their voting.

:::activity {act:activity-7-5-6} Activity 7.5.6
Evaluating the following cell loads and displays a dataset describing the votes of each justice in these 911 cases. More specifically, an entry of +1 means that the justice represented by the row voted with the majority in the case represented by the column. An entry of -1 means that justice was in the minority. This information is also stored in the $9\times911$ matrix $A$.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/svd_supreme.py', globals())
A = matrix(RDF, cases.values)
cases

```
:::
The justices are listed, very roughly, in order from more conservative to more progressive.
In this activity, it will be helpful to visualize the entries in various matrices and vectors. The next cell displays the first 50 columns of the matrix $A$ with white representing an entry of +1, red representing -1, and black representing 0.
:::sage
```sage
display_matrix(A.matrix_from_columns(range(50)))

```
:::

a) 
    Plot the singular values of $A$ below. Describe the significance of this plot, including the relative contributions from the singular values $\sigma_k$ as $k$ increases.

    :::sage
    ```sage
    plot_sv(A)

    ```
    :::

b) 
    Form the singular value decomposition $A=U\Sigma V^T$ and the matrix of coefficients $\Gamma$ so that $A=U\Gamma$.

    :::sage
    ```sage

    ```
    :::

c) 
    We will now study a particular case, the second case which appears as the column of $A$ indexed by `1`. There is a command `display_column(A, k)` that provides a visual display of the $k^{th}$ column of a matrix $A$. Describe the justices' votes in the second case.

    :::sage
    ```sage

    ```
    :::

d) 
    Also, display the first left singular vector ${\mathbf u}_1$, the column of $U$ indexed by $0$, and the column of $\Gamma$ holding the coefficients that express the second case as a linear combination of left singular vectors.

    :::sage
    ```sage

    ```
    :::

    What does this tell us about how the second case is constructed as a linear combination of left singular vectors? What is the significance of the first left singular vector ${\mathbf u}_1$?

e) 
    Let's now study the $48^{th}$ case, which is represented by the column of $A$ indexed by `47`. Describe the voting pattern in this case.

    :::sage
    ```sage

    ```
    :::

f) 
    Display the second left singular vector ${\mathbf u}_2$ and the vector of coefficients that express the $48^{th}$ case as a linear combination of left singular vectors.

    :::sage
    ```sage

    ```
    :::

    Describe how this case is constructed as a linear combination of singular vectors. What is the significance of the second left singular vector ${\mathbf u}_2$?

g) 
    The data in [Table 7.5.2](ref:table-supreme-cases) describes the number of cases decided by each possible vote count.

    > TABLE {tab:table-supreme-cases} number=7.5.2 cols=2
    > caption: Number of cases by vote count
    |  |  |
    | --- | --- |
    | Vote count | # of cases |
    | 9-0 | 405 |
    | 8-1 | 89 |
    | 7-2 | 111 |
    | 6-3 | 118 |
    | 5-4 | 188 |

    How do the singular vectors ${\mathbf u}_1$ and ${\mathbf u}_2$ reflect this data? Would you characterize the court as leaning toward the conservatives or progressives? Use these singular vectors to explain your response.

h) 
    Cases decided by a 5-4 vote are often the most impactful as they represent a sharp divide among the justices and, often, society at large. For that reason, we will now focus on the 5-4 decisions. Evaluating the next cell forms the $9\times188$ matrix $B$ consisting of 5-4 decisions.

    :::sage
    ```sage
    B = matrix(RDF, fivefour.values)
    display_matrix(B.matrix_from_columns(range(50)))

    ```
    :::

    Form the singular value decomposition of $B=U\Sigma V^T$ along with the matrix $\Gamma$ of coefficients so that $B=U\Gamma$ and display the first left singular vector ${\mathbf u}_1$. Study how the $7^{th}$ case, indexed by `6`, is constructed as a linear combination of left singular vectors.

    :::sage
    ```sage

    ```
    :::

    What does this singular vector tell us about the make up of the court and whether it leans towards the conservatives or progressives?

i) 
    Display the second left singular vector ${\mathbf u}_2$ and study how the $6^{th}$ case, indexed by `5`, is constructed as a linear combination of left singular vectors.

    :::sage
    ```sage

    ```
    :::

    What does ${\mathbf u}_2$ tell us about the relative importance of the justices' voting records?

j) 
    By a *swing vote*, we mean a justice who is less inclined to vote with a particular bloc of justices but instead swings from one bloc to another with the potential to sway close decisions. What do the singular vectors ${\mathbf u}_1$ and ${\mathbf u}_2$ tell us about the presence of voting blocs on the court and the presence of a swing vote? Which justice represents the swing vote?

ANSWER:

a) 
    The first two singular values contribute most significantly.

b) 
    $\Gamma$ is a $9\times911$ matrix that expresses the cases as linear combinations of the left singular vectors.

c) 
    This is a unanimous decision.

d) 
    ${\mathbf u}_1$ represents a unanimous decision.

e) 
    This is a 5-4 decision with the 5 conservative justices voting in the majority.

f) 
    ${\mathbf u}_2$ represents a 5-4 decision.

g) 
    The most frequently occurring decisions are unanimous and the second most frequently occurring are 5-4.

h) 
    ${\mathbf u}_1$ represents a case where the five conservative justices are voting together.

i) 
    The second left singular vector ${\mathbf u}_2$ essentially records the vote of Sandra Day O'Connor.

j) 
    Sandra Day O'Connor

SOLUTION:

a) 
    The first two singular values contribute most significantly.

b) 
    $\Gamma$ is a $9\times911$ matrix that expresses the cases as linear combinations of the left singular vectors.

c) 
    This is a unanimous decision.

d) 
    The unanimous decision is essentially represented as $-{\mathbf u}_1$ so ${\mathbf u}_1$ represents a unanimous decision.

e) 
    This is a 5-4 decision with the 5 conservative justices voting in the majority.

f) 
    This 5-4 decision is essentially represented as ${\mathbf u}_2$, the second most important left singular vector.

g) 
    We see that the most decisions are unanimous, which is why ${\mathbf u}_1$ represents unanimous decisions. The second most frequently occurring decisions is a 5-4 decision, which is why ${\mathbf u}_2$ represents a 5-4 decision that leans to the conservative justices.

h) 
    The first singular vector ${\mathbf u}_1$ represents a case where the five conservative justices are voting together. From this we conclude that the court leans toward the conservatives.

i) 
    The second left singular vector ${\mathbf u}_2$ essentially records the vote of Sandra Day O'Connor and shows how her vote has the power to swing a 5-4 decision from a conservative majority to a progressive majority.

j) 
    Sandra Day O'Connor would be the swing vote.

:::

## 7.5.7 Summary

This section has demonstrated some uses of the singular value decomposition. Because the singular values appear in decreasing order, the decomposition has the effect of concentrating the most important features of the matrix into the first singular values and singular vectors.

- 
    Because the first left singular vectors form an orthonormal basis for $\text{Col}(A)$, a singular value decomposition provides a convenient way to project vectors onto $\text{Col}(A)$ and therefore to solve least-squares problems.

- 
    A singular value decomposition of a rank $r$ matrix $A$ leads to a series of approximations $A_k$ of $A$ where

    $$ \begin{aligned} A \approx A_1 & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T \\ A \approx A_2 & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T \\ A \approx A_3 & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T + \sigma_3{\mathbf u}_3{\mathbf v}_3^T \\ \vdots & \\ A = A_r & = \sigma_1{\mathbf u}_1{\mathbf v}_1^T + \sigma_2{\mathbf u}_2{\mathbf v}_2^T + \sigma_3{\mathbf u}_3{\mathbf v}_3^T + \ldots + \sigma_r{\mathbf u}_r{\mathbf v}_r^T \end{aligned} $$

    In each case, $A_k$ is the rank $k$ matrix that is closest to $A$.

- 
    If $A$ is a demeaned data matrix, the left singular vectors give the principal components of $A$, and the variance in the direction of a principal component can be simply expressed in terms of the corresponding singular value.

- 
    The singular value decomposition has many applications. In this section, we looked at how the decomposition is used in image processing through the techniques of compression and denoising.

- 
    Because the first few left singular vectors contain the most important features of a matrix, we can use a singular value decomposition to extract meaning from a large dataset as we did when analyzing the voting patterns of the second Rehnquist court.

## 7.5.8 Exercises

:::exercise {exercise-7-5-001} number=7.5.1 answered=yes src=src/exercises/exercises7-5.xml:5
PROBLEM:
Suppose that

$$ A = \begin{bmatrix} 2.1 & -1.9 & 0.1 & 3.7 \\ -1.5 & 2.7 & 0.9 & -0.6 \\ -0.4 & 2.8 & -1.5 & 4.2 \\ -0.4 & 2.4 & 1.9 & -1.8 \end{bmatrix} $$

.
:::sage
```sage

```
:::

a) 
    Find the singular values of $A$. What is $\operatorname{rank}(A)$?

b) 
    Find the sequence of matrices $A_1$, $A_2$, $A_3$, and $A_4$ where $A_k$ is the rank $k$ approximation of $A$.

ANSWER:

a) 
    $\operatorname{rank}(A) = 4$.

b) 
    $A_1=\begin{bmatrix} 1.3 & -1.2 & -1.2 & 3.8 \\ -0.58 & 0.56 & 0.56 & -1.7 \\ 0.92 & -0.90 & -0.89 & 2.7 \\ -0.84 & 0.83 & 0.82 & -2.5 \end{bmatrix}$, $A_2=\begin{bmatrix} 1.5 & -2.0 & -1.2 & 3.4 \\ -1.3 & 2.8 & 0.43 & -0.77 \\ -0.32 & 2.8 & -1.1 & 4.3 \\ -1.3 & 2.1 & 0.75 & -2.0 \end{bmatrix}$,\

    $A_3=\begin{bmatrix} 2.2 & -1.9 & 0.048 & 3.7 \\ -1.2 & 2.9 & 0.72 & -0.72 \\ -0.51 & 2.8 & -1.4 & 4.2 \\ -0.60 & 2.3 & 2.0 & -1.7 \end{bmatrix}$, $A_4=A$

SOLUTION:

a) 
    The singular values are $6.4$, $5.2$, $2.1$, and $0.5$ so we have $\operatorname{rank}(A) = 4$.

b) 
    $A_1=\begin{bmatrix} 1.3 & -1.2 & -1.2 & 3.8 \\ -0.58 & 0.56 & 0.56 & -1.7 \\ 0.92 & -0.90 & -0.89 & 2.7 \\ -0.84 & 0.83 & 0.82 & -2.5 \end{bmatrix}$, $A_2=\begin{bmatrix} 1.5 & -2.0 & -1.2 & 3.4 \\ -1.3 & 2.8 & 0.43 & -0.77 \\ -0.32 & 2.8 & -1.1 & 4.3 \\ -1.3 & 2.1 & 0.75 & -2.0 \end{bmatrix}$,

    $A_3=\begin{bmatrix} 2.2 & -1.9 & 0.048 & 3.7 \\ -1.2 & 2.9 & 0.72 & -0.72 \\ -0.51 & 2.8 & -1.4 & 4.2 \\ -0.60 & 2.3 & 2.0 & -1.7 \end{bmatrix}$, $A_4=A$

:::

:::exercise {exercise-7-5-002} number=7.5.2 answered=yes src=src/exercises/exercises7-5.xml:116
PROBLEM:
Suppose we would like to find the best quadratic function

$$ \beta_0 + \beta_1x + \beta_2x^2=y $$

fitting the points

$$ (0,1), (1,0), (2,1.5), (3,4), (4,8) $$

.
:::sage
```sage

```
:::

a) 
    Set up a linear system $A{\mathbf x} = {\mathbf b}$ describing the coefficients ${\mathbf x} = \left[\begin{array}{r}\beta_0 \\ \beta_1 \\ \beta_2 \end{array}\right]$.

b) 
    Find the singular value decomposition of $A$.

c) 
    Use the singular value decomposition to find the least-squares approximate solution $\widehat{{\mathbf x}}$.

ANSWER:

a) 
    The linear system is

    $$ \begin{bmatrix} 1 & 0 & 0 \\ 1 & 1 & 1 \\ 1 & 2 & 4 \\ 1 & 3 & 9 \\ 1 & 4 & 16 \\ \end{bmatrix} {\mathbf x} = \left[\begin{array}{r}1 \\ 0 \\ 1.5 \\ 4 \\ 8 \\ \end{array}\right] $$

b) 
    $U$ is a $5\times5$ matrix, $\Sigma$ is $5\times3$, and $V$ is $3\times3$

c) 
    $\widehat{{\mathbf x}}=\left[\begin{array}{r}0.87 \\ -1.34 \\ 0.79 \end{array}\right]$

SOLUTION:

a) 
    The linear system is

    $$ \begin{bmatrix} 1 & 0 & 0 \\ 1 & 1 & 1 \\ 1 & 2 & 4 \\ 1 & 3 & 9 \\ 1 & 4 & 16 \\ \end{bmatrix} {\mathbf x} = \left[\begin{array}{r}1 \\ 0 \\ 1.5 \\ 4 \\ 8 \\ \end{array}\right] $$

b) 
    $U$ is a $5\times5$ matrix, $\Sigma$ is $5\times3$, and $V$ is $3\times3$

c) 
    The rank of $A$ is 3 so we'll form the reduced singular value decomposition $A=U_3\Sigma_3V_3^T$. Then $\widehat{{\mathbf x}} = V_3\Sigma_3^{-1}U_3^T{\mathbf b} = \left[\begin{array}{r}0.87 \\ -1.34 \\ 0.79 \end{array}\right]$

:::

:::exercise {exercise-7-5-003} number=7.5.3 answered=yes src=src/exercises/exercises7-5.xml:232
PROBLEM:
Remember that the outer product of two vectors ${\mathbf u}$ and ${\mathbf v}$ is the matrix ${\mathbf u}~{\mathbf v}^T$.

a) 
    Suppose that ${\mathbf u} = \left[\begin{array}{r}2 \\ -3 \end{array}\right]$ and ${\mathbf v}=\left[\begin{array}{r}2 \\ 0 \\ 1 \end{array}\right]$. Evaluate the outer product ${\mathbf u}~{\mathbf v}^T$. To get a clearer sense of how this works, perform this operation without using technology.

    How is each of the columns of ${\mathbf u}~{\mathbf v}^T$ related to ${\mathbf u}$?

b) 
    Suppose ${\mathbf u}$ and ${\mathbf v}$ are general vectors. What is $\operatorname{rank}({\mathbf u}~{\mathbf v}^T)$ and what is a basis for its column space $\text{Col}({\mathbf u}~{\mathbf v}^T)$?

c) 
    Suppose that ${\mathbf u}$ is a unit vector. What is the effect of multiplying a vector by the matrix ${\mathbf u}~{\mathbf u}^T$?

ANSWER:

a) 
    ${\mathbf u}~{\mathbf v}^T = \begin{bmatrix} 4 & 0 & 2 \\ -6 & 0 & -3 \end{bmatrix}$

b) 
    The rank is $1$ and ${\mathbf u}$ forms a basis.

c) 
    This matrix projects vectors orthogonally onto the line defined by ${\mathbf u}$.

SOLUTION:

a) 
    ${\mathbf u}~{\mathbf v}^T = \begin{bmatrix} 2{\mathbf u} & 0{\mathbf u} & {\mathbf u} \end{bmatrix} = \begin{bmatrix} 4 & 0 & 2 \\ -6 & 0 & -3 \end{bmatrix}$

b) 
    Since each column of ${\mathbf u}~{\mathbf v}^T$ is a scalar multiple of ${\mathbf u}$, the rank of the matrix is $1$ and ${\mathbf u}$ forms a basis.

c) 
    This matrix projects vectors orthogonally onto the line defined by ${\mathbf u}$.

:::

:::exercise {exercise-7-5-004} number=7.5.4 answered=yes src=src/exercises/exercises7-5.xml:329
PROBLEM:
Evaluating the following cell loads in a dataset recording some features of 1057 houses. Notice how the lot size varies over a relatively small range compared to the other features. For this reason, in addition to demeaning the data, we'll scale each feature by dividing by its standard deviation so that the range of values is similar for each feature. The matrix $A$ holds the result.
:::sage
```sage
import pandas as pd
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/housing.csv', index_col=0)
df = df.fillna(df.mean())
std = (df-df.mean())/df.std()
A = matrix(std.values).T
df.T

```
:::

a) 
    Find the singular values of $A$ and use them to determine the variance in the direction of the principal components.

    :::sage
    ```sage

    ```
    :::

b) 
    For what fraction of the variance do the first two principal components account?

c) 
    Find a singular value decomposition of $A$ and construct the $2\times1057$ matrix $B$ whose entries are the coordinates of the demeaned data points projected on to the two-dimensional subspace spanned by the first two principal components. You can plot the projected data points using `list_plot(B.columns())`.

    :::sage
    ```sage

    ```
    :::

d) 
    Study the entries in the first two principal components ${\mathbf u}_1$ and ${\mathbf u}_2$. Would a more expensive house lie on the left, right, top, or bottom of the plot you constructed?

e) 
    In what ways does a house that lies on the far left of the plot you constructed differ from an average house? In what ways does a house that lies near the top of the plot you constructed differ from an average house?

ANSWER:

a) 
    The variances are $1.96$, $1.01$, $0.79$, and $0.24$.

b) 
    $74\%$

c) 
    The matrix $B$ is formed from the first two rows of the product $\Sigma V^T$.

d) 
    Left

e) 
    Houses on the left have larger living area, lot sizes, and prices and are newer. Houses near the top have larger lot sizes and ages.

SOLUTION:

a) 
    The singular values $\sigma_i$ are $45.5$, $32.6$, $28.9$, and $15.9$. Therefore, the variances in the direction of the principal components are given by $\frac{1}{1057}\sigma_i^2$ and are $1.96$, $1.01$, $0.79$, and $0.24$.

b) 
    The first two principal components retain $74\%$ of the total variance.

c) 
    The matrix $B$ is formed from the first two rows of the product $\Sigma V^T$.

d) 
    The fourth components, the ones that correspond to house prices, of ${\mathbf u}_1$ and ${\mathbf u}_2$ are $-0.65$ and $-0.03$ respectively. This shows us that ${\mathbf u}_2$ doesn't contribute much to the house price. Moving in the negative ${\mathbf u}_1$ direction causes the house price to go up so the more expensive homes are on the left.

e) 
    The first principal component is ${\mathbf u}_1 = \left[\begin{array}{r}-0.64 \\ -0.20 \\ 0.36 \\ -0.65 \end{array}\right]$. If we move to the left, this vector is multiplied by a negative number so the living area, lot size, and price go up while the age of the house decreases.

    The second principal component is ${\mathbf u}_2=\left[\begin{array}{r}0.05 \\ 0.86 \\ 0.51 \\ -0.03 \end{array}\right]$. If we move up, this is multiplied by a positive number so the lot size and the age of the house increase.

:::

:::exercise {exercise-7-5-005} number=7.5.5 answered=yes src=src/exercises/exercises7-5.xml:499
PROBLEM:
Let's revisit the voting records of justices on the second Rehnquist court. Evaluating the following cell will load the voting records of the justices in the 188 cases decided by a 5-4 vote and store them in the matrix $A$.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/svd_supreme.py', globals())
A = matrix(RDF, fivefour.values)
v = vector(188*[1])
fivefour

```
:::

a) 
    The cell above also defined the 188-dimensional vector ${\mathbf v}$ whose entries are all 1. What does the product $A{\mathbf v}$ represent? Use the following cell to evaluate this product.

    :::sage
    ```sage

    ```
    :::

b) 
    How does the product $A{\mathbf v}$ tell us which justice voted in the majority most frequently? What does this say about the presence of a swing vote on the court?

c) 
    How does this product tell us whether we should characterize this court as leaning conservative or progressive?

d) 
    How does this product tell us about the presence of a second swing vote on the court?

e) 
    Study the left singular vector ${\mathbf u}_3$ and describe how it reinforces the fact that there was a second swing vote. Who was this second swing vote?

ANSWER:

a) 
    For each justice, it tells us the number of times that justice voted with the majority minus the number of times they voted in the minority.

b) 
    The justice that most often votes with the majority could be a swing vote.

c) 
    The first five justices usually vote in the majority.

d) 
    A second justice voted with the majority 84 times more than with the minority.

e) 
    Anthony Kennedy

SOLUTION:

a) 
    $A{\mathbf v}$ is a 9-dimensional vector. For each justice, it tells us the number of times that justice voted with the majority minus the number of times they voted in the minority.

b) 
    Out of 188 cases, the fifth justice Sandra Day O'Connor voted with the majority 94 more times than with the minority. Since a swing vote will often vote in the majority, this gives additional evidence that Sandra Day O'Connor is a swing vote.

c) 
    The first five justices more often vote with the majority and the last four more often with the minority. This means the court leans toward the first five justices, who are the more conservative ones.

d) 
    The fourth justice Anthony Kennedy voted with the majority 84 times more than with the minority. He is a potential swing vote.

e) 
    The third singular vector ${\mathbf u}_3$ effectively records his vote and not the votes of the other justices. This lends support to the claim that Anthony Kennedy is a second, somewhat less influential, swing vote.

:::

:::exercise {exercise-7-5-006} number=7.5.6 answered=yes src=src/exercises/exercises7-5.xml:647
PROBLEM:
The following cell loads a dataset that describes the percentages with which justices on the second Rehnquist court agreed with one another. For instance, the entry in the first row and second column is 72.78, which means that Justices Rehnquist and Scalia agreed with each other in 72.78% of the cases.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/svd_supreme.py', globals())
A = 1/100*matrix(RDF, agreement.values)
agreement

```
:::

a) 
    Examine the matrix $A$. What special structure does this matrix have and why should we expect it to have this structure?

b) 
    Plot the singular values of $A$ below. For what value of $k$ would the approximation $A_k$ be a reasonable approximation of $A$?

    :::sage
    ```sage
    plot_sv(A)

    ```
    :::

c) 
    Find a singular value decomposition $A=U\Sigma V^T$ and examine the matrices $U$ and $V$ using, for instance, `n(U, 3)`. What do you notice about the relationship between $U$ and $V$ and why should we expect this relationship to hold?

    :::sage
    ```sage

    ```
    :::

d) 
    The command `approximate(A, k)` will form the approximating matrix $A_k$. Study the matrix $A_1$ using the `display_matrix` command. Which justice or justices seem to be most agreeable, that is, most likely to agree with other justices? Which justice is least agreeable?

    :::sage
    ```sage

    ```
    :::

e) 
    Examine the difference $A_2-A_1$ and describe how this tells us about the presence of voting blocs and swing votes on the court.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    The matrix is symmetric.

b) 
    $A_2$ should be a good approximation to $A$.

c) 
    $U=V$

d) 
    John Paul Stevens, is the least agreeable.

e) 
    The fourth and fifth justices, Anthony Kennedy and Sandra Day O'Connor are less inclined to agree with the others.

SOLUTION:

a) 
    The matrix is symmetric because the number of times Justice A votes with Justice B is the same as the number of times Justice B votes with Justice A.

b) 
    The first two singular values appear to be most important so $A_2$ should be a good approximation to $A$.

c) 
    $U=V$ since $A$ is a positive definite, symmetric matrix.

d) 
    The sixth justice, John Paul Stevens, is the least agreeable.

e) 
    The fourth and fifth justices, Anthony Kennedy and Sandra Day O'Connor are less inclined to agree with the others so they form swing votes.

:::

:::exercise {exercise-7-5-007} number=7.5.7 answered=yes src=src/exercises/exercises7-5.xml:809
PROBLEM:
Suppose that $A=U_r\Sigma_rV_r^T$ is a reduced singular value decomposition of the $m\times n$ matrix $A$. The matrix $A^+ = V_r\Sigma_r^{-1}U_r^T$ is called the *Moore-Penrose inverse* of $A$.

a) 
    Explain why $A^+$ is an $n\times m$ matrix.

b) 
    If $A$ is an invertible, square matrix, explain why $A^+=A^{-1}$.

c) 
    Explain why $AA^+{\mathbf b}=\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}$ onto $\text{Col}(A)$.

d) 
    Explain why $A^+A{\mathbf x}=\widehat{{\mathbf x}}$, the orthogonal projection of ${\mathbf x}$ onto $\text{Col}(A^T)$.

ANSWER:

a) 
    Find the number of columns of $U_r^T$ and the number of rows of $V_r$.

b) 
    If $A$ is invertible, then $A$ is an $m\times m$ matrix whose rank is $m$.

c) 
    $AA^{+} = (U_r\Sigma_rV_r^T)(V_r\Sigma^{-1}U_r^T) = U_rU_r^T$

d) 
    $AA^{+} = (V_r\Sigma^{-1}U_r^T)(U_r\Sigma_rV_r^T) V_rV_r^T$

SOLUTION:

a) 
    The number of columns of $A^+$ is the number of columns of $U_r^T$, which is $m$, and the number of rows is the number of rows of $V_r$, which is $n$.

b) 
    If $A$ is invertible, then $A$ is an $m\times m$ matrix whose rank is $m$. The reduced singular value decomposition is therefore $A=U\Sigma V^T$ so that $A^+=V\Sigma^{-1}U^T = (U\Sigma V^T)^{-1}=A^{-1}$.

c) 
    $AA^{+} = (U_r\Sigma_rV_r^T)(V_r\Sigma^{-1}U_r^T) = U_rU_r^T$, which projects vectors orthogonal onto $\text{Col}(A)$ since the columns of $U_r$ are an orthonormal basis for $\text{Col}(A)$.

d) 
    $AA^{+} = (V_r\Sigma^{-1}U_r^T)(U_r\Sigma_rV_r^T) V_rV_r^T$, which projects vectors orthogonal onto $\text{Col}(A^T)$ since the columns of $V_r$ are an orthonormal basis for $\text{Col}(A^T)$.

:::

:::exercise {exercise-7-5-008} number=7.5.8 answered=yes src=src/exercises/exercises7-5.xml:915
PROBLEM:
In [Subsection 5.1.2](ref:5.1#subsec-partial-pivot), we saw how some linear algebraic computations are sensitive to round off error made by a computer. A singular value decomposition can help us understand when this situation can occur.
For instance, consider the matrices

$$ A = \begin{bmatrix} 1.0001 & 1 \\ 1 & 1 \\ \end{bmatrix},\hspace{24pt} B = \begin{bmatrix} 1 & 1 \\ 1 & 1 \\ \end{bmatrix}. $$

The entries in these matrices are quite close to one another, but $A$ is invertible while $B$ is not. It seems like $A$ is *almost* singular. In fact, we can measure how close a matrix is to being singular by forming the *condition number*, $\sigma_1/\sigma_n$, the ratio of the largest to smallest singular value. If $A$ were singular, the condition number would be undefined because the singular value $\sigma_n=0$. Therefore, we will think of matrices with large condition numbers as being close to singular.

a) 
    Define the matrix $A$ and find a singular value decomposition. What is the condition number of $A$?

    :::sage
    ```sage

    ```
    :::

b) 
    Define the left singular vectors ${\mathbf u}_1$ and ${\mathbf u}_2$. Compare the results $A^{-1}{\mathbf b}$ when

    1. 
        ${\mathbf b}={\mathbf u}_1+{\mathbf u}_2$.

    2. 
        ${\mathbf b}=2{\mathbf u}_1+{\mathbf u}_2$.

    Notice how a small change in the vector ${\mathbf b}$ leads to a small change in $A^{-1}{\mathbf b}$.

c) 
    Now compare the results $A^{-1}{\mathbf b}$ when

    1. 
        ${\mathbf b}={\mathbf u}_1+{\mathbf u}_2$.

    2. 
        ${\mathbf b}={\mathbf u}_1+2{\mathbf u}_2$.

    Notice now how a small change in ${\mathbf b}$ leads to a large change in $A^{-1}{\mathbf b}$.

d) 
    Previously, we saw that, if we write ${\mathbf x}$ in terms of left singular vectors ${\mathbf x}=c_1{\mathbf v}_1+c_2{\mathbf v}_2$, then we have

    $$ {\mathbf b}=A{\mathbf x} = c_1\sigma_1{\mathbf u}_1 + c_2\sigma_2{\mathbf u}_2. $$

    If we write ${\mathbf b}=d_1{\mathbf u}_1+d_2{\mathbf u}_2$, explain why $A^{-1}{\mathbf b}$ is sensitive to small changes in $d_2$.

Generally speaking, a square matrix $A$ with a large condition number will demonstrate this type of behavior so that the computation of $A^{-1}$ is likely to be affected by round off error. We call such a matrix *ill-conditioned*.
ANSWER:

a) 
    The condition number is $40,000$

b) 

    1. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-14142.5 \\ 14142.5 \end{array}\right]$

    2. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-14142.8 \\ 14142.8 \end{array}\right]$

c) 

    1. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-14142.5 \\ 14142.5 \end{array}\right]$

    2. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-28284.6 \\ 28285.3 \end{array}\right]$

d) 
    $c_2=\frac{d_2}{\sigma_2}$

SOLUTION:

a) 
    The singular values of $A$ are $2$ and $5\times10^{-5}$, which means the condition number is $40,000$.

b) 

    1. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-14142.5 \\ 14142.5 \end{array}\right]$

    2. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-14142.8 \\ 14142.8 \end{array}\right]$

c) 

    1. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-14142.5 \\ 14142.5 \end{array}\right]$

    2. 
        $A^{-1}{\mathbf b} = \left[\begin{array}{r}-28284.6 \\ 28285.3 \end{array}\right]$

d) 
    We have $d_i = \sigma_ic_i$ so $c_i=\frac{d_i}{\sigma_i}$. Since $\sigma_2$ is so much smaller than $\sigma_1$, even small changes in $d_2$ can lead to relatively large changes in $c_2$.

:::
