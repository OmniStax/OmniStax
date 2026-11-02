# Chapter 7 Singular value decompositions {chap7}

[Chapter 4](ref:4#chap4) demonstrated several important uses for the theory of eigenvalues and eigenvectors. For example, knowing the eigenvalues and eigenvectors of a matrix $A$ enabled us to make predictions about the long-term behavior of dynamical systems in which some initial state ${\mathbf x}_0$ evolves according to the rule ${\mathbf x}_{k+1} = A{\mathbf x}_k$.

We can't, however, apply this theory to every problem we might meet. First, eigenvectors only exist when the matrix $A$ is square, and we have seen situations, such as the least-squares problems in [Section 6.5](ref:6.5#sec-least-squares), where the matrices we're interested in are not square. Second, even when $A$ is square, there may not be a basis for ${\mathbb R}^m$ consisting of eigenvectors of $A$, an important condition we required for some of our work.

This chapter introduces singular value decompositions, whose singular values and singular vectors may be viewed as a generalization of eigenvalues and eigenvectors. In fact, we will see that every matrix, whether square or not, has a singular value decomposition and that knowing it gives us a great deal of insight into the matrix. It's been said that having a singular value decomposition is like looking at a matrix with X-ray vision as the decomposition reveals essential features of the matrix.
