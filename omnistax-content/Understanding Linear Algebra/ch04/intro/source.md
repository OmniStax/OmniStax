# Chapter 4 Eigenvalues and eigenvectors {chap4}

Our primary concern so far has been to develop an understanding of solutions to linear systems $A{\mathbf x}={\mathbf b}$. In this way, our two fundamental questions about the existence and uniqueness of solutions led us to the concepts of span and linear independence.

We saw that some linear systems are easier to understand than others. For instance, given the two matrices

$$ A = \left[\begin{array}{rr} 3 & 0 \\ 0 & -1 \\ \end{array}\right], \qquad B = \left[\begin{array}{rr} 1 & 2 \\ 2 & 1 \\ \end{array}\right] $$

, we would much prefer working with the diagonal matrix $A$. Solutions to linear systems $A{\mathbf x}={\mathbf b}$ are easily determined, and the geometry of the matrix transformation defined by $A$ is easily described.

We saw in the last chapter, however, that some problems become simpler when we look at them in a new basis. Is it possible that questions about the non-diagonal matrix $B$ become simpler when viewed in a different basis? We will see that the answer is "yes," and see how the theory of eigenvalues and eigenvectors, which will be developed in this chapter, provides the key. We will see how this theory provides an appropriate change of basis so that questions about the non-diagonal matrix $B$ are equivalent to questions about the diagonal matrix $A$. In fact, we will see that these two matrices are, in some sense, equivalent to one another.
