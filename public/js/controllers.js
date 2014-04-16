/**
 * Created by andrew on 4/15/14.
 */

app.controller('MainCtrl', function ($scope, $http) {

    /*
     Initializes the form
     */
    $scope.init = function () {
        /*
         Enumeration of modes
         */
        $scope.modes = {
            credentials: 'credentials',
            upload: 'upload',
            validate: 'validate',
            send: 'send'
        }

        /*
         Stores current mode of the form
         */
        $scope.current_mode = $scope.modes.credentials;

        /*
         Prepare window for dropping support - Disabling standard drag-n-drop handlers for the window
         */
        window.addEventListener("dragover", function (e) {
            e = e || event;
            e.preventDefault();
        }, false);
        window.addEventListener("drop", function (e) {
            e = e || event;
            e.preventDefault();
        }, false);
    }

    /*
     Function for triggering browsing mechanism for CSV file uploading
     */
    $scope.browse = function () {
        $('input[type="file"]').trigger('click');
    }

    /*
     Function that is called when the file selection has changed
     */
    $scope.file_change = function () {
        var file, name, reader, size, type;
        /*
            Make sure size (mb) is under the maximum
         */
        checkSize = function (size) {
            var _ref;
            var maxFileSize = 256;
            if (((_ref = maxFileSize) === (void 0) || _ref === '') || (size / 1024) / 1024 < maxFileSize) {
                return true;
            } else {
                alert("File must be smaller than " + maxFileSize + " MB");
                return false;
            }
        };
        /*
            Make sure the MIME type is text/csv
         */
        isTypeValid = function (type) {
            var validMimeTypes = ['text/csv']
            if ((validMimeTypes === (void 0) || validMimeTypes === '') || validMimeTypes.indexOf(type) > -1) {
                return true;
            } else {
                alert("Invalid file type.  File must be one of following types " + validMimeTypes);
                return false;
            }
        };
        /*
            Using HTML5 FileAPI to process results
         */
        reader = new FileReader();
        reader.onload = function (evt) {
            if (checkSize(size) && isTypeValid(type)) {
                $scope.file = evt.target.result.split(',')[1];
                $scope.next();
            }
        };
        file = $('input[type="file"]')[0].files[0];
        name = file.name;
        type = file.type;
        size = file.size;
        reader.readAsDataURL(file);
    }

    $scope.restart = function () {
        $scope.file = null;
        $scope.current_mode = $scope.modes.credentials;
    }

    $scope.filtered_items = function(valid) {
        var items = [];
        if ($scope.items) {
            $scope.items.forEach(function (item) {
                if ((valid && item.valid) || (!valid && !item.valid))
                    items.push(item);
            });
        }
        return items;
    }

    $scope.next = function () {
        switch ($scope.current_mode) {
            /*
             When in credential mode the next key should validate there account info with TelAPI. If successful move
             them forward to upload mode.
             */
            case $scope.modes.credentials:
                /*
                    Call web server's authenticate route to determine if the credentials provided are valid. If so move on.
                 */
                $scope.loading = true;
                $scope.loading_message = 'Authenticating with TelAPI Servers ...';
                $http.post('/api/authenticate', { account_sid: $scope.account_sid, auth_token: $scope.auth_token})
                    .success(function (data) {
                        // Collect any errors
                        $scope.authentication_errors = data.errors;
                        if (!data.errors) {
                            // Move on to next step
                            $scope.current_mode = $scope.modes.upload;
                        }
                        $scope.loading = false;
                    })
                    .error(function(){
                        // Failed to communicate with server
                        $scope.authentication_errors = ['Failed to connect to TelAPI.'];
                        $scope.loading = false;
                    });
                break;

            case $scope.modes.upload:
                $scope.loading = true;
                $scope.loading_message = 'Processing CSV ...';
                $http.post('/api/process_csv', {
                    account_sid: $scope.account_sid,
                    auth_token: $scope.auth_token,
                    data: $scope.file
                })
                    .success(function (data) {
                        $scope.upload_errors = data.errors;
                        if (!data.errors) {
                            $scope.items = data.items;
                            $scope.current_mode = $scope.modes.validation;
                        }
                        $scope.loading = false;
                    })
                    .error(function(){
                        $scope.upload_errors = ['Failed to connect to TelAPI.'];
                        $scope.loading = false;
                    });
                break;
        }
    }

    /*
     BEGIN INITIALIZATION LOGIC
     */
    $scope.init();

});