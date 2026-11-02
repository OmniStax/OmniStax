# 5.2 Finding eigenvectors numerically {sec-power-method}

We have typically found eigenvalues of a square matrix $A$ as the roots of the characteristic polynomial $\det(A-\lambda I) = 0$ and the associated eigenvectors as the null space $\text{Nul}(A-\lambda I)$. Unfortunately, this approach is not practical when we are working with large matrices. First, finding the charactertic polynomial of a large matrix requires considerable computation, as does finding the roots of that polynomial. Second, finding the null space of a singular matrix is plagued by numerical problems, as we will see in the preview activity.
For this reason, we will explore a technique called the *power method* that finds numerical approximations to the eigenvalues and eigenvectors of a square matrix.

## 5.2.1 Introduction

:::exploration {act:preview-5-2-1} Preview Activity 5.2.1
Let's recall some earlier observations about eigenvalues and eigenvectors.
PROBLEM:
a) How are the eigenvalues and associated eigenvectors of $A$ related to those of $A^{-1}$?
b) How are the eigenvalues and associated eigenvectors of $A$ related to those of $A-3I$?
c) If $\lambda$ is an eigenvalue of $A$, what can we say about the pivot positions of $A-\lambda I$?
d) Suppose that $A = \left[\begin{array}{rr} 0.8 & 0.4 \\ 0.2 & 0.6 \\ \end{array}\right]$. Explain how we know that $1$ is an eigenvalue of $A$ and then explain why the following Sage computation is incorrect.
    :::sage
    ```sage
    A = matrix(2,2,[0.8, 0.4, 0.2, 0.6])
    I = matrix(2,2,[1, 0, 0, 1])
    (A-I).rref()

    ```
    :::
e) Suppose that ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$, and we define a sequence ${\mathbf x}_{k+1} = A{\mathbf x}_k$; in other words, ${\mathbf x}_{k} = A^k{\mathbf x}_0$. What happens to ${\mathbf x}_k$ as $k$ grows increasingly large?
f) Explain how the eigenvalues of $A$ are responsible for the behavior noted in the previous question.
SOLUTION:
a) If $\lambda$ is an eigenvalue of $A$, then $A{\mathbf v}=\lambda{\mathbf v}$ for an associated eigenvector ${\mathbf v}$. Multiplying by $A^{-1}$ and $\lambda^{-1}$, we obtain $\lambda^{-1}{\mathbf v} = A^{-1}{\mathbf v}$, which shows that $\lambda^{-1}$ is an eigenvalue of $A^{-1}$.
b) In the same way, if $\lambda$ is an eigenvalue of $A$, then $A{\mathbf v}=\lambda{\mathbf v}$ for an associated eigenvector ${\mathbf v}$. This means that $(A-3I){\mathbf v} = (\lambda-3){\mathbf v}$ so that $\lambda-3$ is an eigenvalue of $A-3I$.
c) If $\lambda$ is an eigenvalue of $A$, then $A-\lambda I$ is not invertible and so has a row without a pivot position.
d) Since $A$ is a positive stochastic matrix, we know that $\lambda=1$ is an eigenvalue and hence that $A-I$ is not invertible. Sage, however, tells us that $A-I\sim I$, which cannot be true since $A-I$ is not invertible.
e) The vectors ${\mathbf x}_k$ form a Markov chain, which must converge to the steady-state vector ${\mathbf q}=\left[\begin{array}{r}\frac23 \\ \frac13 \end{array}\right]$.
f) We have eigenvalues $\lambda_1=1$ and $\lambda_2=0.4$. If we begin with ${\mathbf x}_0=c_1{\mathbf v}_1+c_2{\mathbf v}_2$ and successively multiply by $A$, we have ${\mathbf x}_k=c_1{\mathbf v}_1 + c_2(0.4)^k{\mathbf v}_2$. When $k$ becomes large, the coefficient of ${\mathbf v}_2$ becomes insignificantly small so we are left with an eigenvector in $E_1$.
:::

## 5.2.2 The power method

Our goal is to find a technique that produces numerical approximations to the eigenvalues and associated eigenvectors of a matrix $A$. We begin by searching for the eigenvalue having the largest absolute value, which is called the *dominant* eigenvalue. The next two examples demonstrate this technique. {index-entry:eigenvalue, dominant}

:::example {ex:example-5-2-1} Example 5.2.1
Let's begin with the positive stochastic matrix $A=\left[\begin{array}{rr} 0.7 & 0.6 \\ 0.3 & 0.4 \\ \end{array}\right]$. We spent quite a bit of time studying this type of matrix in [Section 4.5](ref:4.5#sec-stochastic); in particular, we saw that any Markov chain will converge to the unique steady-state vector. Let's rephrase this statement in terms of the eigenvectors of $A$.
This matrix has eigenvalues $\lambda_1 = 1$ and $\lambda_2 =0.1$ so the dominant eigenvalue is $\lambda_1 = 1$. The associated eigenvectors are ${\mathbf v}_1 = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$ and ${\mathbf v}_2 = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. Suppose we begin with the vector

$$ {\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right] = \frac13 {\mathbf v}_1 - \frac13 {\mathbf v}_2 $$

and find

$$ \begin{aligned} {\mathbf x}_1 & {}={} A{\mathbf x}_0 = \frac13 {\mathbf v}_1 - \frac13(0.1) {\mathbf v}_2 \\ {\mathbf x}_2 & {}={} A^2{\mathbf x}_0 = \frac13 {\mathbf v}_1 - \frac13(0.1)^2 {\mathbf v}_2 \\ {\mathbf x}_3 & {}={} A^3{\mathbf x}_0 = \frac13 {\mathbf v}_1 - \frac13(0.1)^3 {\mathbf v}_2 \\ & \vdots \\ {\mathbf x}_k & {}={} A^k{\mathbf x}_0 = \frac13 {\mathbf v}_1 - \frac13(0.1)^k {\mathbf v}_2 \\ \end{aligned} $$

and so forth. Notice that the powers $0.1^k$ become increasingly small as $k$ grows so that ${\mathbf x}_k\approx \frac13{\mathbf v}_1$ when $k$ is large. Therefore, the vectors ${\mathbf x}_k$ become increasingly close to a vector in the eigenspace $E_1$, the eigenspace associated to the dominant eigenvalue. If we did not know the eigenvector ${\mathbf v}_1$, we could use a Markov chain in this way to find a basis vector for $E_1$, which, as seen in [Section 4.5](ref:4.5#sec-stochastic), is essentially how the Google PageRank algorithm works.
:::

:::example {ex:example-5-2-2} Example 5.2.2
Let's now look at the matrix $A = \left[\begin{array}{rr} 2 & 1 \\ 1 & 2 \\ \end{array}\right]$, which has eigenvalues $\lambda_1=3$ and $\lambda_2 = 1$. The dominant eigenvalue is $\lambda_1=3$, and the associated eigenvectors are ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_{2} = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$. Once again, begin with the vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]=\frac12 {\mathbf v}_1 - \frac12 {\mathbf v}_2$ so that

$$ \begin{aligned} {\mathbf x}_1 & {}={} A{\mathbf x}_0 = 3\frac12 {\mathbf v}_1 - \frac12 {\mathbf v}_2 \\ {\mathbf x}_2 & {}={} A^2{\mathbf x}_0 = 3^2\frac13 {\mathbf v}_1 - \frac12 {\mathbf v}_2 \\ {\mathbf x}_3 & {}={} A^3{\mathbf x}_0 = 3^3\frac13 {\mathbf v}_1 - \frac12 {\mathbf v}_2 \\ & \vdots \\ {\mathbf x}_k & {}={} A^k{\mathbf x}_0 = 3^k\frac13 {\mathbf v}_1 - \frac12 {\mathbf v}_2\text{.} \\ \end{aligned} $$

As the figure shows, the vectors ${\mathbf x}_k$ are stretched by a factor of $3$ in the ${\mathbf v}_1$ direction and not at all in the ${\mathbf v}_2$ direction. Consequently, the vectors ${\mathbf x}_k$ become increasingly long, but their direction becomes closer to the direction of the eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ associated to the dominant eigenvalue.

> IMAGE {img:numerical-power} src=../../media/ch05/numerical-power.svg
> alt: Three vectors obtained by repeatedly multiplying by a matrix.

To find an eigenvector associated to the dominant eigenvalue, we will prevent the length of the vectors ${\mathbf x}_k$ from growing arbitrarily large by multiplying by an appropriate scaling constant. Here is one way to do this. Given the vector ${\mathbf x}_k$, we identify its component having the largest absolute value and call it $m_k$. We then define $\overline{{\mathbf x}}_k = \frac{1}{m_k} {\mathbf x}_k$, which means that the component of $\overline{{\mathbf x}}_k$ having the largest absolute value is $1$.
For example, beginning with ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$, we find ${\mathbf x}_1 = A{\mathbf x}_{0} = \left[\begin{array}{r}2 \\ 1 \end{array}\right]$. The component of ${\mathbf x}_1$ having the largest absolute value is $m_1=2$ so we multiply by $\frac{1}{m_1} = \frac12$ to obtain $\overline{{\mathbf x}}_1 = \left[\begin{array}{r}1 \\ \frac12 \end{array}\right]$. Then ${\mathbf x}_2 = A\overline{{\mathbf x}}_1 = \left[\begin{array}{r}\frac52 \\ 2 \end{array}\right]$. Now the component having the largest absolute value is $m_2=\frac52$ so we multiply by $\frac25$ to obtain $\overline{{\mathbf x}}_2 = \left[\begin{array}{r}1 \\ \frac45 \end{array}\right]$.
The resulting sequence of vectors $\overline{{\mathbf x}}_k$ is shown in the figure. Notice how the vectors $\overline{{\mathbf x}}_k$ now approach the eigenvector ${\mathbf v}_1$, which gives us a way to find the eigenvector ${\mathbf v}=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$. This is the *power method* for finding an eigenvector associated to the dominant eigenvalue of a matrix. {index-entry:power method}

> IMAGE {img:numerical-power-norm} src=../../media/ch05/numerical-power-norm.svg
> alt: A sequence of vectors produced by the power method.

:::

:::activity {act:activity-5-2-2} Activity 5.2.2
Let's begin by considering the matrix $A = \left[\begin{array}{rr} 0.5 & 0.2 \\ 0.4 & 0.7 \\ \end{array}\right]$ and the initial vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$.
:::sage
```sage

```
:::

a) 
    Compute the vector ${\mathbf x}_1 = A{\mathbf x}_0$.

b) 
    Find $m_1$, the component of ${\mathbf x}_1$ that has the largest absolute value. Then form $\overline{{\mathbf x}}_1 = \frac 1{m_1} {\mathbf x}_1$. Notice that the component having the largest absolute value of $\overline{{\mathbf x}}_1$ is $1$.

c) 
    Find the vector ${\mathbf x}_2 = A\overline{{\mathbf x}}_1$. Identify the component $m_2$ of ${\mathbf x}_2$ having the largest absolute value. Then form $\overline{{\mathbf x}}_2 = \frac1{m_2}\overline{{\mathbf x}}_1$ to obtain a vector in which the component with the largest absolute value is $1$.

d) 
    The Sage cell below defines a function that implements the power method. Define the matrix $A$ and initial vector ${\mathbf x}_0$ below. The command `power(A, x0,	N)` will print out the multiplier $m$ and the vectors $\overline{{\mathbf x}}_k$ for $N$ steps of the power method.

    :::sage
    ```sage
    def power(A, x, N):
        for i in range(N):
            x = A*x
            m = max([comp for comp in x], key=abs).numerical_approx(digits=14)
            x = 1/float(m)*x
            print (m, x)

    ### Define the matrix A and initial vector x0 below
    A =
    x0 =
    power(A, x0, 20)

    ```
    :::

    How does this computation identify an eigenvector of the matrix $A$?

e) 
    What is the corresponding eigenvalue of this eigenvector?

f) 
    How do the values of the multipliers $m_k$ tell us the eigenvalue associated to the eigenvector we have found?

g) 
    Consider now the matrix $A=\left[\begin{array}{rr} -5.1 & 5.7 \\ -3.8 & 4.4 \\ \end{array}\right]$. Use the power method to find the dominant eigenvalue of $A$ and an associated eigenvector.

SOLUTION:

a) 
    We find ${\mathbf x}_1=A{\mathbf x}_0 = \left[\begin{array}{r}0.5 \\ 0.4 \end{array}\right]$.

b) 
    The first component has the largest absolute value so $m_1=0.5$. Therefore, $\overline{{\mathbf x}}_1=\frac1{0.5}{\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0.8 \end{array}\right]$.

c) 
    In the same way, we obtain ${\mathbf x}_2=A\overline{{\mathbf x}}_1 = \left[\begin{array}{r}0.66 \\ 0.96 \end{array}\right]$. We see that $m_2=0.96$ so we have $\overline{{\mathbf x}}_2= \left[\begin{array}{r}0.688 \\ 1 \end{array}\right]$.

d) 
    We see that the vectors ${\mathbf x}_k$ are getting closer and closer to $\left[\begin{array}{r}0.5 \\ 1 \end{array}\right]$, which we therefore identify as an eigenvector associated to the dominant eigenvalue.

e) 
    We see that $A\left[\begin{array}{r}0.5 \\ 1 \end{array}\right] = \left[\begin{array}{r}0.45 \\ 0.9 \end{array}\right]=0.9 \left[\begin{array}{r}0.5 \\ 1 \end{array}\right]$. Therefore, the dominant eigenvalue is $\lambda_1=0.9$.

f) 
    More generally, we see that the multiplier $m_k$ will converge to the dominant eigenvalue.

g) 
    The power method constructs a sequence of vectors $\overline{{\mathbf x}}_k$ converging to an eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ \frac23 \end{array}\right]$. The multipliers $m_k$ converge to $\lambda_1=1.3$, the dominant eigenvalue.

:::

Notice that the power method gives us not only an eigenvector ${\mathbf v}$ but also its associated eigenvalue. As in the activity, consider the matrix $A=\left[\begin{array}{rr} -5.1 & 5.7 \\ -3.8 & 4.4 \\ \end{array}\right]$, which has eigenvector ${\mathbf v}=\left[\begin{array}{r}3 \\ 2 \end{array}\right]$. The first component has the largest absolute value so we multiply by $\frac13$ to obtain $\overline{{\mathbf v}}=\left[\begin{array}{r}1 \\ \frac23 \end{array}\right]$. When we multiply by $A$, we have $A\overline{{\mathbf v}} = \left[\begin{array}{r}-1.30 \\ -0.86 \end{array}\right]$. Notice that the first component still has the largest absolute value so that the multiplier $m=-1.3$ is the eigenvalue $\lambda$ corresponding to the eigenvector. This demonstrates the fact that the multipliers $m_k$ approach the eigenvalue $\lambda$ having the largest absolute value.

Notice that the power method requires us to choose an initial vector ${\mathbf x}_0$. For most choices, this method will find the eigenvalue having the largest absolute value. However, an unfortunate choice of ${\mathbf x}_0$ may not. For instance, if we had chosen ${\mathbf x}_0 = {\mathbf v}_2$ in our example above, the vectors in the sequence ${\mathbf x}_k = A^k{\mathbf x}_0=\lambda_2^k{\mathbf v}_2$ will not detect the eigenvector ${\mathbf v}_1$. However, it usually happens that our initial guess ${\mathbf x}_0$ has some contribution from ${\mathbf v}_1$ that enables us to find it.

The power method, as presented here, will fail for certain unlucky matrices. This is examined in [Exercise 5.2.5](ref:exercise-power-method) along with a means to improve the power method to work for all matrices.

## 5.2.3 Finding other eigenvalues

The power method gives a technique for finding the dominant eigenvalue of a matrix. We can modify the method to find the other eigenvalues as well.

:::activity {act:activity-5-2-3} Activity 5.2.3
The key to finding the eigenvalue of $A$ having the smallest absolute value is to note that the eigenvectors of $A$ are the same as those of $A^{-1}$.

a) 
    If ${\mathbf v}$ is an eigenvector of $A$ with associated eigenvector $\lambda$, explain why ${\mathbf v}$ is an eigenvector of $A^{-1}$ with associated eigenvalue $\lambda^{-1}$.

b) 
    Explain why the eigenvalue of $A$ having the smallest absolute value is the reciprocal of the dominant eigenvalue of $A^{-1}$.

c) 
    Explain how to use the power method applied to $A^{-1}$ to find the eigenvalue of $A$ having the smallest absolute value.

d) 
    If we apply the power method to $A^{-1}$, we begin with an intial vector ${\mathbf x}_0$ and generate the sequence ${\mathbf x}_{k+1} = A^{-1}{\mathbf x}_k$. It is not computationally efficient to compute $A^{-1}$, however, so instead we solve the equation $A{\mathbf x}_{k+1} = {\mathbf x}_k$. Explain why an $LU$ factorization of $A$ is useful for implementing the power method applied to $A^{-1}$.

e) 
    The following Sage cell defines a command called `inverse_power` that applies the power method to $A^{-1}$. That is, `inverse_power(A, x0, N)` prints the vectors ${\mathbf x}_k$, where ${\mathbf x}_{k+1} = A^{-1}{\mathbf x}_k$, and multipliers $\frac{1}{m_k}$, which approximate the eigenvalue of $A$. Use it to find the eigenvalue of $A=\left[\begin{array}{rr} -5.1 & 5.7 \\ -3.8 & 4.4 \\ \end{array}\right]$ having the smallest absolute value.

    :::sage
    ```sage
    def inverse_power(A, x, N):
        for i in range(N):
            x = A \ x
            m = max([comp for comp in x], key=abs).numerical_approx(digits=14)
            x = 1/float(m)*x
            print (1/float(m), x)
    ### define the matrix A and vector x0
    A =
    x0 =
    inverse_power(A, x0, 20)

    ```
    :::

f) 
    The inverse power method only works if $A$ is invertible. If $A$ is not invertible, what is its eigenvalue having the smallest absolute value?

g) 
    Use the power method and the inverse power method to find the eigenvalues and associated eigenvectors of the matrix $A = \left[\begin{array}{rr} -0.23 & -2.33 \\ -1.16 & 1.08 \\ \end{array}\right]$.

SOLUTION:

a) 
    If $\lambda$ is an eigenvalue of $A$, then $A{\mathbf v}=\lambda{\mathbf v}$ for an associated eigenvector ${\mathbf v}$. Multiplying by $A^{-1}$ and $\lambda^{-1}$, we obtain $\lambda^{-1}{\mathbf v} = A^{-1}{\mathbf v}$, which shows that $\lambda^{-1}$ is an eigenvalue of $A^{-1}$.

b) 
    If $|\lambda_2| < |\lambda_1|$, then $|\lambda_2^{-1}| > |\lambda_1^{-1}|$. Therefore, the reciprocal of the smallest eigenvalue of $A$ is the dominant eigenvalue of $A^{-1}$.

c) 
    If we apply the power method to the matrix $A^{-1}$, we will find the dominant eigenvalue $\lambda$ and an associated eigenvector ${\mathbf v}$ of $A^{-1}$. We know, however, that $\lambda^{-1}$ will be the eigenvalue of $A$ having the smallest absolute value and ${\mathbf v}$ will be an associated eigenvector.

d) 
    We would like to solve equations of the form $A{\mathbf x} = {\mathbf b}$ for many different vectors ${\mathbf b}$. Using an $LU$ factorization allows us to recycle for subsequent equations the effort we expend performing Gaussian elimination to solve the first equation.

e) 
    We obtain the eigenvector ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and associated eigenvalue $\lambda_2=0.6$.

f) 
    If $A$ is not invertible, then $\lambda=0$ is the eigenvalue having the smallest absolute value.

g) 
    We find the dominant eigenvalue to be $\lambda_1=2.195$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}-0.961 \\ 1 \end{array}\right]$. The smallest eigenvalue is $\lambda_2=-1.345$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}1 \\ 0.478 \end{array}\right]$.

:::

With the power method and the inverse power method, we can now find the eigenvalues of a matrix $A$ having the largest and smallest absolute values. With one more modification, we can find all the eigenvalues of $A$.

:::activity {act:activity-5-2-4} Activity 5.2.4
Remember that the absolute value of a number tells us how far that number is from $0$ on the real number line. We may therefore think of the inverse power method as telling us the eigenvalue closest to $0$.

a) 
    If ${\mathbf v}$ is an eigenvector of $A$ with associated eigenvalue $\lambda$, explain why ${\mathbf v}$ is an eigenvector of $A - sI$ where $s$ is some scalar.

b) 
    What is the eigenvalue of $A-sI$ associated to the eigenvector ${\mathbf v}$?

c) 
    Explain why the eigenvalue of $A$ closest to $s$ is the eigenvalue of $A-sI$ closest to $0$.

d) 
    Explain why applying the inverse power method to $A-sI$ gives the eigenvalue of $A$ closest to $s$.

e) 
    Consider the matrix $A = \left[\begin{array}{rrrr} 3.6 & 1.6 & 4.0 & 7.6 \\ 1.6 & 2.2 & 4.4 & 4.1 \\ 3.9 & 4.3 & 9.0 & 0.6 \\ 7.6 & 4.1 & 0.6 & 5.0 \\ \end{array}\right]$. If we use the power method and inverse power method, we find two eigenvalues, $\lambda_1=16.35$ and $\lambda_2=0.75$. Viewing these eigenvalues on a number line, we know that the other eigenvalues lie in the range between $-\lambda_1$ and $\lambda_1$, as shaded in [Figure 5.2.3](ref:fig-numerical-power-line).

    > FIGURE {fig:fig-numerical-power-line} number=5.2.3 src=../../media/ch05/numerical-power-line.svg
    > alt: A number line with regions indicated in which the other eigenvalues may lie.
    > width: 75%
    > caption: The range of eigenvalues of $A$.

    The Sage cell below has a function `find_closest_eigenvalue(A, s, x, N)` that implements $N$ steps of the inverse power method using the matrix $A-sI$ and an initial vector $x$. This function prints approximations to the eigenvalue of $A$ closest to $s$ and its associated eigenvector. By trying different values of $s$ in the shaded regions of the number line shown in [Figure 5.2.3](ref:fig-numerical-power-line), find the other two eigenvalues of $A$.

    :::sage
    ```sage
    def find_closest_eigenvalue(A, s, x, N):
        B = A-s*identity_matrix(A.nrows())
        for i in range(N):
            x = B \ x
            m = max([comp for comp in x], key=abs).numerical_approx(digits=14)
            x = 1/float(m)*x
            print (1/float(m)+s, x)
    ### define the matrix A and vector x0
    A =
    x0 =
    find_closest_eigenvalue(A, 2, x0, 20)

    ```
    :::

f) 
    Write a list of the four eigenvalues of $A$ in increasing order.

SOLUTION:

a) 
    If $A{\mathbf v}=\lambda{\mathbf v}$, then $(A-sI){\mathbf v} = (\lambda-s){\mathbf v}$, which shows that ${\mathbf v}$ is also an eigenvector of $A-sI$.

b) 
    From the previous part, we see that the associated eigenvalue is $\lambda-s$.

c) 
    If $\lambda$ is the eigenvalue of $A$ closest to $s$, then $\lambda-s$ is an eigenvalue of $A-sI$ that must be the closest to $0$.

d) 
    The inverse power method applied to $A-sI$ tells us the eigenvalue of $A-sI$ having the smallest absolute value and an associated eigenvector ${\mathbf v}$. Therefore, $\lambda+s$ is the eigenvalue of $A$ closest to $s$ and ${\mathbf v}$ is an associated eigenvector.

e) 
    We begin by trying to find the closest eigenvalue to, say, $-10$. The power method tells us that this eigenvalue is $\lambda_3=-4.823$. If we then try to find the eigenvalue closest to $10$, we find the fourth eigenvalue $\lambda_4=7.526$. It may require some experimentation to find all of the eigenvalues.

f) 
    The eigenvalues are $-4.823, 0.746, 7.526, 16.351$.

:::

There are some restrictions on the matrices to which this technique applies as we have assumed that the eigenvalues of $A$ are real and distinct. If $A$ has repeated or complex eigenvalues, this technique will need to be modified, as explored in some of the exercises.

## 5.2.4 Summary

We have explored the power method as a tool for numerically approximating the eigenvalues and eigenvectors of a matrix.

- 
    After choosing an initial vector ${\mathbf x}_0$, we define the sequence ${\mathbf x}_{k+1}=A{\mathbf x}_k$. As $k$ grows larger, the direction of the vectors ${\mathbf x}_k$ closely approximates the direction of the eigenspace corresponding to the eigenvalue $\lambda_1$ having the largest absolute value.

- 
    We normalize the vectors ${\mathbf x}_k$ by multiplying by $\frac{1}{m_k}$, where $m_k$ is the component having the largest absolute value. In this way, the vectors $\overline{{\mathbf x}}_k$ approach an eigenvector associated to $\lambda_1$, and the multipliers $m_k$ approach the eigenvalue $\lambda_1$.

- 
    To find the eigenvalue having the smallest absolute value, we apply the power method using the matrix $A^{-1}$.

- 
    To find the eigenvalue closest to some number $s$, we apply the power method using the matrix $(A-sI)^{-1}$.

## 5.2.5 Exercises

This Sage cell has the commands `power`, `inverse_power`, and `find_closest_eigenvalue` that we have developed in this section. After evaluating this cell, these commands will be available in any other cell on this page.
:::sage
```sage
def power(A, x, N):
    for i in range(N):
        x = A*x
        m = max([comp for comp in x], key=abs).numerical_approx(digits=14)
        x = 1/float(m)*x
        print (m, x)
def find_closest_eigenvalue(A, s, x, N):
    B = A-s*identity_matrix(A.nrows())
    for i in range(N):
        x = B \ x
        m = max([comp for comp in x], key=abs).numerical_approx(digits=14)
        x = 1/float(m)*x
        print (1/float(m)+s, x)
def inverse_power(A, x, N):
    find_closest_eigenvalue(A, 0, x, N)

```
:::

:::exercise {exercise-5-2-001} number=5.2.1 answered=yes src=src/exercises/exercises5-2.xml:30
PROBLEM:
Suppose that $A$ is a matrix having eigenvalues $-3$, $-0.2$, $1$, and $4$.

a) 
    What are the eigenvalues of $A^{-1}$?

b) 
    What are the eigenvalues of $A+7I$?

ANSWER:

a) 
    $-\frac13$, $-5$, $1$, and $\frac14$.

b) 
    $-4$, $6.8$, $8$, and $12$.

SOLUTION:

a) 
    The eigenvalues of $A^{-1}$ are the reciprocals of the eigenvalues of $A$. They are, therefore, $-\frac13$, $-5$, $1$, and $\frac14$.

b) 
    If $\lambda$ is an eigenvalue of $A$, then $\lambda+7$ is an eigenvalue of $A+7I$. Therefore, the eigenvalues of $A+7I$ are $-4$, $6.8$, $8$, and $12$.

:::

:::exercise {exercise-5-2-002} number=5.2.2 answered=yes src=src/exercises/exercises5-2.xml:66
PROBLEM:
Use the commands `power`, `inverse_power`, and `find_closest_eigenvalue` to approximate the eigenvalues and associated eigenvectors of the following matrices.
:::sage
```sage

```
:::

a) 
    $A= \left[\begin{array}{rr} -2 & -2 \\ -8 & -2 \\ \end{array}\right]$.

b) 
    $A= \left[\begin{array}{rr} 0.6 & 0.7 \\ 0.5 & 0.2 \\ \end{array}\right]$.

c) 
    $A= \left[\begin{array}{rrrr} 1.9 & -16.0 & -13.0 & 27.0 \\ -2.4 & 20.3 & 4.6 & -17.7 \\ -0.51 & -11.7 & -1.4 & 13.1 \\ -2.1 & 15.3 & 6.9 & -20.5 \\ \end{array}\right]$.

ANSWER:

a) 
    $\lambda = -6$ and $2$.

b) 
    $\lambda=1.024$ and $-0.224$.

c) 
    $\lambda = -14.014$, $-1.530$, $11.226$, and $4.618$.

SOLUTION:

a) 
    The power method tells us that the dominant eigenvalue is $\lambda_1=-6$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}0.5 \\ 1 \end{array}\right]$. The inverse power method tells us that the eigenvalue having the smallest absolute value is $\lambda_2=2$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}-0.5 \\ 1 \end{array}\right]$.

b) 
    The power method tells us that the dominant eigenvalue is $\lambda_1=1.024$ with associated eigenvector ${\mathbf v}_1=\left[\begin{array}{r}1 \\ 0.606 \end{array}\right]$. The inverse power method tells us that the eigenvalue having the smallest absolute value is $\lambda_2=-0.224$ with associated eigenvector ${\mathbf v}_2=\left[\begin{array}{r}-0.849 \\ 1 \end{array}\right]$.

c) 
    The power method tells us that the dominant eigenvalue is $\lambda_1=-14.014$. The inverse power method tells us that the eigenvalue having the smallest absolute value is $\lambda_2=-1.530$. If we now look for the closest eigenvalue to $-9$, we see that it is $\lambda_1=-14.014$, which we have already found. Let's try again, this time looking to find the closest eigenvalue to $10$. Here, we find $\lambda_3=11.226$. If we next try to find the eigenvalue closest to $4$, we find it to be $\lambda_4=4.618$.

    The four eigenvalues are then $-14.014$, $-1.530$, $11.226$, and $4.618$.

:::

:::exercise {exercise-5-2-003} number=5.2.3 answered=yes src=src/exercises/exercises5-2.xml:148
PROBLEM:
Use the techniques we have seen in this section to find the eigenvalues of the matrix

$$ A= \left[\begin{array}{rrrrr} -14.6 & 9.0 & -14.1 & 5.8 & 13.0 \\ 27.8 & -4.2 & 16.0 & 0.9 & -21.3 \\ -5.5 & 3.4 & 3.4 & 3.3 & 1.1 \\ -25.4 & 11.3 & -15.4 & 4.7 & 20.3 \\ -33.7 & 14.8 & -22.5 & 9.7 & 26.6 \\ \end{array}\right] $$

.
:::sage
```sage
A = matrix(5,5, [-14.6,  9.0, -14.1, 5.8,  13.0,
                  27.8, -4.2,  16.0, 0.9, -21.3,
                  -5.5,  3.4,   3.4, 3.3,   1.1,
                 -25.4, 11.3, -15.4, 4.7,  20.3,
                 -33.7, 14.8, -22.5, 9.7,  26.6])

```
:::
ANSWER:
$\lambda=9.449$, $-2.134$, $-4.399$, $7.100$, and $5.974$.
SOLUTION:
The power method shows us that $\lambda_1=9.449$ is the dominant eigenvalue. The inverse power method tells us that $-2.134$ is the eigenvalue having the smallest absolute value. We then probe in between these values to find eigenvalues $-4.399$, $7.100$, and $5.974$.
:::

:::exercise {exercise-5-2-004} number=5.2.4 answered=yes src=src/exercises/exercises5-2.xml:188
PROBLEM:
Consider the matrix $A = \left[\begin{array}{rr} 0 & -1 \\ -4 & 0 \\ \end{array}\right]$.
:::sage
```sage

```
:::

a) 
    Describe what happens if we apply the power method and the inverse power method using the initial vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

b) 
    Find the eigenvalues of this matrix and explain this observed behavior.

c) 
    How can we apply the techniques of this section to find the eigenvalues of $A$?

ANSWER:

a) 
    The methods do not converge.

b) 
    There is not a unique dominant eigenvalue.

c) 
    Try finding an eigenvalue closest to, say, $5$.

SOLUTION:

a) 
    We see that neither the power method nor the inverse power method converge.

b) 
    The eigenvalues are $\lambda=2$ and $-2$. This means that there is not a unique dominant eigenvalue and there is not a unique eigenvalue with the smallest absolute value. The methods try to find first one of them and then the other.

c) 
    To break the symmetry, we can look for an eigenvalue closest to, say, $5$. When we do this, we find the eigenvalue $\lambda_1=2$. Then look for another eigenvalue closest to $-5$ to find $\lambda_2=-2$.

:::

:::exercise {exercise-5-2-005} number=5.2.5 answered=yes src=src/exercises/exercises5-2.xml:245 label=exercise-power-method
PROBLEM:
We have seen that the matrix $A = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right]$ has eigenvalues $\lambda_1 = 3$ and $\lambda_2=-1$ and associated eigenvectors ${\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf v}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.

a) 
    Describe what happens when we apply the inverse power method using the initial vector ${\mathbf x}_0 = \left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

b) 
    Explain why this is happening and provide a contrast with how the power method usually works.

c) 
    How can we modify the power method to give the dominant eigenvalue in this case?

ANSWER:

a) 
    We see that the vectors $\overline{{\mathbf x}}_k$ do not converge and the multipliers $m_k$ converge to the wrong value.

b) 
    The multipliers are obtained from the first component, then the second component, then the first, and so on.

c) 
    Choose one of the components, say, the first one and consider the ratio between that component of $A\overline{{\mathbf x}}_k$ and $\overline{{\mathbf x}}_k$ in place of the multiplier $m_k$.

SOLUTION:

a) 
    We see that the vectors $\overline{{\mathbf x}}_k$ do not converge but instead flip between approximations to ${\mathbf v}_2$ and $-{\mathbf v}_2$. Also, the multipliers $m_k$ are converging to $1$ rather than $-1$.

b) 
    When applying the power method, the multipliers $m_k$ are usually formed from the same component of the vectors $\overline{{\mathbf x}}_k$ in every iteration. Here, we see that the multipliers are obtained from the first component, then the second component, then the first, and so on.

c) 
    Choose one of the components, say, the first one and consider the ratio between that component of $A\overline{{\mathbf x}}_k$ and $\overline{{\mathbf x}}_k$ in place of the multiplier $m_k$. The problem is that you must make sure that this component is not approaching zero.

:::

:::exercise {exercise-5-2-006} number=5.2.6 answered=yes src=src/exercises/exercises5-2.xml:314
PROBLEM:
Suppose that $A$ is a $2\times2$ matrix with eigenvalues $4$ and $-3$ and that $B$ is a $2\times2$ matrix with eigenvalues $4$ and $1$. If we apply the power method to find the dominant eigenvalue of these matrices to the same degree of accuracy, which matrix will require more steps in the algorithm? Explain your response.
ANSWER:
We will need more steps when finding the dominant eigenvalue of $A$.
SOLUTION:
For both matrices, $\lambda_1=4$ is the dominant eigenvalue and $\lambda_2$ is the eigenvalue closest to $0$. We will construct the initial vector as a linear combination of eigenvectors: ${\mathbf x}_0 = c_1{\mathbf v}_1+ c_2{\mathbf v}_2$. Then $A^k{\mathbf x}_0 = c_14^k{\mathbf v}_1+c_2\lambda_2^k{\mathbf v}_2$. For the matrix $B$, $\lambda_2=1$ is relatively small compared to $\lambda_1=4$ so we expect the contribution from ${\mathbf v}_2$ to become smaller more quickly. Therefore, we will need more steps in the power method to find the dominant eigenvalue of $A$.
:::

:::exercise {exercise-5-2-007} number=5.2.7 answered=yes src=src/exercises/exercises5-2.xml:345
PROBLEM:
Suppose that we apply the power method to the matrix $A$ with an initial vector ${\mathbf x}_0$ and find the eigenvalue $\lambda=3$ and eigenvector ${\mathbf v}$. Suppose that we then apply the power method again with a different initial vector and find the same eigenvalue $\lambda=3$ but a different eigenvector ${\mathbf w}$. What can we conclude about the matrix $A$ in this case?
ANSWER:
$\lambda=3$ is the dominant eigenvalue with a multiplicity greater than one.
SOLUTION:
The dominant eigenvector is $\lambda=3$ but it has a multiplicity greater than one and the associated eigenspace has $\dim E_3 > 1$.
:::

:::exercise {exercise-5-2-008} number=5.2.8 answered=yes src=src/exercises/exercises5-2.xml:369
PROBLEM:
The power method we have developed only works if the matrix has real eigenvalues. Suppose that $A$ is a $2\times2$ matrix that has a complex eigenvalue $\lambda = 2+3i$. What would happen if we apply the power method to $A$?
ANSWER:
The vectors $\overline{{\mathbf x}}_k$ will not converge.
SOLUTION:
The power method relies on the fact that the vectors $\overline{{\mathbf x}}_k$ attempt to line up in the direction of a vector in the dominant eigenspace. If the eigenvalues are complex, however, the vectors $\overline{{\mathbf x}}_k$ will be rotated with each iteration so they will not converge.
:::

:::exercise {exercise-5-2-009} number=5.2.9 answered=yes src=src/exercises/exercises5-2.xml:393
PROBLEM:
Consider the matrix $A=\left[\begin{array}{rr} 1 & 1 \\ 0 & 1 \\ \end{array}\right]$.

a) 
    Find the eigenvalues and associated eigenvectors of $A$.

b) 
    Make a prediction about what happens if we apply the power method and the inverse power method to find eigenvalues of $A$.

c) 
    Verify your prediction using Sage.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    There is a single eigenvalue $\lambda=1$ having multiplicity two with its associated eigenspace $E_1$ being one-dimensional with basis vector ${\mathbf v}=\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

b) 
    Applying either the power or inverse power method will find the eigenvalue $\lambda=1$ and a scalar multiple of ${\mathbf v}$.

SOLUTION:

a) 
    There is a single eigenvalue $\lambda=1$ having multiplicity two with its associated eigenspace $E_1$ being one-dimensional with basis vector $\left[\begin{array}{r}1 \\ 0 \end{array}\right]$.

b) 
    Applying either the power or inverse power method will find the eigenvalue $\lambda=1$ and a scalar multiple of ${\mathbf v}$.

:::
