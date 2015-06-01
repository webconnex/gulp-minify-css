'use strict';

var EOL = require('os').EOL;
var path = require('path');

var expect = require('chai').expect;
var PluginError = require('gulp-util').PluginError;
var stringToStream = require('from2-string');
var minifyCSS = require('..');
var File = require('vinyl');

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
        expect(String(file.contents)).to.be.equal('/*!foo*/' + EOL + 'a{color:red}');
        done();
      })
      .end(new File({contents: new Buffer('/*!foo*//*bar*/\na { color: red; }/*!baz*/')}));
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
          expect(String(data)).to.be.equal('p:hover{font-size:0}');
          done();
        });
      })
      .end(new File({contents: stringToStream('p:hover { font-size: 0 }')}));
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
        contents: new Buffer('@import url("fixture.css");')
      }));
    });
  });
});
