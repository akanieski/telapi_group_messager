/**
 * Created by andrew on 4/15/14.
 */

/*
 Makes available the file-change attribute which accepts a function to be called when the file has changed
 */
app.directive('fileChange', function () {
    'use strict';

    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            var onChangeFunc = element.scope()[attrs.fileChange];
            element.bind('change', onChangeFunc);
        }
    };
});

/*
 Makes available the droppable attribute which accepts
 */
app.directive('submitOnEnter', function () {

    return {
        restrict: 'A',
        link: function (scope, el, attrs) {
            $(el).on('keydown', function (e) {
                if (e.which === 13) {
                    if (attrs.submitOnEnter && scope[attrs.submitOnEnter]) scope[attrs.submitOnEnter]();
                }
            });
        }
    }

});

/*
 Makes available the droppable attribute which accepts
 */
app.directive('fileDropzone', function () {
    return {
        restrict: 'A',
        scope: {
            file: '=',
            fileName: '='
        },
        link: function (scope, element, attrs) {
            var checkSize, isTypeValid, processDragOverOrEnter, validMimeTypes;
            attrs.maxFileSize = attrs.maxFileSize ? attrs.maxFileSize : 256;
            processDragOverOrEnter = function (event) {
                if (event != null) {
                    event.preventDefault();
                }
                return false;
            };
            validMimeTypes = attrs.fileDropzone;
            /*
             Validate against provided file size limit
             */
            checkSize = function (size) {
                var _ref;
                if (((_ref = attrs.maxFileSize) === (void 0) || _ref === '') || (size / 1024) / 1024 < attrs.maxFileSize) {
                    return true;
                } else {
                    alert("File must be smaller than " + attrs.maxFileSize + " MB");
                    return false;
                }
            };
            /*
             Validate against provided MIME types
             */
            isTypeValid = function (type) {
                if ((validMimeTypes === (void 0) || validMimeTypes === '') || validMimeTypes.indexOf(type) > -1) {
                    return true;
                } else {
                    alert("Invalid file type.  File must be one of following types " + validMimeTypes);
                    return false;
                }
            };
            /*
             Bind drag events that are needed to trigger bind logic
             */
            element.bind('dragover', processDragOverOrEnter);
            element.bind('dragenter', processDragOverOrEnter);
            return element.bind('drop', function (event) {
                var file, name, reader, size, type;
                if (event != null) {
                    event.preventDefault();
                }
                /*
                 Using HTML5's FileAPI to process file
                 */
                reader = new FileReader();
                reader.onload = function (evt) {
                    if (checkSize(size) && isTypeValid(type)) {
                        return scope.$apply(function () {
                            scope.file = evt.target.result.split(',')[1];
                            scope.$parent.file = scope.file;
                            /*
                             Trigger file dropped function either in its own scope or in its parent's scope
                             */
                            if (attrs.fileDropped && (scope[attrs.fileDropped] || scope.$parent[attrs.fileDropped]))
                                (scope[attrs.fileDropped] ? scope[attrs.fileDropped] : scope.$parent[attrs.fileDropped])();
                            if (angular.isString(scope.fileName)) {
                                return scope.fileName = name;
                            }
                        });
                    }
                };
                file = event.originalEvent.dataTransfer.files[0];
                name = file.name;
                type = file.type;
                size = file.size;
                reader.readAsDataURL(file);
                return false;
            });
        }
    };
});