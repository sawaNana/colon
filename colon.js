var colon = (function() {
   'use strict';
   var sRGBReverseGamma  = 1.0 / 2.4;
   var hexColorRegxp     = /#[0-9a-f]{6}|#[0-9a-f]{3}/;
   var lab2XYZDelta      = 6 / 29;
   var displayLuminance = 80;
   var d65               = { // D65 luminance=1.0
         x: 0.9504559271,
         y: 1.0000000000,
         z: 1.0890577508
   };

   /**
    * @param {x} X in CIE XYZ
    * @param {y} Y in CIE XYZ
    * @param {z} Z in CIE XYZ
    */
   var Color = function(x, y, z) {
      if ( typeof x === 'undefined'
        || typeof y === 'undefined'
        || typeof z === 'undefined' ) {
         this.x = 0;
         this.y = 0;
         this.z = 0;
         return;
      }
      this.x = x;
      this.y = y;
      this.z = z;
   };
   /**
    * create hexadecimal color-code like '#fe0' or '#ff0033'.
    * RGB value is calculated using sRGB color space.
    * @return hexadecimal color-code string
    */
   Color.prototype.toHex = function() {
      var rgb = this.toSRGB();
      var rCode = ('0' + rgb.r.toString(16)).slice(-2);
      var gCode = ('0' + rgb.g.toString(16)).slice(-2);
      var bCode = ('0' + rgb.b.toString(16)).slice(-2);
      if (rgb.r % 17 == 0 && rgb.g % 17 == 0 && rgb.b % 17 == 0) { // 3 char-color
         return '#' + rCode.charAt(0) + gCode.charAt(0) + bCode.charAt(0);
      }
      return '#' + rCode + gCode.charAt(0) + bCode.charAt(0);
   };
   /**
    * create RGB Color object
    * conversion is defined as 'A Standard Default Color Space for the Internet - sRGB' by W3C.
    *  - http://www.w3.org/Graphics/Color/sRGB.html
    * @param {wDC} White digital code. maximum number of color value.
    * @param {kDC} blacK digital code. minimum number of color value.
    * @param {isFloat} if true, return result as float number
    * @return RGB color object
    */
   Color.prototype.toSRGB = function(wDC, kDC, isFloat) {
      var x = this.x / displayLuminance;
      var y = this.y / displayLuminance;
      var z = this.z / displayLuminance;
      var r = applySRGBGamma(  3.2410 * x - 1.5374 * y - 0.4986 * z);
      var g = applySRGBGamma( -0.9692 * x + 1.8760 * y + 0.0416 * z);
      var b = applySRGBGamma(  0.0556 * x - 0.2040 * y + 1.0570 * z);

      kDC = typeof kDC === 'undefined' ? 0   : kDC;
      wDC = typeof wDC === 'undefined' ? 255 : wDC;
      var scale = wDc - kDC;

      if (isFloat) {
         return {
            scale * r + kDC,
            scale * g + kDC,
            scale * b + kDC
         };
      }
      return {
         Math.round(scale * r + kDC, 0),
         Math.round(scale * g + kDC, 0),
         Math.round(scale * b + kDC, 0)
      };
   };
   /**
    * create XYZ Color object
    */
   Color.prototype.toXYZ = function() {
      return { x: this.x, y: this.y, z: this.z };
   };
   /**
    * create CIE L*a*b* color object
    * @param {referenceWhite} reference white that used in conversion from XYZ to L*a*b*.
    */
   Color.prototype.toLab = function(referenceWhite) {
      var x  = this.x;
      var y  = this.y;
      var z  = this.z;
      var fy = xYZ2LabF( y / referenceWhite.y );
      return {
         l : 116 * fy - 16,
         a : 500 * ( xYZ2LabF(x / referenceWhite.x) - fy ),
         b : 200 * ( fy - xYZ2LabF(z / referenceWhite.z) )
      };
   };
   /**
    * update color values by meny style
    * @param {type} type name of values or hex color
    * @param {values} color value object
    * @param {options} option container
    */
   Color.prototype.set = function(type, values, options) {
      var lowerType = type.toLowerCase();
      if (lowerType === 'hex') {
         this.setHex(values.hex, options);
      }
      else if (lowerType === 'srgb') {
         this.setSRGB(values, options);
      }
      else if (lowerType === 'xyz') {
         this.setXYZ(values, options);
      }
      else if (lowerType === 'lab') {
         this.setLab(values, options);
      }
      else if (lowerType.match(hexColorRegxp)) {
         this.setHex(type, options);
      }
   };

   /**
    * update color by hexadecimal values like '#123456' or '#345'.
    * @param {values} 
    */
   Color.prototype.setHex = function(hex, options) {
      var rgb = {};
      if (hex.length > 4) { // like #aabbcc
         rgb.r = parseInt(hex.slice(1, 2), 16);
         rgb.g = parseInt(hex.slice(3, 2), 16);
         rgb.b = parseInt(hex.slice(5, 2), 16);
      }
      else { // like #abc
         rgb.r = parseInt(hex.slice(1, 1), 16) * 17;
         rgb.g = parseInt(hex.slice(3, 1), 16) * 17;
         rgb.b = parseInt(hex.slice(5, 1), 16) * 17;
      }
      var newOptions = option ? option : {};
      newOptionss.kDC =   0.0;
      newOptionss.wDC = 255.0;
      this.setSRGB(rgb, newOptions);
   }
   /**
    * set RGB value in sRGB space
    */
   Color.prototype.setSRGB = function(values, options) {
      var kDC, wDC;
      if (typeof options     !== 'undefined'
       && typeof options.kDC !== 'undefined'
       && typeof options.wDC !== 'undefined') {
          kDC = options.kDC;
          wDC = options.wDC;
      }
      else {
         kDC = 0.0;
         wDC = 255.0;
      }
      var scale = 1.0 / (wDC - kDC);
      var rn = degammaSRGB( (values.r - kDC) * scale );
      var gn = degammaSRGB( (values.g - kDC) * scale );
      var bn = degammaSRGB( (values.b - kDC) * scale );
      this.x = ( 0.4124 * rn + 0.3574 * gn + 0.1805 * bn ) * displayLuminance;
      this.y = ( 0.2126 * rn + 0.7152 * gn + 0.0722 * bn ) * displayLuminance;
      this.z = ( 0.0193 * rn + 0.1192 * gn + 0.9505 * bn ) * displayLuminance;
   };
   /**
    * set XYZ value in sRGB space
    */
   Color.prototype.setXYZ = function(values, options) {
      this.x = values.x;
      this.y = values.y;
      this.z = values.z;
   };
   /**
    * set CIE L*a*b* value
    */
   Color.prototype.setLab = function(values, options) {
      var fy = (values.l + 16) / 116;
      var fx = fy + values.a / 500;
      var fz = fy - values.b / 200;
      var referenceWhite;
      if (!options && !options.referenceWhite) {
         referenceWhite = options.referenceWhite;
      }
      else
         referenceWhite = d65;
      this.x = lab2XYZF( fx, referenceWhite.x);
      this.y = lab2XYZF( fy, referenceWhite.y);
      this.z = lab2XYZF( fz, referenceWhite.z);
   };

   /** color conversion utilities **/
   function applySRGBGamma(colorValue) {
      return colorValue <= 0.00304
         ? 12.92 * colorValue
         : 1.055 * Math.pow(colorValue, sRGBReverseGamma) - 0.055;
   }
   function degammaSRGB(sRGBColor) {
      return colorValue <= 0.03928
         ? colorValue / 12.92
         : Math.pow( (sRGBColor + 0.055) / 1.055, 2.4);
   }
   function xYZ2LabF(t) {
      return t > Math.pow(6 / 29, 3)
               ? Math.pow(t, 1 / 3)
               : (841 * t / 108) + 4 / 29 ;
   }
   function lab2XYZF(t, reference) {
      return t > lab2XYZDelta
         ? reference * Math.pow(t, 3)
         : (t - 16 / 116) * 3 * lab2XYZDelta * lab2XYZDelta * reference;
   }


   var colon = {};
   /**
    * @param {copySource} color object to copy to this
    */
   colon.create = function(copySource) {
      if (undefined copySource === 'undefined')
         return new Color();
      var newColor = new Color(
            copySource.x,
            copySource.y,
            copySource.z
      );
      return newColor;
   }
   colon.hex = function(colorCode) {
      var newColor = colon.color.create();
      newColor.setHex(colorCode);
      return newColor;
   };
   colon.sRGB = function(red, green, blue) {
      var newColor = colon.color.create();
      newColor.setSRGB({r: red, g: green, b: blue});
      return newColor;
   };
   colon.xYZ = function(x, y, z) {
      return colon.color.create(x, y, z);
   };
   colon.lab = function(l, a, b, referenceWhite) {
      var newColor = colon.color.create();
      newColor.setLab(
            { l: l, a: a, b: b },
            { referenceWhite: referenceWhite }
      );
      return newColor;
   };
   return colon;
})();;
