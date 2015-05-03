'use strict';

var EOL = require('os').EOL;
var path = require('path');

var bufferstream = require('simple-bufferstream');
var expect = require('chai').expect;
var PluginError = require('gulp-util').PluginError;
var minifyCSS = require('../');
var File = require('vinyl');

require('mocha');

var fixture = [
  '/*! foo */',
  '/* bar */',
  'a { color: red; }',
  '/*! baz */\n'
].join('\n');

var expected = [
  '/*! foo */',
  'a{color:red}'
].join(EOL);

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

  describe('with buffers', function() {
    it('should minify CSS files', function(done) {
      minifyCSS(opts)
      .on('error', done)
      .on('data', function(file) {
        expect(String(file.contents)).to.be.equal(expected);
        done();
      })
      .end(new File({contents: new Buffer(fixture)}));
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
      .end(new File({contents: new Buffer(fixture)}));
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
        contents: new Buffer('@import url("../../external.css");')
      }));
    });
  });

  describe('with streams', function() {
    it('should minify CSS files', function(done) {
      minifyCSS(opts)
      .on('error', done)
      .on('data', function(file) {
        file.contents.on('data', function(data) {
          expect(file.isStream()).to.be.equal(true);
          expect(String(data)).to.be.equal(expected);
          done();
        });
      })
      .end(new File({contents: bufferstream(new Buffer(fixture))}));
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
        contents: bufferstream(new Buffer('@import url("../../external.css");'))
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
        path: path.join(__dirname, 'fixtures/foo////////../importer.css'),
        contents: new Buffer('@import url("external.css");')
      }));
    });
  });
});
