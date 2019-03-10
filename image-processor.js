// Copyright (c) 2019 Seung-hyun Hwang

var imageProcessor = {};


//start of define methods of imageProcessor.
~function (imageProcessor, URL) {


if (!URL)
  throw new Error("URL Object not support.");


/**
*  @function wait
*  @return {Promise}
*/
function wait(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}


/**
*  @function getCanvas
*  @return {HTMLCanvasElement}
*/
function getCanvas() {
  return document.createElement('canvas');
}


/**
*  @function getCanvas
*  @return {CanvasRenderingContext2D}
*/
function getContext(c) {
  return c.getContext('2d');
}


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
*  @function canvasToFile
*  @param {HTMLCanvasElement} canvas
*  @return {Promise}
*/
imageProcessor.canvasToFile = function (canvas, fileName) {
  return new Promise(function(resolve) {
    canvas.toBlob(function (blob) {
      resolve(new File([blob], fileName || 'i.png'));
    });
  });
}


/**
*  @function canvasToImage
*  @param {HTMLCanvasElement} canvas
*  @return {Promise}
*/
imageProcessor.canvasToImage = function (canvas) {
  return imageProcessor
          .canvasToFile(canvas)
          .then(imageProcessor.fileToImage);
}


/**
*  @function imageToFile
*  @param {Image} image
*  @param {String=} fileName
*  @return {Promise}
*/
imageProcessor.imageToFile = function (image, fileName) {
  var canvas = getCanvas();

  if (!canvas.toBlob)
   throw new Error("HTMLCanvasElement.toBlob method does not support.");

  canvas.width = image.width;
  canvas.height = image.height;

  getContext(canvas).drawImage(image, 0, 0);
  return imageProcessor
          .canvasToFile(canvas, fileName || 'f.png');
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
  var canvas = getCanvas(),
      ctx = getContext(canvas),
      imageSize;

  if (!canvas.toBlob)
    throw new Error("HTMLCanvasElement.toBlob method does not support.");
  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  return imageProcessor
          .canvasToFile(canvas)
          .then(function (file) {
            var newWidth, newHeight, ratio;

            imageSize = file.size;
            ratio = Math.sqrt(maxFileSize / imageSize);

            if (imageSize <= maxFileSize)
              return image;

            canvas.width =
            newWidth =
              Math.floor(canvas.width * ratio);

            canvas.height =
            newHeight =
              Math.floor(canvas.height * ratio);

            ctx.drawImage(image, 0, 0, newWidth, newHeight);
            return imageProcessor.canvasToImage(canvas);
          });
}


/**
*  @function requestImage 사용자에게 사진 파일을 입력할 것을 요청.
*  @param {Boolean} multiple 사진의 복수 선택 허용 여부.
*  @return {Promise}
*/
imageProcessor.requestImage = function (multiple) {
  var input = document.createElement('input'),
      targetId = 'image-processor-hidden-element',
      target = document.getElementById(targetId);

  if (!target) {
    target = document.createElement('div');
    target.id = targetId;
    target.style.display = 'none';
    (document.body || document.head).appendChild(target);
  }

  target.appendChild(input);
  input.setAttribute('type', 'file');
  input.setAttribute('accept', '.jpg, .jpeg, .png, .gif, image/*');

  if (multiple) input.setAttribute('multiple', 1);

  return new Promise(function(resolve) {
    input.onchange = function () {
      var proms = Array.from(input.files).map(function (file) {
        return imageProcessor.fileToImage(file);
      });
      (
        proms.length == 1?
          proms[0] :
          Promise.all(proms)
      ).then(resolve);
    };

    input.click();
  });
}



/**
*  @function resize 이미지의 크기를 재조정.
*  @param {Image} image 대상 이미지.
*  @param {Object} sizeSet 조정할 이미지의 크기 데이터.
*  @param {Number=} sizeSet.width 조정할 이미지의 폭.
*  @param {Number=} sizeSet.height 조정할 이미지의 높이.
*  @param {Number} sizeSet.ratio 조정할 이미지의 백분위 크기. (100% = Number(100))
*  @return {Promise}
*  이미지의 폭과 높이, 비율이 모두 주어질 경우 비율을 우선으로 합니다.
*/
imageProcessor.resize = function (image, sizeSet) {
  var canvas = getCanvas(),
      ctx = getContext(canvas),
      newWidth,
      newHeight;

  if (!sizeSet)
    throw new Error(sizeSet + " is not an object.");

  if (isFinite(sizeSet.ratio)) {
    newWidth = image.width * sizeSet.ratio / 100;
    newHeight = image.height * sizeSet.ratio / 100;
  } else {
    newWidth = sizeSet.width || image.width;
    newHeight = sizeSet.height || image.height;
  }

  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.drawImage(image, 0, 0, newWidth, newHeight);
  return imageProcessor.canvasToImage(canvas);
}


/**
*  @function cut 이미지의 크기를 자름.
*  @param {Image} image 대상 이미지.
*  @param {Number=} x1
*  @param {Number=} y1
*  @param {Number=} x2
*  @param {Number=} y2
*  @return {Promise}
*/
imageProcessor.cut = function (image, x1, y1, x2, y2) {
  var canvas = getCanvas(),
      ctx = getContext(canvas),
      scaleX = 1,
      scaleY = 1;

  x1 = x1 || 0;
  y1 = y1 || 0;
  x2 = x2 || image.width;
  y2 = y2 || image.height;

  if (x1 > x2) {
    //reverse imgage x
    var temp = x1;
    x1 = x2;
    x2 = temp;
    scaleX = -1;
  }

  if (y1 > y2) {
    //reverse imgage x
    var temp = y1;
    y1 = y2;
    y2 = temp;
    scaleY = -1;
  }

  ctx.scale(scaleX, scaleY);
  canvas.width = x2 - x1;
  canvas.height = y2 - y1;
  ctx.drawImage(image, -x1, -y1, image.width * scaleX, image.height * scaleY);

  return imageProcessor.canvasToImage(canvas);
}


/**
*  @function flip 이미지를 좌우 또는 상하 반전시킴.
*  @param {Image} image 대상 이미지.
*  @param {String=} dir 반전시킬 방향. ('x' 또는 'y' 또는 'xy' 또는 'yx'. 대소문자 구별없음.)
*  @return {Promise}
*/
imageProcessor.flip = function (image, dir) {
  var canvas = getCanvas(),
      ctx = getContext(canvas),
      scaleX = 1,
      scaleY = 1;

  switch (Array.from(dir+'').sort().join('').toLowerCase()) {
    case 'x':
      scaleX = -1;
      break;
    case 'y':
      scaleY = -1;
      break;
    case 'xy':
      scaleX = -1;
      scaleY = -1;
      break;
    case '':
      return Promise.resolve(image);
    default:
      throw new Error("Unknown direction.");
  }

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(image, 0, 0, canvas.width * scaleX, canvas.height * scaleY);

  return imageProcessor.canvasToImage(canvas);
}



//end of define methods of imageProcessor.
}(imageProcessor, window.URL || window.webkitURL);
