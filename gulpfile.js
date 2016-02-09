var gulp = require('gulp');
var postcss = require('gulp-postcss');
var ifm = require('./index.js');
var shell = require('gulp-shell');


var files = ['index.js', './test/*.js', 'gulpfile.js'];

gulp.task('test', shell.task([
  'node test/test.js',
]));

gulp.task('default', ['test']);

gulp.task('watch', function () {
    gulp.watch(files, ['test']);
});
