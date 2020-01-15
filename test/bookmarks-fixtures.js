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

function makeMaliciousBookmark() {
    const maliciousBookmark = {
      id: 911,
      title: 'Naughty naughty very naughty <script>alert("xss");</script>',
      url: 'https://www.hack.com/',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
      rating: '4'
    }
    const expectedBookmark = {
      ...maliciousBookmark,
      title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
    return {
      maliciousBookmark,
      expectedBookmark,
    }
  }

module.exports = {
    makeBookmarksArray,
    makeMaliciousBookmark,
}