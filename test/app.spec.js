const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks-fixtures');

let db;

before('make knex instance', () => {
    db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
})

after('disconnect from db', () => db.destroy());

before('clean the table', () => db('bookmarks').truncate());

afterEach('cleanup', () => db('bookmarks').truncate());

describe('GET /bookmarks', () => {
    context('Given there are no bookmarks in the database', () => {
        it('responds with 200 and an empty list', () => {
            return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, [])
        })
    })

    context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray();

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('responds with 200 and all of the bookmarks', () => {
            return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, testBookmarks)
        })
    })

    context(`Given an XSS attack bookmark`, () => {
        const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
        
        beforeEach('insert malicious bookmark', () => {
            return db
                .into('bookmarks')
                .insert([maliciousBookmark])
        })

        it('removes XSS attack content', () => {
            return supertest(app)
                .get(`/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                    expect(res.body[0].title).to.eql(expectedBookmark.title)
                    expect(res.body[0].description).to.eql(expectedBookmark.description)
                })
        })
    })
})

describe('GET /bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
        it('responds with 404', () => {
            const bookmarkId = 123456;
            return supertest(app)
                .get(`/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, { error: { message: `Bookmark does not exist` } })
        })
    })

    context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray();

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('GET /bookmarks/:bookmark_id', () => {
            const bookmarkId = 2;
            const expectedBookmark = testBookmarks[bookmarkId-1];
            return supertest(app)
                .get(`/bookmarks/${expectedBookmark.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, expectedBookmark)
        })
    })

    context(`Given an XSS attack bookmark`, () => {
        const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
        
        beforeEach('insert malicious bookmark', () => {
            return db
                .into('bookmarks')
                .insert([maliciousBookmark])
        })

        it('removes XSS attack content', () => {
            return supertest(app)
                .get(`/bookmarks/${maliciousBookmark.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
        })
    })
})

describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
        const newBookmark = {
            title: 'Test bookmark',
            url: 'https://www.google.com',
            description: 'Test description',
            rating: '4'
        }
        return supertest(app)
            .post(`/bookmarks`)
            .send(newBookmark)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(newBookmark.title)
                expect(res.body.url).to.eql(newBookmark.url)
                expect(res.body.description).to.eql(newBookmark.description)
                expect(res.body.rating).to.eql(newBookmark.rating)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
            })
            .then(res =>
            supertest(app)
                .get(`/bookmarks/${res.body.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(res.body)
            )
    })

    const requiredFields = ['title', 'url', 'rating'];

    requiredFields.forEach(field => {
        const newBookmark = {
            title: 'Test bookmark',
            url: 'https://www.google.com',
            description: 'Test description',
            rating: '4'
        }
        it(`responds with 400 and an error message when the '${field}' is missing`, () => {
            delete newBookmark[field]

            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(400, {
                    error: { message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` }
                })
      
        })
    })

    it(`responds with 400 and an error message when rating is not a number between 1 and 5`, () => {
        const newBookmark = {
            title: 'Test bookmark',
            url: 'https://www.google.com',
            description: 'Test description',
            rating: '6'
        }

        return supertest(app)
            .post('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(newBookmark)
            .expect(400, {
                error: { message: `Rating must be a number between 1 and 5.` }
            })
    })

    it(`responds with 400 and an error message when URL is not a URL`, () => {
        const newBookmark = {
            title: 'Test bookmark',
            url: 'google.com',
            description: 'Test description',
            rating: '4'
        }

        return supertest(app)
            .post('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send(newBookmark)
            .expect(400, {
                error: { message: `Invalid URL` }
            })
    })

    context(`Given an XSS attack bookmark`, () => {
        const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

        it('removes XSS attack content', () => {
            return supertest(app)
                .post(`/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
        })
    })
    
})

describe(`DELETE /bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray();

        console.log(testBookmarks)

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('responds with 204 and removes the bookmark', () => {
            const idToRemove = 2;
            const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

            return supertest(app) 
                .delete(`/bookmarks/${idToRemove}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(204)
                .then(res =>
                    supertest(app)
                        .get('/bookmarks')
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmarks)    
                )
        })
    })

    context('Given no bookmarks', () => {
        it('responds with 404', () => {
            const bookmarkId = 123456;
            return supertest(app)
                .delete(`/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, { error: { message: `Bookmark does not exist` } })

        })
    })
})