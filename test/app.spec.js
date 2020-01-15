const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks-fixtures');

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
})

describe.only(`POST /bookmarks`, () => {
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
})