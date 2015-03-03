'use strict';

var convert = require('convert-source-map')
  , path = require('path')
  , fs = require('fs')
  , through = require('through2');

function separate(src, file, root, base, url) {
  var inlined = convert.fromSource(src);

  if (!inlined) return null;

  inlined = inlined.setProperty('sourceRoot', root || '');

  if (base) {
    var sources = inlined.getProperty('sources').map(function(source) {
      return path.relative(base, source);
    });
    inlined = inlined.setProperty('sources', sources);
  }

  var json = inlined.toJSON(2);

  url = url || path.basename(file);

  var newSrc = convert.removeComments(src);
  var comment = '//# sourceMappingURL=' + url;

  return { json: json, src: newSrc + '\n' + comment }
}

var go = module.exports = 

/**
 *
 * Externalizes the source map of the file streamed in.
 *
 * The source map is written as JSON to `file`, and the original file is streamed out with its
 * `sourceMappingURL` set to the path of `file` (or to the value of `url`).
 *
 * #### Events (in addition to stream events)
 *
 * - `missing-map` emitted if no map was found in the stream
 *   (the src is still piped through in this case, but no map file is written)
 *
 * @name exorcist
 * @function
 * @param {String} file full path to the map file to which to write the extracted source map
 * @param {String=} url full URL to the map file, set as `sourceMappingURL` in the streaming output (default: file)
 * @param {String=} root root URL for loading relative source paths, set as `sourceRoot` in the source map (default: '')
 * @param {String=} base base path for calculating relative source paths (default: use absolute paths)
 * @return {TransformStream} transform stream into which to pipe the code containing the source map
 */
function exorcist(file, url, root, base) {
  var src = '';

  function ondata(d, _, cb) { src += d; cb(); }
  function onend(cb) {
    var self = this;
    var separated = separate(src, file, root, base, url);
    if (!separated) {
      self.emit(
          'missing-map'
        ,   'The code that you piped into exorcist contains no source map!\n'
          + 'Therefore it was piped through as is, and no external map file was generated.'
      );
      self.push(src);
      return cb(); 
    }
    self.push(separated.src);
    fs.writeFile(file, separated.json, 'utf8', cb)
  }

  return through(ondata, onend);
}
