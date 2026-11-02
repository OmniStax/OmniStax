# 6.1 The dot product {sec-dot-product}

Although we originally introduced vectors as a way to gain geometric insight into systems of linear equations, we have yet to leverage all the geometric information available from this perspective. In this section, we introduce a simple algebraic operation, known as the *dot product*, that helps us measure the length of vectors and the angle formed by a pair of vectors.

## 6.1.1 Introduction

For two-dimensional vectors ${\mathbf v}$ and ${\mathbf w}$, their dot product ${\mathbf v}\cdot{\mathbf w}$ is the scalar defined to be

$$ {\mathbf v}\cdot{\mathbf w} = \left[\begin{array}{r}v_1 \\ v_2 \end{array}\right]\cdot\left[\begin{array}{r}w_1 \\ w_2 \end{array}\right] = v_1w_1 + v_2w_2\text{.} $$

For instance,

$$ \left[\begin{array}{r}2 \\ -3 \end{array}\right]\cdot\left[\begin{array}{r}4 \\ 1 \end{array}\right] = 2\cdot 4 + (-3)\cdot 1 = 5. $$

:::exploration {act:preview-6-1-1} Preview Activity 6.1.1
PROBLEM:
a) Compute the dot product

    $$ \left[\begin{array}{r}3 \\ 4 \end{array}\right]\cdot\left[\begin{array}{r}2 \\ -2 \end{array}\right]\text{.} $$

b) Sketch the vector ${\mathbf v}=\left[\begin{array}{r}3 \\ 4 \end{array}\right]$ below. Then use the Pythagorean theorem to find the length of ${\mathbf v}$.
    > FIGURE {fig:fig-6-1-1} number=6.1.1 src=../../media/ch06/empty-6.svg
    > alt: A coordinate grid and set of axes.
    > caption: Sketch the vector ${\mathbf v}$ and find its length.
c) Compute the dot product ${\mathbf v}\cdot{\mathbf v}$. How is the dot product related to the length of ${\mathbf v}$?
d) Remember that the matrix $\left[\begin{array}{rr}0 \amp -1 \\ 1 \amp 0 \\ \end{array}\right]$ represents the matrix transformation that rotates vectors counterclockwise by $90^\circ$. Beginning with the vector ${\mathbf v} = \left[\begin{array}{r}3 \\ 4 \end{array}\right]$, find ${\mathbf w}$, the result of rotating ${\mathbf v}$ by $90^\circ$, and sketch it above.
e) What is the dot product ${\mathbf v}\cdot{\mathbf w}$?
f) Suppose that ${\mathbf v}=\left[\begin{array}{r}a \\ b \end{array}\right]$. Find the vector ${\mathbf w}$ that results from rotating ${\mathbf v}$ by $90^\circ$ and find the dot product ${\mathbf v}\cdot{\mathbf w}$.
g) Suppose that ${\mathbf v}$ and ${\mathbf w}$ are two perpendicular vectors. What do you think their dot product ${\mathbf v}\cdot{\mathbf w}$ is?
SOLUTION:
a) $\left[\begin{array}{r}3 \\ 4 \end{array}\right]\cdot\left[\begin{array}{r}2 \\ -2 \end{array}\right] = 3\cdot2+4\cdot(-2) = -2$.
b) The length of ${\mathbf v}$ is 5.
c) ${\mathbf v}\cdot{\mathbf v} = 25$, which is the square of the length of ${\mathbf v}$.
d) ${\mathbf w}=\left[\begin{array}{r}-4 \\ 3 \end{array}\right]$
e) ${\mathbf v}\cdot{\mathbf w}=0$.
f) ${\mathbf v}\cdot{\mathbf w}=0$.
g) The dot product should be zero.
:::

## 6.1.2 The geometry of the dot product

{index-entry:dot product} The dot product is defined, more generally, for any two $m$-dimensional vectors:

$$ {\mathbf v}\cdot{\mathbf w} = \left[ \begin{array}{c} v_1 \\ v_2 \\ \vdots \\ v_m \\ \end{array} \right] \cdot \left[ \begin{array}{c} w_1 \\ w_2 \\ \vdots \\ w_m \\ \end{array} \right] = v_1w_1 + v_2w_2 + \ldots + v_mw_m\text{.} $$

The important thing to remember is that the dot product will produce a scalar. In other words, the two vectors are combined in such a way as to create a number, and, as we'll see, this number conveys useful geometric information.

:::example {ex:example-6-1-2} Example 6.1.2
We compute the dot product between two four-dimensional vectors as

$$ \left[ \begin{array}{c} 2 \\ 0 \\ -3 \\ 1 \\ \end{array} \right] \cdot \left[ \begin{array}{c} -1 \\ 3 \\ 1 \\ 2 \\ \end{array} \right] = 2(-1) + 0(3) + (-3)(1) + 1(2) = -3\text{.} $$

:::

:::assemblage {asm:assemblage-} Properties of dot products
As with ordinary multiplication, the dot product enjoys some familiar algebraic properties, such as commutativity and distributivity. More specifically, it doesn't matter in which order we compute the dot product of two vectors:

$$ {\mathbf v}\cdot{\mathbf w} = {\mathbf w}\cdot{\mathbf v}\text{.} $$

If $s$ is a scalar, we have

$$ (s{\mathbf v})\cdot{\mathbf w} = s({\mathbf v}\cdot{\mathbf w})\text{.} $$

We may also distribute the dot product across linear combinations:

$$ (c_1{\mathbf v}_1+c_2{\mathbf v}_2)\cdot{\mathbf w} = c_1{\mathbf v}_1\cdot{\mathbf w} + c_2{\mathbf v}_2\cdot{\mathbf w}\text{.} $$

:::

:::example {ex:example-6-1-3} Example 6.1.3
Suppose that ${\mathbf v}_1\cdot{\mathbf w} = 4$ and ${\mathbf v}_2\cdot{\mathbf w} = -7$. Then

$$ \begin{aligned} (2{\mathbf v}_1)\cdot{\mathbf w} & {}={} 2({\mathbf v}_1\cdot{\mathbf w}) = 2(4) = 8 \\ (-3{\mathbf v}_1+ 2{\mathbf v}_2)\cdot{\mathbf w} & {}={} -3({\mathbf v}_1\cdot{\mathbf w}) + 2({\mathbf v}_2\cdot{\mathbf w}) = -3(4)+2(-7) = -26\text{.} \end{aligned} $$

:::

The most important property of the dot product, and the real reason for our interest in it, is that it gives us geometric information about vectors and their relationship to one another. Let's first think about the length of a vector by looking at the vector ${\mathbf v} = \left[\begin{array}{r}3 \\ 2 \end{array}\right]$ as shown in [Figure 6.1.4](ref:fig-dot-length)

> FIGURE {fig:fig-dot-length} number=6.1.4 src=../../media/ch06/dot-length.svg
> alt: A two dimensional vector against a coordinate grid and set of axes.
> width: 50%
> caption: The vector ${\mathbf v}=\left[\begin{array}{r}3 \\ 2 \end{array}\right]$.

We may find the length of this vector using the Pythagorean theorem since the vector forms the hypotenuse of a right triangle having a horizontal leg of length 3 and a vertical leg of length 2. The length of ${\mathbf v}$, which we denote as $\left|{\mathbf v}\right|$, is therefore $\left|{\mathbf v}\right| = \sqrt{3^2 + 2^2} = \sqrt{13}$. Now notice that the dot product of ${\mathbf v}$ with itself is

$$ {\mathbf v}\cdot{\mathbf v} = 3(3) + 2(2) = 13 = \left|{\mathbf v}\right|^2 $$

. This is true in general; that is, we have

$$ {\mathbf v}\cdot{\mathbf v} = \left|{\mathbf v}\right|^2\text{.} $$

More than that, the dot product of two vectors records information about the angle between them. Consider [Figure 6.1.5](ref:fig-dot-angle).

> FIGURE {fig:fig-dot-angle} number=6.1.5 src=../../media/ch06/dot-angle.svg
> alt: Two vectors, the angle between them, and their vector difference.
> width: 50%
> caption: The dot product ${\mathbf v}\cdot{\mathbf w}$ measures the angle $\theta$.

To see this, we will apply the Law of Cosines, which says that

$$ \begin{aligned} \left|{\mathbf w}-{\mathbf v}\right|^2 & = \left|{\mathbf v}\right|^2 + \left|{\mathbf w}\right|^2 - 2\left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ ({\mathbf w}-{\mathbf v})\cdot({\mathbf w}-{\mathbf v}) & = {\mathbf v}\cdot{\mathbf v} + {\mathbf w}\cdot{\mathbf w} - 2\left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ {\mathbf w}\cdot{\mathbf w} + {\mathbf v}\cdot{\mathbf v}- 2{\mathbf v}\cdot{\mathbf w} & = {\mathbf v}\cdot{\mathbf v} + {\mathbf w}\cdot{\mathbf w} - 2\left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ -2{\mathbf v}\cdot{\mathbf w} & = -2\left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ {\mathbf v}\cdot{\mathbf w} & = \left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ \end{aligned} $$

The upshot of this reasoning is that

$$ {\mathbf v}\cdot{\mathbf w} = \left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta\text{.} $$

To summarize:

:::assemblage {asm:assemblage-} Geometric properties of the dot product
The dot product gives us the following geometric information:

$$ \begin{aligned} {\mathbf v}\cdot{\mathbf v}& = \left|{\mathbf v}\right|^2 \\ {\mathbf v}\cdot{\mathbf w}& = \left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ \end{aligned} $$

where $\theta$ is the angle between ${\mathbf v}$ and ${\mathbf w}$.
:::

:::activity {act:activity-6-1-2} Activity 6.1.2

a) 
    Sketch the vectors ${\mathbf v}=\left[\begin{array}{r}3 \\ 2 \end{array}\right]$ and ${\mathbf w}=\left[\begin{array}{r}-1 \\ 3 \end{array}\right]$ using [Figure 6.1.6](ref:fig-dot-empty).

    > FIGURE {fig:fig-dot-empty} number=6.1.6 src=../../media/ch06/empty-4.svg
    > alt: A coordinate grid and set of axes.
    > width: 50%
    > caption: Sketch the vectors ${\mathbf v}$ and ${\mathbf w}$ here.

b) 
    Find the lengths $\left|{\mathbf v}\right|$ and $\left|{\mathbf w}\right|$ using the dot product.

c) 
    Find the dot product ${\mathbf v}\cdot{\mathbf w}$ and use it to find the angle between ${\mathbf v}$ and ${\mathbf w}$.

d) 
    Consider the vector ${\mathbf x} = \left[\begin{array}{r}-2 \\ 3 \end{array}\right]$. Include it in your sketch in [Figure 6.1.6](ref:fig-dot-empty) and find the angle between ${\mathbf v}$ and ${\mathbf x}$.

e) 
    If two vectors are perpendicular, what can you say about their dot product? Explain your thinking.

f) 
    For what value of $k$ is the vector $\left[\begin{array}{r}6 \\ k \end{array}\right]$ perpendicular to ${\mathbf w}$?

g) 
    Sage can be used to find lengths of vectors and their dot products. For instance, if `v` and `w` are vectors, then `v.norm()` gives the length of `v` and `v * w` gives ${\mathbf v}\cdot{\mathbf w}$.

    Suppose that

    $$ {\mathbf v}=\left[\begin{array}{r}2 \\ 0 \\ 3 \\ -2 \end{array}\right], \hspace{24pt} {\mathbf w}=\left[\begin{array}{r}1 \\ -3 \\ 4 \\ 1 \end{array}\right]\text{.} $$

    Use the Sage cell below to find $\left|{\mathbf v}\right|$, $\left|{\mathbf w}\right|$, ${\mathbf v}\cdot{\mathbf w}$, and the angle between ${\mathbf v}$ and ${\mathbf w}$. You may use `arccos` to find the angle's measure expressed in radians.

    :::sage
    ```sage

    ```
    :::

ANSWER:

a) 
    > IMAGE {img:ex-6-1-1-plot} src=../../media/ch06/ex-6-1-1-plot.svg
    > width: 50%

b) 
    $\left|{\mathbf v}\right| = \sqrt{13}$ and $\left|{\mathbf w}\right| = \sqrt{10}$.

c) 
    $\theta = = 52.1^\circ.$

d) 
    $\theta = = 90^\circ.$

e) 
    Their dot product must be zero.

f) 
    $k=2$.

g) 
    $55.9^\circ$.

SOLUTION:

a) 
    > IMAGE {img:ex-6-1-1-plot} src=../../media/ch06/ex-6-1-1-plot.svg
    > width: 50%

b) 
    We find that

    $$ \begin{aligned} {\mathbf v}\cdot{\mathbf v} {}={} 13 \\ {\mathbf w}\cdot{\mathbf w} {}={} 10 \end{aligned} $$

    so that $\left|{\mathbf v}\right| = \sqrt{13}$ and $\left|{\mathbf w}\right| = \sqrt{10}$.

c) 
    ${\mathbf v}\cdot{\mathbf w} = 3$ so that

    $$ \theta = \arccos\left(\frac{{\mathbf v}\cdot{\mathbf w}}{\left|{\mathbf v}\right|\left|{\mathbf w}\right|}\right) = 52.1^\circ. $$

d) 
    ${\mathbf v}\cdot{\mathbf x} = 0$ so that

    $$ \theta = \arccos\left(\frac{{\mathbf v}\cdot{\mathbf x}}{\left|{\mathbf v}\right|\left|{\mathbf x}\right|}\right) = 90^\circ. $$

e) 
    If two vectors are perpendicular, then the angle between them is $90^\circ$. Since $\cos(90^\circ) = 0$, their dot product must be zero.

f) 
    The dot product is $-6 + 3k = 0$ so $k=2$.

g) 
    We find that $\left|{\mathbf v}\right| = \sqrt{17}$, $\left|{\mathbf w}\right| = 3\sqrt{3}$, ${\mathbf v}\cdot{\mathbf w} = 12$, and the angle between these vectors is $55.9^\circ$.

:::

As we move forward, it will be important for us to recognize when vectors are perpendicular to one another. For instance, when vectors ${\mathbf v}$ and ${\mathbf w}$ are perpendicular, the angle between them $\theta=90^\circ$ and we have

$$ {\mathbf v}\cdot{\mathbf w}=\left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta = \left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos90^\circ = 0\text{.} $$

Therefore, the dot product between perpendicular vectors must be zero. This leads to the following definition.

:::definition {def:definition-6-1-7} Definition 6.1.7
{index-entry:orthogonal} We say that vectors ${\mathbf v}$ and ${\mathbf w}$ are orthogonal if ${\mathbf v}\cdot{\mathbf w}=0$.
:::

In practical terms, two perpendicular vectors are orthogonal. However, the concept of orthogonality is somewhat more general because it allows one or both of the vectors to be the zero vector ${\mathbf 0}$.

We've now seen that the dot product gives us geometric information about vectors. It also provides a way to compare vectors. For example, consider the vectors ${\mathbf u}$, ${\mathbf v}$, and ${\mathbf w}$, shown in [Figure 6.1.8](ref:fig-similar-vectors). The vectors ${\mathbf v}$ and ${\mathbf w}$ seem somewhat similar as the directions they define are nearly the same. By comparison, ${\mathbf u}$ appears rather dissimilar to both ${\mathbf v}$ and ${\mathbf w}$. We will measure the similarity of vectors by finding the angle between them; the smaller the angle, the more similar the vectors.

> FIGURE {fig:fig-similar-vectors} number=6.1.8 src=../../media/ch06/similar-vectors.svg
> alt: Three two dimensional vectors two of which nearly point in the same direction.
> width: 50%
> caption: Which of the vectors are most similar?

:::activity {act:activity-6-1-3} Activity 6.1.3
This activity explores two further uses of the dot product beginning with the similarity of vectors.

a) 
    Our first task is to assess the similarity between various Wikipedia articles by forming vectors from each of five articles. In particular, one may download the text from a Wikipedia article, remove common words, such as “the” and “and”, count the number of times the remaining words appear in the article, and represent these counts in a vector.

    For example, evaluate the following cell that loads some special commands along with the vectors constructed from the Wikipedia articles on Veteran's Day, Memorial Day, Labor Day, the Golden Globe Awards, and the Super Bowl. For each of the five articles, you will see a list of the number of times 10 words appear in these articles. For instance, the word “act” appears 3 times in the Veteran's Day article and 0 times in the Labor Day article.

    :::sage
    ```sage
    sage.repl.load.load("https://raw.githubusercontent.com/davidaustinm/ula_modules/master/dot_similarity.py", globals())
    events.head(int(10))

    ```
    :::

    For each of the five articles, we obtain 604-dimensional vectors, which are named `veterans`, `memorial`, `labor`, `golden`, and `super`.

    1. 
        Suppose that two articles have no words in common. What is the value of the dot product between their corresponding vectors? What does this say about the angle between these vectors?

    2. 
        Suppose there are two articles on the same subject, yet one article is twice as long. What approximate relationship would you expect to hold between the two vectors? What does this say about the angle between them?

    3. 
        Use the Sage cell below to find the angle between the vector `veterans` and the other four vectors. To express the angle in degrees, use the `degrees(x)` command, which gives the number of degrees in `x` radians.

        :::sage
        ```sage

        ```
        :::

    4. 
        Compare the four angles you have found and discuss what they mean about the similarity between the Veteran's Day article and the other four. How do your findings reflect the nature of these five events?

b) 
    Vectors are often used to represent how a quantity changes over time. For instance, the vector ${\mathbf s}=\left[\begin{array}{r}78.3 \\ 81.2 \\ 82.1 \\ 79.0 \end{array}\right]$ might represent the value of a company's stock on four consecutive days. When interpreted in this way, we call the vector a *time series.* Evaluate the Sage cell below to see a representation of two time series ${\mathbf s}_1$, in blue, and ${\mathbf s}_2$, in orange, which we imagine represent the value of two stocks over a period of time. (This cell relies on some data loaded by the first cell in this activity.)

    :::sage
    ```sage
    series_plot(s1, 'blue') + series_plot(s2, 'orange')

    ```
    :::

    Even though one stock has a higher value than the other, the two appear to be related since they seem to rise and fall at roughly similar ways. We often say that they are *correlated*, and we would like to measure the degree to which they are correlated.

    1. 
        In order to compare the ways in which they rise and fall, we will first *demean* the time series; that is, for each time series, we will subtract its average value to obtain a new time series. There is a command, `demean(s)`, that returns the demeaned time series of `s`. Use the Sage cell below to demean the series ${\mathbf s}_1$ and ${\mathbf s}_2$ and plot.

        :::sage
        ```sage
        ds1 = demean(s1)
        ds2 = demean(s2)
        series_plot(ds1, 'blue') + series_plot(ds2, 'orange')

        ```
        :::

    2. 
        If the demeaned series are $\tilde{{\mathbf s}}_1$ and $\tilde{{\mathbf s}}_2$, then the correlation between ${\mathbf s}_1$ and ${\mathbf s}_2$ is defined to be

        $$ \text{corr}({\mathbf s}_1, {\mathbf s}_2) = \frac{\tilde{{\mathbf s}}_1\cdot\tilde{{\mathbf s}}_2} {\left|\tilde{{\mathbf s}}_1\right|\left|\tilde{{\mathbf s}}_2\right|}. $$

        Given the geometric interpretation of the dot product, the correlation equals the cosine of the angle between the demeaned time series, and therefore $\text{corr}({\mathbf s}_1,{\mathbf s}_2)$ is between -1 and 1.

        Find the correlation between ${\mathbf s}_1$ and ${\mathbf s}_2$.

        :::sage
        ```sage

        ```
        :::

    3. 
        Suppose that two time series are such that their demeaned time series are scalar multiples of one another, as in [Figure 6.1.9](ref:fig-correlation)

        > FIGURE {fig:fig-correlation} number=6.1.9 src=../../media/ch06/correlation-pos.svg
        > alt: Two time series that are positively correlated.
        > caption: On the left, the demeaned time series are positive scalar multiples of one another. On the right, they are negative scalar multiples.
        > subfigure src=../../media/ch06/correlation-pos.svg alt: Two time series that are positively correlated.
        > subfigure src=../../media/ch06/correlation-neg.svg alt: Two time series that are negatively correlated.

        For instance, suppose we have time series ${\mathbf t}_1$ and ${\mathbf t}_2$ whose demeaned time series $\tilde{{\mathbf t}}_1$ and $\tilde{{\mathbf t}}_2$ are positive scalar multiples of one another. What is the angle between the demeaned vectors? What does this say about the correlation $\text{corr}({\mathbf t}_1, {\mathbf t}_2)$?

    4. 
        Suppose the demeaned time series $\tilde{{\mathbf t}}_1$ and $\tilde{{\mathbf t}}_2$ are negative scalar multiples of one another, what is the angle between the demeaned vectors? What does this say about the correlation $\text{corr}({\mathbf t}_1, {\mathbf t}_2)$?

    5. 
        Use the Sage cell below to plot the time series ${\mathbf s}_1$ and ${\mathbf s}_3$ and find their correlation.

        :::sage
        ```sage
        series_plot(s1, 'blue') + series_plot(s3, 'orange')

        ```
        :::

    6. 
        Use the Sage cell below to plot the time series ${\mathbf s}_1$ and ${\mathbf s}_4$ and find their correlation.

        :::sage
        ```sage
        series_plot(s1, 'blue') + series_plot(s4, 'orange')

        ```
        :::

ANSWER:

a) 

    1. 
        They are perpendicular.

    2. 
        The angle should be close to 0.

    3. 
        The angle `veterans` makes with `memorial` is $46.4^\circ$, with `labor` is $59.2^\circ$, with `golden` is $86.2^\circ$, and with `super` is $86.4^\circ$.

    4. 
        The articles on Veteran's Day and Memorial Day are most similar.

b) 

    1. 
        The graphs are now lowered so that their averages are zero.

    2. 
        $0.98$

    3. 
        $1$

    4. 
        $-1$

    5. 
        $-0.87$

    6. 
        $-0.10$

SOLUTION:

a) 

    1. 
        If there are no words in common, then the dot product between the two vectors will be zero. This means that they are perpendicular to one another.

    2. 
        The vectors should be, at least approximately, scalar multiples of one another, which means that the angle between them is zero.

    3. 
        The angle `veterans` makes with `memorial` is $46.4^\circ$, with `labor` is $59.2^\circ$, with `golden` is $86.2^\circ$, and with `super` is $86.4^\circ$.

    4. 
        It appears that the articles on Veteran's Day and Memorial Day are most similar. This makes sense because both are U.S. national holidays that honor military service. The second most similar article is Labor Day, which is also a national holiday. The other two are quite dissimilar as they are entertainment events.

b) 

    1. 
        The graphs are now lowered so that their averages are zero.

    2. 
        The correlation is $0.98$, which is quite close to 1.

    3. 
        The angle should be zero, which means that the correlation will be $1$.

    4. 
        The angle should be $180^\circ$, which means that the correlation should be $-1$.

    5. 
        The correlation is $-0.87$.

    6. 
        The correlation is $-0.10$.

:::

## 6.1.3 $k$-means clustering

A typical problem in data science is to find some underlying patterns in a dataset. Suppose, for instance, that we have the set of 177 data points plotted in [Figure 6.1.10](ref:fig-clusters). Notice that the points are not scattered around haphazardly; instead, they seem to form clusters. Our goal here is to develop a strategy for detecting the clusters.

> FIGURE {fig:fig-clusters} number=6.1.10 src=../../media/ch06/cluster-plot.svg
> alt: A scatter plot of 177 data points.
> width: 80%
> caption: A set of 177 data points.

To see how this could be useful, suppose we have medical data describing a group of patients, some of whom have been diagnosed with a specific condition, such as diabetes. Perhaps we have a record of age, weight, blood sugar, cholesterol, and other attributes for each patient. It could be that the data points for the group diagnosed as having the condition form a cluster that is somewhat distinct from the rest of the data. Suppose that we are able to identify that cluster and that we are then presented with a new patient that has not been tested for the condition. If the attributes for that patient place them in that cluster, we might identify them as being at risk for the condition and prioritize them for appropriate screenings.

If there are many attributes for each patient, the data may be high-dimensional and not easily visualized. We would therefore like to develop an algorithm that separates the data points into clusters without human intervention. We call the result a *clustering*.

The next activity introduces a technique, called $k$-means clustering, that helps us find clusterings. To do so, we will view the data points as vectors so that the distance between two data points equals the length of the vector joining them. That is, if two points are represented by the vectors ${\mathbf v}$ and ${\mathbf w}$, then the distance between the points is $\left|{\mathbf v}-{\mathbf w}\right|$.

:::activity {act:activity-6-1-4} Activity 6.1.4
To begin, we identify the *centroid*, or the average, of a set of vectors ${\mathbf v}_1, {\mathbf v}_2, \ldots,{\mathbf v}_n$ as

$$ \frac1n\left({\mathbf v}_1+{\mathbf v}_2+\ldots+{\mathbf v}_n\right). $$

a) 
    Find the centroid of the vectors

    $$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}4 \\ 1 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}4 \\ 4 \end{array}\right]. $$

    and sketch the vectors and the centroid using [Figure 6.1.11](ref:fig-centroid-plot). You may wish to simply plot the points represented by the tips of the vectors rather than drawing the vectors themselves.

    > FIGURE {fig:fig-centroid-plot} number=6.1.11 src=../../media/ch06/empty-5-k.svg
    > alt: A coordinate grid and set of coordinate axes.
    > width: 50%
    > caption: The vectors ${\mathbf v}_1$, ${\mathbf v}_2$, ${\mathbf v}_3$ and their centroid.

    Notice that the centroid lies in the center of the points defined by the vectors.

b) 
    Now we'll illustrate an algorithm that forms clusterings. To begin, consider the following points, represented as vectors,

    $$ {\mathbf v}_1=\left[\begin{array}{r}-2 \\ 1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}1 \\ 1 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}1 \\ 2 \end{array}\right], {\mathbf v}_4=\left[\begin{array}{r}3 \\ 2 \end{array}\right], $$

    which are shown in [Figure 6.1.12](ref:fig-clustering-ex).

    > FIGURE {fig:fig-clustering-ex} number=6.1.12 src=../../media/ch06/kmeans-data.svg
    > alt: A scatter plot of four data points.
    > width: 50%
    > caption: We will group this set of four points into two clusters.

    Suppose that we would like to group these points into $k=2$ clusters. (Later on, we'll see how to choose an appropriate value for $k$, the number of clusters.) We begin by choosing two points $c_1$ and $c_2$ at random and declaring them to be the “centers”' of the two clusters.

    For example, suppose we randomly choose $c_1={\mathbf v}_2$ and $c_2={\mathbf v}_3$ as the center of two clusters. The cluster centered on $c_1={\mathbf v}_2$ will be the set of points that are closer to $c_1={\mathbf v}_2$ than to $c_2={\mathbf v}_3$. Determine which of the four data points are in this cluster, which we denote by $C_1$, and circle them in [Figure 6.1.12](ref:fig-clustering-ex).

c) 
    The second cluster will consist of the data points that are closer to $c_2={\mathbf v}_3$ than $c_1={\mathbf v}_2$. Determine which of the four points are in this cluster, which we denote by $C_2$, and circle them in [Figure 6.1.12](ref:fig-clustering-ex).

d) 
    We now have a clustering with two clusters, but we will try to improve upon it in the following way. First, find the centroids of the two clusters; that is, redefine $c_1$ to be the centroid of cluster $C_1$ and $c_2$ to be the centroid of $C_2$. Find those centroids and indicate them in [Figure 6.1.13](ref:fig-clustering-ex-2)

    > FIGURE {fig:fig-clustering-ex-2} number=6.1.13 src=../../media/ch06/kmeans-data.svg
    > alt: A scatter plot of four data points.
    > width: 50%
    > caption: Indicate the new centroids and clusters.

    Now update the cluster $C_1$ to be the set of points closer to $c_1$ than $c_2$. Update the cluster $C_2$ in a similar way and indicate the clusters in [Figure 6.1.13](ref:fig-clustering-ex-2).

e) 
    Let's perform this last step again. That is, update the centroids $c_1$ and $c_2$ from the new clusters and then update the clusters $C_1$ and $C_2$. Indicate your centroids and clusters in [Figure 6.1.14](ref:fig-clustering-ex-3).

    > FIGURE {fig:fig-clustering-ex-3} number=6.1.14 src=../../media/ch06/kmeans-data.svg
    > alt: A scatter plot of four data points.
    > width: 50%
    > caption: Indicate the new centroids and clusters.

    Notice that this last step produces the same set of clusters so there is no point in repeating it. We declare this to be our final clustering.

ANSWER:

a) 
    The centroid is $c = \left[\begin{array}{r}3 \\ 2 \end{array}\right]$.

    > IMAGE {img:k-means-6-1} src=../../media/ch06/k-means-6-1.svg
    > width: 50%

b) 
    $C_1 = \{{\mathbf v}_1, {\mathbf v}_2\}$.

c) 
    $C_2=\{{\mathbf v}_3,{\mathbf v}_4\}$.

d) 
    $c_1 = \left[\begin{array}{r}-1/2 \\ 0 \end{array}\right]$ and $c_2 = \left[\begin{array}{r}2 \\ 2 \end{array}\right]$

    $C_1 = \{{\mathbf v}_1\}$ and $C_2=\{{\mathbf v}_2, {\mathbf v}_3, {\mathbf v}_4\}$.

e) 
    $c_1 = \left[\begin{array}{r}-2 \\ 1 \end{array}\right]$ and $c_2 = \left[\begin{array}{r}5/3 \\ 5/3 \end{array}\right]$. The clusters $C_1$ and $C_2$ are unchanged.

SOLUTION:

a) 
    The centroid is $c = \left[\begin{array}{r}3 \\ 2 \end{array}\right]$.

    > IMAGE {img:k-means-6-1} src=../../media/ch06/k-means-6-1.svg
    > width: 50%

b) 
    The first cluster is $C_1 = \{{\mathbf v}_1, {\mathbf v}_2\}$.

c) 
    The second cluster is $C_2=\{{\mathbf v}_3,{\mathbf v}_4\}$.

d) 
    We redefine $c_1 = \left[\begin{array}{r}-1/2 \\ 0 \end{array}\right]$ and $c_2 = \left[\begin{array}{r}2 \\ 2 \end{array}\right]$. This leads to new clusters $C_1 = \{{\mathbf v}_1\}$ and $C_2=\{{\mathbf v}_2, {\mathbf v}_3, {\mathbf v}_4\}$.

e) 
    We have new centroids $c_1 = \left[\begin{array}{r}-2 \\ 1 \end{array}\right]$ and $c_2 = \left[\begin{array}{r}5/3 \\ 5/3 \end{array}\right]$, and the clusters $C_1$ and $C_2$ are unchanged.

:::

This activity demonstrates our algorithm for finding a clustering. We first choose a value $k$ and seek to break the data points into $k$ clusters. The algorithm proceeds in the following way:

- 
    Choose $k$ points $c_1, c_2, \ldots, c_k$ at random from our dataset.

- 
    Construct the cluster $C_1$ as the set of data points closest to $c_1$, $C_2$ as the set of data points closest to $c_2$, and so forth.

- 
    Repeat the following until the clusters no longer change:

    - 
        Find the centroids $c_1, c_2,\ldots,c_k$ of the current clusters.

    - 
        Update the clusters $C_1,C_2,\ldots,C_k$.

The clusterings we find depend on the initial random choice of points $c_1, c_2,\ldots, c_k$. For instance, in the previous activity, we arrived, with the initial choice $c_1= {\mathbf v}_2$ and $c_2={\mathbf v}_3$, at the clustering:

$$ \begin{array}{rcl} C_1 & {}={} & \{{\mathbf v}_1\} \\ C_2 & {}={} & \{{\mathbf v}_2, {\mathbf v}_3,{\mathbf v}_4\}. \end{array} $$

If we instead choose the initial points to be $c_1 = {\mathbf v}_3$ and $c_2={\mathbf v}_4$, we eventually find the clustering:

$$ \begin{array}{rcl} C_1 & {}={} & \{{\mathbf v}_1, {\mathbf v}_2, {\mathbf v}_3\} \\ C_2 & {}={} & \{{\mathbf v}_4\}. \end{array} $$

Is there a way that we can determine which clustering is the better of the two? It seems like a better clustering will be one for which the points in a cluster are, on average, closer to the centroid of their cluster. If we have a clustering, we therefore define a function, called the *objective*, which measures the average of the square of the distance from each point to the centroid of the cluster to which that point belongs. A clustering with a smaller objective will have clusters more tightly centered around their centroids, which should result in a better clustering.

For example, when we obtain the clustering:

$$ \begin{array}{rcl} C_1 & {}={} & \{{\mathbf v}_1, {\mathbf v}_2, {\mathbf v}_3\} \\ C_2 & {}={} & \{{\mathbf v}_4\}. \end{array} $$

with centroids $c_1=\left[\begin{array}{c}0 \\ 4/3 \end{array}\right]$ and $c_2={\mathbf v}_4=\left[\begin{array}{r}3 \\ 2 \end{array}\right]$, we find the objective to be

$$ \frac14\left( \left|{\mathbf v}_1-c_1\right|^2 + \left|{\mathbf v}_2-c_1\right|^2 + \left|{\mathbf v}_3-c_1\right|^2 + \left|{\mathbf v}_4-c_2\right|^2 \right) = \frac 53. $$

:::activity {act:activity-6-1-5} Activity 6.1.5
We'll now use the objective to compare clusterings and to choose an appropriate value of $k$.

a) 
    In the previous activity, one initial choice of $c_1$ and $c_2$ led to the clustering:

    $$ \begin{array}{rcl} C_1 & {}={} & \{{\mathbf v}_1\} \\ C_2 & {}={} & \{{\mathbf v}_2, {\mathbf v}_3,{\mathbf v}_4\} \end{array} $$

    with centroids $c_1={\mathbf v}_1$ and $c_2=\left[\begin{array}{r}5/3 \\ 5/3 \end{array}\right]$. Find the objective of this clustering.

b) 
    We have now seen two clusterings and computed their objectives. Recall that our dataset is shown in [Figure 6.1.12](ref:fig-clustering-ex). Which of the two clusterings feels like the better fit? How is this fit reflected in the values of the objectives?

c) 
    Evaluating the following cell will load and display a dataset consisting of 177 data points. This dataset has the name `data`.

    :::sage
    ```sage
    sage.repl.load.load("https://raw.githubusercontent.com/davidaustinm/ula_modules/master/k_means.py", globals())
    list_plot(data, color='blue', size=20, aspect_ratio=1)

    ```
    :::

    Given this plot of the data, what would seem like a reasonable number of clusters?

d) 
    In the following cell, you may choose a value of $k$ and then run the algorithm to determine and display a clustering and its objective. If you run the algorithm a few times with the same value of $k$, you will likely see different clusterings having different objectives. This is natural since our algorithm starts by making a random choice of points $c_1,c_2,\ldots,c_k$, and a different choices may lead to different clusterings. Choose a value of $k$ and run the algorithm a few times. Notice that clusterings having lower objectives seem to fit the data better. Repeat this experiment with a few different values of $k$.

    :::sage
    ```sage
    k = 2  # you may change the value of k here
    clusters, centroids, objective = kmeans(data, k)
    print('Objective =', objective)
    plotclusters(clusters, centroids)

    ```
    :::

e) 
    For a given value of $k$, our strategy is to run the algorithm several times and choose the clustering with the smallest objective. After choosing a value of $k$, the following cell will run the algorithm 10 times and display the clustering having the smallest objective.

    :::sage
    ```sage
    k = 2  # you may change the value of k here
    clusters, centroids, objective = minimalobjective(data, k)
    print('Objective =', objective)
    plotclusters(clusters, centroids)

    ```
    :::

    For each value of $k$ between 2 and 9, find the clustering having the smallest objective and plot your findings in [Figure 6.1.15](ref:fig-clustering-elbow).

    > FIGURE {fig:fig-clustering-elbow} number=6.1.15 src=../../media/ch06/clustering-elbow.svg
    > alt: A horizontal axis labelled k and a vertical axis labelled Objective.
    > width: 80%
    > caption: Construct a plot of the minimal objective as it depends on the choice of $k$.

    This plot is called an *elbow plot* due to its shape. Notice how the objective decreases sharply when $k$ is small and then flattens out. This leads to a location, called the elbow, where the objective transitions from being sharply decreasing to relatively flat. This means that increasing $k$ beyond the elbow does not significantly decrease the objective, which makes the elbow a good choice for $k$.

    Where does the elbow occur in your plot above? How does this compare to the best value of $k$ that you estimated by simply looking at the data in [Item c](ref:li-guess-clusters).

Of course, we could increase $k$ until each data point is its own cluster. However, this defeats the point of the technique, which is to group together nearby data points in the hope that they share common features, thus providing insight into the structure of the data.
ANSWER:

a) 
    The objective is $5/6$.

b) 
    The clustering $C_1=\{{\mathbf v}_1\}$ and $C_2 = \{{\mathbf v}_2, {\mathbf v}_3, {\mathbf v}_4\}$ has a smaller objective.

c) 
    $k=6$ or $k=7$.

d) 
    With a fixed value of $k$, running the algorithm several times leads to different clusterings with different objectives. If we increase $k$, the objective generally decreases.

e) 
    The elbow occurs around $k=6$ or $k=7$.

    > IMAGE {img:clustering-elbow-plot} src=../../media/ch06/clustering-elbow-plot.svg
    > width: 90%

SOLUTION:

a) 
    The objective is

    $$ \frac14\left(\left|({\mathbf v}_1 - c_1)\right|^2 + \left|({\mathbf v}_2 - c_2)\right|^2 + \left|({\mathbf v}_3 - c_2)\right|^2 + \left|({\mathbf v}_4 - c_2)\right|^2\right) = \frac56\text{.} $$

b) 
    The clustering with $C_1=\{{\mathbf v}_1\}$ and $C_2 = \{{\mathbf v}_2, {\mathbf v}_3, {\mathbf v}_4\}$ appears to be a tighter clustering and has a smaller objective.

c) 
    It appears that the best clustering is either $k=6$ or $k=7$.

d) 
    With a fixed value of $k$, running the algorithm several times leads to different clusterings with different objectives. If we increase $k$, the objective generally decreases.

e) 
    The elbow occurs around $k=6$ or $k=7$, which are the values that we felt led to the best clusterings.

    > IMAGE {img:clustering-elbow-plot} src=../../media/ch06/clustering-elbow-plot.svg
    > width: 90%

:::

We have now seen how our algorithm and the objective identify a reasonable value for $k$, the number of the clusters, and produce a good clustering having $k$ clusters. Notice that we don't claim to have found the best clustering as the true test of any clustering will be in how it helps us understand the dataset and helps us make predictions about any new data that we may encounter.

## 6.1.4 Summary

This section introduced the dot product and the ability to investigate geometric relationships between vectors.

- 
    The dot product of two vectors ${\mathbf v}$ and ${\mathbf w}$ satisfies these properties:

    $$ \begin{array}{rcl} {\mathbf v}\cdot{\mathbf v} & {}={} & \left|{\mathbf v}\right|^2 \\ {\mathbf v}\cdot{\mathbf w} & {}={} & \left|{\mathbf v}\right|\left|{\mathbf w}\right|\cos\theta \\ \end{array} $$

    where $\theta$ is the angle between ${\mathbf v}$ and ${\mathbf w}$.

- 
    The vectors ${\mathbf v}$ and ${\mathbf w}$ are orthogonal when ${\mathbf v}\cdot{\mathbf w}= 0$.

- 
    We explored some applications of the dot product to the similarity of vectors, correlation of time series, and $k$-means clustering.

## 6.1.5 Exercises

:::exercise {exercise-6-1-001} number=6.1.1 answered=yes src=src/exercises/exercises6-1.xml:5
PROBLEM:
Consider the vectors

$$ {\mathbf v}=\left[\begin{array}{r}2 \\ 0 \\ 3 \\ -2 \end{array}\right], \hspace{24pt} {\mathbf w}=\left[\begin{array}{r}1 \\ -3 \\ 4 \\ 1 \end{array}\right]. $$

a) 
    Find the lengths of the vectors, $\left|{\mathbf v}\right|$ and $\left|{\mathbf w}\right|$.

b) 
    Find the dot product ${\mathbf v}\cdot{\mathbf w}$ and use it to find the angle $\theta$ between ${\mathbf v}$ and ${\mathbf w}$.

ANSWER:

a) 
    ${\mathbf v}\cdot{\mathbf v}=17$, ${\mathbf w}\cdot{\mathbf w} = 27$, $\left|{\mathbf v}\right| = \sqrt{17}$, and $\left|{\mathbf w}\right| = 3\sqrt{3}$.

b) 
    ${\mathbf v}\cdot{\mathbf w}=12$ and $\theta = 55.9^\circ$.

SOLUTION:

a) 
    We have ${\mathbf v}\cdot{\mathbf v}=17$ and ${\mathbf w}\cdot{\mathbf w} = 27$ so that $\left|{\mathbf v}\right| = \sqrt{17}$ and $\left|{\mathbf w}\right| = 3\sqrt{3}$.

b) 
    Since ${\mathbf v}\cdot{\mathbf w}=12$, we find that $\theta = \arccos(4/(\sqrt{17}\sqrt{3})) = 55.9^\circ$.

:::

:::exercise {exercise-6-1-002} number=6.1.2 answered=yes src=src/exercises/exercises6-1.xml:74
PROBLEM:
Consider the three vectors

$$ {\mathbf u} = \left[\begin{array}{r}1 \\ -2 \\ 2 \end{array}\right], \hspace{24pt} {\mathbf v} = \left[\begin{array}{r}1 \\ 1 \\ 1 \end{array}\right], \hspace{24pt} {\mathbf w} = \left[\begin{array}{r}0 \\ 2 \\ -1 \end{array}\right]. $$

a) 
    Find the dot products ${\mathbf u}\cdot{\mathbf u}$, ${\mathbf u}\cdot{\mathbf v}$, and ${\mathbf u}\cdot{\mathbf w}$.

b) 
    Use the dot products you just found to evaluate:

    1. 
        $\left|{\mathbf u}\right|$.

    2. 
        $(-5{\mathbf u})\cdot{\mathbf v}$.

    3. 
        ${\mathbf u}\cdot(-3{\mathbf v}+2{\mathbf w})$.

    4. 
        $\left|\frac1{\left|{\mathbf u}\right|} {\mathbf u}\right|$.

c) 
    For what value of $k$ is ${\mathbf u}$ orthogonal to $k{\mathbf v}+5{\mathbf w}$?

ANSWER:

a) 
    ${\mathbf u}\cdot{\mathbf u}=9$, ${\mathbf u}\cdot{\mathbf v}=1$, and ${\mathbf u}\cdot{\mathbf w}=-6$.

b) 

    1. 
        $3$

    2. 
        $-5$

    3. 
        $-15$

    4. 
        $\left[\begin{array}{r}1/3 \\ -2/3 \\ 2/3 \end{array}\right]$

SOLUTION:

a) 
    ${\mathbf u}\cdot{\mathbf u}=9$, ${\mathbf u}\cdot{\mathbf v}=1$, and ${\mathbf u}\cdot{\mathbf w}=-6$.

b) 

    1. 
        $\left|{\mathbf u}\right| = \sqrt{{\mathbf u}\cdot{\mathbf u}} = 3$

    2. 
        $(-5{\mathbf u})\cdot{\mathbf v} = -5(1) = -5$

    3. 
        ${\mathbf u}\cdot(-3{\mathbf v}+2{\mathbf w}) = -3(1) + 2(-6) = -15$

    4. 
        $\frac1{\left|{\mathbf u}\right|} = \left[\begin{array}{r}1/3 \\ -2/3 \\ 2/3 \end{array}\right]$

:::

:::exercise {exercise-6-1-003} number=6.1.3 answered=yes src=src/exercises/exercises6-1.xml:213
PROBLEM:
Suppose that ${\mathbf v}$ and ${\mathbf w}$ are vectors where

$$ {\mathbf v}\cdot{\mathbf v} = 4, \hspace{24pt} {\mathbf w}\cdot{\mathbf w} = 20,\hspace{24pt} {\mathbf v}\cdot{\mathbf w}=8. $$

a) 
    What is $\left|{\mathbf v}\right|$?

b) 
    What is the angle between ${\mathbf v}$ and ${\mathbf w}$?

c) 
    Suppose that $t$ is a scalar. Find the value of $t$ for which ${\mathbf v}$ is orthogonal to ${\mathbf w}+t{\mathbf v}$?

ANSWER:

a) 
    $2$

b) 
    $\theta = 26.6^\circ$

c) 
    $t=-2$.

SOLUTION:

a) 
    $\left|{\mathbf v}\right| = \sqrt{{\mathbf v}\cdot{\mathbf v}} = 2$

b) 
    $\theta = \arccos\left(\frac{{\mathbf v}\cdot{\mathbf w}}{\left|{\mathbf v}\right|\left|{\mathbf w}\right|}\right) = 26.6^\circ$

c) 
    $({\mathbf w}+t{\mathbf v})\cdot{\mathbf v} = 8 + 4t = 0$ so $t=-2$.

:::

:::exercise {exercise-6-1-004} number=6.1.4 answered=yes src=src/exercises/exercises6-1.xml:293
PROBLEM:
Suppose that ${\mathbf v}=3{\mathbf w}$.

a) 
    What is the relationship between ${\mathbf v}\cdot{\mathbf v}$ and ${\mathbf w}\cdot{\mathbf w}$?

b) 
    What is the relationship between $\left|{\mathbf v}\right|$ and $\left|{\mathbf w}\right|$?

c) 
    If ${\mathbf v}=s{\mathbf w}$ for some scalar $s$, what is the relationship between ${\mathbf v}\cdot{\mathbf v}$ and ${\mathbf w}\cdot{\mathbf w}$? What is the relationship between $\left|{\mathbf v}\right|$ and $\left|{\mathbf w}\right|$?

d) 
    Suppose that ${\mathbf v}=\left[\begin{array}{r}3 \\ -2 \\ 2 \end{array}\right]$. Find a scalar $s$ so that $s{\mathbf v}$ has length 1.

ANSWER:

a) 
    ${\mathbf v}\cdot{\mathbf v} = 9{\mathbf w}\cdot{\mathbf w}$

b) 
    $\left|{\mathbf v}\right| = 3\left|{\mathbf w}\right|$

c) 
    $\left|{\mathbf v}\right| = |s|\left|{\mathbf w}\right|$

d) 
    $s=1/\sqrt{17}$

SOLUTION:

a) 
    ${\mathbf v}\cdot{\mathbf v} = (3{\mathbf w})\cdot(3{\mathbf w}) = 9{\mathbf w}\cdot{\mathbf w}$

b) 
    $\left|{\mathbf v}\right| = \sqrt{{\mathbf v}\cdot{\mathbf v}} = 3\sqrt{{\mathbf w}\cdot{\mathbf w}} = 3\left|{\mathbf w}\right|$

c) 
    ${\mathbf v}\cdot{\mathbf v} = s^2{\mathbf w}\cdot{\mathbf w}$ so that $\left|{\mathbf v}\right| = |s|\left|{\mathbf w}\right|$

d) 
    We know $\left|s{\mathbf v}\right| = s\left|{\mathbf v}\right| = s\sqrt{17} = 1$ so $s=1/\sqrt{17}$

:::

:::exercise {exercise-6-1-005} number=6.1.5 answered=yes src=src/exercises/exercises6-1.xml:391
PROBLEM:
Given vectors ${\mathbf v}$ and ${\mathbf w}$, explain why

$$ \left|{\mathbf v}+{\mathbf w}\right|^2 + \left|{\mathbf v}-{\mathbf w}\right|^2 = 2\left|{\mathbf v}\right|^2 + 2\left|{\mathbf w}\right|^2. $$

Sketch two vectors ${\mathbf v}$ and ${\mathbf w}$ and explain why this fact is called the *parallelogram law*.
ANSWER:
Use the relationship $\left|{\mathbf u}\right|^2 = {\mathbf u}\cdot{\mathbf u}$.
> IMAGE {img:parallelogram-law} src=../../media/ch06/parallelogram-law.svg
> width: 50%
SOLUTION:

$$ \begin{aligned} \left|{\mathbf v}+{\mathbf w}\right|^2 + \left|{\mathbf v}-{\mathbf w}\right|^2 {}={} & ({\mathbf v}+{\mathbf w})\cdot({\mathbf v}+{\mathbf w}) + ({\mathbf v}-{\mathbf w})\cdot({\mathbf v}-{\mathbf w}) \\ {}={} & {\mathbf v}\cdot{\mathbf v}+2{\mathbf v}\cdot{\mathbf w} + {\mathbf w}\cdot{\mathbf w} + {\mathbf v}\cdot{\mathbf v}-2{\mathbf v}\cdot{\mathbf w} + {\mathbf w}\cdot{\mathbf w} \\ {}={} & 2{\mathbf v}\cdot{\mathbf v} + 2{\mathbf w}\cdot{\mathbf w} \\ {}={} & 2\left|{\mathbf v}\right|^2 + 2\left|{\mathbf w}\right|^2 \end{aligned} $$

> IMAGE {img:parallelogram-law} src=../../media/ch06/parallelogram-law.svg
> width: 50%
:::

:::exercise {exercise-6-1-006} number=6.1.6 answered=yes src=src/exercises/exercises6-1.xml:445
PROBLEM:
Consider the vectors

$$ {\mathbf v}_1=\left[\begin{array}{r}2 \\ 0 \\ 4 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}-1 \\ 2 \\ -4 \end{array}\right]. $$

and a general vector ${\mathbf x}=\left[\begin{array}{r}x \\ y \\ z \end{array}\right]$.

a) 
    Write an equation in terms of $x$, $y$, and $z$ that describes all the vectors ${\mathbf x}$ orthogonal to ${\mathbf v}_1$.

b) 
    Write a linear system that describes all the vectors ${\mathbf x}$ orthogonal to both ${\mathbf v}_1$ and ${\mathbf v}_2$.

c) 
    Write the solution set to this linear system in parametric form. What type of geometric object does this solution set represent? Indicate with a rough sketch why this makes sense.

d) 
    Give a parametric description of all vectors orthogonal to ${\mathbf v}_1$. What type of geometric object does this represent? Indicate with a rough sketch why this makes sense.

ANSWER:

a) 
    $2x + 4z = 0$

b) 

    $$ \begin{aligned} 2x + 4z {}={} 0 \\ -x+2y-4z {}={} 0 \end{aligned} $$

c) 
    ${\mathbf x} = x_3\left[\begin{array}{r}-2 \\ 1 \\ 1 \end{array}\right]$

d) 
    ${\mathbf x} = x_2\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right] + x_3\left[\begin{array}{r}-2 \\ 0 \\ 1 \end{array}\right]$

SOLUTION:

a) 
    ${\mathbf v}\cdot{\mathbf x} = 2x + 4z = 0$

b) 

    $$ \begin{aligned} 2x + 4z {}={} 0 \\ -x+2y-4z {}={} 0 \end{aligned} $$

c) 
    ${\mathbf x} = x_3\left[\begin{array}{r}-2 \\ 1 \\ 1 \end{array}\right]$, which describes a line

d) 
    ${\mathbf x} = x_2\left[\begin{array}{r}0 \\ 1 \\ 0 \end{array}\right] + x_3\left[\begin{array}{r}-2 \\ 0 \\ 1 \end{array}\right]$, which describes a plane.

:::

:::exercise {exercise-6-1-007} number=6.1.7 answered=yes src=src/exercises/exercises6-1.xml:560
PROBLEM:
Explain your responses to these questions.

a) 
    Suppose that ${\mathbf v}$ is orthogonal to both ${\mathbf w}_1$ and ${\mathbf w}_2$. Can you guarantee that ${\mathbf v}$ is also orthogonal to any linear combination $c_1{\mathbf w}_1+c_2{\mathbf w}_2$?

b) 
    Suppose that ${\mathbf v}$ is orthogonal to itself. What can you say about ${\mathbf v}$?

ANSWER:

a) 
    Yes

b) 
    ${\mathbf v}={\mathbf 0}$

SOLUTION:

a) 
    Yes, because ${\mathbf v}\cdot(c_1{\mathbf w}_1+c_2{\mathbf w}_2) = c_1{\mathbf v}\cdot{\mathbf w}_1 + c_2{\mathbf v}\cdot{\mathbf w}_2 = 0$

b) 
    ${\mathbf v}\cdot{\mathbf v} = \left|{\mathbf v}\right|^2 = 0$ so ${\mathbf v}={\mathbf 0}$

:::

:::exercise {exercise-6-1-008} number=6.1.8 answered=yes src=src/exercises/exercises6-1.xml:618
PROBLEM:
Suppose that ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ form a basis for ${\mathbb R}^3$ and that each vector is orthogonal to the other two. Suppose also that ${\mathbf v}$ is another vector in ${\mathbb R}^3$.

a) 
    Explain why ${\mathbf v}=c_1{\mathbf v}_1+c_2{\mathbf v}_2+c_3{\mathbf v}_3$ for some scalars $c_1$, $c_2$, and $c_3$.

b) 
    Beginning with the expression

    $$ {\mathbf v}\cdot{\mathbf v}_1 = (c_1{\mathbf v}_1+c_2{\mathbf v}_2+c_3{\mathbf v}_3)\cdot{\mathbf v}_1, $$

    apply the distributive property of dot products to explain why

    $$ c_1=\frac{{\mathbf v}\cdot{\mathbf v}_1}{{\mathbf v}_1\cdot{\mathbf v}_1}. $$

    Find similar expressions for $c_2$ and $c_3$.

c) 
    Verify that

    $$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 2 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_2=\left[\begin{array}{r}1 \\ -1 \\ 1 \end{array}\right],\hspace{24pt} {\mathbf v}_3=\left[\begin{array}{r}1 \\ 0 \\ -1 \end{array}\right] $$

    form a basis for ${\mathbb R}^3$ and that each vector is orthogonal to the other two. Use what you've discovered in this problem to write the vector ${\mathbf v}=\left[\begin{array}{r}3 \\ 5 \\ -1 \end{array}\right]$ as a linear combination of ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$.

ANSWER:

a) 
    Since ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ form a basis for ${\mathbb R}^3$, any vector in ${\mathbb R}^3$ can be written as a linear combination of them.

b) 
    Apply the distributive property.

    $c_2 = \frac{{\mathbf v}\cdot{\mathbf v}_2}{{\mathbf v}_2\cdot{\mathbf v}_2}$ and $c_3 = \frac{{\mathbf v}\cdot{\mathbf v}_3}{{\mathbf v}_3\cdot{\mathbf v}_3}$

c) 
    ${\mathbf v} = 2{\mathbf v}_1 - {\mathbf v}_2 + 2{\mathbf v}_3$

SOLUTION:

a) 
    Since ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ form a basis for ${\mathbb R}^3$, any vector in ${\mathbb R}^3$ can be written as a linear combination of them.

b) 
    ${\mathbf v}\cdot{\mathbf v}_1 = c_1{\mathbf v}_1\cdot{\mathbf v}_1$ so that $c_1 = \frac{{\mathbf v}\cdot{\mathbf v}_1}{{\mathbf v}_1\cdot{\mathbf v}_1}$.

    In the same way, $c_2 = \frac{{\mathbf v}\cdot{\mathbf v}_2}{{\mathbf v}_2\cdot{\mathbf v}_2}$ and $c_3 = \frac{{\mathbf v}\cdot{\mathbf v}_3}{{\mathbf v}_3\cdot{\mathbf v}_3}$

c) 
    Check that the vectors are orthogonal by computing their dot products. Then ${\mathbf v} = 2{\mathbf v}_1 - {\mathbf v}_2 + 2{\mathbf v}_3$ by computing the ratios of dot products.

:::

:::exercise {exercise-6-1-009} number=6.1.9 answered=yes src=src/exercises/exercises6-1.xml:739
PROBLEM:
Suppose that ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_3$ are three nonzero vectors that are pairwise orthogonal; that is, each vector is orthogonal to the other two.

a) 
    Explain why ${\mathbf v}_3$ cannot be a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$.

b) 
    Explain why this set of three vectors is linearly independent.

ANSWER:

a) 
    If ${\mathbf v}_3 = c_1{\mathbf v}_1 + c_2{\mathbf v}_2$, then $c_1=0$ and $c_2=0$.

b) 
    None of the vectors is a linear combination of the others.

SOLUTION:

a) 
    If ${\mathbf v}_3 = c_1{\mathbf v}_1 + c_2{\mathbf v}_2$, then $c_1 = \frac{{\mathbf v}_3\cdot{\mathbf v}_1}{{\mathbf v}_1\cdot{\mathbf v}_2} = 0$. In the same way, $c_2=0$ so ${\mathbf v}_3$ must be the zero vector. We're told, however, that ${\mathbf v}_3$ is nonzero.

b) 
    We've seen that ${\mathbf v}_3$ is not a linear combination of ${\mathbf v}_1$ and ${\mathbf v}_2$. The same thinking shows that none of the vectors is a linear combination of the others so they form a linearly independent set.

:::

:::exercise {exercise-6-1-010} number=6.1.10 answered=yes src=src/exercises/exercises6-1.xml:807
PROBLEM:
In the next chapter, we will consider certain $n\times n$ matrices $A$ and define a function

$$ q({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x}), $$

where ${\mathbf x}$ is a vector in ${\mathbb R}^n$.

a) 
    Suppose that $A=\begin{bmatrix} 1 & 2 \\ 2 & 1 \\ \end{bmatrix}$ and ${\mathbf x}=\left[\begin{array}{r}2 \\ 1 \end{array}\right]$. Evaluate $q({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x})$.

b) 
    For a general vector ${\mathbf x}=\left[\begin{array}{r}x \\ y \end{array}\right]$, evaluate $q({\mathbf x}) = {\mathbf x}\cdot(A{\mathbf x})$ as an expression involving $x$ and $y$.

c) 
    Suppose that ${\mathbf v}$ is an eigenvector of a matrix $A$ with associated eigenvalue $\lambda$ and that ${\mathbf v}$ has length 1. What is the value of the function $q({\mathbf v})$?

ANSWER:

a) 
    $q({\mathbf x}) = 13$

b) 
    $q({\mathbf x}) = x^2 + 4xy + y^2$

c) 
    $q({\mathbf v}) = \lambda$

SOLUTION:

a) 
    $q({\mathbf x}) = 13$

b) 
    $q({\mathbf x}) = x^2 + 4xy + y^2$

c) 
    $q({\mathbf v}) = {\mathbf v}\cdot(A{\mathbf v}) = \lambda{\mathbf v}\cdot{\mathbf v} = \lambda$.

:::

:::exercise {exercise-6-1-011} number=6.1.11 answered=yes src=src/exercises/exercises6-1.xml:890
PROBLEM:
Back in [Section 1.1](ref:1.1#sec-expect), we saw that equations of the form $Ax+By = C$ represent lines in the plane. In this exercise, we will see how this expression arises geometrically.
> FIGURE {fig:fig-ex-eq-line} number=6.1.16 src=../../media/ch06/ex-eq-line.svg
> alt: A line with three vectors used to develop an equation of the line.
> width: 50%
> caption: A line, a point ${\mathbf p}$ on the line, and a vector ${\mathbf n}$ perpendicular to the line.

a) 
    Find the slope and vertical intercept of the line shown in [Figure 6.1.16](ref:fig-ex-eq-line). Then write an equation for the line in the form $y=mx+b$.

b) 
    Suppose that ${\mathbf p}$ is a point on the line, that ${\mathbf n}$ is a vector perpendicular to the line, and that ${\mathbf x}=\left[\begin{array}{r}x \\ y \end{array}\right]$ is a general point on the line. Sketch the vector ${\mathbf x}-{\mathbf p}$ and describe the angle between this vector and the vector ${\mathbf n}$.

c) 
    What is the value of the dot product ${\mathbf n}\cdot({\mathbf x} - {\mathbf p})$?

d) 
    Explain why the equation of the line can be written in the form ${\mathbf n}\cdot{\mathbf x} = {\mathbf n}\cdot{\mathbf p}$.

e) 
    Identify the vectors ${\mathbf p}$ and ${\mathbf n}$ for the line illustrated in [Figure 6.1.16](ref:fig-ex-eq-line) and use them to write the equation of the line in terms of $x$ and $y$. Verify that this expression is algebraically equivalent to the equation $y=mx+b$ that you earlier found for this line.

f) 
    Explain why any line in the plane can be described by an equation having the form $Ax+By = C$. What is the significance of the vector $\left[\begin{array}{r}A \\ B \end{array}\right]$?

ANSWER:

a) 
    $y=3-x/2$.

b) 
    ${\mathbf x}-{\mathbf p}$ is orthogonal to ${\mathbf n}$.

c) 
    $0$

d) 
    Apply the distributive property

e) 
    $x+2y = 6$

f) 
    ${\mathbf n}=\left[\begin{array}{r}A \\ B \end{array}\right]$ is perpendicular to the line.

SOLUTION:

a) 
    The slope $m=-1/2$ and the intercept $b=3$ so $y=3-x/2$.

b) 
    The vector ${\mathbf x}-{\mathbf p}$ is in the direction of the line so it is orthogonal to ${\mathbf n}$.

c) 
    Since these vectors are orthogonal, their dot product is $0$.

d) 
    Since ${\mathbf n}\cdot({\mathbf x}-{\mathbf p}) = 0$, we have ${\mathbf n}\cdot{\mathbf x} - {\mathbf n}\cdot{\mathbf p} = 0$, which implies that ${\mathbf n}\cdot{\mathbf x} = {\mathbf n}\cdot{\mathbf p}$.

e) 
    ${\mathbf p}=\left[\begin{array}{r}2 \\ 2 \end{array}\right]$ and ${\mathbf n}=\left[\begin{array}{r}1 \\ 2 \end{array}\right]$. This gives $x+2y = 6$. We can rearrange this to have the form $y=3-x/2$.

f) 
    If we choose a vector ${\mathbf n}=\left[\begin{array}{r}A \\ B \end{array}\right]$ that is perpendicular to the line and a point ${\mathbf p}$ on the line, we have ${\mathbf n}\cdot{\mathbf x} = Ax + By = {\mathbf n}\cdot{\mathbf p} = C$.

:::
