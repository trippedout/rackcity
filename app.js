requirejs.config({
    baseUrl: 'js',
    paths: {
        app: '../app'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['main']);