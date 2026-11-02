# 6.4 Finding orthogonal bases {sec-gram-schmidt}

The last section demonstrated the value of working with orthogonal, and especially orthonormal, sets. If we have an orthogonal basis ${\mathbf w}_1,{\mathbf w}_2,\ldots,{\mathbf w}_n$ for a subspace $W$, the [Projection Formula](ref:6.3#prop-proj-formula) tells us that the orthogonal projection of a vector ${\mathbf b}$ onto $W$ is

$$ \widehat{{\mathbf b}} = \frac{{\mathbf b}\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}~{\mathbf w}_1 + \frac{{\mathbf b}\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}~{\mathbf w}_2 + \cdots + \frac{{\mathbf b}\cdot{\mathbf w}_n}{{\mathbf w}_n\cdot{\mathbf w}_n}~{\mathbf w}_n\text{.} $$

An orthonormal basis ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$ is even more convenient: after forming the matrix $Q=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & \ldots & {\mathbf u}_n \end{bmatrix}$, we have $\widehat{{\mathbf b}} = QQ^T{\mathbf b}$.
In the examples we've seen so far, however, orthogonal bases were given to us. What we need now is a way to form orthogonal bases. In this section, we'll explore an algorithm that begins with a basis for a subspace and creates an orthogonal basis. Once we have an orthogonal basis, we can scale each of the vectors appropriately to produce an orthonormal basis.

## 6.4.1 Introduction

:::exploration {act:preview-6-4-1} Preview Activity 6.4.1
Suppose we have a basis for ${\mathbb R}^2$ consisting of the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}0 \\ 2 \end{array}\right] $$

as shown in [Figure 6.4.1](ref:fig-gs-intro). Notice that this basis is not orthogonal.
> FIGURE {fig:fig-gs-intro} number=6.4.1 src=../../media/ch06/gram-schmidt-intro.svg
> alt: Two vectors in the two dimensional coordinate plane that are not orthogonal to one another.
> width: 50%
> caption: A basis for ${\mathbb R}^2$.
PROBLEM:
a) Find the vector $\widehat{{\mathbf v}}_2$ that is the orthogonal projection of ${\mathbf v}_2$ onto the line defined by ${\mathbf v}_1$.
b) Explain why ${\mathbf v}_2 - \widehat{{\mathbf v}}_2$ is orthogonal to ${\mathbf v}_1$.
c) Define the new vectors ${\mathbf w}_1={\mathbf v}_1$ and ${\mathbf w}_2={\mathbf v}_2-\widehat{{\mathbf v}}_2$ and sketch them in [Figure 6.4.2](ref:fig-gs-empty). Explain why ${\mathbf w}_1$ and ${\mathbf w}_2$ define an orthogonal basis for ${\mathbb R}^2$.
    > FIGURE {fig:fig-gs-empty} number=6.4.2 src=../../media/ch06/empty-3.svg
    > alt: A two dimensional coordinate grid and set of axes.
    > width: 50%
    > caption: Sketch the new basis ${\mathbf w}_1$ and ${\mathbf w}_2$.
d) Write the vector ${\mathbf b}=\left[\begin{array}{r}8 \\ -10 \end{array}\right]$ as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$.
e) Scale the vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ to produce an orthonormal basis ${\mathbf u}_1$ and ${\mathbf u}_2$ for ${\mathbb R}^2$.
SOLUTION:
a) $\widehat{{\mathbf v}}_2 = {\mathbf v}_1$.
b) The orthogonal projection $\widehat{{\mathbf v}}_2$ is defined so that ${\mathbf v}_2-\widehat{{\mathbf v}}_2$ is orthogonal to ${\mathbf v}_1$.
c) ${\mathbf w}_1 = \left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$ are othogonal, which can be checked with the dot product.
d) The projection formula gives ${\mathbf b} = -{\mathbf w}_1 -9{\mathbf w}_2$.
e) ${\mathbf u}_1=\frac1{\sqrt{2}}\left[\begin{array}{r}1 \\ 1 \end{array}\right]$ and ${\mathbf u}_2=\frac1{\sqrt{2}}\left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.
:::

## 6.4.2 Gram-Schmidt orthogonalization

{index-entry:Gram-Schmidt} The preview activity illustrates the main idea behind an algorithm, known as *Gram-Schmidt orthogonalization*, that begins with a basis for some subspace of ${\mathbb R}^m$ and produces an orthogonal or orthonormal basis. The algorithm relies on our construction of the orthogonal projection. Remember that we formed the orthogonal projection $\widehat{{\mathbf b}}$ of ${\mathbf b}$ onto a subspace $W$ by requiring that ${\mathbf b}-\widehat{{\mathbf b}}$ is orthogonal to $W$ as shown in [Figure 6.4.3](ref:fig-proj-orthog).

> FIGURE {fig:fig-proj-orthog} number=6.4.3 src=../../media/ch06/3d-orthog-proj-2.svg
> alt: Orthogonally projecting a three dimensional vector onto a plane.
> width: 50%
> caption: If $\widehat{{\mathbf b}}$ is the orthogonal projection of ${\mathbf b}$ onto $W$, then ${\mathbf b}-\widehat{{\mathbf b}}$ is orthogonal to $W$.

This observation guides our construction of an orthogonal basis for it allows us to create a vector that is orthogonal to a given subspace. Let's see how the Gram-Schmidt algorithm works.

:::activity {act:activity-gram-schmidt} Activity 6.4.2
Suppose that $W$ is a three-dimensional subspace of ${\mathbb R}^4$ with basis:

$$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 3 \\ 2 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf v}_3 = \left[\begin{array}{r}1 \\ -3 \\ -3 \\ -3 \end{array}\right]\text{.} $$

We can see that this basis is not orthogonal by noting that ${\mathbf v}_1\cdot{\mathbf v}_2 = 8$. Our goal is to create an orthogonal basis ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ for $W$.
To begin, we declare that ${\mathbf w}_1={\mathbf v}_1$, and we call $W_1$ the line defined by ${\mathbf w}_1$.
:::sage
```sage

```
:::

a) 
    Find the vector $\widehat{{\mathbf v}}_2$ that is the orthogonal projection of ${\mathbf v}_2$ onto $W_1$, the line defined by ${\mathbf w}_1$.

b) 
    Form the vector ${\mathbf w}_2 = {\mathbf v}_2-\widehat{{\mathbf v}}_2$ and verify that it is orthogonal to ${\mathbf w}_1$.

c) 
    Explain why $\text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}$ by showing that any linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ can be written as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$ and vice versa.

d) 
    The vectors ${\mathbf w}_1$ and ${\mathbf w}_2$ are an orthogonal basis for a two-dimensional subspace $W_2$ of ${\mathbb R}^4$. Find the vector $\widehat{{\mathbf v}}_3$ that is the orthogonal projection of ${\mathbf v}_3$ onto $W_2$.

e) 
    Verify that ${\mathbf w}_3 = {\mathbf v}_3-\widehat{{\mathbf v}}_3$ is orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$.

f) 
    Explain why ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ form an orthogonal basis for $W$.

g) 
    Now find an orthonormal basis for $W$.

ANSWER:

a) 
    $\widehat{{\mathbf v}}_2 = \left[\begin{array}{r}2 \\ 2 \\ 2 \\ 2 \end{array}\right]$.

b) 
    ${\mathbf w}_2 = \left[\begin{array}{r}-1 \\ 1 \\ 0 \\ 0 \end{array}\right]$

c) 
    We have ${\mathbf v}_1 = {\mathbf w}_1$ and ${\mathbf v}_2 = {\mathbf w}_2 + 2{\mathbf w}_1$ so a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_1$ can be rewritten as a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$.

d) 
    $\widehat{{\mathbf v}}_3 = \left[\begin{array}{r}0 \\ -4 \\ -2 \\ -2 \end{array}\right]$.

e) 
    ${\mathbf w}_3 = \left[\begin{array}{r}1 \\ 1 \\ -1 \\ -1 \end{array}\right]$

f) 
    Since ${\mathbf v}_i$ can be written in terms of ${\mathbf w}_j$ and vice-versa, these new vectors form a basis for $W$.

g) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}1/2 \\ 1/2 \\ 1/2 \\ 1/2 \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \\ 0 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/2 \\ 1/2 \\ -1/2 \\ -1/2 \end{array}\right] $$

SOLUTION:

a) 
    $\widehat{{\mathbf v}}_2 = \frac{{\mathbf v}_2\cdot{\mathbf w}_1} {{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1=\left[\begin{array}{r}2 \\ 2 \\ 2 \\ 2 \end{array}\right]$.

b) 
    ${\mathbf w}_2 = \left[\begin{array}{r}-1 \\ 1 \\ 0 \\ 0 \end{array}\right]$

c) 
    We have ${\mathbf v}_1 = {\mathbf w}_1$ and ${\mathbf v}_2 = {\mathbf w}_2 + 2{\mathbf w}_1$. Therefore, a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_1$ can be rewritten as

    $$ c_1{\mathbf v}_1+c_2{\mathbf v}_2 = c_1{\mathbf w}_1+c_2({\mathbf w}_2+2{\mathbf w}_1) = (c_1+2c_2){\mathbf w}_1 + c_2{\mathbf w}_2\text{.} $$

    In the same way, ${\mathbf w}_1={\mathbf v}_1$ and ${\mathbf w}_2 = {\mathbf v}_2-2{\mathbf v}_1$ so any linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$ can be rewritten as a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_1$.

d) 
    By the Projection Formula, $\widehat{{\mathbf v}}_3 = \left[\begin{array}{r}0 \\ -4 \\ -2 \\ -2 \end{array}\right]$.

e) 
    ${\mathbf w}_3 = \left[\begin{array}{r}1 \\ 1 \\ -1 \\ -1 \end{array}\right]$

f) 
    We can check that ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ form an orthogonal set. Since ${\mathbf v}_i$ can be written in terms of ${\mathbf w}_j$ and vice-versa, these new vectors form a basis for $W$.

g) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}1/2 \\ 1/2 \\ 1/2 \\ 1/2 \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \\ 0 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/2 \\ 1/2 \\ -1/2 \\ -1/2 \end{array}\right] $$

:::

As this activity illustrates, Gram-Schmidt orthogonalization begins with a basis ${\mathbf v}_1{\mathbf v}_2,\ldots,{\mathbf v}_n$ for a subspace $W$ of ${\mathbb R}^m$ and creates an orthogonal basis for $W$. Let's work through a second example.

:::example {ex:example-gram-schmidt} Example 6.4.4
Let's start with the basis

$$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ -1 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}-3 \\ 3 \\ 0 \end{array}\right],\hspace{24pt} {\mathbf v}_3=\left[\begin{array}{r}-2 \\ 7 \\ 1 \end{array}\right]\text{,} $$

which is a basis for ${\mathbb R}^3$.
To get started, we'll simply set ${\mathbf w}_1={\mathbf v}_1=\left[\begin{array}{r}2 \\ -1 \\ 2 \end{array}\right]$. We construct ${\mathbf w}_2$ from ${\mathbf v}_2$ by subtracting its orthogonal projection onto $W_1$, the line defined by ${\mathbf w}_1$. This gives

$$ {\mathbf w}_2 = {\mathbf v}_2 - \frac{{\mathbf v}_2\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 = {\mathbf v}_2 + {\mathbf w}_1 = \left[\begin{array}{r}-1 \\ 2 \\ 2 \end{array}\right]\text{.} $$

Notice that we found ${\mathbf v}_2 = -{\mathbf w}_1 + {\mathbf w}_2$. Therefore, we can rewrite any linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$ as

$$ c_1{\mathbf v}_1 + c_2{\mathbf v}_2 = c_1{\mathbf w}_1 + c_2(-{\mathbf w}_1+{\mathbf w}_2) = (c_1-c_2){\mathbf w}_1 + c_2{\mathbf w}_2\text{,} $$

a linear combination of ${\mathbf w}_1$ and ${\mathbf w}_2$. This tells us that

$$ W_2 = \text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2\right\}\text{.} $$

In other words, ${\mathbf w}_1$ and ${\mathbf w}_2$ is a orthogonal basis for $W_2$, the 2-dimensional subspace that is the span of ${\mathbf v}_1$ and ${\mathbf v}_2$.
Finally, we form ${\mathbf w}_3$ from ${\mathbf v}_3$ by subtracting its orthogonal projection onto $W_2$:

$$ {\mathbf w}_3 = {\mathbf v}_3 - \frac{{\mathbf v}_3\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 - \frac{{\mathbf v}_3\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 = {\mathbf v}_3 + {\mathbf w}_1 - 2{\mathbf w}_2 = \left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right]\text{.} $$

We can now check that

$$ {\mathbf w}_1=\left[\begin{array}{r}2 \\ -1 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}-1 \\ 2 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf w}_3=\left[\begin{array}{r}2 \\ 2 \\ -1 \end{array}\right],\hspace{24pt} $$

is an orthogonal set. Furthermore, we have, as before, $\text{Span}\left\{{\mathbf w}_1,{\mathbf w}_2,{\mathbf w}_3\right\} = \text{Span}\left\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\right\}$, which says that we have found a new orthogonal basis for ${\mathbb R}^3$.
To create an orthonormal basis, we form unit vectors parallel to each of the vectors in the orthogonal basis:

$$ {\mathbf u}_1 = \left[\begin{array}{r}2/3 \\ -1/3 \\ 2/3 \end{array}\right],\hspace{24pt} {\mathbf u}_2 = \left[\begin{array}{r}-1/3 \\ 2/3 \\ 2/3 \end{array}\right],\hspace{24pt} {\mathbf u}_3 = \left[\begin{array}{r}2/3 \\ 2/3 \\ -1/3 \end{array}\right]\text{.} $$

:::

More generally, if we have a basis ${\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_n$ for a subspace $W$ of ${\mathbb R}^m$, the Gram-Schmidt algorithm creates an orthogonal basis for $W$ in the following way:

$$ \begin{aligned} {\mathbf w}_1 & = {\mathbf v}_1 \\ {\mathbf w}_2 & = {\mathbf v}_2 - \frac{{\mathbf v}_2\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 \\ {\mathbf w}_3 & = {\mathbf v}_3 - \frac{{\mathbf v}_3\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 - \frac{{\mathbf v}_3\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 \\ & \vdots \\ {\mathbf w}_n & = {\mathbf v}_n - \frac{{\mathbf v}_n\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 - \frac{{\mathbf v}_n\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 - \ldots - \frac{{\mathbf v}_n\cdot{\mathbf w}_{n-1}} {{\mathbf w}_{n-1}\cdot{\mathbf w}_{n-1}}{\mathbf w}_{n-1} \text{.} \end{aligned} $$

From here, we may form an orthonormal basis by constructing a unit vector parallel to each vector in the orthogonal basis: ${\mathbf u}_j = 1/\left|{\mathbf w}_j\right|~{\mathbf w}_j$.

:::activity {act:activity-6-4-3} Activity 6.4.3
Sage can automate these computations for us. Before we begin, however, it will be helpful to understand how we can combine things using a `list` in Python. For instance, if the vectors `v1`, `v2`, and `v3` form a basis for a subspace, we can bundle them together using square brackets: `[v1, v2, v3]`. Furthermore, we could assign this to a variable, such as `basis = [v1, v2, v3]`.
Evaluating the following cell will load in some special commands.
:::sage
```sage
sage.repl.load.load("https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py", globals())

```
:::

- 
    There is a command to apply the projection formula: `projection(b, basis)` returns the orthogonal projection of `b` onto the subspace spanned by `basis`, which is a list of vectors.

- 
    The command `unit(w)` returns a unit vector parallel to `w`.

- 
    Given a collection of vectors, say, `v1` and `v2`, we can form the matrix whose columns are `v1` and `v2` using `matrix([v1, v2]).T`. When given a `list` of vectors, Sage constructs a matrix whose *rows* are the given vectors. For this reason, we need to apply the transpose.

Let's now consider $W$, the subspace of ${\mathbb R}^5$ having basis

$$ {\mathbf v}_1 = \left[\begin{array}{r}14 \\ -6 \\ 8 \\ 2 \\ -6 \\ \end{array}\right],\hspace{24pt} {\mathbf v}_2 = \left[\begin{array}{r}5 \\ -3 \\ 4 \\ 3 \\ -7 \\ \end{array}\right],\hspace{24pt} {\mathbf v}_3 = \left[\begin{array}{r}2 \\ 3 \\ 0 \\ -2 \\ 1 \\ \end{array}\right]. $$

a) 
    Apply the Gram-Schmidt algorithm to find an orthogonal basis ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ for $W$.

    :::sage
    ```sage

    ```
    :::

b) 
    Find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b} = \left[\begin{array}{r}-5 \\ 11 \\ 0 \\ -1 \\ 5 \\ \end{array}\right]$ onto $W$.

c) 
    Explain why we know that $\widehat{{\mathbf b}}$ is a linear combination of the original vectors ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ and then find weights so that

    $$ \widehat{{\mathbf b}} = c_1{\mathbf v}_1 + c_2{\mathbf v}_2 + c_3{\mathbf v}_3. $$

d) 
    Find an orthonormal basis ${\mathbf u}_1$, ${\mathbf u}_2$, for ${\mathbf u}_3$ for $W$ and form the matrix $Q$ whose columns are these vectors.

    :::sage
    ```sage

    ```
    :::

e) 
    Find the product $Q^TQ$ and explain the result.

f) 
    Find the matrix $P$ that projects vectors orthogonally onto $W$ and verify that $P{\mathbf b}$ gives $\widehat{{\mathbf b}}$, the orthogonal projection that you found earlier.

ANSWER:

a) 

    $$ {\mathbf w}_1=\left[\begin{array}{r}14 \\ -6 \\ 8 \\ 2 \\ -6 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}-2 \\ 0 \\ 0 \\ 2 \\ -4 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_3=\left[\begin{array}{r}1 \\ 3 \\ 0 \\ -1 \\ -1 \\ \end{array}\right] $$

b) 
    $\widehat{{\mathbf b}}=\left[\begin{array}{r}-4 \\ 9 \\ -4 \\ -4 \\ 3 \\ \end{array}\right]$

c) 
    $\widehat{{\mathbf b}}=-\frac34{\mathbf v}_1+\frac12{\mathbf v}_2+2{\mathbf v}_3$.

d) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}14/\sqrt{336} \\ -6\sqrt{336} \\ 8/\sqrt{336} \\ 2/\sqrt{336} \\ -6/\sqrt{336} \\ \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-2/\sqrt{24} \\ 0 \\ 0 \\ 2/\sqrt{24} \\ -4/\sqrt{24} \\ \end{array}\right],\hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{12} \\ 3/\sqrt{12} \\ 0 \\ -1/\sqrt{12} \\ -1/\sqrt{12} \\ \end{array}\right] $$

e) 
    $Q^TQ=I$

f) 
    $P = QQ^T = \begin{bmatrix} 5/6 & 0 & 1/3 & -1/6 & 0 \\ 0 & 6/7 & -1/7 & -2/7 & -1/7 \\ 1/3 & -1/7 & 4/21 & 1/21 & -1/7 \\ -1/6 & -2/7 & 1/21 & 11/42 & -2/7 \\ 0 & -1/7 & -1/7 & -2/7 & 6/7 \end{bmatrix}$

SOLUTION:

a) 

    $$ {\mathbf w}_1=\left[\begin{array}{r}14 \\ -6 \\ 8 \\ 2 \\ -6 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_2=\left[\begin{array}{r}-2 \\ 0 \\ 0 \\ 2 \\ -4 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_3=\left[\begin{array}{r}1 \\ 3 \\ 0 \\ -1 \\ -1 \\ \end{array}\right] $$

b) 
    $\widehat{{\mathbf b}}=\left[\begin{array}{r}-4 \\ 9 \\ -4 \\ -4 \\ 3 \\ \end{array}\right]$

c) 
    We know that $\widehat{{\mathbf b}}$ is in $W$ and ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ is a basis for $W$. We find $\widehat{{\mathbf b}}=-\frac34{\mathbf v}_1+\frac12{\mathbf v}_2+2{\mathbf v}_3$.

d) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}14/\sqrt{336} \\ -6\sqrt{336} \\ 8/\sqrt{336} \\ 2/\sqrt{336} \\ -6/\sqrt{336} \\ \end{array}\right],\hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-2/\sqrt{24} \\ 0 \\ 0 \\ 2/\sqrt{24} \\ -4/\sqrt{24} \\ \end{array}\right],\hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{12} \\ 3/\sqrt{12} \\ 0 \\ -1/\sqrt{12} \\ -1/\sqrt{12} \\ \end{array}\right] $$

e) 
    $Q^TQ=I$ since the matrix product computes the dot products of the columns of $Q$.

f) 
    $P = QQ^T = \begin{bmatrix} 5/6 & 0 & 1/3 & -1/6 & 0 \\ 0 & 6/7 & -1/7 & -2/7 & -1/7 \\ 1/3 & -1/7 & 4/21 & 1/21 & -1/7 \\ -1/6 & -2/7 & 1/21 & 11/42 & -2/7 \\ 0 & -1/7 & -1/7 & -2/7 & 6/7 \end{bmatrix}$

:::

## 6.4.3 $QR$ factorizations

Now that we've seen how the Gram-Schmidt algorithm forms an orthonormal basis for a given subspace, we will explore how the algorithm leads to an important matrix factorization known as the $QR$ factorization.

:::activity {act:activity-6-4-4} Activity 6.4.4
Suppose that $A$ is the $4\times3$ matrix whose columns are

$$ {\mathbf v}_1 = \left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_2 = \left[\begin{array}{r}1 \\ 3 \\ 2 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf v}_3 = \left[\begin{array}{r}1 \\ -3 \\ -3 \\ -3 \end{array}\right]\text{.} $$

These vectors form a basis for $W$, the subspace of ${\mathbb R}^4$ that we encountered in [Activity 6.4.2](ref:activity-gram-schmidt). Since these vectors are the columns of $A$, we have $\text{Col}(A) = W$.
:::sage
```sage

```
:::

a) 
    When we implemented Gram-Schmidt, we first found an orthogonal basis ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ using

    $$ \begin{aligned} {\mathbf w}_1 & = {\mathbf v}_1 \\ {\mathbf w}_2 & = {\mathbf v}_2 - \frac{{\mathbf v}_2\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 \\ {\mathbf w}_3 & = {\mathbf v}_3 - \frac{{\mathbf v}_3\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 - \frac{{\mathbf v}_3\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2\text{.} \\ \end{aligned} $$

    Use these expressions to write ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ as linear combinations of ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$.

b) 
    We next normalized the orthogonal basis ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ to obtain an orthonormal basis ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$.

    Write the vectors ${\mathbf w}_i$ as scalar multiples of ${\mathbf u}_i$. Then use these expressions to write ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ as linear combinations of ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$.

c) 
    Suppose that $Q = \left[ \begin{array}{ccc} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 \end{array} \right]$. Use the result of the previous part to find a vector ${\mathbf r}_1$ so that $Q{\mathbf r}_1 = {\mathbf v}_1$.

d) 
    Then find vectors ${\mathbf r}_2$ and ${\mathbf r}_3$ such that $Q{\mathbf r}_2 = {\mathbf v}_2$ and $Q{\mathbf r}_3 = {\mathbf v}_3$.

e) 
    Construct the matrix $R = \left[ \begin{array}{ccc} {\mathbf r}_1 & {\mathbf r}_2 & {\mathbf r}_3 \end{array} \right]$. Remembering that $A = \left[ \begin{array}{ccc} {\mathbf v}_1 & {\mathbf v}_2 & {\mathbf v}_3 \end{array} \right]$, explain why $A = QR$.

f) 
    What is special about the shape of $R$?

g) 
    Suppose that $A$ is a $10\times 6$ matrix whose columns are linearly independent. This means that the columns of $A$ form a basis for $W=\text{Col}(A)$, a 6-dimensional subspace of ${\mathbb R}^{10}$. Suppose that we apply Gram-Schmidt orthogonalization to create an orthonormal basis whose vectors form the columns of $Q$ and that we write $A=QR$. What are the shape of $Q$ and what the shape of $R$?

ANSWER:

a) 

    $$ \begin{aligned} {\mathbf v}_1 & = {\mathbf w}_1 \\ {\mathbf v}_2 & = 2{\mathbf w}_1 + {\mathbf w}_2 \\ {\mathbf v}_3 & = -2{\mathbf w}_1 - 2{\mathbf w}_2 + {\mathbf w}_3 \\ \end{aligned} $$

b) 

    $$ \begin{aligned} {\mathbf v}_1 & = 2{\mathbf u}_1 \\ {\mathbf v}_2 & = 4{\mathbf u}_1 + \sqrt{2}{\mathbf u}_2 \\ {\mathbf v}_3 & = -4{\mathbf u}_1 - 2\sqrt{2}{\mathbf u}_2 + 2{\mathbf u}_3 \\ \end{aligned} $$

c) 
    ${\mathbf v}_1 = Q\left[\begin{array}{r}2 \\ 0 \\ 0 \end{array}\right]$.

d) 
    ${\mathbf v}_2 = Q\left[\begin{array}{r}4 \\ \sqrt{2} \\ 0 \end{array}\right]$ and ${\mathbf v}_3=Q\left[\begin{array}{r}-4 \\ -2\sqrt{2} \\ 2 \end{array}\right]$.

e) 
    We have $QR = \begin{bmatrix} Q{\mathbf r}_1 & Q{\mathbf r}_2 & Q{\mathbf r}_3 \end{bmatrix} = A$.

f) 
    $R$ is upper triangular.

g) 
    $Q$ will be $10\times6$ and $R$ will be $6\times 6$.

SOLUTION:

a) 

    $$ \begin{aligned} {\mathbf w}_1 & = {\mathbf v}_1 \\ {\mathbf w}_2 & = {\mathbf v}_2 - 2{\mathbf w}_1 \\ {\mathbf w}_3 & = {\mathbf v}_3 + 2{\mathbf w}_1 + 2{\mathbf w}_2 \\ \end{aligned} $$

    Therefore,

    $$ \begin{aligned} {\mathbf v}_1 & = {\mathbf w}_1 \\ {\mathbf v}_2 & = 2{\mathbf w}_1 + {\mathbf w}_2 \\ {\mathbf v}_3 & = -2{\mathbf w}_1 - 2{\mathbf w}_2 + {\mathbf w}_3 \\ \end{aligned} $$

b) 
    ${\mathbf w}_i = \left|{\mathbf w}_i\right|{\mathbf u}_i$ so we have

    $$ {\mathbf w}_1 = 2{\mathbf u}_1,\hspace{24pt} {\mathbf w}_1 = \sqrt{2}{\mathbf u}_2,\hspace{24pt} {\mathbf w}_1 = 2{\mathbf u}_3\text{.} $$

    This leads to

    $$ \begin{aligned} {\mathbf v}_1 & = 2{\mathbf u}_1 \\ {\mathbf v}_2 & = 4{\mathbf u}_1 + \sqrt{2}{\mathbf u}_2 \\ {\mathbf v}_3 & = -4{\mathbf u}_1 - 2\sqrt{2}{\mathbf u}_2 + 2{\mathbf u}_3 \\ \end{aligned} $$

c) 
    Since ${\mathbf v}_1 = 2{\mathbf u}_1$, we have ${\mathbf v}_1 = Q\left[\begin{array}{r}2 \\ 0 \\ 0 \end{array}\right]$.

d) 
    In the same way, we have ${\mathbf v}_2 = Q\left[\begin{array}{r}4 \\ \sqrt{2} \\ 0 \end{array}\right]$ and ${\mathbf v}_3=Q\left[\begin{array}{r}-4 \\ -2\sqrt{2} \\ 2 \end{array}\right]$.

e) 
    We have $QR = \begin{bmatrix} Q{\mathbf r}_1 & Q{\mathbf r}_2 & Q{\mathbf r}_3 \end{bmatrix} = A$.

f) 
    $R=\begin{bmatrix} 2 & 4 & -4 \\ 0 & \sqrt{2} & -2\sqrt{2} \\ 0 & 0 & 2 \\ \end{bmatrix}$ so $R$ is upper triangular.

g) 
    $Q$ will be $10\times6$ and $R$ will be a $6\times 6$ upper triangular matrix.

:::

When the columns of a matrix $A$ are linearly independent, they form a basis for $\text{Col}(A)$ so that we can perform the Gram-Schmidt algorithm. The previous activity shows how this leads to a factorization of $A$ as the product of a matrix $Q$ whose columns are an orthonormal basis for $\text{Col}(A)$ and an upper triangular matrix $R$.

:::proposition {prop:prop-qr} Proposition 6.4.5 ($QR$ factorization)
If $A$ is an $m\times n$ matrix whose columns are linearly independent, we may write $A=QR$ where $Q$ is an $m\times n$ matrix whose columns form an orthonormal basis for $\text{Col}(A)$ and $R$ is an $n\times n$ upper triangular matrix.
:::

:::example {ex:example-6-4-6} Example 6.4.6
We'll consider the matrix $A=\begin{bmatrix} 2 & -3 & -2 \\ -1 & 3 & 7 \\ 2 & 0 & 1 \\ \end{bmatrix}$ whose columns, which we'll denote ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$, are the basis of ${\mathbb R}^3$ that we considered in [Example 6.4.4](ref:example-gram-schmidt). There we found an orthogonal basis ${\mathbf w}_1$, ${\mathbf w}_2$, and ${\mathbf w}_3$ that satisfied

$$ \begin{aligned} {\mathbf v}_1 & {}={} {\mathbf w}_1 \\ {\mathbf v}_2 & {}={} -{\mathbf w}_1 + {\mathbf w}_2 \\ {\mathbf v}_3 & {}={} -{\mathbf w}_1 + 2{\mathbf w}_2 + {\mathbf w} _3\text{.} \end{aligned} $$

In terms of the resulting orthonormal basis ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$, we had

$$ {\mathbf w}_1 = 3 {\mathbf u}_1,\hspace{24pt} {\mathbf w}_2 = 3 {\mathbf u}_2,\hspace{24pt} {\mathbf w}_3 = 3 {\mathbf u}_3 $$

so that

$$ \begin{aligned} {\mathbf v}_1 & {}={} 3{\mathbf u}_1 \\ {\mathbf v}_2 & {}={} -3{\mathbf u}_1 + 3{\mathbf u}_2 \\ {\mathbf v}_3 & {}={} -3{\mathbf u}_1 + 6{\mathbf u}_2 + 3{\mathbf u} _3\text{.} \end{aligned} $$

Therefore, if $Q=\begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 \end{bmatrix}$, we have the $QR$ factorization

$$ A = Q\begin{bmatrix} 3 & -3 & -3 \\ 0 & 3 & 6 \\ 0 & 0 & 3 \\ \end{bmatrix} =QR\text{.} $$

:::

The value of the $QR$ factorization will become clear in the next section where we use it to solve least-squares problems.

:::activity {act:activity-6-4-5} Activity 6.4.5
As before, we would like to use Sage to automate the process of finding and using the $QR$ factorization of a matrix $A$. Evaluating the following cell provides a command `QR(A)` that returns the factorization, which may be stored using, for example, `Q, R = QR(A)`.
:::sage
```sage
sage.repl.load.load("https://raw.githubusercontent.com/davidaustinm/ula_modules/master/orthogonality.py", globals())

```
:::
Suppose that $A$ is the following matrix whose columns are linearly independent.

$$ A = \begin{bmatrix} 1 & 0 & -3 \\ 0 & 2 & -1 \\ 1 & 0 & 1 \\ 1 & 3 & 5 \\ \end{bmatrix}. $$

a) 
    If $A=QR$, what is the shape of $Q$ and $R$? What is special about the form of $R$?

b) 
    Find the $QR$ factorization using `Q, R = QR(A)` and verify that $R$ has the predicted shape and that $A=QR$.

    :::sage
    ```sage

    ```
    :::

c) 
    Find the matrix $P$ that orthogonally projects vectors onto $\text{Col}(A)$.

d) 
    Find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}4 \\ -17 \\ -14 \\ 22 \end{array}\right]$ onto $\text{Col}(A)$.

e) 
    Explain why the equation $A{\mathbf x}=\widehat{{\mathbf b}}$ must be consistent and then find ${\mathbf x}$.

ANSWER:

a) 
    $Q$ is $4\times3$ and $R$ is a $3\times3$ upper triangular matrix.

b) 
    We see that

    $$ Q=\begin{bmatrix} 1/\sqrt{3} & -1/\sqrt{10} & -3/\sqrt{23} \\ 0 & 2/\sqrt{10} & -3/\sqrt{23} \\ 1/\sqrt{3} & -1/\sqrt{10} & 1/\sqrt{23} \\ 1/\sqrt{3} & 2/\sqrt{10} & 2/\sqrt{23} \\ \end{bmatrix},\hspace{24pt} R = \begin{bmatrix} \sqrt{3} & \sqrt{3} & \sqrt{3} \\ 0 & \sqrt{10} & \sqrt{10} \\ 0 & 0 & \sqrt{23} \end{bmatrix} $$

c) 
    $P=QQ^T = \begin{bmatrix} 569/690 & 22/115 & 209/690 & -44/345 \\ 22/115 & 91/115 & -38/115 & 16/115 \\ 209/690 & -38/115 & 329/690 & 76/345 \\ -44/345 & 16/115 & 76/345 & 313/345 \\ \end{bmatrix}$

d) 
    $\widehat{{\mathbf b}} = \left[\begin{array}{r}-7 \\ -5 \\ 5 \\ 14 \end{array}\right]$

e) 
    ${\mathbf x} = \left[\begin{array}{r}2 \\ -1 \\ 3 \end{array}\right]$.

SOLUTION:

a) 
    $Q$ is $4\times3$ and $R$ is a $3\times3$ upper triangular matrix.

b) 
    We see that

    $$ Q=\begin{bmatrix} 1/\sqrt{3} & -1/\sqrt{10} & -3/\sqrt{23} \\ 0 & 2/\sqrt{10} & -3/\sqrt{23} \\ 1/\sqrt{3} & -1/\sqrt{10} & 1/\sqrt{23} \\ 1/\sqrt{3} & 2/\sqrt{10} & 2/\sqrt{23} \\ \end{bmatrix},\hspace{24pt} R = \begin{bmatrix} \sqrt{3} & \sqrt{3} & \sqrt{3} \\ 0 & \sqrt{10} & \sqrt{10} \\ 0 & 0 & \sqrt{23} \end{bmatrix} $$

c) 
    $P=QQ^T = \begin{bmatrix} 569/690 & 22/115 & 209/690 & -44/345 \\ 22/115 & 91/115 & -38/115 & 16/115 \\ 209/690 & -38/115 & 329/690 & 76/345 \\ -44/345 & 16/115 & 76/345 & 313/345 \\ \end{bmatrix}$

d) 
    $\widehat{{\mathbf b}} = QQ^T{\mathbf b} = \left[\begin{array}{r}-7 \\ -5 \\ 5 \\ 14 \end{array}\right]$

e) 
    Since $\widehat{{\mathbf b}}$ is in $\text{Col}(A)$, the system $A{\mathbf x}=\widehat{{\mathbf b}}$ must be consistent. We find a solution by augmenting $A$ by $\widehat{{\mathbf b}}$ and row reducing: ${\mathbf x} = \left[\begin{array}{r}2 \\ -1 \\ 3 \end{array}\right]$.

:::

In fact, Sage provides its own version of the $QR$ factorization that is a bit different than the way we've developed the factorization here. For this reason, we have provided our own version of the factorization.

## 6.4.4 Summary

This section explored the Gram-Schmidt orthogonalization algorithm and how it leads to the matrix factorization $A=QR$ when the columns of $A$ are linearly independent.

- 
    Beginning with a basis ${\mathbf v}_1, {\mathbf v}_2,\ldots,{\mathbf v}_n$ for a subspace $W$ of ${\mathbb R}^m$, the vectors

    $$ \begin{aligned} {\mathbf w}_1 & = {\mathbf v}_1 \\ {\mathbf w}_2 & = {\mathbf v}_2 - \frac{{\mathbf v}_2\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 \\ {\mathbf w}_3 & = {\mathbf v}_3 - \frac{{\mathbf v}_3\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 - \frac{{\mathbf v}_3\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 \\ & \vdots \\ {\mathbf w}_n & = {\mathbf v}_n - \frac{{\mathbf v}_n\cdot{\mathbf w}_1}{{\mathbf w}_1\cdot{\mathbf w}_1}{\mathbf w}_1 - \frac{{\mathbf v}_n\cdot{\mathbf w}_2}{{\mathbf w}_2\cdot{\mathbf w}_2}{\mathbf w}_2 - \ldots - \frac{{\mathbf v}_n\cdot{\mathbf w}_{n-1}} {{\mathbf w}_{n-1}\cdot{\mathbf w}_{n-1}}{\mathbf w}_{n-1} \end{aligned} $$

    form an orthogonal basis for $W$.

- 
    We may scale each vector ${\mathbf w}_i$ appropriately to obtain an orthonormal basis ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$.

- 
    Expressing the Gram-Schmidt algorithm in matrix form shows that, if the columns of $A$ are linearly independent, then we can write $A=QR$, where the columns of $Q$ form an orthonormal basis for $\text{Col}(A)$ and $R$ is upper triangular.

## 6.4.5 Exercises

:::exercise {exercise-6-4-001} number=6.4.1 answered=yes src=src/exercises/exercises6-4.xml:5
PROBLEM:
Suppose that a subspace $W$ of ${\mathbb R}^3$ has a basis formed by

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right], \hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}1 \\ -2 \\ -2 \end{array}\right]. $$

a) 
    Find an orthogonal basis for $W$.

b) 
    Find an orthonormal basis for $W$.

c) 
    Find the matrix $P$ that projects vectors orthogonally onto $W$.

d) 
    Find the orthogonal projection of $\left[\begin{array}{r}3 \\ 4 \\ -2 \end{array}\right]$ onto $W$.

ANSWER:

a) 
    ${\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$ and ${\mathbf w}_2 = \left[\begin{array}{r}2 \\ -1 \\ -1 \end{array}\right]$

b) 
    ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$ and ${\mathbf u}_2 = \left[\begin{array}{r}2/\sqrt{6} \\ -1/\sqrt{6} \\ -1/\sqrt{6} \end{array}\right]$

c) 
    $P = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1/2 & 1/2 \\ 0 & 1/2 & 1/2 \\ \end{bmatrix}$

d) 
    $\left[\begin{array}{r}3 \\ 1 \\ 1 \end{array}\right]$

SOLUTION:

a) 
    ${\mathbf w}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right]$ and ${\mathbf w}_2 = \left[\begin{array}{r}2 \\ -1 \\ -1 \end{array}\right]$

b) 
    ${\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ 1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right]$ and ${\mathbf u}_2 = \left[\begin{array}{r}2/\sqrt{6} \\ -1/\sqrt{6} \\ -1/\sqrt{6} \end{array}\right]$

c) 
    $P = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1/2 & 1/2 \\ 0 & 1/2 & 1/2 \\ \end{bmatrix}$

d) 
    $\left[\begin{array}{r}3 \\ 1 \\ 1 \end{array}\right]$

:::

:::exercise {exercise-6-4-002} number=6.4.2 answered=yes src=src/exercises/exercises6-4.xml:113
PROBLEM:
Find the $QR$ factorization of $A=\begin{bmatrix} 4 & 7 \\ -2 & 4 \\ 4 & 4 \end{bmatrix}$.
ANSWER:
$Q=\begin{bmatrix} 2/3 & 1/\sqrt{5} \\ -1/3 & 2/\sqrt{5} \\ 2/3 & 0 \end{bmatrix}$ and $R = \begin{bmatrix} 6 & 6 \\ 0 & 3\sqrt{5} \end{bmatrix}$
SOLUTION:
Applying Gram-Schmidt, we have ${\mathbf w}_1=\left[\begin{array}{r}4 \\ -2 \\ 4 \end{array}\right]$ and ${\mathbf w}_2=\left[\begin{array}{r}3 \\ 6 \\ 0 \end{array}\right]$, which leads to ${\mathbf u}_1=\left[\begin{array}{r}2/3 \\ -1/3 \\ 2/3 \end{array}\right]$ and ${\mathbf u}_2=\left[\begin{array}{r}1/\sqrt{5} \\ 2/\sqrt{5} \\ 0 \end{array}\right]$. It therefore follows that ${\mathbf v}_1 = 6{\mathbf u}_1$ and ${\mathbf v}_2 = 6{\mathbf u}_1 + 3\sqrt{5}{\mathbf u}_2$.
This leads to $A=QR$ where $Q=\begin{bmatrix} 2/3 & 1/\sqrt{5} \\ -1/3 & 2/\sqrt{5} \\ 2/3 & 0 \end{bmatrix}$ and $R = \begin{bmatrix} 6 & 6 \\ 0 & 3\sqrt{5} \end{bmatrix}$.
:::

:::exercise {exercise-6-4-003} number=6.4.3 answered=yes src=src/exercises/exercises6-4.xml:172
PROBLEM:
Consider the basis of ${\mathbb R}^3$ given by the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ -2 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}-1 \\ -3 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_3=\left[\begin{array}{r}2 \\ 0 \\ -5 \end{array}\right] $$

.
:::sage
```sage

```
:::

a) 
    Apply the Gram-Schmit orthogonalization algorithm to find an orthonormal basis ${\mathbf u}_1$, ${\mathbf u}_2$, ${\mathbf u}_3$ for ${\mathbb R}^3$.

b) 
    If $A$ is the $3\times3$ whose columns are ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$, find the $QR$ factorization of $A$.

c) 
    Suppose that we want to solve the equation $A{\mathbf x}={\mathbf b} = \left[\begin{array}{r}-9 \\ 1 \\ 7 \end{array}\right]$, which we can rewrite as $QR{\mathbf x} = {\mathbf b}$.

    1. 
        If we set ${\mathbf y}=R{\mathbf x}$, the equation $QR{\mathbf x}={\mathbf b}$ becomes $Q{\mathbf y}={\mathbf b}$. Explain how to solve the equation $Q{\mathbf y}={\mathbf b}$ in a computationally efficient manner.

    2. 
        Explain how to solve the equation $R{\mathbf x}={\mathbf y}$ in a computationally efficient manner.

    3. 
        Find the solution ${\mathbf x}$ by first solving $Q{\mathbf y} = {\mathbf b}$ and then $R{\mathbf x} = {\mathbf y}$.

ANSWER:

a) 

    $$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ -1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right], \hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ -1/\sqrt{2} \\ 0 \end{array}\right], \hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{6} \\ -1/\sqrt{6} \\ -2/\sqrt{6} \end{array}\right], $$

b) 

    $$ Q = \begin{bmatrix} 1/\sqrt{3} & -1/\sqrt{2} & 1/\sqrt{6} \\ -1/\sqrt{3} & -1/\sqrt{2} & -1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ \end{bmatrix},\hspace{24pt} R = \begin{bmatrix} 2\sqrt{3} & \sqrt{3} & -\sqrt{3} \\ 0 & 2\sqrt{2} & -\sqrt{2} \\ 0 & 0 & 2\sqrt{6} \end{bmatrix} $$

c) 

    1. 
        ${\mathbf y} = Q^T{\mathbf b}$.

    2. 
        $R$ is upper triangular

    3. 
        ${\mathbf x} = \left[\begin{array}{r}-2 \\ 1 \\ -2 \end{array}\right]$

SOLUTION:

a) 
    We find that

    $$ {\mathbf u}_1=\left[\begin{array}{r}1/\sqrt{3} \\ -1/\sqrt{3} \\ 1/\sqrt{3} \end{array}\right], \hspace{24pt} {\mathbf u}_2=\left[\begin{array}{r}-1/\sqrt{2} \\ -1/\sqrt{2} \\ 0 \end{array}\right], \hspace{24pt} {\mathbf u}_3=\left[\begin{array}{r}1/\sqrt{6} \\ -1/\sqrt{6} \\ -2/\sqrt{6} \end{array}\right], $$

b) 

    $$ Q = \begin{bmatrix} 1/\sqrt{3} & -1/\sqrt{2} & 1/\sqrt{6} \\ -1/\sqrt{3} & -1/\sqrt{2} & -1/\sqrt{6} \\ 1/\sqrt{3} & 0 & -2/\sqrt{6} \\ \end{bmatrix},\hspace{24pt} R = \begin{bmatrix} 2\sqrt{3} & \sqrt{3} & -\sqrt{3} \\ 0 & 2\sqrt{2} & -\sqrt{2} \\ 0 & 0 & 2\sqrt{6} \end{bmatrix} $$

c) 

    1. 
        Since $Q^TQ = I$, we have ${\mathbf y} = Q^T{\mathbf b}$.

    2. 
        $R$ is upper triangular so this equation can be solved using back substitution.

    3. 
        ${\mathbf x} = \left[\begin{array}{r}-2 \\ 1 \\ -2 \end{array}\right]$

:::

:::exercise {exercise-6-4-004} number=6.4.4 answered=yes src=src/exercises/exercises6-4.xml:350
PROBLEM:
Consider the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ -1 \\ -1 \\ 1 \\ 1 \\ \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}2 \\ 1 \\ 4 \\ -4 \\ 2 \\ \end{array}\right],\hspace{24pt} {\mathbf v}_3=\left[\begin{array}{r}5 \\ -4 \\ -3 \\ 7 \\ 1 \\ \end{array}\right] $$

and the subspace $W$ of ${\mathbb R}^5$ that they span.
:::sage
```sage

```
:::

a) 
    Find an orthonormal basis for $W$.

b) 
    Find the $5\times5$ matrix that projects vectors orthogonally onto $W$.

c) 
    Find $\widehat{{\mathbf b}}$, the orthogonal projection of ${\mathbf b}=\left[\begin{array}{r}-8 \\ 3 \\ -12 \\ 8 \\ -4 \\ \end{array}\right]$ onto $W$.

d) 
    Express $\widehat{{\mathbf b}}$ as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

ANSWER:

a) 

    $$ {\mathbf w}_1 =\left[\begin{array}{r}1 \\ -1 \\ -1 \\ 1 \\ 1 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_2 =\left[\begin{array}{r}3 \\ 0 \\ 3 \\ -3 \\ 3 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_3 =\left[\begin{array}{r}2 \\ 0 \\ 2 \\ 2 \\ -2 \\ \end{array}\right],\hspace{24pt} $$

b) 

    $$ \begin{bmatrix} 7/10 & -1/5 & 3/10 & 1/5 & 1/5 \\ -1/5 & 1/5 & 1/5 & -1/5& -1/5 \\ 3/10 & 1/5 & 7/10 & -1/5 & -1/5 \\ 1/5 & -1/5 & -1/5 & 7/10 & -3/10 \\ 1/5 & -1/5 & -1/5 & -3/10 & 7/10 \\ \end{bmatrix} $$

c) 
    $\widehat{{\mathbf b}} = \left[\begin{array}{r}-9 \\ -1 \\ -11 \\ 7 \\ -5 \\ \end{array}\right]$

d) 
    $\widehat{{\mathbf b}} = {\mathbf v}_1 - \frac83{\mathbf v}_2 -{\mathbf v}_3$

SOLUTION:

a) 
    Applying Gram-Schmidt gives us

    $$ {\mathbf w}_1 =\left[\begin{array}{r}1 \\ -1 \\ -1 \\ 1 \\ 1 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_2 =\left[\begin{array}{r}3 \\ 0 \\ 3 \\ -3 \\ 3 \\ \end{array}\right],\hspace{24pt} {\mathbf w}_3 =\left[\begin{array}{r}2 \\ 0 \\ 2 \\ 2 \\ -2 \\ \end{array}\right],\hspace{24pt} $$

b) 
    Let $Q$ be the matrix whose columns are the orthonormal basis that results from Gram-Schmidt. Then

    $$ QQ^T = \begin{bmatrix} 7/10 & -1/5 & 3/10 & 1/5 & 1/5 \\ -1/5 & 1/5 & 1/5 & -1/5& -1/5 \\ 3/10 & 1/5 & 7/10 & -1/5 & -1/5 \\ 1/5 & -1/5 & -1/5 & 7/10 & -3/10 \\ 1/5 & -1/5 & -1/5 & -3/10 & 7/10 \\ \end{bmatrix} $$

c) 
    $\widehat{{\mathbf b}} = QQ^T{\mathbf b} = \left[\begin{array}{r}-9 \\ -1 \\ -11 \\ 7 \\ -5 \\ \end{array}\right]$

d) 
    $\widehat{{\mathbf b}} = {\mathbf v}_1 - \frac83{\mathbf v}_2 -{\mathbf v}_3$

:::

:::exercise {exercise-6-4-005} number=6.4.5 answered=yes src=src/exercises/exercises6-4.xml:479
PROBLEM:
Consider the set of vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}1 \\ 2 \\ 2 \end{array}\right],\hspace{24pt} {\mathbf v}_3=\left[\begin{array}{r}3 \\ 0 \\ 0 \end{array}\right]. $$

a) 
    What happens when we apply the Gram-Schmit orthogonalization algorithm?

b) 
    Why does the algorithm fail to produce an orthogonal basis for ${\mathbb R}^3$?

ANSWER:

a) 
    We find ${\mathbf w}={\mathbf 0}$.

b) 
    This set of vectors is linearly dependent.

SOLUTION:

a) 
    We find

    $$ {\mathbf w}_1 = \left[\begin{array}{r}2 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_2 = \left[\begin{array}{r}-1 \\ 1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf w}_3 = \left[\begin{array}{r}0 \\ 0 \\ 0 \end{array}\right] $$

    Since ${\mathbf w}_3={\mathbf 0}$, this does not produce a basis for ${\mathbb R}^3$.

b) 
    The vector ${\mathbf v}_3=2{\mathbf v}_1-{\mathbf v}_2$ so this set of vectors is linearly dependent. Since ${\mathbf v}_3$ is in the span of ${\mathbf v}_1$ and ${\mathbf v}_2$, projecting ${\mathbf v}_3$ into that subspace gives $\widehat{{\mathbf v}}_3 = {\mathbf v}_3$ so that ${\mathbf w}_3 = {\mathbf v}_3 - \widehat{{\mathbf v}}_3 = {\mathbf 0}$.

:::

:::exercise {exercise-6-4-006} number=6.4.6 answered=yes src=src/exercises/exercises6-4.xml:554
PROBLEM:
Suppose that $A$ is a matrix with linearly independent columns and having the factorization $A=QR$. Determine whether the following statements are true or false and explain your thinking.

a) 
    It follows that $R=Q^TA$.

b) 
    The matrix $R$ is invertible.

c) 
    The product $Q^TQ$ projects vectors orthogonally onto $\text{Col}(A)$.

d) 
    The columns of $Q$ are an orthogonal basis for $\text{Col}(A)$.

e) 
    The orthogonal complement $\text{Col}(A)^\perp = \text{Nul}(Q^T)$.

ANSWER:

a) 
    True

b) 
    True

c) 
    False

d) 
    True

e) 
    True

SOLUTION:

a) 
    True. Since $Q^TQ=I$, we have $Q^TA = Q^TQR = R$.

b) 
    True. Since $R$ is upper triangular and the diagonal entries of $R$ are the lengths of the nonzero vectors ${\mathbf w}_j$, we have $\det(R)\neq 0$, which means that $R$ is invertible.

c) 
    False, because $Q^TQ=I$.

d) 
    True. In fact, they are an orthonormal basis for $\text{Col}(A)$.

e) 
    True. If $Q^T{\mathbf x} = {\mathbf 0}$, then ${\mathbf u}_i\cdot{\mathbf x}=0$ for every vector in an orthonormal basis of $\text{Col}(A)$. Therefore, ${\mathbf x}$ is orthogonal to $\text{Col}(A)$.

:::

:::exercise {exercise-6-4-007} number=6.4.7 answered=yes src=src/exercises/exercises6-4.xml:649
PROBLEM:
Suppose we have the $QR$ factorization $A=QR$, where $A$ is a $7\times 4$ matrix.

a) 
    What is the shape of the product $QQ^T$? Explain the significance of this product.

b) 
    What is the shape of the product $Q^TQ$? Explain the significance of this product.

c) 
    What is the shape of the matrix $R$?

d) 
    If $R$ is a diagonal matrix, what can you say about the columns of $A$?

ANSWER:

a) 
    $7\times7$

b) 
    $4\times4$

c) 
    $4\times4$

d) 
    They form an orthogonal set.

SOLUTION:

a) 
    $QQ^T$ is $7\times7$ and projects vectors orthogonally onto $\text{Col}(A)$.

b) 
    $Q^TQ$ is the $4\times4$ identity matrix because the product computes dot products between the columns of $Q$.

c) 
    $R$ is a $4\times4$ upper triangular matrix.

d) 
    The columns of $A$ form an orthogonal set.

:::

:::exercise {exercise-6-4-008} number=6.4.8 answered=yes src=src/exercises/exercises6-4.xml:741
PROBLEM:
Suppose we have the $QR$ factorization $A=QR$ where the columns of $A$ are ${\mathbf a}_1,{\mathbf a}_2,\ldots,{\mathbf a}_n$ and the columns of $R$ are ${\mathbf r}_1,{\mathbf r}_2,\ldots,{\mathbf r}_n$.

a) 
    How can the matrix product $A^TA$ be expressed in terms of dot products?

b) 
    How can the matrix product $R^TR$ be expressed in terms of dot products?

c) 
    Explain why $A^TA=R^TR$.

d) 
    Explain why the dot products ${\mathbf a}_i\cdot{\mathbf a}_j = {\mathbf r}_i\cdot{\mathbf r}_j$.

ANSWER:

a) 
    ${\mathbf a}_i\cdot{\mathbf a}_j$

b) 
    ${\mathbf r}_i\cdot{\mathbf r}_j$

c) 
    $A^TA = (QR)^T(QR) = R^TR$

d) 
    This follows from the previous parts of this exercise.

SOLUTION:

a) 
    The entries of $A^TA$ are the dot products ${\mathbf a}_i\cdot{\mathbf a}_j$.

b) 
    The entries of $R^TR$ are the dot products ${\mathbf r}_i\cdot{\mathbf r}_j$.

c) 
    $A^TA = (QR)^T(QR) = R^TQ^TQR = R^TIR = R^TR$

d) 
    This follows from the previous parts of this exercise.

:::
