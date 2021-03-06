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

describe('GET /api/bookmarks', () => {
    context('Given there are no bookmarks in the database', () => {
        it('responds with 200 and an empty list', () => {
            return supertest(app)
                .get('/api/bookmarks')
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
                .get('/api/bookmarks')
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
                .get(`/api/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                    expect(res.body[0].title).to.eql(expectedBookmark.title)
                    expect(res.body[0].description).to.eql(expectedBookmark.description)
                })
        })
    })
})

describe('GET /api/bookmarks/:bookmark_id', () => {
    context('Given no bookmarks', () => {
        it('responds with 404', () => {
            const bookmarkId = 123456;
            return supertest(app)
                .get(`/api/bookmarks/${bookmarkId}`)
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

        it('GET /api/bookmarks/:bookmark_id', () => {
            const bookmarkId = 2;
            const expectedBookmark = testBookmarks[bookmarkId-1];
            return supertest(app)
                .get(`/api/bookmarks/${expectedBookmark.id}`)
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
                .get(`/api/bookmarks/${maliciousBookmark.id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
        })
    })
})

describe(`POST /api/bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function() {
        const newBookmark = {
            title: 'Test bookmark',
            url: 'https://www.google.com',
            description: 'Test description',
            rating: '4'
        }
        return supertest(app)
            .post(`/api/bookmarks`)
            .send(newBookmark)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(newBookmark.title)
                expect(res.body.url).to.eql(newBookmark.url)
                expect(res.body.description).to.eql(newBookmark.description)
                expect(res.body.rating).to.eql(newBookmark.rating)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
            })
            .then(res =>
            supertest(app)
                .get(`/api/bookmarks/${res.body.id}`)
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
                .post('/api/bookmarks')
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
            .post('/api/bookmarks')
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
            .post('/api/bookmarks')
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
                .post(`/api/bookmarks/`)
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

describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
    context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray();

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it('responds with 204 and removes the bookmark', () => {
            const idToRemove = 2;
            const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);

            return supertest(app) 
                .delete(`/api/bookmarks/${idToRemove}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(204)
                .then(res =>
                    supertest(app)
                        .get('/api/bookmarks')
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmarks)    
                )
        })
    })

    context('Given no bookmarks', () => {
        it('responds with 404', () => {
            const bookmarkId = 123456;
            return supertest(app)
                .delete(`/api/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, { error: { message: `Bookmark does not exist` } })

        })
    })
})

describe.only(`PATCH /api/bookmarks/:bookmark_id`, () => {
    context(`Given no bookmarks`, () => {
        it(`responds with 404`, () => {
            const bookmarkId = 123456;
            return supertest(app)
                .patch(`/api/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, { error: { message: `Bookmark does not exist` }})
        })
    })

    context(`Given there are bookmarks in the database`, () => {
        const testBookmarks = makeBookmarksArray();

        beforeEach('insert bookmarks', () => {
            return db
                .into('bookmarks')
                .insert(testBookmarks)
        })

        it(`responds with 204 and updates the bookmark`, () => {
            const idToUpdate = 2;
            const updateBookmark = {
                title: 'updated bookmark title',
                url: 'http://www.updatedurl.com/',
                description: 'updated bookmark description',
                rating: '1'
            }

            const expectedBookmark = {
                ...testBookmarks[idToUpdate - 1],
                ...updateBookmark
            }

            return supertest(app)
                .patch(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(updateBookmark)
                .expect(204)
                .then(res => 
                    supertest(app)
                        .get(`/api/bookmarks/${idToUpdate}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmark)    
                )
        })

        it(`responds with 400 when no required fields supplied`, () => {
            const idToUpdate = 2;
            return supertest(app)
                .patch(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send({ irrelevantField: 'foo' })
                .expect(400, {
                    error: { message: `Request body must contain either 'title', 'url', 'description' or 'rating'` }
                })
        })

        it(`responds with 204 when updating only a subset of fields`, () => {
            const idToUpdate = 2;
            const updateBookmark = {
                title: 'updated bookmark title'
            }
            const expectedBookmark = {
                ...testBookmarks[idToUpdate - 1],
                ...updateBookmark
            }

            return supertest(app)
                .patch(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send({
                    ...updateBookmark,
                    fieldToIgnore: 'should not be in GET response'
                })
                .expect(204)
                .then(res => 
                    supertest(app)
                        .get(`/api/bookmarks/${idToUpdate}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(expectedBookmark)
                )
        })
    })
})