# gulp-trio-concat

Gulp middleware for concatenating files given a single point of entry

## Using gulp-trio-concat
You can acquire Trio using npm:
```bash
npm install gulp-trio-concat
```

## Example
```js
var gulp = require('gulp');
var trioConcat = require('gulp-trio-concat');

gulp.task('trio-concat', function() {
    return gulp.src('client/src/app.js')
        .pipe(trioConcat())
        .pipe(gulp.dest('dist/src'));
});
```

## Developing for Trio
### Installing dependencies (from within root directory)
```bash
npm install
```
