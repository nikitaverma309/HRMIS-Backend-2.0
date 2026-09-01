const tf = require('@tensorflow/tfjs-node');

console.log('TensorFlow.js version:', tf.version.tfjs);

const tensor = tf.tensor([1, 2, 3, 4]);
console.log('Tensor:', tensor.toString());