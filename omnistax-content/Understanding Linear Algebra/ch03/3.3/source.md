# 3.3 Image compression {sec-jpeg}

The concepts we have seen in the past few sections arise in image processing and are used on a daily basis without us necessarily being aware. This section introduces the JPEG compression algorithm and discrete Fourier transform as applications of these ideas. In addition to demonstrating the power of linear algebraic thinking, these applications help make some of the abstract concepts we have developed more concrete and natural.

## 3.3.1 Introduction

Digital images, such as the photographs taken on your phone, are displayed as a rectangular array of pixels. For example, the photograph in [Figure 3.3.1](ref:fig-jpeg-orig) is 1440 pixels wide and 1468 pixels high. If we were to zoom in on the photograph, we would be able to see individual pixels, such as those shown on the right.

> FIGURE {fig:fig-jpeg-orig} number=3.3.1 src=../../media/ch03/spring-canyon-cropped.jpg
> alt: A photograph of a red rock canyon wall against a blue sky.
> caption: An image stored as a $1440\times1468$ array of pixels along with a close-up of a smaller $8\times8$ array.
> subfigure src=../../media/ch03/spring-canyon-cropped.jpg alt: A photograph of a red rock canyon wall against a blue sky.
> subfigure src=../../media/ch03/jpeg-orig-block.svg alt: An eight by eight block of pixels from the photograph of the desert scene.

A lot of data is required to display this image. A quantity of digital data is frequently measured in bytes, where one byte is the amount of storage needed to record an integer between 0 and 255. As we will see shortly, each pixel requires three bytes to record that pixel's color. This means the amount of data required to display this image is $3\times1440\times1468 = 6,341,760$ bytes or about 6.3 megabytes.

Of course, we would like to store this image on a phone or computer and perhaps transmit it through our data plan to share it with others. If possible, we would like to find a way to represent this image using a smaller amount of data so that we don't run out of memory on our phone and quickly exhaust our data plan.

As we will see in this section, the JPEG compression algorithm provides a means for doing just that. This image, when stored in the JPEG format, requires only 467,359 bytes of data, which is about 7% of the 6.3 megabytes required to display the image. That is, when we display this image, we are reconstructing it from only 7% of the original data. This isn't too surprising since there is quite a bit of redundancy in the image; the left half of the image is almost uniformly blue. The JPEG algorithm detects this redundancy by representing the data using bases that are well-suited to the task.

:::exploration {act:preview-3-3-1} Preview Activity 3.3.1
Since we will be using various bases and the coordinate systems they define, let's review how to translate between coordinate systems.
PROBLEM:
a) Suppose that we have a basis ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2,\ldots,{\mathbf v}_m\}$ for ${\mathbb R}^m$. Explain what we mean by the representation $\left\{{\mathbf x}\right\}_{{\cal B}}$ of a vector ${\mathbf x}$ in the coordinate system defined by ${\cal B}$.
b) If we are given the representation $\left\{{\mathbf x}\right\}_{{\cal B}}$, how can we recover the vector ${\mathbf x}$?
c) If we are given the vector ${\mathbf x}$, how can we find $\left\{{\mathbf x}\right\}_{{\cal B}}$?
d) Suppose that

    $$ {\cal B}=\left\{\left[\begin{array}{r}1 \\ 3 \end{array}\right],\left[\begin{array}{r}1 \\ 1 \end{array}\right]\right\} $$

    is a basis for ${\mathbb R}^2$. If $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}1 \\ -2 \end{array}\right]$, find the vector ${\mathbf x}$.
    :::sage
    ```sage

    ```
    :::
e) If ${\mathbf x}=\left[\begin{array}{r}2 \\ -4 \end{array}\right]$, find $\left\{{\mathbf x}\right\}_{{\cal B}}$.
SOLUTION:
a) The components of the vector $\left\{{\mathbf x}\right\}_{{\cal B}}$ are the weights that express ${\mathbf x}$ as a linear combination of the basis vectors; that is, $\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{c}c_1 \\ c_2 \\ \vdots \\ c_m \end{array}\right]$ if ${\mathbf x}=c_1{\mathbf v}_1+c_2{\mathbf v}_2+\ldots+c_m{\mathbf v}_m$.
b) If we form the matrix $P_{{\cal B}} = \left[\begin{array}{rrrr} {\mathbf v}_1 & {\mathbf v}_2 & \ldots & {\mathbf v}_m \end{array}\right]$, then ${\mathbf x}=P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}}$.
c) As before, $\left\{{\mathbf x}\right\}_{{\cal B}}=P_{{\cal B}}^{-1}{\mathbf x}$.
d) We find ${\mathbf x}=P_{{\cal B}}\left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{r}-1 \\ 1 \end{array}\right]$.
e) We find $\left\{{\mathbf x}\right\}_{{\cal B}}=P_{{\cal B}}^{-1}{\mathbf x} = \left[\begin{array}{r}-3 \\ 5 \end{array}\right]$.
:::

## 3.3.2 Color models

A color is represented digitally by a vector in ${\mathbb R}^3$. There are different ways in which we can represent colors, however, depending on whether a computer or a human will be processing the color. We will describe two of these representations, called *color models*, and demonstrate how they are used in the JPEG compression algorithm.

Digital displays typically create colors by blending together various amounts of red, green, and blue. We can therefore describe a color by putting its constituent amounts of red, green, and blue into a vector $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]$. The quantities $R$, $G$, and $B$ are each stored with one byte of information so they are integers between 0 and 255. This is called the $RGB$ color model. {index-entry:$RGB$ color model}

We define a basis ${\cal B}=\{{\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3\}$ where

$$ {\mathbf v}_1 =\left[\begin{array}{c} 1 \\ 1 \\ 1 \end{array}\right],~~~ {\mathbf v}_2 =\left[\begin{array}{c} 0 \\ -0.34413 \\ 1.77200 \end{array}\right],~~~ {\mathbf v}_3 =\left[\begin{array}{c} 1.40200 \\ -0.71414 \\ 0 \end{array}\right] $$

to define a new coordinate system with coordinates we denote $Y$, $C_b$, and $C_r$:

$$ \left\{\left[\begin{array}{r}R \\ G \\ B \end{array}\right]\right\}_{{\cal B}} = \left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right] $$

. {index-entry:luminance} {index-entry:chrominance} The coordinate $Y$ is called *luminance* while $C_b$ and $C_r$ are called blue and red *chrominance*, respectively. In this coordinate system, luminance will vary from 0 to 255, while the chrominances vary between -127.5 and 127.5. This is known as the $YC_bC_r$ color model. (To be completely accurate, we should add 127.5 to the chrominance values so that they lie between 0 and 255, but we won't worry about that here.) {index-entry:$YC_bC_r$ color model}

:::activity {act:activity-3-3-2} Activity 3.3.2
This activity investigates these two color models, which we view as coordinate systems for describing colors.

a) 
    First, we will explore the $RGB$ color model.

    > FIGURE {fig:js-rgb} number=3.3.2 src=../../media/ch03/rgb-preview.png
    > alt: 
    > caption: The $RGB$ color model.

    1. 
        What happens when $G=0$, $B=0$ (pushed all the way to the left), and $R$ is allowed to vary?

    2. 
        What happens when $R=0$, $G=0$, and $B$ is allowed to vary?

    3. 
        How can you create black in this color model?

    4. 
        How can you create white?

b) 
    Next, we will explore the $YC_bC_r$ color model.

    > FIGURE {fig:js-ycbcr} number=3.3.3 src=../../media/ch03/ycbcr-preview.png
    > alt: 
    > caption: The $YC_bC_r$ color model.

    1. 
        What happens when $C_b=0$ and $C_r=0$ (kept in the center) and $Y$ is allowed to vary?

    2. 
        What happens when $Y=0$ (pushed to the left), $C_r=0$ (kept in the center), and $C_b$ is allowed to increase between 0 and 127.5?

    3. 
        What happens when $Y=0$, $C_b=0$, and $C_r$ is allowed to increase between 0 and 127.5?

    4. 
        How can you create black in this color model?

    5. 
        How can you create white?

c) 
    Verify that ${\cal B}$ is a basis for ${\mathbb R}^3$.

    :::sage
    ```sage

    ```
    :::

d) 
    Find the matrix $P_{{\cal B}}$ that converts from $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right]$ coordinates into $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]$ coordinates. Then find the matrix $P_{{\cal B}}^{-1}$ that converts from $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]$ coordinates back into $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right]$ coordinates.

e) 
    Find the $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right]$ coordinates for the following colors and check, using the diagrams above, that the two representations agree.

    1. 
        Pure red is $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]= \left[\begin{array}{r}255 \\ 0 \\ 0 \end{array}\right]$.

    2. 
        Pure blue is $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]= \left[\begin{array}{r}0 \\ 0 \\ 255 \end{array}\right]$.

    3. 
        Pure white is $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]= \left[\begin{array}{r}255 \\ 255 \\ 255 \end{array}\right]$.

    4. 
        Pure black is $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]= \left[\begin{array}{r}0 \\ 0 \\ 0 \end{array}\right]$.

f) 
    Find the $\left[\begin{array}{r}R \\ G \\ B \end{array}\right]$ coordinates for the following colors and check, using the diagrams above, that the two representations agree.

    1. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right]=\left[\begin{array}{r}128 \\ 0 \\ 0 \end{array}\right]$.

    2. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right]=\left[\begin{array}{r}128 \\ 60 \\ 0 \end{array}\right]$.

    3. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right]=\left[\begin{array}{r}128 \\ 0 \\ 60 \end{array}\right]$.

g) 
    Write an expression for

    1. 
        The luminance $Y$ as it depends on $R$, $G$, and $B$.

    2. 
        The blue chrominance $C_b$ as it depends on $R$, $G$, and $B$.

    3. 
        The red chrominance $C_r$ as it depends on $R$, $G$, and $B$.

    Explain how these quantities can be roughly interpreted by stating that

    1. 
        the luminance represents the brightness of the color.

    2. 
        the blue chrominance measures the amount of blue in the color.

    3. 
        the red chrominance measures the amount of red in the color.

SOLUTION:

a) 
    Working with the $RGB$ color model, we find that

    1. 
        we produce red with varying degrees of brightness.

    2. 
        we produce blue with varying degrees of brightness.

    3. 
        $R=G=B=0$.

    4. 
        $R=G=B=255$.

b) 
    Working with the $YC_bC_r$ color model, we find that

    1. 
        we produce gray with varying degrees of brightness.

    2. 
        we produce blue with varying degrees of brightness.

    3. 
        we produce red with varying degrees of brightness.

    4. 
        $Y=C_b=C_r = 0$.

    5. 
        $Y=255$ with $C_b=C_r=0$.

c) 
    If we row reduce the matrix whose columns are the vectors in ${\cal B}$, we obtain the identity matrix, which means that the vectors are linearly independent and span ${\mathbb R}^3$.

d) 
    The matrices are

    $$ P_{{\cal B}} = \left[\begin{array}{rrr} 1.0000 & 0.00000 & 1.4020 \\ 1.0000 & -0.34413 & -0.71414 \\ 1.0000 & 1.7720 & 0.00000 \end{array}\right] $$

    and

    $$ P_{{\cal B}}^{-1} = \left[\begin{array}{rrr} 0.29900 & 0.58700 & 0.11400 \\ -0.16874 & -0.33126 & 0.50000 \\ 0.50000 & -0.41869 & -0.081311 \end{array}\right]\text{.} $$

e) 
    To convert from $RGB$ to $YC_bC_r$, we multiply by $P_{{\cal B}}^{-1}$ so that

    1. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right] = \left[\begin{array}{r}76.2 \\ -43.0 \\ 127.5 \end{array}\right]$

    2. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right] = \left[\begin{array}{r}29.1 \\ 127.5 \\ -20.7 \end{array}\right]$

    3. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right] = \left[\begin{array}{r}255 \\ 0 \\ 0 \end{array}\right]$

    4. 
        $\left[\begin{array}{r}Y \\ C_b \\ C_r \end{array}\right] = \left[\begin{array}{r}0 \\ 0 \\ 0 \end{array}\right]$

f) 
    To convert from $YC_bC_r$ to $RGB$, we multiply by $P_{{\cal B}}$ so that

    (i) 
        $\left[\begin{array}{r}R \\ G \\ B \end{array}\right] = \left[\begin{array}{r}128 \\ 128 \\ 128 \end{array}\right]$

    (ii) 
        $\left[\begin{array}{r}R \\ G \\ B \end{array}\right] = \left[\begin{array}{r}128 \\ 107.4 \\ 234.3 \end{array}\right]$

    (iii) 
        $\left[\begin{array}{r}R \\ G \\ B \end{array}\right] = \left[\begin{array}{r}212.1 \\ 85.1 \\ 128 \end{array}\right]$

g) 
    We have

    $$ \begin{alignedat}{4} Y & {}={} & 0.299R & {}+{} & 0.587G & {}+{} & 0.114B \\ C_b & {}={} & -0.169R & {}-{} & 0.331G & {}+{} & 0.500B \\ C_r & {}={} & 0.500R & {}-{} & 0.419G & {}-{} & 0.081B\text{.} \\ \end{alignedat} $$

    The expression for $Y$ is a weighted average of the $R$, $G$, and $B$ values. The expression for $C_b$ takes half the amount of $B$ and subtracts the amounts of red and green. Likewise, the expression for $C_r$ takes half the amount of $R$ and subtracts the amounts of green and blue.

:::

These two color models provide us with two ways to represent colors, each of which is useful in a certain context. Digital displays, such as those in phones and computer monitors, create colors by combining various amounts of red, green, and blue. The $RGB$ model is therefore most relevant in digital applications.

By contrast, the $YC_bC_r$ color model was created based on research into human vision and aims to concentrate the most visually important data into a single coordinate, the luminance, to which our eyes are most sensitive. Of course, any basis of ${\mathbb R}^3$ must have three vectors so we need two more coordinates, blue and red chrominance, if we want to represent all colors.

To see this explicitly, shown in [Figure 3.3.4](ref:fig-jpeg-luminance) is the original image and the image as rendered with only the luminance. That is, on the right, the color of each pixel is represented by only one byte, which is the luminance. This image essentially looks like a grayscale version of the original image with all its visual detail. In fact, before digital television became the standard, television signals were broadcast using the $YC_bC_r$ color model. When a signal was displayed on a black-and-white television, the luminance was displayed and the two chrominance values simply ignored.

> FIGURE {fig:fig-jpeg-luminance} number=3.3.4 src=../../media/ch03/spring-canyon-cropped.jpg
> alt: A photograph of a red rock canyon wall against a blue sky.
> caption: The original image rendered with only the luminance values.
> subfigure src=../../media/ch03/spring-canyon-cropped.jpg alt: A photograph of a red rock canyon wall against a blue sky.
> subfigure src=../../media/ch03/spring-canyon-luminance.jpg alt: The same photograph with only the luminance values of each pixel displayed.

For comparison, shown in [Figure 3.3.5](ref:fig-jpeg-chrominance) are the corresponding images created using only the blue chrominance and the red chrominance. Notice that the amount of visual detail is considerably less in these images.

> FIGURE {fig:fig-jpeg-chrominance} number=3.3.5 src=../../media/ch03/spring-canyon-blue-chrominance.jpg
> alt: The same photograph with only the blue chrominance displayed.
> caption: The original image rendered, on the left, with only blue chrominance and, on the right, with only red chrominance.
> subfigure src=../../media/ch03/spring-canyon-blue-chrominance.jpg alt: The same photograph with only the blue chrominance displayed.
> subfigure src=../../media/ch03/spring-canyon-red-chrominance.jpg alt: The same photograph with only the red chrominance displayed.

The aim of the JPEG compression algorithm is to represent an image using the smallest amount of data possible. By converting from the $RGB$ color model to the $YC_bC_r$ color model, we are concentrating the most visually important data into the luminance values. This is helpful because we can safely ignore some of the data in the chrominance values since that data is not as visually important.

## 3.3.3 The JPEG compression algorithm

The key to representing the image using a smaller amount of data is to detect redundancies in the data. To begin, we first break the image, which is composed of $1440\times 1468$ pixels, into small $8\times8$ blocks of pixels. For example, we will consider the $8\times8$ block of pixels outlined in green in the original image, shown on the left of [Figure 3.3.6](ref:fig-jpeg-block). The image on the right zooms in on the block.

> FIGURE {fig:fig-jpeg-block} number=3.3.6 src=../../media/ch03/jpeg-block.jpg
> alt: The photograph of the desert canyon wall with an eight by eight block of pixels highlighted.
> caption: An $8\times8$ block of pixels outlined in green in the original image on the left. We see the same block on a smaller scale on the right.
> subfigure src=../../media/ch03/jpeg-block.jpg alt: The photograph of the desert canyon wall with an eight by eight block of pixels highlighted.
> subfigure src=../../media/ch03/jpeg-block-zoom.jpg alt: A magnified version of the same photograph with the eight by eight block of pixels.

Notice that this block, as seen in the original image, is very small. If we were to change some of the colors in this block slightly, our eyes would probably not notice.

> FIGURE {fig:fig-jpeg-block-zoom} number=3.3.7 src=../../media/ch03/jpeg-orig-block.svg
> alt: The eight by eight block of pixels.
> caption: The $8\times8$ block under consideration.

Following our earlier work, we will change the representation of colors from the $RGB$ color model to the $YC_bC_r$ model. This separates the colors into luminance and chrominance values that we will consider separately. In [Figure 3.3.8](ref:fig-jpeg-block-luminance), we see the luminance values of this block. Again, notice how these values do not vary significantly over the block.

> FIGURE {fig:fig-jpeg-block-luminance} number=3.3.8 src=../../media/ch03/jpeg-block-luminance.svg
> alt: The eight by eight block of pixels rendered with only the luminance.
> caption: The luminance values in this block.
> subfigure src=../../media/ch03/jpeg-block-luminance.svg alt: The eight by eight block of pixels rendered with only the luminance.
> subfigure src=../../media/ch03/jpeg-block-luminance-values.svg alt: The numerical values for the luminance in the eight by eight block of pixels.

Our strategy in the compression algorithm is to perform a change of basis to take advantage of the fact that the luminance values do not change significantly over the block. Rather than recording the luminance of each of the pixels, this change of basis will allow us to record the average luminance along with some information about how the individual colors vary from the average.

Let's look at the first column of luminance values, which is a vector in ${\mathbb R}^8$:

$$ {\mathbf x} = \left[\begin{array}{c} 176 \\ 181 \\ 165 \\ \vdots \\ 150 \\ \end{array}\right] $$

. We will perform a change of basis and describe this vector by the average of the luminance values and information about variations from the average.

{index-entry:Discrete Fourier Transform} The JPEG compression algorithm uses the *Discrete Fourier Transform*, which is defined using the basis ${\cal B}$ whose basis vectors are

$$ \begin{aligned} {\mathbf v}_0 = \left[\begin{array}{c} \cos\left(\frac{(2\cdot0+1)\cdot0\pi}{16}\right) \\ \cos\left(\frac{(2\cdot1+1)\cdot0\pi}{16}\right) \\ \cos\left(\frac{(2\cdot2+1)\cdot0\pi}{16}\right) \\ \vdots \\ \cos\left(\frac{(2\cdot7+1)\cdot0\pi}{16}\right) \\ \end{array}\right], & {\mathbf v}_1 = \left[\begin{array}{c} \cos\left(\frac{(2\cdot0+1)\cdot1\pi}{16}\right) \\ \cos\left(\frac{(2\cdot1+1)\cdot1\pi}{16}\right) \\ \cos\left(\frac{(2\cdot2+1)\cdot1\pi}{16}\right) \\ \vdots \\ \cos\left(\frac{(2\cdot7+1)\cdot1\pi}{16}\right) \\ \end{array}\right], \\ \\ \ldots, {\mathbf v}_6 = \left[\begin{array}{c} \cos\left(\frac{(2\cdot0+1)\cdot6\pi}{16}\right) \\ \cos\left(\frac{(2\cdot1+1)\cdot6\pi}{16}\right) \\ \cos\left(\frac{(2\cdot2+1)\cdot6\pi}{16}\right) \\ \vdots \\ \cos\left(\frac{(2\cdot7+1)\cdot6\pi}{16}\right) \\ \end{array}\right], & {\mathbf v}_7 = \left[\begin{array}{c} \cos\left(\frac{(2\cdot0+1)\cdot7\pi}{16}\right) \\ \cos\left(\frac{(2\cdot1+1)\cdot7\pi}{16}\right) \\ \cos\left(\frac{(2\cdot2+1)\cdot7\pi}{16}\right) \\ \vdots \\ \cos\left(\frac{(2\cdot7+1)\cdot7\pi}{16}\right) \\ \end{array}\right]\text{.} \\ \end{aligned} $$

On first glance, this probably looks intimidating, but we can make sense of it by looking at these vectors graphically. Shown in [Figure 3.3.9](ref:fig-jpeg-fourier-basis) are four of these basis vectors. Notice that ${\mathbf v}_0$ is constantly 1, ${\mathbf v}_1$ varies relatively slowly, ${\mathbf v}_2$ varies a little more rapidly, and ${\mathbf v}_7$ varies quite rapidly. The main thing to notice is that: the basis vectors vary at different rates with the first vectors varying relatively slowly and the later vectors varying more rapidly.

> FIGURE {fig:fig-jpeg-fourier-basis} number=3.3.9 src=../../media/ch03/jpeg-fourier-basis-a.svg
> alt: A graphical representation of the first Fourier basis vector.
> caption: Four of the basis vectors ${\mathbf v}_0$, ${\mathbf v}_1$, ${\mathbf v}_2$, and ${\mathbf v}_7$.
> subfigure src=../../media/ch03/jpeg-fourier-basis-a.svg alt: A graphical representation of the first Fourier basis vector.
> subfigure src=../../media/ch03/jpeg-fourier-basis-b.svg alt: A graphical representation of the second Fourier basis vector.
> subfigure src=../../media/ch03/jpeg-fourier-basis-c.svg alt: A graphical representation of the third Fourier basis vector.
> subfigure src=../../media/ch03/jpeg-fourier-basis-d.svg alt: A graphical representation of the last Fourier basis vector.

These vectors form the basis ${\cal B}$ for ${\mathbb R}^8$. Remember that ${\mathbf x}$ is the vector of luminance values in the first column as seen on the right. We will write ${\mathbf x}$ in the new coordinates

$$ \left\{{\mathbf x}\right\}_{{\cal B}} = \left[\begin{array}{c} F_0 \\ F_1 \\ F_2 \\ \vdots \\ F_7 \end{array}\right] $$

. The coordinates $F_j$ are called the *Fourier coefficients* of the vector ${\mathbf x}$.

> IMAGE {img:jpeg-luminance-col-graph} src=../../media/ch03/jpeg-luminance-col-graph.svg
> alt: A visual representation of the vector formed by the luminance values in the first column.

:::activity {act:activity-3-3-3} Activity 3.3.3
We will explore the influence that the Fourier coefficients have on the vector ${\mathbf x}$.

a) 
    To begin, we'll look at the Fourier coefficient $F_0$.

    > FIGURE {fig:js-fourier-0} number=3.3.10 src=../../media/ch03/fourier0-preview.png
    > alt: 
    > caption: The effect of the Fourier coefficient $F_0$ on the vector ${\mathbf x} = F_0{\mathbf v}_0$.

    Describe the effect that $F_0$ has on the vector ${\mathbf x}$. Would you describe the components in ${\mathbf x}$ as constant, slowly varying, or rapidly varying?

b) 
    By comparison, let's see how the Fourier coefficient $F_3$ influences ${\mathbf x}$.

    > FIGURE {fig:js-fourier-3} number=3.3.11 src=../../media/ch03/fourier3-preview.png
    > alt: 
    > caption: The effect of the Fourier coefficient $F_3$ on the vector ${\mathbf x} = F_3{\mathbf v}_3$.

    Describe the effect that $F_3$ has on the vector ${\mathbf x}$. Would you describe the components in ${\mathbf x}$ as constant, slowly varying, or rapidly varying?

c) 
    Let's now investigate how the Fourier coefficient $F_7$ influences the vector ${\mathbf x}$.

    > FIGURE {fig:js-fourier-7} number=3.3.12 src=../../media/ch03/fourier7-preview.png
    > alt: 
    > caption: The effect of the Fourier coefficient $F_0$ on the vector ${\mathbf x} = F_7{\mathbf v}_7$.

    Describe the effect that $F_7$ has on the vector ${\mathbf x}$. Would you describe the components in ${\mathbf x}$ as constant, slowly varying, or rapidly varying?

d) 
    If the components of ${\mathbf x}$ vary relatively slowly, what would you expect to be true of the Fourier coefficients $F_j$?

e) 
    The Sage cell below will construct the matrix $P_{{\cal B}}$, which is denoted `P`, and its inverse $P_{{\cal B}}^{-1}$, which is denoted `Pinv`. Evaluate this Sage cell and notice that it prints the matrix $P_{{\cal B}}^{-1}$.

    :::sage
    ```sage
    mat = [[cos((2*i+1)*j*pi/16) for j in range(8)] for i in range(8)]
    P = matrix(mat).numerical_approx()
    Pinv = P.inverse()
    print (Pinv.numerical_approx(digits=3))

    ```
    :::

    Now look at the form of $P_{{\cal B}}^{-1}$ and explain why $F_0$ is the average of the luminance values in the vector ${\mathbf x}$.

f) 
    The Sage cell below defines the vector ${\mathbf x}$, which is the vector of luminance values in the first column, as seen in [Figure 3.3.8](ref:fig-jpeg-block-luminance). Use the cell below to find the vector ${\mathbf f}$ of Fourier coefficients $F_0,F_1,\ldots,F_7$. If you have evaluated the cell above, you will still be able to refer to `P` and `Pinv` in this cell.

    :::sage
    ```sage
    x = vector([176,181,165,139,131,131,140,150])
    #  find the vector of Fourier coefficients f below
    f =
    print (f.numerical_approx(digits=4))

    ```
    :::

    Write the Fourier coefficients and discuss the relative sizes of the coefficients.

g) 
    Let's see what happens when we simply ignore the coefficients $F_6$ and $F_7$. Form a new vector of Fourier coefficients by rounding the coefficients to the nearest integer and setting $F_6$ and $F_7$ to zero. This is an approximation to ${\mathbf f}$, the vector of Fourier coefficients. Use the approximation to ${\mathbf f}$ to form an approximation of the vector ${\mathbf x}$.

    :::sage
    ```sage
    # define fapprox below and then find xapprox
    fapprox =
    xapprox =
    print ("x      =", x)
    print ("xapprox=", xapprox.numerical_approx(digits=3))

    ```
    :::

    How much does your approximation differ from the actual vector ${\mathbf x}$?

h) 
    When we ignore the Fourier coefficients corresponding to rapidly varying basis elements, we see that the vector ${\mathbf x}$ that we reconstruct is very close to the original one. In fact, the luminance values in the approximation differ by at most one or two from the actual luminance values. Our eyes are not sensitive enough to detect this difference.

    So far, we have concentrated on only one column in our $8\times8$ block of luminance values. Let's now consider all of the columns. The following Sage cell defines a matrix called `luminance`, which is the $8\times8$ matrix of luminance values. Find the $8\times8$ matrix $F$ whose columns are the Fourier coefficients of the columns of luminance values.

    :::sage
    ```sage
    luminance = matrix(8,8, [176, 170, 170, 169, 162, 160, 155, 150, 181,
    179, 175, 167, 162, 160, 154, 149, 165, 170, 169, 161, 162, 161, 160,
    158, 139, 150, 164, 166, 159, 160, 162, 163, 131, 137, 157, 165, 163,
    163, 164, 164, 131, 132, 153, 161, 167, 167, 167, 169, 140, 142, 157,
    166, 166, 166, 167, 169, 150, 152, 160, 168, 172, 170, 168, 168])
    # define your matrix F below
    F =
    print (F.numerical_approx(digits=3))

    ```
    :::

i) 
    Notice that the first row of this matrix consists of the Fourier coefficient $F_0$ for each of the columns. Just as we saw before, the entries in this row do not change significantly as we move across the row. In the Sage cell below, write these entries in the vector ${\mathbf y}$ and find the corresponding Fourier coefficients.

    :::sage
    ```sage
    # define the vector y as the entries in the first row of F
    y =
    y_fourier =
    print (y_fourier.numerical_approx(digits=3))

    ```
    :::

SOLUTION:

a) 
    Changing $F_0$ has the effect of adding a constant to the components of ${\mathbf x}$.

b) 
    The coefficient $F_3$ introduces a slow variation into the components of ${\mathbf x}$.

c) 
    The coefficient $F_7$ introduces a rapid variation into the components of ${\mathbf x}$.

d) 
    The coefficients $F_j$ with larger values of $j$ will be small.

e) 
    We have

    $$ P_{{\cal B}}^{-1} = \left[\begin{array}{rrrrrrrr} 0.125 & 0.125 & 0.125 & 0.125 & 0.125 & 0.125 & 0.125 & 0.125 \\ 0.245 & 0.208 & 0.139 & 0.0488 & -0.0488 & -0.139 & -0.208 & -0.245 \\ 0.231 & 0.0957 & -0.0957 & -0.231 & -0.231 & -0.0957 & 0.0957 & 0.231 \\ 0.208 & -0.0488 & -0.245 & -0.139 & 0.139 & 0.245 & 0.0488 & -0.208 \\ 0.177 & -0.177 & -0.177 & 0.177 & 0.177 & -0.177 & -0.177 & 0.177 \\ 0.139 & -0.245 & 0.0488 & 0.208 & -0.208 & -0.0488 & 0.245 & -0.139 \\ 0.0957 & -0.231 & 0.231 & -0.0957 & -0.0957 & 0.231 & -0.231 & 0.0957 \\ 0.0488 & -0.139 & 0.208 & -0.245 & 0.245 & -0.208 & 0.139 & -0.0488 \end{array}\right]\text{.} $$

    From the top row of this matrix, we see that $F_0=\frac18(x_0+x_1+\ldots+x_7)$.

f) 
    We find that

    $$ \left[\begin{array}{c}F_0 \\ F_1 \\ \vdots \\ F_7 \end{array}\right] = \left[\begin{array}{c} 151.6\\ 20.01\\ 15.33\\ -6.043\\ -3.712\\ -3.121\\ -0.4167\\ 0.6794\end{array}\right]\text{.} $$

    Notice that the largest Fourier coefficient is $F_0=151.6$ and that the coefficients $F_4$, $F_5$, $F_6$, and $F_7$ are relatively small. This reflects the fact that the luminance does not vary rapidly.

g) 
    Notice that

    $$ {\mathbf x}= \left[\begin{array}{c} 176 \\ 181 \\ 165 \\ 139 \\131 \\ 131 \\ 140 \\ 150 \end{array}\right],~~~ {\mathbf x}_{\text{approx}} = \left[\begin{array}{c} 176 \\ 181 \\ 166 \\ 140 \\131 \\ 133 \\ 140 \\ 150 \end{array}\right] $$

    showing that the approximation is quite good.

h) 
    We have

    $$ F = \left[\begin{array}{rrrrrrrr} 152 & 154 & 163 & 165 & 164 & 163 & 162 & 161 \\ 20.0 & 18.0 & 8.76 & 0.502 & -4.17 & -4.68 & -6.96 & -10.1 \\ 15.3 & 9.90 & 3.04 & 2.44 & 2.68 & 1.43 & -1.27 & -2.94 \\ -6.04 & -9.19 & -3.69 & 0.0202 & -0.102 & 0.102 & -0.0741 & 0.0699 \\ -3.71 & -2.47 & -0.530 & 2.30 & -0.177 & -0.177 & 0.177 & 0 \\ -3.12 & -2.02 & -0.789 & 0.102 & -1.48 & -0.834 & 0.625 & 1.66 \\ -0.417 & -1.04 & -1.45 & -1.97 & 1.38 & 1.13 & 1.10 & 1.22 \\ 0.679 & 0.450 & -0.403 & -0.335 & 0.00929 & -0.166 & 0.207 & -0.141 \end{array}\right]\text{.} $$

i) 
    We see that the Fourier coefficients of these Fourier coefficients is $\left[\begin{array}{c} 161 \\ -3.8 \\ -4.7 \\ -1.6 \\ 0 \\ 0.9 \\ 0.8 \\ 0.4 \end{array}\right]$. Once again, we see that $F_0$ is the largest Fourier coefficient and the coefficients corresponding to rapid variations are small.

:::

Up to this point, we have been working with the luminance values in one $8\times8$ block of our image. We formed the Fourier coefficients for each of the columns of this block. Once we notice that the Fourier coefficients across a row are relatively constant, it seems reasonable to find the Fourier coefficients of the *rows* of the matrix of Fourier coefficients. Doing so leads to the matrix

$$ \left[\begin{array}{rrrrrrrr} 160.6 & -4.0 & -4.8 & -1.7 & 0.0 & 0.9 & 0.8 & 0.3 \\ 2.7 & 14.7 & 3.8 & 1.1 & -1.6 & -0.3 & -0.3 & -0.4 \\ 3.8 & 7.0 & 2.1 & 2.9 & 0.8 & -0.2 & -0.3 & -0.3 \\ -2.4 & -3.9 & -1.9 & 0.1 & 1.2 & 1.2 & 0.7 & 0.1 \\ -0.6 & -1.4 & -1.5 & -0.9 & 0.2 & 0.6 & -0.2 & -0.5 \\ -0.7 & -1.6 & 0.0 & -1.1 & 0.0 & 0.3 & -0.1 & -0.2 \\ -0.0 & -1.4 & 0.4 & 0.9 & 0.1 & -0.5 & 0.0 & 0.5 \\ 0.0 & 0.2 & 0.3 & 0.3 & 0.0 & -0.0 & -0.2 & 0.0 \\ \end{array}\right] $$

.

If we were to look inside a JPEG image file, we would see lots of matrices like this. For each $8\times 8$ block, there would be three matrices of Fourier coefficients of the rows of Fourier coefficients, one matrix for each of the luminance, blue chrominance, and red chrominance values. However, we store these Fourier coefficients as integers inside the JPEG file so we need to round off the coefficients to the nearest integer, as shown here:

$$ \left[\begin{array}{rrrrrrrr} 161 & -4 & -5 & -2 & 0 & 1 & 1 & 0 \\ 3 & 15 & 4 & 1 & -2 & 0 & 0 & 0 \\ 4 & 7 & 2 & 3 & 1 & 0 & 0 & 0 \\ -2 & -4 & -2 & 0 & 1 & 1 & 1 & 0 \\ -1 & -1 & -1 & -1 & 0 & 1 & 0 & 0 \\ -1 & -2 & 0 & -1 & 0 & 0 & 0 & 0 \\ 0 & -1 & 0 & 1 & 0 & -1 & 0 & 1 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ \end{array}\right] $$

.

There are many zeroes in this matrix, and we can save space in a JPEG image file by only recording the *nonzero* Fourier coefficients.

In fact, when a JPEG file is created, there is a “quality” parameter that can be set, such as that shown in [Figure 3.3.13](ref:fig-jpeg-quality). When the quality parameter is high, we will store many of the Fourier coefficients; when it is low, we will ignore more of them.

> FIGURE {fig:fig-jpeg-quality} number=3.3.13 src=../../media/ch03/quality.jpg
> alt: A window from a graphics software package allowing a user to control the quality of an exported JPEG image.
> caption: When creating a JPEG file, we choose a value of the “quality” parameter.

To see how this works, suppose the quality setting is relatively high. After rounding off the Fourier coefficients, we will set all of the coefficients whose absolute value is less than 2 to zero, which creates the matrix:

$$ \left[\begin{array}{rrrrrrrr} 161 & -4 & -5 & 0 & 0 & 0 & 0 & 0 \\ 3 & 15 & 4 & 0 & 0 & 0 & 0 & 0 \\ 4 & 7 & 2 & 3 & 0 & 0 & 0 & 0 \\ -2 & -4 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ \end{array}\right]. $$

Notice that there are 12 nonzero Fourier coefficients, out of 64, that we need to record. Consequently, we only save $12/64 \approx 19\%$ of the data.

If instead, the quality setting is relatively low, we set all of the Fourier coefficients whose absolute value is less than 4 to zero, creating the matrix:

$$ \left[\begin{array}{rrrrrrrr} 161 & -4 & -5 & 0 & 0 & 0 & 0 & 0 \\ 0 & 15 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 7 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 & 0 & 0 \\ \end{array}\right] $$

. Notice that there are only 5 nonzero Fourier coefficients that we need to record now, meaning we save only $5/64\approx 8\%$ of the data. This will result in a smaller JPEG file describing the image.

With a lower quality setting, we have thrown away more information about the Fourier coefficients so the image will not be reconstructed as accurately. To see this, we can reconstruct the luminance values from the Fourier coefficients by converting back into the standard coordinate system. Rather than showing the luminance values themselves, we will show the difference in the original luminance values and the reconstructed luminance values. When the quality setting was high and we stored 12 Fourier coefficients, we find this difference to be

$$ \left[\begin{array}{rrrrrrrr} -7 & -7 & -1 & 3 & -2 & -1 & 0 & -1 \\ 4 & 4 & 4 & -1 & -3 & 0 & -1 & -3 \\ 1 & 3 & 0 & -7 & -3 & 1 & 3 & 3 \\ -7 & -3 & 3 & 1 & -5 & -2 & 1 & 2 \\ 0 & -3 & 4 & 4 & -1 & -1 & -1 & -2 \\ 2 & -5 & 3 & 1 & 1 & -1 & -1 & 1 \\ 1 & -2 & 4 & 3 & -4 & -6 & -2 & 3 \\ 0 & -1 & 2 & 1 & -1 & -4 & -1 & 5 \\ \end{array}\right] $$

. When the quality setting is lower and we store only 5 Fourier coefficients, the difference is

$$ \left[\begin{array}{rrrrrrrr} 3 & -3 & -2 & 0 & 0 & 7 & 10 & 10 \\ 14 & 11 & 6 & -1 & -1 & 3 & 4 & 4 \\ 7 & 10 & 5 & -5 & -3 & -1 & 2 & 3 \\ -10 & -3 & 5 & 2 & -8 & -7 & -3 & -1 \\ -12 & -11 & 2 & 2 & -5 & -7 & -6 & -6 \\ -11 & -15 & -2 & -2 & -2 & -4 & -5 & -2 \\ -3 & -6 & 2 & 3 & -2 & -5 & -4 & -1 \\ 6 & 3 & 4 & 5 & 4 & 0 & -1 & 0 \\ \end{array}\right] $$

.

This demonstrates the trade off. With a high quality setting, we require more storage to save more of the data, but the reconstructed image is closer to the original. With the lower quality setting, we require less storage, but the reconstructed image differs more from the original.

If we remember that the visual information stored by the blue and red chrominance values is not as important as that contained in the luminance values, we feel safer in discarding more of the Fourier coefficients for the chrominance values resulting in an even greater savings.

Shown in [Figure 3.3.14](ref:fig-jpeg-image-low) is the original image compared to a version stored with a very low quality setting. If you look carefully, you can individual $8\times8$ blocks.

> FIGURE {fig:fig-jpeg-image-low} number=3.3.14 src=../../media/ch03/spring-canyon-cropped.jpg
> alt: The original photograph of the desert scene.
> caption: The original image and the result of storing the image with a low quality setting.
> subfigure src=../../media/ch03/spring-canyon-cropped.jpg alt: The original photograph of the desert scene.
> subfigure src=../../media/ch03/spring-canyon-low.jpg alt: The original photograph saved with a lower quality setting in the JPEG compression algorithm.

This discussion of the JPEG compression algorithm is meant to explore the ideas that underlie its construction and demonstrate the importance of a choice of basis and its accompanying coordinate system. There are a few details, most notably about the rounding of the Fourier coefficients, that are not strictly accurate. The actual implementation is a little more complicated, but the presentation here conveys the spirit of the algorithm.

The JPEG compression algorithm allows us to store image files using only a fraction of the data. Similar ideas are used to efficiently store digital music and video files.

## 3.3.4 Summary

This section has explored how appropriate changes in bases help us reconstruct an image using only a fraction of its data. This is known as image compression.

- 
    There are several ways of representing colors, all of which use vectors in ${\mathbb R}^3$. We explored the $RGB$ color model, which is appropriate in digital applications, and the $YC_bC_r$ model, in which the most important visual information is conveyed by the $Y$ component, known as luminance.

- 
    We also explored a change of basis called the Discrete Fourier Transform. In the coordinate system that results, the first coefficient measures the average of the components of a vector. Other coefficients measure variations in the components away from the average.

- 
    We put both of these ideas to use in demonstrating the JPEG compression algorithm. An image is broken into $8\times8$ blocks, and the colors into luminance, blue chrominance, and red chrominance. Applying the Discrete Fourier Transform allows us to reconstruct a good approximation of the image using only a fraction of the original data.

## 3.3.5 Exercises

:::exercise {exercise-3-3-001} number=3.3.1 answered=yes src=src/exercises/exercises3-3.xml:5
PROBLEM:
Consider the vector ${\mathbf x}=\left[\begin{array}{r} 103 \\ 94 \\ 91 \\ 92 \\ 103 \\ 105 \\ 105 \\ 108 \end{array}\right]$.

a) 
    In the Sage cell below is a copy of the change of basis matrices that define the Fourier transform. Find the Fourier coefficients of ${\mathbf x}$.

    :::sage
    ```sage
    mat = [[cos((2*i+1)*j*pi/16) for j in range(8)] for i in range(8)]
    P = matrix(mat).numerical_approx()
    Pinv = P.inverse()
    print (Pinv.numerical_approx(digits=3))

    ```
    :::

b) 
    We will now form the vector ${\mathbf y}$, which is an approximation of ${\mathbf x}$ by rounding all the Fourier coefficients of ${\mathbf x}$ to the nearest integer to obtain $\left\{{\mathbf y}\right\}_{{\cal C}}$. Now find the vector ${\mathbf y}$ and compare this approximation to ${\mathbf x}$. What is the error in this approximation?

c) 
    Repeat the last part of this problem, but set the rounded Fourier coefficients to zero if they have an absolute value less than five. Use it to create a second approximation of ${\mathbf x}$. What is the error in this approximation?

d) 
    Compare the number of nonzero Fourier coefficients that you have in the two approximations and compare the accuracy of the approximations. Using a few sentences, discuss the comparisons that you find.

ANSWER:

a) 
    $\left[\begin{array}{c} 100\\ -5.99 \\ 3.98 \\ 4.46 \\ 1.94 \\ -0.97 \\ 0.84 \\ 1.07 \\ \end{array}\right]$.

b) 
    ${\mathbf y}=\left[\begin{array}{c} 103 \\ 94 \\ 91 \\ 92 \\ 103 \\ 105 \\ 105 \\ 108 \end{array}\right]$

c) 
    ${\mathbf y}=\left[\begin{array}{c} 94 \\ 95 \\ 97 \\ 99 \\ 101 \\ 103 \\ 105 \\ 106 \end{array}\right]$

d) 
    In the first approximation, the reconstructed vector ${\mathbf y}$ agrees with the original vector ${\mathbf x}$. In the second approximation, there are only two nonzero Fourier coefficients, and we see that the approximating vector differs from the original vector. In the second case, however, we are using only one quarter of the Fourier coefficients. Though the entries in the vector ${\mathbf y}$ differ from those in the original vector ${\mathbf x}$, the difference is probably not visually noticeable since the possible values range from 0 to 255.

SOLUTION:

a) 
    $C_{{\cal B}}^{-1}{\mathbf x}=\left[\begin{array}{r}F_0 \\ F_1 \\ \vdots \\ F_7 \end{array}\right] = \left[\begin{array}{c} 100\\ -5.99 \\ 3.98 \\ 4.46 \\ 1.94 \\ -0.97 \\ 0.84 \\ 1.07 \\ \end{array}\right]$.

b) 
    We round the Fourier coefficients to the vector $\left[\begin{array}{c} 100 \\ -6 \\ 4 \\ 4 \\ 2 \\ -1 \\ 1 \\ 1 \end{array}\right]$ and find the approximation ${\mathbf y}$, which compares to the original vector ${\mathbf x}$.

    $$ {\mathbf y}=\left[\begin{array}{c} 103 \\ 94 \\ 91 \\ 92 \\ 103 \\ 105 \\ 105 \\ 108 \end{array}\right],~~~ {\mathbf x}=\left[\begin{array}{c} 103 \\ 94 \\ 91 \\ 92 \\ 103 \\ 105 \\ 105 \\ 108 \end{array}\right]\text{.} $$

    In this case, the approximation ${\mathbf y}$ is the same as the original vector ${\mathbf x}$.

c) 
    Now we found the Fourier coefficients to $\left[\begin{array}{c} 100 \\ -6 \\ 0 \\ 0 \\ 0 \\ 0 \\ 0 \\ 0 \end{array}\right]$ and find the approximation ${\mathbf y}$, which compares to the original vector ${\mathbf x}$.

    $$ {\mathbf y}=\left[\begin{array}{c} 94 \\ 95 \\ 97 \\ 99 \\ 101 \\ 103 \\ 105 \\ 106 \end{array}\right],~~~ {\mathbf x}=\left[\begin{array}{c} 103 \\ 94 \\ 91 \\ 92 \\ 103 \\ 105 \\ 105 \\ 108 \end{array}\right]\text{.} $$

    Now we see that the approximating vector ${\mathbf y}$ differs from the original vector ${\mathbf x}$, though not significantly.

d) 
    In the first approximation, the reconstructed vector ${\mathbf y}$ agrees with the original vector ${\mathbf x}$. In the second approximation, there are only two nonzero Fourier coefficients, and we see that the approximating vector differs from the original vector. In the second case, however, we are using only one quarter of the Fourier coefficients. Though the entries in the vector ${\mathbf y}$ differ from those in the original vector ${\mathbf x}$, the difference is probably not visually noticeable since the possible values range from 0 to 255.

:::

:::exercise {exercise-3-3-002} number=3.3.2 answered=yes src=src/exercises/exercises3-3.xml:153
PROBLEM:
There are several steps to the JPEG compression algorithm. The following questions examine the motivation behind some of them.

a) 
    What is the overall goal of the JPEG compression algorithm?

b) 
    Why do we convert colors from the the $RGB$ color model to the $YC_bC_r$ model?

c) 
    Why do we decompose the image into a collection of $8\times8$ arrays of pixels?

d) 
    What role does the Discrete Fourier Transform play in the JPEG compression algorithm?

e) 
    Why is the information conveyed by the rapid-variation Fourier coefficients, generally speaking, less important than the slow-variation coefficients?

ANSWER:

a) 
    The goal is to represent the image in a format that requires less storage but still allows us to reconstruct the image with most of the visual information preserved.

b) 
    In the $YC_bC_r$ color model, the most significant visual information is stored in the $Y$ channel. Therefore, we should store most of this information. The information in the $C_b$ and $C_r$ channels is not as visually significant so we can store a smaller amount of that data without noticing the effect.

c) 
    As seen in an image, these blocks are relatively small, which means that the approximations we reconstruct are probably not noticeably different from the original. Also, the blocks are small enough so that the image does not typically change a lot over the block. At the same time, the blocks are large enough to allow us to save storage by throwing away some of the Fourier coefficients.

d) 
    The Discrete Fourier Transform represents the data in a block as its average and variations from the average. Since the blocks are relatively small, there will typically be small variations away from the average. Therefore, we can often ignore those variations without visually detecting the approximation.

e) 
    Our eyes do not detect individual pixels so we do not detect differences from one pixel to the next. This means that we do not typically notice rapid variations.

SOLUTION:

a) 
    The goal is to represent the image in a format that requires less storage but still allows us to reconstruct the image with most of the visual information preserved.

b) 
    In the $YC_bC_r$ color model, the most significant visual information is stored in the $Y$ channel. Therefore, we should store most of this information. The information in the $C_b$ and $C_r$ channels is not as visually significant so we can store a smaller amount of that data without noticing the effect.

c) 
    As seen in an image, these blocks are relatively small, which means that the approximations we reconstruct are probably not noticeably different from the original. Also, the blocks are small enough so that the image does not typically change a lot over the block. At the same time, the blocks are large enough to allow us to save storage by throwing away some of the Fourier coefficients.

d) 
    The Discrete Fourier Transform represents the data in a block as its average and variations from the average. Since the blocks are relatively small, there will typically be small variations away from the average. Therefore, we can often ignore those variations without visually detecting the approximation.

e) 
    Our eyes do not detect individual pixels so we do not detect differences from one pixel to the next. This means that we do not typically notice rapid variations.

:::

:::exercise {exercise-3-3-003} number=3.3.3 answered=yes src=src/exercises/exercises3-3.xml:257
PROBLEM:
The Fourier transform that we used in this section is often called the Discrete Fourier Cosine Transform because it is defined using a basis ${\cal C}$ consisting of cosine functions. There is also a Fourier Sine Transform defined using a basis ${\cal S}$ consisting of sine functions. For instance, in ${\mathbb R}^4$, the basis vectors of ${\cal S}$ are

$$ \begin{aligned} {\mathbf v}_1 = \left[\begin{array}{c} \sin\left(\frac{1\cdot1\pi}{8}\right) \\ \sin\left(\frac{3\cdot1\pi}{8}\right) \\ \sin\left(\frac{5\cdot1\pi}{8}\right) \\ \sin\left(\frac{7\cdot1\pi}{8}\right) \\ \end{array}\right], & {\mathbf v}_2 = \left[\begin{array}{c} \sin\left(\frac{1\cdot2\pi}{8}\right) \\ \sin\left(\frac{3\cdot2\pi}{8}\right) \\ \sin\left(\frac{5\cdot2\pi}{8}\right) \\ \sin\left(\frac{7\cdot2\pi}{8}\right) \\ \end{array}\right], \\ \\ {\mathbf v}_3 = \left[\begin{array}{c} \sin\left(\frac{1\cdot3\pi}{8}\right) \\ \sin\left(\frac{3\cdot3\pi}{8}\right) \\ \sin\left(\frac{5\cdot3\pi}{8}\right) \\ \sin\left(\frac{7\cdot3\pi}{8}\right) \\ \end{array}\right], & {\mathbf v}_4 = \left[\begin{array}{c} \sin\left(\frac{1\cdot4\pi}{8}\right) \\ \sin\left(\frac{3\cdot4\pi}{8}\right) \\ \sin\left(\frac{5\cdot4\pi}{8}\right) \\ \sin\left(\frac{7\cdot4\pi}{8}\right) \\ \end{array}\right]\text{.} \\ \end{aligned} $$

We can think of these vectors graphically, as shown in [Figure 3.3.15](ref:fig-fourier-sine-basis).
> FIGURE {fig:fig-fourier-sine-basis} number=3.3.15 src=../../media/ch03/fourier-sine-basis-a.svg
> alt: A visual representation of the first basis vector.
> caption: The vectors ${\mathbf v}_1,{\mathbf v}_2,{\mathbf v}_3,{\mathbf v}_4$ that form the basis ${\cal S}$.
> subfigure src=../../media/ch03/fourier-sine-basis-a.svg alt: A visual representation of the first basis vector.
> subfigure src=../../media/ch03/fourier-sine-basis-b.svg alt: A visual representation of the second basis vector.
> subfigure src=../../media/ch03/fourier-sine-basis-c.svg alt: A visual representation of the third basis vector.
> subfigure src=../../media/ch03/fourier-sine-basis-d.svg alt: A visual representation of the fourth basis vector.

a) 
    The Sage cell below defines the matrix `S` whose columns are the vectors in the basis ${\cal S}$ as well as the matrix `C` whose columns form the basis ${\cal C}$ used in the Fourier Cosine Transform.

    :::sage
    ```sage
    sinmat = [[sin((2*i+1)*j*pi/8) for j in range(1,5)] for i in range(4)]
    cosmat = [[cos((2*i+1)*j*pi/8) for j in range(4)] for i in range(4)]
    S = matrix(sinmat).numerical_approx()
    C = matrix(cosmat).numerical_approx()

    ```
    :::

    In the $8\times8$ block of luminance values we considered in this section, the first column begins with the four entries 176, 181, 165, and 139, as seen in [Figure 3.3.8](ref:fig-jpeg-block-luminance). These form the vector ${\mathbf x}=\left[\begin{array}{r}176 \\ 181 \\ 165 \\ 139 \end{array}\right]$. Find both $\left\{{\mathbf x}\right\}_{{\cal S}}$ and $\left\{{\mathbf x}\right\}_{{\cal C}}$.

b) 
    Write a sentence or two comparing the values for the Fourier Sine coefficients $\left\{{\mathbf x}\right\}_{{\cal S}}$ and the Fourier Cosine coefficients $\left\{{\mathbf x}\right\}_{{\cal C}}$.

c) 
    Suppose now that ${\mathbf x}=\left[\begin{array}{r}100 \\ 100 \\ 100 \\ 100 \end{array}\right]$. Find the Fourier Sine coefficients $\left\{{\mathbf x}\right\}_{{\cal S}}$ and the Fourier Cosine coefficients $\left\{{\mathbf x}\right\}_{{\cal C}}$.

d) 
    Write a few sentences explaining why we use the Fourier Cosine Transform in the JPEG compression algorithm rather than the Fourier Sine Transform.

ANSWER:

a) 
    $\left\{{\mathbf x}\right\}_{{\cal S}} = \left[\begin{array}{c} 220 \\ 18.7 \\ 79.3 \\ 5.3 \\ \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}} = \left[\begin{array}{c} 165 \\ 20.1 \\ -11.0 \\ -0.3 \\ \end{array}\right]$.

b) 
    The higher Fourier Cosine coefficients are smaller than their counterparts in the Fourier Sine transform. This means that we can ignore these coefficients in the Fourier Cosine transform without losing too much information.

c) 
    $\left\{{\mathbf x}\right\}_{{\cal S}} = \left[\begin{array}{c} 131 \\ 0 \\ 54.1 \\ 0 \\ \end{array}\right]$ and $\left\{{\mathbf x}\right\}_{{\cal C}} = \left[\begin{array}{c} 100 \\ 0 \\ 0 \\ 0 \end{array}\right]$.

d) 
    Generally speaking, we can safely ignore more of the coefficients in the Fourier Cosine transform. Most of the important information is channeled into the first coefficient, which records the average of the components of the vector ${\mathbf x}$.

SOLUTION:

a) 
    We find that

    $$ \left\{{\mathbf x}\right\}_{{\cal S}} = \left[\begin{array}{c} 220 \\ 18.7 \\ 79.3 \\ 5.3 \\ \end{array}\right], \left\{{\mathbf x}\right\}_{{\cal C}} = \left[\begin{array}{c} 165 \\ 20.1 \\ -11.0 \\ -0.3 \\ \end{array}\right]\text{.} $$

b) 
    The higher Fourier Cosine coefficients are smaller than their counterparts in the Fourier Sine transform. This means that we can ignore these coefficients in the Fourier Cosine transform without losing too much information.

c) 
    We find that

    $$ \left\{{\mathbf x}\right\}_{{\cal S}} = \left[\begin{array}{c} 131 \\ 0 \\ 54.1 \\ 0 \\ \end{array}\right], \left\{{\mathbf x}\right\}_{{\cal C}} = \left[\begin{array}{c} 100 \\ 0 \\ 0 \\ 0 \end{array}\right]\text{.} $$

d) 
    Generally speaking, we can safely ignore more of the coefficients in the Fourier Cosine transform. Most of the important information is channeled into the first coefficient, which records the average of the components of the vector ${\mathbf x}$.

:::

:::exercise {exercise-3-3-004} number=3.3.4 answered=yes src=src/exercises/exercises3-3.xml:500
PROBLEM:
In [Example 3.2.9](ref:3.2#example-wavelet-basis), we looked at a basis for ${\mathbb R}^4$ that we called the Haar wavelet basis. The basis vectors are

$$ {\mathbf v}_1=\left[\begin{array}{r}1 \\ 1 \\ 1 \\ 1 \end{array}\right], {\mathbf v}_2=\left[\begin{array}{r}1 \\ 1 \\ -1 \\ -1 \end{array}\right], {\mathbf v}_3=\left[\begin{array}{r}1 \\ -1 \\ 0 \\ 0 \end{array}\right], {\mathbf v}_4=\left[\begin{array}{r}0 \\ 0 \\ 1 \\ -1 \end{array}\right] $$

, which may be understood graphically as in [Figure 3.3.16](ref:fig-haar-wavelet-basis). We will denote this basis by ${\cal W}$.
> FIGURE {fig:fig-haar-wavelet-basis} number=3.3.16 src=../../media/ch03/3-3-basis-revenue-elements-a.svg
> alt: A visual representation of the first basis vector
> caption: The Haar wavelet basis represented graphically.
> subfigure src=../../media/ch03/3-3-basis-revenue-elements-a.svg alt: A visual representation of the first basis vector
> subfigure src=../../media/ch03/3-3-basis-revenue-elements-b.svg alt: A visual representation of the second basis vector
> subfigure src=../../media/ch03/3-3-basis-revenue-elements-c.svg alt: A visual representation of the third basis vector
> subfigure src=../../media/ch03/3-3-basis-revenue-elements-d.svg alt: A visual representation of the fourth basis vector
The change of coordinates from a vector ${\mathbf x}$ in ${\mathbb R}^4$ to $\left\{{\mathbf x}\right\}_{{\cal W}}$ is called the Haar *wavelet transform* and we write

$$ \left\{{\mathbf x}\right\}_{{\cal W}} = \left[\begin{array}{r}H_1 \\ H_2 \\ H_3 \\ H_4 \end{array}\right] $$

. The coefficients $H_1,H_2,H_3,H_4$ are called wavelet coefficients.
Let's work with the $4\times4$ block of luminance values in the upper left corner of our larger $8\times8$ block:

$$ \left[\begin{array}{rrrr} 176 & 170 & 170 & 169 \\ 181 & 179 & 175 & 167 \\ 165 & 170 & 169 & 161 \\ 139 & 150 & 164 & 166 \end{array}\right] $$

.

a) 
    The following Sage cell defines the matrix `W` whose columns are the basis vectors in ${\cal W}$. If ${\mathbf x}$ is the first column of luminance values in the $4\times4$ block above, find the wavelet coefficients $\left\{{\mathbf x}\right\}_{{\cal W}}$.

    :::sage
    ```sage
    W = matrix(4,4,[1,1,1,0,1,1,-1,0,1,-1,0,1,1,-1,0,-1])

    ```
    :::

b) 
    Notice that $H_1$ gives the average value of the components of ${\mathbf x}$ and $H_2$ describes how the averages of the first two and last two components differ from the overall average. The coefficients $H_3$ and $H_4$ describe small-scale variations between the first two components and last two components, respectively.

    If we set the last wavelet coefficients $H_3=0$ and $H_4=0$, we obtain the wavelet coefficients $\left\{{\mathbf y}\right\}_{{\cal W}}$ for a vector ${\mathbf y}$ that approximates ${\mathbf x}$. Find the vector ${\mathbf y}$ and compare it to the original vector ${\mathbf x}$.

c) 
    What impact does the fact that $H_3=0$ and $H_4=0$ have on the form of the vector ${\mathbf y}$? Explain how setting these coefficients to zero ignores the behavior of ${\mathbf x}$ on a small scale.

d) 
    In the JPEG compression algorithm, we looked at the Fourier coefficients of all the columns of luminance values and then performed a Fourier transform on the rows. The Sage cell below will perform the same operation using the wavelet transform; that is, it will first find the wavelet coefficients of each of the columns and then perform the wavelet transform on the rows. You only need to evaluate the cell to find the wavelet coefficients obtained in this way.

    :::sage
    ```sage
    luminance = matrix(4,4,[176, 170, 170, 169, 181, 179, 175, 167, 165,
    170, 169, 161, 139, 150,  164, 166])
    Winv = W.inverse()
    wavelet_transform = (Winv*(Winv*luminance).transpose()).transpose()
    print (wavelet_transform.numerical_approx(digits=3))

    ```
    :::

e) 
    Now set all the wavelet coefficients equal to zero except those in the upper left $2\times2$ block and use them to define the matrix `coeffs` in the Sage cell below. This has the effect of ignoring all of the small-scale differences. Evaluating this cell will recover the approximate luminance values.

    :::sage
    ```sage
    # define the matrix of coefficients below
    coeffs =
    # this code will undo the wavelet transform
    approx_luminance = W*((W*(coeffs.transpose())).transpose())
    print (approx_luminance.numerical_approx(digits=3))

    ```
    :::

f) 
    Explain how the wavelet transform and this approximation can be used to create a lower resolution version of the image.

This kind of wavelet transform is the basis of the JPEG 2000 compression algorithm, which is an alternative to the usual JPEG algorithm.
ANSWER:

a) 
    $\left\{{\mathbf x}\right\}_{{\cal W}} = \left[\begin{array}{c} 165 \\ 13.2 \\ -2.5 \\ 13.0 \\ \end{array}\right]$.

b) 
    ${\mathbf y}=\left[\begin{array}{c} 178.2 \\ 178.2 \\ 151.8 \\ 151.8 \\ \end{array}\right]$.

c) 
    The first two components are equal as are the last two components.

d) 
    We find the wavelet coefficients

    $$ \left[\begin{array}{rrrr} 167 & -0.7 & -1.0 & 1.9 \\ 6.4 & 3.8 & 3.0 & 0.4 \\ -2.1 & -1.4 & 1.0 & -1.8 \\ 5.8 & 5.8 & 1.5 & 2.5 \\ \end{array}\right]\text{.} $$

e) 
    We find the approximate luminance values to be

    $$ \left[\begin{array}{rrrr} 177 & 177 & 170 & 170 \\ 177 & 177 & 170 & 170 \\ 156 & 156 & 165 & 165 \\ 156 & 156 & 165 & 165 \\ \end{array}\right]\text{.} $$

f) 
    The luminance values are constant on $2\times2$ blocks. It is as if the image is represented with pixels that are twice as wide and twice as tall.

SOLUTION:

a) 
    We find that $\left\{{\mathbf x}\right\}_{{\cal W}} = \left[\begin{array}{c} 165 \\ 13.2 \\ -2.5 \\ 13.0 \\ \end{array}\right]$.

b) 
    We have the approximation $\left\{{\mathbf y}\right\}_{{\cal W}} = \left[\begin{array}{c} 165 \\ 13.2 \\ 0 \\ 0 \end{array}\right]$ and ${\mathbf y}=\left[\begin{array}{c} 178.2 \\ 178.2 \\ 151.8 \\ 151.8 \\ \end{array}\right]$.

c) 
    The first two components are equal as are the last two components. Since we see no difference in these components, we have lost the information that differentiates the components on a small scale.

d) 
    We find the wavelet coefficients

    $$ \left[\begin{array}{rrrr} 167 & -0.7 & -1.0 & 1.9 \\ 6.4 & 3.8 & 3.0 & 0.4 \\ -2.1 & -1.4 & 1.0 & -1.8 \\ 5.8 & 5.8 & 1.5 & 2.5 \\ \end{array}\right]\text{.} $$

e) 
    We find the approximate luminance values to be

    $$ \left[\begin{array}{rrrr} 177 & 177 & 170 & 170 \\ 177 & 177 & 170 & 170 \\ 156 & 156 & 165 & 165 \\ 156 & 156 & 165 & 165 \\ \end{array}\right]\text{.} $$

f) 
    The luminance values are constant on $2\times2$ blocks. It is as if the image is represented with pixels that are twice as wide and twice as tall.

:::

:::exercise {exercise-3-3-005} number=3.3.5 answered=yes src=src/exercises/exercises3-3.xml:787
PROBLEM:
In this section, we looked at the $RGB$ and $YC_bC_r$ color models. In this exercise, we will look at the $HSV$ color model where $H$ is the hue, $S$ is the saturation, and $V$ is the value of the color. All three quantities vary between 0 and 255.
> FIGURE {fig:js-hsv} number=3.3.17 src=../../media/ch03/hsv-preview.png
> alt: 
> caption: The $HSV$ color model.

a) 
    If you leave $S$ and $V$ at some fixed values, what happens when you change the value of $H$?

b) 
    Increase the value $V$ to 255, which is on the far right. Describe what happens when you vary the saturation $S$ using a fixed hue $H$ and value $V$.

c) 
    Describe what happens when $H$ and $S$ are fixed and $V$ varies.

d) 
    How can you create white in this color model?

e) 
    How can you create black in this color model?

f) 
    Find an approximate range of hues that correspond to blue.

g) 
    Find an approximate range of hues that correspond to green.

The $YC_bC_r$ color model concentrates the most important visual information in the luminance coordinate, which roughly measures the brightness of the color. The other two coordinates describe the hue of the color. By contrast, the $HSV$ color model concentrates all the information about the hue in the $H$ coordinate.
This is useful in computer vision applications. For instance, if we want a robot to detect a blue ball in its field of vision, we can specify a range of hue values to search for. If the lighting changes in the room, the saturation and value may change, but the hue will not. This increases the likelihood that the robot will still detect the blue ball across a wide range of lighting conditions.
ANSWER:

a) 
    The color changes but not the brightness.

b) 
    The color appears more “washed out” with a low saturation and appears more vibrant with a high saturation.

c) 
    The brightness changes.

d) 
    Set the saturation $S=0$ and the value $V=255$.

e) 
    Set $S=V=0$.

f) 
    $128\leq H \leq 192$.

g) 
    $64\leq H \leq 128$.

SOLUTION:

a) 
    The color changes but not the brightness.

b) 
    The color appears more “washed out” with a low saturation and appears more vibrant with a high saturation.

c) 
    The brightness changes.

d) 
    Set the saturation $S=0$ and the value $V=255$.

e) 
    Set $S=V=0$.

f) 
    $128\leq H \leq 192$.

g) 
    $64\leq H \leq 128$.

:::
