const path = require('path');
const express = require('express');
const xss = require('xss')
const { isWebUri } = require('valid-url');
const logger = require('../logger');
const bookmarksRouter = express.Router();
const bodyParser = express.json();
const BookmarksService = require('../../bookmarks-service')

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: bookmark.rating
})

bookmarksRouter
    .route('/api/bookmarks')
    .get((req, res) => {
        const knexInstance = req.app.get('db');
        BookmarksService.getAllBookmarks(knexInstance)
            .then(bookmarks => {
                res.json(bookmarks.map(serializeBookmark))
            })
            
    })
    .post(bodyParser, (req, res) => {
        const { title, url, description, rating } = req.body;
        
        if (!title) {
            logger.error(`Title is required`);
            return res.status(400).json({ error: { message: `Title is required` }});
        }

        if (!url) {
            logger.error(`URL is required`);
            return res.status(400).json({ error: { message: `Url is required` }});
        }

        if (!rating) {
            logger.error(`Rating is required`);
            return res.status(400).json({ error: { message: `Rating is required` }});
        }

        const intRating = Number(rating);

        if (!Number.isInteger(intRating) || intRating < 1 || intRating > 5) {
            logger.error(`${rating} is an invalid rating. Rating must be an number between 1 and 5.`)
            return res.status(400).json({ error: { message: `Rating must be a number between 1 and 5.` }});
        }

        if (!isWebUri(url)) {
            logger.error(`${url} is not a valid URL.`)
            return res.status(400).json({ error: { message: `Invalid URL` }});
        }

        const newBookmark = { title, url, description, rating }
        BookmarksService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(serializeBookmark(bookmark))
            })
            
    })


bookmarksRouter
    .route('/api/bookmarks/:id')
    .all((req, res, next) => {
        BookmarksService.getById(
            req.app.get('db'),
            req.params.id
        )
            .then(bookmark => {
                if (!bookmark) {
                    return res.status(404).json({
                        error: { message: `Bookmark does not exist` }
                    })
                }
                res.bookmark = bookmark;
                next()
            })
            .catch(next)
    })
    .get((req, res) => {
        res.json(serializeBookmark(res.bookmark))
    })
    .delete((req, res) => {
        const knexInstance = req.app.get('db')
        const { id } = req.params;
        BookmarksService.deleteBookmark(knexInstance, id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Bookmark with id ${id} not found.`)
                    return res.status(404).json({ error: { message: `Bookmark does not exist` } })
                }
                logger.info(`Bookmark with id ${id} deleted.`);
                res.status(204).end()
        })
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const bookmarkToUpdate = { title, url, description, rating };

        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: { message: `Request body must contain either 'title', 'url', 'description' or 'rating'` }
            })
        }

        BookmarksService.updateBookmark(
            req.app.get('db'),
            req.params.id,
            bookmarkToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = bookmarksRouter;