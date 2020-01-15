function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'Google', 
            url: 'http://www.google.com',
            description: 'This is Google',
            rating: '4'
        },
        {
            id: 2,
            title: 'Yahoo', 
            url: 'http://www.yahoo.com',
            description: 'This is Yahoo',
            rating: '3'
        },
        {
            id: 3,
            title: 'Bing', 
            url: 'http://www.bing.com',
            description: 'This is Bing',
            rating: '2'
        },
        {
            id: 4,
            title: 'Bloc', 
            url: 'http://www.bloc.com',
            description: 'This is Bloc',
            rating: '5'
        },
    ]
};

module.exports = {
    makeBookmarksArray,
}