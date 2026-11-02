# 7.3 Principal Component Analysis {sec-pca}

We are sometimes presented with a dataset having many data points that live in a high dimensional space. For instance, we looked at a dataset describing body fat index (BFI) in [Activity 6.5.4](ref:6.5#activity-BFI) where each data point is six-dimensional. Developing an intuitive understanding of the data is hampered by the fact that it cannot be visualized.
This section explores a technique called *principal component analysis*, which enables us to reduce the dimension of a dataset so that it may be visualized or studied in a way so that interesting features more readily stand out. Our previous work with variance and the orthogonal diagonalization of symmetric matrices provides the key ideas.

## 7.3.1 Introduction

:::exploration {act:preview-7-3-1} Preview Activity 7.3.1
We will begin by recalling our earlier discussion of variance. Suppose we have a dataset that leads to the covariance matrix

$$ C = \begin{bmatrix} 7 & -4 \\ -4 & 13 \end{bmatrix} $$

.
PROBLEM:
a) Suppose that ${\mathbf u}$ is a unit eigenvector of $C$ with eigenvalue $\lambda$. What is the variance $V_{{\mathbf u}}$ in the ${\mathbf u}$ direction?
b) Find an orthogonal diagonalization of $C$.
    :::sage
    ```sage

    ```
    :::
c) What is the total variance?
d) In which direction is the variance greatest and what is the variance in this direction? If we project the data onto this line, how much variance is lost?
e) In which direction is the variance smallest and how is this direction related to the direction of maximum variance?
SOLUTION:
a) $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = \lambda{\mathbf u}\cdot{\mathbf u} = \lambda$.
b) We can write $C=QDQ^T$ where

    $$ D=\begin{bmatrix} 15 & 0 \\ 0 & 5 \\ \end{bmatrix},~~~ Q = \begin{bmatrix} \frac1{\sqrt{5}} & \frac2{\sqrt{5}} \\ -\frac2{\sqrt{5}} & \frac1{\sqrt{5}} \\ \end{bmatrix} $$

    .
c) The total variance is the sum of the eigenvalues, $V=\lambda_1 + \lambda_2 = 15 + 5 = 20$.
d) The variance is greatest in the direction of the eigenvector associated to the largest eigenvalue. This direction is defined by $\left[\begin{array}{r}\frac{1}{\sqrt{5}} \\ -\frac2{\sqrt{5}} \end{array}\right]$, and the variance is 15 in this direction.
e) The variance is smallest in the direction defined by $\left[\begin{array}{r}\frac2{\sqrt{5}} \\ \frac1{\sqrt{5}} \end{array}\right]$.
:::

Here are some ideas we've seen previously that will be particularly useful for us in this section. Remember that the covariance matrix of a dataset is $C=\frac 1N AA^T$ where $A$ is the matrix of $N$ demeaned data points.

- 
    When ${\mathbf u}$ is a unit vector, the variance of the demeaned data after projecting onto the line defined by ${\mathbf u}$ is given by the quadratic form $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u})$.

- 
    In particular, if ${\mathbf u}$ is a unit eigenvector of $C$ with associated eigenvalue $\lambda$, then $V_{{\mathbf u}} = \lambda$.

- 
    Moreover, variance is additive, as we recorded in [Proposition 7.1.16](ref:7.1#prop-variance-additivity): if $W$ is a subspace having an orthonormal basis ${\mathbf u}_1,{\mathbf u}_2,\ldots,{\mathbf u}_n$, then the variance

    $$ V_W = V_{{\mathbf u}_1} + V_{{\mathbf u}_2} + \ldots + V_{{\mathbf u}_n}\text{.} $$

## 7.3.2 Principal Component Analysis

Let's begin by looking at an example that illustrates the central theme of this technique.

:::activity {act:activity-7-3-2} Activity 7.3.2
Suppose that we work with a dataset having 100 five-dimensional data points. The demeaned data matrix $A$ is therefore $5\times100$ and leads to the covariance matrix $C=\frac1{100}~AA^T$, which is a $5\times5$ matrix. Because $C$ is symmetric, the Spectral Theorem tells us it is orthogonally diagonalizable so suppose that $C = QDQ^T$ where

$$ Q = \begin{bmatrix} {\mathbf u}_1 & {\mathbf u}_2 & {\mathbf u}_3 & {\mathbf u}_4 & {\mathbf u}_5 \end{bmatrix},\hspace{24pt} D = \begin{bmatrix} 13 & 0 & 0 & 0 & 0 \\ 0 & 10 & 0 & 0 & 0 \\ 0 & 0 & 2 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 \end{bmatrix}. $$

a) 
    What is $V_{{\mathbf u}_2}$, the variance in the ${\mathbf u}_2$ direction?

b) 
    Find the variance of the data projected onto the line defined by ${\mathbf u}_4$. What does this say about the data?

c) 
    What is the total variance of the data?

d) 
    Consider the 2-dimensional subspace spanned by ${\mathbf u}_1$ and ${\mathbf u}_2$. If we project the data onto this subspace, what fraction of the total variance is represented by the variance of the projected data?

e) 
    How does this question change if we project onto the 3-dimensional subspace spanned by ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$?

f) 
    What does this tell us about the data?

ANSWER:

a) 
    $10$

b) 
    $0$, which tells us every data point is in the orthogonal complement of ${\mathbf u}_4$.

c) 
    $25$

d) 
    $92\%$ of the variance

e) 
    $100\%$ of the variance.

f) 
    All of the data lies in the $3$-dimensional subspace spanned by ${\mathbf u}_1$, ${\mathbf u}_1$, and ${\mathbf u}_1$.

SOLUTION:

a) 
    $V_{{\mathbf u}_2} = \lambda_2 = 10$

b) 
    $V_{{\mathbf u}_4} = \lambda_4 = 0$, which tells us there is no variance in the ${\mathbf u}_4$ direction. Therefore, when we project onto the line defined by ${\mathbf u}_4$, every data point projects to ${\mathbf 0}$ so every data point is in the orthogonal complement of ${\mathbf u}_4$.

c) 
    $V = V_{{\mathbf u}_1} + V_{{\mathbf u}_2} + V_{{\mathbf u}_3} + V_{{\mathbf u}_4} + V_{{\mathbf u}_5} = 13+10+2+0+0 = 25$.

d) 
    The variance of the data projected onto this subspace is $13+10=23$, which represents $23/25=92\%$ of the variance.

e) 
    Projecting onto this 3-dimensional subspace retains all of the variance.

f) 
    All of the data lies in the $3$-dimensional subspace spanned by ${\mathbf u}_1$, ${\mathbf u}_1$, and ${\mathbf u}_1$.

:::

This activity demonstrates how the eigenvalues of the covariance matrix can tell us when data are clustered around, or even wholly contained within, a smaller dimensional subspace. In particular, the original data is 5-dimensional, but we see that it actually lies in a 3-dimensional subspace of ${\mathbb R}^5$. Later in this section, we'll see how to use this observation to work with the data as if it were three-dimensional, an idea known as *dimensional reduction*.

{index-entry:principal components} The eigenvectors ${\mathbf u}_j$ of the covariance matrix are called *principal components*, and we will order them so that their associated eigenvalues decrease. Generally speaking, we hope that the first few principal components retain most of the variance, as the example in the activity demonstrates. In that example, we have the sequence of subspaces

- 
    $W_1$, the 1-dimensional subspace spanned by ${\mathbf u}_1$, which retains $13/25 = 52\%$ of the total variance,

- 
    $W_2$, the 2-dimensional subspace spanned by ${\mathbf u}_1$ and ${\mathbf u}_2$, which retains $23/25 = 92\%$ of the variance, and

- 
    $W_3$, the 3-dimensional subspace spanned by ${\mathbf u}_1$, ${\mathbf u}_2$, and ${\mathbf u}_3$, which retains all of the variance.

Notice how we retain more of the total variance as we increase the dimension of the subspace onto which the data are projected. Eventually, projecting the data onto $W_3$ retains all the variance, which tells us the data must lie in $W_3$, a smaller dimensional subspace of ${\mathbb R}^5$.

In fact, these subspaces are the best possible. We know that the first principal component ${\mathbf u}_1$ is the eigenvector of $C$ associated to the largest eigenvalue. This means that the variance is as large as possible in the ${\mathbf u}_1$ direction. In other words, projecting onto any other line will retain a smaller amount of variance. Similarly, projecting onto any other 2-dimensional subspace besides $W_2$ will retain less variance than projecting onto $W_2$. The principal components have the wonderful ability to pick out the best possible subspaces to retain as much variance as possible.

Of course, this is a contrived example. Typically, the presence of noise in a dataset means that we do not expect all the points to be wholly contained in a smaller dimensional subspace. In fact, the 2-dimensional subspace $W_2$ retains $92\%$ of the variance. Depending on the situation, we may want to write off the remaining $8\%$ of the variance as noise in exchange for the convenience of working with a smaller dimensional subspace. As we'll see later, we will seek a balance using a number of principal components large enough to retain most of the variance but small enough to be easy to work with.

:::activity {act:activity-7-3-3} Activity 7.3.3
We will work here with a dataset having 100 3-dimensional demeaned data points. Evaluating the following cell will plot those data points and define the demeaned data matrix `A` whose shape is $3\times100$.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/pca_demo.py', globals())

```
:::
Notice that the data appears to cluster around a plane though it does not seem to be wholly contained within that plane.

a) 
    Use the matrix `A` to construct the covariance matrix $C$. Then determine the variance in the direction of ${\mathbf u}=\left[\begin{array}{r}1/3 \\ 2/3 \\ 2/3 \end{array}\right]$?

    :::sage
    ```sage

    ```
    :::

b) 
    Find the eigenvalues of $C$ and determine the total variance.

    :::sage
    ```sage

    ```
    :::

    Notice that Sage does not necessarily sort the eigenvalues in decreasing order.

c) 
    Use the `right_eigenmatrix()` command to find the eigenvectors of $C$. Remembering that the Sage command `B.column(1)` retrieves the vector represented by the second column of `B`, define vectors `u1`, `u2`, and `u3` representing the three principal components in order of decreasing eigenvalues. How can you check if these vectors are an orthonormal basis for ${\mathbb R}^3$?

d) 
    What fraction of the total variance is retained by projecting the data onto $W_1$, the subspace spanned by ${\mathbf u}_1$? What fraction of the total variance is retained by projecting onto $W_2$, the subspace spanned by ${\mathbf u}_1$ and ${\mathbf u}_2$? What fraction of the total variance do we lose by projecting onto $W_2$?

e) 
    If we project a data point ${\mathbf x}$ onto $W_2$, the Projection Formula tells us we obtain

    $$ \widehat{{\mathbf x}} = ({\mathbf u}_1\cdot{\mathbf x}) {\mathbf u}_1 + ({\mathbf u}_2\cdot{\mathbf x}) {\mathbf u}_2. $$

    Rather than viewing the projected data in ${\mathbb R}^3$, we will record the coordinates of $\widehat{{\mathbf x}}$ in the basis defined by ${\mathbf u}_1$ and ${\mathbf u}_2$; that is, we will record the coordinates

    $$ \left[\begin{array}{r}{\mathbf u}_1\cdot{\mathbf x} \\ {\mathbf u}_2\cdot{\mathbf x} \end{array}\right]. $$

    Construct the matrix $Q$ so that $Q^T{\mathbf x} = \left[\begin{array}{r}{\mathbf u}_1\cdot{\mathbf x} \\ {\mathbf u}_2\cdot{\mathbf x} \end{array}\right]$.

    :::sage
    ```sage

    ```
    :::

f) 
    Since each column of $A$ represents a data point, the matrix $Q^TA$ represents the coordinates of the projected data points. Evaluating the following cell will plot those projected data points.

    :::sage
    ```sage
    		    pca_plot(Q.T*A)

    ```
    :::

    Notice how this plot enables us to view the data as if it were two-dimensional. Why is this plot wider than it is tall?

ANSWER:

a) 
    $V_{{\mathbf u}} = 7885$

b) 
    $V=12195$

c) 
    If $P$ is the matrix of eigenvectors, evaluate $P^TP$.

d) 
    $W_1$ retains $83\%$ of the total variance, and $W_2$ retains $98\%$.

e) 
    $Q=\begin{bmatrix}{\mathbf u}_1&{\mathbf u}_2\end{bmatrix}$

f) 
    Because the variance in the ${\mathbf u}_1$ direction is greater than the variance in the ${\mathbf u}_2$ direction.

SOLUTION:

a) 
    After constructing the covariance matrix $C = \frac{1}{100}AA^T$, we find that $V_{{\mathbf u}} = {\mathbf u}\cdot(C{\mathbf u}) = 7885$.

b) 
    The total variance $V$ is the sum of the eigenvalues of $C$ so we obtain $V=12195$.

c) 
    If we obtain $P$, the matrix of eigenvectors, from Sage, computing $P^TP$ evaluates the dot products between the columns. Since $P^TP=I$, the basis provided by Sage is orthonormal.

d) 
    Projecting onto $W_1$, we see that $\lambda_1/V = 0.83$ so $W_1$ retains about $83\%$ of the total variance. The subspace $W_2$ retains $(\lambda_1+\lambda_2)/V=0.98$ or $98\%$ of the total variance. If we project onto $W_2$ we lose less than $2\%$ of the variance.

e) 
    $Q=\begin{bmatrix}{\mathbf u}_1&{\mathbf u}_2\end{bmatrix}$

f) 
    The plot is wider because the variance in the ${\mathbf u}_1$ direction, which corresponds to the horizontal coordinate, is greater than the variance in the ${\mathbf u}_2$ direction.

:::

This example is a more realistic illustration of principal component analysis. The plot of the 3-dimensional data appears to show that the data lies close to a plane, and the principal components will identify this plane. Starting with the $3\times100$ matrix of demeaned data $A$, we construct the covariance matrix $C=\frac{1}{100} ~AA^T$ and study its eigenvalues. Notice that the first two principal components account for more than 98% of the variance, which means we can expect the points to lie close to $W_2$, the two-dimensional subspace spanned by ${\mathbf u}_1$ and ${\mathbf u}_2$.

Since $W_2$ is a subspace of ${\mathbb R}^3$, projecting the data points onto $W_2$ gives a list of 100 points in ${\mathbb R}^3$. In order to visualize them more easily, we instead consider the coordinates of the projections in the basis defined by ${\mathbf u}_1$ and ${\mathbf u}_2$. For instance, we know that the projection of a data point ${\mathbf x}$ is

$$ \widehat{{\mathbf x}} = ({\mathbf u}_1\cdot{\mathbf x}){\mathbf u}_1 + ({\mathbf u}_2\cdot{\mathbf x}){\mathbf u}_2, $$

which is a three-dimensional vector. Instead, we can record the coordinates $\left[\begin{array}{r}{\mathbf u}_1\cdot{\mathbf x} \\ {\mathbf u}_2\cdot{\mathbf x} \end{array}\right]$ and plot them in the two-dimensional coordinate plane, as illustrated in [Figure 7.3.1](ref:fig-pca-coords).

> FIGURE {fig:fig-pca-coords} number=7.3.1 src=../../media/ch07/pca-proj.svg
> alt: A three dimensional vector orthogonally projected onto a plane defined by an orthonormal basis.
> caption: The projection $\widehat{{\mathbf x}}$ of a data point ${\mathbf x}$ onto $W_2$ is a three-dimensional vector, which may be represented by the two coordinates describing this vector as a linear combination of ${\mathbf u}_1$ and ${\mathbf u}_2$.
> subfigure src=../../media/ch07/pca-proj.svg alt: A three dimensional vector orthogonally projected onto a plane defined by an orthonormal basis.
> subfigure src=../../media/ch07/pca-coords.svg alt: A two dimensional view of the plane defined by the orthonormal basis.

If we form the matrix $Q=\begin{bmatrix}{\mathbf u}_1 & {\mathbf u}_2 \end{bmatrix}$, then we have

$$ Q^T{\mathbf x} = \left[\begin{array}{r}{\mathbf u}_1\cdot{\mathbf x} \\ {\mathbf u}_2\cdot{\mathbf x} \end{array}\right]. $$

This means that the columns of $Q^TA$ represent the coordinates of the projected points, which may now be plotted in the plane.

In this plot, the first coordinate, represented by the horizontal coordinate, represents the projection of a data point onto the line defined by ${\mathbf u}_1$ while the second coordinate represents the projection onto the line defined by ${\mathbf u}_2$. Since ${\mathbf u}_1$ is the first principal component, the variance in the ${\mathbf u}_1$ direction is greater than the variance in the ${\mathbf u}_2$ direction. For this reason, the plot will be more spread out in the horizontal direction than in the vertical.

## 7.3.3 Using Principal Component Analysis

Now that we've explored the ideas behind principal component analysis, we will look at a few examples that illustrate its use.

:::activity {act:activity-7-3-4} Activity 7.3.4
The next cell will load a dataset describing the average consumption of various food groups for citizens in each of the four nations of the United Kingdom. The units for each entry are grams per person per week.
:::sage
```sage
import pandas as pd
df = pd.read_csv('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/data/uk-diet.csv', index_col=0)
data_mean = vector(df.T.mean())
A = matrix([vector(row) for row in (df.T-df.T.mean()).values]).T
df

```
:::
We will view this as a dataset consisting of four points in ${\mathbb R}^{17}$. As such, it is impossible to visualize and studying the numbers themselves doesn't lead to much insight.
In addition to loading the data, evaluating the cell above created a vector `data_mean`, which is the mean of the four data points, and `A`, the $17\times4$ matrix of demeaned data.

a) 
    What is the average consumption of Beverages across the four nations?

    :::sage
    ```sage

    ```
    :::

b) 
    Find the covariance matrix $C$ and its eigenvalues. Because there are four points in ${\mathbb R}^{17}$ whose mean is zero, there are only three nonzero eigenvalues.

c) 
    For what percentage of the total variance does the first principal component account?

d) 
    Find the first principal component ${\mathbf u}_1$ and project the four demeaned data points onto the line defined by ${\mathbf u}_1$. Plot those points on [Figure 7.3.2](ref:fig-pca-1d)

    > FIGURE {fig:fig-pca-1d} number=7.3.2 src=../../media/ch07/pca-plot-1.svg
    > alt: A number line suitable for plotting the projected data.
    > width: 90%
    > caption: A plot of the demeaned data projected onto the first principal component.

e) 
    For what percentage of the total variance do the first two principal components account?

f) 
    Find the coordinates of the demeaned data points projected onto $W_2$, the two-dimensional subspace of ${\mathbb R}^{17}$ spanned by the first two principal components.

    :::sage
    ```sage

    ```
    :::

    Plot these coordinates in [Figure 7.3.3](ref:fig-pca-2d).

    > FIGURE {fig:fig-pca-2d} number=7.3.3 src=../../media/ch07/pca-plot-2.svg
    > alt: A coordinate grid and set of axes suitable for plotting the projected data.
    > width: 90%
    > caption: The coordinates of the demeaned data points projected onto the first two principal components.

g) 
    What information do these plots reveal that is not clear from consideration of the original data points?

h) 
    Study the first principal component ${\mathbf u}_1$ and find the first component of ${\mathbf u}_1$, which corresponds to the dietary category Alcoholic Drinks. (To do this, you may wish to use `N(u1, digits=2)` for a result that's easier to read.) If a data point lies on the far right side of the plot in [Figure 7.3.3](ref:fig-pca-2d), what does it mean about that nation's consumption of Alcoholic Drinks?

ANSWER:

a) 
    $57.5$

b) 
    $78805$, $33946$, and $4093$

c) 
    $67\%$

d) 
    The coordinates are

    > TABLE {tab:tab-} number= cols=2
    > caption: The first PCA coordinates
    |  |  |
    | --- | --- |
    | Nation | Coordinate |
    | England | $-145$ |
    | Northern Ireland | $477$ |
    | Scotland | $-92$ |
    | Wales | $-241$ |

e) 
    $96\%$

f) 
    The coordinates are

    > TABLE {tab:tab-} number= cols=2
    > caption: The first two PCA coordinates
    |  |  |
    | --- | --- |
    | Nation | Coordinates |
    | England | $(-145, 3)$ |
    | Northern Ireland | $(477, 59)$ |
    | Scotland | $(-92, -286)$ |
    | England | $(-241, 225)$ |

g) 
    Northern Ireland appears to be significantly different from the other three nations.

h) 
    The average consumption of Alcoholic Drinks will be less than the mean.

SOLUTION:

a) 
    Beverages is the second category so this would be the second component of the `data_mean` vector, which is $57.5$.

b) 
    The three nonzero eigenvalues are $78805$, $33946$, and $4093$.

c) 
    The total variance $V=116844$ is the sum of the eigenvalues so the first principal component accounts for $\lambda_1/V = 67\%$ of the total variance.

d) 
    The coordinates are

    > TABLE {tab:tab-} number= cols=2
    > caption: The first PCA coordinates
    |  |  |
    | --- | --- |
    | Nation | Coordinate |
    | England | $-145$ |
    | Northern Ireland | $477$ |
    | Scotland | $-92$ |
    | Wales | $-241$ |

e) 
    The first two principal components account for $96\%$ of the total variance.

f) 
    The coordinates are

    > TABLE {tab:tab-} number= cols=2
    > caption: The first two PCA coordinates
    |  |  |
    | --- | --- |
    | Nation | Coordinates |
    | England | $(-145, 3)$ |
    | Northern Ireland | $(477, 59)$ |
    | Scotland | $(-92, -286)$ |
    | England | $(-241, 225)$ |

g) 
    Northern Ireland appears to be significantly different from the other three nations. There are several possible reasons for this, both historical and geographical, that we might explore.

h) 
    The first component of ${\mathbf u}_1$ is negative. Therefore, if a nation is on the right side of this plot, the average consumption of Alcoholic Drinks will be less than the mean. This can be confirmed by looking at the original data.

:::

This activity demonstrates how principal component analysis enables us to extract information from a dataset that may not be easily obtained otherwise. As in our previous example, we see that the data points lie quite close to a two-dimensional subspace of ${\mathbb R}^{17}$. In fact, $W_2$, the subspace spanned by the first two principal components, accounts for more than 96% of the variance. More importantly, when we project the data onto $W_2$, it becomes apparent that Northern Ireland is fundamentally different from the other three nations.

With some additional thought, we can determine more specific ways in which Northern Ireland is different. On the $2$-dimensional plot, Northern Ireland lies far to the right compared to the other three nations. Since the data has been demeaned, the origin $(0,0)$ in this plot corresponds to the average of the four nations. The coordinates of the point representing Northern Ireland are about $(477, 59)$, meaning that the projected data point differs from the mean by about $477{\mathbf u}_1+59{\mathbf u}_2$.

Let's just focus on the contribution from ${\mathbf u}_1$. We see that the ninth component of ${\mathbf u}_1$, the one that describes Fresh Fruit, is about $-0.63$. This means that the ninth component of $477{\mathbf u}_1$ differs from the mean by about $477(-0.63) = -300$ grams per person per week. So roughly speaking, people in Northern Ireland are eating about 300 fewer grams of Fresh Fruit than the average across the four nations. This is borne out by looking at the original data, which show that the consumption of Fresh Fruit in Northern Ireland is significantly less than the other nations. Examing the other components of ${\mathbf u}_1$ shows other ways in which Northern Ireland differs from the other three nations.

:::activity {act:activity-pca-iris} Activity 7.3.5
In this activity, we'll look at a [archive.ics.uci.edu](https://archive.ics.uci.edu/ml/datasets/Iris) that describes 150 irises representing three species of iris: Iris setosa, Iris versicolor, and Iris virginica. For each flower, the length and width of its sepal and the length and width of its petal, all in centimeters, are recorded.
> FIGURE {fig:fig-iris} number=7.3.4 src=../../media/ch07/Iris_versicolor.jpg
> alt: A photograph of an iris versicolor.
> width: 70%
> caption: One of the three species, iris versicolor, represented in the dataset showing three shorter petals and three longer sepals. (Source: [gvsu.edu/s/21D](https://commons.wikimedia.org/wiki/File:Iris_versicolor_3.jpg), License: [gvsu.edu/s/21E](https://commons.wikimedia.org/wiki/Commons:GNU_Free_Documentation_License,_version_1.2))
Evaluating the following cell will load the dataset, which consists of 150 points in ${\mathbb R}^4$. In addition, we have a vector `data_mean`, a four-dimensional vector holding the mean of the data points, and `A`, the $4\times150$ demeaned data matrix.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/pca_iris.py', globals())
df.T

```
:::
Since the data is four-dimensional, we are not able to visualize it. Of course, we could forget about two of the measurements and plot the 150 points represented by their, say, sepal length and sepal width.
:::sage
```sage
sepal_plot()

```
:::

a) 
    What is the mean sepal width?

b) 
    Find the covariance matrix $C$ and its eigenvalues.

    :::sage
    ```sage

    ```
    :::

c) 
    Find the fraction of variance for which the first two principal components account.

d) 
    Construct the first two principal components ${\mathbf u}_1$ and ${\mathbf u}_2$ along with the matrix $Q$ whose columns are ${\mathbf u}_1$ and ${\mathbf u}_2$.

    :::sage
    ```sage

    ```
    :::

e) 
    As we have seen, the columns of the matrix $Q^TA$ hold the coordinates of the demeaned data points after projecting onto $W_2$, the subspace spanned by the first two principal components. Evaluating the following cell shows a plot of these coordinates.

    :::sage
    ```sage
    pca_plot(Q.T*A)

    ```
    :::

    Suppose we have a flower whose coordinates in this plane are $(-2.5, -0.75)$. To what species does this iris most likely belong? Find an estimate of the sepal length, sepal width, petal length, and petal width for this flower.

f) 
    Suppose you have an iris, but you only know that its sepal length is 5.65 cm and its sepal width is 2.75 cm. Knowing only these two measurements, determine the coordinates $(c_1, c_2)$ in the plane where this iris lies. To what species does this iris most likely belong? Now estimate the petal length and petal width of this iris.

    :::sage
    ```sage

    ```
    :::

g) 
    Suppose you find another iris whose sepal width is 3.2 cm and whose petal width is 2.2 cm. Find the coordinates $(c_1, c_2)$ of this iris and determine the species to which it most likely belongs. Also, estimate the sepal length and the petal length.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    $3.05$.

b) 
    $4.20$, $0.24$, $0.08$, $0.02$.

c) 
    $97.8\%$

d) 
    The columns of $Q$ are for the first two principal components.

e) 
    Iris setosa and the vector of measurements is $\left[\begin{array}{r}5.43 \\ 3.81 \\ 1.49 \\ 0.25 \end{array}\right]$.

f) 
    The petal length is $3.99$ and the petal width is $1.29$.

g) 
    The sepal length is $7.23$ and the petal length is $6.15$.

SOLUTION:

a) 
    The second component of `data_mean`, which is the one corresponding to sepal width, is $3.05$.

b) 
    The eigenvalues are $4.20$, $0.24$, $0.08$, and $0.02$.

c) 
    The first two principal components account for $97.8\%$ of the variance.

d) 
    If $P$ is the matrix whose columns are an orthonormal basis of eigenvectors, then $Q$ is formed from the first two columns of $P$.

e) 
    This would most likely belong to Iris setosa. To find its measurements, we evaluate $-2.5{\mathbf u}_1 - 0.75{\mathbf u}_2 + {\mathbf m}$ where ${\mathbf m}$ is the vector of means. This is the same as $Q\left[\begin{array}{r}-2.5 \\ -0.75 \end{array}\right] + {\mathbf m}$, which gives the vector of measurements $\left[\begin{array}{r}5.43 \\ 3.81 \\ 1.49 \\ 0.25 \end{array}\right]$.

f) 
    Subtracting the mean sepal length and sepal width, we have $(-0.19, -0.30)$. Then the first two components of $c_1{\mathbf u}_1+c_2{\mathbf u}_2 = Q\left[\begin{array}{r}c_1 \\ c_2 \end{array}\right] = \left[\begin{array}{r}-0.19 \\ -0.30 \end{array}\right]$. This gives $(c_1, c_2) = (0.18, 0.40)$. This looks like an Iris versicolor. As in the previous part, we can now find the petal length to be $3.99$ and the petal width to be $1.29$.

g) 
    Using the same approach as the last part, we find $(c_1,c_2)=(2.90, -0.53)$, which gives a sepal length of $7.23$ and a petal length of $6.15$. Most likely, this flower belongs to Iris virginica.

:::

## 7.3.4 Summary

This section has explored principal component analysis as a technique to reduce the dimension of a dataset. From the demeaned data matrix $A$, we form the covariance matrix $C= \frac1N ~AA^T$, where $N$ is the number of data points.

- 
    The eigenvectors ${\mathbf u}_1, {\mathbf u}_2, \ldots {\mathbf u}_m$, of $C$ are called the principal components. We arrange them so that their corresponding eigenvalues are in decreasing order.

- 
    If $W_n$ is the subspace spanned by the first $n$ principal components, then the variance of the demeaned data projected onto $W_n$ is the sum of the first $n$ eigenvalues of $C$. No other $n$-dimensional subspace retains more variance when the data is projected onto it.

- 
    If $Q$ is the matrix whose columns are the first $n$ principal components, then the columns of $Q^TA$ hold the coordinates, expressed in the basis ${\mathbf u}_1,\ldots,{\mathbf u}_n$, of the data once projected onto $W_n$.

- 
    Our goal is to use a number of principal components that is large enough to retain most of the variance in the dataset but small enough to be manageable.

## 7.3.5 Exercises

:::exercise {exercise-7-3-001} number=7.3.1 answered=yes src=src/exercises/exercises7-3.xml:5
PROBLEM:
Suppose that

$$ Q = \begin{bmatrix} -1/\sqrt{2} & 1/\sqrt{2} \\ 1/\sqrt{2} & 1/\sqrt{2} \\ \end{bmatrix}, \hspace{24pt} D_1 = \begin{bmatrix} 75 & 0 \\ 0 & 74 \end{bmatrix}, \hspace{24pt} D_2 = \begin{bmatrix} 100 & 0 \\ 0 & 1 \end{bmatrix} $$

and that we have two datasets, one whose covariance matrix is $C_1 = QD_1Q^T$ and one whose covariance matrix is $C_2 = QD_2Q^T$. For each dataset, find

a) 
    the total variance.

b) 
    the fraction of variance represented by the first principal component.

c) 
    a verbal description of how the demeaned data points appear when plotted in the plane.

ANSWER:

a) 
    $149$ for the first dataset and $101$ for the second

b) 
    $50.3\%$ and $99.0\%$

c) 
    The points in the second set are clustered very close to a line.

SOLUTION:

a) 
    For the first dataset, the total variance is $75+75 = 149$ while the second dataset has a total variance of $100+1=101$.

b) 
    In the first dataset, the first principal component represents $75/149=50.3\%$ of the variance compared to $100/101=99.0\%$ in the second dataset.

c) 
    The points in the first dataset are scattered almost uniformly around the origin. In the second dataset, they are clustered very close to the line defined by the vector $\left[\begin{array}{r}-1/\sqrt{2} \\ 1/\sqrt{2} \end{array}\right]$.

:::

:::exercise {exercise-7-3-002} number=7.3.2 answered=yes src=src/exercises/exercises7-3.xml:105
PROBLEM:
Suppose that a dataset has mean $\left[\begin{array}{r}13 \\ 5 \\ 7 \end{array}\right]$ and that its associated covariance matrix is $C=\begin{bmatrix} 275 & -206 & 251 \\ -206 & 320 & -206 \\ 251 & -206 & 275 \end{bmatrix}$.
:::sage
```sage

```
:::

a) 
    What fraction of the variance is represented by the first two principal components?

b) 
    If $\left[\begin{array}{r}30 \\ -3 \\ 26 \end{array}\right]$ is one of the data points, find the coordinates when the demeaned point is projected into the plane defined by the first two principal components.

c) 
    If a projected data point has coordinates $\left[\begin{array}{r}12 \\ -25 \end{array}\right]$, find an estimate for the original data point.

ANSWER:

a) 
    $97\%$

b) 
    $\left[\begin{array}{r}25.4 \\ 8.16 \end{array}\right]$.

c) 
    $\left[\begin{array}{r}9.7 \\ -22.3 \\ 3.7 \end{array}\right]$.

SOLUTION:

a) 
    The eigenvalues are $732$, $114$, and $24$ so the fraction of variance represented by the first two principal components is $(732+114)/(732+114+24) = 97\%$

b) 
    Suppose ${\mathbf x}$ is this data point and ${\mathbf m}$ the vector of means. If $Q$ is the $2\times3$ matrix whose columns are the first two principal components, then we find $Q.T({\mathbf x}-{\mathbf m}) = \left[\begin{array}{r}25.4 \\ 8.16 \end{array}\right]$.

c) 
    We find $Q\left[\begin{array}{r}12 \\ -25 \end{array}\right] + {\mathbf m} = \left[\begin{array}{r}9.7 \\ -22.3 \\ 3.7 \end{array}\right]$.

:::

:::exercise {exercise-7-3-003} number=7.3.3 answered=yes src=src/exercises/exercises7-3.xml:204
PROBLEM:
Evaluating the following cell loads a $2\times100$ demeaned data matrix `A`.
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/pca_ex.py', globals())

```
:::

a) 
    Find the principal components ${\mathbf u}_1$ and ${\mathbf u}_2$ and the variance in the direction of each principal component.

b) 
    What is the total variance?

c) 
    What can you conclude about this dataset?

ANSWER:

a) 
    The variances are $V_{{\mathbf u}_1} = 1.62$ and $V_{{\mathbf u}_2} = 0$.

b) 
    $1.62$

c) 
    All of the data lies on a line

SOLUTION:

a) 
    We find that ${\mathbf u}_1 = \left[\begin{array}{r}-0.45 \\ -0.89 \end{array}\right]$ and ${\mathbf u}_2=\left[\begin{array}{r}-0.89 \\ 0.44 \end{array}\right]$. The variances are $V_{{\mathbf u}_1} = 1.62$ and $V_{{\mathbf u}_2} = 0$.

b) 
    The total variance is $1.62$.

c) 
    All of the data lies on the line defined by ${\mathbf u}_1$.

:::

:::exercise {exercise-7-3-004} number=7.3.4 answered=yes src=src/exercises/exercises7-3.xml:288
PROBLEM:
Determine whether the following statements are true or false and explain your thinking.

a) 
    If the eigenvalues of the covariance matrix are $\lambda_1$, $\lambda_2$, and $\lambda_3$, then $\lambda_3$ is the variance of the demeaned data points when projected on the third principal component ${\mathbf u}_3$.

b) 
    Principal component analysis always allows us to construct a smaller dimensional representation of a dataset without losing any information.

c) 
    If the eigenvalues of the covariance matrix are 56, 32, and 0, then the demeaned data points all lie on a line in ${\mathbb R}^3$.

ANSWER:

a) 
    True

b) 
    False

c) 
    False

SOLUTION:

a) 
    True. The variance of the projected data points is $V_{{\mathbf u}_3} = {\mathbf u}_3\cdot(C{\mathbf u}_3) = \lambda_3$.

b) 
    False. If we project onto a subspace that retains less than all the variance, then we are losing information about the data in the directions orthogonal to the subspace.

c) 
    False. They will lie on the plane spanned by the first two principal components.

:::

:::exercise {exercise-7-3-005} number=7.3.5 answered=yes src=src/exercises/exercises7-3.xml:372
PROBLEM:
In [Activity 7.3.5](ref:activity-pca-iris), we looked at a dataset consisting of four measurements of 150 irises. These measurements are sepal length, sepal width, petal length, and petal width.

a) 
    Find the first principal component ${\mathbf u}_1$ and describe the meaning of its four components. Which component is most significant? What can you say about the relative importance of the four measurements?

b) 
    When the dataset is plotted in the plane defined by ${\mathbf u}_1$ and ${\mathbf u}_2$, the specimens from the species iris-setosa lie on the left side of the plot. What does this tell us about how iris-setosa differs from the other two species in the four measurements?

c) 
    In general, which species is closest to the “average iris”?

ANSWER:

a) 
    The petal length is the most signficant and the sepal width is the least.

b) 
    Iris setosa has a below average petal length and appears overall smaller.

c) 
    Iris versicolor

SOLUTION:

a) 
    The first principal component is ${\mathbf u}_1 = \left[\begin{array}{r}0.36 \\ -0.08 \\ 0.85 \\ 0.36 \end{array}\right]$. If we move in the ${\mathbf u}_1$ direction, each component describes how we move away from the mean of that measurement. The most important component is the third one, which corresponds to petal length, while the second component, corresponding to sepal width, is least signficant. Of the four measurements, there is the most variance in petal length.

b) 
    To reach an Iris setosa sample, we multiply ${\mathbf u}_1$ by a negative number. This says that the petal length, the most signficant component of ${\mathbf u}_1$ will be below the mean for Iris setosa. The sepal length and petal width will also be below the mean. Basically, the Iris setosa would appear to be smaller overall.

c) 
    Iris versicolor would appear to be closest to average since the points are closest to the origin in the ${\mathbf u}_1$-${\mathbf u}_2$ plane.

:::

:::exercise {exercise-7-3-006} number=7.3.6 answered=yes src=src/exercises/exercises7-3.xml:473
PROBLEM:
This problem explores a dataset describing 333 penguins. There are three species, Adelie, Chinstrap, and Gentoo, as illustrated on the left of [Figure 7.3.5](ref:fig-penguins), as well as both male and female penguins in the dataset.
> FIGURE {fig:fig-penguins} number=7.3.5 src=../../media/ch07/lter_penguins.png
> alt: Artwork depicting three species of penguins.
> caption: Artwork by [gvsu.edu/s/21G](https://github.com/allisonhorst/palmerpenguins/blob/master/README.md)
> subfigure src=../../media/ch07/lter_penguins.png alt: Artwork depicting three species of penguins.
> subfigure src=../../media/ch07/culmen_depth.png alt: A close up of a penguin's head defining the culmen and its dimensions.
Evaluating the next cell will load and display the data. The meaning of the culmen length and width is contained in the illustration on the right of [Figure 7.3.5](ref:fig-penguins).
:::sage
```sage
sage.repl.load.load('https://raw.githubusercontent.com/davidaustinm/ula_modules/master/pca_penguins.py', globals())
df.T

```
:::
This dataset is a bit different from others that we've looked at because the scale of the measurements is significantly different. For instance, the measurements for the body mass are roughly 100 times as large as those for the culmen length. For this reason, we will standardize the data by first demeaning it, as usual, and then rescaling each measurement by the reciprocal of its standard deviation. The result is stored in the $4\times333$ matrix `A`.
:::sage
```sage

```
:::

a) 
    Find the covariance matrix and its eigenvalues.

b) 
    What fraction of the total variance is explained by the first two principal components?

c) 
    Construct the $2\times333$ matrix $B$ whose columns are the coordinates of the demeaned data points projected onto the first two principal components. The following cell will create the plot.

    :::sage
    ```sage
    pca_plot(B)

    ```
    :::

d) 
    Examine the components of the first two principal component vectors. How does the body mass of Gentoo penguins compare to that of the other two species?

e) 
    What seems to be generally true about the culmen measurements for a Chinstrap penguin compared to a Adelie?

f) 
    You can plot just the males or females using the following cell.

    :::sage
    ```sage
    pca_plot(B, sex='female')

    ```
    :::

    What seems to be generally true about the body mass measurements for a male Gentoo compared to a female Gentoo?

ANSWER:

a) 
    $2.7$, $0.8$, $0.4$, $0.1$.

b) 
    $88\%$

c) 
    $B=Q^TA$ where the columns of $Q$ are the first two principal components.

d) 
    Gentoo penguins have a larger body mass.

e) 
    These measurements seem larger for the Chinstrap penguins.

f) 
    The male Gentoo have a higher body mass.

SOLUTION:

a) 
    The eigenvalues are $2.7$, $0.8$, $0.4$, and $0.1$.

b) 
    The first two principal components retain $88\%$ of the total variance.

c) 
    $B=Q^TA$ where the columns of $Q$ are the first two principal components.

d) 
    Gentoo penguins have a larger body mass because the fourth component, which corresponds to body mass, of ${\mathbf u}_1$ is negative and the Gentoo penguins are represented by $c_1{\mathbf u}_1$ where $c_1$ is negative.

e) 
    These measurements seem larger for the Chinstrap penguins because the first two components of ${\mathbf u}_2$ are positive.

f) 
    The male Gentoo lie further to the left, which means they have a higher body mass.

:::
