/*eslint-disable max-len */
'use strict';

var EOL = require('os').EOL;
var path = require('path');

var combine = require('stream-combiner2');
var expect = require('chai').expect;
var File = require('vinyl');
var minifyCSS = require('..');
var PluginError = require('gulp-util').PluginError;
var sourceMaps = require('gulp-sourcemaps');
var stringToStream = require('from2-string');
var stylus = require('gulp-stylus');

describe('gulp-minify-css minification', function() {
  var opts = {
    keepSpecialComments: 1,
    keepBreaks: true
  };

  it('should not modify empty files', function(done) {
    minifyCSS(opts)
    .on('error', done)
    .on('data', function(file) {
      expect(file.isNull()).to.be.equal(true);
      done();
    })
    .end(new File());
  });

  it('should not modify the original option object', function(done) {
    minifyCSS(opts)
    .on('error', done)
    .on('finish', function() {
      expect(opts).to.be.eql({
        keepSpecialComments: 1,
        keepBreaks: true
      });
      done();
    })
    .end(new File({contents: new Buffer('')}));
  });

  describe('in buffer mode', function() {
    it('should minify CSS files', function(done) {
      minifyCSS(opts)
      .on('error', done)
      .on('data', function(file) {
        expect(String(file.contents)).to.be.equal('/*!foo*/' + EOL + 'a{color:red}');
        done();
      })
      .end(new File({contents: new Buffer('/*!foo*//*bar*/\na { color: red; }/*!baz*/')}));
    });

    it('should emit an error when the CSS is corrupt', function(done) {
      minifyCSS()
      .on('error', function(err) {
        expect(err).to.be.instanceOf(PluginError);
        expect(err.fileName).to.be.equal(path.join(__dirname, '../foo.css'));
        done();
      })
      .end(new File({
        path: path.join(__dirname, '../foo.css'),
        contents: new Buffer('@import url("../bar/../baz/../../external.css");')
      }));
    });
  });

  describe('in stream mode', function() {
    it('should minify CSS files', function(done) {
      minifyCSS(opts)
      .on('error', done)
      .on('data', function(file) {
        file.contents.on('data', function(data) {
          expect(file.isStream()).to.be.equal(true);
          expect(String(data)).to.be.equal('@font-face{src:local("baz"),url(1/2/3/font.eot)}');
          done();
        });
      })
      .end(new File({
        path: path.join(__dirname, 'foo/bar.css'),
        contents: stringToStream('@font-face { src: local("baz"), url("1/2/3/font.eot"); }')
      }));
    });

    it('should emit an error when the CSS is corrupt', function(done) {
      minifyCSS()
      .on('error', function(err) {
        expect(err).to.be.instanceOf(PluginError);
        expect(err.fileName).to.be.equal(path.join(__dirname, '../foo.css'));
        done();
      })
      .end(new File({
        path: path.join(__dirname, '../foo.css'),
        contents: stringToStream('@import url("../fixture.css");')
      }));
    });
  });

  describe('with external files', function() {
    it('should minify include external files', function(done) {
      minifyCSS()
      .on('error', done)
      .on('data', function(file) {
        expect(String(file.contents)).to.be.equal('p{text-align:center;color:green}');
        done();
      })
      .end(new File({
        path: path.join(__dirname, 'foo////////../importer.css'),
        contents: new Buffer('@import "fixture.css";')
      }));
    });
  });
});

describe('gulp-minify-css source map', function() {
  this.timeout(7500);

  it('should generate source map with correct mapping', function(done) {
    var write = sourceMaps.write()
    .on('data', function(file) {
      var mapExpected = 'aAAA,EACE,WAAY,OCGV,MAAO,KCJX,WACE,YAAa,YACb,WAAY,OACZ,YAAa,IACb,IAAK,mBAAoB,kBAAmB,6FAA4F';
      expect(file.sourceMap.mappings).to.be.equal(mapExpected);

      var sourcemapRegex = /sourceMappingURL=data:application\/json;base64/;
      expect(sourcemapRegex.test(String(file.contents))).to.be.equal(true);

      expect(file.sourceMap).to.have.property('file');
      expect(file.sourceMap.file).to.be.equal('sourcemap.css');

      expect(file.sourceMap.sources).to.be.deep.equal([
        'fixture.css',
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
      base: path.join(__dirname),
      path: path.join(__dirname, 'sourcemap.css'),
      contents: new Buffer([
        '/*! header */',
        '@import "fixture.css";',
        '@import url(http://fonts.googleapis.com/css?family=Open+Sans);',
        '',
        'p { color: aqua }'
      ].join('\n'))
    }));
  });

  it('should generate source map with correct sources when using preprocessor (stylus) and gulp.src without base', function(done) {
    var write = sourceMaps.write()
    .on('data', function(file) {
      expect(file.sourceMap.sources).to.be.deep.equal([
        'fixture.css',
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
      base: path.join(__dirname),
      path: path.join(__dirname, 'importer.css'),
      contents: new Buffer('@import "fixture.css";\np { color: gray; }')
    }));
  });

  it('should generate source map with correct sources when using preprocessor (stylus) and gulp.src with base', function(done) {
    var write = sourceMaps.write()
    .on('data', function(file) {
      expect(file.sourceMap.sources).to.be.deep.equal([
        'test/fixture.css',
        'test/importer.css'
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
      path: path.join(__dirname, 'importer.css'),
      contents: new Buffer('@import "fixture.css";\na {color: blue}')
    }));
  });
});
