const gulp = require("gulp");
const browserify = require("browserify");
const derequire = require('gulp-derequire');
const source = require("vinyl-source-stream")

gulp.task("bundle", function() {
  return browserify({entries: "./src/jspass.js", standalone: "JSPass"})
    .external("https")
    .transform("babelify", {presets: ["es2015"]})
    .transform({
      global: true
    }, "uglifyify")
    .bundle()
    .pipe(source("jspass.js"))
    .pipe(derequire())
    .pipe(gulp.dest("./dist/"));
});