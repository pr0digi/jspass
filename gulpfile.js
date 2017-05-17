const gulp = require("gulp");
const browserify = require("browserify");
const derequire = require('gulp-derequire');
const source = require("vinyl-source-stream")

gulp.task("bundle", function() {
    gulp.start("minified-bundle", "dev-bundle");
});

gulp.task("minified-bundle", function() {
  return browserify({entries: "./src/jspass.js", standalone: "JSPass"})
    .external("https")
    .transform("babelify", {presets: ["es2015"], plugins: ["es6-promise", "transform-runtime"]})
    .transform({
      global: true
    }, "uglifyify")
    .bundle()
    .pipe(source("jspass.min.js"))
    .pipe(derequire())
    .pipe(gulp.dest("./dist/"));
});

gulp.task("dev-bundle", function() {
  return browserify({debug: true, entries: "./src/jspass.js", standalone: "JSPass"})
    .external("https")
    .transform("babelify", {presets: ["es2015"], plugins: ["es6-promise", "transform-runtime"]})
    .bundle()
    .pipe(source("jspass.js"))
    .pipe(derequire())
    .pipe(gulp.dest("./dist/"));
});