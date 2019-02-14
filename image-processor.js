// Copyright (c) 2019 Seung-hyun Hwang

var imageProcessor = {};
window.URL = window.URL || window.webkitURL;


/**
*  @function preload
*  @param {Array<string> | String} srcList 로드할 이미지들의 경로.
*  @return {Promise}
*/
imageProcessor.preload = function (srcList) {
  var proms;

  if (!Array.isArray(srcList))
    srcList = [ srcList ];

  proms = srcList.map(function (src) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  });

  return proms.length == 1?
            proms[0] :
            Promise.all(proms);
}


/**
*  @function imageToFile
*  @param {Image} image
*  @param {String=} fileName
*  @return {Promise}
*/
imageProcessor.imageToFile = function (image, fileName) {
  fileName = fileName || 'f.png';
  return new Promise(function(resolve, reject) {
    var canvas = document.createElement('canvas');

     if (!canvas.toBlob)
       throw new Error("HTMLCanvasElement.toBlob method does not support.");

     canvas.width = image.width;
     canvas.height = image.height;

     canvas.getContext('2d').drawImage(image, 0, 0);

     canvas.toBlob(function (blob) {
       resolve(new File([blob], fileName));
     });
  });
}


/**
*  @function fileToImage
*  @param {File} file
*  @return {Promise}
*/
imageProcessor.fileToImage = function (file) {
  return imageProcessor.preload(
    URL.createObjectURL(file)
  );
}


/**
*  @function compressImage
*  @param {Image} image
*  @param {Number} maxFileSize
*  @return {Promise}
*/
imageProcessor.compressImage = function (image, maxFileSize) {
  var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      imageSize;

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  return new Promise(function(resolve, reject) {
    if (!canvas.toBlob) return reject(
      new Error("HTMLCanvasElement.toBlob method does not support.")
    );

    canvas.toBlob(function (blob) {
      var file = new File([blob], 'i.png'),
          newWidth, newHeight;

      imageSize = file.size;

      if (imageSize <= maxFileSize)
        return resolve(image);

      canvas.width =
      newWidth =
        Math.floor(canvas.width * Math.sqrt(maxFileSize / imageSize));

      canvas.height =
      newHeight =
        Math.floor(canvas.height  * Math.sqrt(maxFileSize / imageSize));

      ctx.drawImage(image, 0, 0, newWidth, newHeight);

      canvas.toBlob(function (_blob) {
        imageProcessor.fileToImage(
          new File([_blob], 'i.png')
        ).then(resolve).catch(reject);
      });
    });
  });
}
