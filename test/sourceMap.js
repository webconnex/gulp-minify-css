// jscs:disable maximumLineLength
'use strict';

var path = require('path');

var combine = require('stream-combiner2');
var expect = require('chai').expect;
var File = require('vinyl');
var minifyCSS = require('../');
var sourceMaps = require('gulp-sourcemaps');
var stylus = require('gulp-stylus');

require('mocha');

var fixture = [
  '/*! header */',
  '@import "external.css";',
  '@import url(http://fonts.googleapis.com/css?family=Open+Sans);',
  '',
  'p { color: aqua }'
].join('\n');

var fixtureStylus = [
  '/*! Special Comment */',
  '@import "external.css";',
  'p { color: gray; }'
].join('\n');

describe('gulp-minify-css source map', function() {
  it('should generate source map with correct mapping', function(done) {
    var write = sourceMaps.write()
    .on('data', function(file) {
      var mapExpected = 'aAAA,EACE,WAAY,OCGV,MAAO,KCJX,WACE,YAAa,YACb,WAAY,OACZ,YAAa,IACb,IAAK,mBAAoB,kBAAmB,4FAA4F';
      expect(file.sourceMap.mappings).to.be.equal(mapExpected);

      var sourcemapRegex = /sourceMappingURL=data:application\/json;base64/;
      expect(sourcemapRegex.test(String(file.contents))).to.be.equal(true);

      expect(file.sourceMap).to.have.property('file');
      expect(file.sourceMap.file).to.be.equal('sourcemap.css');

      expect(file.sourceMap.sources).to.be.deep.equal([
        'external.css',
        'sourcemap.css',
        'http://fonts.googleapis.com/css?family=Open+Sans'
      ]);
      done();
    });

    combine.obj(
      sourceMaps.init(),
      minifyCSS(),
      write
    )
    .on('error', done)
    .end(new File({
      base: path.join(__dirname, 'fixtures'),
      path: path.join(__dirname, './fixtures/sourcemap.css'),
      contents: new Buffer(fixture)
    }));
  });

  it('should generate source map with correct sources when using preprocessor (stylus) and gulp.src without base', function(done) {
    var write = sourceMaps.write()
    .on('data', function(file) {
      expect(file.sourceMap.sources).to.be.deep.equal([
        'external.css',
        'importer.css'
      ]);
      done();
    });

    combine.obj(
      sourceMaps.init({loadMaps: true}),
      stylus(),
      minifyCSS(),
      write
    )
    .on('error', done)
    .end(new File({
      base: path.join(__dirname, 'fixtures'),
      path: path.join(__dirname, 'fixtures/importer.css'),
      contents: new Buffer(fixtureStylus)
    }));
  });

  it('should generate source map with correct sources when using preprocessor (stylus) and gulp.src with base', function(done) {
    var write = sourceMaps.write()
    .on('data', function(file) {
      expect(file.sourceMap.sources).to.be.deep.equal([
        'test/fixtures/external.css',
        'test/fixtures/importer.css'
      ]);
      done();
    });

    combine.obj(
      sourceMaps.init(),
      stylus(),
      minifyCSS(),
      write
    )
    .on('error', done)
    .end(new File({
      base: '.',
      path: path.join(__dirname, 'fixtures/importer.css'),
      contents: new Buffer(fixtureStylus)
    }));
  });
});
