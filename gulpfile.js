var gulp = require('gulp');
var uglify = require('gulp-uglify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var nodemon = require('gulp-nodemon');

gulp.task('browserify', function() {
  return browserify('./client.js')
    .bundle()
    .pipe(source('bundle.js'))
    // .pipe(buffer())
    // .pipe(uglify())
    .pipe(gulp.dest('public/js'));
});

gulp.task('default', ['browserify']);

gulp.task('start', function () {
  nodemon({
    script: 'server.js', tasks: ['browserify']
  })
});
