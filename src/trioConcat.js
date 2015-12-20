var through = require('through2'),
    gutil   = require('gulp-util'),
    fs      = require('fs');

module.exports = function() {
    return through.obj(function(file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError('nuke', 'Streaming not supported'));
            return;
        }

        getLoadOrder(file, function(d) {
            concatFiles(d, function(content) {
                file.contents = new Buffer(content);
                cb(null, file);
            });
        });
        
    });
};

function concatFiles(paths, cb) {
    var newContent = '';
    var pathMap = makePathMap(paths);
    var pathRegex = makePathRegex(paths);
    for (var i = paths.length - 1; i >= 0; i--) {
        var path = paths[i];
        addPath(path, i);
    }

    function addPath(path, i) {
        var fp = path.filepath;
        fs.readFile(fp, function(err, content) {
            var modContent = replacePath(content.toString());
            
            modContent = modContent.replace(/Trio.Module.export\(|.and.export\(|.and.then\(/g, function(d) {
                return d + "'" + fp + "',";
            });

            modContent = "(function() {" + modContent + "})();\n";

            newContent += modContent;

            if (i <= 0) {
                cb(newContent);
            }
        });
    }

    function replacePath(content) {
        content = content.replace(pathRegex, function(d) {
            if (!pathMap[d]) {
                console.log(d);
            }
            return pathMap[d];
        })
        return content;
    }

    function makePathMap(paths) {
        var ret = {};
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            ret[path.relativeUrl] = path.filepath;
        }
        return ret;
    }

    function makePathRegex(paths) {
        var ret = [];
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];
            if (path.relativeUrl) {
                ret.push(path.relativeUrl);
            }
        }
        return new RegExp(ret.join('|'), 'g');
    }
}

function getLoadOrder(file, done) {
    var filepathsMap = {};
    var filepathsIdx = 0;
    var BASE = file.base;
    var filepaths = [{
        relativeUrl: null,
        filepath: file.history[0]
    }];

    readOneFile(filepathsIdx);

    function getFilepaths(content) {
        var parameters = content.match(/((Trio\.Module\.import)\([^)]*\))/gi);
        var fps = [];

        if (parameters && parameters[0]) {
            fps = fps.concat(parameters[0]
                .replace(/Trio\.Module\.import/g, '')
                .replace(/[\(\[\)\]\n \'\" ]/g, '')
                .split(','));
        }

        fps.forEach(function(fp) {
            var mFp = resolveRelativePath(fp.trim(), BASE);
            var isVisited = filepathsMap[mFp];
            if (isVisited) {
                return;
            }

            var filepath = {
                filepath: mFp,
                relativeUrl: fp.replace(/^\s+|\s+$/g,'')
            }

            filepathsMap[mFp] = true;
            filepaths.push(filepath);
        });

        fps.forEach(function() {
            filepathsIdx++;
            readOneFile(filepathsIdx);
        })
    } 

    function readOneFile(index) {
        var fp = filepaths[index].filepath;
        fs.readFile(fp, function(err, content) {
            getFilepaths(content.toString());
            if (index + 1 >= filepaths.length) {
                done(filepaths);
            }
        });
    }

    function resolveRelativePath(fp, base) {
        var absolutePath = base.split('/');

        absolutePath.pop();

        fp.split('/').forEach(function(p) {
            if (p === '.') {
                absolutePath.pop();
            } else {
                absolutePath.push(p);
            }
        });

        return absolutePath.join('/');
    }
}